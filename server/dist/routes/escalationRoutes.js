"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../roles");
const voiceAlerts_1 = require("../services/voiceAlerts");
const auditService_1 = require("../services/auditService");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const TARGETS = ['OFFICER', 'MINE_MANAGER', 'PROJECT_MANAGER', 'DGMS'];
const ROLE_LABEL = {
    SUPERVISOR: 'Supervisor',
    OFFICER: 'Officer',
    MINE_MANAGER: 'Mine manager',
    PROJECT_MANAGER: 'Project manager',
    DGMS: 'DGMS',
};
const RECIPIENT_SELECT = { id: true, name: true, role: true, officerType: true, phone: true, badgeNumber: true };
const ESCALATION_INCLUDE = {
    fromUser: { select: { id: true, name: true, role: true, officerType: true, phone: true } },
    mine: { select: { id: true, name: true } },
};
const humanize = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const targetLabel = (role, officerType) => role === 'OFFICER' && officerType ? `${humanize(officerType)} officer` : ROLE_LABEL[role] || role;
async function loadRecord(type, id) {
    if (type === 'INCIDENT') {
        const inc = await db_1.prisma.incident.findUnique({ where: { id }, include: { mine: true } });
        if (!inc)
            return null;
        return {
            mineId: inc.mineId,
            mineName: inc.mine.name,
            summary: `${humanize(inc.incidentType)} · ${inc.location}`,
            severe: inc.severity === 'CRITICAL' || inc.severity === 'FATALITY',
        };
    }
    if (type === 'SOS') {
        const sos = await db_1.prisma.sosAlert.findUnique({ where: { id }, include: { mine: true, zone: true } });
        if (!sos)
            return null;
        return {
            mineId: sos.mineId,
            mineName: sos.mine.name,
            summary: `SOS: ${humanize(sos.emergencyType)}${sos.zone ? ` · ${sos.zone.name}` : ''}`,
            severe: true,
        };
    }
    return null;
}
/** Levels this user may escalate to: strictly above their own. Admins may pick any. */
const allowedTargets = (u) => (u.isAdmin ? TARGETS : TARGETS.filter((t) => roles_1.ROLE_LEVEL[t] > (0, roles_1.roleLevel)(u.role)));
const recipientsWhere = (mineId, toRole, toOfficerType) => ({
    status: 'APPROVED',
    role: toRole,
    ...(toRole === 'DGMS' ? {} : { mineId }),
    ...(toRole === 'OFFICER' && toOfficerType ? { officerType: toOfficerType } : {}),
});
const isRecipient = (u, e) => u.role === e.toRole && (e.toRole === 'DGMS' || u.mineId === e.mineId) && (!e.toOfficerType || u.officerType === e.toOfficerType);
function parseTarget(u, toRole, officerType) {
    if (!(0, roles_1.isRole)(toRole) || !TARGETS.includes(toRole))
        return { error: 'Choose who to escalate to.' };
    if (!allowedTargets(u).includes(toRole))
        return { error: 'You can only escalate to a level above your own.' };
    if (officerType && (toRole !== 'OFFICER' || !roles_1.OFFICER_TYPES.includes(officerType))) {
        return { error: 'Invalid officer type.' };
    }
    return { toRole, toOfficerType: toRole === 'OFFICER' && officerType ? String(officerType) : null };
}
// GET /api/escalations/recipients?mineId=&toRole=&officerType=  (preview who will be notified)
router.get('/recipients', (0, auth_1.requireLevel)('SUPERVISOR'), async (req, res) => {
    const mineId = String(req.query.mineId || '');
    if (!mineId || !(0, auth_1.canSeeMine)(req, mineId))
        return res.status(403).json({ error: 'You can only escalate within your own mine.' });
    const { toRole, toOfficerType, error } = parseTarget(req.user, req.query.toRole, req.query.officerType);
    if (error)
        return res.status(400).json({ error });
    const people = await db_1.prisma.user.findMany({ where: recipientsWhere(mineId, toRole, toOfficerType), select: RECIPIENT_SELECT, orderBy: { name: 'asc' } });
    return res.json(people);
});
// POST /api/escalations  { recordType, recordId, toRole, toOfficerType?, reason }
router.post('/', (0, auth_1.requireLevel)('SUPERVISOR'), async (req, res) => {
    const u = req.user;
    const { recordType, recordId, reason } = req.body || {};
    const record = await loadRecord(String(recordType), String(recordId));
    if (!record)
        return res.status(404).json({ error: 'Incident or SOS not found.' });
    if (!(0, auth_1.canSeeMine)(req, record.mineId))
        return res.status(403).json({ error: 'You can only escalate within your own mine.' });
    const { toRole, toOfficerType, error } = parseTarget(u, req.body?.toRole, req.body?.toOfficerType);
    if (error)
        return res.status(400).json({ error });
    const why = String(reason || '').trim();
    if (why.length < 3)
        return res.status(400).json({ error: 'Say briefly why this needs attention.' });
    if (why.length > 500)
        return res.status(400).json({ error: 'Keep the reason under 500 characters.' });
    const duplicate = await db_1.prisma.escalation.findFirst({
        where: { recordType, recordId, toRole, toOfficerType: toOfficerType ?? null, status: 'OPEN' },
    });
    if (duplicate) {
        return res.status(409).json({ error: `Already escalated to ${targetLabel(toRole, toOfficerType)} and waiting for them to acknowledge.` });
    }
    const recipients = await db_1.prisma.user.findMany({
        where: recipientsWhere(record.mineId, toRole, toOfficerType),
        select: RECIPIENT_SELECT,
        orderBy: { name: 'asc' },
    });
    const voiceMessage = `Khanan Rakshak alert. ${record.summary} at ${record.mineName}. Escalated by ${u.name}. ${why}`;
    const callStatus = record.severe ? await (0, voiceAlerts_1.placeCalls)(recipients.map((r) => ({ name: r.name, phone: r.phone || '' })), voiceMessage) : 'NONE';
    const escalation = await db_1.prisma.escalation.create({
        data: {
            recordType,
            recordId,
            mineId: record.mineId,
            summary: record.summary,
            severe: record.severe,
            fromUserId: u.id,
            toRole: toRole,
            toOfficerType: toOfficerType ?? null,
            reason: why,
            recipientCount: recipients.length,
            callStatus,
        },
        include: ESCALATION_INCLUDE,
    });
    if (recipients.length) {
        await db_1.prisma.notification.createMany({
            data: recipients.map((r) => ({
                userId: r.id,
                title: `Escalated to you: ${record.summary}`,
                message: `${u.name} (${targetLabel(u.role || 'ADMIN', u.officerType)}) at ${record.mineName}: ${why}`,
                type: recordType === 'SOS' ? 'SOS' : 'WARNING',
            })),
        });
    }
    await auditService_1.AuditService.recordEvent({
        recordType: recordType === 'SOS' ? 'SOS_ALERT' : 'INCIDENT',
        recordId,
        action: 'ESCALATED',
        performedByRole: (0, auth_1.actorRole)(req),
        data: { recordId, to: targetLabel(toRole, toOfficerType), reason: why, recipients: recipients.length },
    });
    return res.status(201).json({ escalation, recipients, callStatus });
});
// GET /api/escalations?recordType=&recordId=  (history for one record)
router.get('/', async (req, res) => {
    const recordType = String(req.query.recordType || '');
    const recordId = String(req.query.recordId || '');
    const record = await loadRecord(recordType, recordId);
    if (!record)
        return res.status(404).json({ error: 'Incident or SOS not found.' });
    if (!(0, auth_1.canSeeMine)(req, record.mineId))
        return res.status(403).json({ error: 'Not available for your mine.' });
    const list = await db_1.prisma.escalation.findMany({ where: { recordType, recordId }, include: ESCALATION_INCLUDE, orderBy: { createdAt: 'desc' } });
    return res.json(list);
});
// GET /api/escalations/inbox  (escalations addressed to me, and ones I sent)
router.get('/inbox', async (req, res) => {
    const u = req.user;
    const forMeWhere = u.isAdmin
        ? {}
        : u.role && TARGETS.includes(u.role)
            ? {
                toRole: u.role,
                ...(u.role === 'DGMS' ? {} : { mineId: u.mineId || 'NO_MINE' }),
                OR: [{ toOfficerType: null }, { toOfficerType: u.officerType || '' }],
            }
            : null;
    const [forMe, sent] = await Promise.all([
        forMeWhere
            ? db_1.prisma.escalation.findMany({ where: forMeWhere, include: ESCALATION_INCLUDE, orderBy: [{ status: 'desc' }, { createdAt: 'desc' }], take: 50 })
            : Promise.resolve([]),
        db_1.prisma.escalation.findMany({ where: { fromUserId: u.id }, include: ESCALATION_INCLUDE, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    return res.json({ forMe, sent, canReceive: forMeWhere !== null });
});
// POST /api/escalations/:id/acknowledge
router.post('/:id/acknowledge', async (req, res) => {
    const u = req.user;
    const existing = await db_1.prisma.escalation.findUnique({ where: { id: String(req.params.id) } });
    if (!existing)
        return res.status(404).json({ error: 'Escalation not found.' });
    if (!u.isAdmin && !isRecipient(u, existing))
        return res.status(403).json({ error: 'This escalation was not sent to you.' });
    if (existing.status === 'ACKNOWLEDGED') {
        return res.json(await db_1.prisma.escalation.findUnique({ where: { id: existing.id }, include: ESCALATION_INCLUDE }));
    }
    const escalation = await db_1.prisma.escalation.update({
        where: { id: existing.id },
        data: { status: 'ACKNOWLEDGED', acknowledgedById: u.id, acknowledgedByName: u.name, acknowledgedAt: new Date() },
        include: ESCALATION_INCLUDE,
    });
    await db_1.prisma.notification.create({
        data: {
            userId: existing.fromUserId,
            title: `Acknowledged: ${existing.summary}`,
            message: `${u.name} (${targetLabel(u.role || 'ADMIN', u.officerType)}) has seen your escalation.`,
            type: 'INFO',
        },
    });
    await auditService_1.AuditService.recordEvent({
        recordType: existing.recordType === 'SOS' ? 'SOS_ALERT' : 'INCIDENT',
        recordId: existing.recordId,
        action: 'STATUS_CHANGED',
        performedByRole: (0, auth_1.actorRole)(req),
        data: { escalationId: existing.id, acknowledgedBy: u.name },
    });
    return res.json(escalation);
});
exports.default = router;
