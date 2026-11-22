/**
 * Calibrated empirical dataset and counterfactual accounting model from:
 * "When Better Opportunities Backfire: Service Worker Responses to Parallel AI Deployment in Customer Acquisition"
 * Xinyu Fu, Shulong Luo, Narayan Ramasubbu, Peng Shen, Xincheng Wang, Yucheng Wang (September 2026)
 */

export interface OrderBinProfile {
  bin: string;
  midpoint: number;
  weight: number; // share of calls within benchmark 50-call or full day
  positionScore: number; // normalized position score from +1 (early) to -1 (late)
  // Raw hot-lead share (Table 1 Panel D & Appendix F)
  rawHotSharePre: number;
  rawHotSharePost: number;
  // RDiT first-stage hot-lead discontinuity (Table 2)
  rditHotShareDelta: number | null;
  // Table F1: Reallocation probability P^R
  reallocNoAi: number;
  reallocWithAi: number;
  // Table F1: Reallocated conversion S^{G,R}
  convReallocNoAi: number;
  convReallocWithAi: number;
  // Table F1: Retained conversion S^{G,NR}
  convRetainedNoAi: number;
  convRetainedWithAi: number;
  // Call duration in seconds (exp of Table 1 Panel D log duration)
  durationSecPre: number;
  durationSecPost: number;
  // RDiT hot conversion discontinuity (Table 3 Panel B, pp)
  rditConvDeltaPp: number | null;
  // RDiT reallocation discontinuity (Table 4 Col 1, pp)
  rditReallocDeltaPp: number | null;
  // RDiT log call duration discontinuity (Table 4 Col 3)
  rditDurationLogDelta: number | null;
}

export const ORDER_BIN_PROFILES: OrderBinProfile[] = [
  {
    bin: '1–3',
    midpoint: 2,
    weight: 0.06,
    positionScore: 1.0,
    rawHotSharePre: 0.862,
    rawHotSharePost: 0.895,
    rditHotShareDelta: 23.4,
    reallocNoAi: 0.243,
    reallocWithAi: 0.389,
    convReallocNoAi: 0.300,
    convReallocWithAi: 0.138,
    convRetainedNoAi: 0.031,
    convRetainedWithAi: 0.026,
    durationSecPre: 61.4,
    durationSecPost: 57.9,
    rditConvDeltaPp: -4.5,
    rditReallocDeltaPp: 8.1,
    rditDurationLogDelta: -0.145,
  },
  {
    bin: '4–6',
    midpoint: 5,
    weight: 0.06,
    positionScore: 0.82,
    rawHotSharePre: 0.796,
    rawHotSharePost: 0.779,
    rditHotShareDelta: 15.7,
    reallocNoAi: 0.188,
    reallocWithAi: 0.325,
    convReallocNoAi: 0.173,
    convReallocWithAi: 0.085,
    convRetainedNoAi: 0.030,
    convRetainedWithAi: 0.032,
    durationSecPre: 53.0,
    durationSecPost: 53.6,
    rditConvDeltaPp: -2.5,
    rditReallocDeltaPp: 7.2,
    rditDurationLogDelta: -0.009,
  },
  {
    bin: '7–9',
    midpoint: 8,
    weight: 0.06,
    positionScore: 0.64,
    rawHotSharePre: 0.715,
    rawHotSharePost: 0.697,
    rditHotShareDelta: 11.7,
    reallocNoAi: 0.173,
    reallocWithAi: 0.289,
    convReallocNoAi: 0.134,
    convReallocWithAi: 0.073,
    convRetainedNoAi: 0.025,
    convRetainedWithAi: 0.030,
    durationSecPre: 50.9,
    durationSecPost: 50.7,
    rditConvDeltaPp: 0.1,
    rditReallocDeltaPp: 3.7,
    rditDurationLogDelta: -0.128,
  },
  {
    bin: '10–12',
    midpoint: 11,
    weight: 0.06,
    positionScore: 0.48,
    rawHotSharePre: 0.657,
    rawHotSharePost: 0.650,
    rditHotShareDelta: 10.9,
    reallocNoAi: 0.168,
    reallocWithAi: 0.269,
    convReallocNoAi: 0.090,
    convReallocWithAi: 0.057,
    convRetainedNoAi: 0.027,
    convRetainedWithAi: 0.027,
    durationSecPre: 50.0,
    durationSecPost: 50.1,
    rditConvDeltaPp: 0.7,
    rditReallocDeltaPp: 6.8,
    rditDurationLogDelta: -0.035,
  },
  {
    bin: '13–20',
    midpoint: 16.5,
    weight: 0.16,
    positionScore: 0.22,
    rawHotSharePre: 0.602,
    rawHotSharePost: 0.628,
    rditHotShareDelta: null,
    reallocNoAi: 0.159,
    reallocWithAi: 0.221,
    convReallocNoAi: 0.089,
    convReallocWithAi: 0.057,
    convRetainedNoAi: 0.030,
    convRetainedWithAi: 0.026,
    durationSecPre: 47.4,
    durationSecPost: 46.8,
    rditConvDeltaPp: null,
    rditReallocDeltaPp: null,
    rditDurationLogDelta: null,
  },
  {
    bin: '21–30',
    midpoint: 25.5,
    weight: 0.20,
    positionScore: -0.05,
    rawHotSharePre: 0.545,
    rawHotSharePost: 0.594,
    rditHotShareDelta: null,
    reallocNoAi: 0.134,
    reallocWithAi: 0.195,
    convReallocNoAi: 0.083,
    convReallocWithAi: 0.050,
    convRetainedNoAi: 0.034,
    convRetainedWithAi: 0.027,
    durationSecPre: 44.6,
    durationSecPost: 44.2,
    rditConvDeltaPp: null,
    rditReallocDeltaPp: null,
    rditDurationLogDelta: null,
  },
  {
    bin: '31–50',
    midpoint: 40.5,
    weight: 0.22,
    positionScore: -0.35,
    rawHotSharePre: 0.492,
    rawHotSharePost: 0.568,
    rditHotShareDelta: null,
    reallocNoAi: 0.126,
    reallocWithAi: 0.205,
    convReallocNoAi: 0.074,
    convReallocWithAi: 0.045,
    convRetainedNoAi: 0.035,
    convRetainedWithAi: 0.030,
    durationSecPre: 40.8,
    durationSecPost: 41.2,
    rditConvDeltaPp: null,
    rditReallocDeltaPp: null,
    rditDurationLogDelta: null,
  },
  {
    bin: '51–80',
    midpoint: 65.5,
    weight: 0.10,
    positionScore: -0.68,
    rawHotSharePre: 0.439,
    rawHotSharePost: 0.542,
    rditHotShareDelta: null,
    reallocNoAi: 0.153,
    reallocWithAi: 0.247,
    convReallocNoAi: 0.069,
    convReallocWithAi: 0.039,
    convRetainedNoAi: 0.033,
    convRetainedWithAi: 0.029,
    durationSecPre: 37.5,
    durationSecPost: 38.6,
    rditConvDeltaPp: null,
    rditReallocDeltaPp: null,
    rditDurationLogDelta: null,
  },
  {
    bin: '81–120',
    midpoint: 95,
    weight: 0.08,
    positionScore: -1.0,
    rawHotSharePre: 0.379,
    rawHotSharePost: 0.558,
    rditHotShareDelta: -0.8,
    reallocNoAi: 0.199,
    reallocWithAi: 0.374,
    convReallocNoAi: 0.028,
    convReallocWithAi: 0.022,
    convRetainedNoAi: 0.033,
    convRetainedWithAi: 0.042,
    durationSecPre: 34.9,
    durationSecPost: 37.1,
    rditConvDeltaPp: 3.4,
    rditReallocDeltaPp: -21.4,
    rditDurationLogDelta: 0.003,
  },
];

// Table F2 calibrated scalar parameters
export const CALIBRATED_PARAMS = {
  L_HUMAN_COLD_CONV: 0.015, // Human conversion on cold leads
  S_AI_HOT_CONV: 0.024, // AI conversion on hot leads (overflow)
  RATIO_AI_COLD: 0.7, // AI vs human cold conversion ratio -> 0.0105
  RHO_NO_AI_COLD: 0.1913, // AI/human cold volume pre-AI
  RHO_WITH_AI_COLD: 1.8354, // AI/human cold volume post-AI
  PHI_PRE: 0.10, // Pre-AI rhythm
  PHI_POST: 0.22, // Post-AI front-loaded rhythm
  PHI_OPTIMAL_UNCONSTRAINED: 0.077,
  ALPHA_PRE: 0.606, // Pre-AI average hot-lead share
  ALPHA_POST: 0.646, // Post-AI average hot-lead share
  BENCHMARK_T: 50, // Calls per worker-day
};

export interface SimulationParams {
  alphaHotShare: number; // 0.40 - 0.90
  rhythmPhi: number; // 0.05 - 0.26 (>0 front-loaded)
  guardrailStrength: number; // 0 (open zero-penalty reallocation) to 1 (strict RevOps NLP guardrail + credit split)
  dailyHumanCalls: number; // e.g., 5000 calls/day
  avgPolicyValueUsd: number; // e.g., 420 USD
}

export interface BinSimulationResult {
  bin: string;
  hotShare: number;
  convPreAi: number; // %
  convNaiveAi: number; // %
  convSimulated: number; // %
  reallocPreAi: number; // %
  reallocNaiveAi: number; // %
  reallocSimulated: number; // %
  reservationValueIndex: number; // 0-100 index of outside-option temptation
}

export interface SimulationSummary {
  bins: BinSimulationResult[];
  humanHotYieldPct: number;
  firmConvPerCallPct: number;
  naiveFirmConvPerCallPct: number;
  preAiFirmConvPerCallPct: number;
  liftVsNaivePct: number;
  dailyConversions: number;
  dailyRevenueUsd: number;
  dailyDeltaRevenueVsNaiveUsd: number;
  earlyReallocRatePct: number;
  orderingEffectPct: number;
  conductEffectPct: number;
}

/**
 * Computes the calibrated order-level profiles using Appendix F.3 linear interpolation in rhythm phi,
 * plus an optional RevOps reallocation guardrail lever (0..1) that dampens early-shift conduct pullback.
 */
export function runShiftSimulation(params: SimulationParams): SimulationSummary {
  const { alphaHotShare, rhythmPhi, guardrailStrength, dailyHumanCalls, avgPolicyValueUsd } = params;
  const { PHI_PRE, PHI_POST, L_HUMAN_COLD_CONV } = CALIBRATED_PARAMS;

  // Guardrail reduces effective behavioral sensitivity to steep rhythm by dampening premature release
  const effectivePhiForConduct =
    PHI_PRE + (rhythmPhi - PHI_PRE) * (1 - 0.55 * guardrailStrength);

  const interpWeight = (effectivePhiForConduct - PHI_PRE) / (PHI_POST - PHI_PRE);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  let weightedHotConv = 0;
  let weightedHotWeight = 0;
  let totalFirmConvSim = 0;
  let totalFirmConvNaive = 0;
  let totalFirmConvPre = 0;

  const bins: BinSimulationResult[] = ORDER_BIN_PROFILES.map((row) => {
    // Baseline conversion rates (Table F1 four-part identity: S_bar = P^R * S^{G,R} + (1 - P^R) * S^{G,NR})
    const convPre =
      row.reallocNoAi * row.convReallocNoAi + (1 - row.reallocNoAi) * row.convRetainedNoAi;
    const convNaive =
      row.reallocWithAi * row.convReallocWithAi + (1 - row.reallocWithAi) * row.convRetainedWithAi;

    // Interpolated conduct profiles at current rhythm phi
    const pR = clamp(
      row.reallocNoAi + interpWeight * (row.reallocWithAi - row.reallocNoAi),
      0.06,
      0.55
    );
    const sGR = clamp(
      row.convReallocNoAi + interpWeight * (row.convReallocWithAi - row.convReallocNoAi),
      0.015,
      0.38
    );
    const sGNR = clamp(
      row.convRetainedNoAi + interpWeight * (row.convRetainedWithAi - row.convRetainedNoAi),
      0.015,
      0.065
    );

    // Additional direct NLP objection coaching boost on retained calls when guardrail/co-pilot is active
    const copilotPersistenceLift = guardrailStrength * 0.006 * Math.max(0, row.positionScore);
    const convSim = pR * sGR + (1 - pR) * (sGNR + copilotPersistenceLift);

    // Hot-lead share profile P^G(j) = alpha + phi * positionScore * scale
    const hotShareSim = clamp(alphaHotShare + rhythmPhi * row.positionScore * 0.85, 0.15, 0.96);
    const hotShareNaive = clamp(
      CALIBRATED_PARAMS.ALPHA_POST + PHI_POST * row.positionScore * 0.85,
      0.15,
      0.96
    );
    const hotSharePre = clamp(
      CALIBRATED_PARAMS.ALPHA_PRE + PHI_PRE * row.positionScore * 0.85,
      0.15,
      0.96
    );

    // Weighted yield accumulation
    weightedHotConv += row.weight * hotShareSim * convSim;
    weightedHotWeight += row.weight * hotShareSim;

    // Per-call firm conversion (hot + cold)
    totalFirmConvSim +=
      row.weight * (hotShareSim * convSim + (1 - hotShareSim) * L_HUMAN_COLD_CONV);
    totalFirmConvNaive +=
      row.weight * (hotShareNaive * convNaive + (1 - hotShareNaive) * L_HUMAN_COLD_CONV);
    totalFirmConvPre +=
      row.weight * (hotSharePre * convPre + (1 - hotSharePre) * L_HUMAN_COLD_CONV);

    // Reservation value temptation index (0-100): high when early in shift & front-loaded rhythm & high alpha
    const remainingHorizonFactor = (row.positionScore + 1) / 2; // 1 at start, 0 at end
    const reservationValueIndex = Math.round(
      clamp(
        (28 + alphaHotShare * 32 + (effectivePhiForConduct / 0.25) * 40) *
          (0.35 + 0.65 * remainingHorizonFactor),
        10,
        98
      )
    );

    return {
      bin: row.bin,
      hotShare: Number((hotShareSim * 100).toFixed(1)),
      convPreAi: Number((convPre * 100).toFixed(2)),
      convNaiveAi: Number((convNaive * 100).toFixed(2)),
      convSimulated: Number((convSim * 100).toFixed(2)),
      reallocPreAi: Number((row.reallocNoAi * 100).toFixed(1)),
      reallocNaiveAi: Number((row.reallocWithAi * 100).toFixed(1)),
      reallocSimulated: Number((pR * 100).toFixed(1)),
      reservationValueIndex,
    };
  });

  const humanHotYieldPct = (weightedHotConv / weightedHotWeight) * 100;
  const firmConvPerCallPct = totalFirmConvSim * 100;
  const naiveFirmConvPerCallPct = totalFirmConvNaive * 100;
  const preAiFirmConvPerCallPct = totalFirmConvPre * 100;
  const liftVsNaivePct =
    ((firmConvPerCallPct - naiveFirmConvPerCallPct) / naiveFirmConvPerCallPct) * 100;

  const dailyConversions = dailyHumanCalls * totalFirmConvSim;
  const naiveDailyConversions = dailyHumanCalls * totalFirmConvNaive;
  const dailyRevenueUsd = dailyConversions * avgPolicyValueUsd;
  const dailyDeltaRevenueVsNaiveUsd = (dailyConversions - naiveDailyConversions) * avgPolicyValueUsd;

  // Compute decomposition components vs Pre-AI baseline
  const orderingEffectPct = Number(
    (0.58 * ((rhythmPhi - PHI_PRE) / (PHI_POST - PHI_PRE))).toFixed(2)
  );
  const conductEffectPct = Number(
    (-17.58 * ((effectivePhiForConduct - PHI_PRE) / (PHI_POST - PHI_PRE)) +
      guardrailStrength * 4.2).toFixed(2)
  );

  return {
    bins,
    humanHotYieldPct: Number(humanHotYieldPct.toFixed(2)),
    firmConvPerCallPct: Number(firmConvPerCallPct.toFixed(3)),
    naiveFirmConvPerCallPct: Number(naiveFirmConvPerCallPct.toFixed(3)),
    preAiFirmConvPerCallPct: Number(preAiFirmConvPerCallPct.toFixed(3)),
    liftVsNaivePct: Number(liftVsNaivePct.toFixed(1)),
    dailyConversions: Math.round(dailyConversions),
    dailyRevenueUsd: Math.round(dailyRevenueUsd),
    dailyDeltaRevenueVsNaiveUsd: Math.round(dailyDeltaRevenueVsNaiveUsd),
    earlyReallocRatePct: bins[0].reallocSimulated,
    orderingEffectPct,
    conductEffectPct,
  };
}

/**
 * Generates the counterfactual yield curve across phi in [0.06, 0.26] for Figure F1 Panel (b)
 */
export function buildRhythmYieldCurve(alphaHotShare: number, guardrailStrength: number) {
  const points: {
    phi: number;
    phiLabel: string;
    yieldPerCall: number;
    ciLower: number;
    ciUpper: number;
    inObservedSupport: boolean;
  }[] = [];

  for (let p = 0.06; p <= 0.265; p += 0.02) {
    const phi = Number(p.toFixed(2));
    const sim = runShiftSimulation({
      alphaHotShare,
      rhythmPhi: phi,
      guardrailStrength,
      dailyHumanCalls: 5000,
      avgPolicyValueUsd: 420,
    });
    const val = Number((sim.firmConvPerCallPct / 100).toFixed(4));
    const spread = phi < 0.10 || phi > 0.22 ? 0.0022 : 0.0011;
    points.push({
      phi,
      phiLabel: phi.toFixed(2),
      yieldPerCall: Number((val * 100).toFixed(2)),
      ciLower: Number(((val - spread) * 100).toFixed(2)),
      ciUpper: Number(((val + spread) * 100).toFixed(2)),
      inObservedSupport: phi >= 0.10 && phi <= 0.22,
    });
  }
  return points;
}

export const RESEARCH_SUMMARY_STATS = {
  totalCalls: 567090,
  humanCalls: 409622,
  aiCalls: 157468,
  agentDays: 13053,
  expansionDate: 'August 28, 2024',
  aiColdShareJump: '<25% to >60%',
  earlyHotShareJumpPp: '+23.4 pp',
  earlyConvDropPp: '-4.5 pp',
  earlyReallocJumpPp: '+8.1 pp',
  earlyDurationDropPct: '-13.0%',
  reallocatedDownstreamConv: '5.7%',
  retainedDownstreamConv: '3.0%',
  reallocatedExpectedValRmb: '¥4.6',
  retainedExpectedValRmb: '¥2.7',
  orderingChannelPct: '+0.58%',
  conductChannelPct: '-17.58%',
  netHotYieldPct: '-17.00%',
  dailyHumanLossVsAiGain: '50.5 lost vs 7.7 recovered (~7:1)',
  rhythmRecoveryPct: '+13.5%',
  rhythmRecoveryCi: '10.5% – 16.6%',
};

export interface PresetLeadScenario {
  id: string;
  label: string;
  mode: 'ai_voice' | 'human_copilot';
  callPosition: number;
  leadProfile: {
    name: string;
    product: string;
    initialTemp: 'HOT' | 'COLD';
    dropStage: string;
    annualPremiumUsd: number;
    priorAttempts: number;
    personaContext: string;
  };
  openingAgentLine: string;
  quickCustomerPrompts: string[];
}

export const PRESET_NLP_SCENARIOS: PresetLeadScenario[] = [
  {
    id: 'hot-checkout-hesitation',
    label: 'Hot Lead · Payment Drop (Call #2)',
    mode: 'human_copilot',
    callPosition: 2,
    leadProfile: {
      name: 'David Chen',
      product: 'Comprehensive Critical-Illness & Hospital Shield',
      initialTemp: 'HOT',
      dropStage: 'Reached payment gateway, exited before card confirmation',
      annualPremiumUsd: 680,
      priorAttempts: 1,
      personaContext:
        'Interested and already selected coverage tier, but paused at checkout because he wants to verify pre-existing waiting periods and compare monthly vs annual billing with his spouse.',
    },
    openingAgentLine:
      'Hi David, this is Alex from Policy Care following up on the Critical-Illness Shield plan you configured earlier today. I saw you made it right up to checkout—was there a question on coverage or billing I can clear up for you?',
    quickCustomerPrompts: [
      'Honestly I got to the payment screen and froze—$680 upfront feels steep and I am not sure about the 90-day waiting period.',
      'I am walking into a meeting right now, can you just email me something? I need to ask my wife first anyway.',
      'Does it cover outpatient surgery if I switch to monthly installments instead of paying all at once?',
      'Okay, if monthly billing is $59 with no extra fee and waiting period is waived for accidents, send me the checkout link now.',
    ],
  },
  {
    id: 'cold-early-browse-escalation',
    label: 'Cold Lead · Browse Drop → Hot Escalation',
    mode: 'ai_voice',
    callPosition: 18,
    leadProfile: {
      name: 'Maya Patel',
      product: 'Family Accident & Health Deductible Plan',
      initialTemp: 'COLD',
      dropStage: 'Viewed plan comparison page for 40s, left phone number, no checkout visit',
      annualPremiumUsd: 540,
      priorAttempts: 0,
      personaContext:
        'Initially just browsing rates while comparing employer coverage, skeptical of automated calls, but genuinely needs supplemental coverage for her two kids starting next month.',
    },
    openingAgentLine:
      'Hello Maya, I am calling from our automated coverage desk regarding the Family Health plan quote you viewed earlier. Are you still exploring options for your household, or did you already find a policy?',
    quickCustomerPrompts: [
      'I was just glancing at prices while on lunch break, not really ready to buy anything today.',
      'Wait—actually my employer deductible just jumped to $4,000. Does your family plan cover kids sports injuries right away?',
      'That actually sounds way better than what I have. Can someone walk me through adding my two kids and lock the rate today?',
      'Please take me off your call list, I do not want any more phone calls.',
    ],
  },
  {
    id: 'hot-complex-objection',
    label: 'Hot Lead · Complex Objection (Call #1)',
    mode: 'human_copilot',
    callPosition: 1,
    leadProfile: {
      name: 'Elena Rostova',
      product: 'Executive Health & Oncology Rider',
      initialTemp: 'HOT',
      dropStage: 'Filled beneficiary details & reached payment confirmation page',
      annualPremiumUsd: 1120,
      priorAttempts: 2,
      personaContext:
        'High-value hot lead who requires careful, patient explanation of claim payout triggers. Easily triggers early-shift agent reallocation because closing takes 3-4 minutes instead of a quick 45-second close.',
    },
    openingAgentLine:
      'Good morning Elena, thanks for picking up. I see your Executive Health & Oncology Rider application is saved right at final confirmation—how can I help finalize the details for you?',
    quickCustomerPrompts: [
      'I read the fine print at checkout and I am skeptical—how do I know a lump-sum oncology claim actually pays out without months of red tape?',
      'Another insurer quoted me $150 less per year. Why should I stay with this policy?',
      'If you can guarantee the direct hospital network list includes St. Jude Medical and email the rider summary, I will complete payment right now.',
    ],
  },
];
