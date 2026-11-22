import React, { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
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
  Clock,
  Download,
  PhoneCall,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { ORDER_BIN_PROFILES } from '../data/researchModel';

type DashboardRegime = 'pre_ai' | 'naive_ai' | 'revops_paced';
type TimeView = 'intraday' | 'rollout_14d' | 'position_bins';
type ChannelFilter = 'all' | 'human' | 'ai';

interface PeriodDataPoint {
  label: string;
  humanHotVolume: number;
  humanColdVolume: number;
  aiVoiceVolume: number;
  totalVolume: number;
  humanConvPct: number;
  aiConvPct: number;
  overallConvPct: number;
  humanAhtSec: number;
  aiAhtSec: number;
  blendedAhtSec: number;
  reallocationPct: number;
}

const REGIME_LABELS: Record<DashboardRegime, string> = {
  pre_ai: 'Pre-AI Mixed Pool',
  naive_ai: 'Naive Parallel AI (φ=0.22)',
  revops_paced: 'RevOps Paced AI + NLP (φ=0.10)',
};

// Deterministic pseudo-random generator for reproducible stochastic day simulations
function seededNoise(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297 + 233) * 10000;
  return x - Math.floor(x) - 0.5; // [-0.5, 0.5]
}

function generateDashboardSeries(
  regime: DashboardRegime,
  view: TimeView,
  seed: number
): PeriodDataPoint[] {
  const isPre = regime === 'pre_ai';
  const isNaive = regime === 'naive_ai';

  if (view === 'intraday') {
    const hours = [
      { label: '09:00', traffic: 0.95, earlyFactor: 1.0 },
      { label: '10:00', traffic: 1.22, earlyFactor: 0.85 },
      { label: '11:00', traffic: 1.30, earlyFactor: 0.65 },
      { label: '12:00', traffic: 0.82, earlyFactor: 0.45 },
      { label: '13:00', traffic: 0.90, earlyFactor: 0.35 },
      { label: '14:00', traffic: 1.26, earlyFactor: 0.25 },
      { label: '15:00', traffic: 1.24, earlyFactor: 0.15 },
      { label: '16:00', traffic: 1.08, earlyFactor: 0.08 },
      { label: '17:00', traffic: 0.88, earlyFactor: 0.02 },
    ];

    return hours.map((h, idx) => {
      const n = seededNoise(seed, idx);
      const baseTotal = Math.round(920 * h.traffic * (1 + n * 0.12));

      // Volume split calibrated to study's -31.8% human calls and +351% AI calls post-expansion
      const aiShare = isPre ? 0.11 : 0.44;
      const aiVoiceVolume = Math.round(baseTotal * aiShare * (1 + n * 0.08));
      const humanTotal = Math.max(80, baseTotal - aiVoiceVolume);

      const hotRatio = isPre
        ? 0.54 + 0.24 * h.earlyFactor
        : isNaive
        ? 0.58 + 0.31 * h.earlyFactor
        : 0.63 + 0.14 * h.earlyFactor;

      const humanHotVolume = Math.round(humanTotal * Math.min(0.92, hotRatio));
      const humanColdVolume = Math.max(0, humanTotal - humanHotVolume);

      // Conversion rates (%)
      const humanConvPct = Number(
        (
          (isPre
            ? 2.4 + 4.4 * h.earlyFactor
            : isNaive
            ? 2.8 + 1.8 * h.earlyFactor // flattened early conversion drop (-4.5 pp at Pos 1-3)
            : 3.1 + 4.5 * h.earlyFactor) *
          (1 + n * 0.08)
        ).toFixed(2)
      );

      const aiConvPct = Number(
        ((isPre ? 1.45 : isNaive ? 1.18 : 1.72) * (1 + n * 0.1)).toFixed(2)
      );

      const totalConversions =
        (humanTotal * humanConvPct) / 100 + (aiVoiceVolume * aiConvPct) / 100;
      const overallConvPct = Number(((totalConversions / baseTotal) * 100).toFixed(2));

      // Average Handle Time (seconds): captures -13% early-shift compression under Naive AI
      const humanAhtSec = Number(
        (
          (isPre
            ? 42 + 21 * h.earlyFactor
            : isNaive
            ? 43 + 10.5 * h.earlyFactor
            : 46 + 22 * h.earlyFactor) *
          (1 + n * 0.06)
        ).toFixed(1)
      );

      const aiAhtSec = Number(((isPre ? 31 : 28.5) * (1 + n * 0.08)).toFixed(1));
      const blendedAhtSec = Number(
        ((humanTotal * humanAhtSec + aiVoiceVolume * aiAhtSec) / baseTotal).toFixed(1)
      );

      const reallocationPct = Number(
        (
          (isPre
            ? 15 + 9.5 * h.earlyFactor
            : isNaive
            ? 21 + 17.5 * h.earlyFactor
            : 14 + 6.5 * h.earlyFactor) *
          (1 + n * 0.07)
        ).toFixed(1)
      );

      return {
        label: h.label,
        humanHotVolume,
        humanColdVolume,
        aiVoiceVolume,
        totalVolume: humanHotVolume + humanColdVolume + aiVoiceVolume,
        humanConvPct,
        aiConvPct,
        overallConvPct,
        humanAhtSec,
        aiAhtSec,
        blendedAhtSec,
        reallocationPct,
      };
    });
  }

  if (view === 'rollout_14d') {
    return Array.from({ length: 14 }, (_, idx) => {
      const dayNum = idx + 1;
      const n = seededNoise(seed + 17, idx);
      const weekdayBoost = dayNum % 7 === 0 || dayNum % 7 === 6 ? 0.78 : 1.06;
      const baseTotal = Math.round(8600 * weekdayBoost * (1 + n * 0.1));

      const aiShare = isPre ? 0.11 : 0.44;
      const aiVoiceVolume = Math.round(baseTotal * aiShare);
      const humanTotal = baseTotal - aiVoiceVolume;
      const hotRatio = isPre ? 0.606 : 0.646;
      const humanHotVolume = Math.round(humanTotal * hotRatio);
      const humanColdVolume = humanTotal - humanHotVolume;

      const humanConvPct = Number(
        ((isPre ? 3.22 : isNaive ? 2.88 : 3.64) * (1 + n * 0.08)).toFixed(2)
      );
      const aiConvPct = Number(
        ((isPre ? 1.48 : isNaive ? 1.15 : 1.74) * (1 + n * 0.1)).toFixed(2)
      );
      const totalConversions =
        (humanTotal * humanConvPct) / 100 + (aiVoiceVolume * aiConvPct) / 100;
      const overallConvPct = Number(((totalConversions / baseTotal) * 100).toFixed(2));

      const humanAhtSec = Number(
        ((isPre ? 52.8 : isNaive ? 47.4 : 56.2) * (1 + n * 0.05)).toFixed(1)
      );
      const aiAhtSec = Number((29.2 * (1 + n * 0.06)).toFixed(1));
      const blendedAhtSec = Number(
        ((humanTotal * humanAhtSec + aiVoiceVolume * aiAhtSec) / baseTotal).toFixed(1)
      );

      const reallocationPct = Number(
        ((isPre ? 14.1 : isNaive ? 22.9 : 13.8) * (1 + n * 0.08)).toFixed(1)
      );

      return {
        label: `Day ${dayNum}`,
        humanHotVolume,
        humanColdVolume,
        aiVoiceVolume,
        totalVolume: baseTotal,
        humanConvPct,
        aiConvPct,
        overallConvPct,
        humanAhtSec,
        aiAhtSec,
        blendedAhtSec,
        reallocationPct,
      };
    });
  }

  // position_bins view grounded directly in ORDER_BIN_PROFILES
  return ORDER_BIN_PROFILES.map((row, idx) => {
    const n = seededNoise(seed + 41, idx);
    const totalCallsInBin = Math.round(9000 * row.weight * (1 + n * 0.06));
    const aiShare = isPre ? 0.11 : 0.44;
    const aiVoiceVolume = Math.round(totalCallsInBin * aiShare);
    const humanTotal = Math.max(40, totalCallsInBin - aiVoiceVolume);

    const hotShare = isPre
      ? row.rawHotSharePre
      : isNaive
      ? row.rawHotSharePost
      : Math.min(0.86, 0.646 + 0.1 * row.positionScore * 0.85);

    const humanHotVolume = Math.round(humanTotal * hotShare);
    const humanColdVolume = Math.max(0, humanTotal - humanHotVolume);

    const convPre =
      (row.reallocNoAi * row.convReallocNoAi + (1 - row.reallocNoAi) * row.convRetainedNoAi) * 100;
    const convNaive =
      (row.reallocWithAi * row.convReallocWithAi + (1 - row.reallocWithAi) * row.convRetainedWithAi) *
      100;
    const convRevOps = convPre * 1.07;

    const humanConvPct = Number(
      ((isPre ? convPre : isNaive ? convNaive : convRevOps) * (1 + n * 0.05)).toFixed(2)
    );
    const aiConvPct = Number(((isPre ? 1.45 : isNaive ? 1.15 : 1.72) * (1 + n * 0.07)).toFixed(2));
    const totalConversions =
      (humanTotal * humanConvPct) / 100 + (aiVoiceVolume * aiConvPct) / 100;
    const overallConvPct = Number(((totalConversions / totalCallsInBin) * 100).toFixed(2));

    // Apply -13% early duration drop at positions 1-3 under Naive AI
    const earlyCompression = isNaive && row.positionScore > 0.5 ? 0.87 : 1;
    const revOpsBoost = !isPre && !isNaive && row.positionScore > 0.3 ? 1.08 : 1;
    const humanAhtSec = Number(
      (
        (isPre ? row.durationSecPre : row.durationSecPost * earlyCompression * revOpsBoost) *
        (1 + n * 0.04)
      ).toFixed(1)
    );
    const aiAhtSec = Number((28.8 * (1 + n * 0.05)).toFixed(1));
    const blendedAhtSec = Number(
      ((humanTotal * humanAhtSec + aiVoiceVolume * aiAhtSec) / totalCallsInBin).toFixed(1)
    );

    const reallocationPct = Number(
      (
        (isPre
          ? row.reallocNoAi * 100
          : isNaive
          ? row.reallocWithAi * 100
          : row.reallocNoAi * 100 * 0.88) *
        (1 + n * 0.05)
      ).toFixed(1)
    );

    return {
      label: `Pos ${row.bin}`,
      humanHotVolume,
      humanColdVolume,
      aiVoiceVolume,
      totalVolume: totalCallsInBin,
      humanConvPct,
      aiConvPct,
      overallConvPct,
      humanAhtSec,
      aiAhtSec,
      blendedAhtSec,
      reallocationPct,
    };
  });
}

export const PerformanceDashboard: React.FC = () => {
  const [regime, setRegime] = useState<DashboardRegime>('revops_paced');
  const [timeView, setTimeView] = useState<TimeView>('intraday');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [simSeed, setSimSeed] = useState<number>(1);

  const series = useMemo(
    () => generateDashboardSeries(regime, timeView, simSeed),
    [regime, timeView, simSeed]
  );

  // Baseline comparison against Naive Parallel AI on identical seed & timeframe
  const naiveSeries = useMemo(
    () => generateDashboardSeries('naive_ai', timeView, simSeed),
    [timeView, simSeed]
  );

  const aggregates = useMemo(() => {
    const sum = (arr: PeriodDataPoint[], fn: (d: PeriodDataPoint) => number) =>
      arr.reduce((acc, item) => acc + fn(item), 0);

    const totalHumanHot = sum(series, (d) => d.humanHotVolume);
    const totalHumanCold = sum(series, (d) => d.humanColdVolume);
    const totalHuman = totalHumanHot + totalHumanCold;
    const totalAi = sum(series, (d) => d.aiVoiceVolume);
    const totalCalls = totalHuman + totalAi;

    const totalHumanConv = sum(
      series,
      (d) => ((d.humanHotVolume + d.humanColdVolume) * d.humanConvPct) / 100
    );
    const totalAiConv = sum(series, (d) => (d.aiVoiceVolume * d.aiConvPct) / 100);
    const totalConv = totalHumanConv + totalAiConv;

    const weightedHumanConvPct = totalHuman > 0 ? (totalHumanConv / totalHuman) * 100 : 0;
    const weightedAiConvPct = totalAi > 0 ? (totalAiConv / totalAi) * 100 : 0;
    const weightedOverallConvPct = totalCalls > 0 ? (totalConv / totalCalls) * 100 : 0;

    const weightedHumanAht =
      totalHuman > 0
        ? sum(series, (d) => (d.humanHotVolume + d.humanColdVolume) * d.humanAhtSec) / totalHuman
        : 0;
    const weightedAiAht =
      totalAi > 0 ? sum(series, (d) => d.aiVoiceVolume * d.aiAhtSec) / totalAi : 0;
    const weightedBlendedAht =
      totalCalls > 0 ? sum(series, (d) => d.totalVolume * d.blendedAhtSec) / totalCalls : 0;

    const avgReallocPct =
      series.length > 0 ? sum(series, (d) => d.reallocationPct) / series.length : 0;

    // Naive baseline metrics for delta callouts
    const naiveTotalCalls = sum(naiveSeries, (d) => d.totalVolume);
    const naiveTotalConv = sum(
      naiveSeries,
      (d) =>
        ((d.humanHotVolume + d.humanColdVolume) * d.humanConvPct) / 100 +
        (d.aiVoiceVolume * d.aiConvPct) / 100
    );
    const naiveOverallConvPct = naiveTotalCalls > 0 ? (naiveTotalConv / naiveTotalCalls) * 100 : 0;
    const naiveHumanTotal = sum(naiveSeries, (d) => d.humanHotVolume + d.humanColdVolume);
    const naiveHumanAht =
      naiveHumanTotal > 0
        ? sum(naiveSeries, (d) => (d.humanHotVolume + d.humanColdVolume) * d.humanAhtSec) /
          naiveHumanTotal
        : 0;

    const activeVolume =
      channelFilter === 'human' ? totalHuman : channelFilter === 'ai' ? totalAi : totalCalls;
    const activeConvPct =
      channelFilter === 'human'
        ? weightedHumanConvPct
        : channelFilter === 'ai'
        ? weightedAiConvPct
        : weightedOverallConvPct;
    const activeAhtSec =
      channelFilter === 'human'
        ? weightedHumanAht
        : channelFilter === 'ai'
        ? weightedAiAht
        : weightedBlendedAht;

    return {
      totalCalls,
      totalHuman,
      totalHumanHot,
      totalHumanCold,
      totalAi,
      totalConv: Math.round(totalConv),
      activeVolume,
      activeConvPct,
      activeAhtSec,
      weightedHumanAht,
      weightedAiAht,
      weightedOverallConvPct,
      avgReallocPct,
      convLiftVsNaivePct:
        naiveOverallConvPct > 0
          ? ((weightedOverallConvPct - naiveOverallConvPct) / naiveOverallConvPct) * 100
          : 0,
      ahtDeltaVsNaiveSec: weightedHumanAht - naiveHumanAht,
    };
  }, [series, naiveSeries, channelFilter]);

  const handleExportCsv = () => {
    const header = [
      'Period',
      'Human_Hot_Calls',
      'Human_Cold_Calls',
      'AI_Voice_Calls',
      'Total_Calls',
      'Human_Conv_Pct',
      'AI_Conv_Pct',
      'Overall_Conv_Pct',
      'Human_AHT_Sec',
      'AI_AHT_Sec',
      'Reallocation_Pct',
    ];
    const rows = series.map((r) => [
      r.label,
      r.humanHotVolume,
      r.humanColdVolume,
      r.aiVoiceVolume,
      r.totalVolume,
      r.humanConvPct,
      r.aiConvPct,
      r.overallConvPct,
      r.humanAhtSec,
      r.aiAhtSec,
      r.reallocationPct,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadenceops_performance_${regime}_${timeView}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header + Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Performance Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Simulated call volume mix, conversion efficiency, and average handle time (AHT) across human and AI voice channels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSimSeed((s) => s + 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Simulate New Run
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Regime:</span>
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(Object.keys(REGIME_LABELS) as DashboardRegime[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRegime(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  regime === key
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {REGIME_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(
              [
                { id: 'intraday', label: 'Intraday Hours' },
                { id: 'rollout_14d', label: '14-Day Trend' },
                { id: 'position_bins', label: 'Shift Positions' },
              ] as { id: TimeView; label: string }[]
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setTimeView(v.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeView === v.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'human', label: 'Human' },
                { id: 'ai', label: 'AI Voice' },
              ] as { id: ChannelFilter; label: string }[]
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannelFilter(c.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  channelFilter === c.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4-Column Tabular KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Simulated Call Volume</span>
            <PhoneCall className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-mono tabular-nums font-semibold text-slate-900">
            {aggregates.activeVolume.toLocaleString()}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
            Human {aggregates.totalHuman.toLocaleString()} · AI {aggregates.totalAi.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Conversion Rate</span>
            {aggregates.convLiftVsNaivePct >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono tabular-nums font-semibold text-slate-900">
              {aggregates.activeConvPct.toFixed(2)}%
            </span>
            {regime !== 'naive_ai' && (
              <span
                className={`text-xs font-mono tabular-nums font-semibold ${
                  aggregates.convLiftVsNaivePct >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {aggregates.convLiftVsNaivePct >= 0 ? '+' : ''}
                {aggregates.convLiftVsNaivePct.toFixed(1)}% vs Naive
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
            {aggregates.totalConv.toLocaleString()} total closed policies
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Average Handle Time (AHT)</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-mono tabular-nums font-semibold text-slate-900">
              {aggregates.activeAhtSec.toFixed(1)}s
            </span>
            {regime !== 'naive_ai' && (
              <span className="text-xs font-mono tabular-nums text-slate-600">
                {aggregates.ahtDeltaVsNaiveSec >= 0 ? '+' : ''}
                {aggregates.ahtDeltaVsNaiveSec.toFixed(1)}s human
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
            Human {aggregates.weightedHumanAht.toFixed(1)}s · AI {aggregates.weightedAiAht.toFixed(1)}s
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Avg Queue Reallocation Rate</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-mono tabular-nums font-semibold ${
                aggregates.avgReallocPct > 20 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {aggregates.avgReallocPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              {aggregates.avgReallocPct > 20 ? 'High churn risk' : 'Controlled'}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
            Run #{simSeed} · {timeView === 'intraday' ? 'Hourly' : timeView === 'rollout_14d' ? '14-Day' : 'Position Bin'} view
          </div>
        </div>
      </div>

      {/* Chart 1: Full-Width Call Volume Distribution */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Simulated Call Volume Distribution (Hot vs. Cold vs. AI Voice)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Stacked outbound volume showing how AI absorbs low-intent cold leads while preserving human floor priority on hot leads.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            Total: {aggregates.totalCalls.toLocaleString()} calls
          </span>
        </div>

        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 10, right: 16, left: -4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#CBD5E1',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {(channelFilter === 'all' || channelFilter === 'human') && (
                <Bar
                  dataKey="humanHotVolume"
                  name="Human · Hot Leads"
                  stackId="vol"
                  fill="#DC2626"
                  radius={[0, 0, 0, 0]}
                />
              )}
              {(channelFilter === 'all' || channelFilter === 'human') && (
                <Bar
                  dataKey="humanColdVolume"
                  name="Human · Cold Leads"
                  stackId="vol"
                  fill="#64748B"
                  radius={channelFilter === 'human' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              )}
              {(channelFilter === 'all' || channelFilter === 'ai') && (
                <Bar
                  dataKey="aiVoiceVolume"
                  name="AI Voice Agent"
                  stackId="vol"
                  fill="#0284C7"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom 2-Column Charts: Conversion Rate Trends + Average Handle Time (AHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 2: Conversion Rates */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Conversion Rate by Channel (%)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks human close rate, AI voice close rate, and blended firm conversion rate.
            </p>
          </div>

          <div className="h-[265px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {(channelFilter === 'all' || channelFilter === 'human') && (
                  <Line
                    type="monotone"
                    dataKey="humanConvPct"
                    name="Human Floor %"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 3.5 }}
                  />
                )}
                {channelFilter === 'all' && (
                  <Line
                    type="monotone"
                    dataKey="overallConvPct"
                    name="Blended Firm %"
                    stroke="#0F172A"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                )}
                {(channelFilter === 'all' || channelFilter === 'ai') && (
                  <Line
                    type="monotone"
                    dataKey="aiConvPct"
                    name="AI Voice %"
                    stroke="#0284C7"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Average Handle Time (AHT) vs Reallocation */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Average Handle Time (Seconds) &amp; Persistence
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compares human handle time against AI voice duration. Shorter early human calls signal reservation-value pullback.
            </p>
          </div>

          <div className="h-[265px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 16, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="s" domain={[0, 80]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <ReferenceLine
                  y={52}
                  stroke="#94A3B8"
                  strokeDasharray="3 3"
                  label={{ value: 'Target Human AHT (52s)', position: 'insideTopRight', fontSize: 10, fill: '#64748B' }}
                />
                {(channelFilter === 'all' || channelFilter === 'human') && (
                  <Area
                    type="monotone"
                    dataKey="humanAhtSec"
                    name="Human AHT (s)"
                    stroke="#D97706"
                    fill="#D97706"
                    fillOpacity={0.12}
                    strokeWidth={2.4}
                  />
                )}
                {channelFilter === 'all' && (
                  <Line
                    type="monotone"
                    dataKey="blendedAhtSec"
                    name="Blended AHT (s)"
                    stroke="#0F172A"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                  />
                )}
                {(channelFilter === 'all' || channelFilter === 'ai') && (
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

      {/* High-Density Performance Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Interval Performance Breakdown
          </h2>
          <span className="text-xs text-slate-500">
            {REGIME_LABELS[regime]} · Tabular telemetry
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Interval</th>
                <th className="py-2.5 px-4 text-right">Human Hot</th>
                <th className="py-2.5 px-4 text-right">Human Cold</th>
                <th className="py-2.5 px-4 text-right">AI Voice</th>
                <th className="py-2.5 px-4 text-right">Human Conv</th>
                <th className="py-2.5 px-4 text-right">AI Conv</th>
                <th className="py-2.5 px-4 text-right">Human AHT</th>
                <th className="py-2.5 px-4 text-right">AI AHT</th>
                <th className="py-2.5 px-4 text-right">Realloc %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
              {series.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                    {row.label}
                  </td>
                  <td className="py-2.5 px-4 text-right text-red-700">
                    {row.humanHotVolume.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600">
                    {row.humanColdVolume.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-sky-700">
                    {row.aiVoiceVolume.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                    {row.humanConvPct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-700">
                    {row.aiConvPct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-900">
                    {row.humanAhtSec.toFixed(1)}s
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600">
                    {row.aiAhtSec.toFixed(1)}s
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-semibold ${
                      row.reallocationPct > 28 ? 'text-amber-700' : 'text-slate-600'
                    }`}
                  >
                    {row.reallocationPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
