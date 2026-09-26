/**
 * Historical hazard knowledge base.
 *
 * These are past reports, NOT live sensor data — the page labels them that way
 * everywhere they appear. This mock corpus stands in for what would later be a
 * real document store; `ragService` is the only module that reads it, so swapping
 * in FAISS / Qdrant / pgvector means reimplementing that one retrieval call.
 *
 * Nothing here is a statutory citation. `source` names the kind of record each
 * entry stands for, and the demo IDs are plainly demo IDs.
 */

export type HazardType = 'FLOOD' | 'GAS' | 'GROUND' | 'VENTILATION' | 'WEATHER' | 'FIRE';

export interface HistoricalHazard {
  id: string;
  title: string;
  hazardType: HazardType;
  /** Where the event was recorded, as written in the report. Free text: these are
   *  past records and do not point at a district row in the current database. */
  recordedAt: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  date: string;
  description: string;
  preventiveAction: string;
  source: string;
  /** Free-text terms used by the keyword-overlap retrieval in ragService. */
  keywords: string[];
}

export const HISTORICAL_HAZARDS: HistoricalHazard[] = [
  {
    id: 'DGMS-001',
    title: 'Water inrush incident',
    hazardType: 'FLOOD',
    recordedAt: 'Lower workings, south side',
    severity: 'HIGH',
    date: '2025-08-14',
    description:
      'Sustained monsoon rainfall over four days raised the water level in the lower Zone C workings from 1.8 m to 3.9 m. Inflow exceeded the installed pump capacity and the district was evacuated for 31 hours. No injuries were recorded.',
    preventiveAction:
      'Standby pump capacity was doubled and a water-level trigger was set at 2.5 m for pre-emptive evacuation planning.',
    source: 'Historical safety report',
    keywords: ['water', 'inrush', 'flood', 'rainfall', 'monsoon', 'pump', 'drainage', 'water level'],
  },
  {
    id: 'DGMS-017',
    title: 'Drainage failure during heavy rainfall',
    hazardType: 'FLOOD',
    recordedAt: 'Lower workings, south side',
    severity: 'HIGH',
    date: '2025-07-02',
    description:
      'The primary drainage sump in Zone C silted up and the main pump tripped on overload. Water level rose 0.6 m in under three hours before the standby pump was brought online.',
    preventiveAction:
      'Monthly sump desilting was scheduled and pump trip alarms were routed to the shift Sirdar directly.',
    source: 'Historical safety report',
    keywords: ['drainage', 'pump', 'sump', 'water', 'flood', 'rainfall', 'overload', 'water level'],
  },
  {
    id: 'INSP-034',
    title: 'Water accumulation noted at district face',
    hazardType: 'FLOOD',
    recordedAt: 'Lower workings, south side',
    severity: 'MEDIUM',
    date: '2025-09-09',
    description:
      'A routine inspection recorded standing water approaching 1.4 m near the Zone C face, with the rate of accumulation increasing after rainfall. Drainage was reported as functional but under-sized for the observed inflow.',
    preventiveAction:
      'Drainage capacity review was raised as a corrective action; the review deadline passed without a recorded closure.',
    source: 'Previous inspection report',
    keywords: ['water', 'accumulation', 'inspection', 'drainage', 'face', 'rainfall', 'water level'],
  },
  {
    id: 'DGMS-002',
    title: 'Methane accumulation at the working face',
    hazardType: 'GAS',
    recordedAt: 'Development face, return airway',
    severity: 'HIGH',
    date: '2025-05-21',
    description:
      'Methane concentration at the Zone B face reached 2.3% following a partial ventilation stoppage. Work was suspended and the district cleared until the concentration fell below 1%.',
    preventiveAction:
      'Continuous CH₄ monitoring was extended to the return airway and fan-stoppage alarms were made audible at the face.',
    source: 'Historical safety report',
    keywords: ['methane', 'gas', 'ch4', 'ventilation', 'face', 'accumulation', 'fan'],
  },
  {
    id: 'DGMS-023',
    title: 'Carbon monoxide rise after blasting',
    hazardType: 'GAS',
    recordedAt: 'Development face, return airway',
    severity: 'MEDIUM',
    date: '2025-06-18',
    description:
      'Carbon monoxide readings rose to 62 ppm in the hours after a blasting round, with the re-entry interval shortened against procedure.',
    preventiveAction:
      'Minimum re-entry intervals were re-issued and CO clearance became a recorded pre-entry check.',
    source: 'Historical safety report',
    keywords: ['carbon monoxide', 'co', 'gas', 'blasting', 're-entry', 'ventilation'],
  },
  {
    id: 'DGMS-041',
    title: 'Roof convergence in the development heading',
    hazardType: 'GROUND',
    recordedAt: 'Development heading',
    severity: 'HIGH',
    date: '2025-04-03',
    description:
      'Roof displacement instrumentation in the Zone D heading recorded 27 mm of convergence over nine days, accelerating in the final 48 hours before the heading was withdrawn and re-supported.',
    preventiveAction:
      'Convergence readings moved to a daily cycle with a 15 mm withdrawal trigger, and additional roof bolting was installed.',
    source: 'Historical safety report',
    keywords: ['roof', 'convergence', 'displacement', 'ground', 'strata', 'support', 'bolting'],
  },
  {
    id: 'INSP-058',
    title: 'Ground vibration exceeding limit near a blast',
    hazardType: 'GROUND',
    recordedAt: 'Development heading',
    severity: 'MEDIUM',
    date: '2025-08-27',
    description:
      'Measured ground vibration reached 9.4 mm/s at the nearest monitored structure, above the recorded site limit for the blast design in use.',
    preventiveAction:
      'The blast design was revised to reduce the maximum instantaneous charge and monitoring points were added.',
    source: 'Previous inspection report',
    keywords: ['vibration', 'ground', 'blast', 'blasting', 'strata', 'monitoring'],
  },
  {
    id: 'DGMS-036',
    title: 'Ventilation fan stoppage',
    hazardType: 'VENTILATION',
    recordedAt: 'Development face, return airway',
    severity: 'HIGH',
    date: '2025-03-12',
    description:
      'The main ventilation fan stopped for 40 minutes on an electrical fault. Air velocity at the face fell below 0.3 m/s and gas concentrations began to climb before supply was restored.',
    preventiveAction:
      'Automatic changeover to the standby fan was commissioned and the stoppage alarm was routed to the control room.',
    source: 'Historical safety report',
    keywords: ['ventilation', 'fan', 'stoppage', 'air velocity', 'electrical', 'gas'],
  },
  {
    id: 'DGMS-008',
    title: 'Underground heating at a coal pillar',
    hazardType: 'FIRE',
    recordedAt: 'Fire barrier stowing area',
    severity: 'HIGH',
    date: '2025-06-04',
    description:
      'Carbon monoxide at the return airway rose to 118 ppm over two shifts with a measured temperature of 44 °C at the pillar edge, indicating spontaneous heating behind a stopping. The district was sealed and the panel isolated.',
    preventiveAction:
      'CO trend monitoring moved to a per-shift cycle and the stowing programme for worked-out pillars was brought forward.',
    source: 'Historical safety report',
    keywords: ['fire', 'heating', 'spontaneous combustion', 'carbon monoxide', 'co', 'temperature', 'sealing', 'pillar', 'smoke'],
  },
  {
    id: 'DGMS-014',
    title: 'Mine fire reported near a conveyor drive',
    hazardType: 'FIRE',
    recordedAt: 'Conveyor gallery',
    severity: 'HIGH',
    date: '2025-02-19',
    description:
      'A belt drive overheated and ignited accumulated coal dust. Smoke reached the intake and the shift was withdrawn. The fire was extinguished within 50 minutes; oxygen at the face fell to 18.1% during the event.',
    preventiveAction:
      'Belt-slip and bearing-temperature protection were commissioned, and dust accumulation at drive heads became a recorded pre-shift check.',
    source: 'Historical safety report',
    keywords: ['fire', 'smoke', 'conveyor', 'belt', 'coal dust', 'ignition', 'overheating', 'oxygen', 'withdrawal'],
  },
  {
    id: 'INSP-071',
    title: 'Elevated carbon monoxide noted on inspection',
    hazardType: 'FIRE',
    recordedAt: 'Return airway',
    severity: 'MEDIUM',
    date: '2025-09-16',
    description:
      'A routine inspection recorded carbon monoxide at 54 ppm in the return, above the level explained by blasting alone, with no corresponding methane rise. Early-stage heating was recorded as the suspected cause.',
    preventiveAction:
      'A CO trend review was raised as a corrective action; sealing of the adjacent worked-out area was recommended.',
    source: 'Previous inspection report',
    keywords: ['carbon monoxide', 'co', 'heating', 'fire', 'inspection', 'return airway', 'trend'],
  },
  {
    id: 'DGMS-049',
    title: 'Heavy rainfall affecting surface run-off into workings',
    hazardType: 'WEATHER',
    recordedAt: 'Lower workings, south side',
    severity: 'MEDIUM',
    date: '2025-07-25',
    description:
      'Rainfall of 96 mm in 24 hours overwhelmed surface drainage and run-off entered the workings through a subsided area, raising the measured water level.',
    preventiveAction:
      'Surface drains were re-cut before the following monsoon and the subsided area was backfilled.',
    source: 'Historical safety report',
    keywords: ['rainfall', 'weather', 'run-off', 'surface', 'water', 'monsoon', 'subsidence', 'flood'],
  },
];
