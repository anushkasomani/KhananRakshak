import {
  LayoutGrid,
  AlertTriangle,
  Flame,
  ClipboardCheck,
  ListChecks,
  MessageSquare,
  Radio,
  BarChart3,
  Building2,
  FileKey2,
  Trophy,
  Activity,
  BrainCircuit,
  Scale,
  MapPinned,
  Users,
  CalendarCheck,
  ChevronsUp,
  LucideIcon,
} from 'lucide-react';
import { Role, User } from './types';
import { atLeast } from './roles';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group?: 'Safety' | 'People' | 'Governance' | 'Admin';
  subgroup?: string;
  min?: Role; // lowest role that can open it; admins can open everything
  adminOnly?: boolean;
  requiresRole?: boolean; // hidden for admin accounts that have no hierarchy role
}

export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid, requiresRole: true },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },

  { to: '/safety-reports', label: 'Hazards', icon: AlertTriangle, group: 'Safety' },
  { to: '/incidents', label: 'Incidents', icon: Flame, group: 'Safety', min: 'SUPERVISOR' },
  { to: '/inspections', label: 'Inspections', icon: ClipboardCheck, group: 'Safety' },
  { to: '/corrective-actions', label: 'Corrective actions', icon: ListChecks, group: 'Safety', min: 'SUPERVISOR' },
  { to: '/sos-control', label: 'SOS control', icon: Radio, group: 'Safety', min: 'SUPERVISOR' },
  { to: '/escalations', label: 'Escalations', icon: ChevronsUp, group: 'Safety', min: 'SUPERVISOR' },

  { to: '/grievances', label: 'Grievances', icon: MessageSquare, group: 'People' },
  { to: '/recognition', label: 'Leaderboard', icon: Trophy, group: 'People', requiresRole: true },
  { to: '/future-health', label: 'Health monitoring', icon: Activity, group: 'People', min: 'OFFICER' },

  { to: '/compliance', label: 'Compliance', icon: BarChart3, group: 'Governance', min: 'OFFICER' },
  { to: '/corporate', label: 'Mine benchmark', icon: Building2, group: 'Governance', min: 'DGMS' },
  { to: '/audit-verification', label: 'Audit log', icon: FileKey2, group: 'Governance', min: 'OFFICER' },

  { to: '/admin/mines', label: 'Mines', icon: MapPinned, group: 'Admin', adminOnly: true },
  { to: '/admin/people', label: 'People', icon: Users, group: 'Admin', adminOnly: true },
  { to: '/admin/governance', label: 'Governance intelligence', icon: BrainCircuit, group: 'Admin', subgroup: 'Governance', adminOnly: true },
  { to: '/admin/compliance', label: 'Statutory compliance', icon: Scale, group: 'Admin', subgroup: 'Governance', adminOnly: true },
];

export function canAccess(user: User | null | undefined, item: Pick<NavItem, 'min' | 'adminOnly' | 'requiresRole'>): boolean {
  if (!user) return false;
  if (item.adminOnly) return user.isAdmin;
  if (item.requiresRole && !user.role) return false;
  return item.min ? atLeast(user, item.min) : true;
}

export const homePath = (user: User | null | undefined) => (user?.role ? '/dashboard' : '/admin/people');

export const navFor = (user: User | null | undefined) => NAV.filter((item) => canAccess(user, item));
