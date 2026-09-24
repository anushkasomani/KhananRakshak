"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/incidents
const INCIDENT_TYPES = ['METHANE_SPIKE', 'ROOF_FALL', 'EQUIPMENT_JAM', 'MINOR_INJURY', 'ELECTRICAL_SHORT', 'FIRE', 'INUNDATION', 'OTHER'];
const SEVERITIES = ['MINOR', 'SERIOUS', 'CRITICAL', 'FATALITY'];
router.get('/', async (req, res) => {
    const { mineId, severity } = req.query;
    const where = {};
    const scope = (0, auth_1.mineScope)(req);
    if (scope)
        where.mineId = scope;
    else if (mineId)
        where.mineId = String(mineId);
    if (severity)
        where.severity = String(severity);
    const incidents = await db_1.prisma.incident.findMany({
        where,
        include: {
            mine: { select: { id: true, name: true, code: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return res.json(incidents);
});
// POST /api/incidents
router.post('/', (0, auth_1.requireLevel)('SUPERVISOR'), async (req, res) => {
    try {
        const { mineId, incidentType, location, severity, description, peopleAffected, immediateResponse, rootCause } = req.body;
        if (!mineId || !incidentType || !location || !description) {
            return res.status(400).json({ error: 'Mine, incident type, location, and description are required' });
        }
        if (!(0, auth_1.canSeeMine)(req, String(mineId)))
            return res.status(403).json({ error: 'You can only log incidents for your own mine.' });
        if (!INCIDENT_TYPES.includes(incidentType))
            return res.status(400).json({ error: 'Choose an incident type.' });
        if (severity && !SEVERITIES.includes(severity))
            return res.status(400).json({ error: 'Choose a severity.' });
        const rand = Math.floor(10000 + Math.random() * 90000);
        const incId = `INC-2026-${rand}`;
        const incident = await db_1.prisma.incident.create({
            data: {
                id: incId,
                mineId,
                incidentType,
                location,
                severity: severity || 'SERIOUS',
                description,
                peopleAffected: peopleAffected ? parseInt(String(peopleAffected), 10) : 0,
                immediateResponse: immediateResponse || 'Not recorded',
                rootCause: rootCause || null,
                reportedById: req.user?.id,
                reportedByName: req.user?.name,
                status: 'INVESTIGATING'
            },
            include: { mine: true }
        });
        const auditBlock = await auditService_1.AuditService.recordEvent({
            recordType: 'INCIDENT',
            recordId: incident.id,
            action: 'CREATED',
            performedByRole: (0, auth_1.actorRole)(req),
            data: {
                id: incident.id,
                type: incident.incidentType,
                mine: incident.mine.name,
                severity: incident.severity,
                affected: incident.peopleAffected
            }
        });
        return res.status(201).json({ incident, auditBlock });
    }
    catch (err) {
        console.error('Error logging incident:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
exports.default = router;
