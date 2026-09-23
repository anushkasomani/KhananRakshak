import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();
const prisma = new PrismaClient();

// GET /api/incidents
router.get('/', async (req, res) => {
  const { mineId, severity } = req.query;
  const where: any = {};
  if (mineId) where.mineId = String(mineId);
  if (severity) where.severity = String(severity);

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      mine: { select: { id: true, name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return res.json(incidents);
});

// POST /api/incidents
router.post('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mineId, incidentType, location, severity, description, peopleAffected, immediateResponse, rootCause } = req.body;

    if (!mineId || !incidentType || !location || !description) {
      return res.status(400).json({ error: 'Mine, incident type, location, and description are required' });
    }

    const rand = Math.floor(10000 + Math.random() * 90000);
    const incId = `INC-2026-${rand}`;

    const incident = await prisma.incident.create({
      data: {
        id: incId,
        mineId,
        incidentType,
        location,
        severity: severity || 'SERIOUS',
        description,
        peopleAffected: peopleAffected ? parseInt(String(peopleAffected), 10) : 0,
        immediateResponse: immediateResponse || 'Dispatched emergency team',
        rootCause: rootCause || null,
        status: 'INVESTIGATING'
      },
      include: { mine: true }
    });

    const auditBlock = await AuditService.recordEvent({
      recordType: 'INCIDENT',
      recordId: incident.id,
      action: 'CREATED',
      performedByRole: req.user ? req.user.role : 'SAFETY_OFFICER',
      data: {
        id: incident.id,
        type: incident.incidentType,
        mine: incident.mine.name,
        severity: incident.severity,
        affected: incident.peopleAffected
      }
    });

    return res.status(201).json({ incident, auditBlock });
  } catch (err: any) {
    console.error('Error logging incident:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
