/**
 * Sensor-driven hazard escalation.
 *
 *   POST /api/hazard-alerts/detect      report a district's risk; may raise an SOS
 *   GET  /api/hazard-alerts/pending     MEDIUM hazards awaiting a Sirdar
 *   POST /api/hazard-alerts/:id/approve approve → SOS goes out to workers
 *   POST /api/hazard-alerts/:id/dismiss dismiss → nothing is sent
 *
 * Deciding is restricted to SIRDAR and above, because approving sends an emergency
 * alert to every worker in a district. Reporting a reading is restricted too: the
 * detect endpoint can raise an SOS without a human, so it must not be open to any
 * signed-in account.
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, actorRole, canSeeMine, mineScope, requireLevel } from '../middleware/auth';
import { AuditService } from '../services/auditService';
import {
  HAZARD_TYPES, HazardType, handleHazardReading, raiseHazardSos,
} from '../services/hazardAlertService';
import { prisma } from '../db';

const router = Router();

const isHazardType = (value: unknown): value is HazardType =>
  typeof value === 'string' && (HAZARD_TYPES as string[]).includes(value);

// POST /api/hazard-alerts/detect
router.post('/detect', requireLevel('OFFICER'), async (req: AuthenticatedRequest, res: Response) => {
  const { mineId, districtId, zoneLabel, hazardType, riskScore, summary, freshSession } = req.body ?? {};

  if (typeof mineId !== 'string' || !mineId) return res.status(400).json({ error: 'A mine is required.' });
  if (!canSeeMine(req, mineId)) return res.status(403).json({ error: 'You cannot raise alerts for that mine.' });
  if (!isHazardType(hazardType)) return res.status(400).json({ error: `Hazard type must be one of ${HAZARD_TYPES.join(', ')}.` });

  const score = Number(riskScore);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Risk score must be a number between 0 and 100.' });
  }

  // A district, when given, must belong to the mine — otherwise the alert would
  // reach the crew of a district that is not the one being reported on.
  if (districtId) {
    const district = await prisma.district.findUnique({ where: { id: String(districtId) }, select: { mineId: true } });
    if (!district) return res.status(404).json({ error: 'District not found.' });
    if (district.mineId !== mineId) return res.status(400).json({ error: 'That district belongs to another mine.' });
  }

  try {
    const outcome = await handleHazardReading({
      mineId,
      districtId: districtId ? String(districtId) : null,
      zoneLabel: String(zoneLabel || 'Mine-wide').slice(0, 120),
      hazardType,
      riskScore: score,
      summary: String(summary || 'No sensor detail supplied.').slice(0, 500),
      freshSession: freshSession === true,
    });
    return res.json(outcome);
  } catch (error) {
    console.error('Hazard detection failed:', error);
    return res.status(503).json({ error: 'Could not process the hazard reading.' });
  }
});

// GET /api/hazard-alerts/pending
router.get('/pending', requireLevel('SIRDAR'), async (req: AuthenticatedRequest, res: Response) => {
  const scope = mineScope(req);
  const rows = await prisma.hazardApproval.findMany({
    where: { status: 'PENDING', ...(scope ? { mineId: scope } : {}) },
    include: { mine: { select: { name: true } }, district: { select: { name: true } } },
    orderBy: { raisedAt: 'desc' },
    take: 25,
  });
  return res.json(rows);
});

// GET /api/hazard-alerts/history
router.get('/history', requireLevel('SIRDAR'), async (req: AuthenticatedRequest, res: Response) => {
  const scope = mineScope(req);
  const rows = await prisma.hazardApproval.findMany({
    where: { status: { not: 'PENDING' }, ...(scope ? { mineId: scope } : {}) },
    include: {
      mine: { select: { name: true } },
      district: { select: { name: true } },
      decidedBy: { select: { name: true, role: true } },
    },
    orderBy: { raisedAt: 'desc' },
    take: 25,
  });
  return res.json(rows);
});

/** Loads a PENDING request the caller is allowed to decide, or sends the refusal. */
async function loadDecidable(req: AuthenticatedRequest, res: Response) {
  const approval = await prisma.hazardApproval.findUnique({ where: { id: String(req.params.id) } });
  if (!approval) {
    res.status(404).json({ error: 'Approval request not found.' });
    return null;
  }
  if (!canSeeMine(req, approval.mineId)) {
    res.status(403).json({ error: 'That request is at another mine.' });
    return null;
  }
  if (approval.status !== 'PENDING') {
    // Two Sirdars can open the same request; the second must not send a duplicate SOS.
    res.status(409).json({ error: `This request was already ${approval.status.toLowerCase()}.`, approval });
    return null;
  }
  return approval;
}

// POST /api/hazard-alerts/:id/approve — sends the SOS to workers.
router.post('/:id/approve', requireLevel('SIRDAR'), async (req: AuthenticatedRequest, res: Response) => {
  const approval = await loadDecidable(req, res);
  if (!approval) return;

  try {
    const { alert, notified } = await raiseHazardSos({
      mineId: approval.mineId,
      districtId: approval.districtId,
      zoneLabel: approval.zoneLabel,
      hazardType: approval.hazardType as HazardType,
      riskScore: approval.riskScore,
      summary: approval.summary,
      approvedById: req.user!.id,
      approvalId: approval.id,
    });

    const updated = await prisma.hazardApproval.update({
      where: { id: approval.id },
      data: {
        status: 'APPROVED',
        decidedAt: new Date(),
        decidedById: req.user!.id,
        decisionNote: typeof req.body?.note === 'string' ? req.body.note.slice(0, 300) : null,
        sosAlertId: alert.id,
      },
    });

    await AuditService.recordEvent({
      recordType: 'HAZARD_APPROVAL',
      recordId: approval.id,
      action: 'APPROVED',
      performedByRole: actorRole(req, 'SIRDAR'),
      data: { approvalId: approval.id, sosId: alert.id, decidedById: req.user!.id, riskScore: approval.riskScore, notified },
    });

    return res.json({ approval: updated, sosId: alert.id, notified });
  } catch (error) {
    console.error('Hazard approval failed:', error);
    return res.status(503).json({ error: 'Could not raise the alert. The request is still pending.' });
  }
});

// POST /api/hazard-alerts/:id/dismiss — nothing is sent to workers.
router.post('/:id/dismiss', requireLevel('SIRDAR'), async (req: AuthenticatedRequest, res: Response) => {
  const approval = await loadDecidable(req, res);
  if (!approval) return;

  const updated = await prisma.hazardApproval.update({
    where: { id: approval.id },
    data: {
      status: 'DISMISSED',
      decidedAt: new Date(),
      decidedById: req.user!.id,
      decisionNote: typeof req.body?.note === 'string' ? req.body.note.slice(0, 300) : null,
    },
  });

  await AuditService.recordEvent({
    recordType: 'HAZARD_APPROVAL',
    recordId: approval.id,
    action: 'DISMISSED',
    performedByRole: actorRole(req, 'SIRDAR'),
    data: { approvalId: approval.id, decidedById: req.user!.id, riskScore: approval.riskScore, note: updated.decisionNote },
  });

  return res.json({ approval: updated });
});

export default router;
