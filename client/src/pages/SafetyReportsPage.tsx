import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PlusCircle,
  Filter,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SafetyReport, Mine } from '../types';
import { StatusPill } from '../components/StatusPill';
import { TamperProofBadge } from '../components/TamperProofBadge';

interface SafetyReportsPageProps {
  mines: Mine[];
}

export const SafetyReportsPage: React.FC<SafetyReportsPageProps> = ({ mines }) => {
  const { user, role } = useAuth();
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<SafetyReport | null>(null);

  // Filter state
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMine, setFilterMine] = useState('');

  // Creation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    mineId: user?.mineId || mines[0]?.id || '',
    zoneId: '',
    category: 'PPE',
    severity: 'HIGH',
    description: '',
    immediateActionTaken: '',
    imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review / Status Transition State
  const [assignedOfficerInput, setAssignedOfficerInput] = useState('');
  const [correctiveActionInput, setCorrectiveActionInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadReports = async () => {
    try {
      const data = await api.getSafetyReports({
        severity: filterSeverity || undefined,
        status: filterStatus || undefined,
        mineId: filterMine || undefined,
      });
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (e) {
      console.error('Error fetching safety reports:', e);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filterSeverity, filterStatus, filterMine]);

  const currentMine = mines.find((m) => m.id === formData.mineId) || mines[0];
  const zones = currentMine?.zones || [];

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.createSafetyReport({
        mineId: formData.mineId || mines[0]?.id,
        zoneId: formData.zoneId || (zones[0]?.id || undefined),
        category: formData.category,
        severity: formData.severity,
        description: formData.description,
        immediateActionTaken: formData.immediateActionTaken,
        imageUrl: formData.imageUrl,
      });
      setIsModalOpen(false);
      setFormData({
        mineId: user?.mineId || mines[0]?.id || '',
        zoneId: '',
        category: 'PPE',
        severity: 'HIGH',
        description: '',
        immediateActionTaken: '',
        imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80',
      });
      await loadReports();
      setSelectedReport(res.report);
    } catch (err: any) {
      alert(err.message || 'Error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, targetStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await api.updateSafetyReportStatus(reportId, {
        status: targetStatus,
        assignedOfficer: assignedOfficerInput || user?.name || 'Safety Officer',
        correctiveActionText: correctiveActionInput || undefined,
      });
      await loadReports();
      setSelectedReport(res.updated);
      setAssignedOfficerInput('');
      setCorrectiveActionInput('');
      if (res.awardedPoints > 0) {
        alert(`Status updated to RESOLVED! Worker awarded +${res.awardedPoints} Safety Points and sealed to Audit Ledger.`);
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-slate-100">
              Colliery Safety Hazard Reports
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Digital Incident Logging • Multi-Zone Hazard Classification • Cryptographic Audit Verification
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-amber transition-all flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Safety Hazard</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="font-semibold text-slate-300">Filters:</span>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
        >
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <select
          value={filterMine}
          onChange={(e) => setFilterMine(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
        >
          <option value="">All Mines</option>
          {mines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {(filterSeverity || filterStatus || filterMine) && (
          <button
            onClick={() => {
              setFilterSeverity('');
              setFilterStatus('');
              setFilterMine('');
            }}
            className="text-slate-400 hover:text-slate-200 underline ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Grid: Reports List & Inspection Detail Panel */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Tickets Table */}
        <div className="lg:col-span-2 cyber-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-bold">
              Active Hazard Tickets ({reports.length})
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Sorted by Most Recent</span>
          </div>

          <div className="divide-y divide-slate-800">
            {reports.map((r) => {
              const isSelected = selectedReport?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-850 border border-cyan-500/40 shadow-glow-cyan/10'
                      : 'hover:bg-slate-850/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-100">
                        {r.id}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {r.category}
                      </span>
                      <StatusPill status={r.severity} size="sm" />
                      <StatusPill status={r.status} size="sm" />
                    </div>
                    <TamperProofBadge hash={r.recordHash} recordId={r.id} />
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 mb-2">{r.description}</p>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-4">
                    <span>Mine: {r.mine.name}</span>
                    <span>Zone: {r.zone?.name || 'Main Face'}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Ticket Workstation */}
        <div>
          {selectedReport ? (
            <div className="cyber-card p-6 space-y-5 border-amber-500/30">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-slate-500">HAZARD RECORD</span>
                  <div className="font-mono text-base font-bold text-slate-100">
                    {selectedReport.id}
                  </div>
                </div>
                <StatusPill status={selectedReport.status} size="md" />
              </div>

              {/* Photo Evidence Preview if available */}
              {selectedReport.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-800 relative group">
                  <img
                    src={selectedReport.imageUrl}
                    alt="Hazard Evidence"
                    className="w-full h-36 object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-semibold text-slate-200">
                    Photo Attachment Verified
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Report Description
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedReport.description}
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-200">{selectedReport.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Severity:</span>
                  <span className="text-amber-400 font-bold">{selectedReport.severity}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Colliery / Zone:</span>
                  <span className="text-slate-200">{selectedReport.mine.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Immediate Action:</span>
                  <span className="text-slate-300">{selectedReport.immediateActionTaken || 'None logged'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Officer In-Charge:</span>
                  <span className="text-cyan-400 font-bold">{selectedReport.assignedOfficer || 'Unassigned'}</span>
                </div>
              </div>

              {/* Safety Officer Review Controls */}
              {selectedReport.status !== 'RESOLVED' && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="text-xs font-bold font-mono uppercase text-slate-300">
                    Safety Officer Actions
                  </div>

                  {selectedReport.status === 'SUBMITTED' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateStatus(selectedReport.id, 'ASSIGNED')}
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-glow-cyan/30"
                    >
                      Acknowledge & Assign to Shift Inspector
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateStatus(selectedReport.id, 'RESOLVED')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-glow-emerald/30 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Verify, Resolve & Grant Safety Points</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="cyber-card p-12 text-center text-slate-500 text-xs">
              Select a hazard report to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Report Hazard to DGMS & Mine Safety Cell
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mine Site</label>
                  <select
                    value={formData.mineId}
                    onChange={(e) => setFormData({ ...formData, mineId: e.target.value, zoneId: '' })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    {mines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Mine Area / Zone</label>
                  <select
                    value={formData.zoneId}
                    onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    <option value="">Select Zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.depthLevel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    <option value="PPE">PPE / SCSR Respirator</option>
                    <option value="MACHINERY">Heavy Machinery / Conveyors</option>
                    <option value="ELECTRICAL">Flameproof Switchgear & Cables</option>
                    <option value="VENTILATION">Ventilation Fan & Brattice</option>
                    <option value="GAS">Methane / Toxic Gas</option>
                    <option value="STRUCTURAL">Roof Support / Strata Stability</option>
                    <option value="TRANSPORTATION">Haulage & Man-Riding Train</option>
                    <option value="ENVIRONMENTAL">Sump Drainage & Environmental</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    <option value="LOW">Low (Routine maintenance)</option>
                    <option value="MEDIUM">Medium (Wear & tear)</option>
                    <option value="HIGH">High (Active hazard)</option>
                    <option value="CRITICAL">Critical (Imminent danger)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Cracked seals on 18 emergency SCSR respirators in Box 4, exposing crew to asphyxiation risk..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Immediate Action Taken (Optional)</label>
                <input
                  type="text"
                  value={formData.immediateActionTaken}
                  onChange={(e) => setFormData({ ...formData, immediateActionTaken: e.target.value })}
                  placeholder="e.g. Tagged with red hazard placard, notified shift mate"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-glow-amber"
                >
                  {isSubmitting ? 'Registering...' : 'File Hazard Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
