import { BusinessStrategy, STRATEGY_PROFILES } from './businessModel';

export interface ResourceAllocationInputs {
  agentCount: number; // 30 to 130 agents on the sales floor
  monthlyTrainingBudgetUsd: number; // $0 to $40,000 per month
  dailyLeads: number;
  hotLeadSharePct: number;
  strategy: BusinessStrategy;
}

export interface ResourceAllocationMetrics {
  targetHumanCallsPerDay: number;
  callsPerAgentCapacity: number;
  totalFloorCapacityCalls: number;
  handledHumanCallsPerDay: number;
  overflowCallsPerDay: number;
  salesFloorUtilizationPct: number; // 45..100
  humanCostPerCallUsd: number; // derived $/human call
  dailyPayrollUsd: number;
  dailyTrainingUsd: number;
  dailyTotalHumanOpExUsd: number;
  monthlyTotalHumanOpExUsd: number;
  trainingPerAgentMonthlyUsd: number;
  trainingProductivityGainPct: number;
  utilizationStatus: 'Under-Utilized' | 'Optimal Band' | 'Peak Load' | 'Overloaded';
}

const MONTHLY_SALARY_PER_AGENT_USD = 3850;
const BASE_CALLS_PER_AGENT_DAY = 105;

export function computeResourceAllocation(
  params: ResourceAllocationInputs
): ResourceAllocationMetrics {
  const { agentCount, monthlyTrainingBudgetUsd, dailyLeads, hotLeadSharePct, strategy } = params;
  const profile = STRATEGY_PROFILES[strategy];

  const hotLeads = dailyLeads * (hotLeadSharePct / 100);
  const coldLeads = Math.max(0, dailyLeads - hotLeads);
  const targetHumanCallsPerDay = Math.round(
    hotLeads + coldLeads * (1 - profile.aiColdCaptureShare)
  );

  const safeAgents = Math.max(20, agentCount);
  const trainingPerAgentMonthlyUsd = monthlyTrainingBudgetUsd / safeAgents;

  // Diminishing-returns training curve: improves dial/wrap productivity up to +18%
  const productivityBoost = 0.18 * (1 - Math.exp(-trainingPerAgentMonthlyUsd / 240));
  const callsPerAgentCapacity = BASE_CALLS_PER_AGENT_DAY * (1 + productivityBoost);
  const totalFloorCapacityCalls = safeAgents * callsPerAgentCapacity;

  const rawUtilization = (targetHumanCallsPerDay / Math.max(1, totalFloorCapacityCalls)) * 100;
  const salesFloorUtilizationPct = Math.round(Math.max(40, Math.min(100, rawUtilization)));

  const handledHumanCallsPerDay = Math.round(
    Math.min(targetHumanCallsPerDay, totalFloorCapacityCalls)
  );
  const overflowCallsPerDay = Math.max(0, targetHumanCallsPerDay - handledHumanCallsPerDay);

  const monthlyPayrollUsd = safeAgents * MONTHLY_SALARY_PER_AGENT_USD;
  const monthlyTotalHumanOpExUsd = monthlyPayrollUsd + monthlyTrainingBudgetUsd;
  const dailyPayrollUsd = Math.round(monthlyPayrollUsd / 22);
  const dailyTrainingUsd = Math.round(monthlyTrainingBudgetUsd / 22);
  const dailyTotalHumanOpExUsd = dailyPayrollUsd + dailyTrainingUsd;

  const humanCostPerCallUsd = Number(
    Math.max(0.85, Math.min(5.95, dailyTotalHumanOpExUsd / Math.max(1, handledHumanCallsPerDay))).toFixed(2)
  );

  const utilizationStatus: ResourceAllocationMetrics['utilizationStatus'] =
    salesFloorUtilizationPct >= 92
      ? 'Overloaded'
      : salesFloorUtilizationPct >= 85
      ? 'Peak Load'
      : salesFloorUtilizationPct >= 68
      ? 'Optimal Band'
      : 'Under-Utilized';

  return {
    targetHumanCallsPerDay,
    callsPerAgentCapacity: Number(callsPerAgentCapacity.toFixed(1)),
    totalFloorCapacityCalls: Math.round(totalFloorCapacityCalls),
    handledHumanCallsPerDay,
    overflowCallsPerDay,
    salesFloorUtilizationPct,
    humanCostPerCallUsd,
    dailyPayrollUsd,
    dailyTrainingUsd,
    dailyTotalHumanOpExUsd,
    monthlyTotalHumanOpExUsd,
    trainingPerAgentMonthlyUsd: Math.round(trainingPerAgentMonthlyUsd),
    trainingProductivityGainPct: Number((productivityBoost * 100).toFixed(1)),
    utilizationStatus,
  };
}

/**
 * Back-solves agent headcount when a user drags the top-level Utilization slider directly,
 * keeping Commercial Assumptions and Resource Allocation bi-directionally synchronized.
 */
export function solveAgentCountForUtilization(
  desiredUtilizationPct: number,
  monthlyTrainingBudgetUsd: number,
  dailyLeads: number,
  hotLeadSharePct: number,
  strategy: BusinessStrategy
): number {
  const profile = STRATEGY_PROFILES[strategy];
  const hotLeads = dailyLeads * (hotLeadSharePct / 100);
  const coldLeads = Math.max(0, dailyLeads - hotLeads);
  const targetHumanCalls = hotLeads + coldLeads * (1 - profile.aiColdCaptureShare);

  // Two-pass convergence for training-per-agent productivity
  let estAgents = Math.max(30, Math.min(130, Math.round(targetHumanCalls / (BASE_CALLS_PER_AGENT_DAY * (desiredUtilizationPct / 100)))));
  for (let i = 0; i < 2; i++) {
    const trainPerRep = monthlyTrainingBudgetUsd / Math.max(1, estAgents);
    const boost = 0.18 * (1 - Math.exp(-trainPerRep / 240));
    const capPerRep = BASE_CALLS_PER_AGENT_DAY * (1 + boost);
    estAgents = Math.round(targetHumanCalls / (capPerRep * (desiredUtilizationPct / 100)));
  }
  return Math.max(30, Math.min(130, estAgents));
}
