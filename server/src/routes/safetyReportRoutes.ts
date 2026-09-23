import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();
const prisma = new PrismaClient();

// GET /api/safety-reports
router.get('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { mineId, severity, status, category, limit } = req.query;

  const where: any = {};
  if (mineId) where.mineId = String(mineId);
  if (severity) where.severity = String(severity);
  if (status) where.status = String(status);
  if (category) where.category = String(category);

  // If worker, allow seeing own reports and mine reports
  if (req.user && req.user.role === 'WORKER' && req.query.mineOnly === 'false') {
    where.reporterId = req.user.id;
  }

  const reports = await prisma.safetyReport.findMany({
    where,
    include: {
      mine: { select: { id: true, name: true, code: true } },
      zone: { select: { id: true, name: true, depthLevel: true } },
      reporter: { select: { id: true, name: true, badgeNumber: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit ? parseInt(String(limit), 10) : 50
  });

  return res.json(reports);
});

// POST /api/safety-reports
router.post('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mineId, zoneId, category, severity, description, immediateActionTaken, imageUrl } = req.body;

    if (!mineId || !category || !severity || !description) {
      return res.status(400).json({ error: 'Mine, category, severity, and description are required' });
    }

    // Generate unique ID: SAFE-2026-XXXXX
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const reportId = `SAFE-2026-${randomSuffix}`;

    const reporterId = req.user ? req.user.id : null;

    const report = await prisma.safetyReport.create({
      data: {
        id: reportId,
        reporterId,
        mineId,
        zoneId: zoneId || null,
        category,
        severity,
        description,
        immediateActionTaken: immediateActionTaken || null,
        imageUrl: imageUrl || null,
        status: 'SUBMITTED',
        assignedOfficer: 'Unassigned',
      },
      include: {
        mine: true,
        zone: true,
        reporter: { select: { id: true, name: true, badgeNumber: true } }
      }
    });

    // Record to Cryptographic Audit Chain
    const auditBlock = await AuditService.recordEvent({
      recordType: 'SAFETY_REPORT',
      recordId: report.id,
      action: 'CREATED',
      performedByRole: req.user ? req.user.role : 'ANONYMOUS_WORKER',
      data: {
        id: report.id,
        category: report.category,
        severity: report.severity,
        mineId: report.mineId,
        description: report.description,
        timestamp: report.createdAt
      }
    });

    // Update report with block hash
    if (auditBlock) {
      await prisma.safetyReport.update({
        where: { id: report.id },
        data: { recordHash: auditBlock.currentHash }
      });
    }

    // Notify Safety Officers
    const officers = await prisma.user.findMany({
      where: { role: 'SAFETY_OFFICER', mineId: report.mineId }
    });
    for (const officer of officers) {
      await prisma.notification.create({
        data: {
          userId: officer.id,
          title: `New Hazard Report: ${report.id}`,
          message: `[${report.severity}] ${report.category} hazard logged in ${report.mine.name}`,
          type: report.severity === 'CRITICAL' ? 'WARNING' : 'INFO'
        }
      });
    }

    return res.status(201).json({ report, auditBlock });
  } catch (err: any) {
    console.error('Error creating safety report:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PATCH /api/safety-reports/:id/status
router.patch('/:id/status', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, assignedOfficer, correctiveActionText } = req.body;
    const reportId = String(req.params.id);

    const existing = await prisma.safetyReport.findUnique({
      where: { id: reportId },
      include: { reporter: true, mine: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Safety report not found' });
    }

    const updated = await prisma.safetyReport.update({
      where: { id: reportId },
      data: {
        status: status || existing.status,
        assignedOfficer: assignedOfficer !== undefined ? assignedOfficer : existing.assignedOfficer
      }
    });

    // If marked RESOLVED or verified, award points to worker if not already awarded
    let awardedPoints = 0;
    if (status === 'RESOLVED' && existing.reporterId && !existing.rewardPointsAwarded) {
      awardedPoints = existing.severity === 'CRITICAL' ? 30 : existing.severity === 'HIGH' ? 20 : 10;
      await prisma.user.update({
        where: { id: existing.reporterId },
        data: { points: { increment: awardedPoints } }
      });
      await prisma.recognitionPoint.create({
        data: {
          userId: existing.reporterId,
          pointsAwarded: awardedPoints,
          reason: `Verified ${existing.severity} hazard report: ${existing.id} (${existing.category})`,
          verifiedBy: req.user ? `${req.user.name} (${req.user.role})` : 'Safety Officer'
        }
      });
      await prisma.safetyReport.update({
        where: { id: reportId },
        data: { rewardPointsAwarded: true }
      });
      await prisma.notification.create({
        data: {
          userId: existing.reporterId,
          title: `+${awardedPoints} Safety Recognition Points!`,
          message: `Your hazard report ${existing.id} has been verified and resolved. Keep your mine safe!`,
          type: 'RECOGNITION'
        }
      });
    }

    // Append to Audit Chain
    const auditBlock = await AuditService.recordEvent({
      recordType: 'SAFETY_REPORT',
      recordId: reportId,
      action: status === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGED',
      performedByRole: req.user ? req.user.role : 'SAFETY_OFFICER',
      data: {
        id: reportId,
        oldStatus: existing.status,
        newStatus: status,
        assignedOfficer: assignedOfficer || existing.assignedOfficer,
        actionText: correctiveActionText || null,
        pointsGranted: awardedPoints
      }
    });

    return res.json({ updated, awardedPoints, auditBlock });
  } catch (err: any) {
    console.error('Error updating safety report:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
