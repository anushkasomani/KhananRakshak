import { Role, User } from './types';

export const ROLES: Role[] = ['WORKER', 'SUPERVISOR', 'OFFICER', 'MINE_MANAGER', 'PROJECT_MANAGER', 'DGMS'];

export const ROLE_LEVEL: Record<Role, number> = {
  WORKER: 1,
  SUPERVISOR: 2,
  OFFICER: 3,
  MINE_MANAGER: 4,
  PROJECT_MANAGER: 5,
  DGMS: 6,
};

export const ROLE_LABELS: Record<Role, string> = {
  WORKER: 'Worker',
  SUPERVISOR: 'Supervisor',
  OFFICER: 'Officer',
  MINE_MANAGER: 'Mine manager',
  PROJECT_MANAGER: 'Project manager',
  DGMS: 'DGMS',
};

export const OFFICER_TYPES: Record<string, string> = {
  SAFETY: 'Safety',
  VENTILATION: 'Ventilation',
  ELECTRICAL: 'Electrical',
  MECHANICAL: 'Mechanical',
  SURVEY: 'Survey',
  BLASTING: 'Blasting',
  OTHER: 'Other',
};

export const TRADES: Record<string, string> = {
  DRILLER: 'Driller',
  ELECTRICIAN: 'Electrician',
  FITTER: 'Fitter',
  BLASTER: 'Blaster',
  OPERATOR: 'Machine operator',
  HELPER: 'Helper',
  OTHER: 'Other',
};

export const levelOf = (role?: Role | null) => (role ? ROLE_LEVEL[role] : 0);

export const atLeast = (user: Pick<User, 'role' | 'isAdmin'> | null | undefined, min: Role) =>
  !!user && (user.isAdmin || levelOf(user.role) >= ROLE_LEVEL[min]);

export function describeRole(p: Pick<User, 'role' | 'officerType' | 'trade' | 'isAdmin'>): string {
  if (!p.role) return p.isAdmin ? 'Admin' : 'No role yet';
  if (p.role === 'OFFICER' && p.officerType) return `${OFFICER_TYPES[p.officerType] || p.officerType} officer`;
  if (p.role === 'WORKER' && p.trade) return `Worker · ${TRADES[p.trade] || p.trade}`;
  return ROLE_LABELS[p.role];
}
