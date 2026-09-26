/**
 * The one place the three risk bands are defined. Every module in this folder and
 * the page itself read colours and labels from here, so a score can never be drawn
 * in a colour that disagrees with the band it falls in.
 *
 *   0–39   LOW      green
 *   40–69  MEDIUM   yellow
 *   70–100 HIGH     red
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const MEDIUM_THRESHOLD = 40;
export const HIGH_THRESHOLD = 70;

export const riskLevel = (score: number): RiskLevel =>
  score >= HIGH_THRESHOLD ? 'HIGH' : score >= MEDIUM_THRESHOLD ? 'MEDIUM' : 'LOW';

export interface RiskStyle {
  level: RiskLevel;
  label: string;
  /** Plain hex, for chart strokes and fills where Tailwind classes cannot reach. */
  hex: string;
  text: string;
  /** Card / pill background plus border, tuned for the zinc-950 page. */
  surface: string;
  /** Small filled dot, for legends and timeline rows. */
  dot: string;
  meaning: string;
}

export const RISK_STYLES: Record<RiskLevel, RiskStyle> = {
  LOW: {
    level: 'LOW',
    label: 'LOW',
    hex: '#10b981',
    text: 'text-emerald-400',
    surface: 'bg-emerald-500/[0.06] border-emerald-500/25',
    dot: 'bg-emerald-400',
    meaning: 'Safe / normal. Continue monitoring, no alert raised.',
  },
  MEDIUM: {
    level: 'MEDIUM',
    label: 'MEDIUM',
    hex: '#f59e0b',
    text: 'text-amber-400',
    surface: 'bg-amber-500/[0.06] border-amber-500/25',
    dot: 'bg-amber-400',
    meaning: 'Attention required. Sirdar notified, inspection recommended.',
  },
  HIGH: {
    level: 'HIGH',
    label: 'HIGH',
    hex: '#ef4444',
    text: 'text-red-400',
    surface: 'bg-red-500/[0.06] border-red-500/25',
    dot: 'bg-red-500',
    meaning: 'Critical. Worker, Sirdar and Safety officer notified; emergency inspection raised.',
  },
};

export const styleFor = (score: number) => RISK_STYLES[riskLevel(score)];
