import { BusinessInputs } from './businessModel';

export type TimeWindowId = 'opening' | 'midday' | 'afternoon';
export type SkillTagId = 'objection_closing' | 'warm_transfer_empathy' | 'high_velocity_dialing';

export interface TimeWindowWeight {
  id: TimeWindowId;
  label: string;
  hours: string;
  shiftShareWeight: number; // share of daily volume
  hotToHumanPct: number; // 0-100 (remainder overflows to AI)
  coldToAiPct: number; // 0-100 (remainder goes to human pacing)
}

export interface SkillTagWeight {
  id: SkillTagId;
  label: string;
  specialty: string;
  repIds: string[];
  repNames: string[];
  hotWeight: number; // 0-100 relative weight
  coldWeight: number; // 0-100 relative weight
  allowWarmTransfer: boolean;
  closeMultiplier: number; // skill match conversion lift
}

export interface RoutingLogicConfig {
  presetId: string;
  useCustomWeights: boolean;
  activeWindow: TimeWindowId;
  nlpWarmTransferThreshold: number; // 55-90 intent score trigger
  timeWindows: Record<TimeWindowId, TimeWindowWeight>;
  skillTags: Record<SkillTagId, SkillTagWeight>;
}

export interface RoutingPreset {
  id: string;
  label: string;
  summary: string;
  config: Omit<RoutingLogicConfig, 'presetId' | 'useCustomWeights'>;
}

export const REP_SKILL_MAP: Record<string, SkillTagId> = {
  maya: 'objection_closing',
  marcus: 'objection_closing',
  priya: 'warm_transfer_empathy',
  sofia: 'warm_transfer_empathy',
  devon: 'high_velocity_dialing',
  liam: 'high_velocity_dialing',
};

export const ROUTING_PRESETS: RoutingPreset[] = [
  {
    id: 'balanced_revops',
    label: 'Balanced RevOps Pacing',
    summary: 'Protects opening-shift patience, routes tough hot deals to Objection Closers, and routes AI warm transfers to Empathy reps.',
    config: {
      activeWindow: 'opening',
      nlpWarmTransferThreshold: 72,
      timeWindows: {
        opening: {
          id: 'opening',
          label: 'Opening Shift',
          hours: '9–11 AM',
          shiftShareWeight: 0.37,
          hotToHumanPct: 88,
          coldToAiPct: 58,
        },
        midday: {
          id: 'midday',
          label: 'Midday',
          hours: '12–2 PM',
          shiftShareWeight: 0.32,
          hotToHumanPct: 92,
          coldToAiPct: 68,
        },
        afternoon: {
          id: 'afternoon',
          label: 'Afternoon',
          hours: '3–5 PM',
          shiftShareWeight: 0.31,
          hotToHumanPct: 95,
          coldToAiPct: 72,
        },
      },
      skillTags: {
        objection_closing: {
          id: 'objection_closing',
          label: 'Objection Closing',
          specialty: 'High-ACV checkout hesitation & pricing pushback',
          repIds: ['maya', 'marcus'],
          repNames: ['Maya Chen', 'Marcus Vance'],
          hotWeight: 85,
          coldWeight: 25,
          allowWarmTransfer: true,
          closeMultiplier: 1.14,
        },
        warm_transfer_empathy: {
          id: 'warm_transfer_empathy',
          label: 'Warm Transfer & Empathy',
          specialty: 'Live NLP escalations & consultative discovery',
          repIds: ['priya', 'sofia'],
          repNames: ['Priya Patel', 'Sofia Reyes'],
          hotWeight: 65,
          coldWeight: 75,
          allowWarmTransfer: true,
          closeMultiplier: 1.1,
        },
        high_velocity_dialing: {
          id: 'high_velocity_dialing',
          label: 'High-Velocity Dialing',
          specialty: 'Rapid follow-up & peak queue clearing',
          repIds: ['devon', 'liam'],
          repNames: ['Devon Brooks', "Liam O'Connor"],
          hotWeight: 35,
          coldWeight: 60,
          allowWarmTransfer: false,
          closeMultiplier: 0.94,
        },
      },
    },
  },
  {
    id: 'ai_cost_saver',
    label: 'Aggressive AI Cost Saver',
    summary: 'Maximizes $0.06/call AI cold screening across all dayparts and pushes peak hot overflow to AI Pods.',
    config: {
      activeWindow: 'opening',
      nlpWarmTransferThreshold: 80,
      timeWindows: {
        opening: {
          id: 'opening',
          label: 'Opening Shift',
          hours: '9–11 AM',
          shiftShareWeight: 0.37,
          hotToHumanPct: 78,
          coldToAiPct: 88,
        },
        midday: {
          id: 'midday',
          label: 'Midday',
          hours: '12–2 PM',
          shiftShareWeight: 0.32,
          hotToHumanPct: 82,
          coldToAiPct: 90,
        },
        afternoon: {
          id: 'afternoon',
          label: 'Afternoon',
          hours: '3–5 PM',
          shiftShareWeight: 0.31,
          hotToHumanPct: 80,
          coldToAiPct: 92,
        },
      },
      skillTags: {
        objection_closing: {
          id: 'objection_closing',
          label: 'Objection Closing',
          specialty: 'High-ACV checkout hesitation & pricing pushback',
          repIds: ['maya', 'marcus'],
          repNames: ['Maya Chen', 'Marcus Vance'],
          hotWeight: 70,
          coldWeight: 10,
          allowWarmTransfer: true,
          closeMultiplier: 1.14,
        },
        warm_transfer_empathy: {
          id: 'warm_transfer_empathy',
          label: 'Warm Transfer & Empathy',
          specialty: 'Live NLP escalations & consultative discovery',
          repIds: ['priya', 'sofia'],
          repNames: ['Priya Patel', 'Sofia Reyes'],
          hotWeight: 50,
          coldWeight: 45,
          allowWarmTransfer: true,
          closeMultiplier: 1.1,
        },
        high_velocity_dialing: {
          id: 'high_velocity_dialing',
          label: 'High-Velocity Dialing',
          specialty: 'Rapid follow-up & peak queue clearing',
          repIds: ['devon', 'liam'],
          repNames: ['Devon Brooks', "Liam O'Connor"],
          hotWeight: 80,
          coldWeight: 85,
          allowWarmTransfer: false,
          closeMultiplier: 0.94,
        },
      },
    },
  },
  {
    id: 'vip_human_floor',
    label: 'VIP White-Glove Human',
    summary: 'Routes nearly all hot deals and a majority of inquiries to human specialists, prioritizing top closers.',
    config: {
      activeWindow: 'opening',
      nlpWarmTransferThreshold: 62,
      timeWindows: {
        opening: {
          id: 'opening',
          label: 'Opening Shift',
          hours: '9–11 AM',
          shiftShareWeight: 0.37,
          hotToHumanPct: 98,
          coldToAiPct: 24,
        },
        midday: {
          id: 'midday',
          label: 'Midday',
          hours: '12–2 PM',
          shiftShareWeight: 0.32,
          hotToHumanPct: 96,
          coldToAiPct: 30,
        },
        afternoon: {
          id: 'afternoon',
          label: 'Afternoon',
          hours: '3–5 PM',
          shiftShareWeight: 0.31,
          hotToHumanPct: 95,
          coldToAiPct: 35,
        },
      },
      skillTags: {
        objection_closing: {
          id: 'objection_closing',
          label: 'Objection Closing',
          specialty: 'High-ACV checkout hesitation & pricing pushback',
          repIds: ['maya', 'marcus'],
          repNames: ['Maya Chen', 'Marcus Vance'],
          hotWeight: 95,
          coldWeight: 40,
          allowWarmTransfer: true,
          closeMultiplier: 1.14,
        },
        warm_transfer_empathy: {
          id: 'warm_transfer_empathy',
          label: 'Warm Transfer & Empathy',
          specialty: 'Live NLP escalations & consultative discovery',
          repIds: ['priya', 'sofia'],
          repNames: ['Priya Patel', 'Sofia Reyes'],
          hotWeight: 80,
          coldWeight: 85,
          allowWarmTransfer: true,
          closeMultiplier: 1.1,
        },
        high_velocity_dialing: {
          id: 'high_velocity_dialing',
          label: 'High-Velocity Dialing',
          specialty: 'Rapid follow-up & peak queue clearing',
          repIds: ['devon', 'liam'],
          repNames: ['Devon Brooks', "Liam O'Connor"],
          hotWeight: 25,
          coldWeight: 55,
          allowWarmTransfer: true,
          closeMultiplier: 0.94,
        },
      },
    },
  },
];

export function createDefaultRoutingConfig(): RoutingLogicConfig {
  const base = ROUTING_PRESETS[0];
  return {
    presetId: base.id,
    useCustomWeights: true,
    activeWindow: base.config.activeWindow,
    nlpWarmTransferThreshold: base.config.nlpWarmTransferThreshold,
    timeWindows: {
      opening: { ...base.config.timeWindows.opening },
      midday: { ...base.config.timeWindows.midday },
      afternoon: { ...base.config.timeWindows.afternoon },
    },
    skillTags: {
      objection_closing: { ...base.config.skillTags.objection_closing },
      warm_transfer_empathy: { ...base.config.skillTags.warm_transfer_empathy },
      high_velocity_dialing: { ...base.config.skillTags.high_velocity_dialing },
    },
  };
}

/**
 * Picks a rep from candidate list using configured Skill Tag weights.
 */
export function pickWeightedRepId<T extends { id: string }>(
  candidates: T[],
  config: RoutingLogicConfig,
  callCategory: 'HOT' | 'COLD' | 'WARM_TRANSFER'
): T | undefined {
  if (candidates.length === 0) return undefined;

  const scored = candidates.map((rep) => {
    const skillId = REP_SKILL_MAP[rep.id] ?? 'high_velocity_dialing';
    const tag = config.skillTags[skillId];
    let weight = 1;
    if (callCategory === 'HOT') {
      weight = Math.max(1, tag.hotWeight);
    } else if (callCategory === 'WARM_TRANSFER') {
      weight = tag.allowWarmTransfer ? Math.max(5, tag.coldWeight + 25) : 1;
    } else {
      weight = Math.max(1, tag.coldWeight);
    }
    return { rep, weight };
  });

  const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * totalWeight;
  for (const s of scored) {
    r -= s.weight;
    if (r <= 0) return s.rep;
  }
  return scored[scored.length - 1].rep;
}

/**
 * Computes projected commercial impact of the user's custom Routing Logic rules.
 */
export function evaluateRoutingLogicImpact(
  inputs: BusinessInputs,
  config: RoutingLogicConfig
) {
  const windows = Object.values(config.timeWindows);
  const skills = Object.values(config.skillTags);

  const blendedHotToHumanPct = windows.reduce(
    (acc, w) => acc + w.hotToHumanPct * w.shiftShareWeight,
    0
  );
  const blendedColdToAiPct = windows.reduce(
    (acc, w) => acc + w.coldToAiPct * w.shiftShareWeight,
    0
  );

  // Skill match multiplier for Hot calls
  const totalHotSkillW = skills.reduce((s, k) => s + Math.max(1, k.hotWeight), 0);
  const hotSkillMultiplier = skills.reduce(
    (s, k) => s + (Math.max(1, k.hotWeight) / totalHotSkillW) * k.closeMultiplier,
    0
  );

  // Opening-shift cherry-picking penalty if opening Cold-to-AI is very high (>75%) without pacing
  const openingColdAi = config.timeWindows.opening.coldToAiPct;
  const cherryPickPenalty =
    openingColdAi > 75 ? ((openingColdAi - 75) / 25) * 0.14 : 0;

  // Warm transfer capture rate rises when threshold is lower (e.g. 60-72) and empathy reps are eligible
  const eligibleTransferSkills = skills.filter((k) => k.allowWarmTransfer).length;
  const warmTransferRate =
    eligibleTransferSkills > 0
      ? Math.max(0.004, ((95 - config.nlpWarmTransferThreshold) / 35) * 0.016) *
        (0.7 + eligibleTransferSkills * 0.12)
      : 0;

  const hotLeads = inputs.dailyLeads * (inputs.hotLeadSharePct / 100);
  const coldLeads = inputs.dailyLeads - hotLeads;

  const hotHumanCalls = hotLeads * (blendedHotToHumanPct / 100);
  const hotAiOverflowCalls = hotLeads - hotHumanCalls;
  const coldAiCalls = coldLeads * (blendedColdToAiPct / 100);
  const coldHumanCalls = coldLeads - coldAiCalls;

  const totalHumanCalls = hotHumanCalls + coldHumanCalls;
  const totalAiCalls = hotAiOverflowCalls + coldAiCalls;

  const effectiveHotClose = 0.068 * hotSkillMultiplier * (1 - cherryPickPenalty);
  const dailyDeals =
    hotHumanCalls * effectiveHotClose +
    coldHumanCalls * 0.016 +
    coldAiCalls * (0.012 + warmTransferRate) +
    hotAiOverflowCalls * 0.026;

  const dailyRevenueUsd = Math.round(dailyDeals * inputs.avgDealValueUsd);
  const dailyCostUsd = Math.round(
    totalHumanCalls * inputs.humanCostPerCallUsd + totalAiCalls * inputs.aiCostPerCallUsd
  );
  const dailyNetProfitUsd = dailyRevenueUsd - dailyCostUsd;

  const guardrailLabel =
    openingColdAi <= 65
      ? 'Strong Pacing'
      : openingColdAi <= 80
      ? 'Moderate Risk'
      : 'High Cherry-Pick Risk';

  return {
    blendedHotToHumanPct: Math.round(blendedHotToHumanPct),
    blendedColdToAiPct: Math.round(blendedColdToAiPct),
    dailyRevenueUsd,
    dailyCostUsd,
    dailyNetProfitUsd,
    monthlyNetProfitUsd: dailyNetProfitUsd * 22,
    hotSkillMultiplier: Number(hotSkillMultiplier.toFixed(2)),
    estimatedWarmTransfersPerDay: Math.round(coldAiCalls * warmTransferRate),
    guardrailLabel,
  };
}
