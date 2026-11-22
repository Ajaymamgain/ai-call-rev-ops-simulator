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
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, SlidersHorizontal, TrendingUp } from 'lucide-react';
import {
  buildRhythmYieldCurve,
  CALIBRATED_PARAMS,
  runShiftSimulation,
} from '../data/researchModel';

type ProfileMetric = 'conversion' | 'reallocation' | 'reservation';

export const ShiftRhythmLab: React.FC = () => {
  const [alphaHotShare, setAlphaHotShare] = useState<number>(CALIBRATED_PARAMS.ALPHA_POST);
  const [rhythmPhi, setRhythmPhi] = useState<number>(CALIBRATED_PARAMS.PHI_PRE);
  const [guardrailStrength, setGuardrailStrength] = useState<number>(0.6);
  const [dailyHumanCalls, setDailyHumanCalls] = useState<number>(5000);
  const [avgPolicyValueUsd, setAvgPolicyValueUsd] = useState<number>(420);
  const [profileMetric, setProfileMetric] = useState<ProfileMetric>('conversion');

  const simulation = useMemo(
    () =>
      runShiftSimulation({
        alphaHotShare,
        rhythmPhi,
        guardrailStrength,
        dailyHumanCalls,
        avgPolicyValueUsd,
      }),
    [alphaHotShare, rhythmPhi, guardrailStrength, dailyHumanCalls, avgPolicyValueUsd]
  );

  const yieldCurve = useMemo(
    () => buildRhythmYieldCurve(alphaHotShare, guardrailStrength),
    [alphaHotShare, guardrailStrength]
  );

  const decompositionData = useMemo(
    () => [
      {
        name: 'Ordering Channel',
        value: simulation.orderingEffectPct,
        fill: '#0284C7',
      },
      {
        name: 'Conduct Effect',
        value: simulation.conductEffectPct,
        fill: simulation.conductEffectPct >= 0 ? '#059669' : '#DC2626',
      },
      {
        name: 'Net Hot Yield Δ',
        value: Number((simulation.orderingEffectPct + simulation.conductEffectPct).toFixed(2)),
        fill:
          simulation.orderingEffectPct + simulation.conductEffectPct >= 0 ? '#059669' : '#0F172A',
      },
    ],
    [simulation.orderingEffectPct, simulation.conductEffectPct]
  );

  const applyPreset = (preset: 'pre_ai' | 'naive_backfire' | 'revops_target') => {
    if (preset === 'pre_ai') {
      setAlphaHotShare(0.606);
      setRhythmPhi(0.10);
      setGuardrailStrength(0);
    } else if (preset === 'naive_backfire') {
      setAlphaHotShare(0.646);
      setRhythmPhi(0.22);
      setGuardrailStrength(0);
    } else {
      setAlphaHotShare(0.646);
      setRhythmPhi(0.10);
      setGuardrailStrength(0.75);
    }
  };

  const isBackfireZone = rhythmPhi >= 0.17 && guardrailStrength < 0.35;

  return (
    <div className="space-y-6">
      {/* Header + Presets */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Behavioral Shift &amp; Rhythm Counterfactual Lab
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Calibrated on Table F1 &amp; Appendix F.5 of Fu et al. (2026). Adjust hot-lead pool enrichment (α), within-day front-loading rhythm (φ), and reallocation guardrails to eliminate the early-shift reservation-value pullback without rolling back AI.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => applyPreset('pre_ai')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white hover:text-slate-900 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            Pre-AI (φ=0.10)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('naive_backfire')}
            className="px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-white rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            Post-AI Backfire (φ=0.22)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('revops_target')}
            className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-white shadow-2xs rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            RevOps Optimal (φ=0.10 + NLP)
          </button>
        </div>
      </div>

      {/* 4-Column Tabular KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Firm Conversions / Call</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono tabular-nums font-semibold text-slate-900">
              {simulation.firmConvPerCallPct.toFixed(2)}%
            </span>
            <span
              className={`text-xs font-mono tabular-nums font-semibold ${
                simulation.liftVsNaivePct >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {simulation.liftVsNaivePct >= 0 ? '+' : ''}
              {simulation.liftVsNaivePct.toFixed(1)}% vs Naive AI
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
            Naive AI baseline: {simulation.naiveFirmConvPerCallPct.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Human Hot-Lead Yield</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono tabular-nums font-semibold text-slate-900">
              {simulation.humanHotYieldPct.toFixed(2)}%
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              α = {(alphaHotShare * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
            Study pre/post: 4.52% → 3.75% (-17.0%)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Early-Shift Reallocation (Pos 1–3)</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-mono tabular-nums font-semibold ${
                simulation.earlyReallocRatePct > 32 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {simulation.earlyReallocRatePct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              {simulation.earlyReallocRatePct > 32 ? 'Elevated release' : 'Contained'}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
            Study jump: 24.3% → 38.9% (+8.1 pp RDiT)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Daily Revenue Delta vs Naive AI</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-mono tabular-nums font-semibold ${
                simulation.dailyDeltaRevenueVsNaiveUsd >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {simulation.dailyDeltaRevenueVsNaiveUsd >= 0 ? '+' : '-'}$
              {Math.abs(simulation.dailyDeltaRevenueVsNaiveUsd).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">/day</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
            {simulation.dailyConversions.toLocaleString()} daily closes · $
            {simulation.dailyRevenueUsd.toLocaleString()} total
          </div>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Primary Charts on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Parameter Controls */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">RevOps Policy Levers</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">T = 50 calls/day</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="alpha-slider" className="font-medium text-slate-700">
                Hot-Lead Pool Share (α)
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {(alphaHotShare * 100).toFixed(1)}%
              </span>
            </div>
            <input
              id="alpha-slider"
              type="range"
              min={0.4}
              max={0.9}
              step={0.01}
              value={alphaHotShare}
              onChange={(e) => setAlphaHotShare(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>40% Mixed</span>
              <span>64.6% Post-AI</span>
              <span>90% AI Absorbed</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="phi-slider" className="font-medium text-slate-700">
                Within-Day Rhythm (φ)
              </label>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  rhythmPhi >= 0.17 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                φ = {rhythmPhi.toFixed(2)}
              </span>
            </div>
            <input
              id="phi-slider"
              type="range"
              min={0.06}
              max={0.26}
              step={0.01}
              value={rhythmPhi}
              onChange={(e) => setRhythmPhi(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>0.06 Flat</span>
              <span>0.10 Pre-AI</span>
              <span>0.22 Front-Loaded</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="guardrail-slider" className="font-medium text-slate-700">
                Reallocation Guardrail &amp; NLP Co-Pilot
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {Math.round(guardrailStrength * 100)}%
              </span>
            </div>
            <input
              id="guardrail-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={guardrailStrength}
              onChange={(e) => setGuardrailStrength(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-slate-500">
              Combines early-shift release cooldowns, credit-sharing on reallocated wins, and live NLP objection rebuttals.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            <div className="space-y-1">
              <label htmlFor="daily-calls" className="text-[11px] font-medium text-slate-600">
                Daily Human Calls
              </label>
              <input
                id="daily-calls"
                type="number"
                min={500}
                max={30000}
                step={500}
                value={dailyHumanCalls}
                onChange={(e) => setDailyHumanCalls(Math.max(500, Number(e.target.value) || 5000))}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="avg-premium" className="text-[11px] font-medium text-slate-600">
                Avg Policy Value ($)
              </label>
              <input
                id="avg-premium"
                type="number"
                min={50}
                max={5000}
                step={20}
                value={avgPolicyValueUsd}
                onChange={(e) => setAvgPolicyValueUsd(Math.max(50, Number(e.target.value) || 420))}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md text-slate-900"
              />
            </div>
          </div>

          {/* Live Diagnostic Verdict */}
          <div
            className={`rounded-lg border p-3.5 text-xs leading-relaxed ${
              isBackfireZone
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-start gap-2">
              {isBackfireZone ? (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">
                  {isBackfireZone
                    ? 'Behavioral Backfire Detected'
                    : 'Calm-Rhythm AI Operating Zone'}
                </div>
                <p className="mt-1 opacity-90">
                  {isBackfireZone
                    ? 'Front-loading hot leads (φ ≥ 0.17) raises agents’ early-shift reservation value, triggering premature reallocation and shorter calls that erase mechanical pool gains.'
                    : 'Easing φ toward 0.10 while keeping AI on cold leads recovers +13.5% conversions per call (95% CI: 10.5%–16.6%) inside observed empirical support.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Chart: Within-Day Position Profile */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Within-Day Call-Attempt Position Profile (Bins 1–3 to 81–120)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Position-graded behavioral response: strongest at early positions when many future opportunities remain.
              </p>
            </div>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
              {(
                [
                  { id: 'conversion', label: 'Conversion %' },
                  { id: 'reallocation', label: 'Reallocation %' },
                  { id: 'reservation', label: 'Res. Value Risk' },
                ] as { id: ProfileMetric; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProfileMetric(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    profileMetric === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {profileMetric === 'conversion' ? (
                <LineChart data={simulation.bins} margin={{ top: 10, right: 16, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569' }}
                    unit="%"
                    domain={[0, 12]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="convPreAi"
                    name="Pre-AI Baseline"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="convNaiveAi"
                    name="Naive Parallel AI (φ=0.22)"
                    stroke="#DC2626"
                    strokeWidth={2}
                    dot={{ r: 3.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="convSimulated"
                    name="Your RevOps Policy"
                    stroke="#059669"
                    strokeWidth={2.8}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              ) : profileMetric === 'reallocation' ? (
                <LineChart data={simulation.bins} margin={{ top: 10, right: 16, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="%" domain={[0, 48]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="reallocPreAi"
                    name="Pre-AI Reallocation"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reallocNaiveAi"
                    name="Naive AI Reallocation (Surge)"
                    stroke="#D97706"
                    strokeWidth={2.2}
                    dot={{ r: 3.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reallocSimulated"
                    name="Your RevOps Policy"
                    stroke="#0284C7"
                    strokeWidth={2.8}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={simulation.bins} margin={{ top: 10, right: 16, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="reservationValueIndex"
                    name="Outside-Option Reservation Index (0-100)"
                    radius={[4, 4, 0, 0]}
                  >
                    {simulation.bins.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.reservationValueIndex >= 70
                            ? '#DC2626'
                            : entry.reservationValueIndex >= 50
                            ? '#D97706'
                            : '#0284C7'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom 2-Column Analytical Pair: Counterfactual Yield Curve + Decomposition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Counterfactual Firm Yield vs Rhythm phi (Figure F1 Panel b) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Counterfactual Firm Yield vs. Shift Rhythm (Figure F1)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Yield declines monotonically across observed support [φ=0.10, φ=0.22]. Easing rhythm recovers +13.5% conversions/call.
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yieldCurve} margin={{ top: 12, right: 16, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="phiLabel"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  label={{ value: 'Within-day rhythm φ (>0 front-loaded)', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#64748B' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#475569' }}
                  unit="%"
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <ReferenceArea
                  x1="0.10"
                  x2="0.22"
                  fill="#0284C7"
                  fillOpacity={0.07}
                  label={{ value: 'Observed Support', position: 'insideTopRight', fontSize: 10, fill: '#0369A1' }}
                />
                <ReferenceLine
                  x={rhythmPhi.toFixed(2)}
                  stroke="#0F172A"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{ value: `Active φ=${rhythmPhi.toFixed(2)}`, position: 'top', fontSize: 10, fill: '#0F172A' }}
                />
                <Area
                  type="monotone"
                  dataKey="ciUpper"
                  stroke="none"
                  fill="#0284C7"
                  fillOpacity={0.12}
                  name="95% Bootstrap Upper"
                />
                <Line
                  type="monotone"
                  dataKey="yieldPerCall"
                  name="Firm Yield (% / call)"
                  stroke="#0284C7"
                  strokeWidth={2.6}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yield Channel Decomposition (Table 6 Panel B) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Hot-Lead Yield Decomposition (Table 6)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Separating mechanical lead-ordering improvement from endogenous human conduct response.
            </p>
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decompositionData} margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="%" domain={[-20, 8]} />
                <ReferenceLine y={0} stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" name="Yield Change (%)" radius={[4, 4, 0, 0]}>
                  {decompositionData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 leading-relaxed">
            In the raw study deployment (φ=0.22, no guardrails), the behavioral conduct pullback (<span className="font-mono font-semibold text-red-700">-17.58%</span>) was roughly <span className="font-semibold text-slate-900">30× larger</span> than the mechanical ordering gain (<span className="font-mono font-semibold text-sky-700">+0.58%</span>).
          </div>
        </div>
      </div>
    </div>
  );
};
