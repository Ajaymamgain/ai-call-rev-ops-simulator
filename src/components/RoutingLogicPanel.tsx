import React, { useMemo } from 'react';
import {
  Clock,
  Flame,
  GitBranch,
  RotateCcw,
  ShieldCheck,
  Snowflake,
  Tag,
} from 'lucide-react';
import { BusinessInputs, formatCurrencyCompact } from '../data/businessModel';
import {
  createDefaultRoutingConfig,
  evaluateRoutingLogicImpact,
  ROUTING_PRESETS,
  RoutingLogicConfig,
  SkillTagId,
  TimeWindowId,
} from '../data/routingLogic';

interface RoutingLogicPanelProps {
  inputs: BusinessInputs;
  config: RoutingLogicConfig;
  onChange: (next: RoutingLogicConfig) => void;
}

const WINDOW_ORDER: TimeWindowId[] = ['opening', 'midday', 'afternoon'];
const SKILL_ORDER: SkillTagId[] = [
  'objection_closing',
  'warm_transfer_empathy',
  'high_velocity_dialing',
];

export const RoutingLogicPanel: React.FC<RoutingLogicPanelProps> = ({
  inputs,
  config,
  onChange,
}) => {
  const impact = useMemo(() => evaluateRoutingLogicImpact(inputs, config), [inputs, config]);

  const totalHotWeight = useMemo(
    () => SKILL_ORDER.reduce((sum, id) => sum + Math.max(1, config.skillTags[id].hotWeight), 0),
    [config.skillTags]
  );
  const totalColdWeight = useMemo(
    () => SKILL_ORDER.reduce((sum, id) => sum + Math.max(1, config.skillTags[id].coldWeight), 0),
    [config.skillTags]
  );

  const applyPreset = (presetId: string) => {
    const preset = ROUTING_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onChange({
      presetId: preset.id,
      useCustomWeights: true,
      activeWindow: config.activeWindow,
      nlpWarmTransferThreshold: preset.config.nlpWarmTransferThreshold,
      timeWindows: {
        opening: { ...preset.config.timeWindows.opening },
        midday: { ...preset.config.timeWindows.midday },
        afternoon: { ...preset.config.timeWindows.afternoon },
      },
      skillTags: {
        objection_closing: { ...preset.config.skillTags.objection_closing },
        warm_transfer_empathy: { ...preset.config.skillTags.warm_transfer_empathy },
        high_velocity_dialing: { ...preset.config.skillTags.high_velocity_dialing },
      },
    });
  };

  const updateWindow = (
    winId: TimeWindowId,
    field: 'hotToHumanPct' | 'coldToAiPct',
    value: number
  ) => {
    onChange({
      ...config,
      presetId: 'custom',
      useCustomWeights: true,
      timeWindows: {
        ...config.timeWindows,
        [winId]: {
          ...config.timeWindows[winId],
          [field]: value,
        },
      },
    });
  };

  const updateSkill = (
    skillId: SkillTagId,
    patch: Partial<RoutingLogicConfig['skillTags'][SkillTagId]>
  ) => {
    onChange({
      ...config,
      presetId: 'custom',
      useCustomWeights: true,
      skillTags: {
        ...config.skillTags,
        [skillId]: {
          ...config.skillTags[skillId],
          ...patch,
        },
      },
    });
  };

  return (
    <section id="routing-logic" className="scroll-mt-20 space-y-4">
      {/* Header + Presets + Live Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Routing Logic Configuration
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Define custom Hot vs. Cold routing weightings by time-of-day shift window and agent skill tag—changes steer the live Call Center Floor Simulator below in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            {ROUTING_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  config.presetId === preset.id && config.useCustomWeights
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onChange({ ...config, useCustomWeights: !config.useCustomWeights })}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              config.useCustomWeights
                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {config.useCustomWeights ? 'Custom Rules: Active' : 'Custom Rules: Paused'}
          </button>

          <button
            type="button"
            onClick={() => onChange(createDefaultRoutingConfig())}
            title="Reset routing weights"
            aria-label="Reset routing weights"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Configuration Surface */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* LEFT 6 COLS: Time-of-Day Weightings */}
          <div className="lg:col-span-6 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Time-of-Day Hot vs. Cold Weightings
                </h3>
              </div>

              <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200 text-[11px]">
                {WINDOW_ORDER.map((winId) => {
                  const win = config.timeWindows[winId];
                  return (
                    <button
                      key={winId}
                      type="button"
                      onClick={() => onChange({ ...config, activeWindow: winId })}
                      className={`px-2 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        config.activeWindow === winId
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {win.hours}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {WINDOW_ORDER.map((winId) => {
                const win = config.timeWindows[winId];
                const isActive = config.activeWindow === winId;
                return (
                  <div
                    key={winId}
                    onClick={() => onChange({ ...config, activeWindow: winId })}
                    className={`rounded-lg border p-3.5 transition-colors cursor-pointer space-y-3 ${
                      isActive
                        ? 'border-slate-900 bg-slate-50/70'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{win.label}</span>
                        <span className="text-slate-400" aria-hidden="true">·</span>
                        <span className="font-mono text-slate-600">{win.hours}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {isActive ? 'Active on Live Floor' : `${Math.round(win.shiftShareWeight * 100)}% daily volume`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Hot -> Human slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <label
                            htmlFor={`win-${winId}-hot`}
                            className="inline-flex items-center gap-1 font-medium text-red-700"
                          >
                            <Flame className="w-3 h-3" />
                            Hot → Human
                          </label>
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            {win.hotToHumanPct}%{' '}
                            <span className="font-normal text-slate-400">
                              ({100 - win.hotToHumanPct}% AI)
                            </span>
                          </span>
                        </div>
                        <input
                          id={`win-${winId}-hot`}
                          type="range"
                          min={20}
                          max={100}
                          step={2}
                          value={win.hotToHumanPct}
                          onChange={(e) =>
                            updateWindow(winId, 'hotToHumanPct', Number(e.target.value))
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="w-full"
                        />
                      </div>

                      {/* Cold -> AI slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <label
                            htmlFor={`win-${winId}-cold`}
                            className="inline-flex items-center gap-1 font-medium text-sky-700"
                          >
                            <Snowflake className="w-3 h-3" />
                            Cold → AI Voice
                          </label>
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            {win.coldToAiPct}%{' '}
                            <span className="font-normal text-slate-400">
                              ({100 - win.coldToAiPct}% Rep)
                            </span>
                          </span>
                        </div>
                        <input
                          id={`win-${winId}-cold`}
                          type="range"
                          min={0}
                          max={100}
                          step={2}
                          value={win.coldToAiPct}
                          onChange={(e) =>
                            updateWindow(winId, 'coldToAiPct', Number(e.target.value))
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* NLP Warm Transfer Threshold */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="nlp-transfer-threshold" className="font-medium text-slate-700">
                  NLP Warm-Transfer Intent Trigger (AI Pod → Human Closer)
                </label>
                <span className="font-mono tabular-nums font-semibold text-emerald-700">
                  ≥ {config.nlpWarmTransferThreshold} / 100
                </span>
              </div>
              <input
                id="nlp-transfer-threshold"
                type="range"
                min={55}
                max={90}
                step={1}
                value={config.nlpWarmTransferThreshold}
                onChange={(e) =>
                  onChange({
                    ...config,
                    presetId: 'custom',
                    useCustomWeights: true,
                    nlpWarmTransferThreshold: Number(e.target.value),
                  })
                }
                className="w-full"
              />
              <p className="text-[11px] text-slate-500">
                Lower threshold transfers more warming cold callers to eligible human reps (~{impact.estimatedWarmTransfersPerDay} warm transfers/day).
              </p>
            </div>
          </div>

          {/* RIGHT 6 COLS: Agent Skill Tag Weightings */}
          <div className="lg:col-span-6 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Agent Skill Tag Priority Weightings
                </h3>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                Skill Close Lift: {impact.hotSkillMultiplier}×
              </span>
            </div>

            <div className="space-y-3.5">
              {SKILL_ORDER.map((skillId) => {
                const skill = config.skillTags[skillId];
                const hotSharePct = Math.round(
                  (Math.max(1, skill.hotWeight) / totalHotWeight) * 100
                );
                const coldSharePct = Math.round(
                  (Math.max(1, skill.coldWeight) / totalColdWeight) * 100
                );

                return (
                  <div
                    key={skillId}
                    className="rounded-lg border border-slate-200 p-3.5 space-y-3 bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {skill.label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {skill.repNames.join(', ')} · {skill.specialty}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateSkill(skillId, { allowWarmTransfer: !skill.allowWarmTransfer })
                        }
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          skill.allowWarmTransfer
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {skill.allowWarmTransfer ? 'Warm Transfers: On' : 'Warm Transfers: Off'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Hot Weight */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <label
                            htmlFor={`skill-${skillId}-hot`}
                            className="font-medium text-slate-600"
                          >
                            Hot Queue Weight
                          </label>
                          <span className="font-mono tabular-nums font-semibold text-red-700">
                            {skill.hotWeight} ({hotSharePct}% share)
                          </span>
                        </div>
                        <input
                          id={`skill-${skillId}-hot`}
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={skill.hotWeight}
                          onChange={(e) =>
                            updateSkill(skillId, { hotWeight: Number(e.target.value) })
                          }
                          className="w-full"
                        />
                      </div>

                      {/* Cold / Pacing Weight */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <label
                            htmlFor={`skill-${skillId}-cold`}
                            className="font-medium text-slate-600"
                          >
                            Cold / Pacing Weight
                          </label>
                          <span className="font-mono tabular-nums font-semibold text-sky-700">
                            {skill.coldWeight} ({coldSharePct}% share)
                          </span>
                        </div>
                        <input
                          id={`skill-${skillId}-cold`}
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={skill.coldWeight}
                          onChange={(e) =>
                            updateSkill(skillId, { coldWeight: Number(e.target.value) })
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Live Rule Projection Summary Strip */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/75 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
              <GitBranch className="w-3.5 h-3.5 text-slate-700" />
              Active Rule Mix:
            </span>
            <span className="font-mono tabular-nums">
              Hot → Human <strong className="text-slate-900">{impact.blendedHotToHumanPct}%</strong>
            </span>
            <span className="font-mono tabular-nums">
              Cold → AI <strong className="text-slate-900">{impact.blendedColdToAiPct}%</strong>
            </span>
            <span className="font-mono tabular-nums">
              Est. Monthly Profit:{' '}
              <strong className="text-emerald-700">
                {formatCurrencyCompact(impact.monthlyNetProfitUsd)}/mo
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                impact.guardrailLabel === 'Strong Pacing'
                  ? 'text-emerald-700'
                  : impact.guardrailLabel === 'Moderate Risk'
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {impact.guardrailLabel}
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <a
              href="#call-flow"
              className="font-medium text-slate-900 hover:text-sky-700 transition-colors whitespace-nowrap"
            >
              Watch on Live Floor ↓
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
