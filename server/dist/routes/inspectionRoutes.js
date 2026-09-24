"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const photoStorage_1 = require("../services/photoStorage");
const geo_1 = require("../geo");
const roles_1 = require("../roles");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const TYPES = ['ROUTINE', 'ROOF_SUPPORT_CHECK', 'VENTILATION_AUDIT', 'ELECTRICAL_SAFETY', 'MACHINERY_CHECK', 'FIRE_SAFETY', 'STATUTORY_QUARTERLY'];
const MAX_PHOTOS = 4;
const INCLUDE = {
    mine: { select: { id: true, name: true, code: true } },
    assignedTo: { select: { id: true, name: true, role: true, officerType: true, trade: true, phone: true } },
};
const parseJson = (s, fallback) => {
    try {
        return s ? JSON.parse(s) : fallback;
    }
    catch {
        return fallback;
    }
};
const present = ({ checklistData, photos, ...rest }) => ({
    ...rest,
    checklist: parseJson(checklistData, []),
    photos: parseJson(photos, []),
});
const humanize = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const labelOf = (i) => i.title || humanize(i.inspectionType);
/** Anyone strictly above the assignee at that mine (or DGMS / admin) may approve; never the assignee. */
const canReview = (u, i, req) => u.id !== i.assignedToId && (u.isAdmin || ((0, auth_1.canSeeMine)(req, i.mineId) && (0, roles_1.roleLevel)(u.role) > (0, roles_1.roleLevel)(i.assignedTo?.role)));
async function notify(userIds, title, message, type = 'INFO') {
    if (userIds.length)
        await db_1.prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, title, message, type })) });
}
async function load(id) {
    return db_1.prisma.inspection.findUnique({ where: { id }, include: INCLUDE });
}
// GET /api/inspections  (own mine unless DGMS/admin; workers see only what is assigned to them)
router.get('/', async (req, res) => {
    const u = req.user;
    const where = {};
    const scope = (0, auth_1.mineScope)(req);
    if (scope)
        where.mineId = scope;
    else if (req.query.mineId)
        where.mineId = String(req.query.mineId);
    if (!u.isAdmin && (0, roles_1.roleLevel)(u.role) < roles_1.ROLE_LEVEL.SUPERVISOR)
        where.assignedToId = u.id;
    const rows = await db_1.prisma.inspection.findMany({ where, include: INCLUDE, orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }] });
    return res.json(rows.map((r) => ({ ...present(r), canReview: r.status === 'SUBMITTED' && canReview(u, r, req) })));
});
// POST /api/inspections/assign  (admin)  { mineId, assignedToId, inspectionType, title, dueDate }
router.post('/assign', auth_1.requireAdmin, async (req, res) => {
    const { mineId, assignedToId, inspectionType, title, dueDate } = req.body || {};
    if (!TYPES.includes(inspectionType))
        return res.status(400).json({ error: 'Choose an inspection type.' });
    const due = new Date(dueDate);
    if (!dueDate || Number.isNaN(due.getTime()))
        return res.status(400).json({ error: 'Choose a due date.' });
    const person = await db_1.prisma.user.findUnique({ where: { id: String(assignedToId || '') }, include: { mine: true } });
    if (!person || person.status !== 'APPROVED' || !person.role)
        return res.status(400).json({ error: 'Choose who will do it.' });
    if (person.mineId !== mineId)
        return res.status(400).json({ error: `${person.name} does not work at this mine.` });
    const id = `INS-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const inspection = await db_1.prisma.inspection.create({
        data: {
            id,
            mineId,
            inspectionType,
            title: String(title || '').trim() || null,
            inspectorName: person.name,
            checklistData: '[]',
            findings: '',
            deadline: due,
            status: 'SCHEDULED',
            assignedToId: person.id,
            assignedById: req.user.id,
            assignedByName: req.user.name,
        },
        include: INCLUDE,
    });
    await notify([person.id], `Inspection assigned: ${labelOf(inspection)}`, `Due ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${person.mine?.name}. Mark it done with a photo.`, 'WARNING');
    await auditService_1.AuditService.recordEvent({
        recordType: 'INSPECTION',
        recordId: id,
        action: 'CREATED',
        performedByRole: (0, auth_1.actorRole)(req),
        data: { id, type: inspectionType, assignedTo: person.name, due: due.toISOString() },
    });
    return res.status(201).json(present(inspection));
});
// POST /api/inspections/:id/submit  (assignee)  { outcome: DONE | NOT_DONE, note, photos: dataURL[], latitude?, longitude? }
router.post('/:id/submit', async (req, res) => {
    const u = req.user;
    const existing = await load(String(req.params.id));
    if (!existing)
        return res.status(404).json({ error: 'Inspection not found.' });
    if (existing.assignedToId !== u.id)
        return res.status(403).json({ error: 'This inspection is assigned to someone else.' });
    if (!['SCHEDULED', 'RETURNED'].includes(existing.status))
        return res.status(409).json({ error: 'This inspection has already been submitted.' });
    const { outcome, note, photos, latitude, longitude } = req.body || {};
    if (outcome !== 'DONE' && outcome !== 'NOT_DONE')
        return res.status(400).json({ error: 'Say whether it was done.' });
    const text = String(note || '').trim();
    const list = Array.isArray(photos) ? photos : [];
    if (list.length > MAX_PHOTOS)
        return res.status(400).json({ error: `Add at most ${MAX_PHOTOS} photos.` });
    if (outcome === 'DONE' && list.length === 0)
        return res.status(400).json({ error: 'Add at least one photo as proof.' });
    if (outcome === 'NOT_DONE' && text.length < 3)
        return res.status(400).json({ error: 'Say why it could not be done.' });
    if (text.length > 1000)
        return res.status(400).json({ error: 'Keep the note under 1000 characters.' });
    let urls;
    try {
        urls = [];
        for (const p of list)
            urls.push(await (0, photoStorage_1.savePhoto)(p, 'inspections'));
    }
    catch (e) {
        if (e instanceof photoStorage_1.PhotoError)
            return res.status(400).json({ error: e.message });
        throw e;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    const hasPos = latitude != null && longitude != null && Number.isFinite(lat) && Number.isFinite(lng);
    const mine = await db_1.prisma.mine.findUnique({ where: { id: existing.mineId } });
    const distance = hasPos && mine?.latitude != null && mine?.longitude != null ? Math.round((0, geo_1.distanceMeters)(lat, lng, mine.latitude, mine.longitude)) : null;
    const inspection = await db_1.prisma.inspection.update({
        where: { id: existing.id },
        data: {
            status: 'SUBMITTED',
            outcome,
            submissionNote: text || null,
            photos: JSON.stringify(urls),
            submittedAt: new Date(),
            submitLat: hasPos ? lat : null,
            submitLng: hasPos ? lng : null,
            submitDistance: distance,
            findings: text,
            reviewedById: null,
            reviewedByName: null,
            reviewedAt: null,
        },
        include: INCLUDE,
    });
    const reviewers = await db_1.prisma.user.findMany({
        where: { mineId: existing.mineId, status: 'APPROVED', role: { not: null }, id: { not: u.id } },
        select: { id: true, role: true },
    });
    await notify(reviewers.filter((r) => (0, roles_1.roleLevel)(r.role) > (0, roles_1.roleLevel)(u.role)).map((r) => r.id), `Inspection to approve: ${labelOf(existing)}`, `${u.name} marked it ${outcome === 'DONE' ? 'done' : 'not done'}${urls.length ? ` with ${urls.length} photo${urls.length > 1 ? 's' : ''}` : ''}.`);
    await auditService_1.AuditService.recordEvent({
        recordType: 'INSPECTION',
        recordId: existing.id,
        action: 'STATUS_CHANGED',
        performedByRole: (0, auth_1.actorRole)(req),
        data: { id: existing.id, outcome, photos: urls.length, distance },
    });
    return res.json(present(inspection));
});
// POST /api/inspections/:id/review  (anyone above the assignee)  { decision: APPROVE | RETURN, note }
router.post('/:id/review', async (req, res) => {
    const u = req.user;
    const existing = await load(String(req.params.id));
    if (!existing)
        return res.status(404).json({ error: 'Inspection not found.' });
    if (!canReview(u, existing, req))
        return res.status(403).json({ error: 'Only someone above the assignee can approve this.' });
    if (existing.status !== 'SUBMITTED')
        return res.status(409).json({ error: 'This inspection is not waiting for approval.' });
    const { decision, note } = req.body || {};
    const text = String(note || '').trim();
    if (decision !== 'APPROVE' && decision !== 'RETURN')
        return res.status(400).json({ error: 'Approve or send it back.' });
    if (decision === 'RETURN' && text.length < 3)
        return res.status(400).json({ error: 'Say what needs to be redone.' });
    const status = decision === 'RETURN' ? 'RETURNED' : existing.outcome === 'DONE' ? 'COMPLETED' : 'MISSED';
    const inspection = await db_1.prisma.inspection.update({
        where: { id: existing.id },
        data: {
            status,
            reviewedById: u.id,
            reviewedByName: u.name,
            reviewedAt: new Date(),
            reviewNote: text || null,
            completedAt: status === 'COMPLETED' ? new Date() : null,
        },
        include: INCLUDE,
    });
    if (existing.assignedToId) {
        await notify([existing.assignedToId], decision === 'RETURN' ? `Sent back: ${labelOf(existing)}` : `Approved: ${labelOf(existing)}`, decision === 'RETURN' ? `${u.name}: ${text}` : `${u.name} approved your inspection.${text ? ` ${text}` : ''}`, decision === 'RETURN' ? 'WARNING' : 'INFO');
    }
    const block = await auditService_1.AuditService.recordEvent({
        recordType: 'INSPECTION',
        recordId: existing.id,
        action: decision === 'RETURN' ? 'STATUS_CHANGED' : 'VERIFIED',
        performedByRole: (0, auth_1.actorRole)(req),
        data: { id: existing.id, decision, status, reviewedBy: u.name },
    });
    if (block && status === 'COMPLETED')
        await db_1.prisma.inspection.update({ where: { id: existing.id }, data: { recordHash: block.currentHash } });
    return res.json(present(inspection));
});
exports.default = router;
