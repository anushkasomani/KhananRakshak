import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/notifications
router.get('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    // Return sample notifications for guests
    return res.json([
      { id: '1', title: 'Monsoon Safety Guidelines', message: 'DGMS circular regarding sump water monitoring active.', type: 'INFO', read: false, createdAt: new Date() },
      { id: '2', title: 'System Security Verified', message: 'SHA-256 Audit chain validated across 5 colliery nodes.', type: 'AUDIT', read: true, createdAt: new Date() }
    ]);
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return res.json(notifications);
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(404).json({ error: 'Notification not found' });
  }
});

// GET /api/announcements
router.get('/announcements', async (req, res) => {
  const { mineId } = req.query;
  const where: any = {};
  if (mineId) where.mineId = String(mineId);

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return res.json(announcements);
});

export default router;
