import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  MessageSquareWarning,
  Award,
  Radio,
  Search,
  Bell,
  CheckCircle2,
  Clock,
  PlusCircle,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SafetyReport, Grievance, Mine } from '../types';
import { StatusPill } from '../components/StatusPill';
import { TamperProofBadge } from '../components/TamperProofBadge';

interface WorkerDashboardProps {
  onOpenSos: () => void;
  mines: Mine[];
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ onOpenSos, mines }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [trackedGrievance, setTrackedGrievance] = useState<any>(null);
  const [trackingError, setTrackingError] = useState('');
  const [isTracking, setIsTracking] = useState(false);

  // Quick Report Hazard Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [hazardForm, setHazardForm] = useState({
    mineId: user?.mineId || mines[0]?.id || '',
    category: 'PPE',
    severity: 'HIGH',
    description: '',
    immediateActionTaken: '',
    imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80',
  });
  const [isSubmittingHazard, setIsSubmittingHazard] = useState(false);
  const [newlyCreatedReport, setNewlyCreatedReport] = useState<any>(null);

  const loadData = async () => {
    try {
      const [reps, anns] = await Promise.all([
        api.getSafetyReports({ limit: 5 } as any),
        api.getAnnouncements(user?.mineId || undefined),
      ]);
      setReports(reps);
      setAnnouncements(anns);
    } catch (e) {
      console.error('Error loading worker dashboard:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleTrackGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCodeInput.trim()) return;
    setIsTracking(true);
    setTrackingError('');
    setTrackedGrievance(null);
    try {
      const data = await api.trackGrievance(trackingCodeInput.trim());
      setTrackedGrievance(data);
    } catch (err: any) {
      setTrackingError(err.message || 'Tracking ID not found');
    } finally {
      setIsTracking(false);
    }
  };

  const handleQuickSubmitHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHazard(true);
    try {
      const res = await api.createSafetyReport({
        mineId: hazardForm.mineId || mines[0]?.id,
        category: hazardForm.category,
        severity: hazardForm.severity,
        description: hazardForm.description,
        immediateActionTaken: hazardForm.immediateActionTaken,
        imageUrl: hazardForm.imageUrl,
      });
      setNewlyCreatedReport(res.report);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error submitting report');
    } finally {
      setIsSubmittingHazard(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">👷</span>
            <h1 className="text-2xl font-bold text-slate-100">
              Welcome back, {user?.name || 'Miner'}
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              {user?.badgeNumber || 'W-4109'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Assigned Colliery: <span className="text-slate-200 font-semibold">{user?.mine?.name || 'Dhanbad Central Underground'}</span> • Shift Safety Status: <span className="text-emerald-400 font-semibold">Active & Monitored</span>
          </p>
        </div>

        {/* Quick Points & SOS trigger */}
        <div className="flex items-center gap-3">
          <Link
            to="/recognition"
            className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 flex items-center gap-3 hover:border-amber-400 transition-all"
          >
            <Award className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80 font-bold">
                Safety Points
              </div>
              <div className="text-xl font-black text-amber-300 font-mono">
                {user?.points || 75} pts
              </div>
            </div>
          </Link>

          <button
            onClick={onOpenSos}
            className="p-3 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm tracking-wider uppercase shadow-glow-danger flex items-center gap-2 animate-pulse-fast"
          >
            <Radio className="w-5 h-5" />
            <span>EMERGENCY SOS</span>
          </button>
        </div>
      </div>

      {/* 5 Quick Action Shortcuts (Section 10) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => {
            setNewlyCreatedReport(null);
            setShowReportModal(true);
          }}
          className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 hover:bg-slate-850 text-left transition-all group"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-bold text-slate-200">Report Hazard</div>
          <div className="text-[11px] text-slate-400">Damaged PPE, Gas, Belts</div>
        </button>

        <Link
          to="/grievances"
          className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-850 text-left transition-all group"
        >
          <MessageSquareWarning className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-bold text-slate-200">Submit Grievance</div>
          <div className="text-[11px] text-slate-400">100% Anonymous Option</div>
        </Link>

        <button
          onClick={onOpenSos}
          className="p-4 rounded-xl bg-slate-900/80 border border-red-500/30 hover:border-red-400 hover:bg-slate-850 text-left transition-all group"
        >
          <Radio className="w-5 h-5 text-red-400 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-bold text-slate-200">Emergency SOS</div>
          <div className="text-[11px] text-slate-400">Underground Klaxon</div>
        </button>

        <a
          href="#track-grievance"
          className="p-4 rounded-xl bg-slate-900/80 border border-teal-500/30 hover:border-teal-400 hover:bg-slate-850 text-left transition-all group"
        >
          <Search className="w-5 h-5 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-bold text-slate-200">Track Grievance</div>
          <div className="text-[11px] text-slate-400">By Code (e.g. 8F4A21)</div>
        </a>

        <Link
          to="/recognition"
          className="p-4 rounded-xl bg-slate-900/80 border border-purple-500/30 hover:border-purple-400 hover:bg-slate-850 text-left transition-all group col-span-2 sm:col-span-1"
        >
          <Sparkles className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-xs font-bold text-slate-200">View Badges</div>
          <div className="text-[11px] text-slate-400">Leaderboard & Points</div>
        </Link>
      </div>

      {/* Main Grid: Reports & Grievance Tracking */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Hazard Reports */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cyber-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-slate-100">
                  Recent Mine Safety Reports
                </h3>
              </div>
              <Link
                to="/safety-reports"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>View All Tickets</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-800">
              {reports.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No active reports recorded.
                </div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-200">
                            {r.id}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                            {r.category}
                          </span>
                          <StatusPill status={r.severity} size="sm" />
                          <StatusPill status={r.status} size="sm" />
                        </div>
                        <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                          {r.description}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <TamperProofBadge hash={r.recordHash} recordId={r.id} />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-4">
                      <span>Colliery: {r.mine.name}</span>
                      <span>Assigned: {r.assignedOfficer || 'Pending Officer'}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Grievance Quick Tracking Widget (USP 1) */}
          <div id="track-grievance" className="cyber-card p-6 border-cyan-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-base text-slate-100">
                Anonymous Grievance Status Tracker
              </h3>
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                USP 1
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Enter your randomly generated tracking ID (e.g.{' '}
              <button
                type="button"
                onClick={() => setTrackingCodeInput('GRV-2026-8F4A21')}
                className="font-mono text-cyan-400 underline"
              >
                GRV-2026-8F4A21
              </button>
              ) to check investigation progress while maintaining complete anonymity.
            </p>

            <form onSubmit={handleTrackGrievance} className="flex gap-2">
              <input
                type="text"
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value)}
                placeholder="Enter Tracking ID (e.g. GRV-2026-8F4A21)"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 uppercase focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isTracking}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-glow-cyan/50"
              >
                {isTracking ? 'Searching...' : 'Track'}
              </button>
            </form>

            {trackingError && (
              <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                {trackingError}
              </div>
            )}

            {trackedGrievance && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {trackedGrievance.trackingCode}
                    </span>
                    <StatusPill status={trackedGrievance.status} size="sm" />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Tier: {trackedGrievance.escalationTier}
                    </span>
                  </div>
                  <TamperProofBadge hash={trackedGrievance.recordHash} recordId={trackedGrievance.trackingCode} />
                </div>
                <p className="text-xs text-slate-300">{trackedGrievance.description}</p>

                {/* Timeline Stepper */}
                <div className="pt-2 border-t border-slate-850 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Investigation & Escalation Timeline
                  </div>
                  <div className="space-y-2 pl-2 border-l border-cyan-500/40">
                    {trackedGrievance.timeline?.map((step: any, idx: number) => (
                      <div key={idx} className="relative pl-3 text-xs">
                        <span className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
                        <div className="font-semibold text-slate-200">
                          {step.step.replace(/_/g, ' ')}
                        </div>
                        <div className="text-slate-400 text-[11px]">{step.note}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(step.time).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Announcements & Points Earned */}
        <div className="space-y-6">
          {/* Colliery Announcements */}
          <div className="cyber-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-base text-slate-100">
                Safety Announcements
              </h3>
            </div>
            <div className="space-y-3">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    a.priority === 'HIGH'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{a.title}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                        a.priority === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {a.priority}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{a.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Safety Checklist Advice */}
          <div className="cyber-card p-6 bg-gradient-to-br from-slate-900 to-slate-950">
            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Pre-Shift Mandatory Verification
            </h4>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Verify Draeger SCSR seal and oxygen decay indicator</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Test cap lamp charge voltage & battery latch</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Ensure water spray pressure &gt; 3.0 kg/cm²</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Report Hazard Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-100">
                  Report Underground Safety Hazard
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {newlyCreatedReport ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-emerald-300">
                  Hazard Report Successfully Filed
                </h4>
                <div className="font-mono text-xs text-slate-200 bg-slate-950 p-2 rounded">
                  Report ID: <span className="text-cyan-400 font-bold">{newlyCreatedReport.id}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Safety Officer notified. Event sealed into the SHA-256 tamper-evident audit ledger.
                </p>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuickSubmitHazard} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Hazard Category</label>
                  <select
                    value={hazardForm.category}
                    onChange={(e) => setHazardForm({ ...hazardForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    <option value="PPE">PPE / Respirator Defect</option>
                    <option value="MACHINERY">Machinery / Conveyor Idler</option>
                    <option value="ELECTRICAL">Electrical Switchgear / Cables</option>
                    <option value="VENTILATION">Ventilation Brattice / Airflow</option>
                    <option value="GAS">Gas / Methane Accumulation</option>
                    <option value="STRUCTURAL">Roof Support / Timbering</option>
                    <option value="ENVIRONMENTAL">Environmental / Inundation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Severity Rating</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setHazardForm({ ...hazardForm, severity: sev })}
                        className={`py-2 rounded-lg font-bold border transition-all ${
                          hazardForm.severity === sev
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Hazard Description</label>
                  <textarea
                    rows={3}
                    required
                    value={hazardForm.description}
                    onChange={(e) => setHazardForm({ ...hazardForm, description: e.target.value })}
                    placeholder="Describe specific defect, zone, or equipment..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Immediate Action Taken (Optional)</label>
                  <input
                    type="text"
                    value={hazardForm.immediateActionTaken}
                    onChange={(e) => setHazardForm({ ...hazardForm, immediateActionTaken: e.target.value })}
                    placeholder="e.g. Placed red warning tag, stopped shearer"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingHazard}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
                  >
                    {isSubmittingHazard ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
