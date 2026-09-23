import React, { useState } from 'react';
import { AlertOctagon, X, Flame, ShieldAlert, HeartPulse, Wrench, Wind, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Mine } from '../types';

interface SosEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mines: Mine[];
  onTriggered?: (sosId: string) => void;
}

const EMERGENCY_TYPES = [
  { id: 'GAS_HAZARD', label: 'Gas / Methane Hazard', icon: Wind, color: 'text-amber-400 border-amber-500/40 bg-amber-950/30' },
  { id: 'MEDICAL_EMERGENCY', label: 'Medical Emergency', icon: HeartPulse, color: 'text-rose-400 border-rose-500/40 bg-rose-950/30' },
  { id: 'FIRE', label: 'Underground Fire / Smoke', icon: Flame, color: 'text-orange-400 border-orange-500/40 bg-orange-950/30' },
  { id: 'ACCIDENT', label: 'Roof Fall / Heavy Machinery Accident', icon: AlertOctagon, color: 'text-red-400 border-red-500/40 bg-red-950/30' },
  { id: 'EQUIPMENT_FAILURE', label: 'Winding Gear / Power Outage', icon: Wrench, color: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/30' },
  { id: 'UNSAFE_CONDITION', label: 'Imminent Inundation / Flooding', icon: ShieldAlert, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30' },
];

export const SosEmergencyModal: React.FC<SosEmergencyModalProps> = ({
  isOpen,
  onClose,
  mines,
  onTriggered,
}) => {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('ACCIDENT');
  const [mineId, setMineId] = useState(user?.mineId || (mines[0]?.id || ''));
  const [zoneId, setZoneId] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successEvent, setSuccessEvent] = useState<any>(null);

  if (!isOpen) return null;

  const currentMine = mines.find((m) => m.id === mineId) || mines[0];
  const zones = currentMine?.zones || [];

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.triggerSos({
        mineId: currentMine?.id || mineId,
        zoneId: zoneId || (zones[0]?.id || undefined),
        emergencyType: selectedType,
        workerIdentifier: user ? `${user.name} (${user.badgeNumber || 'Crew ID'})` : 'ANONYMOUS-MINE-WORKER',
        locationNotes,
      });

      setSuccessEvent(res.alert);
      if (onTriggered) onTriggered(res.alert.id);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger emergency alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setSuccessEvent(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-red-500/60 rounded-2xl shadow-glow-danger overflow-hidden">
        {/* Pulsing Alert Banner Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 via-rose-700 to-red-600 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-red-950/80 rounded-lg animate-pulse-fast">
              <AlertOctagon className="w-6 h-6 text-red-300" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-wide uppercase">🚨 Emergency SOS Dispatch</h2>
              <p className="text-xs text-red-100 font-medium">
                Immediate Broadcast to Surface Control Room & Rescue Teams
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successEvent ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-bounce">
              <AlertTriangle className="w-9 h-9 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-red-400">EMERGENCY BROADCAST ACTIVE</h3>
            <p className="text-slate-300 text-sm max-w-md mx-auto">
              Alert Reference: <span className="font-mono text-cyan-400 font-bold">{successEvent.id}</span>
              <br />
              Rescue responders, shift supervisor, and medical triage have been notified.
            </p>
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-1">
              <div>Mine: {currentMine?.name}</div>
              <div>Type: {successEvent.emergencyType}</div>
              <div>Status: {successEvent.status}</div>
              <div>Timestamp: {new Date(successEvent.triggeredAt).toLocaleTimeString()}</div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30"
            >
              Return to Platform / View Control Room
            </button>
          </div>
        ) : (
          <form onSubmit={handleTrigger} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Select Emergency Hazard Category
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {EMERGENCY_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedType(t.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-red-500 bg-red-950/40 text-red-200 ring-2 ring-red-500/50'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-red-400' : 'text-slate-400'}`} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Mine Complex
                </label>
                <select
                  value={mineId}
                  onChange={(e) => {
                    setMineId(e.target.value);
                    setZoneId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-red-500"
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
                  Zone / Undergound Section
                </label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-red-500"
                >
                  <option value="">Select Zone / Section</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.depthLevel})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Additional Landmark / Crew Location Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Near Haulage Incline 3, 2 miners trapped near refuge door"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>
                Activating this SOS will immediately sound audible visual klaxons in the mine's main surface control
                room and record an immutable event in the tamper-evident audit ledger.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-red-600/40 flex items-center justify-center gap-2"
              >
                <AlertOctagon className="w-5 h-5 animate-pulse-fast" />
                {isSubmitting ? 'DISPATCHING ALERT...' : 'TRANSMIT EMERGENCY SOS NOW'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
