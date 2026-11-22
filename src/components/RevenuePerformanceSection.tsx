import React, { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildStrategyComparisonBars,
  BusinessEconomicsSummary,
  BusinessInputs,
  formatCurrencyCompact,
  STRATEGY_PROFILES,
} from '../data/businessModel';

interface RevenuePerformanceSectionProps {
  inputs: BusinessInputs;
  economics: BusinessEconomicsSummary;
}

type ChannelScope = 'all' | 'human' | 'ai';

export const RevenuePerformanceSection: React.FC<RevenuePerformanceSectionProps> = ({
  inputs,
  economics,
}) => {
  const [channelScope, setChannelScope] = useState<ChannelScope>('all');

  const strategyComparison = useMemo(() => buildStrategyComparisonBars(inputs), [inputs]);
  const profile = STRATEGY_PROFILES[inputs.strategy];

  return (
    <section id="revenue-performance" className="scroll-mt-20 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Revenue, Call Volume &amp; Floor Performance
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Intraday revenue capture, stacked call volumes, close rates, and average handle time (AHT) under{' '}
            <span className="font-semibold text-slate-900">{profile.shortName}</span>.
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
          {(
            [
              { id: 'all', label: 'All Channels' },
              { id: 'human', label: 'Sales Floor' },
              { id: 'ai', label: 'AI Voice' },
            ] as { id: ChannelScope; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannelScope(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                channelScope === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Intraday Revenue + Call Volume (7 cols) | Strategy Monthly Revenue Comparison (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Intraday Call Volume & Hourly Revenue */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Intraday Call Volume &amp; Hourly Gross Revenue ($)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Stacked outbound call mix (left axis) overlaid with hourly closed-won revenue (right axis).
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700 shrink-0">
              ${economics.dailyRevenueUsd.toLocaleString()} / day
            </span>
          </div>

          <div className="h-[285px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={economics.intradayRows}
                margin={{ top: 10, right: 10, left: -8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis yAxisId="calls" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis
                  yAxisId="rev"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#059669' }}
                  tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => {
                    const num = Number(value ?? 0);
                    const label = String(name ?? '');
                    if (label.includes('Revenue')) return [`$${num.toLocaleString()}`, label];
                    return [num.toLocaleString(), label];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                {(channelScope === 'all' || channelScope === 'human') && (
                  <Bar
                    yAxisId="calls"
                    dataKey="hotHumanCalls"
                    name="Sales Floor · Hot Leads"
                    stackId="calls"
                    fill="#DC2626"
                  />
                )}
                {(channelScope === 'all' || channelScope === 'human') && (
                  <Bar
                    yAxisId="calls"
                    dataKey="coldHumanCalls"
                    name="Sales Floor · Cold Leads"
                    stackId="calls"
                    fill="#64748B"
                  />
                )}
                {(channelScope === 'all' || channelScope === 'ai') && (
                  <Bar
                    yAxisId="calls"
                    dataKey="aiVoiceCalls"
                    name="AI Voice Concierge"
                    stackId="calls"
                    fill="#0284C7"
                    radius={[4, 4, 0, 0]}
                  />
                )}
                <Line
                  yAxisId="rev"
                  type="monotone"
                  dataKey={
                    channelScope === 'human'
                      ? 'humanRevenueUsd'
                      : channelScope === 'ai'
                      ? 'aiRevenueUsd'
                      : 'totalRevenueUsd'
                  }
                  name="Hourly Revenue ($)"
                  stroke="#059669"
                  strokeWidth={2.8}
                  dot={{ r: 3.5, fill: '#059669' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strategy Monthly Revenue & Net Margin Comparison */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Monthly Revenue vs. Net Margin by Strategy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              22-business-day P&amp;L comparison showing why pacing + live coaching unlocks full AI ROI.
            </p>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={strategyComparison}
                margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="strategy" tick={{ fontSize: 10.5, fill: '#475569' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(v) => formatCurrencyCompact(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [
                    `$${Number(value ?? 0).toLocaleString()}`,
                    String(name ?? ''),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                <Bar dataKey="monthlyRevenueUsd" name="Gross Revenue ($)" radius={[4, 4, 0, 0]}>
                  {strategyComparison.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={
                        entry.id === 'paced_ai_nlp'
                          ? '#059669'
                          : entry.id === 'unpaced_ai'
                          ? '#DC2626'
                          : '#64748B'
                      }
                      fillOpacity={entry.id === inputs.strategy ? 1 : 0.45}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="monthlyNetMarginUsd"
                  name="Net Margin ($)"
                  fill="#0F172A"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Est. Cost per Acquisition (CPA)</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              ${economics.costPerAcquisitionUsd.toFixed(2)} / deal
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Close Rates (6 cols) | Average Handle Time & Persistence (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Close Rates */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Close Rate Performance Across the Shift (%)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Opening-shift conversion drops sharply under unpaced AI when reps rush tough calls.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-semibold text-slate-900">
              {economics.blendedCloseRatePct.toFixed(2)}% blended
            </span>
          </div>

          <div className="h-[245px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={economics.intradayRows}
                margin={{ top: 10, right: 16, left: -12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                {(channelScope === 'all' || channelScope === 'human') && (
                  <Line
                    type="monotone"
                    dataKey="humanCloseRatePct"
                    name="Sales Floor Close %"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 3.5 }}
                  />
                )}
                {channelScope === 'all' && (
                  <Line
                    type="monotone"
                    dataKey="blendedCloseRatePct"
                    name="Overall Close %"
                    stroke="#0F172A"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                )}
                {(channelScope === 'all' || channelScope === 'ai') && (
                  <Line
                    type="monotone"
                    dataKey="aiCloseRatePct"
                    name="AI Voice Close %"
                    stroke="#0284C7"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Handle Time (AHT) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Average Handle Time (Seconds) &amp; Rep Persistence
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultative closing requires ~55–65s on opening hot calls; drops below 54s signal premature hang-ups.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-semibold text-slate-900">
              {economics.avgHumanAhtSec}s rep avg
            </span>
          </div>

          <div className="h-[245px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={economics.intradayRows}
                margin={{ top: 10, right: 16, left: -12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="s" domain={[0, 80]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                <ReferenceLine
                  y={55}
                  stroke="#94A3B8"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Target Consultative AHT (55s)',
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#64748B',
                  }}
                />
                {(channelScope === 'all' || channelScope === 'human') && (
                  <Area
                    type="monotone"
                    dataKey="humanAhtSec"
                    name="Sales Floor AHT (s)"
                    stroke="#D97706"
                    fill="#D97706"
                    fillOpacity={0.12}
                    strokeWidth={2.4}
                  />
                )}
                {(channelScope === 'all' || channelScope === 'ai') && (
                  <Line
                    type="monotone"
                    dataKey="aiAhtSec"
                    name="AI Voice AHT (s)"
                    stroke="#0284C7"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 2.5 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Compact Executive Hourly P&L & Telemetry Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Hourly Revenue, Volume &amp; Handle-Time Ledger
          </h3>
          <span className="text-xs text-slate-500">
            {economics.dailyDealsClosed.toLocaleString()} daily deals · $
            {economics.dailyRevenueLostToHandBacksUsd.toLocaleString()}/day revenue leakage from hand-backs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Hour</th>
                <th className="py-2.5 px-4">Shift Stage</th>
                <th className="py-2.5 px-4 text-right">Hot (Rep)</th>
                <th className="py-2.5 px-4 text-right">AI Voice</th>
                <th className="py-2.5 px-4 text-right">Close Rate</th>
                <th className="py-2.5 px-4 text-right">Rep AHT</th>
                <th className="py-2.5 px-4 text-right">Hand-Back %</th>
                <th className="py-2.5 px-4 text-right">Hourly Revenue</th>
                <th className="py-2.5 px-4 text-right">Revenue at Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
              {economics.intradayRows.map((row) => (
                <tr key={row.hour} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">{row.hour}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">{row.shiftStage}</td>
                  <td className="py-2.5 px-4 text-right text-red-700">
                    {row.hotHumanCalls.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-sky-700">
                    {row.aiVoiceCalls.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                    {row.blendedCloseRatePct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-700">{row.humanAhtSec}s</td>
                  <td
                    className={`py-2.5 px-4 text-right font-semibold ${
                      row.handBackRatePct > 28 ? 'text-amber-700' : 'text-slate-600'
                    }`}
                  >
                    {row.handBackRatePct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                    ${row.totalRevenueUsd.toLocaleString()}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right ${
                      row.revenueAtRiskUsd > 800 ? 'text-red-700 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    ${row.revenueAtRiskUsd.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
