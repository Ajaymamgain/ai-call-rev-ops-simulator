import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Clock, DollarSign, FileText, RotateCcw, TrendingUp } from 'lucide-react';
import { BusinessInputs, formatCurrencyCompact } from '../data/businessModel';

interface SalesScriptComparisonSectionProps {
  inputs: BusinessInputs;
}

interface ScriptConfig {
  name: string;
  tag: string;
  conversionRatePct: number;
  avgDurationSec: number;
  openingHook: string;
  objectionPlay: string;
}

interface ScriptPreset {
  id: string;
  label: string;
  variantA: ScriptConfig;
  variantB: ScriptConfig;
}

const SCRIPT_PRESETS: ScriptPreset[] = [
  {
    id: 'speed_vs_consultative',
    label: 'Speed Close vs. Consultative Value',
    variantA: {
      name: 'Variant A · Direct Speed-Close',
      tag: 'High-velocity transactional pitch',
      conversionRatePct: 3.4,
      avgDurationSec: 46,
      openingHook:
        'Hi, I see you left your policy checkout open—can I confirm your card details now so we lock in your quote before it expires?',
      objectionPlay:
        'No problem, I can email the link and move on if now is not a good time.',
    },
    variantB: {
      name: 'Variant B · Consultative Objection Framing',
      tag: 'Discovery-led persistence pitch',
      conversionRatePct: 5.1,
      avgDurationSec: 68,
      openingHook:
        'Hi, I noticed you configured coverage right up to checkout—was there a specific question on waiting periods or monthly billing I can clarify first?',
      objectionPlay:
        'Totally fair—most families prefer splitting this into $42/month with zero installment fee. Let me send the 2-line coverage summary while we review it.',
    },
  },
  {
    id: 'annual_vs_monthly',
    label: 'Annual Upfront vs. Monthly Flexibility',
    variantA: {
      name: 'Variant A · Annual Upfront Offer',
      tag: 'Single lump-sum checkout ask',
      conversionRatePct: 3.1,
      avgDurationSec: 50,
      openingHook:
        'Your annual plan is ready at full yearly rate—would you like to complete the single payment today to activate coverage?',
      objectionPlay:
        'The annual rate is our standard package; let me know if you want a callback next week.',
    },
    variantB: {
      name: 'Variant B · Monthly Installment Anchor',
      tag: 'Low-friction monthly payment framing',
      conversionRatePct: 4.8,
      avgDurationSec: 63,
      openingHook:
        'You can activate your exact coverage today for under $45/month with instant accident protection—want me to switch your saved cart to monthly billing?',
      objectionPlay:
        'You keep full flexibility with zero penalty to switch back to annual later, so your household is covered immediately.',
    },
  },
  {
    id: 'standard_vs_ai_coached',
    label: 'Static Script vs. Live AI-Coached Script',
    variantA: {
      name: 'Variant A · Static Floor Script',
      tag: 'Fixed talk-track, no live prompts',
      conversionRatePct: 3.6,
      avgDurationSec: 52,
      openingHook:
        'Calling from Policy Care regarding your recent online quote. Do you have a quick minute to finish enrollment?',
      objectionPlay:
        'I understand you want to think about it—I will mark your file for follow-up later.',
    },
    variantB: {
      name: 'Variant B · Live NLP-Guided Script',
      tag: 'Dynamic objection cards & proof points',
      conversionRatePct: 5.6,
      avgDurationSec: 71,
      openingHook:
        'I saw you compared our hospital & critical-illness tiers earlier—since you already picked your deductible, let me verify the exact hospital network near you.',
      objectionPlay:
        'Real-time proof card: 98.4% direct-pay approval within 72 hours, plus a 15-day full refund cooling-off guarantee.',
    },
  },
];

export const SalesScriptComparisonSection: React.FC<SalesScriptComparisonSectionProps> = ({
  inputs,
}) => {
  const [presetId, setPresetId] = useState<string>(SCRIPT_PRESETS[0].id);
  const [variantA, setVariantA] = useState<ScriptConfig>(SCRIPT_PRESETS[0].variantA);
  const [variantB, setVariantB] = useState<ScriptConfig>(SCRIPT_PRESETS[0].variantB);
  const [splitBPct, setSplitBPct] = useState<number>(50);

  const applyPreset = (preset: ScriptPreset) => {
    setPresetId(preset.id);
    setVariantA({ ...preset.variantA });
    setVariantB({ ...preset.variantB });
  };

  // Scale addressable floor calls to the human-handled hot/warm pipeline from top-level business inputs
  const addressableDailyCalls = useMemo(() => {
    const hotShare = inputs.hotLeadSharePct / 100;
    return Math.max(400, Math.round(inputs.dailyLeads * (hotShare + 0.12)));
  }, [inputs.dailyLeads, inputs.hotLeadSharePct]);

  const metrics = useMemo(() => {
    const calcVariant = (cfg: ScriptConfig, callsPerDay: number) => {
      const dealsPerDay = (callsPerDay * cfg.conversionRatePct) / 100;
      const dailyRevenueUsd = dealsPerDay * inputs.avgDealValueUsd;
      const monthlyRevenueUsd = dailyRevenueUsd * 22;
      const annualRevenueUsd = dailyRevenueUsd * 260;

      // Productive handle hours (includes 18s average wrap/dial buffer per call)
      const totalSecondsPerCall = cfg.avgDurationSec + 18;
      const dailyRepHours = (callsPerDay * totalSecondsPerCall) / 3600;
      const revenuePerRepHourUsd = dailyRepHours > 0 ? dailyRevenueUsd / dailyRepHours : 0;

      return {
        dealsPerDay: Math.round(dealsPerDay),
        dailyRevenueUsd: Math.round(dailyRevenueUsd),
        monthlyRevenueUsd: Math.round(monthlyRevenueUsd),
        annualRevenueUsd: Math.round(annualRevenueUsd),
        dailyRepHours: Number(dailyRepHours.toFixed(1)),
        revenuePerRepHourUsd: Math.round(revenuePerRepHourUsd),
      };
    };

    // Full rollout (100% A vs 100% B) and current A/B split
    const fullA = calcVariant(variantA, addressableDailyCalls);
    const fullB = calcVariant(variantB, addressableDailyCalls);

    const callsA = Math.round(addressableDailyCalls * ((100 - splitBPct) / 100));
    const callsB = addressableDailyCalls - callsA;
    const splitA = calcVariant(variantA, callsA);
    const splitB = calcVariant(variantB, callsB);
    const blendedMonthlyRevUsd = splitA.monthlyRevenueUsd + splitB.monthlyRevenueUsd;

    const convDeltaPts = Number(
      (variantB.conversionRatePct - variantA.conversionRatePct).toFixed(2)
    );
    const durationDeltaSec = variantB.avgDurationSec - variantA.avgDurationSec;
    const monthlyRevLiftUsd = fullB.monthlyRevenueUsd - fullA.monthlyRevenueUsd;
    const annualRevLiftUsd = fullB.annualRevenueUsd - fullA.annualRevenueUsd;
    const revPerHourDeltaUsd = fullB.revenuePerRepHourUsd - fullA.revenuePerRepHourUsd;

    // Two-proportion z-test confidence over a 5-day A/B test window
    const nA = Math.max(100, callsA * 5);
    const nB = Math.max(100, callsB * 5);
    const pA = variantA.conversionRatePct / 100;
    const pB = variantB.conversionRatePct / 100;
    const pPool = (pA * nA + pB * nB) / (nA + nB);
    const se = Math.sqrt(Math.max(1e-9, pPool * (1 - pPool) * (1 / nA + 1 / nB)));
    const zScore = Math.abs(pB - pA) / se;
    const confidencePct =
      zScore >= 2.58 ? 99 : zScore >= 1.96 ? 95 : zScore >= 1.64 ? 90 : Math.min(89, Math.round(50 + zScore * 24));

    // Shift-stage breakdown (Opening Shift, Midday, Afternoon)
    const shiftStages = [
      { stage: 'Opening Shift (9–11 AM)', multConv: 1.32, multDur: 1.14 },
      { stage: 'Midday (12–2 PM)', multConv: 0.96, multDur: 0.98 },
      { stage: 'Afternoon (3–5 PM)', multConv: 0.74, multDur: 0.88 },
    ].map((s) => ({
      stage: s.stage,
      convA: Number((variantA.conversionRatePct * s.multConv).toFixed(2)),
      convB: Number((variantB.conversionRatePct * s.multConv).toFixed(2)),
      durA: Math.round(variantA.avgDurationSec * s.multDur),
      durB: Math.round(variantB.avgDurationSec * s.multDur),
    }));

    const rolloutComparison = [
      {
        scenario: '100% Variant A',
        monthlyRevenueUsd: fullA.monthlyRevenueUsd,
        revPerHourUsd: fullA.revenuePerRepHourUsd,
        key: 'A',
      },
      {
        scenario: `Active ${100 - splitBPct}/${splitBPct} Test`,
        monthlyRevenueUsd: blendedMonthlyRevUsd,
        revPerHourUsd: Math.round(
          (fullA.revenuePerRepHourUsd * (100 - splitBPct) +
            fullB.revenuePerRepHourUsd * splitBPct) /
            100
        ),
        key: 'AB',
      },
      {
        scenario: '100% Variant B',
        monthlyRevenueUsd: fullB.monthlyRevenueUsd,
        revPerHourUsd: fullB.revenuePerRepHourUsd,
        key: 'B',
      },
    ];

    const winner: 'B' | 'A' | 'TIE' =
      monthlyRevLiftUsd > 0 && revPerHourDeltaUsd >= -5
        ? 'B'
        : monthlyRevLiftUsd < 0
        ? 'A'
        : 'TIE';

    return {
      fullA,
      fullB,
      convDeltaPts,
      durationDeltaSec,
      monthlyRevLiftUsd,
      annualRevLiftUsd,
      revPerHourDeltaUsd,
      confidencePct,
      shiftStages,
      rolloutComparison,
      winner,
    };
  }, [variantA, variantB, addressableDailyCalls, inputs.avgDealValueUsd, splitBPct]);

  return (
    <section id="script-ab" className="scroll-mt-20 space-y-5">
      {/* Header + Preset Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Sales Script A/B Performance Simulator
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Compare two competing sales scripts across conversion rate, call duration (AHT), gross monthly revenue, and revenue per productive rep-hour.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
          {SCRIPT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                presetId === preset.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Verdict & Headline Impact Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              metrics.winner === 'B'
                ? 'text-emerald-600'
                : metrics.winner === 'A'
                ? 'text-sky-600'
                : 'text-slate-500'
            }`}
          />
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {metrics.winner === 'B'
                ? `${variantB.name} outperforms by ${formatCurrencyCompact(metrics.monthlyRevLiftUsd)}/mo (${formatCurrencyCompact(metrics.annualRevLiftUsd)}/yr)`
                : metrics.winner === 'A'
                ? `${variantA.name} leads by ${formatCurrencyCompact(Math.abs(metrics.monthlyRevLiftUsd))}/mo`
                : 'Variant A and Variant B are evenly matched on net revenue'}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Even with{' '}
              <span className="font-mono font-semibold text-slate-900">
                {metrics.durationDeltaSec >= 0 ? '+' : ''}
                {metrics.durationDeltaSec}s
              </span>{' '}
              per call, {metrics.winner === 'A' ? 'Variant A' : 'Variant B'} shifts revenue per rep-hour by{' '}
              <span
                className={`font-mono font-semibold ${
                  metrics.revPerHourDeltaUsd >= 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {metrics.revPerHourDeltaUsd >= 0 ? '+' : '-'}$
                {Math.abs(metrics.revPerHourDeltaUsd)}/hr
              </span>{' '}
              at {metrics.confidencePct}% 5-day test confidence ({addressableDailyCalls.toLocaleString()} calls/day).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="ab-split-slider" className="text-slate-500 font-medium">
                A/B Traffic Split
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {100 - splitBPct}% A / {splitBPct}% B
              </span>
            </div>
            <input
              id="ab-split-slider"
              type="range"
              min={10}
              max={90}
              step={5}
              value={splitBPct}
              onChange={(e) => setSplitBPct(Number(e.target.value))}
              className="w-40"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const current = SCRIPT_PRESETS.find((p) => p.id === presetId) ?? SCRIPT_PRESETS[0];
              applyPreset(current);
              setSplitBPct(50);
            }}
            title="Reset script parameters"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Side-by-Side Script Variant Controls & Live Economics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Variant A Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{variantA.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{variantA.tag}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-mono tabular-nums font-semibold text-slate-900">
                {formatCurrencyCompact(metrics.fullA.monthlyRevenueUsd)}/mo
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500">
                ${metrics.fullA.revenuePerRepHourUsd}/rep-hr · {metrics.fullA.dealsPerDay} deals/day
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="var-a-conv" className="text-slate-600 font-medium">
                  Conversion Rate
                </label>
                <span className="font-mono tabular-nums font-semibold text-sky-700">
                  {variantA.conversionRatePct.toFixed(1)}%
                </span>
              </div>
              <input
                id="var-a-conv"
                type="range"
                min={1.0}
                max={12.0}
                step={0.1}
                value={variantA.conversionRatePct}
                onChange={(e) =>
                  setVariantA((prev) => ({ ...prev, conversionRatePct: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="var-a-dur" className="text-slate-600 font-medium">
                  Avg Call Duration
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {variantA.avgDurationSec}s
                </span>
              </div>
              <input
                id="var-a-dur"
                type="range"
                min={25}
                max={140}
                step={1}
                value={variantA.avgDurationSec}
                onChange={(e) =>
                  setVariantA((prev) => ({ ...prev, avgDurationSec: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div>
              <span className="font-semibold text-slate-700">Opening Hook: </span>
              <span className="text-slate-600">&ldquo;{variantA.openingHook}&rdquo;</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Objection Response: </span>
              <span className="text-slate-600">&ldquo;{variantA.objectionPlay}&rdquo;</span>
            </div>
          </div>
        </div>

        {/* Variant B Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{variantB.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{variantB.tag}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-mono tabular-nums font-semibold text-emerald-700">
                {formatCurrencyCompact(metrics.fullB.monthlyRevenueUsd)}/mo
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500">
                ${metrics.fullB.revenuePerRepHourUsd}/rep-hr · {metrics.fullB.dealsPerDay} deals/day
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="var-b-conv" className="text-slate-600 font-medium">
                  Conversion Rate
                </label>
                <span className="font-mono tabular-nums font-semibold text-emerald-700">
                  {variantB.conversionRatePct.toFixed(1)}%
                </span>
              </div>
              <input
                id="var-b-conv"
                type="range"
                min={1.0}
                max={12.0}
                step={0.1}
                value={variantB.conversionRatePct}
                onChange={(e) =>
                  setVariantB((prev) => ({ ...prev, conversionRatePct: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="var-b-dur" className="text-slate-600 font-medium">
                  Avg Call Duration
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {variantB.avgDurationSec}s
                </span>
              </div>
              <input
                id="var-b-dur"
                type="range"
                min={25}
                max={140}
                step={1}
                value={variantB.avgDurationSec}
                onChange={(e) =>
                  setVariantB((prev) => ({ ...prev, avgDurationSec: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div>
              <span className="font-semibold text-slate-700">Opening Hook: </span>
              <span className="text-slate-600">&ldquo;{variantB.openingHook}&rdquo;</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Objection Response: </span>
              <span className="text-slate-600">&ldquo;{variantB.objectionPlay}&rdquo;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Row: Shift-Stage Close Rate & Duration + Rollout Revenue Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Close Rate vs Call Duration Across Shift Stages */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Close Rate (%) &amp; Call Duration (s) by Shift Stage
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bars show conversion rate (%) on left axis; lines show average call duration (seconds) on right axis.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums shrink-0">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                {metrics.convDeltaPts >= 0 ? '+' : ''}
                {metrics.convDeltaPts} pts
              </span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Clock className="w-3.5 h-3.5" />
                {metrics.durationDeltaSec >= 0 ? '+' : ''}
                {metrics.durationDeltaSec}s
              </span>
            </div>
          </div>

          <div className="h-[255px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={metrics.shiftStages}
                margin={{ top: 10, right: 12, left: -10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis yAxisId="conv" tick={{ fontSize: 11, fill: '#475569' }} unit="%" />
                <YAxis
                  yAxisId="dur"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  unit="s"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                <Bar
                  yAxisId="conv"
                  dataKey="convA"
                  name="Variant A Close %"
                  fill="#0284C7"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="conv"
                  dataKey="convB"
                  name="Variant B Close %"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="dur"
                  type="monotone"
                  dataKey="durA"
                  name="Variant A Duration (s)"
                  stroke="#0369A1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="dur"
                  type="monotone"
                  dataKey="durB"
                  name="Variant B Duration (s)"
                  stroke="#D97706"
                  strokeWidth={2.4}
                  dot={{ r: 3.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Rollout Revenue & Efficiency Impact */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Monthly Revenue Rollout Impact ($)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                22-day revenue projection at ${inputs.avgDealValueUsd} ACV across rollout splits.
              </p>
            </div>
            <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>

          <div className="h-[205px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.rolloutComparison}
                margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="scenario" tick={{ fontSize: 11, fill: '#475569' }} />
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
                <Bar dataKey="monthlyRevenueUsd" name="Monthly Revenue ($)" radius={[4, 4, 0, 0]}>
                  {metrics.rolloutComparison.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={
                        entry.key === 'B'
                          ? '#059669'
                          : entry.key === 'A'
                          ? '#0284C7'
                          : '#0F172A'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Floor Capacity Required
            </span>
            <span className="font-mono tabular-nums font-medium text-slate-900">
              {metrics.fullA.dailyRepHours}h (A) vs. {metrics.fullB.dailyRepHours}h (B) / day
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
