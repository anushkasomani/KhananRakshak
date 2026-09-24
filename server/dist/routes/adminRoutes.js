"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roles_1 = require("../roles");
const authRoutes_1 = require("./authRoutes");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const clean = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
// GET /api/admin/users?status=PENDING&mineId=...
router.get('/users', async (req, res) => {
    const { status, mineId } = req.query;
    const users = await db_1.prisma.user.findMany({
        where: {
            ...(status ? { status: String(status) } : {}),
            ...(mineId ? { mineId: String(mineId) } : {}),
        },
        select: authRoutes_1.PUBLIC_USER_SELECT,
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
    return res.json(users);
});
// POST /api/admin/users  (admin enrolls a person directly; they are approved immediately)
router.post('/users', async (req, res) => {
    const { email, name, phone, role, officerType, trade, mineId, badgeNumber, isAdmin } = req.body;
    const normalizedEmail = clean(email)?.toLowerCase();
    if (!normalizedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Enter a valid email.' });
    }
    if (!clean(name))
        return res.status(400).json({ error: 'Enter a name.' });
    const problem = (0, roles_1.validateProfile)({ role, officerType, trade, mineId });
    if (problem)
        return res.status(400).json({ error: problem });
    if (await db_1.prisma.user.findUnique({ where: { email: normalizedEmail } })) {
        return res.status(409).json({ error: 'Someone with this email is already registered.' });
    }
    const user = await db_1.prisma.user.create({
        data: {
            email: normalizedEmail,
            name: clean(name),
            phone: clean(phone),
            role,
            officerType: role === 'OFFICER' ? officerType : null,
            trade: role === 'WORKER' ? trade : null,
            mineId: role === 'DGMS' ? null : mineId,
            badgeNumber: clean(badgeNumber),
            isAdmin: Boolean(isAdmin),
            status: 'APPROVED',
            reviewedAt: new Date(),
        },
        select: authRoutes_1.PUBLIC_USER_SELECT,
    });
    return res.status(201).json(user);
});
// PATCH /api/admin/users/:id  (edit details, approve / reject, toggle admin)
router.patch('/users/:id', async (req, res) => {
    const id = String(req.params.id);
    const existing = await db_1.prisma.user.findUnique({ where: { id } });
    if (!existing)
        return res.status(404).json({ error: 'User not found' });
    const { name, phone, role, officerType, trade, mineId, badgeNumber, isAdmin, status, reviewNote } = req.body;
    if (status !== undefined && !roles_1.USER_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
    }
    if (id === req.user.id && isAdmin === false) {
        return res.status(400).json({ error: 'You cannot remove your own admin access.' });
    }
    const nextRole = role !== undefined ? role : existing.role;
    const profileChanging = [role, officerType, trade, mineId].some((v) => v !== undefined);
    const approving = status === 'APPROVED';
    if ((profileChanging || approving) && (nextRole || !existing.isAdmin)) {
        const problem = (0, roles_1.validateProfile)({
            role: nextRole,
            officerType: officerType !== undefined ? officerType : existing.officerType,
            trade: trade !== undefined ? trade : existing.trade,
            mineId: mineId !== undefined ? mineId : existing.mineId,
        });
        if (problem)
            return res.status(400).json({ error: problem });
    }
    const user = await db_1.prisma.user.update({
        where: { id },
        data: {
            ...(name !== undefined ? { name: clean(name) || existing.name } : {}),
            ...(phone !== undefined ? { phone: clean(phone) } : {}),
            ...(role !== undefined ? { role } : {}),
            ...(officerType !== undefined || role !== undefined ? { officerType: nextRole === 'OFFICER' ? (officerType ?? existing.officerType) : null } : {}),
            ...(trade !== undefined || role !== undefined ? { trade: nextRole === 'WORKER' ? (trade ?? existing.trade) : null } : {}),
            ...(mineId !== undefined || role !== undefined ? { mineId: nextRole === 'DGMS' ? null : (mineId ?? existing.mineId) } : {}),
            ...(badgeNumber !== undefined ? { badgeNumber: clean(badgeNumber) } : {}),
            ...(isAdmin !== undefined ? { isAdmin: Boolean(isAdmin) } : {}),
            ...(status !== undefined ? { status, reviewedAt: new Date() } : {}),
            ...(reviewNote !== undefined ? { reviewNote: clean(reviewNote) } : {}),
        },
        select: authRoutes_1.PUBLIC_USER_SELECT,
    });
    if (status && status !== existing.status && (status === 'APPROVED' || status === 'REJECTED')) {
        await db_1.prisma.notification.create({
            data: {
                userId: id,
                title: status === 'APPROVED' ? 'Your account is approved' : 'Your registration needs changes',
                message: status === 'APPROVED' ? 'You now have access to Khanan Rakshak.' : clean(reviewNote) || 'Please review and resubmit your details.',
                type: 'INFO',
            },
        });
    }
    return res.json(user);
});
exports.default = router;
