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
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('minesafe_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    return res.json();
  },

  async switchRole(role: string, email?: string) {
    const res = await fetch(`${API_BASE}/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, email }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Switch role failed');
    return res.json();
  },

  async getDemoUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  // Mines
  async getMines(): Promise<Mine[]> {
    const res = await fetch(`${API_BASE}/mines`);
    return res.json();
  },

  async getMine(id: string): Promise<Mine> {
    const res = await fetch(`${API_BASE}/mines/${id}`);
    return res.json();
  },

  // Safety Reports
  async getSafetyReports(params?: { mineId?: string; severity?: string; status?: string }): Promise<SafetyReport[]> {
    const search = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/safety-reports?${search}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createSafetyReport(data: {
    mineId: string;
    zoneId?: string;
    category: string;
    severity: string;
    description: string;
    immediateActionTaken?: string;
    imageUrl?: string;
  }) {
    const res = await fetch(`${API_BASE}/safety-reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit report');
    return res.json();
  },

  async updateSafetyReportStatus(id: string, data: { status: string; assignedOfficer?: string; correctiveActionText?: string }) {
    const res = await fetch(`${API_BASE}/safety-reports/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update report');
    return res.json();
  },

  // Grievances (USP 1)
  async getGrievances(params?: { mineId?: string; status?: string }): Promise<Grievance[]> {
    const search = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/grievances?${search}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async submitGrievance(data: {
    mineId: string;
    category: string;
    description: string;
    anonymityType: 'ANONYMOUS' | 'CONFIDENTIAL' | 'IDENTIFIED';
  }) {
    const res = await fetch(`${API_BASE}/grievances`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit grievance');
    return res.json();
  },

  async trackGrievance(trackingCode: string): Promise<any> {
    const res = await fetch(`${API_BASE}/grievances/track/${trackingCode.trim()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Tracking ID not found');
    return res.json();
  },

  async escalateGrievance(id: string, reason?: string, targetTier?: string) {
    const res = await fetch(`${API_BASE}/grievances/${id}/escalate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason, targetTier }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to escalate grievance');
    return res.json();
  },

  async respondGrievance(id: string, data: { status?: string; note?: string; assignedInvestigator?: string }) {
    const res = await fetch(`${API_BASE}/grievances/${id}/respond`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to respond to grievance');
    return res.json();
  },

  // SOS (USP 4)
  async triggerSos(data: {
    mineId: string;
    zoneId?: string;
    emergencyType: string;
    workerIdentifier?: string;
    locationNotes?: string;
  }) {
    const res = await fetch(`${API_BASE}/sos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to trigger SOS');
    return res.json();
  },

  async getActiveSos(): Promise<SosAlert[]> {
    const res = await fetch(`${API_BASE}/sos/active`);
    return res.json();
  },

  async getSosHistory(): Promise<SosAlert[]> {
    const res = await fetch(`${API_BASE}/sos/history`);
    return res.json();
  },

  async updateSosStatus(id: string, data: { status: string; assignedTeams?: string; responderNotes?: string }) {
    const res = await fetch(`${API_BASE}/sos/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update SOS');
    return res.json();
  },

  // Inspections
  async getInspections(params?: { mineId?: string }): Promise<Inspection[]> {
    const search = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/inspections?${search}`);
    return res.json();
  },

  async createInspection(data: any) {
    const res = await fetch(`${API_BASE}/inspections`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create inspection');
    return res.json();
  },

  // Corrective Actions
  async getCorrectiveActions(params?: { priority?: string; status?: string }): Promise<CorrectiveAction[]> {
    const search = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/corrective-actions?${search}`);
    return res.json();
  },

  async createCorrectiveAction(data: any) {
    const res = await fetch(`${API_BASE}/corrective-actions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create action');
    return res.json();
  },

  async updateCorrectiveAction(id: string, data: any) {
    const res = await fetch(`${API_BASE}/corrective-actions/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Incidents
  async getIncidents(): Promise<Incident[]> {
    const res = await fetch(`${API_BASE}/incidents`);
    return res.json();
  },

  async logIncident(data: any) {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Compliance (Sections 13 & 14)
  async getComplianceDashboard(mineId?: string): Promise<{
    kpis: ComplianceKPIs;
    categoryBreakdown: { name: string; count: number }[];
    severityBreakdown: { name: string; count: number }[];
    monthlyTrends: any[];
  }> {
    const res = await fetch(`${API_BASE}/compliance/dashboard${mineId ? `?mineId=${mineId}` : ''}`);
    return res.json();
  },

  async getCorporateSummary(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/compliance/corporate-summary`);
    return res.json();
  },

  // Tamper-Evident Audit (USP 3)
  async getAuditBlocks(): Promise<AuditBlock[]> {
    const res = await fetch(`${API_BASE}/audit/blocks`);
    return res.json();
  },

  async verifyRecordIntegrity(recordId: string) {
    const res = await fetch(`${API_BASE}/audit/verify/${recordId.trim()}`);
    return res.json();
  },

  async simulateTamper(blockIndex?: number) {
    const res = await fetch(`${API_BASE}/audit/simulate-tamper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockIndex }),
    });
    return res.json();
  },

  async repairAuditChain() {
    const res = await fetch(`${API_BASE}/audit/repair-chain`, {
      method: 'POST',
    });
    return res.json();
  },

  // Recognition (USP 2)
  async getLeaderboard() {
    const res = await fetch(`${API_BASE}/recognition/leaderboard`);
    return res.json();
  },

  async getMyPoints() {
    const res = await fetch(`${API_BASE}/recognition/my-points`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Notifications
  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getAnnouncements(mineId?: string) {
    const res = await fetch(`${API_BASE}/notifications/announcements${mineId ? `?mineId=${mineId}` : ''}`);
    return res.json();
  },
};
