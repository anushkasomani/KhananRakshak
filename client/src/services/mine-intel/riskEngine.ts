/**
 * Mine risk engine.
 *
 * Pure and deterministic: the same `ZoneReading` always yields the same scores.
 * It invents nothing — every component score traces back to named sensors, and
 * `contributors` records which sensor drove each one so the UI and the AI layer
 * can both cite the measurement rather than assert a number.
 */

import { RiskLevel, riskLevel } from './riskLevels';
import { SensorKey, ZoneReading } from './sensorSimulator';

export type RiskComponent = 'gas' | 'flood' | 'ground' | 'ventilation' | 'weather' | 'fire';

/** Overall = Σ(component × weight). Documented on the page so the score is auditable. */
export const RISK_WEIGHTS: Record<RiskComponent, number> = {
  fire: 0.24,
  flood: 0.24,
  gas: 0.20,
  ground: 0.20,
  ventilation: 0.06,
  weather: 0.06,
};

/** Which sensors feed each component. The worst of them sets the component score. */
const COMPONENT_SENSORS: Record<RiskComponent, SensorKey[]> = {
  gas: ['methane', 'carbonMonoxide', 'oxygen'],
  // A mine fire is inferred from combustion products and heat: there is no fire
  // sensor. CO is shared with the gas component on purpose — the same reading is
  // evidence for both. What separates the two is heat, so the fire component is
  // scored only when the temperature is also raised (see componentScore).
  fire: ['carbonMonoxide', 'temperature', 'oxygen'],
  flood: ['waterLevel', 'waterRate', 'pumpStatus'],
  ground: ['roofDisplacement', 'groundVibration'],
  ventilation: ['airVelocity', 'fanStatus'],
  weather: ['rainfall', 'temperature', 'humidity', 'windSpeed'],
};

export const COMPONENT_LABELS: Record<RiskComponent, string> = {
  gas: 'Gas',
  fire: 'Fire / heating',
  flood: 'Flood',
  ground: 'Ground',
  ventilation: 'Ventilation',
  weather: 'Weather',
};

export const RISK_COMPONENTS = Object.keys(RISK_WEIGHTS) as RiskComponent[];

export interface Contributor {
  key: SensorKey;
  label: string;
  value: number;
  unit: string;
  display?: string;
  severity: number;
}

export interface ZoneRisk {
  zoneId: string;
  zoneName: string;
  location?: string | null;
  scenario: ZoneReading['scenario'];
  primaryHazard: string;
  lastInspectionHoursAgo: number;
  openIssues: number;
  components: Record<RiskComponent, number>;
  /** The sensor that set each component score. */
  contributors: Record<RiskComponent, Contributor>;
  overall: number;
  level: RiskLevel;
  /** The component carrying the most weighted risk — what the zone is actually about. */
  dominant: RiskComponent;
  /** The two or three sensors an officer should look at first. */
  criticalSensors: Contributor[];
  capturedAt: number;
}

/**
 * A component takes its worst sensor, then adds a small allowance for the others
 * so two moderately bad readings rank above one. Capped at 100.
 */
function componentScore(reading: ZoneReading, component: RiskComponent) {
  // Without raised temperature, high CO is a gas problem rather than a fire; scoring
  // fire from CO alone would name every gas release a heating.
  if (component === 'fire' && reading.sensors.temperature.severity < 20) {
    const co = reading.sensors.carbonMonoxide;
    return { score: 0, contributor: { key: co.key, label: co.label, value: co.value, unit: co.unit, display: co.display, severity: 0 } };
  }
  const sensors = COMPONENT_SENSORS[component].map((key) => reading.sensors[key]);
  const ranked = sensors.slice().sort((a, b) => b.severity - a.severity);
  const worst = ranked[0];
  const rest = ranked.slice(1).reduce((sum, sensor) => sum + sensor.severity, 0);
  const score = Math.min(100, Math.round(worst.severity + rest * 0.15));
  const contributor: Contributor = {
    key: worst.key,
    label: worst.label,
    value: worst.value,
    unit: worst.unit,
    display: worst.display,
    severity: worst.severity,
  };
  return { score, contributor };
}

export function assessZone(reading: ZoneReading): ZoneRisk {
  const components = {} as Record<RiskComponent, number>;
  const contributors = {} as Record<RiskComponent, Contributor>;

  for (const component of RISK_COMPONENTS) {
    const { score, contributor } = componentScore(reading, component);
    components[component] = score;
    contributors[component] = contributor;
  }

  const weighted = RISK_COMPONENTS.reduce((sum, component) => sum + components[component] * RISK_WEIGHTS[component], 0);

  // A weighted average alone cannot exceed a component's weight share, so a zone
  // with one severe hazard and four quiet ones would score low however bad that
  // hazard got — flooding at 100 would cap the zone near 30. That is the wrong
  // behaviour for safety, so the worst component also sets a floor: a zone is at
  // least as risky as its most dangerous single condition, discounted a little
  // because the other systems are holding. The weighted sum still governs when
  // several components are elevated together, which is what the weights are for.
  const worstComponent = Math.max(...RISK_COMPONENTS.map((component) => components[component]));
  const floor = worstComponent * 0.82;

  const overall = Math.max(0, Math.min(100, Math.round(Math.max(weighted, floor))));

  const dominant = RISK_COMPONENTS.reduce((best, component) =>
    components[component] * RISK_WEIGHTS[component] > components[best] * RISK_WEIGHTS[best] ? component : best,
  RISK_COMPONENTS[0]);

  // Components can nominate the same sensor (CO drives both gas and fire), so the
  // list is de-duplicated before it is shown or cited.
  const criticalSensors = [...new Map(
    Object.values(contributors)
      .filter((contributor) => contributor.severity > 0)
      .sort((a, b) => b.severity - a.severity)
      .map((contributor) => [contributor.key, contributor]),
  ).values()].slice(0, 3);

  return {
    zoneId: reading.zoneId,
    zoneName: reading.zoneName,
    location: reading.location,
    scenario: reading.scenario,
    primaryHazard: reading.primaryHazard,
    lastInspectionHoursAgo: reading.lastInspectionHoursAgo,
    openIssues: reading.openIssues,
    components,
    contributors,
    overall,
    level: riskLevel(overall),
    dominant,
    criticalSensors,
    capturedAt: reading.capturedAt,
  };
}

export const assessMine = (readings: ZoneReading[]): ZoneRisk[] => readings.map(assessZone);

/** The mine-wide figure shown on the main graph: the worst zone governs. */
export const mineRiskScore = (risks: ZoneRisk[]) =>
  risks.reduce((worst, risk) => Math.max(worst, risk.overall), 0);

/** Maps the dominant component to the hazard vocabulary the historical reports use. */
export const hazardTypeFor = (risk: ZoneRisk): 'FLOOD' | 'GAS' | 'GROUND' | 'VENTILATION' | 'WEATHER' | 'FIRE' =>
  risk.dominant === 'flood' ? 'FLOOD'
    : risk.dominant === 'fire' ? 'FIRE'
      : risk.dominant === 'gas' ? 'GAS'
        : risk.dominant === 'ground' ? 'GROUND'
          : risk.dominant === 'ventilation' ? 'VENTILATION'
            : 'WEATHER';
