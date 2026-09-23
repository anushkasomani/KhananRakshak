import React from 'react';
import {
  Activity,
  Heart,
  Wind,
  Thermometer,
  MapPin,
  Cpu,
  Layers,
  Zap,
  Info,
  Radio,
  ArrowRight,
} from 'lucide-react';

export const FutureHealthMonitoringPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/40 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-purple-950 border border-purple-500/40 text-purple-400">
            <Activity className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-bold text-slate-100">
            Worker Health Monitoring
          </h1>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-600/40">
            USP 5 • FUTURE VERSION
          </span>
        </div>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Architectural blueprint for integrating underground wearable biometrics and atmospheric telemetry via
          LoRaWAN mesh and edge IoT gateways directly into the CoalGuard central compliance hub.
        </p>
      </div>

      {/* Mandatory Regulatory Transparency Notice (Section 6) */}
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3">
        <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-200/90 leading-relaxed">
          <strong className="text-purple-300">Statutory Notice on Biometric Telemetry: </strong>
          In strict accordance with Phase 1 deliverables, wearable physiological sensors and biometric hardware are
          not active in this web MVP. Below is the production architectural interface and data structure prepared for
          future intrinsic-safe Bluetooth Low Energy (BLE) / RFID smart helmets and environmental cap-lamp monitors.
        </div>
      </div>

      {/* Telemetry Architecture Cards (Section 6 Fields) */}
      <div>
        <h2 className="text-sm font-mono uppercase tracking-wider text-purple-400 font-bold mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          Planned Telemetry Ingress Points (Heart Rate | Fatigue | Gas Exposure | Temperature | Location)
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Heart Rate */}
          <div className="cyber-card p-5 border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-purple-950/80 text-purple-400">
                <Heart className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono text-purple-400/80 font-bold">API READY</span>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Telemetry Channel 1</div>
              <h3 className="text-lg font-bold text-slate-100">Heart Rate</h3>
              <div className="text-xs text-slate-500 font-mono mt-1">Expected: 60 - 120 BPM</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Continuous photoplethysmography (PPG) wristband sensor to monitor cardiac stress in high-temperature
              stope faces.
            </p>
          </div>

          {/* Card 2: Fatigue */}
          <div className="cyber-card p-5 border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-purple-950/80 text-purple-400">
                <Zap className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono text-purple-400/80 font-bold">API READY</span>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Telemetry Channel 2</div>
              <h3 className="text-lg font-bold text-slate-100">Fatigue Index</h3>
              <div className="text-xs text-slate-500 font-mono mt-1">Score: 0 - 100 Index</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Micro-motion accelerometry calculating worker exertion, rest periods, and posture shifts during longwall
              cutting.
            </p>
          </div>

          {/* Card 3: Gas Exposure */}
          <div className="cyber-card p-5 border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-purple-950/80 text-purple-400">
                <Wind className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono text-purple-400/80 font-bold">API READY</span>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Telemetry Channel 3</div>
              <h3 className="text-lg font-bold text-slate-100">Gas Exposure</h3>
              <div className="text-xs text-slate-500 font-mono mt-1">CH4, CO, H2S PPM</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Cap-lamp electrochemical gas cell detecting localized methane build-up (&gt;0.75%) before area sensors
              react.
            </p>
          </div>

          {/* Card 4: Temperature */}
          <div className="cyber-card p-5 border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-purple-950/80 text-purple-400">
                <Thermometer className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono text-purple-400/80 font-bold">API READY</span>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Telemetry Channel 4</div>
              <h3 className="text-lg font-bold text-slate-100">Temperature</h3>
              <div className="text-xs text-slate-500 font-mono mt-1">Wet-Bulb Globe Temp</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Ambient temperature and humidity telemetry to prevent heat-stroke in deep underground galleries below
              -250m.
            </p>
          </div>

          {/* Card 5: Underground Location */}
          <div className="cyber-card p-5 border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-purple-950/80 text-purple-400">
                <MapPin className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono text-purple-400/80 font-bold">API READY</span>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Telemetry Channel 5</div>
              <h3 className="text-lg font-bold text-slate-100">Zone Beacon</h3>
              <div className="text-xs text-slate-500 font-mono mt-1">Sub-Gallery BLE Nodes</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Proximity beacon trilateration between mine haulage intervals without relying on unviable underground
              GPS.
            </p>
          </div>
        </div>
      </div>

      {/* Future IoT Integration Pipeline Diagram */}
      <div className="cyber-card p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          End-to-End Future IoT Ingestion Pipeline
        </h3>

        <div className="grid md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-purple-400 font-bold">01. Smart Wearable</div>
            <div className="text-slate-300 font-bold">Intrinsic Safe BLE Device</div>
            <div className="text-[11px] text-slate-500">Gathers pulse, ambient methane, and motion frequency.</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-purple-400 font-bold">02. Mine Gateway</div>
            <div className="text-slate-300 font-bold">Underground Fiber Access Node</div>
            <div className="text-[11px] text-slate-500">Transmits packets to surface server via flameproof cables.</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-purple-400 font-bold">03. Ingestion API</div>
            <div className="text-slate-300 font-bold">REST / WebSockets Gateway</div>
            <div className="text-[11px] text-slate-500">Parses telemetry payloads and triggers automated SOS if vital threshold breached.</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-purple-400 font-bold">04. Audit Ledger</div>
            <div className="text-slate-300 font-bold">SHA-256 Chained Hash</div>
            <div className="text-[11px] text-slate-500">Critical events permanently committed to tamper-evident audit history.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
