/**
 * Turns a sensor-detected hazard into the escalation the mine actually runs on.
 *
 *   HIGH   (70–100) → SOS raised immediately. Every worker and Sirdar in the affected
 *                     district is notified, plus the supervisory chain for the mine.
 *   MEDIUM (40–69)  → nothing is sent to workers. A HazardApproval is held for a
 *                     Sirdar; only if they approve does an SOS go out.
 *
 * The risk bands here must match the client's riskLevels.ts. The server does not
 * trust a level supplied by the caller — it derives the level from the score, so a
 * bad or stale client cannot raise an SOS by mislabelling a low reading.
 *
 * Re-raising is suppressed per district (see COOLDOWN_MS): a district sitting at HIGH
 * reports every 30 seconds, and one hazard must not become a hundred SOS records.
 */

import { prisma } from '../db';
import { AuditService } from './auditService';

export type HazardType = 'FLOOD' | 'GAS' | 'GROUND' | 'VENTILATION' | 'WEATHER' | 'FIRE';

export const MEDIUM_THRESHOLD = 40;
export const HIGH_THRESHOLD = 70;

/** How long one district stays quiet after an SOS or a pending request. */
const COOLDOWN_MS = 30 * 60 * 1000;

/** A pending request older than this is no longer about current conditions. */
const APPROVAL_TTL_MS = 2 * 60 * 60 * 1000;

/** Maps a detected hazard onto the SosAlert emergencyType vocabulary. */
const EMERGENCY_TYPE: Record<HazardType, string> = {
  FIRE: 'FIRE',
  FLOOD: 'UNSAFE_CONDITION',
  GAS: 'GAS_HAZARD',
  GROUND: 'UNSAFE_CONDITION',
  VENTILATION: 'GAS_HAZARD',
  WEATHER: 'UNSAFE_CONDITION',
};

const HAZARD_LABEL: Record<HazardType, string> = {
  FIRE: 'mine fire / heating',
  FLOOD: 'water accumulation',
  GAS: 'gas accumulation',
  GROUND: 'roof / ground movement',
  VENTILATION: 'ventilation failure',
  WEATHER: 'severe weather',
};

export const HAZARD_TYPES = Object.keys(EMERGENCY_TYPE) as HazardType[];

const sosId = () => `SOS-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
const hazardId = () => `HAZ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

export interface HazardInput {
  mineId: string;
  /** The district this reading came from, when it maps to a real district row. */
  districtId?: string | null;
  /** Human label for the monitored area, used when there is no district row. */
  zoneLabel: string;
  hazardType: HazardType;
  riskScore: number;
  /** What the sensors recorded. Shown to the Sirdar and carried into the SOS note. */
  summary: string;
  /**
   * Set on the first reading after a board is opened. Clears this district's automated
   * cooldown so the escalation can be shown again, rather than being suppressed by an
   * alert raised in an earlier session.
   */
  freshSession?: boolean;
}

export type HazardOutcome =
  | { action: 'SOS_RAISED'; sosId: string; notified: number; level: 'HIGH' }
  | { action: 'APPROVAL_PENDING'; approvalId: string; notified: number; level: 'MEDIUM' }
  | { action: 'SUPPRESSED'; reason: string; level: 'HIGH' | 'MEDIUM' }
  | { action: 'NONE'; reason: string; level: 'LOW' };

/**
 * Everyone who must be told a district is unsafe: its workers and Sirdars, plus the
 * Sirdars of the mine at large when the reading is not tied to one district.
 */
async function audienceFor(mineId: string, districtId?: string | null) {
  const workersAndSirdars = await prisma.user.findMany({
    where: {
      mineId,
      status: 'APPROVED',
      role: { in: ['WORKER', 'SIRDAR', 'SPECIALIST'] },
      // A district-specific hazard reaches that district's crew. Without a district,
      // it reaches everyone at the mine, because we cannot say who is exposed.
      ...(districtId ? { OR: [{ districtId }, { role: 'SIRDAR' }] } : {}),
    },
    select: { id: true, role: true },
  });
  const supervisors = await prisma.user.findMany({
    where: {
      mineId,
      status: 'APPROVED',
      role: { in: ['OVERMAN', 'OFFICER', 'ASSISTANT_MANAGER', 'MINE_MANAGER'] },
    },
    select: { id: true, role: true },
  });
  return { workersAndSirdars, supervisors };
}

/** The Sirdars who may decide a MEDIUM hazard. */
async function sirdarsFor(mineId: string, districtId?: string | null) {
  const sirdars = await prisma.user.findMany({
    where: { mineId, status: 'APPROVED', role: 'SIRDAR' },
    select: { id: true, districtId: true },
  });
  // Prefer the Sirdar responsible for the district; fall back to all of them so a
  // hazard is never left with nobody able to act on it.
  const own = districtId ? sirdars.filter((user) => user.districtId === districtId) : [];
  return own.length ? own : sirdars;
}

const notify = (userIds: string[], title: string, message: string, type: string) =>
  userIds.length
    ? prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, title, message, type })) })
    : Promise.resolve({ count: 0 });

/** True when this district already produced an alert or a pending request recently. */
async function inCooldown(mineId: string, districtId: string | null | undefined, zoneLabel: string) {
  const since = new Date(Date.now() - COOLDOWN_MS);
  const [recentSos, recentApproval] = await Promise.all([
    prisma.sosAlert.findFirst({
      where: {
        mineId,
        ...(districtId ? { districtId } : {}),
        triggeredAt: { gte: since },
        status: { in: ['ALERT_TRIGGERED', 'ACKNOWLEDGED', 'TEAM_ASSIGNED', 'RESPONDING'] },
        workerIdentifier: { startsWith: AUTOMATED_IDENTIFIER },
      },
      select: { id: true },
    }),
    prisma.hazardApproval.findFirst({
      where: { mineId, zoneLabel, status: 'PENDING', raisedAt: { gte: since } },
      select: { id: true },
    }),
  ]);
  return { sos: recentSos, approval: recentApproval };
}

/** Marks these records as machine-raised, so they are never mistaken for a person's SOS. */
export const AUTOMATED_IDENTIFIER = 'AUTOMATED SENSOR ALERT';

/**
 * Raise an SOS for a hazard and notify the affected crew and the supervisory chain.
 * Used directly for HIGH risk, and by the approval path once a Sirdar signs off.
 */
export async function raiseHazardSos(input: HazardInput & { approvedById?: string; approvalId?: string }) {
  const id = sosId();
  const where = input.districtId ? { id: input.districtId } : undefined;
  const district = where ? await prisma.district.findUnique({ where, select: { name: true } }) : null;
  const area = district?.name || input.zoneLabel;

  const alert = await prisma.sosAlert.create({
    data: {
      id,
      mineId: input.mineId,
      districtId: input.districtId || null,
      emergencyType: EMERGENCY_TYPE[input.hazardType],
      workerIdentifier: `${AUTOMATED_IDENTIFIER} · ${area}`,
      triggeredById: input.approvedById || null,
      status: 'ALERT_TRIGGERED',
      responderNotes: `Sensor-detected ${HAZARD_LABEL[input.hazardType]} · risk ${input.riskScore}/100 · ${input.summary}`,
    },
    include: { mine: { select: { name: true } } },
  });

  const { workersAndSirdars, supervisors } = await audienceFor(input.mineId, input.districtId);
  const title = `SOS: ${HAZARD_LABEL[input.hazardType]} · ${area}`;
  const crewMessage = input.approvedById
    ? `A Sirdar has confirmed a potential hazard in ${area} at ${alert.mine.name}. ${input.summary} Follow your district's withdrawal instructions.`
    : `Automatic alert: ${HAZARD_LABEL[input.hazardType]} detected in ${area} at ${alert.mine.name} (risk ${input.riskScore}/100). ${input.summary} Follow your district's withdrawal instructions.`;

  const [crew, chain] = await Promise.all([
    notify(workersAndSirdars.map((user) => user.id), title, crewMessage, 'SOS'),
    notify(
      supervisors.map((user) => user.id),
      title,
      `${input.summary} Risk ${input.riskScore}/100 in ${area}. Open SOS control to respond.`,
      'SOS',
    ),
  ]);

  await AuditService.recordEvent({
    recordType: 'SOS_ALERT',
    recordId: id,
    action: 'CREATED',
    performedByRole: input.approvedById ? 'SIRDAR' : 'SYSTEM',
    data: {
      sosId: id,
      source: 'mine_intelligence_sensors',
      trigger: input.approvedById ? 'sirdar_approved_medium_risk' : 'automatic_high_risk',
      hazardType: input.hazardType,
      riskScore: input.riskScore,
      mineId: input.mineId,
      districtId: input.districtId || null,
      area,
      approvalId: input.approvalId || null,
      approvedById: input.approvedById || null,
      notified: crew.count + chain.count,
    },
  });

  return { alert, notified: crew.count + chain.count };
}


/**
 * Resolves the automated alerts this service raised for a district, which is what the
 * cooldown is keyed on. Alerts raised by a person are left alone: standing down a real
 * worker's SOS because a dashboard was reopened would be indefensible.
 */
async function standDownAutomatedAlerts(mineId: string, districtId?: string | null) {
  const now = new Date();
  const { count } = await prisma.sosAlert.updateMany({
    where: {
      mineId,
      ...(districtId ? { districtId } : {}),
      workerIdentifier: { startsWith: AUTOMATED_IDENTIFIER },
      status: { in: ['ALERT_TRIGGERED', 'ACKNOWLEDGED', 'TEAM_ASSIGNED', 'RESPONDING'] },
    },
    data: {
      status: 'RESOLVED',
      resolvedAt: now,
      responderNotes: 'Stood down automatically: monitoring restarted for this district.',
    },
  });
  await prisma.hazardApproval.updateMany({
    where: { mineId, status: 'PENDING', ...(districtId ? { districtId } : {}) },
    data: { status: 'EXPIRED', decidedAt: now, decisionNote: 'Expired: monitoring restarted for this district.' },
  });
  return count;
}

/**
 * The entry point the sensor layer calls each time a district's risk is assessed.
 * Decides, from the score alone, whether to raise an SOS, ask a Sirdar, or do nothing.
 */
/**
 * Districts with a reading being processed right now.
 *
 * Two requests for the same district can arrive within milliseconds — a duplicated
 * client tick, a retry, two tabs. Both would pass the cooldown check before either
 * had written its SOS, and both would raise one. This serialises them so the second
 * sees the first's alert and is suppressed. In-process only: it holds for one server,
 * which is what this deployment is. A multi-instance deployment needs a database
 * constraint or a lock instead.
 */
const inFlight = new Set<string>();

export async function handleHazardReading(input: HazardInput): Promise<HazardOutcome> {
  const score = Math.round(input.riskScore);
  const key = `${input.mineId}:${input.districtId ?? input.zoneLabel}`;

  if (score >= MEDIUM_THRESHOLD && inFlight.has(key)) {
    return {
      action: 'SUPPRESSED',
      reason: 'A reading for this area is already being processed.',
      level: score >= HIGH_THRESHOLD ? 'HIGH' : 'MEDIUM',
    };
  }

  if (score < MEDIUM_THRESHOLD) {
    return { action: 'NONE', reason: 'Risk is within the monitoring band.', level: 'LOW' };
  }

  inFlight.add(key);
  try {
    return await processReading(input, score);
  } finally {
    inFlight.delete(key);
  }
}

async function processReading(input: HazardInput, score: number): Promise<HazardOutcome> {
  // A caller that has just started monitoring asks for the cooldown to be cleared, so
  // reopening the board demonstrates the alert again instead of reporting that one was
  // raised half an hour ago. Only the automated alerts this service raised are stood
  // down — a person's SOS is never touched, and the record is kept rather than deleted.
  if (input.freshSession) await standDownAutomatedAlerts(input.mineId, input.districtId);

  const cooling = await inCooldown(input.mineId, input.districtId, input.zoneLabel);

  if (score >= HIGH_THRESHOLD) {
    if (cooling.sos) {
      return { action: 'SUPPRESSED', reason: `An automated SOS (${cooling.sos.id}) is already active for this area.`, level: 'HIGH' };
    }
    const { alert, notified } = await raiseHazardSos(input);
    // A pending request for the same area is now moot: conditions overtook it.
    if (cooling.approval) {
      await prisma.hazardApproval.update({
        where: { id: cooling.approval.id },
        data: { status: 'EXPIRED', decidedAt: new Date(), decisionNote: `Superseded by automatic SOS ${alert.id}.` },
      });
    }
    return { action: 'SOS_RAISED', sosId: alert.id, notified, level: 'HIGH' };
  }

  // MEDIUM: hold for a Sirdar. Nothing reaches a worker on this path.
  if (cooling.approval) {
    return { action: 'SUPPRESSED', reason: 'A request for this area is already awaiting a Sirdar.', level: 'MEDIUM' };
  }
  if (cooling.sos) {
    return { action: 'SUPPRESSED', reason: 'An automated SOS is already active for this area.', level: 'MEDIUM' };
  }

  const id = hazardId();
  const approval = await prisma.hazardApproval.create({
    data: {
      id,
      mineId: input.mineId,
      districtId: input.districtId || null,
      zoneLabel: input.zoneLabel,
      hazardType: input.hazardType,
      emergencyType: EMERGENCY_TYPE[input.hazardType],
      riskScore: score,
      summary: input.summary,
      status: 'PENDING',
    },
  });

  const sirdars = await sirdarsFor(input.mineId, input.districtId);
  const { count } = await notify(
    sirdars.map((user) => user.id),
    `Approval needed: ${HAZARD_LABEL[input.hazardType]} · ${input.zoneLabel}`,
    `Sensors report ${HAZARD_LABEL[input.hazardType]} in ${input.zoneLabel} at risk ${score}/100. ${input.summary} Approve to alert workers, or dismiss.`,
    'WARNING',
  );

  await AuditService.recordEvent({
    recordType: 'HAZARD_APPROVAL',
    recordId: id,
    action: 'CREATED',
    performedByRole: 'SYSTEM',
    data: {
      approvalId: id,
      source: 'mine_intelligence_sensors',
      hazardType: input.hazardType,
      riskScore: score,
      mineId: input.mineId,
      districtId: input.districtId || null,
      zoneLabel: input.zoneLabel,
      sirdarsNotified: count,
    },
  });

  return { action: 'APPROVAL_PENDING', approvalId: id, notified: count, level: 'MEDIUM' };
}

/** Marks stale pending requests as expired so a Sirdar is never asked about old conditions. */
export async function expireStaleApprovals() {
  const cutoff = new Date(Date.now() - APPROVAL_TTL_MS);
  const { count } = await prisma.hazardApproval.updateMany({
    where: { status: 'PENDING', raisedAt: { lt: cutoff } },
    data: { status: 'EXPIRED', decidedAt: new Date(), decisionNote: 'Expired without a decision; conditions are no longer current.' },
  });
  return count;
}
