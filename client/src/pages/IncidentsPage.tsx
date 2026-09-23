import React, { useState, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  PlusCircle,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { Incident, Mine } from '../types';
import { StatusPill } from '../components/StatusPill';

interface IncidentsPageProps {
  mines: Mine[];
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({ mines }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    const fetchInc = async () => {
      try {
        const data = await api.getIncidents();
        setIncidents(data);
        if (data.length > 0) setSelectedIncident(data[0]);
      } catch (e) {
        console.error('Error fetching incidents:', e);
      }
    };
    fetchInc();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-6 h-6 text-rose-400" />
            <h1 className="text-2xl font-bold text-slate-100">
              Colliery Incident Records & Root Cause Analysis
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            DGMS CMR 2017 Formal Inquest Documentation • Containment Status & Corrective Coupling
          </p>
        </div>

        <div className="text-xs font-mono text-rose-400 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
          Total Incidents Logged: {incidents.length}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Incidents List */}
        <div className="lg:col-span-2 cyber-card p-6 space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-bold">
            Formal Incident Log ({incidents.length})
          </h2>

          <div className="divide-y divide-slate-800">
            {incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-850 border border-rose-500/40 shadow-glow-danger/10'
                      : 'hover:bg-slate-850/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-100">{inc.id}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {inc.incidentType.replace(/_/g, ' ')}
                      </span>
                      <StatusPill status={inc.severity} size="sm" />
                      <StatusPill status={inc.status} size="sm" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(inc.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2 mb-2 font-medium">{inc.description}</p>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-4 font-mono">
                    <span>Mine: {inc.mine.name}</span>
                    <span>Location: {inc.location}</span>
                    <span>Affected: <strong className={inc.peopleAffected > 0 ? 'text-rose-400' : 'text-slate-400'}>{inc.peopleAffected}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incident Details & Root Cause */}
        <div>
          {selectedIncident ? (
            <div className="cyber-card p-6 space-y-5 border-rose-500/30">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-slate-500">INCIDENT INQUEST</span>
                  <div className="font-mono text-base font-bold text-slate-100">{selectedIncident.id}</div>
                </div>
                <StatusPill status={selectedIncident.status} size="md" />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Description of Incident
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedIncident.description}
                </p>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Type:</span>
                  <span className="text-slate-200">{selectedIncident.incidentType.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Severity:</span>
                  <span className="text-rose-400 font-bold">{selectedIncident.severity}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Colliery / Location:</span>
                  <span className="text-slate-200">{selectedIncident.location}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">People Affected:</span>
                  <span className="text-slate-200">{selectedIncident.peopleAffected} personnel</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Immediate Response:</span>
                  <span className="text-slate-300">{selectedIncident.immediateResponse}</span>
                </div>
                {selectedIncident.rootCause && (
                  <div className="pt-2">
                    <span className="text-slate-500 block mb-1">Root Cause Analysis:</span>
                    <span className="text-amber-300 font-sans block bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-xs">
                      {selectedIncident.rootCause}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="cyber-card p-12 text-center text-slate-500 text-xs">
              Select an incident record to inspect inquest details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
