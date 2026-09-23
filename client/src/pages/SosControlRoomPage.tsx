import React, { useState, useEffect } from 'react';
import {
  Radio,
  AlertOctagon,
  Flame,
  Wind,
  HeartPulse,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  Clock,
  UserCheck,
  MapPin,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../services/api';
import { SosAlert } from '../types';
import { StatusPill } from '../components/StatusPill';
import { TamperProofBadge } from '../components/TamperProofBadge';

interface SosControlRoomPageProps {
  onOpenSos: () => void;
}

export const SosControlRoomPage: React.FC<SosControlRoomPageProps> = ({ onOpenSos }) => {
  const [activeAlerts, setActiveAlerts] = useState<SosAlert[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<SosAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SosAlert | null>(null);
  const [responderTeamInput, setResponderTeamInput] = useState('');
  const [responderNotesInput, setResponderNotesInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const loadAlerts = async () => {
    try {
      const [active, history] = await Promise.all([
        api.getActiveSos(),
        api.getSosHistory(),
      ]);
      setActiveAlerts(active);
      setHistoryAlerts(history);
      if (active.length > 0 && !selectedAlert) {
        setSelectedAlert(active[0]);
      }
    } catch (e) {
      console.error('Error fetching SOS alerts:', e);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 5002); // Polling for real-time control room feeds
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (sosId: string, nextStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await api.updateSosStatus(sosId, {
        status: nextStatus,
        assignedTeams: responderTeamInput || undefined,
        responderNotes: responderNotesInput || undefined,
      });
      await loadAlerts();
      setSelectedAlert(res.updated);
      setResponderTeamInput('');
      setResponderNotesInput('');
    } catch (err: any) {
      alert(err.message || 'Failed to update SOS status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Control Room Header with Siren Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border-2 border-red-500/50 shadow-glow-danger">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2 rounded-xl bg-red-600 text-white animate-pulse-fast">
              <Radio className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-red-100 tracking-wide uppercase">
                  Surface Emergency SOS Control Room
                </h1>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-700">
                  USP 4
                </span>
              </div>
              <p className="text-xs text-red-200/80 font-medium">
                Continuous Underground Monitoring • High-Priority Audible Klaxon Relay • Rapid Response Dispatch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
              soundEnabled
                ? 'bg-red-950/80 border-red-500/50 text-red-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-red-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Siren: ARMED' : 'Siren: MUTED'}</span>
          </button>

          <button
            onClick={onOpenSos}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-red-600/50 flex items-center gap-2 animate-bounce"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>TRIGGER NEW SOS TEST</span>
          </button>
        </div>
      </div>

      {/* Main Control Room Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Active Emergency Alerts List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-red-400 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Active Emergencies ({activeAlerts.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono">Live Ingress</span>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-emerald-300">All Colliery Sectors Clear</div>
              <div className="text-xs text-slate-400">Zero unacknowledged underground SOS alarms active.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => {
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-red-950/40 border-red-500 shadow-glow-danger ring-1 ring-red-500'
                        : 'bg-slate-900/80 border-red-500/30 hover:border-red-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-red-400">
                          {alert.id}
                        </span>
                        <StatusPill status={alert.status} size="sm" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(alert.triggeredAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                      <Flame className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{alert.emergencyType.replace(/_/g, ' ')}</span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{alert.mine.name} - {alert.zone?.name || 'Main Haulage'}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Worker: {alert.workerIdentifier}</span>
                      <span className="text-cyan-400 font-semibold flex items-center gap-1">
                        Dispatch <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Past Resolved Incidents List */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Recently Resolved Emergencies ({historyAlerts.filter(h => h.status === 'RESOLVED').length})
            </h3>
            <div className="space-y-2">
              {historyAlerts
                .filter((h) => h.status === 'RESOLVED')
                .slice(0, 3)
                .map((h) => (
                  <div
                    key={h.id}
                    onClick={() => setSelectedAlert(h)}
                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-400 font-semibold">{h.id}</span>
                      <span className="text-emerald-400 font-mono text-[10px]">RESOLVED</span>
                    </div>
                    <div className="text-slate-300 font-medium">{h.emergencyType.replace(/_/g, ' ')}</div>
                    <div className="text-[11px] text-slate-500">{h.mine.name}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Center & Right Column: Interactive Dispatch Workstation */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAlert ? (
            <div className="cyber-card p-6 border-red-500/40 space-y-6">
              {/* Emergency Banner */}
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-red-600 text-white animate-pulse-fast">
                    <AlertOctagon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold">
                      ACTIVE EMERGENCY EVENT
                    </div>
                    <h2 className="text-xl font-black text-slate-100 uppercase">
                      {selectedAlert.emergencyType.replace(/_/g, ' ')}
                    </h2>
                    <div className="text-xs text-slate-300 font-mono">
                      Ref ID: <span className="text-cyan-400 font-bold">{selectedAlert.id}</span> • Triggered:{' '}
                      {new Date(selectedAlert.triggeredAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <StatusPill status={selectedAlert.status} size="md" />
              </div>

              {/* Geo / Mine Details */}
              <div className="grid sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">COLLIERY MINE</div>
                  <div className="text-slate-200 font-bold mt-0.5">{selectedAlert.mine.name}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">UNDERGROUND ZONE</div>
                  <div className="text-slate-200 font-bold mt-0.5">
                    {selectedAlert.zone?.name || 'Section B-12'} ({selectedAlert.zone?.depthLevel || '-240m'})
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">REPORTED BY</div>
                  <div className="text-cyan-300 font-bold mt-0.5">{selectedAlert.workerIdentifier}</div>
                </div>
              </div>

              {/* Location notes */}
              {selectedAlert.responderNotes && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="font-bold text-slate-400 font-mono uppercase">Responder Log / Notes: </span>
                  <span className="text-slate-200">{selectedAlert.responderNotes}</span>
                </div>
              )}

              {/* Status Transition Stepper (Section 19) */}
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
                  Emergency Response Lifecycle
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  {[
                    { id: 'ALERT_TRIGGERED', label: '1. Triggered' },
                    { id: 'ACKNOWLEDGED', label: '2. Acknowledged' },
                    { id: 'RESPONDING', label: '3. Responding' },
                    { id: 'RESOLVED', label: '4. Resolved' },
                  ].map((st, i) => {
                    const statuses = ['ALERT_TRIGGERED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED'];
                    const currentIdx = statuses.indexOf(selectedAlert.status);
                    const isPassed = currentIdx >= i;
                    const isCurrent = selectedAlert.status === st.id;

                    return (
                      <div
                        key={st.id}
                        className={`p-2.5 rounded-xl border text-[11px] ${
                          isCurrent
                            ? 'bg-red-500/20 border-red-500 text-red-300 font-bold ring-2 ring-red-500/50'
                            : isPassed
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-600'
                        }`}
                      >
                        <div>{st.label}</div>
                        <div className="text-[9px] mt-1 opacity-70">
                          {isCurrent ? '● Active' : isPassed ? '✓ Complete' : 'Pending'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons for Surface Operator */}
              {selectedAlert.status !== 'RESOLVED' && (
                <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4">
                  <div className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                    Control Room Actions
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Assign Emergency Response Squads</label>
                      <input
                        type="text"
                        value={responderTeamInput}
                        onChange={(e) => setResponderTeamInput(e.target.value)}
                        placeholder="e.g. Mine Rescue Team Alpha, Paramedic 2"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Dispatch / Rescue Notes</label>
                      <input
                        type="text"
                        value={responderNotesInput}
                        onChange={(e) => setResponderNotesInput(e.target.value)}
                        placeholder="e.g. Cage descent initiated via Shaft 2"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                  </div>

                  {/* 4 Action Buttons Required by Prompt Section 19 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isUpdating || selectedAlert.status !== 'ALERT_TRIGGERED'}
                      onClick={() => handleStatusChange(selectedAlert.id, 'ACKNOWLEDGED')}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs rounded-xl transition-all"
                    >
                      Acknowledge
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating || (selectedAlert.status !== 'ACKNOWLEDGED' && selectedAlert.status !== 'ALERT_TRIGGERED')}
                      onClick={() => handleStatusChange(selectedAlert.id, 'TEAM_ASSIGNED')}
                      className="py-2.5 px-3 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 disabled:opacity-40 text-amber-200 font-bold text-xs rounded-xl transition-all"
                    >
                      Assign Response Team
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating || selectedAlert.status === 'RESPONDING'}
                      onClick={() => handleStatusChange(selectedAlert.id, 'RESPONDING')}
                      className="py-2.5 px-3 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 disabled:opacity-40 text-cyan-200 font-bold text-xs rounded-xl transition-all"
                    >
                      Mark Responding
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(selectedAlert.id, 'RESOLVED')}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-glow-emerald/30"
                    >
                      Resolve Emergency
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="cyber-card p-12 text-center text-slate-500 text-xs">
              Select an active emergency alert on the left to open the dispatch console.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
