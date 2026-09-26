/**
 * AI Mine Intelligence — the command-centre view over the simulated IoT network.
 *
 * Flow, top to bottom: live sensors → risk engine → risk trend graph → risky zones
 * → historical RAG → AI explanation → alert / escalation.
 *
 * This file renders. It computes no risk of its own: scores, bands, alerts and
 * retrieval all come from services/mine-intel, so the colour a number is drawn in
 * always agrees with the band the engine put it in.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BellRing, ChevronDown, Database,
  Droplets, FileSearch, Gauge, Layers, Mountain, Pause, Play, RadioTower,
  Send, Wind,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { PageHeader, Section } from '../../components/ui';
import { Mine } from '../../types';
import {
  MonitoredZone, SENSOR_GROUP_LABELS, SensorGroup, SensorReading, sensorSpec,
} from '../../services/mine-intel/sensorSimulator';
import {
  COMPONENT_LABELS, RISK_COMPONENTS, RISK_WEIGHTS, ZoneRisk,
} from '../../services/mine-intel/riskEngine';
import {
  HIGH_THRESHOLD, MEDIUM_THRESHOLD, RISK_STYLES, RiskLevel, styleFor,
} from '../../services/mine-intel/riskLevels';
import { ZoneAlert, notifyLabel } from '../../services/mine-intel/alertService';
import { RetrievedDocument } from '../../services/mine-intel/ragService';
import { QueryAnswer, ZoneAnalysis, answerQuestion } from '../../services/mine-intel/analysisService';
import {
  INTERVAL_OPTIONS, TRACKED_SENSORS, useMineIntelligence,
} from '../../services/mine-intel/useMineIntelligence';

type Props = { mines: Mine[] };

const clockTime = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const preciseTime = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const agoText = (at: number, now: number) => {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min ago`;
};

/** Ticks once a second purely so "updated N sec ago" stays honest between simulation ticks. */
const useNow = (enabled: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);
  return now;
};

const GROUP_ICONS: Record<SensorGroup, React.ElementType> = {
  GAS: Wind,
  WATER: Droplets,
  GROUND: Mountain,
  VENTILATION: Activity,
  WEATHER: Gauge,
};

/** Each icon drifts along the axis its instruments read. Defined in index.css. */
const GROUP_MOTION: Record<SensorGroup, string> = {
  GAS: 'sensor-icon-x',
  WATER: 'sensor-icon-y',
  GROUND: 'sensor-icon-y',
  VENTILATION: 'sensor-icon-x',
  WEATHER: 'sensor-icon-sweep',
};

const RiskPill: React.FC<{ score: number; className?: string }> = ({ score, className = '' }) => {
  const style = styleFor(score);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide ${style.surface} ${style.text} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
};

const TrendMark: React.FC<{ sensor: SensorReading }> = ({ sensor }) => {
  if (sensor.display) return null;
  const decimals = Math.max(sensorSpec(sensor.key).decimals, 1);
  const Icon = sensor.trend === 'UP' ? ArrowUpRight : sensor.trend === 'DOWN' ? ArrowDownRight : ArrowRight;
  const tone = sensor.trend === 'FLAT' ? 'text-zinc-500' : sensor.trend === 'UP' ? 'text-amber-400' : 'text-sky-400';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs tabular-nums ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {sensor.delta > 0 ? '+' : ''}{sensor.delta.toFixed(decimals)}
    </span>
  );
};

/**
 * One reading. The status band is carried by the left edge and the value's colour
 * rather than by a separate labelled row, which keeps the card to three short lines
 * without losing the green / amber / red signal.
 */
const SensorCard: React.FC<{ sensor: SensorReading; now: number }> = ({ sensor, now }) => {
  const style = styleFor(sensor.severity);
  return (
    <div
      className={`min-w-0 rounded-lg border border-l-2 bg-white/[0.02] px-2.5 py-2 ${style.surface}`}
      title={`${sensor.label} · ${style.label} · updated ${agoText(sensor.updatedAt, now)}`}
    >
      <p className="truncate text-[10px] uppercase tracking-wide text-zinc-500">{sensor.label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-1.5">
        <p className={`truncate text-base font-semibold tabular-nums ${style.text}`}>
          {sensor.display ?? sensor.value}
          {!sensor.display && sensor.unit && <span className="ml-0.5 text-[10px] font-normal text-zinc-500">{sensor.unit}</span>}
        </p>
        <TrendMark sensor={sensor} />
      </div>
    </div>
  );
};

/** Shared tooltip so every chart on the page reads the same way. */
const chartTooltip = {
  contentStyle: { background: '#18181b', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#a1a1aa' },
};

const EvidenceCard: React.FC<{ hit: RetrievedDocument; onOpen: () => void }> = ({ hit, onOpen }) => (
  <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm text-zinc-200">{hit.document.title}</p>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          <span className="font-mono">{hit.document.id}</span> · {hit.document.source} · {hit.document.date}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-500/[0.08] px-2 py-0.5 text-[11px] text-sky-300">
        {hit.similarity}% similarity
      </span>
    </div>
    <button className="mt-2 text-xs text-sky-400 hover:underline" onClick={onOpen}>View evidence</button>
  </div>
);

export const MineIntelligencePage: React.FC<Props> = ({ mines }) => {
  const [mineId, setMineId] = useState('');
  // Fall back to the first mine until the list loads, so the page never monitors nothing.
  const selectedMine = mines.find((mine) => mine.id === mineId) ?? mines[0];

  // The mine's own districts are the monitored zones. A mine with none recorded still
  // gets one entry, so the simulation has something to report against rather than
  // rendering an empty board.
  const monitoredZones: MonitoredZone[] = useMemo(() => {
    const districts = selectedMine?.districts ?? [];
    if (districts.length) {
      return districts.map((district) => ({ id: district.id, name: district.name, location: district.location }));
    }
    return selectedMine
      ? [{ id: `${selectedMine.id}-mine-wide`, name: 'Mine-wide', location: selectedMine.locality }]
      : [];
  }, [selectedMine]);

  // HIGH-risk escalation is always on: a district past 70 raises an SOS to its workers
  // without anybody arming anything. This toggle governs only the MEDIUM path, which
  // asks a Sirdar to approve before workers hear anything — so it is a human-approval
  // switch, not a master gate.
  const [mediumApproval, setMediumApproval] = useState(false);
  // Jharia is the walkthrough mine: its leading district is held above the HIGH
  // threshold so the automatic-SOS path can be shown without waiting for a climb.
  // Matched on locality, which the mine record carries, rather than on a hardcoded id.
  const alwaysCritical = /jharia/i.test(`${selectedMine?.locality ?? ''} ${selectedMine?.name ?? ''}`);
  // Memoised: the hook keys its network on these options, so a fresh object each
  // render would rebuild the simulation on every tick.
  const networkOptions = useMemo(() => ({ alwaysCritical }), [alwaysCritical]);
  const intel = useMineIntelligence(
    monitoredZones,
    selectedMine?.id,
    networkOptions,
    mediumApproval,
  );
  const now = useNow(intel.running);

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [openDocument, setOpenDocument] = useState<RetrievedDocument | null>(null);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<QueryAnswer | null>(null);

  // The worst zone leads the page until someone picks another one.
  const focusZone: ZoneRisk | undefined = useMemo(
    () => intel.risks.find((risk) => risk.zoneId === selectedZoneId) ?? intel.zonesByRisk[0],
    [intel.risks, intel.zonesByRisk, selectedZoneId],
  );
  const focusReading = intel.readings.find((reading) => reading.zoneId === focusZone?.zoneId);
  const focusAnalysis: ZoneAnalysis | undefined = focusZone ? intel.analyses[focusZone.zoneId] : undefined;

  const mineStyle = styleFor(intel.mineScore);
  const mineName = mines[0]?.name;

  const riskSeries = useMemo(
    () => intel.history.map((point) => ({
      at: point.at,
      time: clockTime(point.at),
      mine: point.mine,
      zone: focusZone ? point.zones[focusZone.zoneId] ?? null : null,
    })),
    [intel.history, focusZone],
  );

  const sensorSeries = useMemo(() => {
    if (!focusZone) return [];
    const zoneHistory = intel.sensorHistory[focusZone.zoneId] ?? {};
    return TRACKED_SENSORS.map((key) => {
      const points = zoneHistory[key] ?? [];
      const spec = sensorSpec(key);
      return {
        key,
        label: spec.label,
        unit: spec.unit,
        data: points.map((point) => ({ time: clockTime(point.at), value: point.value })),
        current: focusReading?.sensors[key],
      };
    }).filter((series) => series.data.length > 1);
  }, [focusZone, focusReading, intel.sensorHistory]);

  const suggestions = [
    focusZone ? `Why is ${focusZone.zoneName} at risk?` : 'Why is this mine at risk?',
    'Have similar incidents happened before?',
    'Should we evacuate?',
    'Which districts require inspection?',
    'Who gets notified when risk is high?',
    'How is the risk score calculated?',
  ];

  // Districts above the monitoring band, worst first, each with whatever the server
  // reported back for it. An outcome can lag the reading by one request, so the row
  // distinguishes "not reported" from "reporting…" rather than implying either.
  const escalated = useMemo(
    () => intel.zonesByRisk
      .filter((zone) => zone.level !== 'LOW')
      .map((zone) => ({ zone, outcome: intel.outcomes[zone.zoneId] })),
    [intel.zonesByRisk, intel.outcomes],
  );

  const ask = (text: string) => {
    if (!text.trim()) return;
    setAnswer(answerQuestion(text.trim(), intel.risks, intel.analyses, intel.readings));
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="AI Mine Intelligence"
        description="Real-time mine monitoring, historical hazard intelligence and AI-powered risk assessment"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <select
              className="input h-9 w-auto max-w-[15rem] text-sm"
              value={selectedMine?.id ?? ''}
              onChange={(event) => { setMineId(event.target.value); setSelectedZoneId(null); }}
            >
              {mines.map((mine) => <option key={mine.id} value={mine.id}>{mine.name}</option>)}
            </select>
            <div className="text-right">
              <p className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-emerald-400">
                <span className={`h-2 w-2 rounded-full bg-emerald-400 ${intel.running ? 'animate-pulse' : 'opacity-40'}`} />
                {intel.running ? 'LIVE SIMULATION' : 'SIMULATION PAUSED'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Last updated: {agoText(intel.lastTickAt, now)}</p>
            </div>
          </div>
        }
      />

      {/* ── Critical alert ─────────────────────────────────────────────── */}
      {intel.activeAlert && <CriticalAlert
        alert={intel.activeAlert}
        onAcknowledge={() => intel.acknowledge(intel.activeAlert!.id)}
        onViewZone={() => setSelectedZoneId(intel.activeAlert!.zoneId)}
        onViewEvidence={() => {
          setSelectedZoneId(intel.activeAlert!.zoneId);
          const hit = intel.analyses[intel.activeAlert!.zoneId]?.evidence[0];
          if (hit) setOpenDocument(hit);
        }}
      />}

      {/* ── Escalation ─────────────────────────────────────────────────── */}
      <Section
        title="Automatic escalation"
        action={
          <button
            className={mediumApproval ? 'btn-danger h-8 px-3 text-xs' : 'btn-secondary h-8 px-3 text-xs'}
            onClick={() => setMediumApproval((on) => !on)}
            title="Whether medium-risk districts are sent to a Sirdar to approve"
          >
            {mediumApproval ? 'Stop approval requests' : 'Enable approval requests'}
          </button>
        }
      >
        {/* What actually happened, per district — not the rules that produced it. A
            district is listed once it is elevated, with the outcome the server
            reported back, so this reads as a record rather than a policy statement. */}
        <div className="card divide-y divide-white/[0.06]">
          {escalated.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">
              No district is above the monitoring band. Nothing has been sent.
            </p>
          ) : (
            escalated.map(({ zone, outcome }) => {
              const style = styleFor(zone.overall);
              const sent = outcome?.action === 'SOS_RAISED';
              const pending = outcome?.action === 'APPROVAL_PENDING';
              return (
                <div key={zone.zoneId} className="flex flex-wrap items-start justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200">
                      {zone.zoneName}
                      <span className={`ml-2 tabular-nums ${style.text}`}>{zone.overall}</span>
                      <span className="ml-1.5 text-xs text-zinc-500">{style.label}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{zone.primaryHazard}</p>
                  </div>
                  <div className="min-w-0 text-right">
                    {sent && (
                      <>
                        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-red-300">
                          <BellRing className="h-3.5 w-3.5" />Automatic SOS sent
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          <span className="font-mono">{outcome!.sosId}</span> · {outcome!.notified} notified ·
                          workers and Sirdars
                        </p>
                      </>
                    )}
                    {pending && (
                      <>
                        <p className="text-sm font-medium text-amber-300">Awaiting Sirdar approval</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {outcome!.notified} Sirdar{outcome!.notified === 1 ? '' : 's'} asked · no worker alerted yet
                        </p>
                      </>
                    )}
                    {outcome?.action === 'SUPPRESSED' && (
                      <>
                        <p className="text-sm text-zinc-400">Already raised</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{outcome.reason}</p>
                      </>
                    )}
                    {!outcome && zone.level === 'MEDIUM' && !mediumApproval && (
                      <>
                        <p className="text-sm text-zinc-400">Not reported</p>
                        <p className="mt-0.5 text-xs text-zinc-500">Approval requests are switched off</p>
                      </>
                    )}
                    {!outcome && !(zone.level === 'MEDIUM' && !mediumApproval) && (
                      <p className="text-sm text-zinc-500">Reporting…</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {intel.escalationError && (
            <p className="p-3.5 text-xs text-red-300">{intel.escalationError}</p>
          )}
        </div>
      </Section>

      {/* ── Feed controls ─────────────────────────────────────────────── */}
      {/* Time only. There is deliberately no way to switch a district's hazard from
          here: each district carries its own, and forcing one scenario across the mine
          would rewrite sensor history into readings the same place could not produce. */}
      <Section title="Sensor feed">
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <p className="text-xs text-zinc-400">
            Districts report every {intel.intervalMs / 1000}s, each following its own hazard profile.
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-zinc-500">
              Interval
              <select
                className="input ml-2 inline-block h-8 w-auto text-xs"
                value={intel.intervalMs}
                onChange={(event) => intel.setIntervalMs(Number(event.target.value))}
              >
                {INTERVAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button className="btn-secondary h-8 px-3 text-xs" onClick={() => intel.setRunning(!intel.running)}>
              {intel.running ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Resume</>}
            </button>
            <button className="btn-secondary h-8 px-3 text-xs" onClick={intel.stepNow} title="Advance exactly one cycle">
              Step
            </button>
          </div>
        </div>
      </Section>

      {/* ── Live sensors ───────────────────────────────────────────────── */}
      <Section
        title="Live mine sensors"
        action={
          <div className="flex items-center gap-2">
            <select
              className="input h-8 w-auto text-xs"
              value={focusZone?.zoneId ?? ''}
              onChange={(event) => setSelectedZoneId(event.target.value)}
            >
              {intel.risks.map((risk) => (
                <option key={risk.zoneId} value={risk.zoneId}>{risk.zoneName} · {risk.overall}</option>
              ))}
            </select>
            {focusZone && <RiskPill score={focusZone.overall} />}
          </div>
        }
      >
        {focusReading && (
          // One card holding all five groups. Separate cards per group cost a lot of
          // vertical space for headings and borders that carry no reading.
          <div className="card divide-y divide-white/[0.05]">
            {(Object.keys(SENSOR_GROUP_LABELS) as SensorGroup[]).map((group) => {
              const sensors = Object.values(focusReading.sensors).filter((sensor) => sensor.group === group);
              const Icon = GROUP_ICONS[group];
              return (
                <div key={group} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4">
                  <p className="inline-flex w-full shrink-0 items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500 sm:w-24">
                    {/* The icon travels inside a fixed box so its drift cannot nudge the
                        label beside it. Still while paused: a frozen feed must not look live. */}
                    <span className="inline-flex h-4 w-5 shrink-0 items-center justify-center overflow-visible">
                      <Icon className={`h-3.5 w-3.5 ${intel.running ? GROUP_MOTION[group] : ''}`} />
                    </span>
                    {SENSOR_GROUP_LABELS[group]}
                  </p>
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {sensors.map((sensor) => <SensorCard key={sensor.key} sensor={sensor} now={now} />)}
                  </div>
                </div>
              );
            })}
            <p className="px-3 py-2 text-[11px] text-zinc-500">
              Simulated readings — no connected hardware. Updated every {intel.intervalMs / 1000}s.
            </p>
          </div>
        )}
      </Section>

      {/* ── Main risk analysis graph ───────────────────────────────────── */}
      <Section title="Mine risk analysis">
        <div className="card p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-wide text-zinc-500">CURRENT RISK SCORE</p>
              <p className={`mt-1 text-4xl font-semibold tabular-nums ${mineStyle.text}`}>
                {intel.mineScore}<span className="text-lg font-normal text-zinc-600"> / 100</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Highest scoring zone across the mine · {intel.zonesByRisk[0]?.zoneName}
              </p>
            </div>
            <RiskPill score={intel.mineScore} className="px-3 py-1.5 text-xs" />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Risk trend — last {Math.round((intel.history.length * intel.intervalMs) / 60000) || 1} minutes</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
              {(['HIGH', 'MEDIUM', 'LOW'] as RiskLevel[]).map((level) => (
                <span key={level} className="inline-flex items-center gap-1.5">
                  <i className={`inline-block h-2 w-2 rounded-sm ${RISK_STYLES[level].dot}`} />
                  {level === 'HIGH' ? '70–100 HIGH' : level === 'MEDIUM' ? '40–69 MEDIUM' : '0–39 LOW'}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskSeries} margin={{ top: 8, right: 16, left: -20, bottom: 4 }}>
                {/* The three bands are drawn as faint tints so the risk line stays the
                    brightest thing on the chart. */}
                <ReferenceArea y1={0} y2={MEDIUM_THRESHOLD} fill={RISK_STYLES.LOW.hex} fillOpacity={0.07} />
                <ReferenceArea y1={MEDIUM_THRESHOLD} y2={HIGH_THRESHOLD} fill={RISK_STYLES.MEDIUM.hex} fillOpacity={0.08} />
                <ReferenceArea y1={HIGH_THRESHOLD} y2={100} fill={RISK_STYLES.HIGH.hex} fillOpacity={0.09} />
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
                <YAxis domain={[0, 100]} ticks={[0, 40, 70, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <ReferenceLine y={HIGH_THRESHOLD} stroke={RISK_STYLES.HIGH.hex} strokeDasharray="4 4" strokeOpacity={0.7}
                  label={{ value: 'HIGH 70', position: 'insideTopRight', fill: RISK_STYLES.HIGH.hex, fontSize: 10 }} />
                <ReferenceLine y={MEDIUM_THRESHOLD} stroke={RISK_STYLES.MEDIUM.hex} strokeDasharray="4 4" strokeOpacity={0.7}
                  label={{ value: 'MEDIUM 40', position: 'insideTopRight', fill: RISK_STYLES.MEDIUM.hex, fontSize: 10 }} />
                <Tooltip {...chartTooltip} />
                {focusZone && (
                  <Line type="monotone" dataKey="zone" name={focusZone.zoneName} stroke="#38bdf8" strokeWidth={1.5}
                    strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls />
                )}
                <Line
                  type="monotone"
                  dataKey="mine"
                  name="Mine risk"
                  stroke={mineStyle.hex}
                  strokeWidth={2.5}
                  isAnimationActive={false}
                  // The leading point is drawn in its own band's colour, so the moment
                  // the line crosses a threshold is visible without reading the axis.
                  dot={(props: any) => {
                    const last = props.index === riskSeries.length - 1;
                    const style = styleFor(props.payload.mine);
                    return last
                      ? <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill={style.hex} stroke="#09090b" strokeWidth={2} />
                      : <circle key={props.key} cx={props.cx} cy={props.cy} r={2.5} fill={style.hex} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-2 text-[11px] text-zinc-500">
            Solid line: mine risk (worst zone). Dashed line: {focusZone?.zoneName ?? 'selected zone'}. Each point is one
            simulation cycle. Overall risk = {RISK_COMPONENTS.map((component) => `${COMPONENT_LABELS[component]} × ${RISK_WEIGHTS[component]}`).join(' + ')}.
          </p>
        </div>
      </Section>

      {/* ── Individual sensor trends ───────────────────────────────────── */}
      {sensorSeries.length > 0 && (
        <Section title={`Sensor trends · ${focusZone?.zoneName ?? ''}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {sensorSeries.map((series) => {
              const style = series.current ? styleFor(series.current.severity) : RISK_STYLES.LOW;
              return (
                <div key={series.key} className="card min-w-0 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-medium">{series.label}</h3>
                    <p className={`text-sm tabular-nums ${style.text}`}>
                      {series.current?.value}<span className="ml-1 text-[11px] text-zinc-500">{series.unit}</span>
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-500">Own scale — units are not comparable between these charts.</p>
                  <div className="mt-3 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={series.data} margin={{ top: 4, right: 6, left: -26, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`fill-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={style.hex} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={style.hex} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} />
                        <Tooltip {...chartTooltip} />
                        <Area type="monotone" dataKey="value" name={series.label} stroke={style.hex} strokeWidth={2} fill={`url(#fill-${series.key})`} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Districts across, AI analysis beneath ──────────────────────── */}
      {/* Districts read as a row so the board can be compared at a glance, and the
          analysis of the selected one sits directly under it at full width. */}
      <div className="space-y-7">
        <Section title="District risk">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {intel.zonesByRisk.map((zone) => {
              const style = styleFor(zone.overall);
              const selected = zone.zoneId === focusZone?.zoneId;
              const critical = zone.criticalSensors[0];
              return (
                <article
                  key={zone.zoneId}
                  className={`card p-4 transition-colors ${selected ? 'border-sky-400/40' : ''}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium text-zinc-100">{zone.zoneName}</h3>
                      {zone.location && <p className="mt-0.5 truncate text-[11px] text-zinc-600">{zone.location}</p>}
                      <p className="mt-1 text-xs text-zinc-500">Hazard: {zone.primaryHazard}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-semibold tabular-nums ${style.text}`}>{zone.overall}</p>
                      <RiskPill score={zone.overall} className="mt-1" />
                    </div>
                  </div>
                  {/* One column of rows: in a three-up grid each card is too narrow for
                      a label and a value side by side in two columns. */}
                  <dl className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="shrink-0 text-zinc-500">Critical sensor</dt>
                      <dd className="truncate text-zinc-300">{critical?.label ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="shrink-0 text-zinc-500">Reading</dt>
                      <dd className="truncate text-zinc-300">
                        {critical ? (critical.display ?? `${critical.value}${critical.unit && ` ${critical.unit}`}`) : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="shrink-0 text-zinc-500">Last inspection</dt>
                      <dd className="text-zinc-300">{zone.lastInspectionHoursAgo}h ago</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="shrink-0 text-zinc-500">Open issues</dt>
                      <dd className="text-zinc-300">{zone.openIssues}</dd>
                    </div>
                  </dl>
                  <button
                    className="btn-secondary mt-3 h-8 w-full text-xs"
                    onClick={() => setSelectedZoneId(zone.zoneId)}
                  >
                    <Layers className="h-3.5 w-3.5" />{selected ? 'Showing analysis' : 'Analyse district'}
                  </button>
                </article>
              );
            })}
          </div>
        </Section>

        <Section title="AI risk analysis">
          {focusAnalysis && focusZone ? (
            <div className="card overflow-hidden">
              <div className={`border-b border-white/[0.06] p-4 ${styleFor(focusZone.overall).surface}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={`text-sm font-medium ${styleFor(focusZone.overall).text}`}>
                    {focusZone.zoneName} — {styleFor(focusZone.overall).label} RISK
                  </h3>
                  <RiskPill score={focusZone.overall} />
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Why is {focusZone.zoneName} currently at this level? · hazard {focusAnalysis.hazardType}
                </p>
              </div>

              <div className="space-y-5 p-4">
                {/* Current readings and past records sit side by side at this width, which
                    also keeps the two visually separate — a past report must never read
                    as a live measurement. */}
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <h4 className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-sky-300">
                      <RadioTower className="h-3.5 w-3.5" />CURRENT SENSOR DATA
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                      {focusAnalysis.observations.map((observation, index) => <li key={index}>• {observation}</li>)}
                    </ul>
                  </div>

                  <div>
                    <h4 className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-violet-300">
                      <Database className="h-3.5 w-3.5" />HISTORICAL EVIDENCE
                    </h4>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Past reports retrieved for comparison. These are not live readings.
                    </p>
                    {focusAnalysis.evidence.length ? (
                      <>
                        <p className="mt-2 text-xs text-zinc-400">
                          {focusAnalysis.evidenceSummary.retrieved} relevant report{focusAnalysis.evidenceSummary.retrieved === 1 ? '' : 's'} retrieved ·
                          {' '}{focusAnalysis.evidenceSummary.highSeverity} high-severity ·
                          {' '}{focusAnalysis.evidenceSummary.inspections} previous inspection report{focusAnalysis.evidenceSummary.inspections === 1 ? '' : 's'}
                        </p>
                        <div className="mt-2 space-y-2">
                          {focusAnalysis.evidence.map((hit) => (
                            <EvidenceCard key={hit.document.id} hit={hit} onOpen={() => setOpenDocument(hit)} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">
                        No historical report matched this situation closely enough to cite.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 border-t border-white/[0.06] pt-5 lg:grid-cols-2">
                  <div>
                    <h4 className="text-[11px] font-medium tracking-wide text-zinc-500">AI INTERPRETATION</h4>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">{focusAnalysis.interpretation}</p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-medium tracking-wide text-zinc-500">RECOMMENDED ACTION</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-300">
                      {focusAnalysis.recommendedActions.map((action, index) => <li key={index}>{action}</li>)}
                    </ul>
                  </div>
                </div>

                {/* The retrieval path, not the model's reasoning. */}
                <div className="rounded-lg border border-white/[0.07] bg-black/20">
                  <button
                    className="flex w-full items-center justify-between gap-2 p-3 text-left text-xs text-zinc-300"
                    onClick={() => setPipelineOpen((open) => !open)}
                  >
                    <span className="inline-flex items-center gap-1.5"><FileSearch className="h-3.5 w-3.5" />How was this analysis generated?</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${pipelineOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {pipelineOpen && (
                    <div className="border-t border-white/[0.06] p-3">
                      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
                        {[
                          'Current sensor data', 'Risk engine', `Hazard: ${focusAnalysis.hazardType}`,
                          'Historical RAG retrieval', `${focusAnalysis.pipeline.documentsRetrieved} relevant documents`,
                          'Historical evidence', 'AI analysis', 'Recommended action',
                        ].map((step, index, all) => (
                          <li key={step} className="inline-flex items-center gap-2">
                            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">{step}</span>
                            {index < all.length - 1 && <ArrowRight className="h-3 w-3 text-zinc-600" />}
                          </li>
                        ))}
                      </ol>
                      <dl className="mt-3 grid gap-1.5 text-[11px] sm:grid-cols-2">
                        {[
                          ['Documents retrieved', String(focusAnalysis.pipeline.documentsRetrieved)],
                          ['Current data source', focusAnalysis.pipeline.dataSource],
                          ['Knowledge source', focusAnalysis.pipeline.knowledgeSource],
                          ['Risk engine', focusAnalysis.pipeline.engine],
                          ['Last analysis', preciseTime(focusAnalysis.generatedAt)],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-3">
                            <dt className="text-zinc-500">{label}</dt>
                            <dd className="truncate text-zinc-300">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-2 text-[11px] text-zinc-500">
                        This is the retrieval and data path only — it is the auditable pipeline, not the model's reasoning.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-5 text-sm text-zinc-500">Waiting for the first sensor cycle.</div>
          )}
        </Section>
      </div>

      {/* ── Historical hazard intelligence ─────────────────────────────── */}
      <Section title="Historical hazard intelligence">
        <div className="card p-4">
          <p className="text-xs text-zinc-500">
            Retrieved from the historical hazard corpus for {focusZone?.zoneName ?? 'the selected zone'} ·
            hazard {focusAnalysis?.hazardType ?? '—'}. Ranked by similarity to the current situation. These records
            describe past events and carry no statutory force.
          </p>
          {focusAnalysis?.evidence.length ? (
            <div className="mt-3 divide-y divide-white/[0.06]">
              {focusAnalysis.evidence.map((hit) => (
                <div key={hit.document.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200">
                      <span className="font-mono text-xs text-zinc-400">{hit.document.id}</span> · {hit.document.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {hit.document.source} · {hit.document.recordedAt} · {hit.document.date} · {hit.document.severity} severity
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-600">Matched on {hit.matchedOn.join(' · ')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm tabular-nums text-sky-300">{hit.similarity}%</span>
                    <button className="btn-secondary h-8 px-3 text-xs" onClick={() => setOpenDocument(hit)}>View evidence</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No historical report matched this zone's current hazard profile.</p>
          )}
        </div>
      </Section>

      {/* ── Query box ──────────────────────────────────────────────────── */}
      <Section title="Ask Mine Intelligence">
        <div className="card p-4">
          <p className="text-xs text-zinc-500">
            Answers combine the current simulated sensor state with retrieved historical reports. Current readings and
            past records are labelled separately and never merged.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                onClick={() => { setQuestion(suggestion); ask(suggestion); }}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="input flex-1"
              placeholder="Ask about current risks, historical incidents, safety procedures..."
              value={question}
              maxLength={300}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') ask(question); }}
            />
            <button className="btn-primary" disabled={!question.trim()} onClick={() => ask(question)}>
              <Send className="h-4 w-4" />Ask
            </button>
          </div>

          {answer && (
            <article className="mt-4 rounded-lg border border-white/[0.07] bg-black/20 p-4">
              <p className="text-xs text-zinc-500">Asked {preciseTime(answer.answeredAt)}</p>
              <p className="mt-1 text-sm font-medium text-zinc-200">{answer.question}</p>

              {answer.currentContext.length > 0 && (
                <div className="mt-3">
                  <h4 className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-sky-300">
                    <RadioTower className="h-3.5 w-3.5" />CURRENT SENSOR CONTEXT
                  </h4>
                  <ul className="mt-1.5 space-y-1 text-sm text-zinc-300">
                    {answer.currentContext.map((line, index) => <li key={index}>• {line}</li>)}
                  </ul>
                </div>
              )}

              <div className="mt-3">
                <h4 className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-violet-300">
                  <Database className="h-3.5 w-3.5" />HISTORICAL EVIDENCE
                </h4>
                {answer.evidence.length ? (
                  <div className="mt-1.5 space-y-2">
                    {answer.evidence.map((hit) => <EvidenceCard key={hit.document.id} hit={hit} onOpen={() => setOpenDocument(hit)} />)}
                  </div>
                ) : (
                  <p className="mt-1.5 text-sm text-zinc-500">No historical report matched this question closely enough to cite.</p>
                )}
              </div>

              <div className="mt-3">
                <h4 className="text-[11px] font-medium tracking-wide text-zinc-500">AI EXPLANATION</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">{answer.answer}</p>
              </div>

              <div className="mt-3">
                <h4 className="text-[11px] font-medium tracking-wide text-zinc-500">RECOMMENDED ACTION</h4>
                <p className="mt-1.5 text-sm text-zinc-300">{answer.recommendedAction}</p>
              </div>
            </article>
          )}
        </div>
      </Section>

      {openDocument && <EvidenceModal hit={openDocument} onClose={() => setOpenDocument(null)} />}
    </div>
  );
};

const CriticalAlert: React.FC<{
  alert: ZoneAlert;
  onAcknowledge: () => void;
  onViewZone: () => void;
  onViewEvidence: () => void;
}> = ({ alert, onAcknowledge, onViewZone, onViewEvidence }) => (
  <div className="card-danger p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-300">
          <BellRing className="h-4 w-4 animate-pulse" />CRITICAL SAFETY ALERT
        </p>
        <p className="mt-2 text-sm text-zinc-200">
          {alert.zoneName} · risk score {alert.score} / 100 · <span className="text-red-400">HIGH RISK</span>
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Hazard: {alert.hazard}{alert.criticalSensor && ` · ${alert.criticalSensor}`} · raised {preciseTime(alert.raisedAt)}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300">
          <span className="text-zinc-500">Notified:</span>
          {alert.notify.map((role) => <span key={role}>✓ {notifyLabel(role)}</span>)}
        </div>
        {alert.createsInspection && <p className="mt-1 text-xs text-zinc-400">Emergency inspection created.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-danger h-8 px-3 text-xs" onClick={onAcknowledge}>Acknowledge</button>
        <button className="btn-secondary h-8 px-3 text-xs" onClick={onViewZone}>View zone</button>
        <button className="btn-secondary h-8 px-3 text-xs" onClick={onViewEvidence}>View evidence</button>
      </div>
    </div>
  </div>
);

const EvidenceModal: React.FC<{ hit: RetrievedDocument; onClose: () => void }> = ({ hit, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
    <div
      className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-zinc-900 p-5 sm:max-w-lg sm:rounded-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="text-[11px] uppercase tracking-wide text-violet-300">Historical record — not live sensor data</p>
      <h3 className="mt-1 text-base font-medium text-zinc-100">{hit.document.title}</h3>
      <p className="mt-1 text-xs text-zinc-500">
        <span className="font-mono">{hit.document.id}</span> · {hit.document.source} · {hit.document.recordedAt} ·
        {' '}{hit.document.date} · {hit.document.severity} severity · {hit.similarity}% similarity
      </p>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <h4 className="text-[11px] font-medium tracking-wide text-zinc-500">WHAT WAS RECORDED</h4>
          <p className="mt-1 leading-relaxed text-zinc-300">{hit.document.description}</p>
        </div>
        <div>
          <h4 className="text-[11px] font-medium tracking-wide text-zinc-500">PREVENTIVE ACTION TAKEN</h4>
          <p className="mt-1 leading-relaxed text-zinc-300">{hit.document.preventiveAction}</p>
        </div>
        <div>
          <h4 className="text-[11px] font-medium tracking-wide text-zinc-500">WHY IT WAS RETRIEVED</h4>
          <p className="mt-1 text-zinc-400">{hit.matchedOn.join(' · ')}</p>
        </div>
      </div>
      <button className="btn-secondary mt-5 w-full" onClick={onClose}>Close</button>
    </div>
  </div>
);
