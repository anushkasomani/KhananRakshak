import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { CorrectiveAction } from '../types';
import { StatusPill } from '../components/StatusPill';

export const CorrectiveActionsPage: React.FC = () => {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);
  const [evidenceInput, setEvidenceInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadActions = async () => {
    try {
      const data = await api.getCorrectiveActions();
      setActions(data);
      if (data.length > 0 && !selectedAction) {
        setSelectedAction(data[0]);
      }
    } catch (e) {
      console.error('Error fetching corrective actions:', e);
    }
  };

  useEffect(() => {
    loadActions();
  }, []);

  const handleUpdateStatus = async (actId: string, status: string) => {
    setIsUpdating(true);
    try {
      const res = await api.updateCorrectiveAction(actId, {
        status,
        evidence: evidenceInput || undefined,
        verifiedBy: 'Shift Supervisor',
      });
      await loadActions();
      setSelectedAction(res.updated);
      setEvidenceInput('');
    } catch (err: any) {
      alert(err.message || 'Error updating action');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-bold text-slate-100">
              Statutory Corrective Action System
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Mandatory Corrective Action Enforcement • SLA Deadlines • Overdue Visual Alarms
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300">
            Pending: {actions.filter(a => a.status === 'PENDING' || a.status === 'IN_PROGRESS').length}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
            Closed: {actions.filter(a => a.status === 'COMPLETED').length}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Actions List */}
        <div className="lg:col-span-2 cyber-card p-6 space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-bold">
            All Corrective Actions ({actions.length})
          </h2>

          <div className="divide-y divide-slate-800">
            {actions.map((act) => {
              const isSelected = selectedAction?.id === act.id;
              const isOverdue = act.isOverdue || act.status === 'OVERDUE';
              return (
                <div
                  key={act.id}
                  onClick={() => setSelectedAction(act)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-850 border border-indigo-500/40 shadow-glow-cyan/10'
                      : isOverdue
                      ? 'bg-red-950/15 border border-red-500/30'
                      : 'hover:bg-slate-850/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-100">{act.id}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {act.issueType}
                      </span>
                      <StatusPill status={act.priority} size="sm" />
                      <StatusPill status={act.status} size="sm" />
                    </div>
                    {isOverdue && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/40 font-bold animate-pulse-fast">
                        OVERDUE SLA
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2 mb-2 font-medium">
                    {act.actionRequired}
                  </p>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-4 font-mono">
                    <span>Target Ref: {act.issueId}</span>
                    <span>Responsible: {act.responsiblePerson}</span>
                    <span className={isOverdue ? 'text-red-400 font-bold' : ''}>
                      Deadline: {new Date(act.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Resolution Workstation */}
        <div>
          {selectedAction ? (
            <div className="cyber-card p-6 space-y-5 border-indigo-500/30">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-slate-500">CORRECTIVE ACTION TICKET</span>
                  <div className="font-mono text-base font-bold text-slate-100">{selectedAction.id}</div>
                </div>
                <StatusPill status={selectedAction.status} size="md" />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Action Mandate
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedAction.actionRequired}
                </p>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Originating Issue:</span>
                  <span className="text-cyan-400 font-bold">{selectedAction.issueId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Responsible Person:</span>
                  <span className="text-slate-200">{selectedAction.responsiblePerson}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">SLA Deadline:</span>
                  <span className="text-slate-200">{new Date(selectedAction.deadline).toLocaleDateString()}</span>
                </div>
                {selectedAction.evidence && (
                  <div className="pt-2">
                    <span className="text-slate-500 block mb-1">Attached Evidence:</span>
                    <span className="text-slate-300 font-sans block bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                      {selectedAction.evidence}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Update Actions */}
              {selectedAction.status !== 'COMPLETED' && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="text-xs font-bold font-mono uppercase text-slate-300">
                    Update Progress & Submit Evidence
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Evidence of Completion / Work Order Ref
                    </label>
                    <textarea
                      rows={2}
                      value={evidenceInput}
                      onChange={(e) => setEvidenceInput(e.target.value)}
                      placeholder="e.g. Work Order #WO-891 completed, parts replaced, leak decay test passed..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isUpdating || selectedAction.status === 'IN_PROGRESS'}
                      onClick={() => handleUpdateStatus(selectedAction.id, 'IN_PROGRESS')}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs rounded-xl transition-all"
                    >
                      Mark In-Progress
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(selectedAction.id, 'COMPLETED')}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-glow-emerald/30"
                    >
                      Complete & Verify
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="cyber-card p-12 text-center text-slate-500 text-xs">
              Select an action item to inspect or update.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
