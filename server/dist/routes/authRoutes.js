"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_USER_SELECT = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const google_auth_library_1 = require("google-auth-library");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../roles");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.PUBLIC_USER_SELECT = {
    id: true,
    email: true,
    name: true,
    role: true,
    officerType: true,
    trade: true,
    phone: true,
    isAdmin: true,
    status: true,
    reviewNote: true,
    badgeNumber: true,
    department: true,
    points: true,
    mineId: true,
    createdAt: true,
    mine: { select: { id: true, name: true, code: true, locality: true, state: true } },
};
const fetchPublicUser = (id) => db_1.prisma.user.findUnique({ where: { id }, select: exports.PUBLIC_USER_SELECT });
// POST /api/auth/login (seeded demo accounts only; the app itself signs in with Google)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await db_1.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await bcryptjs_1.default.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    return res.json({ token: (0, auth_1.generateToken)(user), user: await fetchPublicUser(user.id) });
});
// POST /api/auth/google
router.post('/google', async (req, res) => {
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).json({ error: 'Google credential required' });
    }
    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
        payload = ticket.getPayload();
    }
    catch {
        return res.status(401).json({ error: 'Invalid Google credential' });
    }
    if (!payload?.email || !payload.email_verified) {
        return res.status(401).json({ error: 'Google account email is not verified' });
    }
    const email = payload.email.toLowerCase();
    const bootstrapAdmin = (0, roles_1.adminEmails)().includes(email);
    let user = await db_1.prisma.user.findFirst({ where: { OR: [{ googleId: payload.sub }, { email }] } });
    if (!user) {
        user = await db_1.prisma.user.create({
            data: {
                email,
                name: payload.name || email,
                googleId: payload.sub,
                isAdmin: bootstrapAdmin,
                status: bootstrapAdmin ? 'APPROVED' : 'NEW',
            },
        });
    }
    else {
        user = await db_1.prisma.user.update({
            where: { id: user.id },
            data: {
                googleId: user.googleId || payload.sub,
                ...(bootstrapAdmin && !user.isAdmin ? { isAdmin: true, status: 'APPROVED' } : {}),
            },
        });
    }
    return res.json({ token: (0, auth_1.generateToken)(user), user: await fetchPublicUser(user.id) });
});
// GET /api/auth/me
router.get('/me', auth_1.authenticate, async (req, res) => {
    const user = await db_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            ...exports.PUBLIC_USER_SELECT,
            badges: true,
            pointsHistory: { take: 5, orderBy: { createdAt: 'desc' } },
        },
    });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    return res.json(user);
});
// GET /api/auth/onboarding/mines (needed before the account is approved)
router.get('/onboarding/mines', auth_1.authenticate, async (_req, res) => {
    const mines = await db_1.prisma.mine.findMany({
        select: { id: true, name: true, locality: true, state: true },
        orderBy: { name: 'asc' },
    });
    return res.json(mines);
});
// POST /api/auth/onboarding
router.post('/onboarding', auth_1.authenticate, async (req, res) => {
    const current = req.user;
    if (current.status === 'APPROVED') {
        return res.status(400).json({ error: 'Your account is already approved. Ask an admin to change your details.' });
    }
    const { name, phone, role, officerType, trade, mineId, badgeNumber } = req.body;
    const problem = (0, roles_1.validateProfile)({ role, officerType, trade, mineId });
    if (problem)
        return res.status(400).json({ error: problem });
    if (!phone || String(phone).replace(/\D/g, '').length < 10) {
        return res.status(400).json({ error: 'Enter a valid phone number.' });
    }
    if (mineId && !(await db_1.prisma.mine.findUnique({ where: { id: mineId } }))) {
        return res.status(400).json({ error: 'That mine does not exist.' });
    }
    await db_1.prisma.user.update({
        where: { id: current.id },
        data: {
            name: name ? String(name).trim() : undefined,
            phone: String(phone).trim(),
            role,
            officerType: role === 'OFFICER' ? officerType : null,
            trade: role === 'WORKER' ? trade : null,
            mineId: role === 'DGMS' ? null : mineId,
            badgeNumber: badgeNumber ? String(badgeNumber).trim() : null,
            status: 'PENDING',
            reviewNote: null,
        },
    });
    return res.json(await fetchPublicUser(current.id));
});
exports.default = router;
