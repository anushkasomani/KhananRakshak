import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  ShieldCheck,
  Flame,
  Star,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Users,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const RecognitionPage: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [myPointsData, setMyPointsData] = useState<any>(null);

  useEffect(() => {
    const fetchRecognition = async () => {
      try {
        const [lb, myPts] = await Promise.all([
          api.getLeaderboard(),
          api.getMyPoints().catch(() => null),
        ]);
        setLeaderboard(lb);
        setMyPointsData(myPts);
      } catch (e) {
        console.error('Error fetching recognition:', e);
      }
    };
    fetchRecognition();
  }, [user]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-glow-amber/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-950 border border-amber-500/40 text-amber-400">
              <Trophy className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-100">
              Incentive-Based Safety & Compliance Culture
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
              USP 2
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Transitioning coal mine safety from punitive enforcement to proactive merit recognition. Verified
            hazard identification and compliance discipline grant authenticated safety points and merit badges.
          </p>
        </div>

        {/* User's Total Points Card */}
        <div className="p-4 px-6 rounded-xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border border-amber-500/40 text-right">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
            Authenticated Balance
          </div>
          <div className="text-3xl font-black font-mono text-amber-300">
            {myPointsData?.totalPoints || user?.points || 75} PTS
          </div>
          <div className="text-[11px] text-slate-400">
            Tier: <span className="text-cyan-400 font-bold">{myPointsData?.tier || 'Gold Safety Master'}</span>
          </div>
        </div>
      </div>

      {/* Point Award Rules Showcase (Section 3 Rules) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { pts: '+10', title: 'Valid Hazard Report', desc: 'Verified by Lead Safety Officer' },
          { pts: '+20', title: 'Early Critical Risk', desc: 'Gas, roof fissure, or electrical' },
          { pts: '+15', title: 'Safety Suggestion', desc: 'Misting, ventilation adjustment' },
          { pts: '+25', title: 'Team Target Met', desc: '100% pre-shift checklist completion' },
          { pts: '+50', title: 'Monthly Milestone', desc: 'Zero mine violations in 30 days' },
        ].map((rule, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
            <div className="text-xl font-black font-mono text-amber-400">{rule.pts}</div>
            <div className="text-xs font-bold text-slate-200">{rule.title}</div>
            <div className="text-[10px] text-slate-500">{rule.desc}</div>
          </div>
        ))}
      </div>

      {/* Main Content: Badges Showcase & Leaderboards */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Badges & Points History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Achievement Badges */}
          <div className="cyber-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Mining Safety Achievement Badges
              </h2>
              <span className="text-xs text-slate-400 font-mono">5 Official Badges</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {leaderboard?.availableBadges?.map((b: any) => {
                const isEarned = true; // Ramesh has unlocked core badges
                return (
                  <div
                    key={b.code}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/30 transition-all flex items-start gap-3.5 group"
                  >
                    <span className="text-3xl shrink-0 p-2 bg-slate-900 rounded-xl border border-slate-800 group-hover:scale-110 transition-transform">
                      {b.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                          {b.title}
                        </h4>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{b.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verified Points Audit History */}
          <div className="cyber-card p-6 space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Verified Point Crediting Trail (Anti-Fraud Ledger)
            </h3>
            <p className="text-xs text-slate-400">
              Points are credited only upon positive verification by assigned Safety Officers and Colliery GMs.
            </p>

            <div className="divide-y divide-slate-800">
              {myPointsData?.history?.map((h: any) => (
                <div key={h.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{h.reason}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Verified by: {h.verifiedBy} • {new Date(h.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-400 shrink-0">
                    +{h.pointsAwarded} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Monthly Colliery & Worker Leaderboards */}
        <div className="space-y-6">
          {/* Top Miners */}
          <div className="cyber-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base text-slate-100">
                Monthly Miner Leaderboard
              </h3>
            </div>

            <div className="space-y-2.5">
              {leaderboard?.topWorkers?.map((w: any, idx: number) => (
                <div
                  key={w.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-200">{w.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {w.mine?.name?.split(' ')[0] || 'Dhanbad'} • {w.badgeNumber}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono font-black text-amber-300 text-sm">
                    {w.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Colliery Mines by Compliance */}
          <div className="cyber-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base text-slate-100">
                Top Mine Sites by Compliance
              </h3>
            </div>

            <div className="space-y-2.5">
              {leaderboard?.topMines?.map((m: any, idx: number) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-200">{m.name}</div>
                    <div className="text-[10px] text-slate-500">{m.region}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      {m.complianceScore}%
                    </div>
                    <div className="text-[10px] text-slate-500">{m.activeWorkers} workers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
