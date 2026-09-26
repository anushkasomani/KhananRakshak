/**
 * Unread SOS notifications, shown as a banner rather than a bell badge.
 *
 * A worker underground needs to see that their district has been called unsafe
 * without noticing a small count in the corner, so this sits at the top of their
 * dashboard and stays until they dismiss it. Dismissing marks the notification read,
 * which is the same state the bell uses — the two cannot disagree.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { api } from '../services/api';
import { Notification } from '../types';

const POLL_MS = 20000;

export const SafetyAlertBanner: React.FC = () => {
  const [alerts, setAlerts] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    try {
      const rows = await api.getNotifications();
      setAlerts(rows.filter((row) => row.type === 'SOS' && !row.read));
    } catch {
      // A failed poll leaves whatever is on screen; an alert must not vanish
      // because one request did not come back.
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => { void load(); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const dismiss = async (id: string) => {
    setAlerts((previous) => previous.filter((row) => row.id !== id));
    try { await api.markNotificationRead(id); } catch { /* it reappears on the next poll */ }
  };

  if (!alerts.length) return null;

  return (
    <div className="mb-6 space-y-3">
      {alerts.map((alert) => (
        <div key={alert.id} className="card-danger p-4">
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-300">{alert.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-200">{alert.message}</p>
              <p className="mt-2 text-[11px] text-zinc-500">
                {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => void dismiss(alert.id)}
              aria-label="Acknowledge alert"
              className="btn-ghost -mr-1 -mt-1 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
