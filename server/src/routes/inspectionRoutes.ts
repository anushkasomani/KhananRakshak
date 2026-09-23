import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import { AuditService } from '../services/auditService';

const router = Router();
const prisma = new PrismaClient();

// GET /api/inspections
router.get('/', async (req, res) => {
  const { mineId, status } = req.query;
  const where: any = {};
  if (mineId) where.mineId = String(mineId);
  if (status) where.status = String(status);

  const inspections = await prisma.inspection.findMany({
    where,
    include: {
      mine: { select: { id: true, name: true, code: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const parsed = inspections.map((ins) => {
    let checklist = [];
    try {
      checklist = JSON.parse(ins.checklistData || '[]');
    } catch (e) {
      checklist = [];
    }
    return { ...ins, checklist };
  });

  return res.json(parsed);
});

// POST /api/inspections
router.post('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { mineId, inspectorName, inspectionType, checklistData, findings, violationsCount, deadline } = req.body;

    if (!mineId || !inspectionType || !findings) {
      return res.status(400).json({ error: 'Mine, inspection type, and findings are required' });
    }

    const rand = Math.floor(10000 + Math.random() * 90000);
    const insId = `INS-2026-${rand}`;

    const inspection = await prisma.inspection.create({
      data: {
        id: insId,
        mineId,
        inspectorName: inspectorName || (req.user ? req.user.name : 'DGMS Inspector'),
        inspectionType,
        checklistData: JSON.stringify(checklistData || []),
        findings,
        violationsCount: violationsCount ? parseInt(String(violationsCount), 10) : 0,
        deadline: deadline ? new Date(deadline) : null,
        status: 'COMPLETED',
        completedAt: new Date()
      },
      include: { mine: true }
    });

    const auditBlock = await AuditService.recordEvent({
      recordType: 'INSPECTION',
      recordId: inspection.id,
      action: 'CREATED',
      performedByRole: req.user ? req.user.role : 'REGULATOR',
      data: {
        id: inspection.id,
        mine: inspection.mine.name,
        type: inspection.inspectionType,
        violations: inspection.violationsCount
      }
    });

    if (auditBlock) {
      await prisma.inspection.update({
        where: { id: inspection.id },
        data: { recordHash: auditBlock.currentHash }
      });
    }

    return res.status(201).json({ inspection, auditBlock });
  } catch (err: any) {
    console.error('Error creating inspection:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
