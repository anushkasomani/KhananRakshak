"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/notifications
router.get('/', auth_1.optionalAuthenticate, async (req, res) => {
    const notifications = await db_1.prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    return res.json(notifications);
});
// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
    const { count } = await db_1.prisma.notification.updateMany({
        where: { id: String(req.params.id), userId: req.user.id },
        data: { read: true }
    });
    if (count === 0)
        return res.status(404).json({ error: 'Notification not found' });
    return res.json({ ok: true });
});
// GET /api/announcements
router.get('/announcements', async (req, res) => {
    const { mineId } = req.query;
    const where = {};
    if (mineId)
        where.mineId = String(mineId);
    const announcements = await db_1.prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    return res.json(announcements);
});
exports.default = router;
