/**
 * Sirdar decision queue for sensor-detected hazards.
 *
 * A MEDIUM-risk reading never reaches a worker on its own — it lands here first. The
 * Sirdar either approves it, which raises an SOS to the district's workers, or
 * dismisses it, which sends nothing. HIGH-risk readings do not appear here: those
 * raise an SOS automatically, so there is nothing to decide.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BellRing, Check, RefreshCw, X } from 'lucide-react';
import { api, HazardApproval } from '../services/api';
import { Empty, ListSkeleton, PageHeader, Section } from '../components/ui';

const HAZARD_LABELS: Record<string, string> = {
  FIRE: 'Mine fire / heating',
  FLOOD: 'Water accumulation',
  GAS: 'Gas accumulation',
  GROUND: 'Roof / ground movement',
  VENTILATION: 'Ventilation failure',
  WEATHER: 'Severe weather',
};

const hazardLabel = (type: string) => HAZARD_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
const when = (value: string) => new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const STATUS_TONE: Record<string, string> = {
  APPROVED: 'text-red-300',
  DISMISSED: 'text-zinc-400',
  EXPIRED: 'text-zinc-500',
};

export const HazardApprovalsPage: React.FC = () => {
  const [pending, setPending] = useState<HazardApproval[]>([]);
  const [history, setHistory] = useState<HazardApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [queue, past] = await Promise.all([api.getPendingHazards(), api.getHazardHistory()]);
      setPending(queue);
      setHistory(past);
    } catch (e: any) {
      setError(e?.message || 'Could not load hazard approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  // The queue is filled by the sensor layer, not by this page, so it is polled.
  useEffect(() => {
    const id = window.setInterval(() => { void load(); }, 30000);
    return () => window.clearInterval(id);
  }, [load]);

  const decide = async (approval: HazardApproval, approve: boolean) => {
    setBusyId(approval.id);
    setError('');
    setResult('');
    try {
      if (approve) {
        const { sosId, notified } = await api.approveHazard(approval.id);
        setResult(`SOS ${sosId} sent · ${notified} ${notified === 1 ? 'person' : 'people'} notified in ${approval.zoneLabel}.`);
      } else {
        await api.dismissHazard(approval.id);
        setResult(`${approval.zoneLabel} dismissed. No alert was sent.`);
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not record that decision.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="Hazard approvals"
        description="Sensor-detected hazards waiting on your decision. Approving alerts the district's workers."
        actions={
          <button className="btn-secondary" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />Refresh
          </button>
        }
      />

      {error && <div className="card-danger p-4 text-sm text-red-300">{error}</div>}
      {result && <div className="card p-4 text-sm text-zinc-300">{result}</div>}

      <Section title={`Awaiting your decision${pending.length ? ` · ${pending.length}` : ''}`}>
        {loading ? (
          <div className="card"><ListSkeleton rows={3} /></div>
        ) : pending.length === 0 ? (
          <div className="card"><Empty>No hazard is waiting on a decision.</Empty></div>
        ) : (
          <div className="space-y-3">
            {pending.map((approval) => (
              <article key={approval.id} className="card-warning p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      {hazardLabel(approval.hazardType)} · {approval.district?.name || approval.zoneLabel}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {approval.mine?.name} · risk {approval.riskScore}/100 · detected {when(approval.raisedAt)}
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">{approval.summary}</p>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Approving raises an SOS and notifies every worker and Sirdar in this district. Dismissing sends nothing.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-danger h-8 px-3 text-xs"
                      disabled={busyId === approval.id}
                      onClick={() => void decide(approval, true)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {busyId === approval.id ? 'Sending…' : 'Approve & alert workers'}
                    </button>
                    <button
                      className="btn-secondary h-8 px-3 text-xs"
                      disabled={busyId === approval.id}
                      onClick={() => void decide(approval, false)}
                    >
                      <X className="h-3.5 w-3.5" />Dismiss
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recent decisions">
        <div className="card divide-y divide-white/[0.06]">
          {history.length === 0 ? (
            <Empty>No decisions recorded yet.</Empty>
          ) : (
            history.map((approval) => (
              <div key={approval.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200">
                    {hazardLabel(approval.hazardType)} · {approval.district?.name || approval.zoneLabel}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Risk {approval.riskScore}/100 · detected {when(approval.raisedAt)}
                    {approval.decidedBy && ` · decided by ${approval.decidedBy.name}`}
                  </p>
                  {approval.sosAlertId && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-red-300">
                      <BellRing className="h-3 w-3" />SOS {approval.sosAlertId} sent
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium ${STATUS_TONE[approval.status] ?? 'text-zinc-400'}`}>
                  {approval.status}
                </span>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
};
