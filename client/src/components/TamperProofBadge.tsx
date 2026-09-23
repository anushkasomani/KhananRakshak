import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TamperProofBadgeProps {
  hash?: string | null;
  recordId?: string;
  truncate?: boolean;
}

export const TamperProofBadge: React.FC<TamperProofBadgeProps> = ({
  hash,
  recordId,
  truncate = true,
}) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const displayHash = hash
    ? truncate
      ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
      : hash
    : 'GENESIS-BLOCK';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hash) {
      navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerifyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recordId) {
      navigate(`/audit-verification?recordId=${encodeURIComponent(recordId)}`);
    } else {
      navigate('/audit-verification');
    }
  };

  return (
    <div
      onClick={handleVerifyClick}
      title="Click to cryptographically verify in Audit Ledger"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-mono cursor-pointer transition-all hover:bg-cyan-950/20 group"
    >
      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
      <span className="font-semibold text-slate-300">SHA-256:</span>
      <span className="text-cyan-400 font-mono tracking-tight">{displayHash}</span>
      <button
        onClick={handleCopy}
        className="ml-1 p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-200"
        title="Copy full cryptographic hash"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors ml-0.5" />
    </div>
  );
};
