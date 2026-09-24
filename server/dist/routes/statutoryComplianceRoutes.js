"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const complianceService_1 = require("../services/complianceService");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validEnum = (value, values) => typeof value === 'string' && values.includes(value);
async function validateMine(req, mineId) {
    if (!mineId)
        return null;
    if (!(0, auth_1.canSeeMine)(req, mineId))
        return { status: 403, error: 'You cannot access compliance data for that mine.' };
    if (!await db_1.prisma.mine.findUnique({ where: { id: mineId }, select: { id: true } }))
        return { status: 404, error: 'Mine not found.' };
    return null;
}
router.get('/', async (req, res) => {
    const mineId = typeof req.query.mineId === 'string' ? req.query.mineId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const periodDays = Number(req.query.periodDays ?? 30);
    if (status && !validEnum(status, complianceService_1.COMPLIANCE_STATUSES))
        return res.status(400).json({ error: 'Invalid compliance status.' });
    if (category && !validEnum(category, complianceService_1.COMPLIANCE_CATEGORIES))
        return res.status(400).json({ error: 'Invalid compliance category.' });
    if (![7, 30, 90].includes(periodDays))
        return res.status(400).json({ error: 'Period must be 7, 30, or 90 days.' });
    const mineError = await validateMine(req, mineId);
    if (mineError)
        return res.status(mineError.status).json({ error: mineError.error });
    try {
        return res.json(await (0, complianceService_1.complianceDashboard)({ mineId, status, category, periodDays }));
    }
    catch (error) {
        console.error('Compliance dashboard failed:', error);
        return res.status(503).json({ error: 'Compliance data is temporarily unavailable.' });
    }
});
router.get('/rules', async (req, res) => {
    const mineId = typeof req.query.mineId === 'string' ? req.query.mineId : undefined;
    const mineError = await validateMine(req, mineId);
    if (mineError)
        return res.status(mineError.status).json({ error: mineError.error });
    try {
        const rules = await (0, complianceService_1.listComplianceRules)();
        return res.json(mineId ? rules.filter((rule) => !rule.applicableMines.length || rule.applicableMines.some((mine) => mine.id === mineId)) : rules);
    }
    catch (error) {
        console.error('Compliance rules load failed:', error);
        return res.status(503).json({ error: 'Compliance rules are temporarily unavailable.' });
    }
});
router.get('/checks', async (req, res) => {
    const mineId = typeof req.query.mineId === 'string' ? req.query.mineId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const periodDays = Number(req.query.periodDays ?? 30);
    if (status && !validEnum(status, complianceService_1.COMPLIANCE_STATUSES))
        return res.status(400).json({ error: 'Invalid compliance status.' });
    if (category && !validEnum(category, complianceService_1.COMPLIANCE_CATEGORIES))
        return res.status(400).json({ error: 'Invalid compliance category.' });
    if (![7, 30, 90].includes(periodDays))
        return res.status(400).json({ error: 'Period must be 7, 30, or 90 days.' });
    const mineError = await validateMine(req, mineId);
    if (mineError)
        return res.status(mineError.status).json({ error: mineError.error });
    try {
        return res.json(await (0, complianceService_1.listComplianceChecks)({ mineId, status, category, periodDays }));
    }
    catch (error) {
        console.error('Compliance checks load failed:', error);
        return res.status(503).json({ error: 'Compliance checks are temporarily unavailable.' });
    }
});
router.post('/evaluate', async (req, res) => {
    const mineId = typeof req.body?.mineId === 'string' && req.body.mineId ? req.body.mineId : undefined;
    const mineError = await validateMine(req, mineId);
    if (mineError)
        return res.status(mineError.status).json({ error: mineError.error });
    try {
        return res.json(await (0, complianceService_1.evaluateCompliance)(mineId, req.user.id));
    }
    catch (error) {
        if (error?.message === 'MINE_NOT_FOUND')
            return res.status(404).json({ error: 'Mine not found.' });
        console.error('Compliance evaluation failed:', error);
        return res.status(503).json({ error: 'Compliance evaluation is temporarily unavailable.' });
    }
});
router.post('/rules', async (req, res) => {
    const body = req.body || {};
    const code = text(body.code, 80).toUpperCase();
    const title = text(body.title, 160);
    const description = text(body.description, 1000);
    const sourceReference = text(body.sourceReference, 240);
    const category = body.category;
    const frequency = body.frequency;
    const severity = body.severity;
    const evaluationType = body.evaluationType;
    const applicableMineIds = Array.isArray(body.applicableMineIds) ? [...new Set(body.applicableMineIds.filter((id) => typeof id === 'string'))] : [];
    const configuration = body.configuration && typeof body.configuration === 'object' && !Array.isArray(body.configuration) ? body.configuration : {};
    if (!/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(code))
        return res.status(400).json({ error: 'Rule code must use 3–80 letters, numbers, underscores, or hyphens.' });
    if (!title || !description || !sourceReference)
        return res.status(400).json({ error: 'Title, description, and source/configuration reference are required.' });
    if (!validEnum(category, complianceService_1.COMPLIANCE_CATEGORIES) || !validEnum(frequency, complianceService_1.COMPLIANCE_FREQUENCIES) || !validEnum(evaluationType, complianceService_1.COMPLIANCE_EVALUATORS))
        return res.status(400).json({ error: 'Choose a supported category, frequency, and deterministic evaluator.' });
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity))
        return res.status(400).json({ error: 'Invalid severity.' });
    if (evaluationType === 'INSPECTION_COUNT' && category !== 'INSPECTION')
        return res.status(400).json({ error: 'Inspection-count rules must use the INSPECTION category.' });
    if (evaluationType === 'CORRECTIVE_ACTION_DEADLINE' && category !== 'CORRECTIVE_ACTION')
        return res.status(400).json({ error: 'Corrective-action rules must use the CORRECTIVE_ACTION category.' });
    const minimumCount = Number(configuration.minimumCount ?? 1);
    if (evaluationType === 'INSPECTION_COUNT' && (!Number.isInteger(minimumCount) || minimumCount < 1 || minimumCount > 50))
        return res.status(400).json({ error: 'Minimum inspection count must be between 1 and 50.' });
    if (applicableMineIds.length) {
        const mines = await db_1.prisma.mine.findMany({ where: { id: { in: applicableMineIds } }, select: { id: true } });
        if (mines.length !== applicableMineIds.length)
            return res.status(400).json({ error: 'One or more applicable mine IDs are invalid.' });
    }
    try {
        const rule = await (0, complianceService_1.createComplianceRule)({ code, title, description, category, frequency, severity, evaluationType, configuration: evaluationType === 'INSPECTION_COUNT' ? { minimumCount } : {}, requiredEvidenceType: evaluationType === 'INSPECTION_COUNT' ? 'INSPECTION' : 'CORRECTIVE_ACTION', sourceReference, applicableMineIds });
        await auditService_1.AuditService.recordEvent({ recordType: 'COMPLIANCE_RULE_CREATED', recordId: rule.id, action: 'CREATED', performedByRole: (0, auth_1.actorRole)(req, 'ADMIN'), data: { ruleId: rule.id, code: rule.code, category: rule.category, sourceReference: rule.sourceReference, applicableMineIds } });
        return res.status(201).json({ ...rule, configuration: JSON.parse(rule.configuration) });
    }
    catch (error) {
        if (error?.code === 'P2002')
            return res.status(409).json({ error: 'A compliance rule with this code already exists.' });
        console.error('Compliance rule create failed:', error);
        return res.status(503).json({ error: 'Could not create the compliance rule.' });
    }
});
router.patch('/rules/:id', async (req, res) => {
    if (typeof req.body?.active !== 'boolean')
        return res.status(400).json({ error: 'Supply active as true or false.' });
    try {
        const ruleId = String(req.params.id);
        const current = await db_1.prisma.complianceRule.findUnique({ where: { id: ruleId }, select: { active: true, code: true } });
        if (!current)
            return res.status(404).json({ error: 'Compliance rule not found.' });
        const rule = await (0, complianceService_1.setComplianceRuleActive)(ruleId, req.body.active);
        if (current.active !== rule.active)
            await auditService_1.AuditService.recordEvent({ recordType: 'COMPLIANCE_RULE_UPDATED', recordId: rule.id, action: 'STATUS_CHANGED', performedByRole: (0, auth_1.actorRole)(req, 'ADMIN'), data: { ruleId: rule.id, code: rule.code, from: current.active, to: rule.active } });
        return res.json({ ...rule, configuration: JSON.parse(rule.configuration) });
    }
    catch (error) {
        console.error('Compliance rule update failed:', error);
        return res.status(503).json({ error: 'Could not update the compliance rule.' });
    }
});
exports.default = router;
