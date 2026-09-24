"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("./asyncErrors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const mineRoutes_1 = __importDefault(require("./routes/mineRoutes"));
const safetyReportRoutes_1 = __importDefault(require("./routes/safetyReportRoutes"));
const grievanceRoutes_1 = __importDefault(require("./routes/grievanceRoutes"));
const sosRoutes_1 = __importDefault(require("./routes/sosRoutes"));
const inspectionRoutes_1 = __importDefault(require("./routes/inspectionRoutes"));
const correctiveActionRoutes_1 = __importDefault(require("./routes/correctiveActionRoutes"));
const incidentRoutes_1 = __importDefault(require("./routes/incidentRoutes"));
const complianceRoutes_1 = __importDefault(require("./routes/complianceRoutes"));
const auditRoutes_1 = __importDefault(require("./routes/auditRoutes"));
const recognitionRoutes_1 = __importDefault(require("./routes/recognitionRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const escalationRoutes_1 = __importDefault(require("./routes/escalationRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const governanceRoutes_1 = __importDefault(require("./routes/governanceRoutes"));
const auth_1 = require("./middleware/auth");
const photoStorage_1 = require("./services/photoStorage");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5002;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Health Check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ONLINE',
        service: 'MineSafe AI Enterprise Safety & Compliance Engine',
        version: '2.4.0',
        cryptoVerification: 'SHA-256 Chained Ledger Active',
        timestamp: new Date().toISOString()
    });
});
// Mount Routes. Everything except auth requires a signed-in, admin-approved account.
const approved = [auth_1.authenticate, auth_1.requireApproved];
// Uploaded photos. Names are random UUIDs; <img> tags can't send the auth header, so these are served without it.
app.use('/api/uploads', express_1.default.static(photoStorage_1.UPLOAD_ROOT, { index: false, maxAge: '30d', immutable: true }), (_req, res) => {
    res.status(404).json({ error: 'Photo not found' });
});
app.use('/api/auth', authRoutes_1.default);
app.use('/api/admin', ...approved, auth_1.requireAdmin, adminRoutes_1.default);
app.use('/api/admin/governance', ...approved, auth_1.requireAdmin, governanceRoutes_1.default);
app.use('/api/mines', ...approved, mineRoutes_1.default);
app.use('/api/safety-reports', ...approved, safetyReportRoutes_1.default);
app.use('/api/grievances', ...approved, grievanceRoutes_1.default);
app.use('/api/sos', ...approved, sosRoutes_1.default);
app.use('/api/inspections', ...approved, inspectionRoutes_1.default);
app.use('/api/corrective-actions', ...approved, correctiveActionRoutes_1.default);
app.use('/api/incidents', ...approved, incidentRoutes_1.default);
app.use('/api/compliance', ...approved, complianceRoutes_1.default);
app.use('/api/audit', ...approved, auditRoutes_1.default);
app.use('/api/recognition', ...approved, recognitionRoutes_1.default);
app.use('/api/notifications', ...approved, notificationRoutes_1.default);
app.use('/api/attendance', ...approved, attendanceRoutes_1.default);
app.use('/api/escalations', ...approved, escalationRoutes_1.default);
app.use('/api/dashboard', ...approved, dashboardRoutes_1.default);
// Global Error Handler
// Details go to the server log, never to the browser (they can include file paths and query text).
app.use((err, req, res, _next) => {
    console.error(`Error on ${req.method} ${req.originalUrl}:`, err);
    if (res.headersSent)
        return;
    if (err?.type === 'entity.too.large')
        return res.status(413).json({ error: 'That upload is too large.' });
    if (err?.type === 'entity.parse.failed')
        return res.status(400).json({ error: 'The request was not valid JSON.' });
    if (err?.code === 'P1008' || /database is locked|SQLITE_BUSY/i.test(String(err?.message))) {
        return res.status(503).json({ error: 'The database is busy. Try again in a moment.' });
    }
    return res.status(500).json({ error: 'Something went wrong on the server. Try again.' });
});
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🛡️  MineSafe AI Backend API running on port ${PORT}`);
    console.log(`⚡  Tamper-Evident SHA-256 Audit Chain Active`);
    console.log(`====================================================`);
});
