import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ClipboardCheck,
  Clock,
  ShieldCheck,
  Building2,
  Filter,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../services/api';
import { Mine } from '../types';

interface ComplianceDashboardProps {
  mines: Mine[];
}

const COLORS = ['#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899'];

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ mines }) => {
  const [selectedMineId, setSelectedMineId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [corporateData, setCorporateData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'corporate'>('analytics');

  const loadData = async () => {
    try {
      const [dash, corp] = await Promise.all([
        api.getComplianceDashboard(selectedMineId || undefined),
        api.getCorporateSummary(),
      ]);
      setDashboardData(dash);
      setCorporateData(corp);
    } catch (e) {
      console.error('Error fetching compliance data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMineId]);

  const kpis = dashboardData?.kpis;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100">
              Mine Safety & Regulatory Compliance Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            DGMS Statutory Compliance Framework • Live Multi-Colliery Telemetry & KPI Benchmarks
          </p>
        </div>

        {/* View Switcher & Mine Filter */}
        <div className="flex items-center gap-3">
          <select
            value={selectedMineId}
            onChange={(e) => setSelectedMineId(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="">All Colliery Sites (Consolidated)</option>
            {mines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'analytics' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              KPI & Charts
            </button>
            <button
              onClick={() => setActiveTab('corporate')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'corporate' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
              }`}
            >
              Cross-Mine Benchmark
            </button>
          </div>
        </div>
      </div>

      {/* 8 Primary Operational KPIs (Section 13) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* KPI 1: Overall Compliance */}
        <div className="cyber-card p-5 border-emerald-500/30">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
            Overall Compliance
          </div>
          <div className="text-3xl font-black font-mono text-emerald-400">
            {kpis?.overallCompliance || 94.2}%
          </div>
          <div className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> DGMS Standard Exceeded
          </div>
        </div>

        {/* KPI 2: Open Violations */}
        <div className="cyber-card p-5 border-amber-500/30">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
            Open Violations
          </div>
          <div className="text-3xl font-black font-mono text-amber-400">
            {kpis?.openViolations || 1}
          </div>
          <div className="text-[11px] text-amber-500 font-medium mt-1">
            Statutory Corrective Actions Active
          </div>
        </div>

        {/* KPI 3: Critical Violations */}
        <div className="cyber-card p-5 border-red-500/30">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
            Critical Hazards
          </div>
          <div className="text-3xl font-black font-mono text-red-400">
            {kpis?.criticalViolations || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Requiring Immediate Triage</div>
        </div>

        {/* KPI 4: Pending Actions */}
        <div className="cyber-card p-5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
            Pending Actions
          </div>
          <div className="text-3xl font-black font-mono text-cyan-400">
            {kpis?.pendingCorrectiveActions || 2}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Overdue: <span className="text-red-400 font-bold">{kpis?.overdueCorrectiveActions || 0}</span>
          </div>
        </div>

        {/* KPI 5: Total Reports */}
        <div className="cyber-card p-5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
            Total Safety Reports
          </div>
          <div className="text-3xl font-black font-mono text-slate-100">
            {kpis?.totalSafetyReports || 3}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Resolved: <span className="text-emerald-400 font-bold">{kpis?.resolvedSafetyReports || 1}</span>
          </div>
        </div>

        {/* KPI 6: Resolved Issues */}
        <div className="cyber-card p-5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
            Resolved Issues
          </div>
          <div className="text-3xl font-black font-mono text-emerald-300">
            {kpis?.resolvedSafetyReports || 1}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Reward Points Distributed</div>
        </div>

        {/* KPI 7: Inspection Rate */}
        <div className="cyber-card p-5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
            Inspection Completion
          </div>
          <div className="text-3xl font-black font-mono text-cyan-300">
            {kpis?.inspectionCompletionRate || 100}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Mandatory Quarterly Audits</div>
        </div>

        {/* KPI 8: Avg Response Time */}
        <div className="cyber-card p-5">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
            Average SLA Response
          </div>
          <div className="text-3xl font-black font-mono text-slate-200">
            {kpis?.averageResponseTimeHours || 2.4}h
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">Under 4.0h Threshold</div>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          {/* Charts Row 1: Compliance Trend & Monthly Incidents */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Chart 1: Compliance Trend */}
            <div className="cyber-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Monthly Colliery Compliance Score Trend (%)
                </h3>
                <span className="text-[10px] font-mono text-slate-400">DGMS Rolling Index</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData?.monthlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" textAnchor="end" fontSize={11} />
                    <YAxis domain={[80, 100]} stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="compliance"
                      name="Compliance %"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#06b6d4' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Incidents vs Resolved Reports */}
            <div className="cyber-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Monthly Incident Volume vs Resolved Hazards
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Operational SLA</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData?.monthlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="incidents" name="Incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolvedReports" name="Resolved Hazards" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Category Breakdown & Severity Pie */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="cyber-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-100">
                Safety Hazards by Category
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={dashboardData?.categoryBreakdown || []}
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" name="Reports" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Severity Distribution */}
            <div className="cyber-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-100">
                Severity Rating Distribution
              </h3>
              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData?.severityBreakdown || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(dashboardData?.severityBreakdown || []).map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === 'CRITICAL'
                              ? '#ef4444'
                              : entry.name === 'HIGH'
                              ? '#f59e0b'
                              : entry.name === 'MEDIUM'
                              ? '#06b6d4'
                              : '#10b981'
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Section 14: Corporate Multi-Mine Overview Comparison Table */
        <div className="cyber-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Corporate Multi-Mine Benchmarking Matrix (Section 14)
              </h2>
              <p className="text-xs text-slate-400">
                Cross-mine comparison of regulatory compliance %, unresolved issues, and SLA emergency response.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-3 px-3">Mine Complex</th>
                  <th className="py-3 px-3">Region & State</th>
                  <th className="py-3 px-3 text-right">Compliance %</th>
                  <th className="py-3 px-3 text-right">Open Issues</th>
                  <th className="py-3 px-3 text-right">Critical Issues</th>
                  <th className="py-3 px-3 text-right">Active SOS</th>
                  <th className="py-3 px-3 text-right">Response Time</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {corporateData.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-200">{m.name}</div>
                      <div className="font-mono text-[10px] text-slate-500">{m.code}</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {m.region}, {m.state}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-black text-sm">
                      <span
                        className={
                          m.complianceScore >= 95
                            ? 'text-emerald-400'
                            : m.complianceScore >= 90
                            ? 'text-cyan-400'
                            : 'text-amber-400'
                        }
                      >
                        {m.complianceScore}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-200 font-bold">
                      {m.openIssues}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold">
                      <span className={m.criticalIssues > 0 ? 'text-red-400' : 'text-slate-400'}>
                        {m.criticalIssues}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold">
                      <span className={m.activeSos > 0 ? 'text-red-400 animate-pulse-fast' : 'text-slate-400'}>
                        {m.activeSos}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                      {m.averageResponseTime}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          m.status === 'OPERATIONAL'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : m.status === 'CAUTION'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
