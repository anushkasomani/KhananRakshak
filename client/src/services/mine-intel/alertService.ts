/**
 * Alert and escalation policy.
 *
 * One rule set, keyed off the same three risk bands as everything else:
 *   LOW    → no alert, keep monitoring
 *   MEDIUM → notify Sirdar, recommend an inspection
 *   HIGH   → notify Worker + Sirdar + Safety officer, raise an emergency inspection
 *
 * Alerts fire on a band CHANGE, not on every tick, so a zone sitting at HIGH for ten
 * minutes produces one critical alert rather than twenty.
 */

import { RiskLevel } from './riskLevels';
import { ZoneRisk } from './riskEngine';
import { ROLE_LABELS } from '../../roles';

export type NotifyRole = 'WORKER' | 'SIRDAR' | 'OFFICER';

export interface EscalationPolicy {
  notify: NotifyRole[];
  action: string;
  createsInspection: boolean;
}

export const ESCALATION: Record<RiskLevel, EscalationPolicy> = {
  LOW: {
    notify: [],
    action: 'Continue monitoring. No alert raised.',
    createsInspection: false,
  },
  MEDIUM: {
    notify: ['SIRDAR'],
    action: 'Sirdar notified. Inspection recommended.',
    createsInspection: false,
  },
  HIGH: {
    notify: ['WORKER', 'SIRDAR', 'OFFICER'],
    action: 'Worker, Sirdar and Safety officer notified. Emergency inspection created.',
    createsInspection: true,
  },
};

/** Safety officer reads better than the bare role label on an alert card. */
export const notifyLabel = (role: NotifyRole) => (role === 'OFFICER' ? 'Safety officer' : ROLE_LABELS[role]);

export type TimelineKind = 'SENSOR' | 'WARNING' | 'CRITICAL' | 'AI' | 'SYSTEM';

export interface TimelineEntry {
  id: string;
  at: number;
  kind: TimelineKind;
  level: RiskLevel;
  title: string;
  detail: string;
  zoneId?: string;
  zoneName?: string;
}

export interface ZoneAlert {
  id: string;
  zoneId: string;
  zoneName: string;
  score: number;
  level: RiskLevel;
  hazard: string;
  criticalSensor?: string;
  raisedAt: number;
  notify: NotifyRole[];
  createsInspection: boolean;
  acknowledged: boolean;
}

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(sequence += 1).toString(36)}`;

export const timelineEntry = (entry: Omit<TimelineEntry, 'id' | 'at'> & { at?: number }): TimelineEntry => ({
  id: nextId('evt'),
  at: entry.at ?? Date.now(),
  ...entry,
});

/**
 * Compare this tick's risk against the previous band per zone and emit alerts plus
 * timeline entries for the transitions only.
 */
export function evaluateAlerts(
  risks: ZoneRisk[],
  previousLevels: Record<string, RiskLevel>,
): { alerts: ZoneAlert[]; entries: TimelineEntry[]; levels: Record<string, RiskLevel> } {
  const alerts: ZoneAlert[] = [];
  const entries: TimelineEntry[] = [];
  const levels: Record<string, RiskLevel> = {};

  for (const risk of risks) {
    levels[risk.zoneId] = risk.level;
    const before = previousLevels[risk.zoneId];
    if (before === risk.level) continue;

    const policy = ESCALATION[risk.level];
    const critical = risk.criticalSensors[0];
    const sensorText = critical
      ? `${critical.label} ${critical.display ?? `${critical.value}${critical.unit && ` ${critical.unit}`}`}`
      : undefined;

    if (risk.level === 'HIGH') {
      alerts.push({
        id: nextId('alert'),
        zoneId: risk.zoneId,
        zoneName: risk.zoneName,
        score: risk.overall,
        level: risk.level,
        hazard: risk.primaryHazard,
        criticalSensor: sensorText,
        raisedAt: Date.now(),
        notify: policy.notify,
        createsInspection: policy.createsInspection,
        acknowledged: false,
      });
      entries.push(timelineEntry({
        kind: 'CRITICAL',
        level: 'HIGH',
        title: `Critical alert · ${risk.zoneName}`,
        detail: `Risk score ${risk.overall} crossed 70. ${policy.action}`,
        zoneId: risk.zoneId,
        zoneName: risk.zoneName,
      }));
    } else if (risk.level === 'MEDIUM') {
      entries.push(timelineEntry({
        kind: 'WARNING',
        level: 'MEDIUM',
        title: `Warning · ${risk.zoneName}`,
        detail: before === 'HIGH'
          ? `Risk fell to ${risk.overall}. Zone is no longer critical; ${policy.action.toLowerCase()}`
          : `Risk score ${risk.overall} crossed 40${sensorText ? ` · ${sensorText}` : ''}. ${policy.action}`,
        zoneId: risk.zoneId,
        zoneName: risk.zoneName,
      }));
    } else if (before) {
      entries.push(timelineEntry({
        kind: 'SYSTEM',
        level: 'LOW',
        title: `Cleared · ${risk.zoneName}`,
        detail: `Risk score returned to ${risk.overall}. ${policy.action}`,
        zoneId: risk.zoneId,
        zoneName: risk.zoneName,
      }));
    }
  }

  return { alerts, entries, levels };
}
