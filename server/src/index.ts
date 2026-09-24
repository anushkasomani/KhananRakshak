import 'dotenv/config';
import './asyncErrors';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import mineRoutes from './routes/mineRoutes';
import safetyReportRoutes from './routes/safetyReportRoutes';
import grievanceRoutes from './routes/grievanceRoutes';
import sosRoutes from './routes/sosRoutes';
import inspectionRoutes from './routes/inspectionRoutes';
import correctiveActionRoutes from './routes/correctiveActionRoutes';
import incidentRoutes from './routes/incidentRoutes';
import complianceRoutes from './routes/complianceRoutes';
import auditRoutes from './routes/auditRoutes';
import recognitionRoutes from './routes/recognitionRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import escalationRoutes from './routes/escalationRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import governanceRoutes from './routes/governanceRoutes';
import statutoryComplianceRoutes from './routes/statutoryComplianceRoutes';
import { authenticate, requireApproved, requireAdmin } from './middleware/auth';
import { UPLOAD_ROOT } from './services/photoStorage';


const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
const approved = [authenticate, requireApproved];
// Uploaded photos. Names are random UUIDs; <img> tags can't send the auth header, so these are served without it.
app.use('/api/uploads', express.static(UPLOAD_ROOT, { index: false, maxAge: '30d', immutable: true }), (_req, res) => {
  res.status(404).json({ error: 'Photo not found' });
});
app.use('/api/auth', authRoutes);
app.use('/api/admin/compliance', ...approved, requireAdmin, statutoryComplianceRoutes);
app.use('/api/admin', ...approved, requireAdmin, adminRoutes);
app.use('/api/admin/governance', ...approved, requireAdmin, governanceRoutes);
app.use('/api/mines', ...approved, mineRoutes);
app.use('/api/safety-reports', ...approved, safetyReportRoutes);
app.use('/api/grievances', ...approved, grievanceRoutes);
app.use('/api/sos', ...approved, sosRoutes);
app.use('/api/inspections', ...approved, inspectionRoutes);
app.use('/api/corrective-actions', ...approved, correctiveActionRoutes);
app.use('/api/incidents', ...approved, incidentRoutes);
app.use('/api/compliance', ...approved, complianceRoutes);
app.use('/api/audit', ...approved, auditRoutes);
app.use('/api/recognition', ...approved, recognitionRoutes);
app.use('/api/notifications', ...approved, notificationRoutes);
app.use('/api/attendance', ...approved, attendanceRoutes);
app.use('/api/escalations', ...approved, escalationRoutes);
app.use('/api/dashboard', ...approved, dashboardRoutes);

// Global Error Handler
// Details go to the server log, never to the browser (they can include file paths and query text).
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`Error on ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return;
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'That upload is too large.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request was not valid JSON.' });
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
