import React from 'react';

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'sm' }) => {
  const norm = status.toUpperCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';

  if (['RESOLVED', 'COMPLETED', 'VERIFIED', 'OPERATIONAL', 'LOW'].includes(norm)) {
    styles = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30';
  } else if (['CRITICAL', 'ALERT_TRIGGERED', 'OVERDUE', 'FATALITY', 'HIGH'].includes(norm)) {
    styles = 'bg-red-950/40 text-red-400 border-red-500/40 shadow-glow-danger/30 animate-pulse-fast';
  } else if (['MEDIUM', 'ASSIGNED', 'INVESTIGATION_IN_PROGRESS', 'ACTION_REQUIRED', 'ESCALATED', 'CAUTION', 'RESPONDING', 'TEAM_ASSIGNED'].includes(norm)) {
    styles = 'bg-amber-950/40 text-amber-400 border-amber-500/30';
  } else if (['SUBMITTED', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'SCHEDULED', 'IN_PROGRESS'].includes(norm)) {
    styles = 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles} ${padding}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status.replace(/_/g, ' ')}
    </span>
  );
};
