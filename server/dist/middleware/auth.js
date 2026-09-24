"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canSeeMine = exports.mineScope = exports.actorRole = void 0;
exports.generateToken = generateToken;
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.requireApproved = requireApproved;
exports.requireAdmin = requireAdmin;
exports.requireLevel = requireLevel;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const roles_1 = require("../roles");
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || 'coalguard-super-secret-production-key-2026';
function generateToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}
// Role and approval come from the database on every request, so admin changes apply immediately.
async function loadUser(token) {
    const { id } = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    const user = await db_1.prisma.user.findUnique({ where: { id } });
    if (!user)
        return null;
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
const bearer = (req) => {
    const header = req.headers.authorization;
    return header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
};
async function authenticate(req, res, next) {
    const token = bearer(req);
    if (!token)
        return res.status(401).json({ error: 'Authentication token required' });
    try {
        const user = await loadUser(token);
        if (!user)
            return res.status(401).json({ error: 'Account not found' });
        req.user = user;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
async function optionalAuthenticate(req, _res, next) {
    const token = bearer(req);
    if (token && !req.user) {
        try {
            req.user = (await loadUser(token)) || undefined;
        }
        catch {
            // Invalid token on an optional route is treated as anonymous.
        }
    }
    next();
}
function requireApproved(req, res, next) {
    if (!req.user)
        return res.status(401).json({ error: 'Authentication required' });
    if (req.user.status !== 'APPROVED')
        return res.status(403).json({ error: 'Your account is awaiting approval' });
    next();
}
function requireAdmin(req, res, next) {
    if (!req.user?.isAdmin)
        return res.status(403).json({ error: 'Admin access required' });
    next();
}
// Admins pass every level check so they can manage the system without a hierarchy role.
function requireLevel(min) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Authentication required' });
        if (req.user.isAdmin || (0, roles_1.roleLevel)(req.user.role) >= roles_1.ROLE_LEVEL[min])
            return next();
        return res.status(403).json({ error: 'You do not have permission for this action' });
    };
}
const actorRole = (req, fallback = 'SYSTEM') => req.user ? req.user.role || (req.user.isAdmin ? 'ADMIN' : fallback) : fallback;
exports.actorRole = actorRole;
/** DGMS and admins see every mine; everyone else only sees their own. Returns the mineId to filter by, or undefined for all. */
const mineScope = (req) => {
    const u = req.user;
    if (u && (u.isAdmin || u.role === 'DGMS'))
        return undefined;
    return u?.mineId || 'NO_MINE';
};
exports.mineScope = mineScope;
const canSeeMine = (req, mineId) => {
    const scope = (0, exports.mineScope)(req);
    return !scope || scope === mineId;
};
exports.canSeeMine = canSeeMine;
