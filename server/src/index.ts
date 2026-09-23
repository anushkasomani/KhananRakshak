import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

dotenv.config();

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

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/mines', mineRoutes);
app.use('/api/safety-reports', safetyReportRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/corrective-actions', correctiveActionRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/recognition', recognitionRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🛡️  MineSafe AI Backend API running on port ${PORT}`);
  console.log(`⚡  Tamper-Evident SHA-256 Audit Chain Active`);
  console.log(`====================================================`);
});
