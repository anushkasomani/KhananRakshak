import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileKey2,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Cpu,
  Layers,
  Link as LinkIcon,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { AuditBlock } from '../types';

export const AuditVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [searchId, setSearchId] = useState(searchParams.get('recordId') || 'INS-2026-00071');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Tamper Simulation State
  const [tamperStatus, setTamperStatus] = useState<string | null>(null);
  const [isTampering, setIsTampering] = useState(false);

  const loadBlocks = async () => {
    try {
      const data = await api.getAuditBlocks();
      setBlocks(data);
    } catch (e) {
      console.error('Error fetching audit blocks:', e);
    }
  };

  const handleVerify = async (recordIdToVerify?: string) => {
    const id = recordIdToVerify || searchId;
    if (!id.trim()) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyRecordIntegrity(id.trim());
      setVerificationResult(res);
    } catch (e) {
      console.error('Verification error:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    loadBlocks();
    if (searchId) {
      handleVerify(searchId);
    }
  }, []);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleSimulateTamper = async () => {
    setIsTampering(true);
    setTamperStatus(null);
    try {
      const res = await api.simulateTamper(2);
      setTamperStatus(res.message);
      await loadBlocks();
      await handleVerify();
    } catch (err: any) {
      alert(err.message || 'Error simulating tamper');
    } finally {
      setIsTampering(false);
    }
  };

  const handleRepairChain = async () => {
    setIsTampering(true);
    try {
      const res = await api.repairAuditChain();
      setTamperStatus(res.message);
      await loadBlocks();
      await handleVerify();
    } catch (err: any) {
      alert(err.message || 'Error repairing chain');
    } finally {
      setIsTampering(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-glow-emerald/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400">
              <FileKey2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-100">
              Tamper-Evident Audit Verification Architecture
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              USP 3
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Every inspection finding, hazard report, corrective action, and grievance is sealed into an immutable
            SHA-256 cryptographic chain. Test record integrity or simulate unauthorized tampering below.
          </p>
          <div className="mt-2 text-[11px] font-mono text-cyan-400">
            Designation: Tamper-Evident Cryptographic Architecture (Blockchain-Ready Ledger)
          </div>
        </div>

        {/* Demo Simulation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSimulateTamper}
            disabled={isTampering}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/50 border border-red-500/50 text-red-300 font-bold text-xs rounded-xl transition-all shadow-glow-danger/20 flex items-center gap-1.5"
            title="Demonstrate how unauthorized database alteration triggers verification failure"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>Simulate DB Tamper</span>
          </button>

          <button
            onClick={handleRepairChain}
            disabled={isTampering}
            className="px-4 py-2 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/50 text-emerald-300 font-bold text-xs rounded-xl transition-all shadow-glow-emerald/20 flex items-center gap-1.5"
            title="Restore and re-seal cryptographic chain"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Re-Seal Ledger</span>
          </button>
        </div>
      </div>

      {tamperStatus && (
        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 text-xs font-mono text-amber-300 flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{tamperStatus}</span>
        </div>
      )}

      {/* Verification Query Tool */}
      <div className="cyber-card p-6 border-cyan-500/30">
        <h2 className="text-sm font-mono uppercase tracking-wider text-cyan-400 font-bold mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" />
          Inspect & Validate Specific Record Hash
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Enter Record ID e.g. INS-2026-00071, SAFE-2026-00124, GRV-2026-8F4A21"
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 uppercase focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={isVerifying}
            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-glow-cyan/50"
          >
            {isVerifying ? 'Verifying Hashes...' : 'Cryptographic Integrity Check'}
          </button>
        </form>

        {/* Preset Sample Quick Links */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>Quick Samples:</span>
          {['INS-2026-00071', 'SAFE-2026-00124', 'GRV-2026-8F4A21'].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSearchId(id);
                handleVerify(id);
              }}
              className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 font-mono"
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Result Display */}
      {verificationResult && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-fadeIn ${
            verificationResult.verified
              ? 'bg-emerald-950/20 border-emerald-500/50 shadow-glow-emerald/20'
              : 'bg-red-950/30 border-red-500/60 shadow-glow-danger/30'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {verificationResult.verified ? (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-400 text-red-400 animate-pulse-fast">
                  <ShieldAlert className="w-8 h-8" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold font-mono tracking-wide">
                  {verificationResult.verified ? (
                    <span className="text-emerald-400">✓ Record Integrity Verified</span>
                  ) : (
                    <span className="text-red-400">⚠ Integrity Verification Failed</span>
                  )}
                </h3>
                <p className="text-xs text-slate-300">
                  Target: <span className="font-mono text-cyan-400 font-bold">{verificationResult.recordId}</span>{' '}
                  • Ledger Length: <span className="font-mono text-slate-100">{verificationResult.chainLength} Blocks</span>
                </p>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 text-right">
              <div>Chain Linkage: {verificationResult.chainIntact ? '100% INTACT' : 'COMPROMISED'}</div>
              <div className="text-[10px] text-slate-500">Algorithm: SHA-256 Recursive</div>
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-500 text-[10px] uppercase">Sealed Block Hash (Current)</div>
              <div className="text-cyan-400 text-xs break-all">{verificationResult.currentHash || 'N/A'}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-slate-500 text-[10px] uppercase">Previous Block Link Hash</div>
              <div className="text-slate-400 text-xs break-all">{verificationResult.previousHash || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Chained Ledger Block Explorer */}
      <div className="cyber-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Cryptographic Audit Chain Block Explorer
            </h2>
            <p className="text-xs text-slate-400">
              Chained ledger blocks with SHA-256 cryptographic linkage: Block[N].prevHash == Block[N-1].currentHash
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
            {blocks.length} Sealed Blocks
          </span>
        </div>

        <div className="space-y-3">
          {blocks.map((block) => {
            return (
              <div
                key={block.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                      BLOCK #{block.blockIndex}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {block.recordType} [{block.recordId}]
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {block.action}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(block.timestamp).toLocaleString()} • {block.performedByRole}
                  </span>
                </div>

                <div className="text-xs text-slate-300 font-sans">
                  {block.payloadSummary}
                </div>

                {/* Hashes */}
                <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                  <div className="truncate">
                    <span className="text-slate-500">Prev Hash: </span>
                    <span className="text-slate-400">{block.previousHash.substring(0, 16)}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <span className="text-slate-500">Current Hash: </span>
                      <span className="text-cyan-400 font-bold">{block.currentHash.substring(0, 18)}...</span>
                    </div>
                    <button
                      onClick={() => handleCopy(block.currentHash)}
                      className="p-1 text-slate-500 hover:text-cyan-400"
                      title="Copy full hash"
                    >
                      {copiedHash === block.currentHash ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
