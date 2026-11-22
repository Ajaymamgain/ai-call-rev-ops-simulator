import React, { useMemo, useState } from 'react';
import {
  Clock,
  DollarSign,
  Download,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  BusinessInputs,
  BusinessStrategy,
  calculateBusinessEconomics,
  formatCurrencyCompact,
  STRATEGY_PROFILES,
} from './data/businessModel';
import { ExecutiveFlowCanvas } from './components/ExecutiveFlowCanvas';
import { ProfitSensitivityTable } from './components/ProfitSensitivityTable';
import { RoutingLogicPanel } from './components/RoutingLogicPanel';
import { RevenuePerformanceSection } from './components/RevenuePerformanceSection';
import { SalesScriptComparisonSection } from './components/SalesScriptComparisonSection';
import { BusinessNlpDesk } from './components/BusinessNlpDesk';
import { ExecutiveRoiMatrix } from './components/ExecutiveRoiMatrix';
import { createDefaultRoutingConfig, RoutingLogicConfig } from './data/routingLogic';

const NAV_LINKS = [
  { href: '#overview', label: 'Revenue KPIs' },
  { href: '#routing-logic', label: 'Routing & Floor' },
  { href: '#revenue-performance', label: 'Performance' },
  { href: '#script-ab', label: 'Script A/B' },
  { href: '#live-nlp', label: 'Live NLP' },
];

export default function App() {
  const [strategy, setStrategy] = useState<BusinessStrategy>('paced_ai_nlp');
  const [dailyLeads, setDailyLeads] = useState<number>(8500);
  const [avgDealValueUsd, setAvgDealValueUsd] = useState<number>(480);
  const [hotLeadSharePct, setHotLeadSharePct] = useState<number>(62);
  const [floorOccupancyPct, setFloorOccupancyPct] = useState<number>(80);
  const [routingConfig, setRoutingConfig] = useState<RoutingLogicConfig>(() =>
    createDefaultRoutingConfig()
  );

  const inputs: BusinessInputs = useMemo(
    () => ({
      strategy,
      dailyLeads,
      avgDealValueUsd,
      hotLeadSharePct,
      floorOccupancyPct,
      aiCostPerCallUsd: 0.06,
      humanCostPerCallUsd: 1.85,
    }),
    [strategy, dailyLeads, avgDealValueUsd, hotLeadSharePct, floorOccupancyPct]
  );

  const economics = useMemo(() => calculateBusinessEconomics(inputs), [inputs]);
  const activeProfile = STRATEGY_PROFILES[strategy];

  const handleExportBoardCsv = () => {
    const header = [
      'Hour',
      'Shift_Stage',
      'Hot_Rep_Calls',
      'Cold_Rep_Calls',
      'AI_Voice_Calls',
      'Blended_Close_Rate_Pct',
      'Rep_AHT_Sec',
      'HandBack_Rate_Pct',
      'Hourly_Revenue_USD',
      'Revenue_At_Risk_USD',
    ];
    const rows = economics.intradayRows.map((r) => [
      r.hour,
      r.shiftStage,
      r.hotHumanCalls,
      r.coldHumanCalls,
      r.aiVoiceCalls,
      r.blendedCloseRatePct,
      r.humanAhtSec,
      r.handBackRatePct,
      r.totalRevenueUsd,
      r.revenueAtRiskUsd,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadenceops_revenue_forecast_${strategy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#overview"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            CadenceOps
          </a>

          {/* Zone 2: 5 Concise Single-Line Section Links */}
          <nav
            aria-label="Dashboard sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleExportBoardCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Revenue CSV
            </button>
          </div>
        </div>
      </header>

      {/* Unified Executive Revenue Operations Dashboard */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-5 sm:px-6 lg:px-8 py-7 space-y-10">
        {/* SECTION 0: Executive Header, Strategy Selector, Business Assumptions & Revenue KPIs */}
        <section id="overview" className="scroll-mt-20 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end justify-between border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                Call Center AI Revenue &amp; Operations Command Center
              </h1>
              <p className="mt-1 text-sm text-slate-600 max-w-3xl">
                Model how routing high-intent hot leads and low-intent cold inquiries across your Sales Floor and AI Voice Concierge impacts daily revenue, net margin, close rates, and handle times.
              </p>
            </div>

            {/* Operating Strategy Segmented Switcher */}
            <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
              {(['human_only', 'unpaced_ai', 'paced_ai_nlp'] as BusinessStrategy[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStrategy(id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    strategy === id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {STRATEGY_PROFILES[id].shortName}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Business Assumptions Bar */}
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-3">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span>Commercial Assumptions</span>
              <span className="font-normal text-slate-400">·</span>
              <span className="font-normal text-slate-500">
                Adjusting any lever recalculates revenue, routing flow, and performance charts live
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="daily-leads-input" className="text-slate-600 font-medium">
                    Daily Outbound Leads
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {dailyLeads.toLocaleString()}
                  </span>
                </div>
                <input
                  id="daily-leads-input"
                  type="range"
                  min={2000}
                  max={20000}
                  step={500}
                  value={dailyLeads}
                  onChange={(e) => setDailyLeads(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="acv-input" className="text-slate-600 font-medium">
                    Average Deal Value (ACV)
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-emerald-700">
                    ${avgDealValueUsd.toLocaleString()}
                  </span>
                </div>
                <input
                  id="acv-input"
                  type="range"
                  min={150}
                  max={1500}
                  step={10}
                  value={avgDealValueUsd}
                  onChange={(e) => setAvgDealValueUsd(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="hot-share-input" className="text-slate-600 font-medium">
                    Hot-Lead Pipeline Mix
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {hotLeadSharePct}% Hot / {100 - hotLeadSharePct}% Cold
                  </span>
                </div>
                <input
                  id="hot-share-input"
                  type="range"
                  min={35}
                  max={85}
                  step={1}
                  value={hotLeadSharePct}
                  onChange={(e) => setHotLeadSharePct(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="floor-occ-input" className="text-slate-600 font-medium">
                    Sales Floor Utilization
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {floorOccupancyPct}%
                  </span>
                </div>
                <input
                  id="floor-occ-input"
                  type="range"
                  min={50}
                  max={100}
                  step={2}
                  value={floorOccupancyPct}
                  onChange={(e) => setFloorOccupancyPct(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* 4-Column Executive Revenue KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Monthly & Daily Revenue */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Projected Monthly Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-mono tabular-nums font-semibold text-slate-900">
                {formatCurrencyCompact(economics.monthlyRevenueUsd)}
              </div>
              <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-500">
                ${economics.dailyRevenueUsd.toLocaleString()}/day · {formatCurrencyCompact(economics.annualRevenueUsd)}/yr
              </div>
            </div>

            {/* KPI 2: Revenue Lift vs Unpaced AI */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Annual Revenue Impact vs. Unpaced AI</span>
                {economics.annualRevenueLiftVsUnpacedUsd >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
              </div>
              <div
                className={`mt-2 text-2xl font-mono tabular-nums font-semibold ${
                  economics.annualRevenueLiftVsUnpacedUsd > 0
                    ? 'text-emerald-700'
                    : economics.annualRevenueLiftVsUnpacedUsd < 0
                    ? 'text-red-700'
                    : 'text-slate-900'
                }`}
              >
                {economics.annualRevenueLiftVsUnpacedUsd > 0 ? '+' : ''}
                {formatCurrencyCompact(economics.annualRevenueLiftVsUnpacedUsd)}
                <span className="text-xs font-normal text-slate-500"> /yr</span>
              </div>
              <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-500">
                {economics.monthlyRevenueLiftVsUnpacedUsd >= 0 ? '+' : ''}
                {formatCurrencyCompact(economics.monthlyRevenueLiftVsUnpacedUsd)}/mo · {activeProfile.cherryPickRiskLevel} cherry-pick risk
              </div>
            </div>

            {/* KPI 3: Daily Net Margin & CPA */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Daily Net Contribution Margin</span>
                <span className="font-mono text-[11px] text-slate-500">
                  CPA ${economics.costPerAcquisitionUsd.toFixed(0)}
                </span>
              </div>
              <div className="mt-2 text-2xl font-mono tabular-nums font-semibold text-slate-900">
                ${economics.dailyNetMarginUsd.toLocaleString()}
              </div>
              <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-500">
                OpEx ${economics.dailyOperatingCostUsd.toLocaleString()}/day · {economics.dailyDealsClosed.toLocaleString()} deals won
              </div>
            </div>

            {/* KPI 4: Close Rate & Handle Time */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Close Rate &amp; Handle Time</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="text-2xl font-mono tabular-nums font-semibold text-slate-900">
                  {economics.blendedCloseRatePct.toFixed(2)}%
                </span>
                <span className="text-sm font-mono tabular-nums text-slate-600">
                  · {economics.avgHumanAhtSec}s AHT
                </span>
              </div>
              <div className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-500">
                Opening hand-backs: {economics.openingHandBackPct}% · {economics.warmTransferDealsClosed} warm transfers/day
              </div>
            </div>
          </div>

          {/* Profit Sensitivity Analysis Table (±5%, ±10%, ±20% ACV & Close Rate) */}
          <ProfitSensitivityTable
            inputs={inputs}
            economics={economics}
            onSelectStrategy={setStrategy}
          />
        </section>

        {/* SECTION 1: Custom Routing Logic Configuration */}
        <RoutingLogicPanel
          inputs={inputs}
          config={routingConfig}
          onChange={setRoutingConfig}
        />

        {/* SECTION 2: Live Animated Hot & Cold Call Routing Flow */}
        <ExecutiveFlowCanvas
          strategy={strategy}
          onStrategyChange={setStrategy}
          routingConfig={routingConfig}
          occupancyPct={floorOccupancyPct}
          hotLeadSharePct={hotLeadSharePct}
          avgDealValueUsd={avgDealValueUsd}
        />

        {/* SECTION 2: Unified Revenue, Call Volume, Close Rate & Handle Time Charts */}
        <RevenuePerformanceSection inputs={inputs} economics={economics} />

        {/* SECTION 3: Sales Script A/B Performance Simulator */}
        <SalesScriptComparisonSection inputs={inputs} />

        {/* SECTION 4: Real-Time Customer NLP Call Simulator */}
        <BusinessNlpDesk strategy={strategy} avgDealValueUsd={avgDealValueUsd} />

        {/* SECTION 5: Executive Operating Playbook */}
        <ExecutiveRoiMatrix economics={economics} />
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            CadenceOps Revenue Operations Simulator · Calibrated on 567,090 real outbound acquisition calls
          </span>
          <div className="flex items-center gap-4">
            <a href="#call-flow" className="hover:text-slate-900 transition-colors">
              Live Floor
            </a>
            <a href="#script-ab" className="hover:text-slate-900 transition-colors">
              Script A/B
            </a>
            <a href="#live-nlp" className="hover:text-slate-900 transition-colors">
              Live NLP Call
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
