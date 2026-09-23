import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/mines
router.get('/', async (_req, res) => {
  const mines = await prisma.mine.findMany({
    include: {
      zones: true,
      _count: {
        select: {
          safetyReports: true,
          inspections: true,
          incidents: true,
          sosAlerts: true,
        }
      }
    },
    orderBy: { complianceScore: 'desc' }
  });
  return res.json(mines);
});

// GET /api/mines/:id
router.get('/:id', async (req, res) => {
  const mine = await prisma.mine.findUnique({
    where: { id: req.params.id },
    include: {
      zones: true,
      announcements: { orderBy: { createdAt: 'desc' }, take: 5 },
      safetyReports: { take: 5, orderBy: { createdAt: 'desc' } },
      inspections: { take: 5, orderBy: { createdAt: 'desc' } },
      incidents: { take: 5, orderBy: { createdAt: 'desc' } },
    }
  });
  if (!mine) return res.status(404).json({ error: 'Mine not found' });
  return res.json(mine);
});

export default router;
