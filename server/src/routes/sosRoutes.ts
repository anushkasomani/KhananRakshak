import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();
const prisma = new PrismaClient();

// Helper to generate SOS ID: SOS-2026-XXXXX
function generateSosId(): string {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `SOS-2026-${rand}`;
}

// GET /api/sos/active (Control Room Live Feeds)
router.get('/active', async (_req, res) => {
  const activeAlerts = await prisma.sosAlert.findMany({
    where: {
      status: {
        in: ['ALERT_TRIGGERED', 'ACKNOWLEDGED', 'TEAM_ASSIGNED', 'RESPONDING']
      }
    },
    include: {
      mine: { select: { id: true, name: true, code: true } },
      zone: { select: { id: true, name: true, depthLevel: true, riskFactor: true } }
    },
    orderBy: { triggeredAt: 'desc' }
  });
  return res.json(activeAlerts);
});

// GET /api/sos/history
router.get('/history', async (_req, res) => {
  const allAlerts = await prisma.sosAlert.findMany({
    include: {
      mine: { select: { id: true, name: true, code: true } },
      zone: { select: { id: true, name: true, depthLevel: true } }
    },
    orderBy: { triggeredAt: 'desc' },
    take: 30
  });
  return res.json(allAlerts);
});

// POST /api/sos (Trigger Emergency Alert)
router.post('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mineId, zoneId, emergencyType, workerIdentifier, locationNotes } = req.body;

    if (!mineId || !emergencyType) {
      return res.status(400).json({ error: 'Mine and emergency type are required' });
    }

    const sosId = generateSosId();
    const ident = workerIdentifier || (req.user ? `${req.user.name} (${req.user.badgeNumber || 'W-ID'})` : 'ANON-CREW-ALARM');

    const alert = await prisma.sosAlert.create({
      data: {
        id: sosId,
        mineId,
        zoneId: zoneId || null,
        emergencyType,
        workerIdentifier: ident,
        status: 'ALERT_TRIGGERED',
        responderNotes: locationNotes ? `Location details: ${locationNotes}` : null
      },
      include: {
        mine: true,
        zone: true
      }
    });

    // Record into Audit Chain
    const auditBlock = await AuditService.recordEvent({
      recordType: 'SOS_ALERT',
      recordId: alert.id,
      action: 'CREATED',
      performedByRole: req.user ? req.user.role : 'WORKER',
      data: {
        sosId: alert.id,
        emergencyType: alert.emergencyType,
        mine: alert.mine.name,
        zone: alert.zone ? alert.zone.name : 'Unspecified',
        timestamp: alert.triggeredAt
      }
    });

    // Create high-priority broadcast notification
    const officers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'SAFETY_OFFICER' },
          { role: 'MINE_MANAGER' }
        ]
      }
    });
    for (const officer of officers) {
      await prisma.notification.create({
        data: {
          userId: officer.id,
          title: `🚨 CRITICAL EMERGENCY SOS: ${alert.id}`,
          message: `${alert.emergencyType} reported in ${alert.mine.name} (${alert.zone ? alert.zone.name : 'Mine Area'})!`,
          type: 'SOS'
        }
      });
    }

    return res.status(201).json({ alert, auditBlock });
  } catch (err: any) {
    console.error('Error triggering SOS:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PATCH /api/sos/:id/status (Transition Status in Control Room)
router.patch('/:id/status', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, assignedTeams, responderNotes } = req.body;
    const sosId = String(req.params.id);

    const existing = await prisma.sosAlert.findUnique({
      where: { id: sosId },
      include: { mine: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    const dataToUpdate: any = {
      status: status || existing.status,
    };
    if (assignedTeams) dataToUpdate.assignedTeams = assignedTeams;
    if (responderNotes) dataToUpdate.responderNotes = responderNotes;
    if (status === 'RESOLVED') dataToUpdate.resolvedAt = new Date();

    const updated = await prisma.sosAlert.update({
      where: { id: sosId },
      data: dataToUpdate,
      include: { mine: true, zone: true }
    });

    // Record to Audit Chain
    const auditBlock = await AuditService.recordEvent({
      recordType: 'SOS_ALERT',
      recordId: sosId,
      action: status === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGED',
      performedByRole: req.user ? req.user.role : 'CONTROL_ROOM_OPERATOR',
      data: {
        sosId,
        newStatus: status,
        assignedTeams: assignedTeams || existing.assignedTeams,
        notes: responderNotes || existing.responderNotes
      }
    });

    return res.json({ updated, auditBlock });
  } catch (err: any) {
    console.error('Error updating SOS status:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
