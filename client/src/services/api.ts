import {
  User,
  Mine,
  SafetyReport,
  Grievance,
  SosAlert,
  Inspection,
  CorrectiveAction,
  Incident,
  AuditBlock,
  ComplianceKPIs,
  AttendanceRecord,
  MyAttendance,
  MineAttendance,
  Escalation,
  EscalationRecipient,
  MineDashboard,
  MinesOverview,
} from '../types';

const API_BASE = '/api';
export const TOKEN_KEY = 'minesafe_token';

function toQuery(params?: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request<T = any>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && options.auth !== false ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export interface OnboardingInput {
  name: string;
  phone: string;
  role: string;
  officerType?: string;
  trade?: string;
  mineId?: string;
  badgeNumber?: string;
}

export interface MineInput {
  name?: string;
  code?: string;
  locality?: string;
  state?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}

export interface GpsReading {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt?: string;
}

export interface GovernanceAnalytics {
  generatedAt: string;
  filters: { mineId: string | null; periodDays: number };
  coverage: { mines: number; hazards: number; openHazards: number; inspections: number; incidents: number; sosAlerts: number; correctiveActions: number };
  metrics: { mineId: string; mineName: string; period: string; inspectionCount: number; previousInspectionCount: number; incidentCount: number; previousIncidentCount: number; hazardCount: number; previousHazardCount: number; inspectionViolationCount: number; activeSosCount: number; overdueActionCount: number; completedActionCount: number; meanActionClosureDays: number | null; previousMeanActionClosureDays: number | null; dataStatus: string; evidenceQuality: 'HIGH' | 'MODERATE' | 'LIMITED'; currentRecordCount: number; previousRecordCount: number }[];
  risks: { mineId: string; mineName: string; score: number; riskLevel: string; indicators: { type: string; description: string; count: number; evidenceIds: string[] }[] }[];
  recurringIssues: { mineId: string; mineName: string; issue: string; location: string; count: number; detection: string; evidenceIds: string[]; firstSeen: string; lastSeen: string }[];
  anomalies: { mineId: string; mineName: string; metric: string; value?: number; previousValue?: number; status: string; explanation?: string; reason?: string; evidenceIds?: string[] }[];
  dataWarnings: { mineId: string; mineName: string; evidenceQuality: 'HIGH' | 'MODERATE' | 'LIMITED'; warnings: string[] }[];
  evidence: { hazards: any[]; inspections: any[]; incidents: any[]; sos: any[]; correctiveActions: any[] };
  aiEvidence?: { maxRecordsPerCategory: number; maxTextCharactersPerField: number; hazards: any[]; inspections: any[]; incidents: any[]; sos: any[]; correctiveActions: any[] };
}

export interface GovernanceSavedAnalysis {
  id: string;
  requestedAt: string;
  requestedById: string;
  scope: string;
  mineIds: string[];
  analysis: GovernanceAIAnalysis;
  analytics: GovernanceAnalytics;
}

export interface GovernanceAIAnalysis {
  summary: string;
  priority?: string;
  whyThisMineFlagged?: string;
  observedFacts?: { label: string; value: string | number; evidenceIds: string[] }[];
  patterns?: { pattern: string; evidenceIds: string[] }[];
  interpretation?: string;
  recommendedAdministrativeReview?: string[];
  dataLimitations?: string[];
  // Backward-compatible fields for saved analyses created before the structured format.
  keyFindings?: { title: string; explanation: string; evidenceIds: string[] }[];
  recommendedActions?: string[];
}

export const api = {
  // Auth & onboarding
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  googleLogin: (credential: string) =>
    request<{ token: string; user: User }>('/auth/google', { method: 'POST', body: { credential }, auth: false }),
  getMe: () => request<User>('/auth/me'),
  getOnboardingMines: () => request<Pick<Mine, 'id' | 'name' | 'locality' | 'state'>[]>('/auth/onboarding/mines'),
  submitOnboarding: (data: OnboardingInput) => request<User>('/auth/onboarding', { method: 'POST', body: data }),

  // Admin
  getUsers: (params?: { status?: string; mineId?: string }) => request<User[]>(`/admin/users${toQuery(params)}`),
  createUser: (data: Record<string, unknown>) => request<User>('/admin/users', { method: 'POST', body: data }),
  updateUser: (id: string, data: Record<string, unknown>) => request<User>(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  getGovernanceAnalytics: (params?: { mineId?: string; periodDays?: number }) => request<GovernanceAnalytics>(`/admin/governance${toQuery({ mineId: params?.mineId, periodDays: params?.periodDays ? String(params.periodDays) : undefined })}`),
  getGovernanceHistory: () => request<GovernanceSavedAnalysis[]>('/admin/governance/history'),
  analyzeGovernance: (question: string, options: { mineId?: string; periodDays?: number } = {}) => request<{ analysis: GovernanceAIAnalysis; analytics: GovernanceAnalytics; requestId: string }>('/admin/governance/analyze', { method: 'POST', body: { question, ...options } }),

  // Mines
  getMines: () => request<Mine[]>('/mines'),
  getMine: (id: string) => request<Mine>(`/mines/${id}`),
  createMine: (data: MineInput) => request<Mine>('/mines', { method: 'POST', body: data }),
  updateMine: (id: string, data: MineInput) => request<Mine>(`/mines/${id}`, { method: 'PATCH', body: data }),

  // Attendance
  getMyAttendance: () => request<MyAttendance>('/attendance/me'),
  checkIn: (reading: GpsReading) => request<AttendanceRecord>('/attendance/check-in', { method: 'POST', body: reading }),
  checkOut: (reading: GpsReading) => request<AttendanceRecord>('/attendance/check-out', { method: 'POST', body: reading }),
  getMineAttendance: (mineId: string, date?: string) =>
    request<MineAttendance>(`/attendance/mine/${mineId}${toQuery({ date })}`),
  markPresent: (userId: string, note: string) => request<AttendanceRecord>('/attendance/mark', { method: 'POST', body: { userId, note } }),
  undoMark: (recordId: string) => request(`/attendance/mark/${recordId}`, { method: 'DELETE' }),

  // Role dashboards
  getMineDashboard: (mineId: string, withTrends = false) =>
    request<MineDashboard>(`/dashboard/mine/${mineId}${withTrends ? '?trends=1' : ''}`),
  getMinesOverview: () => request<MinesOverview>('/dashboard/overview'),

  // Escalations
  getEscalationRecipients: (params: { mineId: string; toRole: string; officerType?: string }) =>
    request<EscalationRecipient[]>(`/escalations/recipients${toQuery(params)}`),
  escalate: (data: { recordType: 'INCIDENT' | 'SOS'; recordId: string; toRole: string; toOfficerType?: string; reason: string }) =>
    request<{ escalation: Escalation; recipients: EscalationRecipient[]; callStatus: Escalation['callStatus'] }>('/escalations', {
      method: 'POST',
      body: data,
    }),
  getEscalations: (recordType: 'INCIDENT' | 'SOS', recordId: string) =>
    request<Escalation[]>(`/escalations${toQuery({ recordType, recordId })}`),
  getEscalationInbox: () => request<{ forMe: Escalation[]; sent: Escalation[]; canReceive: boolean }>('/escalations/inbox'),
  acknowledgeEscalation: (id: string) => request<Escalation>(`/escalations/${id}/acknowledge`, { method: 'POST' }),

  // Safety reports
  getSafetyReports: (params?: { mineId?: string; severity?: string; status?: string }) =>
    request<SafetyReport[]>(`/safety-reports${toQuery(params)}`),
  createSafetyReport: (data: {
    mineId: string;
    zoneId?: string;
    category: string;
    severity: string;
    description: string;
    immediateActionTaken?: string;
    imageUrl?: string;
  }) => request('/safety-reports', { method: 'POST', body: data }),
  updateSafetyReportStatus: (id: string, data: { status: string; assignedOfficer?: string; correctiveActionText?: string }) =>
    request(`/safety-reports/${id}/status`, { method: 'PATCH', body: data }),

  // Grievances
  getGrievances: (params?: { mineId?: string; status?: string }) => request<Grievance[]>(`/grievances${toQuery(params)}`),
  submitGrievance: (data: { mineId: string; category: string; description: string; anonymityType: 'ANONYMOUS' | 'CONFIDENTIAL' | 'IDENTIFIED' }) =>
    request('/grievances', { method: 'POST', body: data }),
  trackGrievance: (trackingCode: string) => request(`/grievances/track/${encodeURIComponent(trackingCode.trim())}`),
  escalateGrievance: (id: string, reason?: string, targetTier?: string) =>
    request(`/grievances/${encodeURIComponent(id)}/escalate`, { method: 'POST', body: { reason, targetTier } }),
  respondGrievance: (id: string, data: { status?: string; note?: string; assignedInvestigator?: string }) =>
    request(`/grievances/${encodeURIComponent(id)}/respond`, { method: 'POST', body: data }),

  // SOS
  triggerSos: (data: { mineId: string; zoneId?: string; emergencyType: string; workerIdentifier?: string; locationNotes?: string }) =>
    request('/sos', { method: 'POST', body: data }),
  getActiveSos: () => request<SosAlert[]>('/sos/active'),
  getSosHistory: () => request<SosAlert[]>('/sos/history'),
  updateSosStatus: (id: string, data: { status: string; assignedTeams?: string; responderNotes?: string }) =>
    request(`/sos/${id}/status`, { method: 'PATCH', body: data }),

  // Inspections
  getInspections: (params?: { mineId?: string }) => request<Inspection[]>(`/inspections${toQuery(params)}`),
  assignInspection: (data: { mineId: string; assignedToId: string; inspectionType: string; title?: string; dueDate: string }) =>
    request<Inspection>('/inspections/assign', { method: 'POST', body: data }),
  submitInspection: (
    id: string,
    data: { outcome: 'DONE' | 'NOT_DONE'; note?: string; photos: string[]; latitude?: number; longitude?: number }
  ) => request<Inspection>(`/inspections/${encodeURIComponent(id)}/submit`, { method: 'POST', body: data }),
  reviewInspection: (id: string, data: { decision: 'APPROVE' | 'RETURN'; note?: string }) =>
    request<Inspection>(`/inspections/${encodeURIComponent(id)}/review`, { method: 'POST', body: data }),

  // Corrective actions
  getCorrectiveActions: (params?: { priority?: string; status?: string }) =>
    request<CorrectiveAction[]>(`/corrective-actions${toQuery(params)}`),
  createCorrectiveAction: (data: any) => request('/corrective-actions', { method: 'POST', body: data }),
  updateCorrectiveAction: (id: string, data: any) => request(`/corrective-actions/${id}`, { method: 'PATCH', body: data }),

  // Incidents
  getIncidents: () => request<Incident[]>('/incidents'),
  logIncident: (data: {
    mineId: string;
    incidentType: string;
    severity: string;
    location: string;
    description: string;
    peopleAffected?: number;
    immediateResponse?: string;
  }) => request<{ incident: Incident }>('/incidents', { method: 'POST', body: data }),

  // Compliance
  getComplianceDashboard: (mineId?: string) =>
    request<{
      kpis: ComplianceKPIs;
      categoryBreakdown: { name: string; count: number }[];
      severityBreakdown: { name: string; count: number }[];
      monthlyTrends: any[];
    }>(`/compliance/dashboard${toQuery({ mineId })}`),
  getCorporateSummary: () => request<any[]>('/compliance/corporate-summary'),

  // Audit
  getAuditBlocks: () => request<AuditBlock[]>('/audit/blocks'),
  verifyRecordIntegrity: (recordId: string) => request(`/audit/verify/${encodeURIComponent(recordId.trim())}`),
  simulateTamper: (blockIndex?: number) => request('/audit/simulate-tamper', { method: 'POST', body: { blockIndex } }),
  repairAuditChain: () => request('/audit/repair-chain', { method: 'POST' }),

  // Recognition
  getLeaderboard: () => request('/recognition/leaderboard'),
  getMyPoints: () => request('/recognition/my-points'),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  getAnnouncements: (mineId?: string) => request(`/notifications/announcements${toQuery({ mineId })}`),
};
