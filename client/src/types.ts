export type Role = 'WORKER' | 'SUPERVISOR' | 'OFFICER' | 'MINE_MANAGER' | 'PROJECT_MANAGER' | 'DGMS';

export type UserStatus = 'NEW' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role | null;
  officerType?: string | null;
  trade?: string | null;
  phone?: string | null;
  isAdmin: boolean;
  status: UserStatus;
  reviewNote?: string | null;
  badgeNumber?: string | null;
  mineId?: string | null;
  department?: string | null;
  points: number;
  createdAt?: string;
  mine?: Pick<Mine, 'id' | 'name' | 'code' | 'locality' | 'state'> | null;
  badges?: UserBadge[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role | null;
  officerType?: string | null;
  trade?: string | null;
  badgeNumber?: string | null;
}

export interface MineZone {
  id: string;
  mineId: string;
  name: string;
  depthLevel: string;
  riskFactor: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
}

export interface Mine {
  id: string;
  code: string;
  name: string;
  region: string;
  state: string;
  locality?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters: number;
  complianceScore: number;
  activeWorkers: number;
  status: 'OPERATIONAL' | 'CAUTION' | 'AUDIT_REQUIRED';
  zones?: MineZone[];
  staff?: Partial<Record<Role, number>>;
  users?: StaffMember[];
}

export interface SafetyReport {
  id: string;
  reporterId?: string | null;
  reporter?: { id: string; name: string; badgeNumber?: string } | null;
  mineId: string;
  mine: { id: string; name: string; code: string };
  zoneId?: string | null;
  zone?: { id: string; name: string; depthLevel: string } | null;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  immediateActionTaken?: string | null;
  imageUrl?: string | null;
  status: 'SUBMITTED' | 'ASSIGNED' | 'UNDER_INVESTIGATION' | 'RESOLVED';
  assignedOfficer?: string | null;
  recordHash?: string | null;
  rewardPointsAwarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GrievanceTimelineItem {
  step: string;
  time: string;
  note: string;
}

export interface Grievance {
  id: string;
  trackingCode: string;
  anonymityType: 'ANONYMOUS' | 'CONFIDENTIAL' | 'IDENTIFIED';
  submitterId?: string | null;
  submitter?: { id: string; name: string; badgeNumber?: string; email?: string } | null;
  mineId: string;
  mine: { id: string; name: string; code: string };
  category: string;
  description: string;
  status:
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'ASSIGNED'
    | 'INVESTIGATION_IN_PROGRESS'
    | 'ACTION_REQUIRED'
    | 'RESOLVED'
    | 'ESCALATED'
    | 'CLOSED';
  escalationTier: 'MINE_OFFICER' | 'MINE_MANAGEMENT' | 'CORPORATE' | 'REGULATOR';
  timeline: GrievanceTimelineItem[];
  recordHash?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SosAlert {
  id: string;
  workerIdentifier: string;
  mineId: string;
  mine: { id: string; name: string; code: string };
  zoneId?: string | null;
  zone?: { id: string; name: string; depthLevel: string; riskFactor?: string } | null;
  emergencyType:
    | 'ACCIDENT'
    | 'MEDICAL_EMERGENCY'
    | 'FIRE'
    | 'GAS_HAZARD'
    | 'EQUIPMENT_FAILURE'
    | 'UNSAFE_CONDITION'
    | 'OTHER';
  status: 'ALERT_TRIGGERED' | 'ACKNOWLEDGED' | 'TEAM_ASSIGNED' | 'RESPONDING' | 'RESOLVED';
  assignedTeams?: string | null;
  responderNotes?: string | null;
  triggeredAt: string;
  resolvedAt?: string | null;
  triggeredById?: string | null;
  reporter?: { id: string; name: string; phone?: string | null } | null;
}

export interface InspectionChecklistItem {
  item: string;
  passed: boolean;
  note?: string;
}

export interface Inspection {
  id: string;
  mineId: string;
  mine: { id: string; name: string; code: string };
  inspectorName: string;
  inspectionType: string;
  checklist: InspectionChecklistItem[];
  findings: string;
  violationsCount: number;
  deadline?: string | null;
  status: 'SCHEDULED' | 'SUBMITTED' | 'RETURNED' | 'COMPLETED' | 'MISSED' | 'IN_PROGRESS' | 'FOLLOW_UP_REQUIRED';
  recordHash?: string | null;
  createdAt: string;
  completedAt?: string | null;
  title?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; role: Role | null; officerType?: string | null; trade?: string | null; phone?: string | null } | null;
  assignedByName?: string | null;
  outcome?: 'DONE' | 'NOT_DONE' | null;
  submissionNote?: string | null;
  photos: string[];
  submittedAt?: string | null;
  submitDistance?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  canReview?: boolean;
}

export interface CorrectiveAction {
  id: string;
  issueId: string;
  issueType: string;
  actionRequired: string;
  responsiblePerson: string;
  deadline: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  evidence?: string | null;
  verifiedBy?: string | null;
  isOverdue?: boolean;
  createdAt: string;
}

export interface Incident {
  id: string;
  incidentType: string;
  mineId: string;
  mine: { id: string; name: string; code: string };
  location: string;
  severity: 'MINOR' | 'SERIOUS' | 'CRITICAL' | 'FATALITY';
  description: string;
  peopleAffected: number;
  immediateResponse: string;
  rootCause?: string | null;
  reportedById?: string | null;
  reportedByName?: string | null;
  status: string;
  createdAt: string;
}

export interface AuditBlock {
  id: number;
  blockIndex: number;
  previousHash: string;
  currentHash: string;
  timestamp: string;
  recordType: string;
  recordId: string;
  action: string;
  performedByRole: string;
  payloadHash: string;
  payloadSummary: string;
}

export interface UserBadge {
  id: string;
  badgeCode: string;
  title: string;
  icon: string;
  description: string;
  awardedAt: string;
}

export interface ComplianceKPIs {
  overallCompliance: number;
  openViolations: number;
  criticalViolations: number;
  pendingCorrectiveActions: number;
  overdueCorrectiveActions: number;
  totalSafetyReports: number;
  resolvedSafetyReports: number;
  inspectionCompletionRate: number;
  averageResponseTimeHours: number;
  activeSosCount: number;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt: string;
  checkInDistance: number | null;
  checkInAccuracy?: number | null;
  checkOutAt?: string | null;
  checkOutDistance?: number | null;
  syncedLate: boolean;
  source: 'GPS' | 'MANUAL';
  markedById?: string | null;
  markedByName?: string | null;
  note?: string | null;
}

export interface Geofence {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
}

export interface MyAttendance {
  date: string;
  mine: Geofence | null;
  today: AttendanceRecord | null;
  history: AttendanceRecord[];
}

export interface RosterPerson extends StaffMember {
  attendance: AttendanceRecord | null;
}

export interface MineAttendance {
  date: string;
  today: string;
  mine: Geofence;
  people: RosterPerson[];
  summary: { total: number; present: number };
  trend: { date: string; present: number }[];
}

export type EscalationTarget = 'OFFICER' | 'MINE_MANAGER' | 'PROJECT_MANAGER' | 'DGMS';

export interface EscalationRecipient {
  id: string;
  name: string;
  role: Role | null;
  officerType?: string | null;
  phone?: string | null;
  badgeNumber?: string | null;
}

export interface Escalation {
  id: string;
  recordType: 'INCIDENT' | 'SOS';
  recordId: string;
  mineId: string;
  mine: { id: string; name: string };
  summary: string;
  severe: boolean;
  fromUserId: string;
  fromUser: { id: string; name: string; role: Role | null; officerType?: string | null; phone?: string | null };
  toRole: EscalationTarget;
  toOfficerType?: string | null;
  reason: string;
  recipientCount: number;
  callStatus: 'NONE' | 'NOT_CONFIGURED' | 'PLACED' | 'FAILED';
  status: 'OPEN' | 'ACKNOWLEDGED';
  acknowledgedByName?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
}

export type RiskLevel = 'HIGH' | 'ELEVATED' | 'NORMAL';

export interface MineKpis {
  staff: number;
  present: number;
  openIncidents: number;
  severeIncidents: number;
  openHazards: number;
  highHazards: number;
  overdueInspections: number;
  dueInspections: number;
  awaitingApproval: number;
  activeSos: number;
  openEscalations: number;
  risk: { score: number; level: RiskLevel };
}

export interface WeeklyTrend {
  weekStart: string;
  hazards: number;
  incidents: number;
  inspectionsCompleted: number;
  attendanceRate: number;
}

export interface OfficerFocus {
  discipline: string;
  allAreas: boolean;
  hazards: { id: string; category: string; severity: string; description: string; status: string; createdAt: string }[];
  incidents: { id: string; incidentType: string; severity: string; location: string; status: string; createdAt: string }[];
}

export interface MineDashboard {
  mine: { id: string; name: string; code: string };
  kpis: MineKpis;
  trends: WeeklyTrend[] | null;
  focus: OfficerFocus | null;
}

export interface MinesOverview {
  mines: (Geofence & { code: string; state: string; locality?: string | null; kpis: MineKpis })[];
  activeSos: { id: string; emergencyType: string; status: string; triggeredAt: string; mine: { id: string; name: string }; zone: { name: string } | null }[];
}
