import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, roleLevel, ROLE_LEVEL } from '../roles';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'coalguard-super-secret-production-key-2026';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
  officerType?: string | null;
  phone?: string | null;
  mineId?: string | null;
  badgeNumber?: string | null;
  isAdmin: boolean;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: { id: string }): string {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

// Role and approval come from the database on every request, so admin changes apply immediately.
async function loadUser(token: string): Promise<AuthUser | null> {
  const { id } = jwt.verify(token, JWT_SECRET) as { id: string };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    officerType: user.officerType,
    phone: user.phone,
    mineId: user.mineId,
    badgeNumber: user.badgeNumber,
    isAdmin: user.isAdmin,
    status: user.status,
  };
}

const bearer = (req: Request) => {
  const header = req.headers.authorization;
  return header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
};

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Authentication token required' });
  try {
    const user = await loadUser(token);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = bearer(req);
  if (token && !req.user) {
    try {
      req.user = (await loadUser(token)) || undefined;
    } catch {
      // Invalid token on an optional route is treated as anonymous.
    }
  }
  next();
}

export function requireApproved(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.status !== 'APPROVED') return res.status(403).json({ error: 'Your account is awaiting approval' });
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

// Admins pass every level check so they can manage the system without a hierarchy role.
export function requireLevel(min: Role) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (req.user.isAdmin || roleLevel(req.user.role) >= ROLE_LEVEL[min]) return next();
    return res.status(403).json({ error: 'You do not have permission for this action' });
  };
}

export const actorRole = (req: AuthenticatedRequest, fallback = 'SYSTEM') =>
  req.user ? req.user.role || (req.user.isAdmin ? 'ADMIN' : fallback) : fallback;

/** DGMS and admins see every mine; everyone else only sees their own. Returns the mineId to filter by, or undefined for all. */
export const mineScope = (req: AuthenticatedRequest): string | undefined => {
  const u = req.user;
  if (u && (u.isAdmin || u.role === 'DGMS')) return undefined;
  return u?.mineId || 'NO_MINE';
};

export const canSeeMine = (req: AuthenticatedRequest, mineId: string) => {
  const scope = mineScope(req);
  return !scope || scope === mineId;
};
