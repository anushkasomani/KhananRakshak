import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SafetyReport, Mine } from '../types';
import { StatusPill } from '../components/StatusPill';
import { TamperProofBadge } from '../components/TamperProofBadge';
import { PageHeader, Modal, Empty, Field, Segmented, DetailRows, titleCase, shortDate, ListSkeleton } from '../components/ui';

interface SafetyReportsPageProps {
  mines: Mine[];
}

const CATEGORIES = [
  { value: 'PPE', label: 'PPE / respirator' },
  { value: 'MACHINERY', label: 'Machinery' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'VENTILATION', label: 'Ventilation' },
  { value: 'GAS', label: 'Gas / methane' },
  { value: 'STRUCTURAL', label: 'Roof support' },
  { value: 'TRANSPORTATION', label: 'Haulage / transport' },
  { value: 'ENVIRONMENTAL', label: 'Flooding / environmental' },
];

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-400',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-zinc-500',
};

const emptyForm = (mineId: string) => ({
  mineId,
  zoneId: '',
  category: 'PPE',
  severity: 'MEDIUM' as string,
  description: '',
  immediateActionTaken: '',
});

export const SafetyReportsPage: React.FC<SafetyReportsPageProps> = ({ mines }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<SafetyReport | null>(null);

  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMine, setFilterMine] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm(user?.mineId || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      const data = await api.getSafetyReports({
        severity: filterSeverity || undefined,
        status: filterStatus || undefined,
        mineId: filterMine || undefined,
      });
      setReports(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching safety reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filterSeverity, filterStatus, filterMine]);

  const formMine = mines.find((m) => m.id === form.mineId);
  const zones = formMine?.zones || [];

  const openCreate = () => {
    setForm(emptyForm(user?.mineId || ''));
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mineId) {
      setFormError('Select a mine.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await api.createSafetyReport({
        mineId: form.mineId,
        zoneId: form.zoneId || undefined,
        category: form.category,
        severity: form.severity,
        description: form.description,
        immediateActionTaken: form.immediateActionTaken || undefined,
      });
      setIsCreateOpen(false);
      await loadReports();
      setUpdateMessage(null);
      setSelected(res.report);
    } catch (err: any) {
      setFormError(err.message || 'Could not submit the report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatus = async (id: string, status: string) => {
    setIsUpdating(true);
    setUpdateMessage(null);
    try {
      const res = await api.updateSafetyReportStatus(id, {
        status,
        assignedOfficer: selected?.assignedOfficer || user?.name || undefined,
      });
      await loadReports();
      setSelected(res.updated);
      setUpdateMessage(
        res.awardedPoints > 0 ? `Resolved. ${res.awardedPoints} points awarded to the reporter.` : `Marked ${titleCase(status).toLowerCase()}.`
      );
    } catch (err: any) {
      setUpdateMessage(err.message || 'Could not update the report.');
    } finally {
      setIsUpdating(false);
    }
  };

  const hasFilters = filterSeverity || filterStatus || filterMine;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hazards"
        description={isLoading ? undefined : `${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`}
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Report hazard
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="input w-auto">
          <option value="">Any severity</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-auto">
          <option value="">Any status</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select value={filterMine} onChange={(e) => setFilterMine(e.target.value)} className="input w-auto max-w-[16rem]">
          <option value="">All mines</option>
          {mines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setFilterSeverity('');
              setFilterStatus('');
              setFilterMine('');
            }}
            className="text-sm text-zinc-500 hover:text-zinc-200 px-2"
          >
            Clear
          </button>
        )}
      </div>

      <div className="card divide-y divide-white/[0.05] stagger">
        {isLoading ? (
          <ListSkeleton />
        ) : reports.length === 0 ? (
          <Empty>{hasFilters ? 'No reports match these filters.' : 'No hazards reported yet.'}</Empty>
        ) : (
          reports.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setUpdateMessage(null);
                setSelected(r);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[r.severity] || 'bg-zinc-500'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-200 truncate">{r.description}</p>
                <p className="mt-0.5 text-xs text-zinc-500 truncate">
                  {titleCase(r.category)} · {r.mine?.name} · {shortDate(r.createdAt)}
                </p>
              </div>
              <StatusPill status={r.status} />
            </button>
          ))
        )}
      </div>

      {selected && (
        <Modal title={selected.id} onClose={() => setSelected(null)}>
          <div className="p-5 space-y-5">
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="" className="w-full h-44 object-cover rounded-lg border border-white/[0.06]" />
            )}
            <p className="text-sm text-zinc-200 leading-relaxed">{selected.description}</p>
            <DetailRows
              rows={[
                ['Status', <StatusPill status={selected.status} />],
                ['Severity', titleCase(selected.severity)],
                ['Category', titleCase(selected.category)],
                ['Mine', selected.mine?.name],
                ['Zone', selected.zone?.name],
                ['Action taken', selected.immediateActionTaken],
                ['Assigned to', selected.assignedOfficer],
                ['Reported', shortDate(selected.createdAt)],
                ['Audit record', <TamperProofBadge hash={selected.recordHash} recordId={selected.id} />],
              ]}
            />

            {updateMessage && <p className="text-sm text-zinc-400">{updateMessage}</p>}

            {selected.status !== 'RESOLVED' && (
              <div className="flex gap-2 pt-1">
                {selected.status === 'SUBMITTED' && (
                  <button
                    disabled={isUpdating}
                    onClick={() => handleStatus(selected.id, 'ASSIGNED')}
                    className="btn-secondary flex-1"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatus(selected.id, 'RESOLVED')}
                  className="btn-primary flex-1"
                >
                  Mark resolved
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {isCreateOpen && (
        <Modal title="Report a hazard" onClose={() => setIsCreateOpen(false)}>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mine">
                <select
                  required
                  value={form.mineId}
                  onChange={(e) => setForm({ ...form, mineId: e.target.value, zoneId: '' })}
                  className="input"
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {mines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Zone">
                <select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className="input">
                  <option value="">Not sure</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Severity">
              <Segmented
                value={form.severity}
                onChange={(v) => setForm({ ...form, severity: v })}
                options={SEVERITIES.map((s) => ({ value: s, label: titleCase(s) }))}
              />
            </Field>
            <Field label="What did you see?">
              <textarea
                rows={3}
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Equipment, location, what's wrong"
                className="input resize-none"
              />
            </Field>
            <Field label="Action already taken (optional)">
              <input
                type="text"
                value={form.immediateActionTaken}
                onChange={(e) => setForm({ ...form, immediateActionTaken: e.target.value })}
                placeholder="e.g. Tagged out, stopped conveyor"
                className="input"
              />
            </Field>
            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
