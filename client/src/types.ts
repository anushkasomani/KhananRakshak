export type Role =
  | 'WORKER'
  | 'SAFETY_OFFICER'
  | 'MINE_MANAGER'
  | 'CORPORATE_ADMIN'
  | 'REGULATOR'
  | 'SYSTEM_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  badgeNumber?: string;
  mineId?: string;
  department?: string;
  points: number;
  mine?: Mine;
  badges?: UserBadge[];
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
  complianceScore: number;
  activeWorkers: number;
  status: 'OPERATIONAL' | 'CAUTION' | 'AUDIT_REQUIRED';
  zones?: MineZone[];
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
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'FOLLOW_UP_REQUIRED';
  recordHash?: string | null;
  createdAt: string;
  completedAt?: string | null;
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
