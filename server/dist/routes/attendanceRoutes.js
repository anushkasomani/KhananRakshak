"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../roles");
const geo_1 = require("../geo");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const MAX_ACCURACY_M = 200; // readings less precise than this can't prove someone is on site
// Temporary testing aid: ATTENDANCE_RADIUS_OVERRIDE_M in .env widens every mine's check-in area (e.g. 10000 = 10 km).
const effectiveRadius = (radius) => Math.max(radius, Number(process.env.ATTENDANCE_RADIUS_OVERRIDE_M) || 0);
// A reading may be off by up to a tenth of the check-in area, and is never held to better than 200 m.
const maxAccuracyFor = (radius) => Math.max(MAX_ACCURACY_M, radius / 10);
const MAX_OFFLINE_AGE_MS = 12 * 3600 * 1000; // queued check-ins older than a shift are rejected
const LATE_SYNC_MS = 5 * 60 * 1000;
const PERSON_SELECT = { id: true, name: true, role: true, officerType: true, trade: true, badgeNumber: true, phone: true };
const RECORD_SELECT = {
    id: true,
    date: true,
    checkInAt: true,
    checkInDistance: true,
    checkInAccuracy: true,
    checkOutAt: true,
    checkOutDistance: true,
    syncedLate: true,
    source: true,
    markedById: true,
    markedByName: true,
    note: true,
};
/** A person can be marked present by someone above them in the hierarchy (or an admin), never by themselves. */
const canMark = (actor, target) => actor.id !== target.id && (actor.isAdmin || (0, roles_1.roleLevel)(actor.role) > (0, roles_1.roleLevel)(target.role));
function parseReading(body, maxAccuracy = MAX_ACCURACY_M) {
    const lat = Number(body?.latitude);
    const lng = Number(body?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return { error: 'Location is missing. Turn on GPS and try again.' };
    }
    const accuracy = body?.accuracy == null ? null : Number(body.accuracy);
    if (accuracy != null && (!Number.isFinite(accuracy) || accuracy > maxAccuracy)) {
        return { error: `GPS signal is too weak (±${Math.round(accuracy)} m). Move to an open area and try again.` };
    }
    const now = Date.now();
    let capturedAt = new Date(now);
    if (body?.capturedAt) {
        const t = new Date(body.capturedAt).getTime();
        if (!Number.isFinite(t) || t > now + 2 * 60 * 1000)
            return { error: 'Your phone clock looks wrong. Fix the time and try again.' };
        if (now - t > MAX_OFFLINE_AGE_MS)
            return { error: 'This check-in was saved too long ago to be accepted.' };
        capturedAt = new Date(t);
    }
    return { reading: { lat, lng, accuracy, capturedAt, syncedLate: now - capturedAt.getTime() > LATE_SYNC_MS } };
}
async function mineFor(req) {
    if (!req.user?.mineId)
        return null;
    const mine = await db_1.prisma.mine.findUnique({
        where: { id: req.user.mineId },
        select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true },
    });
    return mine && { ...mine, radiusMeters: effectiveRadius(mine.radiusMeters) };
}
// GET /api/attendance/me  (today's record, recent history and the geofence to check against)
router.get('/me', async (req, res) => {
    const mine = await mineFor(req);
    const history = await db_1.prisma.attendance.findMany({
        where: { userId: req.user.id },
        select: RECORD_SELECT,
        orderBy: { date: 'desc' },
        take: 30,
    });
    const today = (0, geo_1.indiaDate)();
    return res.json({ date: today, mine, today: history.find((r) => r.date === today) || null, history });
});
// POST /api/attendance/check-in
router.post('/check-in', async (req, res) => {
    const mine = await mineFor(req);
    if (!mine)
        return res.status(400).json({ error: 'You are not assigned to a mine yet.' });
    if (mine.latitude == null || mine.longitude == null) {
        return res.status(400).json({ error: 'Your mine has no location set. Ask the admin to place it on the map.' });
    }
    const { reading, error } = parseReading(req.body, maxAccuracyFor(mine.radiusMeters));
    if (error)
        return res.status(400).json({ error });
    const r = reading;
    const distance = Math.round((0, geo_1.distanceMeters)(r.lat, r.lng, mine.latitude, mine.longitude));
    if (distance > mine.radiusMeters) {
        return res.status(422).json({
            error: `You are ${distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`} from ${mine.name}. Check in from inside the mine area.`,
            distance,
            radiusMeters: mine.radiusMeters,
        });
    }
    const date = (0, geo_1.indiaDate)(r.capturedAt);
    const existing = await db_1.prisma.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date } }, select: RECORD_SELECT });
    if (existing)
        return res.status(200).json(existing);
    const record = await db_1.prisma.attendance.create({
        data: {
            userId: req.user.id,
            mineId: mine.id,
            date,
            checkInAt: r.capturedAt,
            checkInLat: r.lat,
            checkInLng: r.lng,
            checkInAccuracy: r.accuracy,
            checkInDistance: distance,
            syncedLate: r.syncedLate,
        },
        select: RECORD_SELECT,
    });
    return res.status(201).json(record);
});
// POST /api/attendance/check-out  (location is recorded but not enforced, people leave the site to check out)
router.post('/check-out', async (req, res) => {
    const own = await mineFor(req);
    const { reading, error } = parseReading(req.body, maxAccuracyFor(own?.radiusMeters ?? 0));
    if (error)
        return res.status(400).json({ error });
    const r = reading;
    const date = (0, geo_1.indiaDate)(r.capturedAt);
    const existing = await db_1.prisma.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date } } });
    if (!existing)
        return res.status(400).json({ error: 'You have not checked in today.' });
    if (existing.checkOutAt) {
        return res.json(await db_1.prisma.attendance.findUnique({ where: { id: existing.id }, select: RECORD_SELECT }));
    }
    const mine = await db_1.prisma.mine.findUnique({ where: { id: existing.mineId } });
    const distance = mine?.latitude != null && mine?.longitude != null
        ? Math.round((0, geo_1.distanceMeters)(r.lat, r.lng, mine.latitude, mine.longitude))
        : null;
    const record = await db_1.prisma.attendance.update({
        where: { id: existing.id },
        data: { checkOutAt: r.capturedAt, checkOutLat: r.lat, checkOutLng: r.lng, checkOutDistance: distance },
        select: RECORD_SELECT,
    });
    return res.json(record);
});
// POST /api/attendance/mark  { userId, note }  (supervisor marks someone present today without GPS, e.g. phone died)
router.post('/mark', (0, auth_1.requireLevel)('SUPERVISOR'), async (req, res) => {
    const actor = req.user;
    const note = String(req.body?.note || '').trim();
    if (note.length < 3)
        return res.status(400).json({ error: 'Give a reason, for example "phone battery dead".' });
    if (note.length > 200)
        return res.status(400).json({ error: 'Keep the reason under 200 characters.' });
    const target = await db_1.prisma.user.findUnique({ where: { id: String(req.body?.userId || '') } });
    if (!target || target.status !== 'APPROVED' || !target.mineId)
        return res.status(404).json({ error: 'Person not found.' });
    if (!(0, auth_1.canSeeMine)(req, target.mineId))
        return res.status(403).json({ error: 'This person works at another mine.' });
    if (!canMark(actor, target))
        return res.status(403).json({ error: 'You can only mark people below you in the hierarchy.' });
    const date = (0, geo_1.indiaDate)();
    const existing = await db_1.prisma.attendance.findUnique({ where: { userId_date: { userId: target.id, date } }, select: RECORD_SELECT });
    if (existing)
        return res.status(409).json({ error: `${target.name} is already checked in today.` });
    const record = await db_1.prisma.attendance.create({
        data: {
            userId: target.id,
            mineId: target.mineId,
            date,
            checkInAt: new Date(),
            source: 'MANUAL',
            markedById: actor.id,
            markedByName: actor.name,
            note,
        },
        select: RECORD_SELECT,
    });
    await db_1.prisma.notification.create({
        data: { userId: target.id, title: 'Marked present', message: `${actor.name} marked you present today: ${note}`, type: 'INFO' },
    });
    return res.status(201).json(record);
});
// DELETE /api/attendance/mark/:id  (undo a manual mark from today)
router.delete('/mark/:id', (0, auth_1.requireLevel)('SUPERVISOR'), async (req, res) => {
    const record = await db_1.prisma.attendance.findUnique({ where: { id: String(req.params.id) }, include: { user: true } });
    if (!record)
        return res.status(404).json({ error: 'Record not found.' });
    if (record.source !== 'MANUAL')
        return res.status(400).json({ error: 'Only manual marks can be undone. GPS check-ins stay on record.' });
    if (record.date !== (0, geo_1.indiaDate)())
        return res.status(400).json({ error: "Only today's marks can be undone." });
    if (!(0, auth_1.canSeeMine)(req, record.mineId) || !canMark(req.user, record.user)) {
        return res.status(403).json({ error: 'You cannot change this record.' });
    }
    await db_1.prisma.attendance.delete({ where: { id: record.id } });
    return res.json({ ok: true });
});
// GET /api/attendance/mine/:mineId?date=YYYY-MM-DD  (supervisor and above; own mine unless DGMS or admin)
router.get('/mine/:mineId', (0, auth_1.requireLevel)('SUPERVISOR'), async (req, res) => {
    const mineId = String(req.params.mineId);
    const u = req.user;
    if (!u.isAdmin && u.role !== 'DGMS' && u.mineId !== mineId) {
        return res.status(403).json({ error: 'You can only view attendance for your own mine.' });
    }
    const date = (0, geo_1.isDateString)(req.query.date) ? req.query.date : (0, geo_1.indiaDate)();
    const mine = await db_1.prisma.mine.findUnique({
        where: { id: mineId },
        select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true },
    });
    if (!mine)
        return res.status(404).json({ error: 'Mine not found' });
    const trendDates = (0, geo_1.recentDates)(7, new Date(`${date}T12:00:00+05:30`));
    const [staff, records, trendRows] = await Promise.all([
        db_1.prisma.user.findMany({ where: { mineId, status: 'APPROVED', role: { not: null } }, select: PERSON_SELECT }),
        db_1.prisma.attendance.findMany({ where: { mineId, date }, select: { ...RECORD_SELECT, userId: true } }),
        db_1.prisma.attendance.groupBy({ by: ['date'], where: { mineId, date: { in: trendDates } }, _count: { _all: true } }),
    ]);
    const byUser = new Map(records.map(({ userId, ...rec }) => [userId, rec]));
    const order = (role) => roles_1.ROLES.indexOf(role);
    const people = staff
        .map((p) => ({ ...p, attendance: byUser.get(p.id) || null }))
        .sort((a, b) => order(a.role) - order(b.role) || a.name.localeCompare(b.name));
    const counts = new Map(trendRows.map((t) => [t.date, t._count._all]));
    return res.json({
        date,
        today: (0, geo_1.indiaDate)(),
        mine,
        people,
        summary: { total: people.length, present: people.filter((p) => p.attendance).length },
        trend: trendDates.map((d) => ({ date: d, present: counts.get(d) || 0 })),
    });
});
exports.default = router;
