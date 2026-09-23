import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken, AuthenticatedRequest, authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { mine: true }
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mineId: user.mineId,
    badgeNumber: user.badgeNumber,
  };

  const token = generateToken(authUser);
  return res.json({ token, user: { ...authUser, mine: user.mine, points: user.points, department: user.department } });
});

// GET /api/auth/demo-users (For quick 1-click role switcher in UI)
router.get('/demo-users', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      badgeNumber: true,
      department: true,
      points: true,
      mine: {
        select: { id: true, name: true, code: true }
      }
    },
    orderBy: { role: 'asc' }
  });
  return res.json(users);
});

// POST /api/auth/switch-role (Instant seamless switch to any role for presentation)
router.post('/switch-role', async (req, res) => {
  const { role, email } = req.body;
  let user;

  if (email) {
    user = await prisma.user.findUnique({ where: { email }, include: { mine: true } });
  } else if (role) {
    user = await prisma.user.findFirst({ where: { role }, include: { mine: true } });
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found for role' });
  }

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mineId: user.mineId,
    badgeNumber: user.badgeNumber,
  };

  const token = generateToken(authUser);
  return res.json({ token, user: { ...authUser, mine: user.mine, points: user.points, department: user.department } });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      mine: true,
      badges: true,
      pointsHistory: { take: 5, orderBy: { createdAt: 'desc' } }
    }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

export default router;
