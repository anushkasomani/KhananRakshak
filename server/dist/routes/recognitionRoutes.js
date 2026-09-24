"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/recognition/leaderboard
router.get('/leaderboard', async (_req, res) => {
    // Top workers by points
    const topWorkers = await db_1.prisma.user.findMany({
        where: { role: 'WORKER' },
        select: {
            id: true,
            name: true,
            badgeNumber: true,
            points: true,
            department: true,
            mine: { select: { name: true, code: true } },
            badges: true
        },
        orderBy: { points: 'desc' },
        take: 10
    });
    // Top mines by compliance
    const topMines = await db_1.prisma.mine.findMany({
        select: {
            id: true,
            name: true,
            code: true,
            complianceScore: true,
            activeWorkers: true,
            region: true
        },
        orderBy: { complianceScore: 'desc' },
        take: 5
    });
    // System Badge Definitions
    const availableBadges = [
        { code: 'SAFETY_CHAMPION', title: 'Safety Champion', icon: '🏆', description: 'Awarded for continuous zero-violation shifts and 25+ verified safety contributions' },
        { code: 'HAZARD_HUNTER', title: 'Hazard Hunter', icon: '🛡️', description: 'Reported 5+ verified early-stage physical or environmental hazards' },
        { code: 'COMPLIANCE_LEADER', title: 'Compliance Leader', icon: '⭐', description: 'Maintains 100% completion on weekly safety checklists and PPE audits' },
        { code: 'EARLY_RISK_REPORTER', title: 'Early Risk Reporter', icon: '🚨', description: 'Spotted critical mechanical or gas hazards preventing emergency shutdown' },
        { code: 'ZERO_PENDING_ACTIONS', title: 'Zero Pending Actions', icon: '🏅', description: 'Closed all assigned corrective actions before scheduled statutory deadlines' },
    ];
    return res.json({
        topWorkers,
        topMines,
        availableBadges
    });
});
// GET /api/recognition/my-points
router.get('/my-points', auth_1.optionalAuthenticate, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const user = await db_1.prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
            mine: true,
            badges: true,
            pointsHistory: { orderBy: { createdAt: 'desc' }, take: 20 }
        }
    });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    return res.json({
        totalPoints: user.points,
        badges: user.badges,
        history: user.pointsHistory,
        tier: user.points > 200 ? 'Gold Safety Master' : user.points > 100 ? 'Silver Guardian' : 'Bronze Scout',
        nextMilestone: user.points > 200 ? 500 : user.points > 100 ? 200 : 100
    });
});
exports.default = router;
