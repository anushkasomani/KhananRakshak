import React, { useState, useEffect } from 'react';
import {
  MessageSquareWarning,
  Lock,
  EyeOff,
  UserCheck,
  ShieldCheck,
  Search,
  ArrowUpRight,
  ChevronRight,
  Clock,
  AlertTriangle,
  Send,
  CheckCircle2,
  FileKey2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Grievance, Mine } from '../types';
import { StatusPill } from '../components/StatusPill';
import { TamperProofBadge } from '../components/TamperProofBadge';

interface GrievancesPageProps {
  mines: Mine[];
}

export const GrievancesPage: React.FC<GrievancesPageProps> = ({ mines }) => {
  const { user, role } = useAuth();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [activeTab, setActiveTab] = useState<'submit' | 'list' | 'track'>('list');

  // Submit Form State
  const [anonymityType, setAnonymityType] = useState<'ANONYMOUS' | 'CONFIDENTIAL' | 'IDENTIFIED'>('ANONYMOUS');
  const [mineId, setMineId] = useState(user?.mineId || mines[0]?.id || '');
  const [category, setCategory] = useState('SUPERVISOR_PRESSURE');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  // Tracking Code Search
  const [trackQuery, setTrackQuery] = useState('');
  const [trackedRecord, setTrackedRecord] = useState<any>(null);
  const [trackError, setTrackError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Escalation Modal / Action
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [escalationReason, setEscalationReason] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);

  const loadGrievances = async () => {
    try {
      const data = await api.getGrievances();
      setGrievances(data);
    } catch (e) {
      console.error('Error fetching grievances:', e);
    }
  };

  useEffect(() => {
    loadGrievances();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.submitGrievance({
        mineId: mineId || mines[0]?.id,
        category,
        description,
        anonymityType,
      });
      setSubmissionResult(res);
      setDescription('');
      await loadGrievances();
    } catch (err: any) {
      alert(err.message || 'Error submitting grievance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    setIsSearching(true);
    setTrackError('');
    setTrackedRecord(null);
    try {
      const res = await api.trackGrievance(trackQuery.trim());
      setTrackedRecord(res);
    } catch (err: any) {
      setTrackError(err.message || 'Tracking ID not found');
    } finally {
      setIsSearching(false);
    }
  };

  const handleEscalate = async (grievanceId: string) => {
    setIsEscalating(true);
    try {
      await api.escalateGrievance(grievanceId, escalationReason);
      setEscalatingId(null);
      setEscalationReason('');
      await loadGrievances();
      if (trackedRecord && trackedRecord.trackingCode === grievanceId) {
        const refreshed = await api.trackGrievance(grievanceId);
        setTrackedRecord(refreshed);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to escalate');
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header with USP 1 Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-glow-cyan/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Lock className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-100">
              Multi-Level Anonymous Grievance System
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              USP 1
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Submit workplace concerns, supervisor pressure, or safety violations with 100% cryptographic
            anonymity protection and tiered escalation from Mine Safety Officers up to DGMS Regulators.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 self-start md:self-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'list'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Grievances ({grievances.length})
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'submit'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Submit Grievance
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'track'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Track by Code
          </button>
        </div>
      </div>

      {/* TAB 1: SUBMIT GRIEVANCE */}
      {activeTab === 'submit' && (
        <div className="max-w-2xl mx-auto cyber-card p-8 border-cyan-500/30">
          <h2 className="text-xl font-bold text-slate-100 mb-2 flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-cyan-400" />
            File a Protected Grievance
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Your grievance will be assigned a random alphanumeric tracking code (e.g. <span className="font-mono text-cyan-400">GRV-2026-XXXXXX</span>).
            Under the Anonymous tier, your name and credentials will never be exposed in any management logs.
          </p>

          {submissionResult ? (
            <div className="p-6 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-center space-y-4 animate-fadeIn">
              <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto" />
              <h3 className="text-2xl font-bold text-slate-100">
                Grievance Successfully Registered
              </h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400">Your Confidential Tracking Code:</div>
                <div className="text-2xl font-mono font-black text-cyan-400 tracking-wider select-all">
                  {submissionResult.trackingCode}
                </div>
                <div className="text-[11px] text-amber-400 font-medium pt-1">
                  ⚠️ Save this tracking code! You will need it to inspect status updates and responses.
                </div>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => {
                    setTrackQuery(submissionResult.trackingCode);
                    setActiveTab('track');
                  }}
                  className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                >
                  Track This Grievance Now
                </button>
                <button
                  onClick={() => setSubmissionResult(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Submit Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Anonymity Level Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Protection Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: 'ANONYMOUS',
                      label: 'Anonymous',
                      icon: EyeOff,
                      desc: 'Identity strictly omitted. Random code generated.',
                    },
                    {
                      id: 'CONFIDENTIAL',
                      label: 'Confidential',
                      icon: Lock,
                      desc: 'Identity visible ONLY to Lead DGMS Inspector.',
                    },
                    {
                      id: 'IDENTIFIED',
                      label: 'Identified',
                      icon: UserCheck,
                      desc: 'Standard report linked to your worker profile.',
                    },
                  ].map((tier) => {
                    const Icon = tier.icon;
                    const isSelected = anonymityType === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setAnonymityType(tier.id as any)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 ring-2 ring-cyan-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <span>{tier.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-snug">{tier.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colliery selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Colliery / Mine
                  </label>
                  <select
                    value={mineId}
                    onChange={(e) => setMineId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {mines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Grievance Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="SUPERVISOR_PRESSURE">Unsafe Pressure from Supervisors</option>
                    <option value="SAFETY_VIOLATIONS">Forced Work in Unsafe Conditions</option>
                    <option value="IGNORED_HAZARDS">Reported Hazards Ignored / Suppressed</option>
                    <option value="HARASSMENT">Workplace Harassment / Discrimination</option>
                    <option value="MISCONDUCT">Safety Rule Misconduct</option>
                    <option value="EQUIPMENT_SAFETY">Faulty / Bypassed Equipment</option>
                    <option value="OTHER">Other Grievance</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Grievance Details
                </label>
                <textarea
                  rows={5}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide objective facts, shift details, location, and the nature of supervisor pressure or violation..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Protected under the DGMS Mining Anonymity Protocol. Your IP address and profile metadata are
                  stripped prior to hashing into the tamper-evident audit ledger.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm tracking-wide rounded-xl transition-all shadow-glow-cyan flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Securing Submission...' : 'Submit Grievance Securely'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: ALL GRIEVANCES LIST & ESCALATION */}
      {activeTab === 'list' && (
        <div className="cyber-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <MessageSquareWarning className="w-5 h-5 text-cyan-400" />
              Active Grievance Tickets & Escalation Tiers
            </h2>
            <div className="text-xs text-slate-400">
              Showing tickets accessible under <span className="text-cyan-400 font-semibold">{role}</span> permissions
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-3 px-3">Tracking Code</th>
                  <th className="py-3 px-3">Colliery</th>
                  <th className="py-3 px-3">Anonymity Tier</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Escalation Tier</th>
                  <th className="py-3 px-3">Audit Hash</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {grievances.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">
                      {g.trackingCode}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-medium">{g.mine.name}</td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                        {g.anonymityType === 'ANONYMOUS' && <EyeOff className="w-3 h-3 text-cyan-400" />}
                        {g.anonymityType}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-medium">
                      {g.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusPill status={g.status} />
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-500/30">
                        {g.escalationTier}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <TamperProofBadge hash={g.recordHash} recordId={g.trackingCode} />
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setTrackQuery(g.trackingCode);
                            setActiveTab('track');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
                        >
                          Inspect
                        </button>

                        {/* Escalation button */}
                        {g.status !== 'RESOLVED' && g.escalationTier !== 'REGULATOR' && (
                          <button
                            onClick={() => setEscalatingId(g.id)}
                            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Escalate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PUBLIC / WORKER TRACK BY CODE */}
      {activeTab === 'track' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="cyber-card p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              Grievance Status Lookup
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter your tracking code below to inspect real-time investigation findings, current tier, and timeline.
            </p>

            <form onSubmit={handleTrack} className="flex gap-2">
              <input
                type="text"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="e.g. GRV-2026-8F4A21"
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 uppercase focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-glow-cyan/50"
              >
                {isSearching ? 'Querying...' : 'Verify Status'}
              </button>
            </form>

            {trackError && (
              <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                {trackError}
              </div>
            )}
          </div>

          {trackedRecord && (
            <div className="cyber-card p-6 space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-base font-bold text-cyan-400">
                      {trackedRecord.trackingCode}
                    </span>
                    <StatusPill status={trackedRecord.status} />
                  </div>
                  <div className="text-xs text-slate-400">
                    Colliery: <span className="text-slate-200">{trackedRecord.mineName}</span> • Category:{' '}
                    <span className="text-slate-200">{trackedRecord.category.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1">
                  <span className="text-xs font-mono text-slate-400">
                    Tier: <span className="text-indigo-400 font-bold">{trackedRecord.escalationTier}</span>
                  </span>
                  <TamperProofBadge hash={trackedRecord.recordHash} recordId={trackedRecord.trackingCode} />
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                  Grievance Summary
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{trackedRecord.description}</p>
              </div>

              {/* Tier Stepper Diagram */}
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
                  Tier Escalation Flow
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  {[
                    { tier: 'MINE_OFFICER', label: 'Mine Safety Officer' },
                    { tier: 'MINE_MANAGEMENT', label: 'Mine General Manager' },
                    { tier: 'CORPORATE', label: 'Corporate HQ' },
                    { tier: 'REGULATOR', label: 'DGMS Regulator' },
                  ].map((lvl, idx) => {
                    const isPassed =
                      (lvl.tier === 'MINE_OFFICER') ||
                      (trackedRecord.escalationTier === 'MINE_MANAGEMENT' && idx <= 1) ||
                      (trackedRecord.escalationTier === 'CORPORATE' && idx <= 2) ||
                      (trackedRecord.escalationTier === 'REGULATOR');
                    const isCurrent = trackedRecord.escalationTier === lvl.tier;

                    return (
                      <div
                        key={lvl.tier}
                        className={`p-2.5 rounded-xl border text-[11px] ${
                          isCurrent
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold ring-2 ring-cyan-500/40'
                            : isPassed
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div>{lvl.label}</div>
                        <div className="text-[9px] mt-1 opacity-70">
                          {isCurrent ? '● Active Tier' : isPassed ? '✓ Passed' : 'Pending'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audit Timeline */}
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
                  Audit Verified Progress Log
                </div>
                <div className="space-y-3 pl-3 border-l-2 border-cyan-500/40 ml-2">
                  {trackedRecord.timeline?.map((step: any, idx: number) => (
                    <div key={idx} className="relative pl-4 text-xs space-y-0.5">
                      <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-slate-900" />
                      <div className="font-bold text-slate-100 flex items-center justify-between">
                        <span>{step.step.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(step.time).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-300 text-[11px]">{step.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escalation Trigger Button */}
              {trackedRecord.status !== 'RESOLVED' && trackedRecord.escalationTier !== 'REGULATOR' && (
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setEscalatingId(trackedRecord.trackingCode)}
                    className="px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Escalate to Next Higher Authority</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Escalation Modal */}
      {escalatingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-amber-400" />
              Escalate Grievance [{escalatingId}]
            </h3>
            <p className="text-xs text-slate-400">
              Escalation automatically pushes the case to higher managerial tiers (Mine GM → Corporate → DGMS
              Regulator) and marks a timestamped audit block.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Escalation
              </label>
              <textarea
                rows={3}
                required
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="e.g. No satisfactory resolution within 72 hours SLA, supervisor coercion continued..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEscalatingId(null)}
                className="px-4 py-2 text-xs text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isEscalating}
                onClick={() => handleEscalate(escalatingId)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                {isEscalating ? 'Escalating...' : 'Confirm Escalation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
