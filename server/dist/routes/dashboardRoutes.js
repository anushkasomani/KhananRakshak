"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const geo_1 = require("../geo");
const router = (0, express_1.Router)();
const OPEN_INCIDENT = { notIn: ['RESOLVED', 'CLOSED'] };
const OPEN_TASK = { in: ['SCHEDULED', 'RETURNED'] };
const ACTIVE_SOS = { in: ['ALERT_TRIGGERED', 'ACKNOWLEDGED', 'TEAM_ASSIGNED', 'RESPONDING'] };
const SEVERE_INCIDENT = { in: ['CRITICAL', 'FATALITY'] };
const HIGH_HAZARD = { in: ['HIGH', 'CRITICAL'] };
/** What each officer discipline looks at first. null = everything (safety officers own all hazards). */
const DISCIPLINE = {
    SAFETY: null,
    VENTILATION: { categories: ['VENTILATION', 'GAS'], incidents: ['METHANE_SPIKE'] },
    ELECTRICAL: { categories: ['ELECTRICAL'], incidents: ['ELECTRICAL_SHORT'] },
    MECHANICAL: { categories: ['MACHINERY', 'TRANSPORTATION'], incidents: ['EQUIPMENT_JAM'] },
    SURVEY: { categories: ['STRUCTURAL', 'ENVIRONMENTAL'], incidents: ['ROOF_FALL', 'INUNDATION'] },
    BLASTING: { categories: ['STRUCTURAL'], incidents: ['ROOF_FALL'] },
    OTHER: null,
};
/**
 * One number to sort mines by, kept deliberately simple so anyone can check it:
 * active SOS x10, severe open incidents x5, other open incidents x2, overdue inspections x2, open high/critical hazards x1.
 */
function riskOf(k) {
    const score = k.activeSos * 10 + k.severeIncidents * 5 + (k.openIncidents - k.severeIncidents) * 2 + k.overdueInspections * 2 + k.highHazards;
    return { score, level: score >= 10 ? 'HIGH' : score >= 4 ? 'ELEVATED' : 'NORMAL' };
}
async function mineKpis(mineId) {
    const now = new Date();
    const [staff, present, openIncidents, severeIncidents, openHazards, highHazards, overdueInspections, dueInspections, awaitingApproval, activeSos, openEscalations] = await Promise.all([
        db_1.prisma.user.count({ where: { mineId, status: 'APPROVED', role: { not: null } } }),
        db_1.prisma.attendance.count({ where: { mineId, date: (0, geo_1.indiaDate)() } }),
        db_1.prisma.incident.count({ where: { mineId, status: OPEN_INCIDENT } }),
        db_1.prisma.incident.count({ where: { mineId, status: OPEN_INCIDENT, severity: SEVERE_INCIDENT } }),
        db_1.prisma.safetyReport.count({ where: { mineId, status: { not: 'RESOLVED' } } }),
        db_1.prisma.safetyReport.count({ where: { mineId, status: { not: 'RESOLVED' }, severity: HIGH_HAZARD } }),
        db_1.prisma.inspection.count({ where: { mineId, status: OPEN_TASK, deadline: { lt: now } } }),
        db_1.prisma.inspection.count({ where: { mineId, status: OPEN_TASK } }),
        db_1.prisma.inspection.count({ where: { mineId, status: 'SUBMITTED' } }),
        db_1.prisma.sosAlert.count({ where: { mineId, status: ACTIVE_SOS } }),
        db_1.prisma.escalation.count({ where: { mineId, status: 'OPEN' } }),
    ]);
    const k = { staff, present, openIncidents, severeIncidents, openHazards, highHazards, overdueInspections, dueInspections, awaitingApproval, activeSos, openEscalations };
    return { ...k, risk: riskOf(k) };
}
/** Eight rolling 7-day buckets ending today, oldest first. */
async function weeklyTrends(mineId, staff) {
    const DAY = 86400000;
    const end = Date.now();
    const buckets = Array.from({ length: 8 }, (_, i) => {
        const from = new Date(end - (8 - i) * 7 * DAY);
        const to = new Date(end - (7 - i) * 7 * DAY);
        return { from, to, dates: (0, geo_1.recentDates)(7, new Date(to.getTime() - 1)) };
    });
    const since = buckets[0].from;
    const [hazards, incidents, completed, attendance] = await Promise.all([
        db_1.prisma.safetyReport.findMany({ where: { mineId, createdAt: { gte: since } }, select: { createdAt: true } }),
        db_1.prisma.incident.findMany({ where: { mineId, createdAt: { gte: since } }, select: { createdAt: true } }),
        db_1.prisma.inspection.findMany({ where: { mineId, status: 'COMPLETED', completedAt: { gte: since } }, select: { completedAt: true } }),
        db_1.prisma.attendance.groupBy({ by: ['date'], where: { mineId, date: { in: buckets.flatMap((b) => b.dates) } }, _count: { _all: true } }),
    ]);
    const perDay = new Map(attendance.map((a) => [a.date, a._count._all]));
    const inBucket = (d, b) => !!d && d >= b.from && d < b.to;
    return buckets.map((b) => {
        const checkIns = b.dates.reduce((sum, d) => sum + (perDay.get(d) || 0), 0);
        return {
            weekStart: (0, geo_1.indiaDate)(b.from),
            hazards: hazards.filter((h) => inBucket(h.createdAt, b)).length,
            incidents: incidents.filter((i) => inBucket(i.createdAt, b)).length,
            inspectionsCompleted: completed.filter((c) => inBucket(c.completedAt, b)).length,
            // Uses today's headcount for every week, so it is an estimate when staff numbers changed.
            attendanceRate: staff ? Math.round((checkIns / (staff * 7)) * 100) : 0,
        };
    });
}
async function officerFocus(u, mineId) {
    if (u.role !== 'OFFICER')
        return null;
    const d = DISCIPLINE[u.officerType || 'OTHER'];
    const [hazards, incidents] = await Promise.all([
        db_1.prisma.safetyReport.findMany({
            where: { mineId, status: { not: 'RESOLVED' }, ...(d ? { category: { in: d.categories } } : {}) },
            select: { id: true, category: true, severity: true, description: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 8,
        }),
        db_1.prisma.incident.findMany({
            where: { mineId, status: OPEN_INCIDENT, ...(d ? { incidentType: { in: d.incidents } } : {}) },
            select: { id: true, incidentType: true, severity: true, location: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 8,
        }),
    ]);
    return { discipline: u.officerType || 'OTHER', allAreas: d === null, hazards, incidents };
}
// GET /api/dashboard/mine/:mineId  (officer and above, own mine unless DGMS/admin)
router.get('/mine/:mineId', (0, auth_1.requireLevel)('OFFICER'), async (req, res) => {
    const mineId = String(req.params.mineId);
    if (!(0, auth_1.canSeeMine)(req, mineId))
        return res.status(403).json({ error: 'You can only see your own mine.' });
    const mine = await db_1.prisma.mine.findUnique({ where: { id: mineId }, select: { id: true, name: true, code: true } });
    if (!mine)
        return res.status(404).json({ error: 'Mine not found' });
    const kpis = await mineKpis(mineId);
    const [trends, focus] = await Promise.all([
        req.query.trends === '1' ? weeklyTrends(mineId, kpis.staff) : Promise.resolve(null),
        officerFocus(req.user, mineId),
    ]);
    return res.json({ mine, kpis, trends, focus });
});
// GET /api/dashboard/overview  (DGMS and admin: every mine, riskiest first)
router.get('/overview', async (req, res) => {
    const u = req.user;
    if (!u.isAdmin && u.role !== 'DGMS')
        return res.status(403).json({ error: 'Only DGMS can see all mines.' });
    const mines = await db_1.prisma.mine.findMany({
        select: { id: true, name: true, code: true, state: true, locality: true, latitude: true, longitude: true, radiusMeters: true },
    });
    const rows = await Promise.all(mines.map(async (m) => ({ ...m, kpis: await mineKpis(m.id) })));
    rows.sort((a, b) => b.kpis.risk.score - a.kpis.risk.score || a.name.localeCompare(b.name));
    const activeSos = await db_1.prisma.sosAlert.findMany({
        where: { status: ACTIVE_SOS },
        select: { id: true, emergencyType: true, status: true, triggeredAt: true, mine: { select: { id: true, name: true } }, zone: { select: { name: true } } },
        orderBy: { triggeredAt: 'desc' },
    });
    return res.json({ mines: rows, activeSos });
});
exports.default = router;
