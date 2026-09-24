"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../roles");
const db_1 = require("../db");
const router = (0, express_1.Router)();
async function staffByMine() {
    const rows = await db_1.prisma.user.groupBy({
        by: ['mineId', 'role'],
        where: { status: 'APPROVED', mineId: { not: null }, role: { not: null } },
        _count: { _all: true },
    });
    const out = {};
    for (const r of rows) {
        const mineId = r.mineId;
        out[mineId] = out[mineId] || {};
        out[mineId][r.role] = r._count._all;
    }
    return out;
}
function parseMineInput(body) {
    const { name, locality, state, region, latitude, longitude, radiusMeters, code } = body;
    const data = {};
    if (name !== undefined) {
        if (!String(name).trim())
            return { error: 'Enter a mine name.' };
        data.name = String(name).trim();
    }
    if (locality !== undefined)
        data.locality = String(locality).trim() || null;
    if (state !== undefined) {
        if (!String(state).trim())
            return { error: 'Enter the state.' };
        data.state = String(state).trim();
    }
    if (region !== undefined)
        data.region = String(region).trim() || data.state || '';
    if (code !== undefined && String(code).trim())
        data.code = String(code).trim().toUpperCase();
    if (latitude !== undefined || longitude !== undefined) {
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return { error: 'Place the mine on the map.' };
        }
        data.latitude = lat;
        data.longitude = lng;
    }
    if (radiusMeters !== undefined) {
        const r = Math.round(Number(radiusMeters));
        if (!Number.isFinite(r) || r < 50 || r > 20000)
            return { error: 'Radius must be between 50 m and 20 km.' };
        data.radiusMeters = r;
    }
    return { data };
}
// GET /api/mines
router.get('/', async (_req, res) => {
    const [mines, staff] = await Promise.all([
        db_1.prisma.mine.findMany({ include: { zones: true }, orderBy: { name: 'asc' } }),
        staffByMine(),
    ]);
    return res.json(mines.map((m) => ({ ...m, staff: staff[m.id] || {} })));
});
// GET /api/mines/:id  (includes the approved staff roster)
router.get('/:id', async (req, res) => {
    const mine = await db_1.prisma.mine.findUnique({
        where: { id: req.params.id },
        include: {
            zones: true,
            users: {
                where: { status: 'APPROVED' },
                select: { id: true, name: true, email: true, phone: true, role: true, officerType: true, trade: true, badgeNumber: true },
                orderBy: { name: 'asc' },
            },
        },
    });
    if (!mine)
        return res.status(404).json({ error: 'Mine not found' });
    const order = (r) => roles_1.ROLES.indexOf((r || 'WORKER'));
    mine.users.sort((a, b) => order(b.role) - order(a.role) || a.name.localeCompare(b.name));
    return res.json(mine);
});
// POST /api/mines  (admin)
router.post('/', auth_1.requireAdmin, async (req, res) => {
    const { data, error } = parseMineInput(req.body);
    if (error)
        return res.status(400).json({ error });
    if (!data.name || !data.state || data.latitude === undefined) {
        return res.status(400).json({ error: 'Name, state and map location are required.' });
    }
    const code = data.code || `MINE-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    if (await db_1.prisma.mine.findUnique({ where: { code } })) {
        return res.status(409).json({ error: 'A mine with this code already exists.' });
    }
    const mine = await db_1.prisma.mine.create({
        data: {
            name: data.name,
            state: data.state,
            region: data.region || data.state,
            locality: data.locality ?? null,
            latitude: data.latitude,
            longitude: data.longitude,
            radiusMeters: data.radiusMeters ?? 500,
            code,
        },
    });
    return res.status(201).json(mine);
});
// PATCH /api/mines/:id  (admin)
router.patch('/:id', auth_1.requireAdmin, async (req, res) => {
    const existing = await db_1.prisma.mine.findUnique({ where: { id: String(req.params.id) } });
    if (!existing)
        return res.status(404).json({ error: 'Mine not found' });
    const { data, error } = parseMineInput(req.body);
    if (error)
        return res.status(400).json({ error });
    const mine = await db_1.prisma.mine.update({ where: { id: existing.id }, data: data });
    return res.json(mine);
});
exports.default = router;
