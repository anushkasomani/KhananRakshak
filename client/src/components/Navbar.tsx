import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Bell,
  User as UserIcon,
  ChevronDown,
  AlertOctagon,
  Sparkles,
  Award,
  LogOut,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface NavbarProps {
  onOpenSos: () => void;
}

const ROLES_LIST: { role: Role; label: string; icon: string; desc: string }[] = [
  { role: 'WORKER', label: 'Miner / Worker', icon: '👷', desc: 'Ramesh Kumar (W-4109)' },
  { role: 'SAFETY_OFFICER', label: 'Safety Officer', icon: '🛡️', desc: 'Priya Sharma (SO-104)' },
  { role: 'MINE_MANAGER', label: 'Mine Manager', icon: '🏢', desc: 'Rajesh Verma (MM-01)' },
  { role: 'CORPORATE_ADMIN', label: 'Corporate HQ', icon: '🌐', desc: 'Ananya Sen (VP ESG)' },
  { role: 'REGULATOR', label: 'DGMS Regulator', icon: '⚖️', desc: 'Dr. Vikramaditya Singh' },
  { role: 'SYSTEM_ADMIN', label: 'System Admin', icon: '⚙️', desc: 'Suresh Nambiar' },
];

export const Navbar: React.FC<NavbarProps> = ({ onOpenSos }) => {
  const { user, role, switchRole, logout } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const navigate = useNavigate();

  const handleRoleSelect = async (r: Role) => {
    setShowRoleMenu(false);
    await switchRole(r);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand & Crypto Status */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-400 to-emerald-400 p-0.5 shadow-glow-cyan flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-slate-100 bg-clip-text text-transparent">
                  MINESAFE
                </span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-bold tracking-widest">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tighter">
                COAL GUARD ENTERPRISE v2.4
              </p>
            </div>
          </Link>

          {/* Cryptographic Ledger Health Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800/80 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400">LEDGER:</span>
            <span className="text-emerald-400 font-semibold tracking-wide">SHA-256 SEALED</span>
          </div>
        </div>

        {/* Center/Right: Role Switcher, SOS & Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Role Switcher (Crucial for Demo Evaluation) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-xs font-medium text-slate-200 transition-all hover:bg-slate-850"
            >
              <span className="text-slate-400 text-[11px] uppercase tracking-wider">Role:</span>
              <span className="font-bold text-cyan-400">
                {ROLES_LIST.find((r) => r.role === role)?.label || role}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Switch Persona (Instant Demo)
                </div>
                {ROLES_LIST.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => handleRoleSelect(r.role)}
                    className={`w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-slate-800/60 transition-colors ${
                      role === r.role ? 'bg-cyan-950/40 text-cyan-300' : 'text-slate-300'
                    }`}
                  >
                    <span className="text-base shrink-0">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>{r.label}</span>
                        {role === r.role && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Points Pill (For Worker/Gamification) */}
          {user && (
            <Link
              to="/recognition"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/20 border border-amber-500/30 hover:border-amber-400 text-amber-300 text-xs font-semibold transition-all"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{user.points || 0} pts</span>
            </Link>
          )}

          {/* 🚨 SOS BUTTON (Highly visible, pulsating) */}
          <button
            onClick={onOpenSos}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-glow-danger transition-all active:scale-95 animate-pulse-fast"
            title="Instant Underground Emergency SOS Broadcast"
          >
            <AlertOctagon className="w-4 h-4 text-white" />
            <span>SOS</span>
          </button>

          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400" />
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Notifications & Alerts</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Live Sync</span>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                  <div className="p-3 text-xs hover:bg-slate-800/40">
                    <div className="flex items-center gap-1 text-red-400 font-semibold mb-0.5">
                      <Flame className="w-3.5 h-3.5" />
                      <span>SOS Alert: Dhanbad Section B-12</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Medical Emergency acknowledged by Safety Lead. Response squad en route.
                    </p>
                  </div>
                  <div className="p-3 text-xs hover:bg-slate-800/40">
                    <div className="flex items-center gap-1 text-amber-400 font-semibold mb-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+20 Safety Points Verified</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Hazard report SAFE-2026-00124 verified by Priya Sharma.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Navigation */}
          <Link
            to="/profile"
            className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <span className="hidden xl:inline text-xs font-medium text-slate-200 truncate max-w-[100px]">
              {user?.name || 'User'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};
