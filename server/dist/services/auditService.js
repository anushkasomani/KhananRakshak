"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
class AuditService {
    /**
     * Compute deterministic SHA-256 hash of object/string
     */
    static computeHash(content) {
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Append a new tamper-evident block to the audit hash chain
     */
    static async recordEvent(payload) {
        try {
            // Find the most recent audit block
            const lastBlock = await db_1.prisma.auditBlock.findFirst({
                orderBy: { blockIndex: 'desc' },
            });
            const previousHash = lastBlock ? lastBlock.currentHash : '0000000000000000000000000000000000000000000000000000000000000000';
            const blockIndex = lastBlock ? lastBlock.blockIndex + 1 : 1;
            const timestamp = new Date();
            // Deterministic string representation of data payload
            const sortedDataString = JSON.stringify(payload.data, Object.keys(payload.data).sort());
            const payloadHash = this.computeHash(sortedDataString);
            // Block Hash = SHA-256(previousHash + timestamp + recordType + recordId + action + payloadHash)
            const blockContent = `${previousHash}|${timestamp.toISOString()}|${payload.recordType}|${payload.recordId}|${payload.action}|${payloadHash}`;
            const currentHash = this.computeHash(blockContent);
            const summary = `${payload.action} on ${payload.recordType} [${payload.recordId}] by ${payload.performedByRole}`;
            const block = await db_1.prisma.auditBlock.create({
                data: {
                    blockIndex,
                    previousHash,
                    currentHash,
                    timestamp,
                    recordType: payload.recordType,
                    recordId: payload.recordId,
                    action: payload.action,
                    performedByRole: payload.performedByRole,
                    payloadHash,
                    payloadSummary: summary,
                },
            });
            return block;
        }
        catch (err) {
            console.error('AuditService recordEvent error:', err);
            return null;
        }
    }
    /**
     * Verify integrity of a specific record by ID
     */
    static async verifyRecord(recordId) {
        // Fetch all audit blocks matching this record
        const blocks = await db_1.prisma.auditBlock.findMany({
            where: { recordId },
            orderBy: { blockIndex: 'asc' },
        });
        if (blocks.length === 0) {
            return {
                verified: false,
                reason: 'Record not found in cryptographic audit ledger',
                blocks: [],
            };
        }
        // Also verify the chain integrity up to the latest block
        const allBlocks = await db_1.prisma.auditBlock.findMany({
            orderBy: { blockIndex: 'asc' },
        });
        let chainIntact = true;
        let corruptedIndex = -1;
        for (let i = 1; i < allBlocks.length; i++) {
            const prev = allBlocks[i - 1];
            const curr = allBlocks[i];
            if (curr.previousHash !== prev.currentHash) {
                chainIntact = false;
                corruptedIndex = curr.blockIndex;
                break;
            }
        }
        const latestBlockForRecord = blocks[blocks.length - 1];
        return {
            verified: chainIntact,
            recordId,
            recordType: latestBlockForRecord.recordType,
            currentHash: latestBlockForRecord.currentHash,
            previousHash: latestBlockForRecord.previousHash,
            timestamp: latestBlockForRecord.timestamp,
            totalRecordEvents: blocks.length,
            chainLength: allBlocks.length,
            chainIntact,
            corruptedIndex: chainIntact ? null : corruptedIndex,
            blocks,
            architectureNote: 'Tamper-Evident SHA-256 Chained Hash Ledger (Blockchain-Ready Architecture)',
        };
    }
    /**
     * Get the complete chain or recent blocks
     */
    static async getChain(limit = 50) {
        return db_1.prisma.auditBlock.findMany({
            orderBy: { blockIndex: 'desc' },
            take: limit,
        });
    }
}
exports.AuditService = AuditService;
