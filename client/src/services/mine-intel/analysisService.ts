/**
 * Composes the risk explanation shown on the page.
 *
 * Every sentence it returns is built from a measured sensor value, a risk-engine
 * output or a retrieved historical document — it never asserts a fact that is not
 * already in one of those. Observations and historical evidence stay in separate
 * fields so the UI can keep the two visually apart, which is the point: a past
 * report must not read as a current measurement.
 *
 * This runs locally against the simulation. If a hosted model is wired in later,
 * it should receive this same grounded bundle and be held to the same separation.
 */

import { ZoneRisk, COMPONENT_LABELS, hazardTypeFor } from './riskEngine';
import { RetrievedDocument, EvidenceSummary, retrieve, retrieveForZone, summarizeEvidence } from './ragService';
import { ESCALATION } from './alertService';
import { RiskLevel } from './riskLevels';
import { SensorKey, ZoneReading } from './sensorSimulator';

export interface ZoneAnalysis {
  zoneId: string;
  zoneName: string;
  score: number;
  level: RiskLevel;
  hazardType: string;
  /** Current sensor facts. Each is a reading, not an inference. */
  observations: string[];
  /** Retrieved past reports, kept separate from observations by design. */
  evidence: RetrievedDocument[];
  evidenceSummary: EvidenceSummary;
  interpretation: string;
  recommendedActions: string[];
  generatedAt: number;
  /** The auditable retrieval pipeline, for the "how was this generated" panel. */
  pipeline: { documentsRetrieved: number; hazard: string; dataSource: string; knowledgeSource: string; engine: string };
}

const formatSensor = (label: string, value: number, unit: string, display?: string) =>
  display ? `${label}: ${display}` : `${label}: ${value}${unit ? ` ${unit}` : ''}`;

/** History for one sensor across the recent ticks, used for "rose from X to Y" lines. */
export interface SensorHistoryPoint { at: number; value: number }
export type ZoneSensorHistory = Partial<Record<SensorKey, SensorHistoryPoint[]>>;

function movementLine(
  history: ZoneSensorHistory | undefined,
  key: SensorKey,
  label: string,
  unit: string,
): string | null {
  const series = history?.[key];
  if (!series || series.length < 2) return null;
  const first = series[0].value;
  const last = series[series.length - 1].value;
  if (Math.abs(last - first) < 0.01) return null;
  const direction = last > first ? 'rose' : 'fell';
  return `${label} ${direction} from ${first}${unit && ` ${unit}`} to ${last}${unit && ` ${unit}`} over the recorded window`;
}

export function analyseZone(
  risk: ZoneRisk,
  reading: ZoneReading | undefined,
  history: ZoneSensorHistory | undefined,
): ZoneAnalysis {
  const evidence = retrieveForZone(risk);
  const hazardType = hazardTypeFor(risk);
  const policy = ESCALATION[risk.level];

  const observations: string[] = [];
  for (const sensor of risk.criticalSensors) {
    const moved = movementLine(history, sensor.key, sensor.label, sensor.unit);
    observations.push(moved ?? formatSensor(sensor.label, sensor.value, sensor.unit, sensor.display));
  }
  if (reading?.sensors.pumpStatus.value === 0) observations.push('Drainage pump is reported offline');
  if (reading?.sensors.fanStatus.value === 0) observations.push('Ventilation fan is reported stopped');
  if (risk.lastInspectionHoursAgo >= 12) {
    observations.push(`Last recorded inspection was ${risk.lastInspectionHoursAgo} hours ago`);
  }
  if (risk.openIssues > 0) {
    observations.push(`${risk.openIssues} open issue${risk.openIssues === 1 ? '' : 's'} recorded against this zone`);
  }

  const dominantLabel = COMPONENT_LABELS[risk.dominant];
  const interpretation = risk.level === 'LOW'
    ? `${risk.zoneName} is within normal limits. ${dominantLabel.toLowerCase()} readings carry the largest share of a low overall score, and no sensor is near its threshold.`
    : `${dominantLabel} conditions account for most of ${risk.zoneName}'s score of ${risk.overall}. The readings above are current measurements; the historical reports below record comparable situations at this mine and are offered as precedent, not as evidence of what is happening now.`;

  const recommendedActions: string[] = [];
  if (risk.level === 'HIGH') {
    recommendedActions.push(`Withdraw or restrict access to ${risk.zoneName} pending an on-site check`);
    recommendedActions.push(`Safety officer to verify ${risk.criticalSensors[0]?.label.toLowerCase() ?? 'the flagged sensor'} against a handheld reading`);
    if (risk.dominant === 'flood') recommendedActions.push('Confirm drainage pump capacity and standby availability');
    if (risk.dominant === 'gas') recommendedActions.push('Confirm ventilation at the face before any re-entry');
    if (risk.dominant === 'ground') recommendedActions.push('Check roof support and convergence instrumentation in the heading');
    if (risk.dominant === 'fire') recommendedActions.push('Treat as a suspected heating: check CO trend and sealing, and do not re-enter without a gas clearance');
  } else if (risk.level === 'MEDIUM') {
    recommendedActions.push(`Sirdar to include ${risk.zoneName} in the next pre-shift inspection`);
    recommendedActions.push(`Keep ${risk.criticalSensors[0]?.label.toLowerCase() ?? 'the leading sensor'} under watch for continued movement`);
  } else {
    recommendedActions.push('No action required beyond routine monitoring');
  }
  if (evidence.length) {
    recommendedActions.push(`Review the preventive action recorded in ${evidence[0].document.id} and confirm it is still in place`);
  }

  return {
    zoneId: risk.zoneId,
    zoneName: risk.zoneName,
    score: risk.overall,
    level: risk.level,
    hazardType,
    observations,
    evidence,
    evidenceSummary: summarizeEvidence(evidence),
    interpretation,
    recommendedActions: [...recommendedActions, policy.action],
    generatedAt: Date.now(),
    pipeline: {
      documentsRetrieved: evidence.length,
      hazard: hazardType,
      dataSource: 'Simulated IoT sensors',
      knowledgeSource: 'Historical hazard reports',
      engine: 'Mine risk engine',
    },
  };
}

export interface QueryAnswer {
  question: string;
  currentContext: string[];
  evidence: RetrievedDocument[];
  answer: string;
  recommendedAction: string;
  answeredAt: number;
}

/**
 * Answers a free-text question by combining current risk state with retrieval.
 * When nothing relevant is retrieved it says so rather than filling the gap.
 */

/** Matched intent, used to pick how the answer is assembled. */
type Intent =
  | 'WHY_RISK' | 'PRECEDENT' | 'INSPECT' | 'ACTION' | 'EVACUATE' | 'COMPARE'
  | 'SAFEST' | 'WORST' | 'TREND' | 'SENSOR' | 'ESCALATION' | 'HOW_IT_WORKS'
  | 'COUNT' | 'HAZARD_KIND' | 'STATUS';

/**
 * Intent patterns, most specific first. A question can mention several things, so the
 * order matters: "why is District 1 risky and has it happened before" is treated as a
 * precedent question, because that is the part a generic risk summary would not answer.
 */
const INTENTS: [Intent, RegExp][] = [
  // Prefixes, not whole words: "evacuat" must match "evacuate" and "evacuation", so
  // these are anchored at the start of a word only.
  ['HOW_IT_WORKS', /\b(how (does|do|is|are)|how .*(work|calculat|comput|decid|deriv|score)|what is (the )?(risk score|risk engine)|where .*(data|sensor).*from|explain the (system|engine|model|score))/],
  ['PRECEDENT', /\b(before|previous|past|histor|precedent|similar|happen|recur|again|last time|ever been)/],
  ['EVACUATE', /\b(evacuat|withdraw|clear the|stop work|shut down|abandon|leave the|pull out|get out)/],
  ['ESCALATION', /\b(sos|alert|notif|escalat|approval|who (was|is|gets|should be) (told|notified|informed))/],
  ['COMPARE', /\b(compar|versus|\bvs\b|difference between|which is (worse|higher|safer|better)|rank)/],
  ['SAFEST', /\b(safest|safe\?|lowest risk|least risk|which .*(safe|fine|ok|normal))/],
  ['WORST', /\b(worst|highest|most (dangerous|risky|at risk|critical)|biggest|top|priorit)/],
  ['TREND', /\b(trend|rising|falling|improv|worsen|getting (worse|better)|over time|direction)/],
  ['INSPECT', /\b(inspect|audit|visit|survey|patrol|require.*check|need.*check)/],
  ['ACTION', /\b(what should|what do|what can|recommend|advice|advise|action|next step|do about|handle|respond|mitigat|fix)/],
  ['SENSOR', /\b(methane|ch4|carbon monoxide|\bco\b|oxygen|\bo2\b|water|rain|roof|vibration|temperature|humidity|wind|air velocity|\bfan\b|pump|sensor|reading|level)/],
  ['HAZARD_KIND', /\b(fire|heating|smoke|flood|gas|ground|strata|ventilation|weather)/],
  ['COUNT', /\b(how many|count|number of|total)/],
  ['WHY_RISK', /\b(why|cause|reason|because|driving|behind|explain)/],
  ['STATUS', /\b(status|current|right now|situation|overview|summary|report|happening|condition)/],
];

const matchIntent = (text: string): Intent => {
  for (const [intent, pattern] of INTENTS) if (pattern.test(text)) return intent;
  return 'STATUS';
};

/** Sensor keywords → the risk component they belong to, for sensor-specific questions. */
const SENSOR_TOPICS: [RegExp, RiskComponentName][] = [
  [/\b(fire|heating|smoke|combust)/, 'fire'],
  [/\b(methane|ch4|carbon monoxide|\bco\b|oxygen|\bo2\b|gas)/, 'gas'],
  [/\b(water|flood|rain|pump|drainage|inrush)/, 'flood'],
  [/\b(roof|ground|vibration|strata|convergence|subsiden)/, 'ground'],
  [/\b(air velocity|\bfan\b|ventilat|airflow|air flow)/, 'ventilation'],
  [/\b(temperature|humidity|wind|weather)/, 'weather'],
];
type RiskComponentName = keyof typeof COMPONENT_LABELS;

/** A question naming one sensor is answered about that sensor, not its component's worst. */
const NAMED_SENSORS: [RegExp, SensorKey][] = [
  [/\b(methane|ch4)/, 'methane'],
  [/\b(carbon monoxide|\bco\b)/, 'carbonMonoxide'],
  [/\b(oxygen|\bo2\b)/, 'oxygen'],
  [/\bwater level/, 'waterLevel'],
  [/\b(pump|drainage)/, 'pumpStatus'],
  [/\b(roof|convergence)/, 'roofDisplacement'],
  [/\bvibration/, 'groundVibration'],
  [/\b(air velocity|airflow|air flow)/, 'airVelocity'],
  [/\bfan\b/, 'fanStatus'],
  [/\brain/, 'rainfall'],
  [/\btemperature/, 'temperature'],
  [/\bhumidity/, 'humidity'],
  [/\bwind/, 'windSpeed'],
];

const listZones = (zones: ZoneRisk[]) =>
  zones.map((zone) => `${zone.zoneName} (${zone.overall}, ${zone.level})`).join(', ');

const pluralZones = (n: number) => `${n} district${n === 1 ? '' : 's'}`;

/**
 * Answers a free-text question by combining current risk state with retrieval.
 *
 * Deliberately not a language model: every answer is assembled from measured values
 * and retrieved records, so it cannot invent a reading or a report. The cost is that
 * it answers the question it recognises rather than the question asked — when nothing
 * matches, it says what it can see instead of guessing.
 */
export function answerQuestion(
  question: string,
  risks: ZoneRisk[],
  analyses: Record<string, ZoneAnalysis>,
  readings: ZoneReading[] = [],
): QueryAnswer {
  const sensorsByZone: Record<string, ZoneReading['sensors']> = Object.fromEntries(
    readings.map((reading) => [reading.zoneId, reading.sensors]),
  );
  const text = question.toLowerCase();
  const ranked = risks.slice().sort((a, b) => b.overall - a.overall);

  if (!ranked.length) {
    return {
      question,
      currentContext: [],
      evidence: [],
      answer: 'No district is being monitored yet, so there is nothing to report on.',
      recommendedAction: 'Wait for the first sensor cycle.',
      answeredAt: Date.now(),
    };
  }

  // Every district the question names, so comparisons work on both.
  const namedZones = risks.filter((risk) => text.includes(risk.zoneName.toLowerCase()));
  const subject = namedZones[0] ?? ranked[0];
  const analysis = analyses[subject.zoneId];
  const intent = matchIntent(text);
  const topic = SENSOR_TOPICS.find(([pattern]) => pattern.test(text))?.[1];

  const elevated = ranked.filter((risk) => risk.level !== 'LOW');
  const high = ranked.filter((risk) => risk.level === 'HIGH');
  const low = ranked.filter((risk) => risk.level === 'LOW');

  const currentContext = [
    `${subject.zoneName}: risk ${subject.overall}/100 (${subject.level}) · ${subject.primaryHazard}`,
    ...subject.criticalSensors.map((sensor) => formatSensor(sensor.label, sensor.value, sensor.unit, sensor.display)),
  ];

  const evidence = retrieve({
    query: question,
    // A question about a named hazard retrieves on that hazard; otherwise on whatever
    // the subject district is actually carrying.
    hazardType: hazardTypeFor(subject),
    limit: 3,
  });
  const cite = evidence.length
    ? `${evidence.length} historical report${evidence.length === 1 ? '' : 's'} describe comparable situations (${evidence.map((hit) => hit.document.id).join(', ')}) — past records, not current readings.`
    : 'No historical report in the corpus matches this closely enough to cite.';

  let answer: string;
  let recommendedAction: string = analysis?.recommendedActions[0] ?? ESCALATION[subject.level].action;

  switch (intent) {
    case 'HOW_IT_WORKS':
      answer = `Each sensor is scored 0–100 against fixed thresholds, grouped into ${Object.keys(COMPONENT_LABELS).length} components (${Object.values(COMPONENT_LABELS).join(', ')}), and combined into one district score — a weighted sum, floored so a single severe hazard cannot be averaged away. Bands are fixed: 0–39 low, 40–69 medium, 70–100 high. Readings come from the in-app sensor simulator, and the historical reports are a fixed corpus retrieved by keyword and hazard match. Nothing here is a language model, so no figure is generated.`;
      recommendedAction = 'Open a district to see which sensor is driving its score.';
      break;

    case 'PRECEDENT':
      answer = evidence.length
        ? `Yes. ${evidence.length} past record${evidence.length === 1 ? '' : 's'} at this mine describe${evidence.length === 1 ? 's' : ''} comparable conditions to ${subject.zoneName}'s current ${COMPONENT_LABELS[subject.dominant].toLowerCase()} situation. The closest is ${evidence[0].document.id}, "${evidence[0].document.title}" (${evidence[0].document.date}, ${evidence[0].document.severity} severity): ${evidence[0].document.description} Its recorded preventive action was: ${evidence[0].document.preventiveAction}`
        : `No past record in the corpus matches ${subject.zoneName}'s current conditions closely enough to cite. That is an absence of retrievable precedent, not evidence that nothing similar occurred.`;
      recommendedAction = evidence.length
        ? `Confirm the preventive action from ${evidence[0].document.id} is still in place.`
        : 'Treat the current readings on their own terms.';
      break;

    case 'EVACUATE':
      answer = high.length
        ? `${pluralZones(high.length)} ${high.length === 1 ? 'is' : 'are'} at high risk: ${listZones(high)}. At this level the system has already raised an SOS to the workers and Sirdars of ${high.length === 1 ? 'that district' : 'those districts'}. Withdrawal itself is a decision for the Mine Manager or the responsible official — this board reports sensor conditions and does not authorise it.`
        : elevated.length
          ? `No district is at high risk. ${listZones(elevated)} ${elevated.length === 1 ? 'is' : 'are'} elevated but below the 70 threshold, which indicates inspection rather than withdrawal.`
          : 'No district is above the monitoring band. Nothing in the current readings indicates withdrawal.';
      recommendedAction = high.length
        ? `Confirm the reading on site for ${high[0].zoneName} before acting on it, and follow the mine's withdrawal procedure.`
        : 'Continue routine monitoring.';
      break;

    case 'ESCALATION':
      answer = `Escalation is automatic and keyed to the band. Above 70 an SOS is raised immediately to that district's workers and Sirdars, plus the supervisory chain, with no confirmation step. Between 40 and 69 nothing reaches a worker: a request goes to the Sirdar, and only their approval sends the SOS. Below 40 nothing is sent. Right now ${high.length ? `${listZones(high)} ${high.length === 1 ? 'is' : 'are'} in the automatic band` : 'no district is in the automatic band'}${elevated.length > high.length ? `, and ${listZones(elevated.filter((z) => z.level === 'MEDIUM'))} would go to a Sirdar` : ''}.`;
      recommendedAction = high.length
        ? `${high[0].zoneName} has already alerted its crew; verify on site.`
        : 'No escalation is outstanding.';
      break;

    case 'COMPARE': {
      const [a, b] = namedZones.length >= 2 ? namedZones : ranked.slice(0, 2);
      if (!b) { answer = `Only ${a.zoneName} is being monitored, so there is nothing to compare it with.`; break; }
      const gap = Math.abs(a.overall - b.overall);
      const worse = a.overall >= b.overall ? a : b;
      const better = worse === a ? b : a;
      answer = `${worse.zoneName} is the higher risk of the two at ${worse.overall}/100 (${worse.level}) against ${better.zoneName} at ${better.overall}/100 (${better.level}), a gap of ${gap} points. ${worse.zoneName} is driven by ${COMPONENT_LABELS[worse.dominant].toLowerCase()} conditions — ${worse.criticalSensors.map((s) => formatSensor(s.label, s.value, s.unit, s.display)).join(', ')}. ${better.zoneName} is driven by ${COMPONENT_LABELS[better.dominant].toLowerCase()} — ${better.criticalSensors.map((s) => formatSensor(s.label, s.value, s.unit, s.display)).join(', ') || 'no sensor above its threshold'}.`;
      recommendedAction = `Deal with ${worse.zoneName} first; ${ESCALATION[worse.level].action.toLowerCase()}`;
      break;
    }

    case 'SAFEST':
      answer = low.length
        ? `${listZones(low)} ${low.length === 1 ? 'is' : 'are'} within normal limits — no sensor near its threshold. The lowest is ${low[low.length - 1].zoneName} at ${low[low.length - 1].overall}/100.`
        : `No district is currently in the low band. The least affected is ${ranked[ranked.length - 1].zoneName} at ${ranked[ranked.length - 1].overall}/100 (${ranked[ranked.length - 1].level}).`;
      recommendedAction = 'Continue routine monitoring on these districts.';
      break;

    case 'WORST':
      answer = `${ranked[0].zoneName} is the highest at ${ranked[0].overall}/100 (${ranked[0].level}), driven by ${COMPONENT_LABELS[ranked[0].dominant].toLowerCase()} conditions: ${ranked[0].criticalSensors.map((s) => formatSensor(s.label, s.value, s.unit, s.display)).join(', ')}. ${ranked.length > 1 ? `Next is ${ranked[1].zoneName} at ${ranked[1].overall}.` : ''} ${cite}`;
      recommendedAction = analyses[ranked[0].zoneId]?.recommendedActions[0] ?? ESCALATION[ranked[0].level].action;
      break;

    case 'TREND':
      answer = `This panel reports the current cycle rather than a trend line — the risk graph above shows movement over time. As of now, ${elevated.length ? `${listZones(elevated)} ${elevated.length === 1 ? 'is' : 'are'} above the monitoring band` : 'every district is within normal limits'}. ${subject.zoneName} sits at ${subject.overall}/100 with ${COMPONENT_LABELS[subject.dominant].toLowerCase()} the leading component.`;
      recommendedAction = 'Read the risk trend chart for direction over the recorded window.';
      break;

    case 'SENSOR': {
      // A specific sensor was named: report that sensor across the mine.
      const named = NAMED_SENSORS.find(([pattern]) => pattern.test(text))?.[1];
      if (named) {
        const readings = ranked
          .map((zone) => ({ zone, sensor: sensorsByZone[zone.zoneId]?.[named] }))
          .filter((row) => row.sensor);
        if (readings.length) {
          const worst = readings.slice().sort((a, b) => b.sensor!.severity - a.sensor!.severity)[0];
          const label = worst.sensor!.label;
          // "Highest" is wrong for oxygen and airflow, where low is the dangerous
          // direction, and meaningless for a pump or fan. Name the worst reading by
          // severity instead of by value.
          const values = readings.map((row) => `${row.zone.zoneName} ${row.sensor!.display ?? `${row.sensor!.value}${row.sensor!.unit ? ` ${row.sensor!.unit}` : ''}`}`).join(', ');
          answer = worst.sensor!.severity >= 40
            ? `${label} across the mine: ${values}. ${worst.zone.zoneName} is the most affected, above its threshold at severity ${worst.sensor!.severity}/100.`
            : `${label} across the mine: ${values}. Every reading is within normal limits.`;
          recommendedAction = worst.sensor!.severity >= 40
            ? `Verify ${label.toLowerCase()} at ${worst.zone.zoneName} against a handheld reading.`
            : 'No action indicated for this sensor.';
          break;
        }
      }
      const component = topic ?? subject.dominant;
      const scored = ranked
        .map((zone) => ({ zone, score: zone.components[component as keyof typeof zone.components] ?? 0, sensor: zone.contributors[component as keyof typeof zone.contributors] }))
        .sort((a, b) => b.score - a.score);
      const worst = scored[0];
      answer = worst && worst.score > 0
        ? `On ${COMPONENT_LABELS[component].toLowerCase()}, ${worst.zone.zoneName} reads highest at ${worst.score}/100 for that component — ${formatSensor(worst.sensor.label, worst.sensor.value, worst.sensor.unit, worst.sensor.display)}. Across the mine: ${scored.filter((row) => row.score > 0).map((row) => `${row.zone.zoneName} ${row.score}`).join(', ') || 'no district is above zero'}. ${cite}`
        : `No district currently reads above its threshold for ${COMPONENT_LABELS[component].toLowerCase()}. Those sensors are within normal limits everywhere.`;
      recommendedAction = worst && worst.score >= 40
        ? `Verify ${worst.sensor.label.toLowerCase()} at ${worst.zone.zoneName} against a handheld reading.`
        : 'No action indicated for these sensors.';
      break;
    }

    case 'HAZARD_KIND': {
      const component = topic ?? subject.dominant;
      const carrying = ranked.filter((zone) => zone.dominant === component);
      answer = carrying.length
        ? `${listZones(carrying)} ${carrying.length === 1 ? 'is' : 'are'} currently dominated by ${COMPONENT_LABELS[component].toLowerCase()} conditions. ${carrying[0].zoneName}: ${carrying[0].criticalSensors.map((s) => formatSensor(s.label, s.value, s.unit, s.display)).join(', ')}. ${cite}`
        : `No district is currently dominated by ${COMPONENT_LABELS[component].toLowerCase()} conditions. The leading hazard right now is ${COMPONENT_LABELS[ranked[0].dominant].toLowerCase()} at ${ranked[0].zoneName}.`;
      recommendedAction = carrying.length
        ? analyses[carrying[0].zoneId]?.recommendedActions[0] ?? ESCALATION[carrying[0].level].action
        : 'Continue routine monitoring.';
      break;
    }

    case 'COUNT':
      answer = `${risks.length} district${risks.length === 1 ? '' : 's'} monitored: ${high.length} high, ${elevated.length - high.length} medium, ${low.length} low. ${elevated.length ? `Above the monitoring band: ${listZones(elevated)}.` : 'None above the monitoring band.'}`;
      recommendedAction = elevated.length ? `Start with ${elevated[0].zoneName}.` : 'Continue routine monitoring.';
      break;

    case 'INSPECT':
      answer = elevated.length
        ? `${pluralZones(elevated.length)} ${elevated.length === 1 ? 'sits' : 'sit'} above the monitoring band: ${listZones(elevated)}. ${high.length ? `${listZones(high)} ${high.length === 1 ? 'needs' : 'need'} an on-site check now.` : ''} These scores come from live sensor readings, not from a recorded inspection, so they indicate where to look rather than what was found.`
        : 'No district is above the monitoring band, so the sensor data does not indicate an inspection beyond the routine cycle.';
      recommendedAction = elevated.length
        ? `Prioritise ${elevated[0].zoneName}; ${ESCALATION[elevated[0].level].action.toLowerCase()}`
        : 'Continue the routine inspection cycle.';
      break;

    case 'ACTION':
      answer = `For ${subject.zoneName} at ${subject.overall}/100 (${subject.level}), the recorded conditions are: ${(analysis?.observations ?? []).slice(0, 3).join('; ') || 'no sensor above its threshold'}. ${ESCALATION[subject.level].action} ${cite}`;
      recommendedAction = analysis?.recommendedActions.slice(0, 2).join(' Then: ') ?? ESCALATION[subject.level].action;
      break;

    case 'WHY_RISK':
    case 'STATUS':
    default:
      answer = `${subject.zoneName} is scored ${subject.overall}/100 (${subject.level}), driven mainly by ${COMPONENT_LABELS[subject.dominant].toLowerCase()} conditions. Current sensor data: ${(analysis?.observations ?? []).slice(0, 3).join('; ') || 'no sensor is above its threshold'}. ${cite}${namedZones.length === 0 && ranked.length > 1 ? ` Across the mine, ${elevated.length ? `${listZones(elevated)} ${elevated.length === 1 ? 'is' : 'are'} above the monitoring band` : 'every other district is within normal limits'}.` : ''}`;
      break;
  }

  return { question, currentContext, evidence, answer, recommendedAction, answeredAt: Date.now() };
}
