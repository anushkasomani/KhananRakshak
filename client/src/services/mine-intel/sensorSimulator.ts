/**
 * Simulated IoT sensor network.
 *
 * This is the ONLY module that invents sensor values. Everything downstream
 * (riskEngine, alertService, ragService, the page) consumes the `ZoneReading`
 * shape below and knows nothing about how it was produced. To move to real
 * hardware, replace `MineSensorNetwork` with an MQTT / WebSocket / REST client
 * that emits the same `ZoneReading[]` on each tick — no other file changes.
 *
 * Readings are a random walk, not fresh random numbers: each tick nudges the
 * previous value, so a trend line looks like an instrument and not like noise.
 */

export type ScenarioId = 'NORMAL' | 'FLOOD' | 'GAS' | 'GROUND' | 'FIRE';

export type SensorKey =
  | 'methane' | 'carbonMonoxide' | 'oxygen'
  | 'waterLevel' | 'waterRate' | 'pumpStatus'
  | 'roofDisplacement' | 'groundVibration'
  | 'airVelocity' | 'fanStatus'
  | 'rainfall' | 'temperature' | 'humidity' | 'windSpeed';

export type SensorGroup = 'GAS' | 'WATER' | 'GROUND' | 'VENTILATION' | 'WEATHER';

export type Trend = 'UP' | 'DOWN' | 'FLAT';

export interface SensorReading {
  key: SensorKey;
  label: string;
  group: SensorGroup;
  value: number;
  unit: string;
  /** Rendered instead of the number when the sensor is really a state (pump, fan). */
  display?: string;
  delta: number;
  trend: Trend;
  updatedAt: number;
  /** Where this sensor alone sits, 0–100. The risk engine combines these. */
  severity: number;
}

export interface ZoneReading {
  zoneId: string;
  zoneName: string;
  /** Where the district sits, as recorded against it in the mine record. */
  location?: string | null;
  /** What this zone is set up to demonstrate. */
  scenario: ScenarioId;
  primaryHazard: string;
  lastInspectionHoursAgo: number;
  openIssues: number;
  sensors: Record<SensorKey, SensorReading>;
  capturedAt: number;
}

interface SensorSpec {
  label: string;
  group: SensorGroup;
  unit: string;
  /** Resting value in an undisturbed zone. */
  base: number;
  /** Typical tick-to-tick wobble. */
  drift: number;
  min: number;
  max: number;
  decimals: number;
  /** Boolean-ish sensors render a word rather than a number. */
  states?: [string, string];
}

const SPECS: Record<SensorKey, SensorSpec> = {
  methane:          { label: 'Methane (CH₄)',        group: 'GAS',         unit: '%',    base: 0.42, drift: 0.035, min: 0,   max: 4,    decimals: 2 },
  carbonMonoxide:   { label: 'Carbon monoxide (CO)', group: 'GAS',         unit: 'ppm',  base: 9,    drift: 1.2,   min: 0,   max: 200,  decimals: 0 },
  oxygen:           { label: 'Oxygen (O₂)',          group: 'GAS',         unit: '%',    base: 20.8, drift: 0.08,  min: 15,  max: 21.5, decimals: 1 },
  waterLevel:       { label: 'Water level',          group: 'WATER',       unit: 'm',    base: 1.15, drift: 0.04,  min: 0,   max: 6,    decimals: 2 },
  waterRate:        { label: 'Water level change',   group: 'WATER',       unit: 'm/h',  base: 0.01, drift: 0.012, min: -0.4, max: 1.6, decimals: 3 },
  pumpStatus:       { label: 'Drainage pump',        group: 'WATER',       unit: '',     base: 1,    drift: 0,     min: 0,   max: 1,    decimals: 0, states: ['OFFLINE', 'RUNNING'] },
  roofDisplacement: { label: 'Roof displacement',    group: 'GROUND',      unit: 'mm',   base: 2.1,  drift: 0.18,  min: 0,   max: 60,   decimals: 1 },
  groundVibration:  { label: 'Ground vibration',     group: 'GROUND',      unit: 'mm/s', base: 1.4,  drift: 0.22,  min: 0,   max: 25,   decimals: 2 },
  airVelocity:      { label: 'Air velocity',         group: 'VENTILATION', unit: 'm/s',  base: 1.35, drift: 0.09,  min: 0,   max: 4,    decimals: 2 },
  fanStatus:        { label: 'Ventilation fan',      group: 'VENTILATION', unit: '',     base: 1,    drift: 0,     min: 0,   max: 1,    decimals: 0, states: ['STOPPED', 'RUNNING'] },
  rainfall:         { label: 'Rainfall',             group: 'WEATHER',     unit: 'mm',   base: 4,    drift: 1.6,   min: 0,   max: 180,  decimals: 0 },
  temperature:      { label: 'Temperature',          group: 'WEATHER',     unit: '°C',   base: 28.5, drift: 0.5,   min: 12,  max: 48,   decimals: 1 },
  humidity:         { label: 'Humidity',             group: 'WEATHER',     unit: '%',    base: 64,   drift: 2.2,   min: 20,  max: 100,  decimals: 0 },
  windSpeed:        { label: 'Wind speed',           group: 'WEATHER',     unit: 'km/h', base: 11,   drift: 1.8,   min: 0,   max: 90,   decimals: 0 },
};

export const SENSOR_KEYS = Object.keys(SPECS) as SensorKey[];
export const sensorSpec = (key: SensorKey) => SPECS[key];

export const SENSOR_GROUP_LABELS: Record<SensorGroup, string> = {
  GAS: 'Gas',
  WATER: 'Water / flood',
  GROUND: 'Ground stability',
  VENTILATION: 'Ventilation',
  WEATHER: 'Weather',
};

/**
 * Per-sensor severity, 0–100. Each band is a plain piecewise-linear ramp between
 * a value that is unremarkable and a value that would stop work, so the number a
 * card shows and the colour it carries always move together.
 */
const ramp = (value: number, safe: number, critical: number) => {
  const span = critical - safe;
  if (span === 0) return value >= critical ? 100 : 0;
  return Math.max(0, Math.min(100, ((value - safe) / span) * 100));
};
/** For sensors where LOW is the dangerous direction (oxygen, air velocity). */
const inverseRamp = (value: number, safe: number, critical: number) =>
  Math.max(0, Math.min(100, ((safe - value) / (safe - critical)) * 100));

const severityFor = (key: SensorKey, value: number): number => {
  switch (key) {
    case 'methane': return ramp(value, 0.6, 2.0);
    case 'carbonMonoxide': return ramp(value, 15, 80);
    case 'oxygen': return inverseRamp(value, 20.0, 18.0);
    case 'waterLevel': return ramp(value, 1.6, 4.0);
    case 'waterRate': return ramp(value, 0.08, 0.75);
    case 'pumpStatus': return value < 0.5 ? 70 : 0;
    case 'roofDisplacement': return ramp(value, 4, 25);
    case 'groundVibration': return ramp(value, 3, 12);
    case 'airVelocity': return inverseRamp(value, 1.0, 0.3);
    case 'fanStatus': return value < 0.5 ? 85 : 0;
    case 'rainfall': return ramp(value, 20, 110);
    case 'temperature': return ramp(value, 34, 45);
    case 'humidity': return ramp(value, 80, 100);
    case 'windSpeed': return ramp(value, 45, 80);
    default: return 0;
  }
};

/**
 * Scenario pressure. Returned values are added to a sensor's drift each tick, so a
 * scenario bends the random walk in one direction instead of teleporting it. `stage`
 * climbs from 0 towards 1 as the scenario runs, which is what makes Zone C escalate
 * MEDIUM → HIGH over several cycles rather than all at once.
 */
const pressure = (scenario: ScenarioId, key: SensorKey, stage: number): number => {
  if (scenario === 'FLOOD') {
    if (key === 'rainfall') return 6.5 * stage;
    if (key === 'waterLevel') return 0.2 * stage;
    if (key === 'waterRate') return 0.055 * stage;
    if (key === 'humidity') return 1.4 * stage;
    // The pump is handled after the walk, from the water level it is actually
    // fighting, rather than from the stage counter.
    if (key === 'pumpStatus') return 0;
    return 0;
  }
  if (scenario === 'GAS') {
    if (key === 'methane') return 0.115 * stage;
    if (key === 'carbonMonoxide') return 3.2 * stage;
    if (key === 'oxygen') return -0.07 * stage;
    if (key === 'airVelocity') return -0.035 * stage;
    return 0;
  }
  if (scenario === 'GROUND') {
    if (key === 'roofDisplacement') return 1.15 * stage;
    if (key === 'groundVibration') return 0.36 * stage;
    return 0;
  }
  if (scenario === 'FIRE') {
    // A mine fire shows up as combustion products and heat, not as one "fire" sensor:
    // CO climbs first, oxygen is consumed, and the temperature rises at the seat.
    if (key === 'carbonMonoxide') return 7.5 * stage;
    if (key === 'temperature') return 1.5 * stage;
    if (key === 'oxygen') return -0.12 * stage;
    if (key === 'methane') return 0.05 * stage;
    if (key === 'airVelocity') return -0.02 * stage;
    return 0;
  }
  return 0;
};

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, spec: SensorSpec) => Math.max(spec.min, Math.min(spec.max, value));

interface ZoneSeed {
  zoneId: string;
  zoneName: string;
  /** Where in the mine this district sits, as recorded against it. */
  location?: string | null;
  scenario: ScenarioId;
  primaryHazard: string;
  lastInspectionHoursAgo: number;
  openIssues: number;
  /** Starts a district part-way up its ramp, so the board is not uniformly green at t=0. */
  startStage: number;
  /** Held at full scenario pressure: its risk does not fall back over time. */
  pinned?: boolean;
}

/** A district monitored by the simulated network — the real districts of a real mine. */
export interface MonitoredZone {
  id: string;
  name: string;
  location?: string | null;
}

const HAZARD_LABELS: Record<ScenarioId, string> = {
  NORMAL: 'None recorded',
  GAS: 'Gas accumulation',
  FLOOD: 'Water accumulation',
  GROUND: 'Roof / ground movement',
  FIRE: 'Mine fire / heating',
};

/**
 * The demo profile assigned to each district of a mine, in order.
 *
 * The first district carries the flood scenario and opens already in the MEDIUM band,
 * because that is the escalation the walkthrough is built around. The next two carry
 * gas and ground movement so the board shows more than one kind of hazard, and any
 * further districts rest normal. Assignment is by position, so it is stable for a
 * given mine and every district keeps its real name.
 */
const ZONE_PROFILES: Omit<ZoneSeed, 'zoneId' | 'zoneName' | 'location'>[] = [
  { scenario: 'FLOOD',  primaryHazard: HAZARD_LABELS.FLOOD,  lastInspectionHoursAgo: 2,  openIssues: 3, startStage: 1 },
  { scenario: 'GAS',    primaryHazard: HAZARD_LABELS.GAS,    lastInspectionHoursAgo: 9,  openIssues: 2, startStage: 0.55 },
  { scenario: 'GROUND', primaryHazard: HAZARD_LABELS.GROUND, lastInspectionHoursAgo: 14, openIssues: 1, startStage: 0.45 },
  { scenario: 'NORMAL', primaryHazard: HAZARD_LABELS.NORMAL, lastInspectionHoursAgo: 5,  openIssues: 0, startStage: 0 },
  { scenario: 'NORMAL', primaryHazard: HAZARD_LABELS.NORMAL, lastInspectionHoursAgo: 7,  openIssues: 0, startStage: 0 },
];

/**
 * Options for how a mine's districts are profiled.
 *
 * `alwaysCritical` opens the leading district above the HIGH threshold and holds it
 * there, so a demonstration of the automatic-SOS path does not depend on waiting for
 * a climb. It is a presentation choice, not a property of the mine — the caller
 * decides which mine gets it.
 */
export interface NetworkOptions {
  alwaysCritical?: boolean;
}

const seedsFor = (zones: MonitoredZone[], options: NetworkOptions = {}): ZoneSeed[] =>
  zones.map((zone, index) => {
    const profile = ZONE_PROFILES[Math.min(index, ZONE_PROFILES.length - 1)];
    // The leading district is the one carrying the flood scenario; pinning it past the
    // end of its ramp keeps it critical rather than letting it drift back down.
    const critical = options.alwaysCritical && index === 0;
    return {
      ...profile,
      // A pinned district carries a mine fire, which is the hazard the walkthrough
      // mine is meant to demonstrate, rather than the flood its position would give it.
      ...(critical
        ? { scenario: 'FIRE' as ScenarioId, primaryHazard: HAZARD_LABELS.FIRE, startStage: 1, pinned: true }
        : {}),
      zoneId: zone.id,
      zoneName: zone.name,
      location: zone.location,
    };
  });

/** How fast a scenario walks from stage 0 to stage 1 — about 12 ticks end to end. */
const STAGE_STEP = 0.085;

/** Where a hand-picked scenario begins: already developing, still short of critical. */
const SCENARIO_ENTRY_STAGE = 0.62;

interface ZoneState {
  seed: ZoneSeed;
  scenario: ScenarioId;
  stage: number;
  values: Record<SensorKey, number>;
  previous: Record<SensorKey, number>;
}

/**
 * Sensor values for a district that must open already critical. Rather than trying to
 * reach that state by fast-forwarding the ramp — which depends on tuning that can
 * drift — the hazardous sensors are set directly to values well past their thresholds.
 */
const criticalValues = (scenario: ScenarioId): Record<SensorKey, number> => {
  const values = seedValues(scenario, 1);
  if (scenario === 'FIRE') {
    // A developed heating: CO well past its limit, oxygen drawn down, heat at the seat.
    values.carbonMonoxide = 132;
    values.temperature = 46.5;
    values.oxygen = 17.4;
    values.methane = 0.95;
    values.airVelocity = 0.72;
    return values;
  }
  values.waterLevel = 3.85;
  values.waterRate = 0.52;
  values.pumpStatus = 0;
  values.rainfall = 96;
  values.humidity = 93;
  return values;
};

const seedValues = (scenario: ScenarioId, stage: number): Record<SensorKey, number> => {
  const values = {} as Record<SensorKey, number>;
  for (const key of SENSOR_KEYS) {
    const spec = SPECS[key];
    // Start where the scenario would already have pushed this sensor, so a zone
    // seeded mid-ramp opens at a believable value rather than climbing from rest on
    // screen. Pressure grows linearly with stage, so the drift already accumulated is
    // its integral over the ticks elapsed — the average pressure times the tick count.
    const ticksElapsed = stage / STAGE_STEP;
    const lead = pressure(scenario, key, stage) * ticksElapsed * 0.62;
    values[key] = clamp(round(spec.base + lead, spec.decimals), spec);
  }
  return values;
};

export class MineSensorNetwork {
  private zones: ZoneState[];
  private seeds: ZoneSeed[];

  /**
   * @param zones the districts to monitor, in the order they should be profiled.
   * @param options presentation choices, such as holding the leading district critical.
   */
  constructor(zones: MonitoredZone[], options: NetworkOptions = {}) {
    this.seeds = seedsFor(zones, options);
    this.zones = this.build();
  }

  private build(): ZoneState[] {
    return this.seeds.map((seed) => {
      const values = seed.pinned ? criticalValues(seed.scenario) : seedValues(seed.scenario, seed.startStage);
      return { seed, scenario: seed.scenario, stage: seed.startStage, values, previous: { ...values } };
    });
  }

  /**
   * Point every zone at one scenario, or back to its own default with `null`.
   *
   * A chosen scenario starts part-way up its ramp and its sensors are re-seeded to
   * match, so the board reacts within a cycle or two. Starting from rest instead
   * would make a zone that was already interesting drop to nothing and take a dozen
   * cycles to climb back, which is the opposite of what a demo button is for.
   */
  setScenario(scenario: ScenarioId | null) {
    for (const zone of this.zones) {
      // A pinned district stays on its own hazard at full pressure: it exists to keep
      // one district demonstrably critical, and a scenario switch must not reset that.
      if (zone.seed.pinned) continue;
      const next = scenario ?? zone.seed.scenario;
      zone.scenario = next;
      zone.stage = scenario ? SCENARIO_ENTRY_STAGE : zone.seed.startStage;
      zone.values = seedValues(next, zone.stage);
      zone.previous = { ...zone.values };
    }
  }

  reset() {
    this.zones = this.build();
  }

  /** Advance every zone one interval and return the new readings. */
  tick(): ZoneReading[] {
    const capturedAt = Date.now();
    return this.zones.map((zone) => {
      zone.stage = Math.min(1, zone.stage + (zone.scenario === 'NORMAL' ? 0 : STAGE_STEP));
      zone.previous = { ...zone.values };

      for (const key of SENSOR_KEYS) {
        const spec = SPECS[key];
        const push = pressure(zone.scenario, key, zone.stage);
        if (spec.states) {
          // State sensors flip when the scenario forces them, and are otherwise steady.
          zone.values[key] = push < 0 ? 0 : zone.values[key];
          continue;
        }
        const noise = (Math.random() - 0.5) * spec.drift * 2;
        // Without scenario pressure a sensor is pulled gently back to its resting
        // value, so a normal zone wanders but never drifts away over a long session.
        const restoring = zone.scenario === 'NORMAL' || push === 0 ? (spec.base - zone.values[key]) * 0.12 : 0;
        zone.values[key] = clamp(round(zone.values[key] + push + noise + restoring, spec.decimals), spec);
      }

      // Water level and its rate of change must agree, or the cards contradict each
      // other; derive the rate from the level actually recorded. The previous rate is
      // blended in so one noisy tick cannot swing flood risk on its own — real level
      // sensors are reported the same way.
      const levelDelta = zone.values.waterLevel - zone.previous.waterLevel;
      const instantRate = levelDelta * 2;
      const smoothed = zone.previous.waterRate * 0.55 + instantRate * 0.45;
      zone.values.waterRate = clamp(round(smoothed, SPECS.waterRate.decimals), SPECS.waterRate);

      // A pinned district must stay demonstrably critical. Once the water level tops
      // out, the derived rate of change decays towards zero and would soften flood
      // risk, so the rate is held at a clearly hazardous value while pinned.
      if (zone.seed.pinned) {
        if (zone.scenario === 'FIRE') {
          // Held past the thresholds: without this the restoring pull and the sensor
          // ceiling would let a saturated reading soften back over a long session.
          zone.values.carbonMonoxide = Math.max(zone.values.carbonMonoxide, 120);
          zone.values.temperature = Math.max(zone.values.temperature, 45);
          zone.values.oxygen = Math.min(zone.values.oxygen, 17.6);
        } else if (zone.scenario === 'FLOOD') {
          zone.values.waterRate = Math.max(zone.values.waterRate, 0.45);
          zone.values.waterLevel = Math.max(zone.values.waterLevel, 3.7);
          zone.values.pumpStatus = 0;
        }
      }

      // The drainage pump gives out only once the water it is fighting is genuinely
      // deep. Tying it to the level rather than to a tick counter keeps the cards
      // consistent — the pump never reads OFFLINE beside an unremarkable level — and
      // keeps this step change from being what tips the zone into HIGH, since the
      // level alone has already done that by 3.4 m.
      if (zone.scenario === 'FLOOD' && zone.values.waterLevel > 3.4) zone.values.pumpStatus = 0;

      return this.readingFor(zone, capturedAt);
    });
  }

  /** Current values without advancing the simulation — used for the first paint. */
  snapshot(): ZoneReading[] {
    const capturedAt = Date.now();
    return this.zones.map((zone) => this.readingFor(zone, capturedAt));
  }

  private readingFor(zone: ZoneState, capturedAt: number): ZoneReading {
    const sensors = {} as Record<SensorKey, SensorReading>;
    for (const key of SENSOR_KEYS) {
      const spec = SPECS[key];
      const value = zone.values[key];
      const delta = round(value - zone.previous[key], Math.max(spec.decimals, 2));
      const threshold = spec.drift * 0.35;
      sensors[key] = {
        key,
        label: spec.label,
        group: spec.group,
        value,
        unit: spec.unit,
        display: spec.states ? spec.states[value >= 0.5 ? 1 : 0] : undefined,
        delta,
        trend: delta > threshold ? 'UP' : delta < -threshold ? 'DOWN' : 'FLAT',
        updatedAt: capturedAt,
        severity: Math.round(severityFor(key, value)),
      };
    }
    return {
      zoneId: zone.seed.zoneId,
      zoneName: zone.seed.zoneName,
      location: zone.seed.location,
      scenario: zone.scenario,
      primaryHazard: zone.scenario === 'NORMAL' ? 'None recorded' : zone.seed.primaryHazard,
      lastInspectionHoursAgo: zone.seed.lastInspectionHoursAgo,
      openIssues: zone.seed.openIssues,
      sensors,
      capturedAt,
    };
  }
}
