import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Radio } from 'lucide-react';
import { api } from '../services/api';
import { MineAttendance, SosAlert } from '../types';
import { Section, Stat, titleCase } from './ui';
import { RosterList } from './AttendanceRoster';
import { formatTime } from '../attendance';

const REFRESH_MS = 60000;

/** Supervisor view of their mine right now: who is in, who isn't, and any live SOS. */
export const MineTodayPanel: React.FC<{ mineId: string }> = ({ mineId }) => {
  const [data, setData] = useState<MineAttendance | null>(null);
  const [sos, setSos] = useState<SosAlert[]>([]);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const load = () => {
      api.getMineAttendance(mineId).then(setData).catch(console.error);
      api
        .getActiveSos()
        .then((alerts) => setSos(alerts.filter((a) => a.mineId === mineId)))
        .catch(console.error);
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [mineId, reloadKey]);

  const absent = data?.people.filter((p) => !p.attendance) || [];

  return (
    <Section
      title="Today at the mine"
      action={
        <Link to="/attendance" className="text-sm text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-1">
          Full roster <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      <div className="space-y-3">
        {sos.length > 0 && (
          <Link to="/sos-control" className="card-danger flex items-center gap-3 px-4 py-3 hover:bg-red-500/[0.07] transition-colors">
            <Radio className="w-4 h-4 text-red-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-red-200 truncate">
                {sos.length === 1 ? `SOS: ${titleCase(sos[0].emergencyType)}` : `${sos.length} active SOS alerts`}
              </p>
              <p className="mt-0.5 text-xs text-red-300/70 truncate">
                {sos[0].zone?.name || 'Location not given'} · {formatTime(sos[0].triggeredAt)}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-red-300/70 shrink-0" />
          </Link>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Present" value={data ? data.summary.present : '–'} />
          <Stat label="Not checked in" value={data ? absent.length : '–'} />
          <Stat label="Active SOS" value={sos.length} tone={sos.length ? 'danger' : 'default'} />
        </div>

        {data && <RosterList
            people={absent.slice(0, 6)}
            isToday
            empty="Everyone is checked in."
            onChanged={() => setReloadKey((k) => k + 1)}
          />}
        {absent.length > 6 && (
          <Link to="/attendance" className="block text-center text-sm text-zinc-500 hover:text-zinc-200">
            {absent.length - 6} more not checked in
          </Link>
        )}
      </div>
    </Section>
  );
};
