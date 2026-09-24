"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/corrective-actions
router.get('/', async (req, res) => {
    const { priority, status } = req.query;
    const where = {};
    if (priority)
        where.priority = String(priority);
    if (status)
        where.status = String(status);
    const actions = await db_1.prisma.correctiveAction.findMany({
        where,
        orderBy: { deadline: 'asc' }
    });
    // Calculate overdue status dynamically
    const now = new Date();
    const enhanced = actions.map((act) => {
        const isOverdue = act.status !== 'COMPLETED' && new Date(act.deadline) < now;
        return {
            ...act,
            isOverdue,
            status: isOverdue ? 'OVERDUE' : act.status
        };
    });
    return res.json(enhanced);
});
// POST /api/corrective-actions
router.post('/', (0, auth_1.requireLevel)('SUPERVISOR'), async (req, res) => {
    try {
        const { issueId, issueType, actionRequired, responsiblePerson, deadline, priority, evidence } = req.body;
        if (!issueId || !actionRequired || !responsiblePerson || !deadline) {
            return res.status(400).json({ error: 'Issue ID, action required, responsible person, and deadline are required' });
        }
        const rand = Math.floor(10000 + Math.random() * 90000);
        const actId = `ACT-2026-${rand}`;
        const action = await db_1.prisma.correctiveAction.create({
            data: {
                id: actId,
                issueId,
                issueType: issueType || 'SAFETY_REPORT',
                actionRequired,
                responsiblePerson,
                deadline: new Date(deadline),
                priority: priority || 'HIGH',
                status: 'PENDING',
                evidence: evidence || null
            }
        });
        const auditBlock = await auditService_1.AuditService.recordEvent({
            recordType: 'CORRECTIVE_ACTION',
            recordId: action.id,
            action: 'CREATED',
            performedByRole: (0, auth_1.actorRole)(req),
            data: {
                id: action.id,
                issueId: action.issueId,
                actionRequired: action.actionRequired,
                responsible: action.responsiblePerson,
                deadline: action.deadline
            }
        });
        return res.status(201).json({ action, auditBlock });
    }
    catch (err) {
        console.error('Error creating corrective action:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
// PATCH /api/corrective-actions/:id
router.patch('/:id', (0, auth_1.requireLevel)('SUPERVISOR'), async (req, res) => {
    try {
        const { status, evidence, verifiedBy } = req.body;
        const actId = String(req.params.id);
        const existing = await db_1.prisma.correctiveAction.findUnique({ where: { id: actId } });
        if (!existing)
            return res.status(404).json({ error: 'Action not found' });
        const updated = await db_1.prisma.correctiveAction.update({
            where: { id: actId },
            data: {
                status: status || existing.status,
                evidence: evidence !== undefined ? evidence : existing.evidence,
                verifiedBy: verifiedBy || existing.verifiedBy,
                completedAt: status === 'COMPLETED' ? new Date() : existing.completedAt
            }
        });
        const auditBlock = await auditService_1.AuditService.recordEvent({
            recordType: 'CORRECTIVE_ACTION',
            recordId: actId,
            action: status === 'COMPLETED' ? 'RESOLVED' : 'STATUS_CHANGED',
            performedByRole: (0, auth_1.actorRole)(req, 'SUPERVISOR'),
            data: {
                id: actId,
                newStatus: status,
                evidence: evidence || null
            }
        });
        return res.json({ updated, auditBlock });
    }
    catch (err) {
        console.error('Error updating corrective action:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
exports.default = router;
