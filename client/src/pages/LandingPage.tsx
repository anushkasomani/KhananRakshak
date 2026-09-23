import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  FileKey2,
  Trophy,
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Scale,
  HardHat,
  Cpu,
  ChevronRight,
  Flame,
  Lock,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface LandingPageProps {
  onOpenSos: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSos }) => {
  const { switchRole } = useAuth();
  const navigate = useNavigate();

  const handleLaunchRole = async (role: Role) => {
    await switchRole(role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Background Cyber Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden">
        <div className="absolute top-[-100px] left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[100px] right-1/4 w-[450px] h-[450px] bg-amber-500/8 rounded-full blur-[150px]" />
      </div>

      {/* Top Banner */}
      <div className="bg-slate-900/90 border-b border-cyan-500/20 px-4 py-2 text-center text-xs font-mono text-cyan-300 flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>TAMPER-EVIDENT SHA-256 AUDIT ARCHITECTURE • ZERO RECORD LOSS PROTOCOL • DGMS COMPLIANT</span>
      </div>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-slate-300 mb-8 backdrop-blur-md shadow-lg">
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-semibold">
            COALGUARD AI
          </span>
          <span>Next-Generation Coal Mine Safety & Regulatory Oversight</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.15]">
          One Platform for{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Safer, Smarter
          </span>{' '}
          and More{' '}
          <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 bg-clip-text text-transparent">
            Transparent
          </span>{' '}
          Mining
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
          Connecting workers, supervisors, mine managers, corporate executives, and regulatory authorities through
          real-time safety hazard reporting, multi-level anonymous grievances, and cryptographic audit trails.
        </p>

        {/* Hero CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-glow-cyan flex items-center gap-2 group"
          >
            <span>Explore Platform</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/safety-reports"
            className="px-7 py-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-850 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Report a Safety Hazard</span>
          </Link>

          <button
            onClick={onOpenSos}
            className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm tracking-wider uppercase shadow-glow-danger transition-all flex items-center gap-2 animate-pulse-fast"
          >
            <Radio className="w-4 h-4" />
            <span>Emergency SOS</span>
          </button>
        </div>

        {/* Live System Operational Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="text-2xl font-bold font-mono text-cyan-400">94.2%</div>
            <div className="text-xs text-slate-400 font-medium">Colliery Compliance Index</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="text-2xl font-bold font-mono text-emerald-400">100%</div>
            <div className="text-xs text-slate-400 font-medium">Cryptographic Audit Integrity</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="text-2xl font-bold font-mono text-amber-400">&lt; 2.4h</div>
            <div className="text-xs text-slate-400 font-medium">Avg Hazard Response SLA</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <div className="text-2xl font-bold font-mono text-red-400">42 sec</div>
            <div className="text-xs text-slate-400 font-medium">Emergency SOS Dispatch</div>
          </div>
        </div>
      </section>

      {/* Section 1 & 2: The Problem vs Our Solution */}
      <section className="py-20 border-y border-slate-850 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold mb-2">
              Transforming Mining Operations
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              From Fragmented Blind Spots to Unified Real-Time Governance
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* The Old Reality */}
            <div className="p-8 rounded-2xl bg-red-950/15 border border-red-500/25 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/30 text-red-400 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                The Legacy Industry Problem
              </div>
              <h4 className="text-xl font-bold text-slate-200">
                Paper Logs, Retaliation Fears, and Delayed Incident Visibility
              </h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Paper shift reports and disconnected spreadsheets create critical communication lag.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Workers fear supervisor retaliation when reporting unsafe pressure or equipment faults.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Safety logs are vulnerable to post-incident manual alteration and audit tampering.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Corporate executives and DGMS regulators lack instant cross-mine comparative metrics.</span>
                </li>
              </ul>
            </div>

            {/* The CoalGuard Solution */}
            <div className="p-8 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-4 shadow-glow-cyan/10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/30 text-cyan-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                The CoalGuard Digital System
              </div>
              <h4 className="text-xl font-bold text-slate-100">
                One Centralized, Tamper-Evident Platform for Real-Time Action
              </h4>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Instant digital hazard reporting with photo evidence, zones, and severity triage.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Multi-level anonymous grievance reporting with random tracking IDs and escalation SLAs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Tamper-evident SHA-256 cryptographic hash-chain preserving immutable audit history.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Multi-tier dashboards connecting Miners → Safety Officers → Managers → DGMS Regulators.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: The 5 Key USPs Prominently Displayed (Required by Section 35) */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-3">
            CORE DIFFERENTIATORS
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Five Architectural Innovations
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            Engineered specifically to overcome the physical, behavioral, and regulatory realities of coal mining.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 01: Anonymous Grievances */}
          <div className="cyber-card p-6 flex flex-col justify-between group hover:border-cyan-500/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-2xl font-black text-cyan-400/80">01</span>
                <span className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  <Lock className="w-5 h-5" />
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                Anonymous Grievances
              </h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                "Report sensitive workplace issues without fear of retaliation."
              </p>
              <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                <div className="text-cyan-400 font-semibold">Tiered Escalation:</div>
                <div>Miner → Safety Officer → Mine GM → DGMS</div>
                <div className="text-slate-500 pt-1">Sample ID: GRV-2026-8F4A21</div>
              </div>
            </div>
            <Link
              to="/grievances"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              <span>Explore Anonymous Hub</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 02: Incentive-Based Safety */}
          <div className="cyber-card p-6 flex flex-col justify-between group hover:border-amber-500/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-2xl font-black text-amber-400/80">02</span>
                <span className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300">
                  <Trophy className="w-5 h-5" />
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                Incentive-Based Safety
              </h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                "Reward verified proactive safety behavior."
              </p>
              <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                <div className="text-amber-400 font-semibold">Reputation Mechanics:</div>
                <div>+10 Valid Hazard • +20 Early Critical Risk</div>
                <div className="text-slate-500 pt-1">🏆 Safety Champion • 🛡️ Hazard Hunter</div>
              </div>
            </div>
            <Link
              to="/recognition"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              <span>View Leaderboard & Badges</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 03: Tamper-Evident Records */}
          <div className="cyber-card p-6 flex flex-col justify-between group hover:border-emerald-500/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-2xl font-black text-emerald-400/80">03</span>
                <span className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                  <FileKey2 className="w-5 h-5" />
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                Tamper-Evident Records
              </h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                "Create a transparent audit trail for critical records."
              </p>
              <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                <div className="text-emerald-400 font-semibold">Chained SHA-256 Ledger:</div>
                <div className="truncate">Hash = SHA256(prev + data + time)</div>
                <div className="text-emerald-400 pt-1">✓ Record Integrity Verified</div>
              </div>
            </div>
            <Link
              to="/audit-verification"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <span>Test Integrity Verification</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 04: Emergency SOS */}
          <div className="cyber-card p-6 flex flex-col justify-between group hover:border-red-500/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-2xl font-black text-red-400/80">04</span>
                <span className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300">
                  <Flame className="w-5 h-5" />
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-red-300 transition-colors">
                Emergency SOS
              </h3>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                "Trigger an immediate emergency response from the web platform."
              </p>
              <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
                <div className="text-red-400 font-semibold">Rapid Response Cycle:</div>
                <div>Triggered → Acknowledged → Responding</div>
                <div className="text-slate-500 pt-1">Audible & Visual Surface Klaxon</div>
              </div>
            </div>
            <Link
              to="/sos-control"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300"
            >
              <span>Open Control Room Feed</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 05: Future Health Intelligence */}
          <div className="cyber-card p-6 flex flex-col justify-between group hover:border-purple-500/40 md:col-span-2">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-2xl font-black text-purple-400/80">05</span>
                <span className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300">
                  <Activity className="w-5 h-5" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                  Future Health Intelligence
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-900/40 text-purple-300 border border-purple-600/30">
                  FUTURE INTEGRATION ARCHITECTURE
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                "Ready for future wearable-based worker health and underground atmospheric monitoring."
              </p>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                  <div className="text-slate-500 text-[10px]">TELEMETRY 1</div>
                  <div className="text-purple-300 font-semibold">Heart Rate</div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                  <div className="text-slate-500 text-[10px]">TELEMETRY 2</div>
                  <div className="text-purple-300 font-semibold">Fatigue Level</div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                  <div className="text-slate-500 text-[10px]">TELEMETRY 3</div>
                  <div className="text-purple-300 font-semibold">Gas Exposure</div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                  <div className="text-slate-500 text-[10px]">TELEMETRY 4</div>
                  <div className="text-purple-300 font-semibold">Temperature</div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center col-span-2 sm:col-span-1">
                  <div className="text-slate-500 text-[10px]">TELEMETRY 5</div>
                  <div className="text-purple-300 font-semibold">Beacon Zone</div>
                </div>
              </div>
            </div>
            <Link
              to="/future-health"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
            >
              <span>Inspect Architecture Blueprint</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 4: Operational Workflow Diagram */}
      <section className="py-20 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold mb-2">
            The Complete Operational Loop
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-2xl mx-auto">
            REPORT → VERIFY → RESPOND → ESCALATE → RESOLVE → AUDIT
          </h3>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
            Every hazard, grievance, and statutory inspection transitions through guaranteed accountability checkpoints.
          </p>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-6 gap-3 text-left">
            {[
              { step: '01', title: 'REPORT', desc: 'Miner logs hazard or confidential grievance', color: 'border-cyan-500/40 text-cyan-400' },
              { step: '02', title: 'VERIFY', desc: 'Safety officer validates severity & assigns team', color: 'border-teal-500/40 text-teal-400' },
              { step: '03', title: 'RESPOND', desc: 'Corrective action created with statutory SLA', color: 'border-amber-500/40 text-amber-400' },
              { step: '04', title: 'ESCALATE', desc: 'Auto-escalates to Colliery GM if deadline breached', color: 'border-orange-500/40 text-orange-400' },
              { step: '05', title: 'RESOLVE', desc: 'Field evidence validated, worker rewarded points', color: 'border-emerald-500/40 text-emerald-400' },
              { step: '06', title: 'AUDIT', desc: 'Cryptographically sealed in SHA-256 ledger for DGMS', color: 'border-blue-500/40 text-blue-400' },
            ].map((s) => (
              <div key={s.step} className={`p-4 rounded-xl bg-slate-950/80 border ${s.color} space-y-1`}>
                <div className="font-mono text-xs font-bold text-slate-500">{s.step}</div>
                <div className="font-bold text-sm text-slate-100">{s.title}</div>
                <div className="text-xs text-slate-400 leading-snug">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stakeholders Section: 6 Personas Fast-Launch */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-3">
            ROLE-BASED DEMO PORTALS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Designed for Every Mining Stakeholder
          </h2>
          <p className="mt-3 text-slate-400 text-sm">
            Click any stakeholder below to immediately launch the dashboard in that authenticated persona.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { role: 'WORKER' as Role, title: 'Coal Miner', icon: '👷', desc: 'Report physical hazards, submit anonymous grievances, trigger SOS, earn safety points.' },
            { role: 'SAFETY_OFFICER' as Role, title: 'Safety Officer', icon: '🛡️', desc: 'Review hazard tickets, conduct shift inspections, assign corrective actions, handle SOS.' },
            { role: 'MINE_MANAGER' as Role, title: 'Mine General Manager', icon: '🏢', desc: 'Monitor colliery compliance score, manage overdue SLA actions, approve escalations.' },
            { role: 'CORPORATE_ADMIN' as Role, title: 'Corporate ESG & HQ', icon: '🌐', desc: 'Benchmark multiple mines, cross-compare compliance trends, oversee ESG metrics.' },
            { role: 'REGULATOR' as Role, title: 'DGMS Inspector', icon: '⚖️', desc: 'Verify tamper-evident hash ledger, audit statutory inspections, inspect violations.' },
            { role: 'SYSTEM_ADMIN' as Role, title: 'System Administrator', icon: '⚙️', desc: 'Configure mine zones, manage role privileges, maintain cryptographic ledger nodes.' },
          ].map((item) => (
            <div
              key={item.role}
              onClick={() => handleLaunchRole(item.role)}
              className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all hover:bg-slate-850 group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Launch Persona <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                {item.title}
              </h4>
              <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-850 py-12 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-slate-300">MineSafe AI (CoalGuard)</span>
            <span>• Full-Stack Coal Mine Safety & Regulatory Oversight Web Platform</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>DGMS Coal Mines Regulations 2017</span>
            <span>SHA-256 Ledger: VERIFIED</span>
            <Link to="/audit-verification" className="text-cyan-400 hover:underline">
              Ledger Explorer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
