/**
 * Business-oriented Revenue Operations economics & call-floor simulation model.
 * Empirically calibrated on 567,090 outbound customer acquisition calls, translated into
 * executive revenue, margin, close-rate, handle-time, and lead-pacing KPIs.
 */

export type BusinessStrategy = 'human_only' | 'unpaced_ai' | 'paced_ai_nlp';

export interface BusinessInputs {
  strategy: BusinessStrategy;
  dailyLeads: number; // total outbound leads/day (e.g., 8500)
  avgDealValueUsd: number; // ACV / annual policy premium (e.g., $480)
  hotLeadSharePct: number; // % of leads reaching checkout/payment (e.g., 60%)
  floorOccupancyPct: number; // % human sales floor utilization (e.g., 80%)
  aiCostPerCallUsd: number; // e.g., $0.06
  humanCostPerCallUsd: number; // e.g., $1.85
}

export interface StrategyProfile {
  id: BusinessStrategy;
  shortName: string;
  headline: string;
  executiveSummary: string;
  aiColdCaptureShare: number; // share of cold leads handled by AI
  earlyShiftCherryPickRate: number; // early-shift lead hand-back rate
  earlyShiftHotCloseRate: number; // close rate on opening-shift hot calls
  midLateHotCloseRate: number; // close rate mid/late shift
  humanColdCloseRate: number;
  aiColdCloseRate: number;
  aiHotOverflowCloseRate: number;
  warmTransferLiftRate: number; // share of AI cold calls warm-transferred and closed by humans
  earlyHumanAhtSec: number;
  lateHumanAhtSec: number;
  aiAhtSec: number;
  cherryPickRiskLevel: 'Low' | 'High' | 'Controlled';
}

export const STRATEGY_PROFILES: Record<BusinessStrategy, StrategyProfile> = {
  human_only: {
    id: 'human_only',
    shortName: 'Standard Human Floor',
    headline: 'Baseline Mixed Queue (Limited AI Backup)',
    executiveSummary:
      'Sales reps dial a balanced mix of high-intent checkout drops and early-stage inquiries. Reps stay patient on opening calls (61s avg handle time), but human payroll is spent dialing low-margin cold leads.',
    aiColdCaptureShare: 0.16,
    earlyShiftCherryPickRate: 0.243,
    earlyShiftHotCloseRate: 0.088,
    midLateHotCloseRate: 0.034,
    humanColdCloseRate: 0.015,
    aiColdCloseRate: 0.0105,
    aiHotOverflowCloseRate: 0.024,
    warmTransferLiftRate: 0.0,
    earlyHumanAhtSec: 61.4,
    lateHumanAhtSec: 41.2,
    aiAhtSec: 30.0,
    cherryPickRiskLevel: 'Low',
  },
  unpaced_ai: {
    id: 'unpaced_ai',
    shortName: 'Unpaced AI Routing',
    headline: 'Front-Loaded Hot Leads (Cherry-Picking Backfire)',
    executiveSummary:
      'AI absorbs 65% of cold leads and stacks hot leads at the start of every shift. Knowing another hot lead is waiting next, reps cut opening calls 13% shorter and hand back viable deals (+8.1 pts), quietly eroding daily revenue.',
    aiColdCaptureShare: 0.65,
    earlyShiftCherryPickRate: 0.381,
    earlyShiftHotCloseRate: 0.058,
    midLateHotCloseRate: 0.036,
    humanColdCloseRate: 0.015,
    aiColdCloseRate: 0.0105,
    aiHotOverflowCloseRate: 0.024,
    warmTransferLiftRate: 0.0,
    earlyHumanAhtSec: 53.4,
    lateHumanAhtSec: 41.8,
    aiAhtSec: 28.5,
    cherryPickRiskLevel: 'High',
  },
  paced_ai_nlp: {
    id: 'paced_ai_nlp',
    shortName: 'Revenue-Paced AI + NLP',
    headline: 'Staggered Hot Pacing + Live Coaching + Warm Transfers',
    executiveSummary:
      'AI handles 65% of cold leads at $0.06/call, while RevOps staggers hot-lead release evenly across the shift, coaches reps live through early objections, and warm-transfers buying signals from AI to human closers (+13.5% conversion recovery).',
    aiColdCaptureShare: 0.65,
    earlyShiftCherryPickRate: 0.192,
    earlyShiftHotCloseRate: 0.094,
    midLateHotCloseRate: 0.043,
    humanColdCloseRate: 0.016,
    aiColdCloseRate: 0.0125,
    aiHotOverflowCloseRate: 0.027,
    warmTransferLiftRate: 0.012,
    earlyHumanAhtSec: 64.5,
    lateHumanAhtSec: 45.2,
    aiAhtSec: 29.0,
    cherryPickRiskLevel: 'Controlled',
  },
};

export interface IntradayBusinessRow {
  hour: string;
  shiftStage: 'Opening Shift' | 'Midday' | 'Afternoon';
  hotHumanCalls: number;
  coldHumanCalls: number;
  aiVoiceCalls: number;
  totalCalls: number;
  humanRevenueUsd: number;
  aiRevenueUsd: number;
  totalRevenueUsd: number;
  revenueAtRiskUsd: number;
  humanCloseRatePct: number;
  aiCloseRatePct: number;
  blendedCloseRatePct: number;
  humanAhtSec: number;
  aiAhtSec: number;
  handBackRatePct: number;
}

export interface BusinessEconomicsSummary {
  dailyRevenueUsd: number;
  monthlyRevenueUsd: number; // 22 business days
  annualRevenueUsd: number; // 260 business days
  dailyNetMarginUsd: number;
  dailyOperatingCostUsd: number;
  dailyRevenueLostToHandBacksUsd: number;
  dailyDealsClosed: number;
  humanDealsClosed: number;
  aiDealsClosed: number;
  warmTransferDealsClosed: number;
  blendedCloseRatePct: number;
  humanHotCloseRatePct: number;
  avgHumanAhtSec: number;
  avgAiAhtSec: number;
  costPerAcquisitionUsd: number;
  humanCallsPerDay: number;
  aiCallsPerDay: number;
  openingHandBackPct: number;
  monthlyRevenueLiftVsUnpacedUsd: number;
  annualRevenueLiftVsUnpacedUsd: number;
  intradayRows: IntradayBusinessRow[];
}

function computeSingleStrategyEconomics(inputs: BusinessInputs, strategy: BusinessStrategy) {
  const profile = STRATEGY_PROFILES[strategy];
  const hours: { hour: string; weight: number; earlyFactor: number; stage: IntradayBusinessRow['shiftStage'] }[] = [
    { hour: '9 AM', weight: 0.10, earlyFactor: 1.0, stage: 'Opening Shift' },
    { hour: '10 AM', weight: 0.13, earlyFactor: 0.85, stage: 'Opening Shift' },
    { hour: '11 AM', weight: 0.14, earlyFactor: 0.65, stage: 'Opening Shift' },
    { hour: '12 PM', weight: 0.09, earlyFactor: 0.45, stage: 'Midday' },
    { hour: '1 PM', weight: 0.10, earlyFactor: 0.35, stage: 'Midday' },
    { hour: '2 PM', weight: 0.13, earlyFactor: 0.25, stage: 'Midday' },
    { hour: '3 PM', weight: 0.12, earlyFactor: 0.15, stage: 'Afternoon' },
    { hour: '4 PM', weight: 0.10, earlyFactor: 0.08, stage: 'Afternoon' },
    { hour: '5 PM', weight: 0.09, earlyFactor: 0.02, stage: 'Afternoon' },
  ];

  const overflowRate =
    inputs.floorOccupancyPct >= 90 ? Math.min(0.28, (inputs.floorOccupancyPct - 88) * 0.022) : 0.04;

  let totalHumanHotCalls = 0;
  let totalHumanColdCalls = 0;
  let totalAiCalls = 0;
  let totalHumanDeals = 0;
  let totalAiDeals = 0;
  let totalWarmTransferDeals = 0;
  let totalRevenueLostUsd = 0;
  let weightedHumanAhtSum = 0;

  const intradayRows: IntradayBusinessRow[] = hours.map((h) => {
    const slotTotal = Math.round(inputs.dailyLeads * h.weight);
    const hotBaseShare = inputs.hotLeadSharePct / 100;

    // Front-loading concentrates hot leads early under unpaced AI
    const slotHotShare =
      strategy === 'unpaced_ai'
        ? Math.min(0.92, hotBaseShare + 0.21 * (h.earlyFactor - 0.35))
        : strategy === 'paced_ai_nlp'
        ? Math.min(0.84, hotBaseShare + 0.06 * (h.earlyFactor - 0.35))
        : Math.min(0.86, hotBaseShare + 0.12 * (h.earlyFactor - 0.35));

    const slotHotLeads = Math.round(slotTotal * slotHotShare);
    const slotColdLeads = Math.max(0, slotTotal - slotHotLeads);

    const hotOverflowToAi = Math.round(slotHotLeads * overflowRate);
    const hotHumanCalls = Math.max(0, slotHotLeads - hotOverflowToAi);
    const coldAiCalls = Math.round(slotColdLeads * profile.aiColdCaptureShare);
    const coldHumanCalls = Math.max(0, slotColdLeads - coldAiCalls);
    const aiVoiceCalls = coldAiCalls + hotOverflowToAi;

    const hotCloseRate =
      profile.midLateHotCloseRate +
      (profile.earlyShiftHotCloseRate - profile.midLateHotCloseRate) * h.earlyFactor;

    const warmTransfers = coldAiCalls * profile.warmTransferLiftRate;
    const humanDeals =
      hotHumanCalls * hotCloseRate + coldHumanCalls * profile.humanColdCloseRate + warmTransfers;
    const aiDeals =
      coldAiCalls * profile.aiColdCloseRate + hotOverflowToAi * profile.aiHotOverflowCloseRate;

    const humanRevenueUsd = Math.round(humanDeals * inputs.avgDealValueUsd);
    const aiRevenueUsd = Math.round(aiDeals * inputs.avgDealValueUsd);
    const totalRevenueUsd = humanRevenueUsd + aiRevenueUsd;

    const handBackRate =
      profile.earlyShiftCherryPickRate * (0.45 + 0.55 * h.earlyFactor);
    // Viable revenue slipped when reps prematurely return effort-intensive hot leads
    const slippedDeals =
      strategy === 'unpaced_ai'
        ? hotHumanCalls * Math.max(0, handBackRate - 0.22) * 0.085
        : hotHumanCalls * Math.max(0, handBackRate - 0.22) * 0.04;
    const revenueAtRiskUsd = Math.round(slippedDeals * inputs.avgDealValueUsd);

    const humanAhtSec = Number(
      (
        profile.lateHumanAhtSec +
        (profile.earlyHumanAhtSec - profile.lateHumanAhtSec) * h.earlyFactor
      ).toFixed(1)
    );

    const humanTotalSlot = hotHumanCalls + coldHumanCalls;
    const humanCloseRatePct =
      humanTotalSlot > 0 ? Number(((humanDeals / humanTotalSlot) * 100).toFixed(2)) : 0;
    const aiCloseRatePct =
      aiVoiceCalls > 0 ? Number(((aiDeals / aiVoiceCalls) * 100).toFixed(2)) : 0;
    const blendedCloseRatePct =
      slotTotal > 0 ? Number((((humanDeals + aiDeals) / slotTotal) * 100).toFixed(2)) : 0;

    totalHumanHotCalls += hotHumanCalls;
    totalHumanColdCalls += coldHumanCalls;
    totalAiCalls += aiVoiceCalls;
    totalHumanDeals += humanDeals;
    totalAiDeals += aiDeals;
    totalWarmTransferDeals += warmTransfers;
    totalRevenueLostUsd += revenueAtRiskUsd;
    weightedHumanAhtSum += humanTotalSlot * humanAhtSec;

    return {
      hour: h.hour,
      shiftStage: h.stage,
      hotHumanCalls,
      coldHumanCalls,
      aiVoiceCalls,
      totalCalls: slotTotal,
      humanRevenueUsd,
      aiRevenueUsd,
      totalRevenueUsd,
      revenueAtRiskUsd,
      humanCloseRatePct,
      aiCloseRatePct,
      blendedCloseRatePct,
      humanAhtSec,
      aiAhtSec: profile.aiAhtSec,
      handBackRatePct: Number((handBackRate * 100).toFixed(1)),
    };
  });

  const humanCallsPerDay = totalHumanHotCalls + totalHumanColdCalls;
  const dailyDeals = totalHumanDeals + totalAiDeals;
  const dailyRevenueUsd = Math.round(dailyDeals * inputs.avgDealValueUsd);
  const dailyOperatingCostUsd = Math.round(
    humanCallsPerDay * inputs.humanCostPerCallUsd + totalAiCalls * inputs.aiCostPerCallUsd
  );
  const dailyNetMarginUsd = dailyRevenueUsd - dailyOperatingCostUsd;
  const avgHumanAhtSec =
    humanCallsPerDay > 0 ? Number((weightedHumanAhtSum / humanCallsPerDay).toFixed(1)) : 0;

  return {
    dailyRevenueUsd,
    monthlyRevenueUsd: dailyRevenueUsd * 22,
    annualRevenueUsd: dailyRevenueUsd * 260,
    dailyNetMarginUsd,
    dailyOperatingCostUsd,
    dailyRevenueLostToHandBacksUsd: totalRevenueLostUsd,
    dailyDealsClosed: Math.round(dailyDeals),
    humanDealsClosed: Math.round(totalHumanDeals),
    aiDealsClosed: Math.round(totalAiDeals),
    warmTransferDealsClosed: Math.round(totalWarmTransferDeals),
    blendedCloseRatePct:
      inputs.dailyLeads > 0 ? Number(((dailyDeals / inputs.dailyLeads) * 100).toFixed(2)) : 0,
    humanHotCloseRatePct:
      totalHumanHotCalls > 0
        ? Number((((totalHumanDeals - totalHumanColdCalls * profile.humanColdCloseRate) / totalHumanHotCalls) * 100).toFixed(2))
        : 0,
    avgHumanAhtSec,
    avgAiAhtSec: profile.aiAhtSec,
    costPerAcquisitionUsd:
      dailyDeals > 0 ? Number((dailyOperatingCostUsd / dailyDeals).toFixed(2)) : 0,
    humanCallsPerDay,
    aiCallsPerDay: totalAiCalls,
    openingHandBackPct: Number((profile.earlyShiftCherryPickRate * 100).toFixed(1)),
    intradayRows,
  };
}

export function calculateBusinessEconomics(inputs: BusinessInputs): BusinessEconomicsSummary {
  const active = computeSingleStrategyEconomics(inputs, inputs.strategy);
  const unpaced = computeSingleStrategyEconomics(inputs, 'unpaced_ai');

  return {
    ...active,
    monthlyRevenueLiftVsUnpacedUsd: active.monthlyRevenueUsd - unpaced.monthlyRevenueUsd,
    annualRevenueLiftVsUnpacedUsd: active.annualRevenueUsd - unpaced.annualRevenueUsd,
  };
}

export function buildStrategyComparisonBars(inputs: BusinessInputs) {
  return (['human_only', 'unpaced_ai', 'paced_ai_nlp'] as BusinessStrategy[]).map((strat) => {
    const res = computeSingleStrategyEconomics(inputs, strat);
    return {
      strategy: STRATEGY_PROFILES[strat].shortName,
      id: strat,
      monthlyRevenueUsd: res.monthlyRevenueUsd,
      monthlyNetMarginUsd: res.dailyNetMarginUsd * 22,
      monthlyCostUsd: res.dailyOperatingCostUsd * 22,
      closeRatePct: res.blendedCloseRatePct,
      cpaUsd: res.costPerAcquisitionUsd,
    };
  });
}

export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}
