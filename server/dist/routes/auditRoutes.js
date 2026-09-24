"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auditService_1 = require("../services/auditService");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/audit/blocks (Chained Ledger Explorer)
router.get('/blocks', async (req, res) => {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const blocks = await auditService_1.AuditService.getChain(limit);
    return res.json(blocks);
});
// GET /api/audit/verify/:recordId (Cryptographic Integrity Verification)
router.get('/verify/:recordId', async (req, res) => {
    const { recordId } = req.params;
    const result = await auditService_1.AuditService.verifyRecord(recordId);
    return res.json(result);
});
// POST /api/audit/simulate-tamper (Demonstration utility for live testing integrity detection)
router.post('/simulate-tamper', auth_1.requireAdmin, async (req, res) => {
    try {
        const { blockIndex } = req.body;
        const targetIndex = blockIndex ? parseInt(String(blockIndex), 10) : 2;
        const block = await db_1.prisma.auditBlock.findUnique({
            where: { blockIndex: targetIndex }
        });
        if (!block) {
            return res.status(404).json({ error: `Audit block #${targetIndex} not found to tamper` });
        }
        // Tamper the hash by altering 4 characters
        const tamperedHash = 'DEAD' + block.currentHash.substring(4);
        await db_1.prisma.auditBlock.update({
            where: { blockIndex: targetIndex },
            data: { currentHash: tamperedHash }
        });
        return res.json({
            success: true,
            message: `Simulated unauthorized tamper on Block #${targetIndex}. Chain linkage is now broken!`,
            tamperedBlockIndex: targetIndex
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// POST /api/audit/repair-chain (Restore integrity after simulation)
router.post('/repair-chain', auth_1.requireAdmin, async (_req, res) => {
    try {
        // Re-seed audit blocks cleanly
        const blocks = await db_1.prisma.auditBlock.findMany({ orderBy: { blockIndex: 'asc' } });
        if (blocks.length > 0) {
            let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
            for (const b of blocks) {
                const blockContent = `${prevHash}|${b.timestamp.toISOString()}|${b.recordType}|${b.recordId}|${b.action}|${b.payloadHash}`;
                const correctHash = auditService_1.AuditService.computeHash(blockContent);
                await db_1.prisma.auditBlock.update({
                    where: { id: b.id },
                    data: { previousHash: prevHash, currentHash: correctHash }
                });
                prevHash = correctHash;
            }
        }
        return res.json({ success: true, message: 'Audit chain integrity restored and re-sealed successfully.' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
