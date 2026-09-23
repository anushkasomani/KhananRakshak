import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuditService } from '../src/services/auditService';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CoalGuard / MineSafe database...');

  // Clear existing
  await prisma.userBadge.deleteMany();
  await prisma.recognitionPoint.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.auditBlock.deleteMany();
  await prisma.correctiveAction.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.sosAlert.deleteMany();
  await prisma.grievance.deleteMany();
  await prisma.safetyReport.deleteMany();
  await prisma.mineZone.deleteMany();
  await prisma.user.deleteMany();
  await prisma.mine.deleteMany();

  // 1. Mines
  const dhanbad = await prisma.mine.create({
    data: {
      code: 'MINE-DHN-01',
      name: 'Dhanbad Central Underground Colliery',
      region: 'Jharkhand Coal Belt',
      state: 'Jharkhand',
      complianceScore: 94.2,
      activeWorkers: 640,
      status: 'OPERATIONAL',
      zones: {
        create: [
          { name: 'Section B-12 (Longwall 4)', depthLevel: '-240m Lower Seam', riskFactor: 'ELEVATED' },
          { name: 'Shaft 2 Main Haulage', depthLevel: '-180m Intermediate', riskFactor: 'MODERATE' },
          { name: 'Ventilation Intake Incline 3', depthLevel: '-120m Upper Intake', riskFactor: 'LOW' },
          { name: 'Seam 7 Extraction Face', depthLevel: '-310m Deep Pit', riskFactor: 'HIGH' },
        ]
      }
    },
    include: { zones: true }
  });

  const eastern = await prisma.mine.create({
    data: {
      code: 'MINE-ECL-04',
      name: 'Eastern Raniganj Seam Pit 4',
      region: 'Eastern Coalfields',
      state: 'West Bengal',
      complianceScore: 89.4,
      activeWorkers: 512,
      status: 'CAUTION',
      zones: {
        create: [
          { name: 'North Face Working 2', depthLevel: '-160m Seam IV', riskFactor: 'ELEVATED' },
          { name: 'East Conveyor Gallery', depthLevel: '-140m Incline', riskFactor: 'MODERATE' },
          { name: 'South Drainage Sump', depthLevel: '-210m Low Level', riskFactor: 'HIGH' },
        ]
      }
    },
    include: { zones: true }
  });

  const korba = await prisma.mine.create({
    data: {
      code: 'MINE-SECL-02',
      name: 'Korba Deep Underground Complex',
      region: 'South Eastern Coalfields',
      state: 'Chhattisgarh',
      complianceScore: 96.8,
      activeWorkers: 780,
      status: 'OPERATIONAL',
      zones: {
        create: [
          { name: 'Continuous Miner Panel A', depthLevel: '-280m Deep Seam', riskFactor: 'MODERATE' },
          { name: 'Substation Transformer Vault 1', depthLevel: '-200m Vault', riskFactor: 'LOW' },
        ]
      }
    },
    include: { zones: true }
  });

  const singrauli = await prisma.mine.create({
    data: {
      code: 'MINE-NCL-09',
      name: 'Singrauli OpenCast Basin',
      region: 'Northern Coalfields',
      state: 'Madhya Pradesh',
      complianceScore: 92.1,
      activeWorkers: 490,
      status: 'OPERATIONAL',
      zones: {
        create: [
          { name: 'Bench 4 Excavation Shovel 12', depthLevel: '+45m Surface Bench', riskFactor: 'MODERATE' },
          { name: 'Heavy Haul Road Sector C', depthLevel: 'Ground Level Ramp', riskFactor: 'HIGH' },
        ]
      }
    },
    include: { zones: true }
  });

  const jharia = await prisma.mine.create({
    data: {
      code: 'MINE-BCCL-07',
      name: 'Central Jharia Seam 9 Colliery',
      region: 'Bharat Coking Coal',
      state: 'Jharkhand',
      complianceScore: 87.5,
      activeWorkers: 380,
      status: 'AUDIT_REQUIRED',
      zones: {
        create: [
          { name: 'Fire Barrier Stowing Sector', depthLevel: '-150m Barrier', riskFactor: 'HIGH' },
          { name: 'Shaft 1 Man-Winding Pit', depthLevel: 'Surface to -220m', riskFactor: 'ELEVATED' },
        ]
      }
    },
    include: { zones: true }
  });

  // 2. Users (all 6 roles with hashed passwords: "password123")
  const pw = await bcrypt.hash('password123', 10);

  const worker = await prisma.user.create({
    data: {
      email: 'worker@minesafe.gov',
      name: 'Ramesh Kumar',
      passwordHash: pw,
      role: 'WORKER',
      badgeNumber: 'W-4109',
      mineId: dhanbad.id,
      department: 'Underground Extraction Crew 4',
      points: 75,
    }
  });

  const safetyOfficer = await prisma.user.create({
    data: {
      email: 'safety@minesafe.gov',
      name: 'Priya Sharma',
      passwordHash: pw,
      role: 'SAFETY_OFFICER',
      badgeNumber: 'SO-104',
      mineId: dhanbad.id,
      department: 'Mine Safety & Hazard Prevention Cell',
      points: 210,
    }
  });

  const mineManager = await prisma.user.create({
    data: {
      email: 'manager@minesafe.gov',
      name: 'Rajesh Verma',
      passwordHash: pw,
      role: 'MINE_MANAGER',
      badgeNumber: 'MM-01',
      mineId: dhanbad.id,
      department: 'Colliery Management Operations',
      points: 320,
    }
  });

  const corporate = await prisma.user.create({
    data: {
      email: 'corporate@minesafe.gov',
      name: 'Ananya Sen',
      passwordHash: pw,
      role: 'CORPORATE_ADMIN',
      badgeNumber: 'CORP-88',
      department: 'Executive Safety, ESG & Board Governance',
    }
  });

  const regulator = await prisma.user.create({
    data: {
      email: 'regulator@minesafe.gov',
      name: 'Dr. Vikramaditya Singh',
      passwordHash: pw,
      role: 'REGULATOR',
      badgeNumber: 'DGMS-NZ-402',
      department: 'Directorate General of Mines Safety (DGMS)',
    }
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@minesafe.gov',
      name: 'Suresh Nambiar',
      passwordHash: pw,
      role: 'SYSTEM_ADMIN',
      badgeNumber: 'SYS-001',
      department: 'Enterprise IT & Cryptographic Systems',
    }
  });

  // 3. Badges for Worker
  await prisma.userBadge.createMany({
    data: [
      { userId: worker.id, badgeCode: 'HAZARD_HUNTER', title: 'Hazard Hunter', icon: '🛡️', description: 'Reported 5+ verified early-stage physical safety hazards' },
      { userId: worker.id, badgeCode: 'EARLY_RISK_REPORTER', title: 'Early Risk Reporter', icon: '🚨', description: 'Prevented secondary machinery damage through rapid reporting' },
      { userId: worker.id, badgeCode: 'SAFETY_CHAMPION', title: 'Safety Champion', icon: '🏆', description: 'Awarded for zero safety violations across 6 consecutive months' }
    ]
  });

  // 4. Recognition points
  await prisma.recognitionPoint.createMany({
    data: [
      { userId: worker.id, pointsAwarded: 20, reason: 'Early identification of damaged cable armor in Shaft 2', verifiedBy: 'Priya Sharma (SO)' },
      { userId: worker.id, pointsAwarded: 15, reason: 'Useful safety suggestion on water misting near haulage transfer point', verifiedBy: 'Rajesh Verma (MM)' },
      { userId: worker.id, pointsAwarded: 40, reason: 'Completed 12 weekly pre-shift safety checklists with 100% precision', verifiedBy: 'Priya Sharma (SO)' },
    ]
  });

  // 5. Safety Reports (including required demo scenario SAFE-2026-00124)
  const report1 = await prisma.safetyReport.create({
    data: {
      id: 'SAFE-2026-00124',
      reporterId: worker.id,
      mineId: dhanbad.id,
      zoneId: dhanbad.zones[0].id, // Section B-12
      category: 'PPE',
      severity: 'HIGH',
      description: 'Multiple self-contained self-rescuer (SCSR) respirators stored in Box 4 had cracked oxygen seals and degraded face masks, exposing extraction crew to asphyxiation risk in case of smoke.',
      immediateActionTaken: 'Flagged box with red warning tag and notified shift mate to withdraw replacement units from refuge chamber.',
      imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80',
      status: 'ASSIGNED',
      assignedOfficer: 'Priya Sharma (Lead SO)',
      rewardPointsAwarded: true,
    }
  });

  const report2 = await prisma.safetyReport.create({
    data: {
      id: 'SAFE-2026-00129',
      reporterId: worker.id,
      mineId: dhanbad.id,
      zoneId: dhanbad.zones[1].id,
      category: 'MACHINERY',
      severity: 'MEDIUM',
      description: 'Conveyor 3 idler roller bearing overheating to 85°C. Excessive friction sparks observed during full coal haulage cycle.',
      immediateActionTaken: 'Applied grease lubricator temporarily and requested belt speed reduction to 1.8 m/s.',
      status: 'SUBMITTED',
      assignedOfficer: 'Priya Sharma',
      rewardPointsAwarded: false,
    }
  });

  const report3 = await prisma.safetyReport.create({
    data: {
      id: 'SAFE-2026-00108',
      reporterId: null, // anonymous
      mineId: eastern.id,
      zoneId: eastern.zones[0].id,
      category: 'VENTILATION',
      severity: 'CRITICAL',
      description: 'Secondary brattice cloth curtain torn near face return airway. Airflow velocity dropped below statutory 0.5 m/s threshold.',
      immediateActionTaken: 'Halted extraction equipment until auxiliary exhaust fan reinstated.',
      status: 'RESOLVED',
      assignedOfficer: 'Amit Sen (SO)',
      rewardPointsAwarded: true,
    }
  });

  // 6. Grievances (including demo scenario GRV-2026-8F4A21)
  const grievance1 = await prisma.grievance.create({
    data: {
      id: 'GRV-2026-8F4A21',
      trackingCode: 'GRV-2026-8F4A21',
      anonymityType: 'ANONYMOUS',
      submitterId: null, // Identity strictly preserved/hidden
      mineId: dhanbad.id,
      category: 'SUPERVISOR_PRESSURE',
      description: 'Shift supervisor pressured team of 8 miners to continue cutting coal despite methane sensor flashing 1.2% CH4 alarm and inadequate water spray. Threat of wage deduction made if daily tonnage not met.',
      status: 'INVESTIGATION_IN_PROGRESS',
      escalationTier: 'MINE_MANAGEMENT',
      timeline: JSON.stringify([
        { step: 'SUBMITTED', time: new Date(Date.now() - 86400000 * 3).toISOString(), note: 'Anonymous submission received via cryptographic gateway' },
        { step: 'UNDER_REVIEW', time: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Validated by Mine Safety Officer; escalated due to severe coercion risk' },
        { step: 'INVESTIGATION_IN_PROGRESS', time: new Date(Date.now() - 86400000 * 1).toISOString(), note: 'Independent inquiry officer assigned; shift supervisor requested for formal deposition' }
      ]),
    }
  });

  const grievance2 = await prisma.grievance.create({
    data: {
      id: 'GRV-2026-C92B15',
      trackingCode: 'GRV-2026-C92B15',
      anonymityType: 'CONFIDENTIAL',
      submitterId: worker.id,
      mineId: dhanbad.id,
      category: 'EQUIPMENT_SAFETY',
      description: 'Roof bolter hydraulic hoses leaking high pressure fluid near operator control cabin without safety sleeving.',
      status: 'ACTION_REQUIRED',
      escalationTier: 'MINE_OFFICER',
      timeline: JSON.stringify([
        { step: 'SUBMITTED', time: new Date(Date.now() - 86400000 * 4).toISOString(), note: 'Confidential report submitted with equipment serial #RB-09' },
        { step: 'ASSIGNED', time: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Mechanical engineering superintendent assigned for sleeve replacement' }
      ]),
    }
  });

  // 7. SOS Alerts (including demo scenario SOS-2026-90412)
  await prisma.sosAlert.create({
    data: {
      id: 'SOS-2026-90412',
      workerIdentifier: 'WORKER-B4109',
      mineId: dhanbad.id,
      zoneId: dhanbad.zones[0].id,
      emergencyType: 'ACCIDENT',
      status: 'ACKNOWLEDGED',
      assignedTeams: 'Rescue Team Bravo, Underground First Aid Squad 2',
      responderNotes: 'Safety officer acknowledged alert within 42 seconds. Medical paramedic equipped with oxygen stretcher descending via Shaft 2.',
      triggeredAt: new Date(Date.now() - 1000 * 60 * 14), // 14 mins ago
    }
  });

  await prisma.sosAlert.create({
    data: {
      id: 'SOS-2026-88102',
      workerIdentifier: 'ANON-TOKEN-77',
      mineId: eastern.id,
      zoneId: eastern.zones[2].id,
      emergencyType: 'GAS_HAZARD',
      status: 'RESOLVED',
      assignedTeams: 'Ventilation Strike Team Alpha',
      responderNotes: 'Auxiliary vent duct repaired, CH4 evacuated below 0.3%. All crew safely sheltered in refuge station.',
      triggeredAt: new Date(Date.now() - 86400000 * 1.5),
      resolvedAt: new Date(Date.now() - 86400000 * 1.2),
    }
  });

  // 8. Inspections (including INS-2026-00071)
  const inspection1 = await prisma.inspection.create({
    data: {
      id: 'INS-2026-00071',
      mineId: dhanbad.id,
      inspectorName: 'Dr. Vikramaditya Singh (DGMS)',
      inspectionType: 'STATUTORY_QUARTERLY',
      checklistData: JSON.stringify([
        { item: 'Main Mechanical Fan static pressure gauge calibrated', passed: true },
        { item: 'Flameproof enclosure seals intact on 3.3kV switchgear', passed: true },
        { item: 'Stone dust barrier quantity per cubic meter compliance', passed: false, note: 'Barrier #4 requires replenishment within 48h' },
        { item: 'Self-rescuer availability 120% of maximum underground shift', passed: true },
        { item: 'Emergency telephone line continuity to surface control', passed: true }
      ]),
      findings: 'Overall ventilation and gas monitoring instrumentation adheres to DGMS Coal Mines Regulations 2017. Minor stone dust deficiency noted in Return Airway 4.',
      violationsCount: 1,
      deadline: new Date(Date.now() + 86400000 * 14),
      status: 'COMPLETED',
      completedAt: new Date(Date.now() - 86400000 * 2),
    }
  });

  // 9. Corrective Actions (including ACT-2026-00042)
  await prisma.correctiveAction.create({
    data: {
      id: 'ACT-2026-00042',
      issueId: 'SAFE-2026-00124',
      issueType: 'SAFETY_REPORT',
      actionRequired: 'Replace all 18 defective SCSR respirators in Box 4 Section B-12 and perform leak-decay calibration test on all refuge stations.',
      responsiblePerson: 'Manish Tiwari (Safety Equipment Custodian)',
      deadline: new Date(Date.now() + 86400000 * 3),
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      evidence: 'Procurement requisition #PR-9920 approved for immediate warehouse dispatch of Draeger Oxybok units.',
    }
  });

  await prisma.correctiveAction.create({
    data: {
      id: 'ACT-2026-00039',
      issueId: 'INS-2026-00071',
      issueType: 'INSPECTION',
      actionRequired: 'Replenish incombustible stone dust barrier in Return Airway 4 to maintain minimum 75% incombustible matter ratio.',
      responsiblePerson: 'Sunil Rao (Underground Safety Foreman)',
      deadline: new Date(Date.now() + 86400000 * 2),
      priority: 'CRITICAL',
      status: 'PENDING',
    }
  });

  // 10. Incidents
  await prisma.incident.create({
    data: {
      id: 'INC-2026-00015',
      incidentType: 'METHANE_SPIKE',
      mineId: dhanbad.id,
      location: 'Longwall Face 4, Section B-12',
      severity: 'SERIOUS',
      description: 'Transient localized methane gas concentration spiked to 1.8% during shearer pass near upper tailgate corner due to roof break.',
      peopleAffected: 0,
      immediateResponse: 'Automated electric interlock tripped power to shearer. Auxiliary booster duct deployed within 4 minutes.',
      rootCause: 'Geological fault fissure release combined with temporary brattice flutter.',
      correctiveActionId: 'ACT-2026-00042',
      status: 'CONTAINED',
      createdAt: new Date(Date.now() - 86400000 * 5),
    }
  });

  // 11. Announcements
  await prisma.announcement.createMany({
    data: [
      {
        mineId: dhanbad.id,
        title: 'Mandatory Quarterly Self-Rescuer Refresher Training',
        content: 'All underground crew members must attend the 45-minute practical donning test at the Safety Center before commencing Friday shifts.',
        priority: 'HIGH'
      },
      {
        mineId: dhanbad.id,
        title: 'DGMS High Monsoon Precautions Circular Issued',
        content: 'Surface water drainage pumps and underground sump levels are operating under Level-2 alert monitoring protocol.',
        priority: 'NORMAL'
      }
    ]
  });

  // 12. Build Tamper-Evident SHA-256 Audit Chain
  console.log('Generating initial cryptographic SHA-256 audit blocks...');

  await AuditService.recordEvent({
    recordType: 'SAFETY_REPORT',
    recordId: report1.id,
    action: 'CREATED',
    performedByRole: 'WORKER',
    data: {
      id: report1.id,
      category: report1.category,
      severity: report1.severity,
      mine: dhanbad.name,
      description: report1.description,
      reportedAt: report1.createdAt
    }
  });

  await AuditService.recordEvent({
    recordType: 'SAFETY_REPORT',
    recordId: report1.id,
    action: 'STATUS_CHANGED',
    performedByRole: 'SAFETY_OFFICER',
    data: {
      id: report1.id,
      status: 'ASSIGNED',
      assignedOfficer: 'Priya Sharma',
      actionPlan: 'Created Corrective Action ACT-2026-00042'
    }
  });

  await AuditService.recordEvent({
    recordType: 'GRIEVANCE',
    recordId: grievance1.id,
    action: 'CREATED',
    performedByRole: 'ANONYMOUS_WORKER',
    data: {
      id: grievance1.id,
      trackingCode: grievance1.trackingCode,
      category: grievance1.category,
      anonymity: 'PRESERVED_TIER_1',
      mineCode: dhanbad.code
    }
  });

  await AuditService.recordEvent({
    recordType: 'GRIEVANCE',
    recordId: grievance1.id,
    action: 'ESCALATED',
    performedByRole: 'SAFETY_OFFICER',
    data: {
      id: grievance1.id,
      escalatedFrom: 'MINE_OFFICER',
      escalatedTo: 'MINE_MANAGEMENT',
      reason: 'Supervisor coercion substantiated'
    }
  });

  await AuditService.recordEvent({
    recordType: 'INSPECTION',
    recordId: inspection1.id,
    action: 'CREATED',
    performedByRole: 'REGULATOR',
    data: {
      id: inspection1.id,
      mine: dhanbad.name,
      inspector: inspection1.inspectorName,
      type: inspection1.inspectionType,
      violations: 1
    }
  });

  await AuditService.recordEvent({
    recordType: 'INSPECTION',
    recordId: inspection1.id,
    action: 'VERIFIED',
    performedByRole: 'REGULATOR',
    data: {
      id: inspection1.id,
      verificationStatus: 'DGMS_SEALED',
      integrityCheckPassed: true
    }
  });

  console.log('Database seeded successfully with demo scenarios and cryptographic chain!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
