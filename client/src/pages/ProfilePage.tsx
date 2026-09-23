import React from 'react';
import { User, Shield, Award, Building2, Key, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, role, logout } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="cyber-card p-8 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-glow-cyan/50">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{user?.name}</h1>
            <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold">
                {role}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs">
                Badge #{user?.badgeNumber || 'AUTH-001'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs font-mono">
          <div className="flex justify-between py-2 border-b border-slate-850">
            <span className="text-slate-400">Department / Cell:</span>
            <span className="text-slate-200 font-bold">{user?.department || 'Operations'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-850">
            <span className="text-slate-400">Assigned Colliery:</span>
            <span className="text-cyan-400 font-bold">{user?.mine?.name || 'Central Headquarter'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-850">
            <span className="text-slate-400">Safety Points:</span>
            <span className="text-amber-400 font-bold text-sm">{user?.points || 0} PTS</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-850">
            <span className="text-slate-400">Cryptographic Signature:</span>
            <span className="text-emerald-400 font-mono">ACTIVE (SHA-256)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs text-slate-300 leading-snug">
            Your authenticated session conforms to the Directorate General of Mines Safety (DGMS) regulatory
            framework. All actions are appended to the tamper-evident audit ledger.
          </div>
        </div>
      </div>
    </div>
  );
};
