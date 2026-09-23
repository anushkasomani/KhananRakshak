export const ROLES = ['WORKER', 'SUPERVISOR', 'OFFICER', 'MINE_MANAGER', 'PROJECT_MANAGER', 'DGMS'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LEVEL: Record<Role, number> = {
  WORKER: 1,
  SUPERVISOR: 2,
  OFFICER: 3,
  MINE_MANAGER: 4,
  PROJECT_MANAGER: 5,
  DGMS: 6,
};

export const OFFICER_TYPES = ['SAFETY', 'VENTILATION', 'ELECTRICAL', 'MECHANICAL', 'SURVEY', 'BLASTING', 'OTHER'] as const;
export const TRADES = ['DRILLER', 'ELECTRICIAN', 'FITTER', 'BLASTER', 'OPERATOR', 'HELPER', 'OTHER'] as const;
export const USER_STATUSES = ['NEW', 'PENDING', 'APPROVED', 'REJECTED'] as const;

export const isRole = (v: unknown): v is Role => typeof v === 'string' && (ROLES as readonly string[]).includes(v);

export const roleLevel = (role?: string | null) => (isRole(role) ? ROLE_LEVEL[role] : 0);

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export type ProfileInput = {
  role?: unknown;
  officerType?: unknown;
  trade?: unknown;
  mineId?: unknown;
};

// Returns an error message, or null when the combination is valid.
export function validateProfile({ role, officerType, trade, mineId }: ProfileInput): string | null {
  if (!isRole(role)) return 'Choose a valid role.';
  if (role === 'OFFICER' && !(OFFICER_TYPES as readonly unknown[]).includes(officerType)) return 'Choose an officer type.';
  if (role === 'WORKER' && !(TRADES as readonly unknown[]).includes(trade)) return 'Choose a trade.';
  if (role !== 'DGMS' && !mineId) return 'Choose a mine.';
  return null;
}
