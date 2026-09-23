import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  CheckSquare,
  MessageSquareWarning,
  Flame,
  Radio,
  BarChart3,
  Building2,
  FileKey2,
  Trophy,
  Activity,
  Settings,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { role } = useAuth();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
      isActive
        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`;

  return (
    <aside className="w-64 shrink-0 bg-slate-950/70 border-r border-slate-850 p-4 space-y-6 hidden lg:block overflow-y-auto">
      {/* Primary Dashboard */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 font-semibold">
          Overview
        </div>
        <div className="space-y-1">
          <NavLink to="/dashboard" className={navItemClass}>
            <LayoutDashboard className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>
              {role === 'WORKER'
                ? 'Worker Portal'
                : role === 'REGULATOR'
                ? 'DGMS Regulator Portal'
                : role === 'CORPORATE_ADMIN'
                ? 'Corporate Executive'
                : 'Safety & Ops Control'}
            </span>
          </NavLink>
        </div>
      </div>

      {/* Safety Section */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 font-semibold">
          Mine Safety Operations
        </div>
        <div className="space-y-1">
          <NavLink to="/safety-reports" className={navItemClass}>
            <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Hazard Reports</span>
          </NavLink>
          <NavLink to="/incidents" className={navItemClass}>
            <Flame className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            <span>Incident Records</span>
          </NavLink>
          <NavLink to="/inspections" className={navItemClass}>
            <ClipboardCheck className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
            <span>Statutory Inspections</span>
          </NavLink>
          <NavLink to="/corrective-actions" className={navItemClass}>
            <CheckSquare className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Corrective Actions</span>
          </NavLink>
        </div>
      </div>

      {/* Grievances (USP 1) */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 font-semibold flex items-center justify-between">
          <span>Grievance Engine</span>
          <span className="text-[9px] text-cyan-400 bg-cyan-950/80 px-1 py-0.5 rounded border border-cyan-800">
            USP 1
          </span>
        </div>
        <div className="space-y-1">
          <NavLink to="/grievances" className={navItemClass}>
            <MessageSquareWarning className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Anonymous Grievance Hub</span>
          </NavLink>
        </div>
      </div>

      {/* Emergency (USP 4) */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 font-semibold flex items-center justify-between">
          <span>Emergency Response</span>
          <span className="text-[9px] text-red-400 bg-red-950/80 px-1 py-0.5 rounded border border-red-800">
            USP 4
          </span>
        </div>
        <div className="space-y-1">
          <NavLink to="/sos-control" className={navItemClass}>
            <Radio className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform animate-pulse-fast" />
            <span>SOS Control Room</span>
          </NavLink>
        </div>
      </div>

      {/* Compliance & Audit (USP 3) */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 font-semibold flex items-center justify-between">
          <span>Regulatory & Audit</span>
          <span className="text-[9px] text-emerald-400 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-800">
            USP 3
          </span>
        </div>
        <div className="space-y-1">
          <NavLink to="/compliance" className={navItemClass}>
            <BarChart3 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Compliance Analytics</span>
          </NavLink>
          {(role === 'CORPORATE_ADMIN' || role === 'REGULATOR' || role === 'MINE_MANAGER') && (
            <NavLink to="/corporate" className={navItemClass}>
              <Building2 className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              <span>Multi-Mine Benchmark</span>
            </NavLink>
          )}
          <NavLink to="/audit-verification" className={navItemClass}>
            <FileKey2 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Cryptographic Audit Proof</span>
          </NavLink>
        </div>
      </div>

      {/* Recognition (USP 2) */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 font-semibold flex items-center justify-between">
          <span>Gamified Safety</span>
          <span className="text-[9px] text-amber-400 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-800">
            USP 2
          </span>
        </div>
        <div className="space-y-1">
          <NavLink to="/recognition" className={navItemClass}>
            <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Points & Leaderboard</span>
          </NavLink>
        </div>
      </div>

      {/* Future Scope (USP 5) */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2 font-semibold flex items-center justify-between">
          <span>IoT Architecture</span>
          <span className="text-[9px] text-purple-400 bg-purple-950/80 px-1 py-0.5 rounded border border-purple-800">
            USP 5
          </span>
        </div>
        <div className="space-y-1">
          <NavLink to="/future-health" className={navItemClass}>
            <Activity className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>Worker Health Telemetry</span>
          </NavLink>
        </div>
      </div>

      {/* Public Landing Link */}
      <div className="pt-4 border-t border-slate-900">
        <NavLink to="/" className={navItemClass}>
          <Eye className="w-4 h-4 text-slate-400" />
          <span>Public Landing Page</span>
        </NavLink>
      </div>
    </aside>
  );
};
