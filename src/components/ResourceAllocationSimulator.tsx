import React, { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  DollarSign,
  Gauge,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  BusinessInputs,
  calculateBusinessEconomics,
  formatCurrencyCompact,
} from '../data/businessModel';
import {
  computeResourceAllocation,
  ResourceAllocationMetrics,
} from '../data/resourceModel';

interface ResourceAllocationSimulatorProps {
  agentCount: number;
  monthlyTrainingBudgetUsd: number;
  onAgentCountChange: (count: number) => void;
  onTrainingBudgetChange: (budgetUsd: number) => void;
  inputs: BusinessInputs;
  metrics: ResourceAllocationMetrics;
}

const RESOURCE_PRESETS = [
  {
    id: 'lean',
    label: 'Lean Floor (54 Reps · $6K)',
    agentCount: 54,
    monthlyTrainingBudgetUsd: 6000,
  },
  {
    id: 'balanced',
    label: 'Optimal Balance (72 Reps · $14K)',
    agentCount: 72,
    monthlyTrainingBudgetUsd: 14000,
  },
  {
    id: 'high_touch',
    label: 'High-Touch Buffer (102 Reps · $28K)',
    agentCount: 102,
    monthlyTrainingBudgetUsd: 28000,
  },
];

export const ResourceAllocationSimulator: React.FC<ResourceAllocationSimulatorProps> = ({
  agentCount,
  monthlyTrainingBudgetUsd,
  onAgentCountChange,
  onTrainingBudgetChange,
  inputs,
  metrics,
}) => {
  // Chart 1: Sweep Agent Count (30 -> 130) to show Utilization (%) vs Human Cost Per Call ($)
  const headcountCurve = useMemo(() => {
    const counts = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];
    return counts.map((c) => {
      const m = computeResourceAllocation({
        agentCount: c,
        monthlyTrainingBudgetUsd,
        dailyLeads: inputs.dailyLeads,
        hotLeadSharePct: inputs.hotLeadSharePct,
        strategy: inputs.strategy,
      });
      return {
        agents: c,
        utilizationPct: m.salesFloorUtilizationPct,
        costPerCallUsd: m.humanCostPerCallUsd,
      };
    });
  }, [monthlyTrainingBudgetUsd, inputs.dailyLeads, inputs.hotLeadSharePct, inputs.strategy]);

  // Chart 2: Sweep Monthly Training Budget ($0 -> $40K) to show Cost/Call ($) vs Monthly Net Margin ($)
  const trainingCurve = useMemo(() => {
    const budgets = [0, 4000, 8000, 12000, 16000, 20000, 24000, 30000, 36000, 40000];
    return budgets.map((b) => {
      const m = computeResourceAllocation({
        agentCount,
        monthlyTrainingBudgetUsd: b,
        dailyLeads: inputs.dailyLeads,
        hotLeadSharePct: inputs.hotLeadSharePct,
        strategy: inputs.strategy,
      });
      const econ = calculateBusinessEconomics({
        ...inputs,
        floorOccupancyPct: m.salesFloorUtilizationPct,
        humanCostPerCallUsd: m.humanCostPerCallUsd,
      });
      // Training also gently improves human close consistency on top of reduced overflow
      const trainCloseLift = 1 + 0.08 * (1 - Math.exp(-(b / Math.max(1, agentCount)) / 260));
      const monthlyNetMarginUsd = Math.round(
        (econ.dailyRevenueUsd * trainCloseLift - econ.dailyOperatingCostUsd) * 22
      );
      return {
        budgetK: b / 1000,
        label: `$${b / 1000}K`,
        costPerCallUsd: m.humanCostPerCallUsd,
        utilizationPct: m.salesFloorUtilizationPct,
        monthlyNetMarginUsd,
      };
    });
  }, [agentCount, inputs]);

  const activePresetId = RESOURCE_PRESETS.find(
    (p) =>
      p.agentCount === agentCount && p.monthlyTrainingBudgetUsd === monthlyTrainingBudgetUsd
  )?.id;

  const statusTone =
    metrics.utilizationStatus === 'Overloaded'
      ? 'text-red-700'
      : metrics.utilizationStatus === 'Peak Load'
      ? 'text-amber-700'
      : metrics.utilizationStatus === 'Optimal Band'
      ? 'text-emerald-700'
      : 'text-sky-700';

  return (
    <section id="resource-allocation" className="scroll-mt-20 space-y-5">
      {/* Section Header + Presets */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Resource Allocation Simulator
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Adjust active sales headcount and monthly training budget to see live impacts on Sales Floor Utilization and Human Cost Per Call—automatically synced to all Revenue KPIs, Profit Sensitivity, and the Live Floor above.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            {RESOURCE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onAgentCountChange(preset.agentCount);
                  onTrainingBudgetChange(preset.monthlyTrainingBudgetUsd);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activePresetId === preset.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              onAgentCountChange(72);
              onTrainingBudgetChange(14000);
            }}
            title="Reset staffing & training"
            aria-label="Reset staffing & training"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Controls + Live Derived Impact Strip */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Sliders (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="resource-agent-count"
                  className="inline-flex items-center gap-1.5 font-semibold text-slate-900"
                >
                  <Users className="w-4 h-4 text-slate-600" />
                  Sales Floor Agent Count
                </label>
                <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                  {agentCount} reps
                </span>
              </div>
              <input
                id="resource-agent-count"
                type="range"
                min={30}
                max={130}
                step={1}
                value={agentCount}
                onChange={(e) => onAgentCountChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
                <span>Capacity: {metrics.totalFloorCapacityCalls.toLocaleString()} calls/day</span>
                <span>{metrics.callsPerAgentCapacity} calls/rep</span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="resource-training-budget"
                  className="inline-flex items-center gap-1.5 font-semibold text-slate-900"
                >
                  <GraduationCap className="w-4 h-4 text-slate-600" />
                  Monthly Training &amp; Coaching Budget
                </label>
                <span className="font-mono tabular-nums text-sm font-semibold text-emerald-700">
                  ${monthlyTrainingBudgetUsd.toLocaleString()}/mo
                </span>
              </div>
              <input
                id="resource-training-budget"
                type="range"
                min={0}
                max={40000}
                step={1000}
                value={monthlyTrainingBudgetUsd}
                onChange={(e) => onTrainingBudgetChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
                <span>${metrics.trainingPerAgentMonthlyUsd}/rep/mo invested</span>
                <span className="text-emerald-700 font-medium">
                  +{metrics.trainingProductivityGainPct}% handle capacity
                </span>
              </div>
            </div>
          </div>

          {/* Live Output Telemetry Cards (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">Sales Floor Utilization</span>
                <Gauge className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl font-mono tabular-nums font-semibold text-slate-900">
                    {metrics.salesFloorUtilizationPct}%
                  </span>
                  <span className={`text-xs font-semibold ${statusTone}`}>
                    {metrics.utilizationStatus}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      metrics.salesFloorUtilizationPct >= 92
                        ? 'bg-red-600'
                        : metrics.salesFloorUtilizationPct >= 85
                        ? 'bg-amber-500'
                        : metrics.salesFloorUtilizationPct >= 68
                        ? 'bg-emerald-600'
                        : 'bg-sky-600'
                    }`}
                    style={{ width: `${metrics.salesFloorUtilizationPct}%` }}
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-600 leading-snug">
                {metrics.overflowCallsPerDay > 0 ? (
                  <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {metrics.overflowCallsPerDay.toLocaleString()} human calls/day spilling into AI overflow.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    All {metrics.handledHumanCallsPerDay.toLocaleString()} target human calls absorbed cleanly.
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">Human Cost Per Call</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono tabular-nums font-semibold text-slate-900">
                    ${metrics.humanCostPerCallUsd.toFixed(2)}
                  </span>
                  <span className="text-xs font-mono text-slate-500">vs. $0.06 AI call</span>
                </div>
                <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-500">
                  Payroll ${metrics.dailyPayrollUsd.toLocaleString()}/d · Training $
                  {metrics.dailyTrainingUsd.toLocaleString()}/d
                </div>
              </div>
              <div className="text-[11px] text-slate-600 leading-snug">
                Monthly floor investment:{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrencyCompact(metrics.monthlyTotalHumanOpExUsd)}/mo
                </span>{' '}
                (synced live into KPIs &amp; Profit Sensitivity).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Headcount Curve -> Utilization (%) & Human Cost Per Call ($) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Headcount Impact: Utilization (%) vs. Human Cost Per Call ($)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Fewer reps lower cost/call until utilization hits 92% overflow; excess reps inflate idle cost/call.
              </p>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={headcountCurve}
                margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="agents"
                  type="number"
                  domain={[30, 130]}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(v) => `${v}`}
                />
                <YAxis
                  yAxisId="util"
                  domain={[35, 105]}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  unit="%"
                />
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  domain={[0.5, 4.5]}
                  tick={{ fontSize: 11, fill: '#0F172A' }}
                  tickFormatter={(v) => `$${Number(v).toFixed(1)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(v) => `${v} Sales Reps`}
                  formatter={(value, name) => {
                    const label = String(name ?? '');
                    if (label.includes('Cost')) {
                      return [`$${Number(value ?? 0).toFixed(2)}`, label];
                    }
                    return [`${Number(value ?? 0)}%`, label];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                <ReferenceLine
                  yAxisId="util"
                  y={92}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  label={{ value: '92% Overflow', position: 'insideTopRight', fontSize: 10, fill: '#DC2626' }}
                />
                <ReferenceLine
                  x={agentCount}
                  yAxisId="util"
                  stroke="#0F172A"
                  strokeWidth={1.8}
                  label={{
                    value: `Now (${agentCount})`,
                    position: 'top',
                    fontSize: 10,
                    fill: '#0F172A',
                  }}
                />
                <Area
                  yAxisId="util"
                  type="monotone"
                  dataKey="utilizationPct"
                  name="Sales Floor Utilization (%)"
                  fill="#E0F2FE"
                  stroke="#0284C7"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="cost"
                  type="monotone"
                  dataKey="costPerCallUsd"
                  name="Human Cost Per Call ($)"
                  stroke="#0F172A"
                  strokeWidth={2.4}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Training Budget Curve -> Human Cost Per Call ($) vs Monthly Net Margin ($) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Training Budget Curve: Cost Per Call ($) vs. Monthly Net Margin ($)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Shows how monthly coaching spend reduces overflow and boosts monthly net profit at {agentCount} reps.
              </p>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trainingCurve}
                margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="budgetK"
                  type="number"
                  domain={[0, 40]}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(v) => `$${v}K`}
                />
                <YAxis
                  yAxisId="margin"
                  tick={{ fontSize: 11, fill: '#047857' }}
                  tickFormatter={(v) => formatCurrencyCompact(Number(v))}
                />
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(v) => `$${Number(v)}K / mo Training`}
                  formatter={(value, name) => {
                    const label = String(name ?? '');
                    if (label.includes('Cost')) {
                      return [`$${Number(value ?? 0).toFixed(2)}`, label];
                    }
                    return [`$${Number(value ?? 0).toLocaleString()}`, label];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                <ReferenceLine
                  x={monthlyTrainingBudgetUsd / 1000}
                  yAxisId="margin"
                  stroke="#0F172A"
                  strokeWidth={1.8}
                  label={{
                    value: `Now ($${monthlyTrainingBudgetUsd / 1000}K)`,
                    position: 'top',
                    fontSize: 10,
                    fill: '#0F172A',
                  }}
                />
                <Area
                  yAxisId="margin"
                  type="monotone"
                  dataKey="monthlyNetMarginUsd"
                  name="Monthly Net Margin ($)"
                  fill="#ECFDF5"
                  stroke="#059669"
                  strokeWidth={2.2}
                />
                <Line
                  yAxisId="cost"
                  type="monotone"
                  dataKey="costPerCallUsd"
                  name="Human Cost Per Call ($)"
                  stroke="#D97706"
                  strokeWidth={2.2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
