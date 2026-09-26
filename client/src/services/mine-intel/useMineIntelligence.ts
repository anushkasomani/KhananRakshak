/**
 * Drives the simulation loop and holds every piece of state the page renders.
 *
 * The page is a view over this hook: it decides nothing about risk, alerts or
 * retrieval. Swapping the simulator for a real feed means changing where `tick`
 * gets its readings — the rest of this file, and the whole page, stay as they are.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MineSensorNetwork, MonitoredZone, NetworkOptions, SensorKey, ZoneReading } from './sensorSimulator';
import { ZoneRisk, assessMine, mineRiskScore } from './riskEngine';
import { RiskLevel, riskLevel } from './riskLevels';
import { TimelineEntry, ZoneAlert, evaluateAlerts, timelineEntry } from './alertService';
import { ZoneAnalysis, ZoneSensorHistory, analyseZone } from './analysisService';
import { hazardTypeFor } from './riskEngine';
import { api, HazardOutcome } from '../api';

/**
 * Default cadence. 10s keeps a demonstration watchable — an escalation plays out in
 * about a minute instead of five. A real sensor gateway would poll far slower; 30s is
 * offered for that, and 5s for a very short walkthrough.
 */
export const SIMULATION_INTERVAL = 10000;
export const INTERVAL_OPTIONS = [
  { value: SIMULATION_INTERVAL, label: '10s · default' },
  { value: 5000, label: '5s · fast demo' },
  { value: 30000, label: '30s · production cadence' },
];

/** Points kept on the main graph: 60 ticks, i.e. 10 minutes at the 10s default. */
const HISTORY_LIMIT = 60;
const TIMELINE_LIMIT = 40;

export interface RiskPoint {
  at: number;
  /** Mine-wide score — the worst zone governs. */
  mine: number;
  /** Per-zone scores, so selecting a zone re-plots without refetching. */
  zones: Record<string, number>;
}

export interface MineIntelligenceState {
  readings: ZoneReading[];
  risks: ZoneRisk[];
  mineScore: number;
  mineLevel: RiskLevel;
  history: RiskPoint[];
  sensorHistory: Record<string, ZoneSensorHistory>;
  timeline: TimelineEntry[];
  alerts: ZoneAlert[];
  analyses: Record<string, ZoneAnalysis>;
  lastTickAt: number;
  tickCount: number;
}

/** A district that crossed into MEDIUM or HIGH and must be reported to the server. */
export interface EscalationRequest {
  zoneId: string;
  zoneName: string;
  districtId: string | null;
  hazardType: string;
  score: number;
  summary: string;
}

/** Sensors kept as individual trend series under the main risk graph. */
export const TRACKED_SENSORS: SensorKey[] = ['waterLevel', 'methane', 'roofDisplacement', 'rainfall'];

/**
 * @param zones the districts of the selected mine. Switching mine replaces the whole
 *   network: a district belongs to one mine, so carrying readings or history across a
 *   mine change would attribute one mine's measurements to another.
 * @param reportTo the mine id to escalate against. HIGH-risk districts are reported
 *   as soon as this is set — a critical hazard is not held behind a control. MEDIUM
 *   districts are reported only when `reportMedium` is set, because that path exists
 *   to ask a Sirdar and should not queue requests nobody asked for.
 * @param options presentation choices passed to the sensor network.
 */
export function useMineIntelligence(
  zones: MonitoredZone[],
  reportTo?: string,
  options: NetworkOptions = {},
  reportMedium = false,
) {
  // The identity of the monitored set, so a re-render with an equal-but-new array
  // does not tear down a running simulation.
  // Options are part of the identity: changing them must rebuild the network, or the
  // board would keep profiles that no longer match what was asked for.
  const zoneKey = `${zones.map((zone) => zone.id).join('|')}::${options.alwaysCritical ? 'critical' : 'default'}`;

  const networkRef = useRef<MineSensorNetwork>();
  const builtForRef = useRef<string>();
  if (!networkRef.current || builtForRef.current !== zoneKey) {
    networkRef.current = new MineSensorNetwork(zones, options);
    builtForRef.current = zoneKey;
  }
  const network = networkRef.current;

  const [intervalMs, setIntervalMs] = useState(SIMULATION_INTERVAL);
  const [running, setRunning] = useState(true);
  const [state, setState] = useState<MineIntelligenceState>(() => build(network.snapshot()));
  const levelsRef = useRef<Record<string, RiskLevel>>({});
  // `advance` is memoised with no deps, so it reads this through a ref rather than
  // closing over a stale value.
  const reportMediumRef = useRef(reportMedium);
  reportMediumRef.current = reportMedium;

  // Starting on a different mine means starting over: fresh history and no alerts
  // carried across.
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) { firstRunRef.current = false; return; }
    const snapshot = network.snapshot();
    levelsRef.current = seedLevels(snapshot);
    reportedRef.current!.clear();
    saveReported(reportedRef.current!);
    setState(build(snapshot));
  }, [zoneKey, network]);

  /**
   * Districts that crossed into MEDIUM or HIGH on the last tick and still need to be
   * reported to the server. The setState updater that detects a crossing must stay
   * pure, so it only enqueues here; the effect below does the network call.
   */
  const [escalations, setEscalations] = useState<EscalationRequest[]>([]);
  const queueEscalations = useCallback(
    (requests: EscalationRequest[]) => setEscalations((previous) => [...previous, ...requests]),
    [],
  );
  const [outcomes, setOutcomes] = useState<Record<string, HazardOutcome>>({});
  const [escalationError, setEscalationError] = useState('');
  const inFlightRef = useRef(new Set<string>());
  // Districts already reported, keyed per browser tab rather than per mount.
  //
  // A useRef here was wrong: Strict Mode mounts twice and a zoneKey change rebuilds the
  // hook, so the set kept emptying and every rebuild sent freshSession again — which
  // stands down the cooldown and lets a new SOS through. sessionStorage survives both,
  // and still clears when the tab is closed or reloaded, which is the behaviour asked
  // for: one alert per refresh, not one per remount.
  const reportedRef = useRef<Set<string>>();
  if (!reportedRef.current) reportedRef.current = loadReported();

  useEffect(() => {
    if (!escalations.length || !reportTo) return;
    const pending = escalations;
    setEscalations([]);
    for (const request of pending) {
      // One request per district per crossing; a slow round trip must not be retried
      // by the next tick while the first is still open.
      if (inFlightRef.current.has(request.zoneId)) continue;
      inFlightRef.current.add(request.zoneId);
      // The first report for a district in this session clears its cooldown, so
      // reopening the board shows the escalation again rather than reporting that one
      // was raised in an earlier session. Later reports in the same session do not,
      // which is what keeps a district at HIGH from alerting on every tick.
      const freshSession = !reportedRef.current!.has(request.zoneId);
      reportedRef.current!.add(request.zoneId);
      saveReported(reportedRef.current!);
      api.detectHazard({
        mineId: reportTo,
        districtId: request.districtId,
        zoneLabel: request.zoneName,
        hazardType: request.hazardType,
        riskScore: request.score,
        summary: request.summary,
        freshSession,
      })
        .then((outcome) => {
          setOutcomes((previous) => ({ ...previous, [request.zoneId]: outcome }));
          setEscalationError('');
        })
        .catch((error: any) => setEscalationError(error?.message || 'Could not reach the alert service.'))
        .finally(() => inFlightRef.current.delete(request.zoneId));
    }
  }, [escalations, reportTo]);

  /** One simulation step: read sensors → score → alert → record history. */
  const advance = useCallback((readings: ZoneReading[], seedTimeline = false) => {
    const risks = assessMine(readings);

    // Band changes are detected HERE, outside the state updater. React invokes a
    // setState updater twice under Strict Mode, so a scan placed inside it would queue
    // every crossing twice and raise two SOS for one event. This runs once per tick.
    const beforeLevels = levelsRef.current;
    const { alerts, entries } = evaluateAlerts(risks, beforeLevels);
    levelsRef.current = Object.fromEntries(risks.map((risk) => [risk.zoneId, risk.level]));

    // A district that has just entered MEDIUM or HIGH is reported once, on the
    // crossing. Staying in a band raises nothing further.
    const crossings = risks
      .filter((risk) => risk.level !== 'LOW' && beforeLevels[risk.zoneId] !== risk.level)
      // HIGH always goes out. MEDIUM only when the approval path is switched on, so
      // a Sirdar is not sent requests while someone is just looking at the board.
      .filter((risk) => risk.level === 'HIGH' || reportMediumRef.current)
      .map((risk) => ({
        zoneId: risk.zoneId,
        zoneName: risk.zoneName,
        // A synthesised single-zone id is not a real district row, so it is not sent.
        districtId: risk.zoneId.endsWith('-mine-wide') ? null : risk.zoneId,
        hazardType: hazardTypeFor(risk),
        score: risk.overall,
        summary: analysisSummary(risk),
      }));
    if (crossings.length) queueEscalations(crossings);

    setState((previous) => {
      const mine = mineRiskScore(risks);
      const at = readings[0]?.capturedAt ?? Date.now();

      const point: RiskPoint = {
        at,
        mine,
        zones: Object.fromEntries(risks.map((risk) => [risk.zoneId, risk.overall])),
      };
      const history = [...previous.history, point].slice(-HISTORY_LIMIT);

      const sensorHistory: Record<string, ZoneSensorHistory> = {};
      for (const reading of readings) {
        const zoneHistory: ZoneSensorHistory = { ...previous.sensorHistory[reading.zoneId] };
        for (const key of TRACKED_SENSORS) {
          zoneHistory[key] = [...(zoneHistory[key] ?? []), { at, value: reading.sensors[key].value }].slice(-HISTORY_LIMIT);
        }
        sensorHistory[reading.zoneId] = zoneHistory;
      }

      const analyses: Record<string, ZoneAnalysis> = {};
      for (const risk of risks) {
        const reading = readings.find((row) => row.zoneId === risk.zoneId);
        analyses[risk.zoneId] = analyseZone(risk, reading, sensorHistory[risk.zoneId]);
      }

      const tickEntry = timelineEntry({
        kind: 'SENSOR',
        level: riskLevel(mine),
        title: 'Sensor update',
        detail: `IoT data refreshed for ${readings.length} zones · mine risk ${mine}/100`,
        at,
      });
      // A critical transition also means retrieval ran for that zone; record it so
      // the timeline shows the RAG step, not just the alert it produced.
      const ragEntries = entries
        .filter((entry) => entry.kind === 'CRITICAL')
        .map((entry) => timelineEntry({
          kind: 'AI',
          level: entry.level,
          title: `AI analysis · ${entry.zoneName}`,
          detail: `${analyses[entry.zoneId!]?.evidence.length ?? 0} historical reports retrieved for ${analyses[entry.zoneId!]?.hazardType ?? 'the detected hazard'}.`,
          zoneId: entry.zoneId,
          zoneName: entry.zoneName,
          at: at + 1,
        }));

      const timeline = [...ragEntries, ...entries, tickEntry, ...(seedTimeline ? [] : previous.timeline)].slice(0, TIMELINE_LIMIT);

      return {
        readings,
        risks,
        mineScore: mine,
        mineLevel: riskLevel(mine),
        history,
        sensorHistory,
        timeline,
        alerts: [...alerts, ...previous.alerts].slice(0, 8),
        analyses,
        lastTickAt: at,
        tickCount: previous.tickCount + 1,
      };
    });
  }, []);

  // Seed the levels map from the first snapshot so the opening render does not
  // fire alerts for zones that simply started where they started.
  useEffect(() => {
    levelsRef.current = seedLevels(state.readings);
    // Intentionally first-mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => advance(network.tick()), intervalMs);
    return () => window.clearInterval(id);
  }, [running, intervalMs, advance, network]);

  const acknowledge = useCallback((alertId: string) => {
    setState((previous) => ({
      ...previous,
      alerts: previous.alerts.map((alert) => (alert.id === alertId ? { ...alert, acknowledged: true } : alert)),
    }));
  }, []);

  const stepNow = useCallback(() => advance(network.tick()), [advance, network]);

  const zonesByRisk = useMemo(() => state.risks.slice().sort((a, b) => b.overall - a.overall), [state.risks]);
  const activeAlert = useMemo(() => state.alerts.find((alert) => !alert.acknowledged), [state.alerts]);

  return {
    ...state,
    zonesByRisk,
    activeAlert,
    intervalMs,
    setIntervalMs,
    running,
    setRunning,
    acknowledge,
    stepNow,
    /** What the server did with each reported district, keyed by zone id. */
    outcomes,
    escalationError,
    /** True while this page is allowed to raise real alerts. */
    reporting: !!reportTo,
    /** True while MEDIUM hazards are also sent to a Sirdar for approval. */
    reportingMedium: reportMedium,
  };
}

/** Initial state from a snapshot, with no alerts raised and one opening timeline row. */
function build(readings: ZoneReading[], sensorHistory: Record<string, ZoneSensorHistory> = {}): MineIntelligenceState {
  const risks = assessMine(readings);
  const mine = mineRiskScore(risks);
  const at = readings[0]?.capturedAt ?? Date.now();
  const analyses: Record<string, ZoneAnalysis> = {};
  const history: Record<string, ZoneSensorHistory> = { ...sensorHistory };
  for (const reading of readings) {
    const zoneHistory: ZoneSensorHistory = {};
    for (const key of TRACKED_SENSORS) zoneHistory[key] = [{ at, value: reading.sensors[key].value }];
    history[reading.zoneId] = zoneHistory;
  }
  for (const risk of risks) {
    analyses[risk.zoneId] = analyseZone(risk, readings.find((row) => row.zoneId === risk.zoneId), history[risk.zoneId]);
  }
  return {
    readings,
    risks,
    mineScore: mine,
    mineLevel: riskLevel(mine),
    history: [{ at, mine, zones: Object.fromEntries(risks.map((risk) => [risk.zoneId, risk.overall])) }],
    sensorHistory: history,
    timeline: [timelineEntry({
      kind: 'SYSTEM',
      level: riskLevel(mine),
      title: 'Simulation started',
      detail: `Monitoring ${readings.length} zones · mine risk ${mine}/100`,
      at,
    })],
    alerts: [],
    analyses,
    lastTickAt: at,
    tickCount: 0,
  };
}

/**
 * The level map a board starts from.
 *
 * Districts are seeded as LOW regardless of where they actually open, so a district
 * that is already elevated on the first reading still registers as a crossing and is
 * escalated. Seeding them at their true opening level would mean a district that
 * starts critical is silently treated as already known and never reported — which is
 * exactly the case a permanently-critical demo district creates.
 */
function seedLevels(readings: ZoneReading[]): Record<string, RiskLevel> {
  return Object.fromEntries(readings.map((reading) => [reading.zoneId, 'LOW' as RiskLevel]));
}

/**
 * Districts already reported in this browser tab.
 *
 * Held in sessionStorage so it survives a Strict-Mode double mount and a hook rebuild,
 * but not a reload — a refresh is meant to start a new session and re-raise the alert.
 * Storage can be unavailable (private windows, blocked site data), so both sides fall
 * back to an in-memory set rather than failing.
 */
const REPORTED_KEY = 'mine-intel:reported-districts';

function loadReported(): Set<string> {
  try {
    const raw = sessionStorage.getItem(REPORTED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReported(set: Set<string>) {
  try {
    sessionStorage.setItem(REPORTED_KEY, JSON.stringify([...set]));
  } catch {
    // Without storage the set is per-mount, which only means an extra stand-down.
  }
}

/** A one-line account of why a district is flagged, for the Sirdar and the SOS note. */
function analysisSummary(risk: { criticalSensors: { label: string; value: number; unit: string; display?: string }[] }) {
  const readings = risk.criticalSensors
    .slice(0, 3)
    .map((sensor) => (sensor.display ? `${sensor.label} ${sensor.display}` : `${sensor.label} ${sensor.value}${sensor.unit ? ` ${sensor.unit}` : ''}`));
  return readings.length ? `Sensors: ${readings.join(', ')}.` : 'No individual sensor is above its threshold.';
}
