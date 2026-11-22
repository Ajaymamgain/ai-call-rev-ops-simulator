import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Calculator, Minus } from 'lucide-react';
import {
  buildStrategyComparisonBars,
  BusinessEconomicsSummary,
  BusinessInputs,
  BusinessStrategy,
  formatCurrencyCompact,
  STRATEGY_PROFILES,
} from '../data/businessModel';

interface ProfitSensitivityTableProps {
  inputs: BusinessInputs;
  economics: BusinessEconomicsSummary;
  onSelectStrategy: (strategy: BusinessStrategy) => void;
}

const DELTAS = [-20, -10, -5, 0, 5, 10, 20] as const;
type DeltaPct = (typeof DELTAS)[number];
type Timeframe = 'daily' | 'monthly' | 'annual';
type CellView = 'delta' | 'total';

const PERIOD_MULTIPLIER: Record<Timeframe, { mult: number; label: string; suffix: string }> = {
  daily: { mult: 1, label: 'Daily', suffix: '/day' },
  monthly: { mult: 22, label: 'Monthly (22d)', suffix: '/mo' },
  annual: { mult: 260, label: 'Annual (260d)', suffix: '/yr' },
};

export const ProfitSensitivityTable: React.FC<ProfitSensitivityTableProps> = ({
  inputs,
  economics,
  onSelectStrategy,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly');
  const [cellView, setCellView] = useState<CellView>('delta');
  const [selectedCell, setSelectedCell] = useState<{ acvDelta: DeltaPct; closeDelta: DeltaPct }>({
    acvDelta: 10,
    closeDelta: 10,
  });

  const period = PERIOD_MULTIPLIER[timeframe];

  // Use exact unrounded daily deals for clean monotonic sensitivity math
  const exactBaseDailyDeals = useMemo(() => {
    return inputs.avgDealValueUsd > 0
      ? economics.dailyRevenueUsd / inputs.avgDealValueUsd
      : economics.dailyDealsClosed;
  }, [economics.dailyRevenueUsd, economics.dailyDealsClosed, inputs.avgDealValueUsd]);

  const basePeriodProfitUsd = economics.dailyNetMarginUsd * period.mult;
  const basePeriodCostUsd = economics.dailyOperatingCostUsd * period.mult;

  const computeCell = (acvDelta: DeltaPct, closeDelta: DeltaPct) => {
    const adjustedAcvUsd = inputs.avgDealValueUsd * (1 + acvDelta / 100);
    const adjustedCloseRatePct = economics.blendedCloseRatePct * (1 + closeDelta / 100);
    const adjustedDailyDeals = exactBaseDailyDeals * (1 + closeDelta / 100);
    const periodRevenueUsd = Math.round(adjustedDailyDeals * adjustedAcvUsd * period.mult);
    const periodProfitUsd = periodRevenueUsd - basePeriodCostUsd;
    const profitDeltaUsd = periodProfitUsd - basePeriodProfitUsd;
    const profitDeltaPct =
      basePeriodProfitUsd !== 0 ? (profitDeltaUsd / Math.abs(basePeriodProfitUsd)) * 100 : 0;

    return {
      acvDelta,
      closeDelta,
      adjustedAcvUsd,
      adjustedCloseRatePct,
      periodRevenueUsd,
      periodProfitUsd,
      profitDeltaUsd,
      profitDeltaPct,
    };
  };

  const selectedMetrics = useMemo(
    () => computeCell(selectedCell.acvDelta, selectedCell.closeDelta),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCell, inputs, economics, timeframe]
  );

  // Compare all 3 routing strategies under the selected sensitivity scenario
  const strategyCrossCheck = useMemo(() => {
    const baseBars = buildStrategyComparisonBars(inputs);
    const revScale = (1 + selectedCell.acvDelta / 100) * (1 + selectedCell.closeDelta / 100);
    return baseBars.map((b) => {
      const dailyRev = b.monthlyRevenueUsd / 22;
      const dailyCost = b.monthlyCostUsd / 22;
      const scaledPeriodProfit = Math.round((dailyRev * revScale - dailyCost) * period.mult);
      const baseStratProfit = Math.round((dailyRev - dailyCost) * period.mult);
      return {
        id: b.id as BusinessStrategy,
        name: b.strategy,
        scaledProfitUsd: scaledPeriodProfit,
        deltaUsd: scaledPeriodProfit - baseStratProfit,
      };
    });
  }, [inputs, selectedCell, period.mult]);

  const activeProfile = STRATEGY_PROFILES[inputs.strategy];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Profit Sensitivity Analysis (ACV × Close Rate)
            </h2>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-xs font-medium text-slate-600">{activeProfile.shortName}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Net contribution profit impact if Average Deal Value (ACV) or Blended Close Rate fluctuates by ±5%, ±10%, or ±20% (operating cost stays fixed, magnifying profit leverage). Click any cell to inspect.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Metric Display Mode */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setCellView('delta')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                cellView === 'delta'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Profit Impact ($ Δ)
            </button>
            <button
              type="button"
              onClick={() => setCellView('total')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                cellView === 'total'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Total Profit ($)
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            {(['daily', 'monthly', 'annual'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf === 'daily' ? 'Daily' : tf === 'monthly' ? 'Monthly' : 'Annual'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 7x7 Sensitivity Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse min-w-[780px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <th className="py-2.5 px-4 text-left w-[170px] border-r border-slate-200">
                <div className="text-slate-900">Close Rate ↓ / ACV →</div>
                <div className="font-normal text-[10.5px] text-slate-500 font-mono">
                  Base: {economics.blendedCloseRatePct.toFixed(2)}% / ${inputs.avgDealValueUsd}
                </div>
              </th>
              {DELTAS.map((acvD) => {
                const adjAcv = Math.round(inputs.avgDealValueUsd * (1 + acvD / 100));
                return (
                  <th
                    key={acvD}
                    className={`py-2.5 px-3 font-mono tabular-nums ${
                      acvD === 0 ? 'bg-slate-100/90 text-slate-900' : ''
                    }`}
                  >
                    <div>{acvD > 0 ? `+${acvD}%` : acvD === 0 ? 'Base (0%)' : `${acvD}%`}</div>
                    <div className="text-[10.5px] font-normal text-slate-500">${adjAcv}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
            {DELTAS.map((closeD) => {
              const adjClose = (economics.blendedCloseRatePct * (1 + closeD / 100)).toFixed(2);
              return (
                <tr key={closeD}>
                  <th
                    scope="row"
                    className={`py-2.5 px-4 text-left font-medium border-r border-slate-200 whitespace-nowrap ${
                      closeD === 0 ? 'bg-slate-100/80 text-slate-900 font-semibold' : 'bg-slate-50/40 text-slate-700'
                    }`}
                  >
                    <span>{closeD > 0 ? `+${closeD}%` : closeD === 0 ? 'Base (0%)' : `${closeD}%`}</span>
                    <span className="ml-2 text-[11px] text-slate-500 font-normal">{adjClose}%</span>
                  </th>

                  {DELTAS.map((acvD) => {
                    const cell = computeCell(acvD, closeD);
                    const isBase = acvD === 0 && closeD === 0;
                    const isSelected =
                      selectedCell.acvDelta === acvD && selectedCell.closeDelta === closeD;
                    const isPositive = cell.profitDeltaUsd > 0;
                    const isNegative = cell.profitDeltaUsd < 0;

                    const cellBg = isBase
                      ? 'bg-slate-900 text-white'
                      : isPositive
                      ? cell.profitDeltaPct >= 25
                        ? 'bg-emerald-100/80 text-emerald-950 hover:bg-emerald-100'
                        : 'bg-emerald-50/65 text-emerald-900 hover:bg-emerald-50'
                      : isNegative
                      ? cell.profitDeltaPct <= -25
                        ? 'bg-red-100/75 text-red-950 hover:bg-red-100'
                        : 'bg-red-50/60 text-red-900 hover:bg-red-50'
                      : 'bg-white text-slate-700 hover:bg-slate-50';

                    return (
                      <td key={acvD} className="p-0.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCell({ acvDelta: acvD, closeDelta: closeD })}
                          className={`w-full px-2.5 py-2 rounded-md text-right transition-colors cursor-pointer ${cellBg} ${
                            isSelected && !isBase ? 'ring-2 ring-slate-900 ring-inset' : ''
                          } ${isSelected && isBase ? 'ring-2 ring-emerald-400 ring-inset' : ''}`}
                        >
                          <div className="font-semibold leading-tight">
                            {isBase
                              ? formatCurrencyCompact(cell.periodProfitUsd)
                              : cellView === 'delta'
                              ? `${cell.profitDeltaUsd > 0 ? '+' : ''}${formatCurrencyCompact(cell.profitDeltaUsd)}`
                              : formatCurrencyCompact(cell.periodProfitUsd)}
                          </div>
                          <div
                            className={`text-[10px] leading-tight mt-0.5 ${
                              isBase
                                ? 'text-slate-300'
                                : isPositive
                                ? 'text-emerald-700'
                                : isNegative
                                ? 'text-red-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {isBase
                              ? 'Base Profit'
                              : cellView === 'delta'
                              ? `${cell.profitDeltaPct > 0 ? '+' : ''}${cell.profitDeltaPct.toFixed(1)}%`
                              : `${cell.profitDeltaUsd > 0 ? '+' : ''}${formatCurrencyCompact(cell.profitDeltaUsd)}`}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Cell Inspector + 3-Routing Comparison */}
      <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div>
            <span className="text-slate-500">Selected Scenario: </span>
            <span className="font-mono font-semibold text-slate-900">
              ACV {selectedCell.acvDelta >= 0 ? `+${selectedCell.acvDelta}%` : `${selectedCell.acvDelta}%`} ($
              {Math.round(selectedMetrics.adjustedAcvUsd)}) · Close{' '}
              {selectedCell.closeDelta >= 0 ? `+${selectedCell.closeDelta}%` : `${selectedCell.closeDelta}%`} (
              {selectedMetrics.adjustedCloseRatePct.toFixed(2)}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <span className="text-slate-500">{period.label} Net Profit:</span>
            <span className="font-semibold text-slate-900">
              {formatCurrencyCompact(selectedMetrics.periodProfitUsd)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                selectedMetrics.profitDeltaUsd > 0
                  ? 'text-emerald-700'
                  : selectedMetrics.profitDeltaUsd < 0
                  ? 'text-red-700'
                  : 'text-slate-500'
              }`}
            >
              {selectedMetrics.profitDeltaUsd > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : selectedMetrics.profitDeltaUsd < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              {selectedMetrics.profitDeltaUsd > 0 ? '+' : ''}
              {formatCurrencyCompact(selectedMetrics.profitDeltaUsd)} (
              {selectedMetrics.profitDeltaPct > 0 ? '+' : ''}
              {selectedMetrics.profitDeltaPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Side-by-side 3-routing profit comparison for this exact scenario */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-500">Compare Routing:</span>
          {strategyCrossCheck.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectStrategy(s.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono tabular-nums border transition-colors cursor-pointer whitespace-nowrap ${
                inputs.strategy === s.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              <span className="font-sans font-medium">{s.name.split(' ')[0]}:</span>{' '}
              {formatCurrencyCompact(s.scaledProfitUsd)}
              {period.suffix}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
