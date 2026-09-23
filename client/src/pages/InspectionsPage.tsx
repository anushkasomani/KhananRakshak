import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  ShieldCheck,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';
import { Inspection, Mine } from '../types';
import { StatusPill } from '../components/StatusPill';
import { TamperProofBadge } from '../components/TamperProofBadge';

interface InspectionsPageProps {
  mines: Mine[];
}

export const InspectionsPage: React.FC<InspectionsPageProps> = ({ mines }) => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  useEffect(() => {
    const fetchIns = async () => {
      try {
        const data = await api.getInspections();
        setInspections(data);
        if (data.length > 0) setSelectedInspection(data[0]);
      } catch (e) {
        console.error('Error fetching inspections:', e);
      }
    };
    fetchIns();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-6 h-6 text-teal-400" />
            <h1 className="text-2xl font-bold text-slate-100">
              Statutory Mine Inspections & DGMS Audits
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Mandatory DGMS Coal Mines Regulations 2017 Inspection Logs • Checklists & Cryptographic Verification
          </p>
        </div>

        <div className="text-xs font-mono text-cyan-400 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
          Total Completed: {inspections.filter(i => i.status === 'COMPLETED').length} Audits
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Inspections List */}
        <div className="lg:col-span-2 cyber-card p-6 space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-bold">
            Inspection Records ({inspections.length})
          </h2>

          <div className="divide-y divide-slate-800">
            {inspections.map((ins) => {
              const isSelected = selectedInspection?.id === ins.id;
              return (
                <div
                  key={ins.id}
                  onClick={() => setSelectedInspection(ins)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-850 border border-teal-500/40 shadow-glow-cyan/10'
                      : 'hover:bg-slate-850/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-100">{ins.id}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {ins.inspectionType.replace(/_/g, ' ')}
                      </span>
                      <StatusPill status={ins.status} size="sm" />
                    </div>
                    <TamperProofBadge hash={ins.recordHash} recordId={ins.id} />
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 mb-2">{ins.findings}</p>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-4">
                    <span>Mine: {ins.mine.name}</span>
                    <span>Inspector: {ins.inspectorName}</span>
                    <span>Violations Flagged: <strong className={ins.violationsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>{ins.violationsCount}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspection Details & Checklist */}
        <div>
          {selectedInspection ? (
            <div className="cyber-card p-6 space-y-5 border-teal-500/30">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-slate-500">INSPECTION DOSSIER</span>
                  <div className="font-mono text-base font-bold text-slate-100">
                    {selectedInspection.id}
                  </div>
                </div>
                <StatusPill status={selectedInspection.status} size="md" />
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Colliery Site:</span>
                  <span className="text-slate-200">{selectedInspection.mine.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">DGMS Inspector:</span>
                  <span className="text-teal-300 font-bold">{selectedInspection.inspectorName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-500">Type:</span>
                  <span className="text-slate-200">{selectedInspection.inspectionType.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Date Logged:</span>
                  <span className="text-slate-400">{new Date(selectedInspection.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Findings */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Inspector Findings
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedInspection.findings}
                </p>
              </div>

              {/* Checklist Criteria */}
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
                  Statutory Checklist Items
                </div>
                <div className="space-y-2">
                  {selectedInspection.checklist?.map((chk, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-start gap-2.5"
                    >
                      {chk.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className={chk.passed ? 'text-slate-300' : 'text-amber-300 font-semibold'}>
                          {chk.item}
                        </div>
                        {chk.note && (
                          <div className="text-[11px] text-amber-400/80 mt-0.5">
                            Notice: {chk.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="cyber-card p-12 text-center text-slate-500 text-xs">
              Select an inspection to view full checklist and findings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
