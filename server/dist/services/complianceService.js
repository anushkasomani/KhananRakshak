"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPLIANCE_EVALUATORS = exports.COMPLIANCE_FREQUENCIES = exports.COMPLIANCE_CATEGORIES = exports.COMPLIANCE_STATUSES = void 0;
exports.createComplianceRule = createComplianceRule;
exports.setComplianceRuleActive = setComplianceRuleActive;
exports.listComplianceRules = listComplianceRules;
exports.listComplianceChecks = listComplianceChecks;
exports.complianceDashboard = complianceDashboard;
exports.evaluateCompliance = evaluateCompliance;
const db_1 = require("../db");
const auditService_1 = require("./auditService");
exports.COMPLIANCE_STATUSES = ['COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'OVERDUE', 'NOT_APPLICABLE', 'INSUFFICIENT_DATA'];
exports.COMPLIANCE_CATEGORIES = ['INSPECTION', 'CORRECTIVE_ACTION', 'SAFETY', 'INCIDENT', 'OTHER'];
exports.COMPLIANCE_FREQUENCIES = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'];
exports.COMPLIANCE_EVALUATORS = ['INSPECTION_COUNT', 'CORRECTIVE_ACTION_DEADLINE'];
const RULE_INCLUDE = { applicableMines: { select: { id: true, name: true } } };
function parseJson(value, fallback) {
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
function periodFor(frequency, now) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    let start;
    let end;
    let periodKey;
    if (frequency === 'WEEKLY') {
        const currentMonday = new Date(Date.UTC(year, month, now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
        end = new Date(currentMonday.getTime() - 1);
        start = new Date(end.getTime() - 6 * 86400000);
        periodKey = `WEEKLY:${start.toISOString().slice(0, 10)}`;
    }
    else if (frequency === 'QUARTERLY') {
        const quarterMonth = Math.floor(month / 3) * 3;
        const currentQuarter = new Date(Date.UTC(year, quarterMonth, 1));
        end = new Date(currentQuarter.getTime() - 1);
        start = new Date(Date.UTC(end.getUTCFullYear(), Math.floor(end.getUTCMonth() / 3) * 3, 1));
        periodKey = `QUARTERLY:${start.toISOString().slice(0, 7)}`;
    }
    else if (frequency === 'ANNUAL') {
        start = new Date(Date.UTC(year - 1, 0, 1));
        end = new Date(Date.UTC(year, 0, 1) - 1);
        periodKey = `ANNUAL:${year - 1}`;
    }
    else {
        start = new Date(Date.UTC(year, month - 1, 1));
        end = new Date(Date.UTC(year, month, 1) - 1);
        periodKey = `MONTHLY:${start.toISOString().slice(0, 7)}`;
    }
    return { periodKey, periodStart: start, periodEnd: end };
}
function evaluatorFor(rule, mineId, periodStart, periodEnd, records, now) {
    const configuration = parseJson(rule.configuration, {});
    if (rule.evaluationType === 'INSPECTION_COUNT') {
        const minimum = Math.max(1, Number(configuration.minimumCount) || 1);
        const mineInspections = records.filter((row) => row.mineId === mineId && (row.createdAt >= periodStart && row.createdAt <= periodEnd ||
            row.completedAt && row.completedAt >= periodStart && row.completedAt <= periodEnd ||
            row.deadline && row.deadline >= periodStart && row.deadline <= periodEnd));
        const completedCount = mineInspections.filter((row) => row.status === 'COMPLETED' && row.completedAt && row.completedAt >= periodStart && row.completedAt <= periodEnd).length;
        const status = completedCount >= minimum
            ? 'COMPLIANT'
            : now <= periodEnd
                ? 'INSUFFICIENT_DATA'
                : completedCount === 0 ? 'OVERDUE' : 'PARTIALLY_COMPLIANT';
        return {
            status,
            expectedValue: { minimumCompletedInspections: minimum, acceptedStatus: 'COMPLETED' },
            actualValue: { completedInspections: completedCount, inspectionRecords: mineInspections.length },
            dueDate: periodEnd,
            evidenceRefs: mineInspections.map((row) => ({ recordType: 'INSPECTION', recordId: row.id, summary: `${row.inspectionType} · ${row.status} · ${row.violationsCount} recorded findings` })),
            correctiveActionIds: [],
            violationSummary: status === 'COMPLIANT' ? null : `Configured requirement not satisfied: ${completedCount} of ${minimum} required completed inspections were recorded.`,
        };
    }
    if (rule.evaluationType === 'CORRECTIVE_ACTION_DEADLINE') {
        const actions = records.filter((row) => row.mineId === mineId && row.action.deadline >= periodStart && row.action.deadline <= periodEnd);
        if (!actions.length)
            return {
                status: 'INSUFFICIENT_DATA', expectedValue: { dueActionsCompletedByDeadline: true }, actualValue: { dueActions: 0 },
                dueDate: null, evidenceRefs: [], correctiveActionIds: [], violationSummary: 'No linked corrective actions were due in this configured period, so this check could not be assessed.',
            };
        const overdue = actions.filter((row) => row.action.status !== 'COMPLETED' && row.action.deadline < now);
        const completedLate = actions.filter((row) => row.action.status === 'COMPLETED' && row.action.completedAt && row.action.completedAt > row.action.deadline);
        const onTime = actions.filter((row) => row.action.status === 'COMPLETED' && row.action.completedAt && row.action.completedAt <= row.action.deadline);
        const status = overdue.length ? 'OVERDUE' : completedLate.length ? 'NON_COMPLIANT' : onTime.length === actions.length ? 'COMPLIANT' : 'PARTIALLY_COMPLIANT';
        const evidenceRefs = actions.flatMap((row) => [
            { recordType: 'CORRECTIVE_ACTION', recordId: row.action.id, summary: `${row.action.status} · due ${row.action.deadline.toISOString()}` },
            { recordType: row.issueType, recordId: row.issueId, summary: 'Linked source record' },
        ]);
        return {
            status,
            expectedValue: { dueActionsCompletedByDeadline: true },
            actualValue: { dueActions: actions.length, completedOnTime: onTime.length, completedLate: completedLate.length, overdue: overdue.length },
            dueDate: overdue.length ? overdue.reduce((earliest, row) => row.action.deadline < earliest ? row.action.deadline : earliest, overdue[0].action.deadline) : periodEnd,
            evidenceRefs,
            correctiveActionIds: actions.map((row) => row.action.id),
            violationSummary: status === 'COMPLIANT' ? null : overdue.length
                ? `${overdue.length} linked corrective action(s) remain open past their recorded deadline.`
                : completedLate.length ? `${completedLate.length} linked corrective action(s) were completed after their recorded deadline.`
                    : 'Some linked corrective actions do not have a recorded on-time completion.',
        };
    }
    return { status: 'INSUFFICIENT_DATA', expectedValue: {}, actualValue: {}, dueDate: null, evidenceRefs: [], correctiveActionIds: [], violationSummary: 'This rule uses an unsupported evaluator and was not assessed.' };
}
async function createComplianceRule(data) {
    return db_1.prisma.complianceRule.create({
        data: {
            code: data.code,
            title: data.title,
            description: data.description,
            category: data.category,
            frequency: data.frequency,
            severity: data.severity,
            evaluationType: data.evaluationType,
            configuration: JSON.stringify(data.configuration),
            requiredEvidenceType: data.requiredEvidenceType || null,
            sourceReference: data.sourceReference,
            applicableMines: data.applicableMineIds.length ? { connect: data.applicableMineIds.map((id) => ({ id })) } : undefined,
        },
        include: RULE_INCLUDE,
    });
}
async function setComplianceRuleActive(id, active) {
    return db_1.prisma.complianceRule.update({ where: { id }, data: { active }, include: RULE_INCLUDE });
}
async function listComplianceRules() {
    const rules = await db_1.prisma.complianceRule.findMany({ include: RULE_INCLUDE, orderBy: [{ active: 'desc' }, { category: 'asc' }, { title: 'asc' }] });
    return rules.map((rule) => ({ ...rule, configuration: parseJson(rule.configuration, {}) }));
}
async function listComplianceChecks(options = {}) {
    const since = new Date(Date.now() - (options.periodDays || 30) * 86400000);
    const rows = await db_1.prisma.complianceCheck.findMany({
        where: {
            ...(options.mineId ? { mineId: options.mineId } : {}),
            ...(options.status ? { status: options.status } : {}),
            checkedAt: { gte: since },
            ...(options.category ? { rule: { category: options.category } } : {}),
        },
        include: { rule: true, mine: { select: { id: true, name: true } } },
        orderBy: [{ checkedAt: 'desc' }, { mine: { name: 'asc' } }],
        take: 500,
    });
    return rows.map((row) => ({ ...row, expectedValue: parseJson(row.expectedValue, {}), actualValue: parseJson(row.actualValue, {}), evidenceRefs: parseJson(row.evidenceRefs, []), correctiveActionIds: parseJson(row.correctiveActionIds, []) }));
}
async function complianceDashboard(options = {}) {
    const [mines, rules, checks, allRecentChecks] = await Promise.all([
        db_1.prisma.mine.findMany({ where: options.mineId ? { id: options.mineId } : {}, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
        listComplianceRules(),
        listComplianceChecks(options),
        listComplianceChecks({ ...options, status: undefined }),
    ]);
    const mineById = new Map(mines.map((mine) => [mine.id, mine]));
    const latest = new Map();
    for (const check of allRecentChecks) {
        const key = `${check.ruleId}:${check.mineId}`;
        if (!latest.has(key))
            latest.set(key, check);
    }
    const monitoredMineIds = new Set();
    for (const rule of rules.filter((item) => item.active)) {
        const applicable = rule.applicableMines.length ? rule.applicableMines.map((mine) => mine.id) : mines.map((mine) => mine.id);
        applicable.forEach((id) => { if (mineById.has(id))
            monitoredMineIds.add(id); });
    }
    const currentChecks = [...latest.values()].filter((check) => check.rule.active && (!options.status || check.status === options.status) && (!options.category || check.rule.category === options.category));
    const countByStatus = (status) => currentChecks.filter((check) => check.status === status).length;
    const mineMetrics = [...monitoredMineIds].map((mineId) => {
        const mineChecks = currentChecks.filter((check) => check.mineId === mineId);
        const percentChecks = [...latest.values()].filter((check) => check.mineId === mineId && check.rule.active && (!options.category || check.rule.category === options.category));
        const compliant = mineChecks.filter((check) => check.status === 'COMPLIANT').length;
        const percentCompliant = percentChecks.filter((check) => check.status === 'COMPLIANT').length;
        const denominator = percentChecks.filter((check) => ['COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'OVERDUE'].includes(check.status)).length;
        return { mineId, mineName: mineById.get(mineId)?.name || 'Mine', checks: mineChecks.length, compliant, nonCompliant: mineChecks.filter((check) => check.status === 'NON_COMPLIANT').length, overdue: mineChecks.filter((check) => check.status === 'OVERDUE').length, insufficientData: mineChecks.filter((check) => check.status === 'INSUFFICIENT_DATA').length, compliancePercent: denominator ? Math.round(percentCompliant / denominator * 1000) / 10 : null };
    }).sort((a, b) => a.mineName.localeCompare(b.mineName));
    const rulesWithLatest = rules.map((rule) => {
        const ruleChecks = [...latest.values()].filter((check) => check.ruleId === rule.id && (!options.mineId || check.mineId === options.mineId) && (!options.category || check.rule.category === options.category));
        const statuses = ruleChecks.map((check) => check.status);
        const status = statuses.includes('OVERDUE') ? 'OVERDUE' : statuses.includes('NON_COMPLIANT') ? 'NON_COMPLIANT' : statuses.includes('PARTIALLY_COMPLIANT') ? 'PARTIALLY_COMPLIANT' : statuses.length ? statuses[0] : 'INSUFFICIENT_DATA';
        return { ...rule, status, lastEvaluatedAt: ruleChecks.length ? ruleChecks.reduce((date, check) => check.checkedAt > date ? check.checkedAt : date, ruleChecks[0].checkedAt) : null, nextDue: rule.active ? nextDueForFrequency(rule.frequency) : null };
    }).filter((rule) => (!options.status || rule.status === options.status) && (!options.category || rule.category === options.category));
    return {
        summary: { minesMonitored: monitoredMineIds.size, totalChecks: currentChecks.length, compliant: countByStatus('COMPLIANT'), nonCompliant: countByStatus('NON_COMPLIANT'), overdue: countByStatus('OVERDUE'), insufficientData: countByStatus('INSUFFICIENT_DATA') },
        mineMetrics,
        rules: rulesWithLatest,
        checks,
    };
}
function nextDueForFrequency(frequency) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    if (frequency === 'WEEKLY') {
        const monday = new Date(Date.UTC(year, month, now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
        return new Date(monday.getTime() + 7 * 86400000 - 1);
    }
    if (frequency === 'QUARTERLY')
        return new Date(Date.UTC(year, Math.floor(month / 3) * 3 + 3, 1) - 1);
    if (frequency === 'ANNUAL')
        return new Date(Date.UTC(year + 1, 0, 1) - 1);
    return new Date(Date.UTC(year, month + 1, 1) - 1);
}
async function evaluateCompliance(mineId, requestedById = 'SYSTEM') {
    const now = new Date();
    const [allMines, rules, safetyReports, inspections, incidents, grievances, actions] = await Promise.all([
        db_1.prisma.mine.findMany({ ...(mineId ? { where: { id: mineId } } : {}), select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        db_1.prisma.complianceRule.findMany({ where: { active: true }, include: RULE_INCLUDE, orderBy: { code: 'asc' } }),
        db_1.prisma.safetyReport.findMany({ select: { id: true, mineId: true } }),
        db_1.prisma.inspection.findMany({ select: { id: true, mineId: true, inspectionType: true, status: true, violationsCount: true, createdAt: true, completedAt: true, deadline: true } }),
        db_1.prisma.incident.findMany({ select: { id: true, mineId: true } }),
        db_1.prisma.grievance.findMany({ select: { id: true, mineId: true } }),
        db_1.prisma.correctiveAction.findMany({ select: { id: true, issueId: true, issueType: true, deadline: true, status: true, completedAt: true, createdAt: true } }),
    ]);
    if (mineId && !allMines.some((mine) => mine.id === mineId))
        throw new Error('MINE_NOT_FOUND');
    const checks = [];
    const changed = [];
    for (const rule of rules) {
        const applicableMineIds = rule.applicableMines.length ? rule.applicableMines.map((mine) => mine.id) : allMines.map((mine) => mine.id);
        for (const mine of allMines.filter((item) => applicableMineIds.includes(item.id))) {
            const { periodKey, periodStart, periodEnd } = periodFor(rule.frequency, now);
            let records = [];
            if (rule.evaluationType === 'INSPECTION_COUNT')
                records = inspections;
            else if (rule.evaluationType === 'CORRECTIVE_ACTION_DEADLINE') {
                const mineIssueIds = new Set([
                    ...safetyReports.filter((row) => row.mineId === mine.id).map((row) => `SAFETY_REPORT:${row.id}`),
                    ...inspections.filter((row) => row.mineId === mine.id).map((row) => `INSPECTION:${row.id}`),
                    ...incidents.filter((row) => row.mineId === mine.id).map((row) => `INCIDENT:${row.id}`),
                    ...grievances.filter((row) => row.mineId === mine.id).map((row) => `GRIEVANCE:${row.id}`),
                ]);
                records = actions.filter((action) => mineIssueIds.has(`${action.issueType}:${action.issueId}`)).map((action) => ({ mineId: mine.id, issueId: action.issueId, issueType: action.issueType, action }));
            }
            const result = evaluatorFor(rule, mine.id, periodStart, periodEnd, records, now);
            const key = { ruleId: rule.id, mineId: mine.id, periodKey };
            const previous = await db_1.prisma.complianceCheck.findUnique({ where: { ruleId_mineId_periodKey: key }, select: { id: true, status: true } });
            const data = {
                ...key,
                periodStart,
                periodEnd,
                expectedValue: JSON.stringify(result.expectedValue),
                actualValue: JSON.stringify(result.actualValue),
                status: result.status,
                dueDate: result.dueDate,
                evidenceRefs: JSON.stringify(result.evidenceRefs),
                violationSummary: result.violationSummary,
                correctiveActionIds: JSON.stringify(result.correctiveActionIds),
                checkedAt: now,
            };
            const check = await db_1.prisma.complianceCheck.upsert({ where: { ruleId_mineId_periodKey: key }, create: data, update: data, include: { rule: true, mine: { select: { id: true, name: true } } } });
            checks.push(check);
            if (previous && previous.status !== result.status)
                changed.push({ check, previousStatus: previous.status });
        }
    }
    for (const item of changed)
        await auditService_1.AuditService.recordEvent({
            recordType: 'COMPLIANCE_STATUS_CHANGED', recordId: item.check.id, action: 'STATUS_CHANGED', performedByRole: 'ADMIN',
            data: { checkId: item.check.id, ruleId: item.check.ruleId, mineId: item.check.mineId, from: item.previousStatus, to: item.check.status },
        });
    const evaluationId = `${now.toISOString()}-${mineId || 'ALL'}`;
    await auditService_1.AuditService.recordEvent({
        recordType: 'COMPLIANCE_EVALUATION', recordId: evaluationId, action: 'CREATED', performedByRole: 'ADMIN',
        data: { requestedById, mineId: mineId || null, checkedAt: now.toISOString(), checksGenerated: checks.length, statusChanges: changed.length },
    });
    return { checkedAt: now, checks: checks.map((check) => ({ ...check, expectedValue: parseJson(check.expectedValue, {}), actualValue: parseJson(check.actualValue, {}), evidenceRefs: parseJson(check.evidenceRefs, []), correctiveActionIds: parseJson(check.correctiveActionIds, []) })), statusChanges: changed.length };
}
