import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Flame,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Snowflake,
  StepForward,
  UserCheck,
  XCircle,
} from 'lucide-react';

type RoutingRegime = 'pre_ai' | 'naive_ai' | 'revops_paced';

interface CallPacket {
  id: number;
  leadType: 'HOT' | 'COLD';
  handler: 'HUMAN' | 'AI';
  outcome: 'CONVERTED' | 'REALLOCATED' | 'DROPPED_DNC' | 'ESCALATED_CONVERTED';
  shiftPosition: number;
  progress: number; // 0 to 100
  pathKey:
    | 'hot_human_win'
    | 'hot_human_realloc'
    | 'hot_human_drop'
    | 'hot_ai_overflow_win'
    | 'hot_ai_overflow_drop'
    | 'cold_ai_win'
    | 'cold_ai_drop'
    | 'cold_ai_escalate_win'
    | 'cold_human_win'
    | 'cold_human_drop';
  intentScore: number;
  durationSec: number;
  timestamp: string;
  policyNote: string;
}

interface FlowMetrics {
  totalCalls: number;
  hotToHuman: number;
  hotOverflowToAi: number;
  coldToAi: number;
  coldToHuman: number;
  coldEscalatedToHuman: number;
  humanConversions: number;
  aiConversions: number;
  reallocations: number;
  droppedDnc: number;
}

const REGIME_CONFIG: Record<
  RoutingRegime,
  {
    label: string;
    phi: number;
    aiColdShare: number;
    earlyReallocProb: number;
    hotHumanConvEarly: number;
    hotHumanConvLate: number;
    nlpWarmEscalateRate: number;
    summary: string;
  }
> = {
  pre_ai: {
    label: 'Pre-AI Mixed Pool',
    phi: 0.10,
    aiColdShare: 0.19,
    earlyReallocProb: 0.245,
    hotHumanConvEarly: 0.091,
    hotHumanConvLate: 0.032,
    nlpWarmEscalateRate: 0.0,
    summary:
      'Humans work a mixed hot/cold queue. Lower early reservation value sustains 61s average early call persistence and 9.1% early conversion.',
  },
  naive_ai: {
    label: 'Naive Parallel AI (Backfire)',
    phi: 0.22,
    aiColdShare: 0.65,
    earlyReallocProb: 0.381,
    hotHumanConvEarly: 0.062,
    hotHumanConvLate: 0.041,
    nlpWarmEscalateRate: 0.0,
    summary:
      'AI absorbs >60% of cold leads and front-loads hot leads early (φ=0.22). Humans expect abundant hot leads next, cutting calls 13% shorter and dumping viable hot leads (+8.1 pp reallocation).',
  },
  revops_paced: {
    label: 'RevOps Paced AI + NLP',
    phi: 0.10,
    aiColdShare: 0.65,
    earlyReallocProb: 0.195,
    hotHumanConvEarly: 0.098,
    hotHumanConvLate: 0.046,
    nlpWarmEscalateRate: 0.14,
    summary:
      'Keeps AI on cold leads while staggering hot-lead release (φ=0.10), blocking premature early reallocation with NLP co-pilot guardrails, and warm-escalating intent spikes from AI to human closers (+13.5% yield recovery).',
  },
};

// SVG waypoint paths in a 880x440 coordinate canvas
const PATH_WAYPOINTS: Record<CallPacket['pathKey'], [number, number][]> = {
  hot_human_win: [
    [95, 220],
    [245, 220],
    [350, 125],
    [515, 125],
    [680, 125],
    [810, 88],
  ],
  hot_human_realloc: [
    [95, 220],
    [245, 220],
    [350, 125],
    [515, 125],
    [680, 125],
    [790, 210],
    [515, 210],
    [515, 152],
  ],
  hot_human_drop: [
    [95, 220],
    [245, 220],
    [350, 125],
    [515, 125],
    [680, 125],
    [810, 355],
  ],
  hot_ai_overflow_win: [
    [95, 220],
    [245, 220],
    [350, 125],
    [430, 230],
    [515, 325],
    [680, 325],
    [810, 88],
  ],
  hot_ai_overflow_drop: [
    [95, 220],
    [245, 220],
    [350, 125],
    [430, 230],
    [515, 325],
    [680, 325],
    [810, 355],
  ],
  cold_ai_win: [
    [95, 220],
    [245, 220],
    [350, 325],
    [515, 325],
    [680, 325],
    [810, 88],
  ],
  cold_ai_drop: [
    [95, 220],
    [245, 220],
    [350, 325],
    [515, 325],
    [680, 325],
    [810, 355],
  ],
  cold_ai_escalate_win: [
    [95, 220],
    [245, 220],
    [350, 325],
    [515, 325],
    [595, 225],
    [680, 125],
    [810, 88],
  ],
  cold_human_win: [
    [95, 220],
    [245, 220],
    [350, 325],
    [435, 225],
    [515, 125],
    [680, 125],
    [810, 88],
  ],
  cold_human_drop: [
    [95, 220],
    [245, 220],
    [350, 325],
    [435, 225],
    [515, 125],
    [680, 125],
    [810, 355],
  ],
};

function interpolatePolyline(points: [number, number][], progressPct: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, progressPct / 100));
  if (points.length < 2) return { x: points[0][0], y: points[0][1] };

  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.hypot(dx, dy);
    segLengths.push(len);
    totalLen += len;
  }

  let target = t * totalLen;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i] || i === segLengths.length - 1) {
      const ratio = segLengths[i] === 0 ? 0 : target / segLengths[i];
      return {
        x: points[i][0] + (points[i + 1][0] - points[i][0]) * ratio,
        y: points[i][1] + (points[i + 1][1] - points[i][1]) * ratio,
      };
    }
    target -= segLengths[i];
  }
  const last = points[points.length - 1];
  return { x: last[0], y: last[1] };
}

export const RoutingFlowSimulator: React.FC = () => {
  const [regime, setRegime] = useState<RoutingRegime>('naive_ai');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [occupancyPct, setOccupancyPct] = useState<number>(78);
  const [hotLeadMixPct, setHotLeadMixPct] = useState<number>(62);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [shiftPositionCounter, setShiftPositionCounter] = useState<number>(1);

  const [activePackets, setActivePackets] = useState<CallPacket[]>([]);
  const [recentLog, setRecentLog] = useState<CallPacket[]>([]);
  const [metrics, setMetrics] = useState<FlowMetrics>({
    totalCalls: 0,
    hotToHuman: 0,
    hotOverflowToAi: 0,
    coldToAi: 0,
    coldToHuman: 0,
    coldEscalatedToHuman: 0,
    humanConversions: 0,
    aiConversions: 0,
    reallocations: 0,
    droppedDnc: 0,
  });

  const nextIdRef = useRef<number>(1001);
  const cfg = REGIME_CONFIG[regime];

  const reservationPressurePct = useMemo(() => {
    const pos = ((shiftPositionCounter - 1) % 30) + 1;
    const earlyWeight = Math.max(0.15, 1 - (pos - 1) / 28);
    if (regime === 'naive_ai') return Math.round(45 + 50 * earlyWeight);
    if (regime === 'pre_ai') return Math.round(28 + 30 * earlyWeight);
    return Math.round(20 + 22 * earlyWeight);
  }, [regime, shiftPositionCounter]);

  const spawnCall = (forcedType?: 'HOT' | 'COLD') => {
    const pos = ((shiftPositionCounter - 1) % 30) + 1;
    setShiftPositionCounter((prev) => prev + 1);

    const isEarly = pos <= 6;
    // Under naive_ai, hot leads are heavily front-loaded at early positions
    const effectiveHotProb =
      regime === 'naive_ai' && isEarly
        ? Math.min(0.92, hotLeadMixPct / 100 + 0.23)
        : hotLeadMixPct / 100;

    const leadType: 'HOT' | 'COLD' =
      forcedType ?? (Math.random() < effectiveHotProb ? 'HOT' : 'COLD');

    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8);
    const id = nextIdRef.current++;

    let handler: 'HUMAN' | 'AI' = 'HUMAN';
    let outcome: CallPacket['outcome'] = 'DROPPED_DNC';
    let pathKey: CallPacket['pathKey'] = 'hot_human_drop';
    let intentScore = leadType === 'HOT' ? Math.round(68 + Math.random() * 28) : Math.round(18 + Math.random() * 34);
    let durationSec = 45;
    let policyNote = '';

    if (leadType === 'HOT') {
      const overflowToAi = occupancyPct >= 92 && Math.random() < (occupancyPct - 82) / 25;
      if (overflowToAi) {
        handler = 'AI';
        const aiWins = Math.random() < 0.09; // scaled visual frequency reflecting 2.4% relative to human
        outcome = aiWins ? 'CONVERTED' : 'DROPPED_DNC';
        pathKey = aiWins ? 'hot_ai_overflow_win' : 'hot_ai_overflow_drop';
        durationSec = Math.round(32 + Math.random() * 28);
        policyNote = 'Human floor saturated — hot lead overflowed to AI voice agent';
      } else {
        handler = 'HUMAN';
        // Visualized conversion & reallocation probabilities calibrated proportionally to study gradients
        const baseConv = isEarly ? cfg.hotHumanConvEarly * 3.2 : cfg.hotHumanConvLate * 3.2;
        const reallocProb = isEarly ? cfg.earlyReallocProb : cfg.earlyReallocProb * 0.55;
        const r = Math.random();
        if (r < baseConv) {
          outcome = 'CONVERTED';
          pathKey = 'hot_human_win';
          durationSec = regime === 'naive_ai' && isEarly ? Math.round(52 + Math.random() * 40) : Math.round(74 + Math.random() * 65);
          policyNote =
            regime === 'revops_paced'
              ? 'NLP co-pilot sustained objection handling — hot policy closed'
              : 'Human closer converted hot payment-drop lead';
        } else if (r < baseConv + reallocProb) {
          outcome = 'REALLOCATED';
          pathKey = 'hot_human_realloc';
          durationSec = regime === 'naive_ai' && isEarly ? Math.round(28 + Math.random() * 24) : Math.round(42 + Math.random() * 30);
          policyNote =
            regime === 'naive_ai' && isEarly
              ? 'Reservation-value spike at early shift — agent returned viable hot lead to queue'
              : 'Returned to centralized queue for secondary human attempt';
        } else {
          outcome = 'DROPPED_DNC';
          pathKey = 'hot_human_drop';
          durationSec = Math.round(35 + Math.random() * 30);
          policyNote = 'Customer declined — 6-month do-not-call restriction applied';
        }
      }
    } else {
      // COLD LEAD
      const routeToAi = Math.random() < cfg.aiColdShare;
      if (routeToAi) {
        handler = 'AI';
        const escalates = regime === 'revops_paced' && Math.random() < cfg.nlpWarmEscalateRate;
        if (escalates) {
          outcome = 'ESCALATED_CONVERTED';
          pathKey = 'cold_ai_escalate_win';
          intentScore = Math.round(74 + Math.random() * 20);
          durationSec = Math.round(88 + Math.random() * 55);
          policyNote = 'Live NLP detected buying signal — warm-transferred from AI to human closer';
        } else {
          const aiColdWin = Math.random() < 0.06;
          outcome = aiColdWin ? 'CONVERTED' : 'DROPPED_DNC';
          pathKey = aiColdWin ? 'cold_ai_win' : 'cold_ai_drop';
          durationSec = Math.round(24 + Math.random() * 32);
          policyNote = aiColdWin
            ? 'AI voice agent converted cold lead at near-zero marginal cost'
            : 'Cold lead screened by AI voice agent — no human capacity spent';
        }
      } else {
        handler = 'HUMAN';
        const humanColdWin = Math.random() < 0.08;
        outcome = humanColdWin ? 'CONVERTED' : 'DROPPED_DNC';
        pathKey = humanColdWin ? 'cold_human_win' : 'cold_human_drop';
        durationSec = Math.round(38 + Math.random() * 36);
        policyNote =
          regime === 'revops_paced'
            ? 'Intentional calm-rhythm interleaving — protects early hot-lead persistence'
            : 'Human dialed cold lead from shared queue';
      }
    }

    const packet: CallPacket = {
      id,
      leadType,
      handler,
      outcome,
      shiftPosition: pos,
      progress: 0,
      pathKey,
      intentScore,
      durationSec,
      timestamp,
      policyNote,
    };

    setActivePackets((prev) => [...prev.slice(-14), packet]);
  };

  // Animation ticker
  useEffect(() => {
    if (!isRunning) return;
    const stepMs = 45;
    const timer = window.setInterval(() => {
      setActivePackets((prev) => {
        const next: CallPacket[] = [];
        const completed: CallPacket[] = [];
        for (const p of prev) {
          const updated = { ...p, progress: p.progress + 2.4 * speedMultiplier };
          if (updated.progress >= 100) {
            completed.push(updated);
          } else {
            next.push(updated);
          }
        }
        if (completed.length > 0) {
          setMetrics((m) => {
            const copy = { ...m };
            for (const c of completed) {
              copy.totalCalls += 1;
              if (c.leadType === 'HOT' && c.handler === 'HUMAN') copy.hotToHuman += 1;
              if (c.leadType === 'HOT' && c.handler === 'AI') copy.hotOverflowToAi += 1;
              if (c.leadType === 'COLD' && c.handler === 'AI') copy.coldToAi += 1;
              if (c.leadType === 'COLD' && c.handler === 'HUMAN') copy.coldToHuman += 1;
              if (c.outcome === 'ESCALATED_CONVERTED') {
                copy.coldEscalatedToHuman += 1;
                copy.humanConversions += 1;
              } else if (c.outcome === 'CONVERTED') {
                if (c.handler === 'HUMAN') copy.humanConversions += 1;
                else copy.aiConversions += 1;
              } else if (c.outcome === 'REALLOCATED') {
                copy.reallocations += 1;
              } else {
                copy.droppedDnc += 1;
              }
            }
            return copy;
          });
          setRecentLog((log) => [...completed.reverse(), ...log].slice(0, 7));
        }
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [isRunning, speedMultiplier]);

  // Auto-spawner
  useEffect(() => {
    if (!isRunning) return;
    const spawnInterval = Math.max(550, Math.round(1350 / speedMultiplier));
    const spawner = window.setInterval(() => {
      spawnCall();
    }, spawnInterval);
    return () => window.clearInterval(spawner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, regime, occupancyPct, hotLeadMixPct, speedMultiplier, shiftPositionCounter]);

  const handleReset = () => {
    setActivePackets([]);
    setRecentLog([]);
    setShiftPositionCounter(1);
    setMetrics({
      totalCalls: 0,
      hotToHuman: 0,
      hotOverflowToAi: 0,
      coldToAi: 0,
      coldToHuman: 0,
      coldEscalatedToHuman: 0,
      humanConversions: 0,
      aiConversions: 0,
      reallocations: 0,
      droppedDnc: 0,
    });
  };

  const handleSwitchRegime = (nextRegime: RoutingRegime) => {
    setRegime(nextRegime);
    handleReset();
  };

  const humanHandledTotal = metrics.hotToHuman + metrics.coldToHuman + metrics.coldEscalatedToHuman;
  const humanConvRate =
    humanHandledTotal > 0 ? ((metrics.humanConversions / humanHandledTotal) * 100).toFixed(1) : '0.0';
  const reallocRate =
    metrics.hotToHuman > 0 ? ((metrics.reallocations / metrics.hotToHuman) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Regime Selector + Playback Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Hot &amp; Cold Call Routing Architecture
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Live discrete-event routing flow modeled on Platform X (567,090 calls). Compare naive parallel AI front-loading against behavior-aware RevOps rhythm pacing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(Object.keys(REGIME_CONFIG) as RoutingRegime[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSwitchRegime(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  regime === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {REGIME_CONFIG[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2-Zone Sandbox: 65% Interactive Flow Canvas | 35% Controls & Metrics */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Interactive Flow Stage */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Live Routing Topology</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Rhythm φ = {cfg.phi.toFixed(2)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Shift Position #{((shiftPositionCounter - 1) % 30) + 1}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => spawnCall('HOT')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                Inject Hot
              </button>
              <button
                type="button"
                onClick={() => spawnCall('COLD')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Snowflake className="w-3.5 h-3.5" />
                Inject Cold
              </button>
              <button
                type="button"
                onClick={() => setIsRunning((r) => !r)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isRunning ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => spawnCall()}
                title="Step single call"
                className="inline-flex items-center justify-center p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <StepForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset simulation"
                className="inline-flex items-center justify-center p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Flow Diagram (Figure 2 Extended) */}
          <div className="p-4 bg-[#FAFBFD] overflow-x-auto">
            <svg
              viewBox="0 0 880 430"
              className="w-full min-w-[720px] h-auto select-none"
              role="img"
              aria-label="Interactive hot and cold call center routing diagram"
            >
              <defs>
                <marker
                  id="arrow-slate"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#94A3B8" />
                </marker>
                <marker
                  id="arrow-hot"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626" />
                </marker>
                <marker
                  id="arrow-cold"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284C7" />
                </marker>
                <marker
                  id="arrow-amber"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" />
                </marker>
                <marker
                  id="arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
                </marker>
              </defs>

              {/* Subtle engineering grid */}
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#E2E8F0" strokeWidth="0.6" strokeOpacity="0.55" />
              </pattern>
              <rect width="880" height="430" fill="url(#grid)" />

              {/* Static Routing Edges */}
              {/* Ingress -> Classifier */}
              <line x1="158" y1="220" x2="205" y2="220" stroke="#64748B" strokeWidth="2" markerEnd="url(#arrow-slate)" />

              {/* Classifier -> Hot Branch */}
              <path
                d="M 272 195 L 325 125 L 442 125"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2.2"
                strokeOpacity="0.65"
                markerEnd="url(#arrow-hot)"
              />
              <text x="292" y="138" fontSize="10.5" fontWeight="600" fill="#B91C1C" fontFamily="Plus Jakarta Sans">
                HOT · Reached Payment
              </text>

              {/* Classifier -> Cold Branch */}
              <path
                d="M 272 245 L 325 325 L 442 325"
                fill="none"
                stroke="#0284C7"
                strokeWidth="2.2"
                strokeOpacity="0.65"
                markerEnd="url(#arrow-cold)"
              />
              <text x="292" y="346" fontSize="10.5" fontWeight="600" fill="#0369A1" fontFamily="Plus Jakarta Sans">
                COLD · Dropped Early
              </text>

              {/* Hot Overflow to AI (when human floor saturated) */}
              <path
                d="M 390 125 L 430 230 L 456 296"
                fill="none"
                stroke="#DC2626"
                strokeWidth="1.6"
                strokeDasharray="5 4"
                strokeOpacity={occupancyPct >= 90 ? 0.9 : 0.3}
                markerEnd="url(#arrow-hot)"
              />
              <text x="355" y="218" fontSize="9.5" fill="#64748B" fontFamily="IBM Plex Mono">
                Overflow ({occupancyPct >= 92 ? 'ACTIVE' : 'Standby'})
              </text>

              {/* Cold -> Human (Pre-AI or RevOps Pacing Interleave) */}
              <path
                d="M 380 325 L 440 225 L 478 156"
                fill="none"
                stroke="#0284C7"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity={regime === 'pre_ai' ? 0.75 : 0.35}
                markerEnd="url(#arrow-cold)"
              />

              {/* RevOps Warm Escalation AI -> Human (Active only in revops_paced) */}
              <path
                d="M 565 292 L 598 220 L 636 155"
                fill="none"
                stroke="#059669"
                strokeWidth={regime === 'revops_paced' ? '2.4' : '1.2'}
                strokeDasharray={regime === 'revops_paced' ? 'none' : '4 4'}
                strokeOpacity={regime === 'revops_paced' ? 0.9 : 0.22}
                markerEnd="url(#arrow-emerald)"
              />
              <text
                x="582"
                y="246"
                fontSize="9.5"
                fontWeight="600"
                fill={regime === 'revops_paced' ? '#047857' : '#94A3B8'}
                fontFamily="IBM Plex Mono"
              >
                NLP Warm Escalate
              </text>

              {/* Human -> Converted */}
              <path d="M 595 115 L 748 88" fill="none" stroke="#059669" strokeWidth="2" strokeOpacity="0.65" markerEnd="url(#arrow-emerald)" />

              {/* Human -> Reallocation Loop */}
              <path
                d="M 595 140 L 765 205 L 515 205 L 515 162"
                fill="none"
                stroke="#D97706"
                strokeWidth={regime === 'naive_ai' ? '2.6' : '1.8'}
                strokeDasharray="6 3"
                strokeOpacity="0.85"
                markerEnd="url(#arrow-amber)"
              />
              <text x="645" y="198" fontSize="10" fontWeight="600" fill="#B45309" fontFamily="Plus Jakarta Sans">
                Reallocation Loop ({regime === 'naive_ai' ? 'SURGE +8.1 pp' : regime === 'revops_paced' ? 'Guardrailed' : 'Baseline'})
              </text>

              {/* Human -> Dropped / DNC */}
              <path d="M 595 148 L 752 332" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeOpacity="0.45" markerEnd="url(#arrow-slate)" />

              {/* AI -> Converted */}
              <path d="M 595 312 L 752 106" fill="none" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.35" markerEnd="url(#arrow-emerald)" />

              {/* AI -> Dropped / DNC */}
              <path d="M 595 332 L 748 355" fill="none" stroke="#64748B" strokeWidth="1.8" strokeOpacity="0.55" markerEnd="url(#arrow-slate)" />

              {/* NODE 1: Customer Ingress */}
              <g transform="translate(24, 178)">
                <rect width="134" height="84" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
                <text x="12" y="24" fontSize="11" fontWeight="700" fill="#0F172A" fontFamily="Bricolage Grotesque">
                  Outbound Leads
                </text>
                <text x="12" y="42" fontSize="10" fill="#475569" fontFamily="Plus Jakarta Sans">
                  Exited online funnel
                </text>
                <text x="12" y="58" fontSize="10" fill="#475569" fontFamily="Plus Jakarta Sans">
                  without policy checkout
                </text>
                <text x="12" y="75" fontSize="10" fontWeight="600" fill="#0F172A" fontFamily="IBM Plex Mono">
                  Mix: {hotLeadMixPct}% Hot
                </text>
              </g>

              {/* NODE 2: Classifier Gate */}
              <g transform="translate(210, 178)">
                <polygon points="35,0 70,42 35,84 0,42" fill="#0F172A" />
                <text x="35" y="38" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#FFFFFF" fontFamily="Plus Jakarta Sans">
                  Payment
                </text>
                <text x="35" y="51" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#FFFFFF" fontFamily="Plus Jakarta Sans">
                  Page?
                </text>
              </g>

              {/* NODE 3: Human Sales Floor */}
              <g transform="translate(446, 76)">
                <rect
                  width="150"
                  height="86"
                  rx="8"
                  fill="#FFFFFF"
                  stroke={regime === 'naive_ai' ? '#DC2626' : '#0F172A'}
                  strokeWidth={regime === 'naive_ai' ? '2' : '1.5'}
                />
                <text x="12" y="23" fontSize="11.5" fontWeight="700" fill="#0F172A" fontFamily="Bricolage Grotesque">
                  Human Sales Floor
                </text>
                <text x="12" y="40" fontSize="10" fill="#475569" fontFamily="Plus Jakarta Sans">
                  Priority on Hot Leads
                </text>
                <text x="12" y="57" fontSize="10" fontWeight="500" fill="#0F172A" fontFamily="IBM Plex Mono">
                  Occ: {occupancyPct}% · φ={cfg.phi.toFixed(2)}
                </text>
                <text
                  x="12"
                  y="74"
                  fontSize="9.5"
                  fontWeight="600"
                  fill={reservationPressurePct > 65 ? '#DC2626' : '#059669'}
                  fontFamily="IBM Plex Mono"
                >
                  Res. Value Risk: {reservationPressurePct}%
                </text>
              </g>

              {/* NODE 4: AI Voice Agent */}
              <g transform="translate(446, 282)">
                <rect width="150" height="86" rx="8" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.5" />
                <text x="12" y="23" fontSize="11.5" fontWeight="700" fill="#0F172A" fontFamily="Bricolage Grotesque">
                  AI Voice Agent
                </text>
                <text x="12" y="40" fontSize="10" fill="#475569" fontFamily="Plus Jakarta Sans">
                  Cold default + Hot overflow
                </text>
                <text x="12" y="57" fontSize="10" fontWeight="500" fill="#0369A1" fontFamily="IBM Plex Mono">
                  Cold Share: {Math.round(cfg.aiColdShare * 100)}%
                </text>
                <text x="12" y="74" fontSize="9.5" fill="#475569" fontFamily="IBM Plex Mono">
                  Marginal Cost: ~$0.04/call
                </text>
              </g>

              {/* NODE 5: Conversion Outcome */}
              <g transform="translate(754, 48)">
                <rect width="112" height="72" rx="8" fill="#ECFDF5" stroke="#059669" strokeWidth="1.5" />
                <text x="12" y="24" fontSize="11" fontWeight="700" fill="#065F46" fontFamily="Bricolage Grotesque">
                  Converted
                </text>
                <text x="12" y="42" fontSize="10" fill="#047857" fontFamily="IBM Plex Mono">
                  Human: {metrics.humanConversions}
                </text>
                <text x="12" y="58" fontSize="10" fill="#047857" fontFamily="IBM Plex Mono">
                  AI: {metrics.aiConversions}
                </text>
              </g>

              {/* NODE 6: Reallocated Queue */}
              <g transform="translate(754, 178)">
                <rect width="112" height="62" rx="8" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.5" />
                <text x="12" y="24" fontSize="11" fontWeight="700" fill="#92400E" fontFamily="Bricolage Grotesque">
                  Reallocated
                </text>
                <text x="12" y="42" fontSize="10" fill="#B45309" fontFamily="IBM Plex Mono">
                  Count: {metrics.reallocations}
                </text>
                <text x="12" y="55" fontSize="9" fill="#92400E" fontFamily="Plus Jakarta Sans">
                  5.7% downstream win
                </text>
              </g>

              {/* NODE 7: Dropped / 6-Mo DNC */}
              <g transform="translate(754, 322)">
                <rect width="112" height="66" rx="8" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
                <text x="12" y="24" fontSize="11" fontWeight="700" fill="#334155" fontFamily="Bricolage Grotesque">
                  Dropped / DNC
                </text>
                <text x="12" y="42" fontSize="10" fill="#475569" fontFamily="IBM Plex Mono">
                  Count: {metrics.droppedDnc}
                </text>
                <text x="12" y="56" fontSize="9" fill="#64748B" fontFamily="Plus Jakarta Sans">
                  6-mo no-recontact
                </text>
              </g>

              {/* Animated Call Packets */}
              {activePackets.map((pkt) => {
                const pt = interpolatePolyline(PATH_WAYPOINTS[pkt.pathKey], pkt.progress);
                const isHot = pkt.leadType === 'HOT';
                const fill =
                  pkt.outcome === 'ESCALATED_CONVERTED' && pkt.progress > 55
                    ? '#059669'
                    : isHot
                    ? '#DC2626'
                    : '#0284C7';
                return (
                  <g key={pkt.id} transform={`translate(${pt.x}, ${pt.y})`}>
                    <circle r="10.5" fill={fill} stroke="#FFFFFF" strokeWidth="2" />
                    <text
                      y="3.5"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#FFFFFF"
                      fontFamily="IBM Plex Mono"
                    >
                      {isHot ? 'H' : 'C'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Regime Mechanism Annotation Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-start sm:items-center gap-2">
              {regime === 'naive_ai' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              ) : regime === 'revops_paced' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <Activity className="w-4 h-4 text-slate-600 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <span>{cfg.summary}</span>
            </div>
            <div className="flex items-center gap-4 shrink-0 font-mono text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Hot (H)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" /> Cold (C)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Escalated
              </span>
            </div>
          </div>
        </div>

        {/* Right Control & Live Telemetry Deck */}
        <div className="xl:col-span-4 space-y-5">
          {/* Parameters Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Floor Dispatch Controls</h2>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="occ-slider" className="text-slate-600 font-medium">
                  Human Agent Occupancy
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {occupancyPct}%
                </span>
              </div>
              <input
                id="occ-slider"
                type="range"
                min={40}
                max={100}
                step={2}
                value={occupancyPct}
                onChange={(e) => setOccupancyPct(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[11px] text-slate-500">
                Above 92%, excess hot leads overflow automatically to the AI voice agent.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="mix-slider" className="text-slate-600 font-medium">
                  Incoming Hot-Lead Mix
                </label>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {hotLeadMixPct}% Hot / {100 - hotLeadMixPct}% Cold
                </span>
              </div>
              <input
                id="mix-slider"
                type="range"
                min={30}
                max={85}
                step={1}
                value={hotLeadMixPct}
                onChange={(e) => setHotLeadMixPct(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Simulation Speed</span>
                <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                  {[0.5, 1, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setSpeedMultiplier(spd)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer ${
                        speedMultiplier === spd
                          ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Session Metrics */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Live Routing Counters</h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {metrics.totalCalls} routed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-4">
              <div>
                <div className="text-xs text-slate-500">Human Close Rate</div>
                <div className="mt-1 text-xl font-mono tabular-nums font-semibold text-slate-900">
                  {humanConvRate}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.humanConversions} won on floor
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Hot Reallocation Rate</div>
                <div
                  className={`mt-1 text-xl font-mono tabular-nums font-semibold ${
                    Number(reallocRate) > 30 ? 'text-amber-700' : 'text-slate-900'
                  }`}
                >
                  {reallocRate}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.reallocations} returned to pool
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">Cold Absorbed by AI</div>
                <div className="mt-1 text-lg font-mono tabular-nums font-semibold text-sky-700">
                  {metrics.coldToAi}
                </div>
                <div className="text-[11px] text-slate-500">
                  {metrics.coldEscalatedToHuman} warm-escalated
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">Hot Overflow to AI</div>
                <div className="mt-1 text-lg font-mono tabular-nums font-semibold text-red-700">
                  {metrics.hotOverflowToAi}
                </div>
                <div className="text-[11px] text-slate-500">
                  {metrics.aiConversions} AI closes total
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Call Routing Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent Call Dispositions</h2>
          <span className="text-xs text-slate-500">
            Real-time audit stream · Click Inject Hot or Cold above to test edge cases
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Call ID</th>
                <th className="py-2.5 px-4">Lead Temp</th>
                <th className="py-2.5 px-4">Shift Pos</th>
                <th className="py-2.5 px-4">Handler</th>
                <th className="py-2.5 px-4 text-right">Duration</th>
                <th className="py-2.5 px-4">Outcome</th>
                <th className="py-2.5 px-4">RevOps Routing Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentLog.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Waiting for routed calls to complete their flow path...
                  </td>
                </tr>
              ) : (
                recentLog.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                      #{item.id}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          item.leadType === 'HOT' ? 'text-red-700' : 'text-sky-700'
                        }`}
                      >
                        {item.leadType === 'HOT' ? (
                          <Flame className="w-3.5 h-3.5" />
                        ) : (
                          <Snowflake className="w-3.5 h-3.5" />
                        )}
                        {item.leadType === 'HOT' ? 'Hot Lead' : 'Cold Lead'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                      Pos {item.shiftPosition}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        {item.handler === 'AI' ? (
                          <Bot className="w-3.5 h-3.5 text-sky-600" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-slate-700" />
                        )}
                        {item.handler === 'AI' ? 'AI Voice' : 'Human Rep'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-right text-slate-700">
                      {item.durationSec}s
                    </td>
                    <td className="py-2.5 px-4">
                      {item.outcome === 'CONVERTED' && (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Converted
                        </span>
                      )}
                      {item.outcome === 'ESCALATED_CONVERTED' && (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                          <ArrowRight className="w-3.5 h-3.5" /> Escalated &amp; Won
                        </span>
                      )}
                      {item.outcome === 'REALLOCATED' && (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" /> Reallocated
                        </span>
                      )}
                      {item.outcome === 'DROPPED_DNC' && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <XCircle className="w-3.5 h-3.5" /> Dropped / DNC
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{item.policyNote}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
