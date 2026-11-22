import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BusinessEconomicsSummary, formatCurrencyCompact } from '../data/businessModel';

interface ExecutiveRoiMatrixProps {
  economics: BusinessEconomicsSummary;
}

const OPERATING_PILLARS = [
  {
    area: 'Hot & Cold Routing',
    unpacedMistake:
      'Hard silo: AI dials cold inquiries while 100% of checkout drops flood sales reps with zero warm-transfer bridge.',
    recommendedPlay:
      'AI Voice qualifies cold inquiries at $0.06/call and triggers an instant warm transfer to a closer whenever live NLP intent crosses 72/100.',
    revenueImpact: 'Captures hidden buyers in the cold funnel while cutting cold-calling labor by >60%.',
  },
  {
    area: 'Shift Lead Pacing',
    unpacedMistake:
      'Stacks hot leads at the start of every shift—causing reps to expect an easy next dial, rush opening calls 13% faster, and drop close rates by 4.5 pts.',
    recommendedPlay:
      'Stagger hot-lead delivery smoothly across the day so reps treat every high-value prospect with full consultative patience.',
    revenueImpact: '+13.5% higher conversions per call without rolling back AI automation.',
  },
  {
    area: 'Lead Hand-Back Policy',
    unpacedMistake:
      'Zero-friction lead returns encourage cherry-picking: reps return tough but viable deals that still convert 1.9× higher downstream.',
    recommendedPlay:
      'Add a 45-second discovery floor before allowing opening-shift hand-backs and introduce shared credit on assisted re-closes.',
    revenueImpact: 'Stops high-value revenue leakage during peak morning buying hours.',
  },
  {
    area: 'Live Rep Coaching',
    unpacedMistake:
      'Leaves sales reps on their own during complex pricing or coverage objections while AI works completely separately.',
    recommendedPlay:
      'Pair sales closers with a real-time NLP co-pilot that surfaces tailored rebuttals the instant a buyer hesitates.',
    revenueImpact: 'Restores consultative handle times (55–65s) and lifts complex-deal win rates.',
  },
  {
    area: 'Executive Reporting',
    unpacedMistake:
      'Celebrates rising "conversions per human call" even as total company revenue falls because human call volume shrank faster than closes.',
    recommendedPlay:
      'Track Net Daily Revenue ($), Opening-Shift Close Rate, Hand-Back Leakage ($), and Blended Cost per Acquisition (CPA).',
    revenueImpact: 'Prevents a 7-to-1 revenue leak (losing 50.5 human hot deals to gain 7.7 AI cold deals).',
  },
];

export const ExecutiveRoiMatrix: React.FC<ExecutiveRoiMatrixProps> = ({
  economics,
}) => {
  return (
    <section id="roi-strategy" className="scroll-mt-20 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Executive Operating Playbook: Scaling Call Center AI Profitably
        </h2>
        <p className="text-xs text-slate-600 mt-0.5">
          How revenue leaders prevent AI-induced rep cherry-picking and convert automation savings into net top-line growth.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-900">
            Boardroom Summary · Projected Annual Impact
          </span>
          <span className="font-mono tabular-nums font-semibold text-emerald-700">
            {economics.annualRevenueLiftVsUnpacedUsd >= 0 ? '+' : ''}
            {formatCurrencyCompact(economics.annualRevenueLiftVsUnpacedUsd)}/yr vs. Unpaced AI
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-600">
                <th className="py-3 px-5 w-[18%]">Revenue Lever</th>
                <th className="py-3 px-5 w-[28%]">
                  <span className="inline-flex items-center gap-1.5 text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5" /> Common AI Pitfall (Unpaced)
                  </span>
                </th>
                <th className="py-3 px-5 w-[31%]">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Revenue-Paced Best Practice
                  </span>
                </th>
                <th className="py-3 px-5 w-[23%]">Bottom-Line Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs leading-relaxed">
              {OPERATING_PILLARS.map((row) => (
                <tr key={row.area} className="hover:bg-slate-50/60 align-top">
                  <td className="py-3.5 px-5 font-semibold text-slate-900">{row.area}</td>
                  <td className="py-3.5 px-5 text-slate-600">{row.unpacedMistake}</td>
                  <td className="py-3.5 px-5 text-slate-800 font-medium">{row.recommendedPlay}</td>
                  <td className="py-3.5 px-5 text-slate-600">{row.revenueImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
