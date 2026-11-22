import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Scale,
  Users,
} from 'lucide-react';
import { ORDER_BIN_PROFILES, RESEARCH_SUMMARY_STATS } from '../data/researchModel';

interface StrategyPlaybookProps {
  onOpenPaper: () => void;
  onJumpToTab: (tab: 'routing' | 'nlp' | 'rhythm') => void;
}

const COMPARISON_PILLARS = [
  {
    lever: '1. Hot vs. Cold Lead Routing',
    naiveAi:
      'Hard silo: AI absorbs >60% of cold leads; all hot leads dump directly into human queue with zero cross-stream handoff.',
    revOpsWay:
      'Dynamic NLP triage: AI still handles cold volume at near-zero marginal cost, but triggers instant warm transfers to human closers when real-time intent exceeds 72/100.',
    impact: 'Eliminates missed hot conversions inside cold inquiries while preserving AI cost leverage.',
  },
  {
    lever: '2. Within-Day Shift Rhythm (φ)',
    naiveAi:
      'Front-loads hot leads into early shift positions (Calls 1–6 jump +23.4 pp hot-lead share; φ rises from 0.10 to 0.22).',
    revOpsWay:
      'Staggers hot-lead release across the shift (easing φ back to 0.10) by pacing arrival queues and interleaving warm/medium-intent callbacks.',
    impact: '+13.5% predicted conversions per call (95% CI: 10.5%–16.6%) with zero AI rollback.',
  },
  {
    lever: '3. Reallocation Governance',
    naiveAi:
      'Zero-penalty reallocation to a shared pool alongside a 6-month DNC rule encourages early-shift dumping (+8.1 pp reallocation; 5.7% downstream win rate).',
    revOpsWay:
      'Require minimum persistence threshold or objection logging before releasing hot leads in Calls 1–9, and introduce split-commission credits on assisted reallocated wins.',
    impact: 'Prevents reps from discarding viable, effort-intensive hot leads worth ¥4.6 vs ¥2.7 retained.',
  },
  {
    lever: '4. Role of Real-Time NLP',
    naiveAi:
      'Operates strictly in parallel outside the focal human task—changing outside options without assisting objection persistence.',
    revOpsWay:
      'Dual deployment: Parallel AI Voice Agent on cold stream + Real-Time NLP Co-Pilot on human hot calls delivering live rebuttal scripts when hesitation is detected.',
    impact: 'Counteracts the -13% early-shift call duration compression on complex policies.',
  },
  {
    lever: '5. Agent Heterogeneity Routing',
    naiveAi:
      'Uniform routing treats all reps identically despite causal-forest spread from -2.4 pp (bottom tertile) to +2.0 pp (top tertile).',
    revOpsWay:
      'Match AI-enriched hot queues first to agents whose pre-expansion reallocation & triage workflow complements AI (high-tertile performers +2.0 pp), while coaching bottom tertile.',
    impact: 'Captures the 4.4 pp spread hidden behind near-zero aggregate averages.',
  },
  {
    lever: '6. Executive KPI Instrumentation',
    naiveAi:
      'Tracks aggregate conversions per 50 human calls (+6.3% illusion because human calls dropped -31.8% while firm closes dropped -27.5%).',
    revOpsWay:
      'Monitors position-binned conversion (Pos 1–3 vs 81–120), early-shift reallocation rate, and net daily firm conversions across both human and AI channels.',
    impact: 'Exposes the 7:1 daily loss (50.5 human hot closes lost vs 7.7 AI cold closes gained).',
  },
];

const HETEROGENEITY_TERTILES = [
  { group: 'Bottom Tertile', atePp: -2.4, se: 0.9, label: 'Pullback Dominant' },
  { group: 'Middle Tertile', atePp: -0.8, se: 0.8, label: 'Neutral / Offset' },
  { group: 'Top Tertile', atePp: 2.0, se: 0.7, label: 'AI-Complementary' },
];

export const StrategyPlaybook: React.FC<StrategyPlaybookProps> = ({ onOpenPaper, onJumpToTab }) => {
  const rditBins = ORDER_BIN_PROFILES.filter((b) => b.rditHotShareDelta !== null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            RevOps Strategy Playbook &amp; Empirical Evidence
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            Translating &ldquo;When Better Opportunities Backfire&rdquo; (Fu et al., Sept 2026 · 567,090 outbound calls) into an actionable blueprint for deploying Call Center AI without triggering human reservation-value pullback.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenPaper}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          Open Original Presentation PDF
        </button>
      </div>

      {/* Headline Study Findings Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Dataset Scale (±60 Days)</div>
          <div className="mt-1.5 text-2xl font-mono tabular-nums font-semibold text-slate-900">
            567,090
          </div>
          <div className="mt-1 text-xs text-slate-600">
            409,622 human · 157,468 AI calls across 13,053 agent-days
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Early-Shift Enrichment (Pos 1–3)</div>
          <div className="mt-1.5 text-2xl font-mono tabular-nums font-semibold text-sky-700">
            {RESEARCH_SUMMARY_STATS.earlyHotShareJumpPp}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Higher hot-lead probability at start of shift (fades to 0 at Pos 81–120)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Early-Shift Conversion Drop</div>
          <div className="mt-1.5 text-2xl font-mono tabular-nums font-semibold text-red-700">
            {RESEARCH_SUMMARY_STATS.earlyConvDropPp}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            With +8.1 pp reallocation &amp; -13% shorter call duration
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">RevOps Rhythm Recovery</div>
          <div className="mt-1.5 text-2xl font-mono tabular-nums font-semibold text-emerald-700">
            {RESEARCH_SUMMARY_STATS.rhythmRecoveryPct}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Predicted lift by easing φ from 0.22 → 0.10 (CI: 10.5%–16.6%)
          </div>
        </div>
      </div>

      {/* Side-by-Side Operating Model Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-800" />
            <h2 className="text-base font-semibold text-slate-900">
              How We Should Deal With Call Center AI: Naive Parallel vs. RevOps Orchestrated
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => onJumpToTab('routing')}
              className="inline-flex items-center gap-1 font-medium text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              Test in Routing Flow <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => onJumpToTab('nlp')}
              className="inline-flex items-center gap-1 font-medium text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              Test Live NLP <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-5 w-[20%]">RevOps Lever</th>
                <th className="py-3 px-5 w-[28%]">
                  <span className="inline-flex items-center gap-1.5 text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5" /> Naive Parallel AI (Backfires)
                  </span>
                </th>
                <th className="py-3 px-5 w-[30%]">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Behavior-Aware RevOps AI
                  </span>
                </th>
                <th className="py-3 px-5 w-[22%]">Measured Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs leading-relaxed">
              {COMPARISON_PILLARS.map((row) => (
                <tr key={row.lever} className="hover:bg-slate-50/60 transition-colors align-top">
                  <td className="py-4 px-5 font-semibold text-slate-900">{row.lever}</td>
                  <td className="py-4 px-5 text-slate-600">{row.naiveAi}</td>
                  <td className="py-4 px-5 text-slate-800 font-medium">{row.revOpsWay}</td>
                  <td className="py-4 px-5 text-slate-600">{row.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Empirical Evidence Split: Position-Graded RDiT Table + Causal Forest Heterogeneity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RDiT Empirical Table (Tables 2, 3, 4) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                Position-Graded RDiT Discontinuities (Tables 2, 3 &amp; 4)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Aug 28, 2024 Cutoff</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Call Position</th>
                  <th className="py-2.5 px-4 text-right">Hot-Lead Δ</th>
                  <th className="py-2.5 px-4 text-right">Conversion Δ</th>
                  <th className="py-2.5 px-4 text-right">Reallocation Δ</th>
                  <th className="py-2.5 px-4 text-right">Log Duration Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                {rditBins.map((b) => (
                  <tr key={b.bin} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      Positions {b.bin}
                    </td>
                    <td className="py-3 px-4 text-right text-sky-700 font-semibold">
                      {(b.rditHotShareDelta ?? 0) > 0 ? '+' : ''}
                      {b.rditHotShareDelta?.toFixed(1)} pp
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold ${
                        (b.rditConvDeltaPp ?? 0) < 0
                          ? 'text-red-700'
                          : (b.rditConvDeltaPp ?? 0) > 1
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {(b.rditConvDeltaPp ?? 0) > 0 ? '+' : ''}
                      {b.rditConvDeltaPp?.toFixed(1)} pp
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold ${
                        (b.rditReallocDeltaPp ?? 0) > 5 ? 'text-amber-700' : 'text-slate-600'
                      }`}
                    >
                      {(b.rditReallocDeltaPp ?? 0) > 0 ? '+' : ''}
                      {b.rditReallocDeltaPp?.toFixed(1)} pp
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        (b.rditDurationLogDelta ?? 0) < -0.1 ? 'text-red-700 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {(b.rditDurationLogDelta ?? 0) > 0 ? '+' : ''}
                      {b.rditDurationLogDelta?.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Downstream Proof (Fig. 7):</strong> Reallocated leads eventually convert at{' '}
              <span className="font-mono font-semibold text-slate-900">5.7%</span> vs{' '}
              <span className="font-mono font-semibold text-slate-900">3.0%</span> retained (¥4.6 vs ¥2.7 expected value).
            </span>
          </div>
        </div>

        {/* Agent Heterogeneity Chart (Appendix G, Figure G1) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                Agent Heterogeneity by Predicted-Effect Tertile
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Causal Forest (Fig. G1)</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            AI raises hot-lead conversion by <span className="font-mono font-semibold text-emerald-700">+2.0 pp</span> for the top tertile of agents (those whose pre-AI triage workflow complements AI) while reducing it by <span className="font-mono font-semibold text-red-700">-2.4 pp</span> for the bottom tertile—a 4.4 pp spread concealed by day-level averages.
          </p>

          <div className="h-[195px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HETEROGENEITY_TERTILES} margin={{ top: 10, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="group" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit=" pp" domain={[-3.5, 3.5]} />
                <ReferenceLine y={0} stroke="#64748B" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="atePp" name="Doubly-Robust ATE (pp)" radius={[4, 4, 0, 0]}>
                  {HETEROGENEITY_TERTILES.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.atePp > 0 ? '#059669' : entry.atePp < -1.5 ? '#DC2626' : '#94A3B8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Top moderator: Pre-AI reallocation (+1.4 pp/IQR, p&lt;0.01)</span>
            <button
              type="button"
              onClick={() => onJumpToTab('rhythm')}
              className="inline-flex items-center gap-1 font-medium text-slate-900 hover:text-sky-700 cursor-pointer whitespace-nowrap"
            >
              Simulate Rhythm <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
