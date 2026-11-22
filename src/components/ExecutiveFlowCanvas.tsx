import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Coffee,
  DollarSign,
  Flame,
  Headphones,
  Heart,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Snowflake,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { BusinessStrategy, STRATEGY_PROFILES } from '../data/businessModel';
import {
  pickWeightedRepId,
  REP_SKILL_MAP,
  RoutingLogicConfig,
} from '../data/routingLogic';

interface ExecutiveFlowCanvasProps {
  strategy: BusinessStrategy;
  onStrategyChange: (strategy: BusinessStrategy) => void;
  routingConfig: RoutingLogicConfig;
  occupancyPct: number;
  hotLeadSharePct: number;
  avgDealValueUsd: number;
}

type RepState =
  | 'IDLE'
  | 'ON_HOT_CALL'
  | 'ON_COLD_CALL'
  | 'ON_WARM_TRANSFER'
  | 'CELEBRATING'
  | 'HANDED_BACK'
  | 'COFFEE_BREAK';

interface ActiveCallOnDesk {
  id: number;
  leadType: 'HOT' | 'COLD';
  isWarmTransfer: boolean;
  dealValueUsd: number;
  elapsedSec: number;
  durationSec: number;
  shiftCallNum: number;
  wasAiCoached: boolean;
}

interface SimRep {
  id: string;
  name: string;
  firstName: string;
  role: string;
  trait: string;
  cx: number;
  cy: number;
  skinTone: string;
  hairColor: string;
  hairStyle: 'bun' | 'short' | 'bob' | 'fade' | 'wave' | 'part';
  shirtColor: string;
  persistenceSkill: number; // multiplier on win prob
  cherryPickTendency: number; // multiplier on hand-back under unpaced AI
  energy: number; // 0-100
  morale: number; // 0-100
  focus: number; // 0-100
  state: RepState;
  stateTimerSec: number;
  aiCoachCharges: number;
  activeCall: ActiveCallOnDesk | null;
  speechText: string;
  dealsWon: number;
  revenueWonUsd: number;
  handBacks: number;
  callsHandled: number;
}

interface AiPod {
  id: 'pod_a' | 'pod_b';
  label: string;
  cx: number;
  cy: number;
  busy: boolean;
  statusText: string;
  elapsedSec: number;
  durationSec: number;
  currentCall: {
    id: number;
    leadType: 'HOT' | 'COLD';
    dealValueUsd: number;
    willWarmTransfer: boolean;
    willWin: boolean;
  } | null;
  callsProcessed: number;
}

interface FlyingPacket {
  id: number;
  kind: 'INBOUND_HOT' | 'INBOUND_COLD' | 'WARM_TRANSFER' | 'OUT_WIN' | 'OUT_HANDBACK' | 'OUT_LOST';
  points: [number, number][];
  progress: number; // 0..100
  targetRepId?: string;
  targetPodId?: 'pod_a' | 'pod_b';
  payload?: {
    callId: number;
    leadType: 'HOT' | 'COLD';
    dealValueUsd: number;
    shiftCallNum: number;
    isWarmTransfer?: boolean;
  };
}

interface FloatingPop {
  id: number;
  x: number;
  y: number;
  text: string;
  tone: 'emerald' | 'amber' | 'sky' | 'violet';
  ageSec: number;
}

interface FloorEventLog {
  id: number;
  repName: string;
  leadType: 'HOT' | 'COLD';
  handler: 'HUMAN' | 'AI';
  outcome: 'CLOSED_WON' | 'WARM_TRANSFER_WON' | 'RETURNED_QUEUE' | 'OPT_OUT';
  dealValueUsd: number;
  note: string;
}

interface LiveFlowTallies {
  callsProcessed: number;
  closedRevenueUsd: number;
  humanWonCount: number;
  aiWonCount: number;
  warmTransferRevenueUsd: number;
  returnedToQueueCount: number;
  optOutCount: number;
  aiHandledColdCount: number;
}

interface SimWorld {
  tick: number;
  shiftCounter: number;
  nextId: number;
  reps: SimRep[];
  pods: AiPod[];
  packets: FlyingPacket[];
  pops: FloatingPop[];
  recentCalls: FloorEventLog[];
  tallies: LiveFlowTallies;
}

const HOT_TALK_LINES = [
  'Walking through $42/mo plan...',
  'Addressing deductible question...',
  'Confirming hospital network...',
  'Reviewing 15-day guarantee...',
  'Locking in saved checkout cart...',
];

const COLD_TALK_LINES = [
  'Asking about family coverage...',
  'Qualifying household budget...',
  'Checking renewal timing...',
];

const TRANSFER_TALK_LINES = [
  'Picking up warm AI transfer!',
  'Buyer ready — finalizing quote...',
  'Confirming payment method...',
];

function createInitialReps(): SimRep[] {
  return [
    {
      id: 'maya',
      name: 'Maya Chen',
      firstName: 'Maya',
      role: 'Senior Closer',
      trait: 'High persistence on complex objections',
      cx: 314,
      cy: 112,
      skinTone: '#F1C6A4',
      hairColor: '#1E293B',
      hairStyle: 'bun',
      shirtColor: '#0F766E',
      persistenceSkill: 1.18,
      cherryPickTendency: 0.72,
      energy: 90,
      morale: 88,
      focus: 86,
      state: 'IDLE',
      stateTimerSec: 0,
      aiCoachCharges: 0,
      activeCall: null,
      speechText: 'Ready for high-intent leads',
      dealsWon: 0,
      revenueWonUsd: 0,
      handBacks: 0,
      callsHandled: 0,
    },
    {
      id: 'devon',
      name: 'Devon Brooks',
      firstName: 'Devon',
      role: 'Velocity Closer',
      trait: 'Fast dialer · prone to cherry-picking if unpaced',
      cx: 482,
      cy: 112,
      skinTone: '#8D5524',
      hairColor: '#0F172A',
      hairStyle: 'fade',
      shirtColor: '#1D4ED8',
      persistenceSkill: 1.0,
      cherryPickTendency: 1.45,
      energy: 86,
      morale: 80,
      focus: 78,
      state: 'IDLE',
      stateTimerSec: 0,
      aiCoachCharges: 0,
      activeCall: null,
      speechText: 'Dialer armed & ready',
      dealsWon: 0,
      revenueWonUsd: 0,
      handBacks: 0,
      callsHandled: 0,
    },
    {
      id: 'priya',
      name: 'Priya Patel',
      firstName: 'Priya',
      role: 'Consultative Advisor',
      trait: 'Excels on warm AI transfers & hesitant buyers',
      cx: 650,
      cy: 112,
      skinTone: '#C68642',
      hairColor: '#1E1B4B',
      hairStyle: 'wave',
      shirtColor: '#7C3AED',
      persistenceSkill: 1.15,
      cherryPickTendency: 0.78,
      energy: 92,
      morale: 90,
      focus: 85,
      state: 'IDLE',
      stateTimerSec: 0,
      aiCoachCharges: 0,
      activeCall: null,
      speechText: 'Standing by for transfers',
      dealsWon: 0,
      revenueWonUsd: 0,
      handBacks: 0,
      callsHandled: 0,
    },
    {
      id: 'marcus',
      name: 'Marcus Vance',
      firstName: 'Marcus',
      role: 'Enterprise Rep',
      trait: 'Strong deal closer · drains energy faster',
      cx: 314,
      cy: 244,
      skinTone: '#E0AC69',
      hairColor: '#451A03',
      hairStyle: 'short',
      shirtColor: '#0369A1',
      persistenceSkill: 1.12,
      cherryPickTendency: 1.1,
      energy: 78,
      morale: 82,
      focus: 82,
      state: 'IDLE',
      stateTimerSec: 0,
      aiCoachCharges: 0,
      activeCall: null,
      speechText: 'Reviewing morning pipeline',
      dealsWon: 0,
      revenueWonUsd: 0,
      handBacks: 0,
      callsHandled: 0,
    },
    {
      id: 'sofia',
      name: 'Sofia Reyes',
      firstName: 'Sofia',
      role: 'Discovery Specialist',
      trait: 'Steady close rate & low hand-back rate',
      cx: 482,
      cy: 244,
      skinTone: '#D9A077',
      hairColor: '#292524',
      hairStyle: 'bob',
      shirtColor: '#BE123C',
      persistenceSkill: 1.08,
      cherryPickTendency: 0.85,
      energy: 88,
      morale: 86,
      focus: 84,
      state: 'IDLE',
      stateTimerSec: 0,
      aiCoachCharges: 0,
      activeCall: null,
      speechText: 'Queue open — ready to talk',
      dealsWon: 0,
      revenueWonUsd: 0,
      handBacks: 0,
      callsHandled: 0,
    },
    {
      id: 'liam',
      name: "Liam O'Connor",
      firstName: 'Liam',
      role: 'Junior Closer',
      trait: 'Big lift when paired with Live AI Coaching',
      cx: 650,
      cy: 244,
      skinTone: '#FAD4B8',
      hairColor: '#B45309',
      hairStyle: 'part',
      shirtColor: '#334155',
      persistenceSkill: 0.88,
      cherryPickTendency: 1.25,
      energy: 84,
      morale: 76,
      focus: 72,
      state: 'IDLE',
      stateTimerSec: 0,
      aiCoachCharges: 0,
      activeCall: null,
      speechText: 'Ready — coach me anytime',
      dealsWon: 0,
      revenueWonUsd: 0,
      handBacks: 0,
      callsHandled: 0,
    },
  ];
}

function createInitialPods(): AiPod[] {
  return [
    {
      id: 'pod_a',
      label: 'AI Voice Pod A · Cold Screening',
      cx: 364,
      cy: 416,
      busy: false,
      statusText: 'Listening for cold inquiries · $0.06/call',
      elapsedSec: 0,
      durationSec: 2.0,
      currentCall: null,
      callsProcessed: 0,
    },
    {
      id: 'pod_b',
      label: 'AI Voice Pod B · Overflow & NLP',
      cx: 604,
      cy: 416,
      busy: false,
      statusText: 'Ready for warm transfer & overflow',
      elapsedSec: 0,
      durationSec: 2.0,
      currentCall: null,
      callsProcessed: 0,
    },
  ];
}

function createInitialWorld(): SimWorld {
  return {
    tick: 0,
    shiftCounter: 1,
    nextId: 4201,
    reps: createInitialReps(),
    pods: createInitialPods(),
    packets: [],
    pops: [],
    recentCalls: [],
    tallies: {
      callsProcessed: 0,
      closedRevenueUsd: 0,
      humanWonCount: 0,
      aiWonCount: 0,
      warmTransferRevenueUsd: 0,
      returnedToQueueCount: 0,
      optOutCount: 0,
      aiHandledColdCount: 0,
    },
  };
}

function pointAlongPath(points: [number, number][], pct: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, pct / 100));
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    lens.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i] || i === lens.length - 1) {
      const r = lens[i] === 0 ? 0 : target / lens[i];
      return {
        x: points[i][0] + (points[i + 1][0] - points[i][0]) * r,
        y: points[i][1] + (points[i + 1][1] - points[i][1]) * r,
      };
    }
    target -= lens[i];
  }
  return { x: points[points.length - 1][0], y: points[points.length - 1][1] };
}

function getRepPlumbob(rep: SimRep, strategy: BusinessStrategy): { color: string; label: string } {
  if (rep.state === 'COFFEE_BREAK') return { color: '#0284C7', label: 'Recharging' };
  if (rep.state === 'CELEBRATING') return { color: '#059669', label: 'Deal Won' };
  if (rep.state === 'HANDED_BACK') return { color: '#D97706', label: 'Hand-Back' };
  if (rep.aiCoachCharges > 0) return { color: '#7C3AED', label: 'AI Coached' };
  if (rep.energy < 35 || rep.morale < 38) return { color: '#DC2626', label: 'Burned Out' };
  if (strategy === 'unpaced_ai' && (rep.morale < 68 || rep.cherryPickTendency > 1.15)) {
    return { color: '#D97706', label: 'Rushing' };
  }
  if (rep.state === 'ON_HOT_CALL' || rep.state === 'ON_WARM_TRANSFER') {
    return { color: '#059669', label: 'In the Zone' };
  }
  return { color: '#0284C7', label: 'Ready' };
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function meterStatusText(v: number): string {
  if (v >= 72) return 'Strong';
  if (v >= 45) return 'Steady';
  return 'Low';
}

function meterBarColor(v: number): string {
  if (v >= 72) return 'bg-emerald-600';
  if (v >= 45) return 'bg-amber-500';
  return 'bg-red-600';
}

export const ExecutiveFlowCanvas: React.FC<ExecutiveFlowCanvasProps> = ({
  strategy,
  onStrategyChange,
  routingConfig,
  occupancyPct,
  hotLeadSharePct,
  avgDealValueUsd,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [selectedRepId, setSelectedRepId] = useState<string>('maya');
  const worldRef = useRef<SimWorld>(createInitialWorld());
  const [world, setWorld] = useState<SimWorld>(() => worldRef.current);

  const propsRef = useRef({
    strategy,
    routingConfig,
    occupancyPct,
    hotLeadSharePct,
    avgDealValueUsd,
    speed,
  });
  propsRef.current = {
    strategy,
    routingConfig,
    occupancyPct,
    hotLeadSharePct,
    avgDealValueUsd,
    speed,
  };

  const profile = STRATEGY_PROFILES[strategy];

  const syncWorld = useCallback(() => {
    const w = worldRef.current;
    setWorld({
      ...w,
      reps: w.reps.map((r) => ({ ...r })),
      pods: w.pods.map((p) => ({ ...p })),
      packets: [...w.packets],
      pops: [...w.pops],
      recentCalls: [...w.recentCalls],
      tallies: { ...w.tallies },
    });
  }, []);

  const addPop = useCallback(
    (x: number, y: number, text: string, tone: FloatingPop['tone']) => {
      const w = worldRef.current;
      w.pops.push({
        id: w.nextId++,
        x,
        y,
        text,
        tone,
        ageSec: 0,
      });
      if (w.pops.length > 14) w.pops.shift();
    },
    []
  );

  const dispatchCall = useCallback(
    (forcedType?: 'HOT' | 'COLD', forcedRepId?: string) => {
      const w = worldRef.current;
      const {
        strategy: curStrategy,
        routingConfig: curRouting,
        occupancyPct: curOcc,
        hotLeadSharePct: curHotShare,
        avgDealValueUsd: curAcv,
      } = propsRef.current;
      const curProfile = STRATEGY_PROFILES[curStrategy];
      const activeWin = curRouting.timeWindows[curRouting.activeWindow];

      const pos = ((w.shiftCounter - 1) % 30) + 1;
      w.shiftCounter += 1;
      const isOpeningShift = curRouting.useCustomWeights
        ? curRouting.activeWindow === 'opening'
        : pos <= 6;

      const effectiveHotProb =
        curStrategy === 'unpaced_ai' && isOpeningShift
          ? Math.min(0.92, curHotShare / 100 + 0.2)
          : curHotShare / 100;

      const leadType: 'HOT' | 'COLD' =
        forcedType ?? (Math.random() < effectiveHotProb ? 'HOT' : 'COLD');
      const callId = w.nextId++;
      const dealValueUsd = Math.round(curAcv * (0.86 + Math.random() * 0.34));

      // Pick destination using configured Skill Tag weights when custom rules are active
      const findBestAvailableRep = (): SimRep | undefined => {
        if (forcedRepId) {
          const explicit = w.reps.find((r) => r.id === forcedRepId);
          if (explicit && explicit.state !== 'COFFEE_BREAK') return explicit;
        }
        const idleReps = w.reps.filter((r) => r.state === 'IDLE');
        if (idleReps.length > 0) {
          if (curRouting.useCustomWeights) {
            return pickWeightedRepId(idleReps, curRouting, leadType);
          }
          return idleReps[Math.floor(Math.random() * idleReps.length)];
        }
        // Under Standard Human Floor, keep hot/cold calls on human reps by choosing the rep closest to finishing
        if (curStrategy === 'human_only') {
          const working = w.reps
            .filter((r) => r.state !== 'COFFEE_BREAK')
            .sort((a, b) => {
              const remA = a.activeCall ? a.activeCall.durationSec - a.activeCall.elapsedSec : 0;
              const remB = b.activeCall ? b.activeCall.durationSec - b.activeCall.elapsedSec : 0;
              return remA - remB;
            });
          return working[0];
        }
        return undefined;
      };

      const findAvailablePod = (prefer: 'pod_a' | 'pod_b'): AiPod => {
        const first = w.pods.find((p) => p.id === prefer);
        if (first && !first.busy) return first;
        const other = w.pods.find((p) => !p.busy);
        return other ?? w.pods[0];
      };

      const routeToHuman =
        Boolean(forcedRepId) ||
        (curStrategy === 'human_only'
          ? leadType === 'HOT'
            ? true
            : Math.random() >= curProfile.aiColdCaptureShare
          : curRouting.useCustomWeights
          ? leadType === 'HOT'
            ? Math.random() < activeWin.hotToHumanPct / 100
            : Math.random() >= activeWin.coldToAiPct / 100
          : leadType === 'HOT'
          ? !(curOcc >= 92 && Math.random() < (curOcc - 84) / 24)
          : Math.random() >= curProfile.aiColdCaptureShare);

      if (routeToHuman) {
        const chosenRep = findBestAvailableRep();
        if (chosenRep) {
          w.packets.push({
            id: w.nextId++,
            kind: leadType === 'HOT' ? 'INBOUND_HOT' : 'INBOUND_COLD',
            points: [
              [84, 222],
              [182, 222],
              [224, chosenRep.cy],
              [chosenRep.cx, chosenRep.cy - 8],
            ],
            progress: 0,
            targetRepId: chosenRep.id,
            payload: {
              callId,
              leadType,
              dealValueUsd,
              shiftCallNum: pos,
            },
          });
          syncWorld();
          return;
        }
      }

      // Route to AI Voice Concierge Pod
      const pod = findAvailablePod(leadType === 'COLD' ? 'pod_a' : 'pod_b');
      w.packets.push({
        id: w.nextId++,
        kind: leadType === 'HOT' ? 'INBOUND_HOT' : 'INBOUND_COLD',
        points: [
          [84, 222],
          [182, 222],
          [224, pod.cy],
          [pod.cx, pod.cy],
        ],
        progress: 0,
        targetPodId: pod.id,
        payload: {
          callId,
          leadType,
          dealValueUsd,
          shiftCallNum: pos,
        },
      });
      syncWorld();
    },
    [syncWorld]
  );

  // Reset simulation cleanly on strategy change
  useEffect(() => {
    const fresh = createInitialWorld();
    // Pre-seed two active calls right away so the floor feels alive immediately
    worldRef.current = fresh;
    syncWorld();
    const kickoff = window.setTimeout(() => {
      dispatchCall('HOT', 'maya');
      dispatchCall('COLD');
      dispatchCall('HOT', 'devon');
    }, 180);
    return () => window.clearTimeout(kickoff);
  }, [strategy, dispatchCall, syncWorld]);

  // Main 20fps Sims physics & call progression loop
  useEffect(() => {
    if (!isRunning) return;
    const dtBase = 0.05; // 50ms tick
    const timer = window.setInterval(() => {
      const w = worldRef.current;
      const { strategy: curStrategy, speed: curSpeed } = propsRef.current;
      const curProfile = STRATEGY_PROFILES[curStrategy];
      const dt = dtBase * curSpeed;
      w.tick += 1;

      // 1. Advance floating revenue/status pops
      w.pops = w.pops
        .map((p) => ({ ...p, ageSec: p.ageSec + dtBase, y: p.y - 0.7 }))
        .filter((p) => p.ageSec < 1.9);

      // 2. Advance flying packets
      const stillFlying: FlyingPacket[] = [];
      for (const pkt of w.packets) {
        const nextProg = pkt.progress + 3.2 * curSpeed;
        if (nextProg < 100) {
          stillFlying.push({ ...pkt, progress: nextProg });
          continue;
        }

        // Packet arrived!
        if (pkt.targetRepId && pkt.payload) {
          const rep = w.reps.find((r) => r.id === pkt.targetRepId);
          if (rep && rep.state !== 'COFFEE_BREAK') {
            const isWarm = Boolean(pkt.payload.isWarmTransfer);
            const hasCoach = rep.aiCoachCharges > 0 || curStrategy === 'paced_ai_nlp';
            const durationSec =
              curStrategy === 'unpaced_ai' && pkt.payload.shiftCallNum <= 6 && rep.aiCoachCharges === 0
                ? 2.1 + Math.random() * 0.8
                : 2.9 + Math.random() * 1.1;

            rep.state = isWarm
              ? 'ON_WARM_TRANSFER'
              : pkt.payload.leadType === 'HOT'
              ? 'ON_HOT_CALL'
              : 'ON_COLD_CALL';
            rep.activeCall = {
              id: pkt.payload.callId,
              leadType: pkt.payload.leadType,
              isWarmTransfer: isWarm,
              dealValueUsd: pkt.payload.dealValueUsd,
              elapsedSec: 0,
              durationSec,
              shiftCallNum: pkt.payload.shiftCallNum,
              wasAiCoached: hasCoach,
            };
            if (rep.aiCoachCharges > 0) {
              rep.aiCoachCharges = Math.max(0, rep.aiCoachCharges - 1);
            }
            const lines = isWarm
              ? TRANSFER_TALK_LINES
              : pkt.payload.leadType === 'HOT'
              ? HOT_TALK_LINES
              : COLD_TALK_LINES;
            rep.speechText = lines[Math.floor(Math.random() * lines.length)];
          }
        } else if (pkt.targetPodId && pkt.payload) {
          const pod = w.pods.find((p) => p.id === pkt.targetPodId);
          if (pod) {
            const curRouting = propsRef.current.routingConfig;
            const thresholdProb = curRouting.useCustomWeights
              ? Math.max(0.08, Math.min(0.48, (96 - curRouting.nlpWarmTransferThreshold) / 90))
              : 0.26;
            const willWarmTransfer =
              curStrategy === 'paced_ai_nlp' &&
              pkt.payload.leadType === 'COLD' &&
              Math.random() < thresholdProb;
            const willWin = !willWarmTransfer && Math.random() < 0.14;
            pod.busy = true;
            pod.elapsedSec = 0;
            pod.durationSec = 1.8 + Math.random() * 0.9;
            pod.currentCall = {
              id: pkt.payload.callId,
              leadType: pkt.payload.leadType,
              dealValueUsd: pkt.payload.dealValueUsd,
              willWarmTransfer,
              willWin,
            };
            pod.statusText = willWarmTransfer
              ? `NLP signal >= ${curRouting.nlpWarmTransferThreshold}/100!`
              : pkt.payload.leadType === 'HOT'
              ? 'Handling sales floor overflow...'
              : 'Screening cold inquiry at $0.06...';
          }
        }
      }
      w.packets = stillFlying;

      // 3. Advance Human Reps (Sims)
      for (const rep of w.reps) {
        if (rep.state === 'COFFEE_BREAK') {
          rep.stateTimerSec -= dt;
          rep.energy = clamp(rep.energy + 11 * dt);
          rep.morale = clamp(rep.morale + 6 * dt);
          rep.focus = clamp(rep.focus + 5 * dt);
          if (rep.stateTimerSec <= 0) {
            rep.state = 'IDLE';
            rep.speechText = 'Refreshed & back on the dialer!';
            addPop(rep.cx, rep.cy - 34, 'Recharged!', 'sky');
          }
          continue;
        }

        if (rep.state === 'CELEBRATING' || rep.state === 'HANDED_BACK') {
          rep.stateTimerSec -= dt;
          if (rep.stateTimerSec <= 0) {
            rep.state = 'IDLE';
            rep.speechText =
              rep.energy < 35
                ? 'Could use a quick coffee break...'
                : 'Ready for next lead';
          }
          continue;
        }

        if (rep.state === 'IDLE') {
          // Gentle passive recovery while waiting
          rep.energy = clamp(rep.energy + 1.2 * dt);
          continue;
        }

        // Actively on a call
        if (rep.activeCall) {
          rep.activeCall.elapsedSec += dt;
          // Mid-call realistic dialogue shift
          if (
            rep.activeCall.elapsedSec > rep.activeCall.durationSec * 0.55 &&
            rep.activeCall.elapsedSec < rep.activeCall.durationSec * 0.62
          ) {
            if (rep.activeCall.wasAiCoached) {
              rep.speechText = 'Using AI rebuttal prompt...';
            } else if (curStrategy === 'unpaced_ai' && rep.cherryPickTendency > 1.1) {
              rep.speechText = 'Buyer hesitating... tempted to skip';
            }
          }

          if (rep.activeCall.elapsedSec >= rep.activeCall.durationSec) {
            const call = rep.activeCall;
            rep.activeCall = null;
            rep.callsHandled += 1;

            // Compute realistic outcome based on rep skills, morale, energy, AI coaching, and strategy
            const isOpening = call.shiftCallNum <= 6;
            const baseWin = call.isWarmTransfer
              ? 0.62
              : call.leadType === 'HOT'
              ? (isOpening ? curProfile.earlyShiftHotCloseRate : curProfile.midLateHotCloseRate) *
                3.6
              : 0.16;

            const energyFactor = 0.65 + (rep.energy / 100) * 0.45;
            const moraleFactor = 0.7 + (rep.morale / 100) * 0.4;
            const coachBonus = call.wasAiCoached ? 0.16 : 0;
            const winProb = Math.min(
              0.84,
              baseWin * rep.persistenceSkill * energyFactor * moraleFactor + coachBonus
            );

            const baseHandBack =
              call.leadType === 'HOT' && !call.isWarmTransfer
                ? (isOpening
                    ? curProfile.earlyShiftCherryPickRate
                    : curProfile.earlyShiftCherryPickRate * 0.55) *
                  rep.cherryPickTendency *
                  (call.wasAiCoached ? 0.35 : 1) *
                  (rep.energy < 40 ? 1.35 : 1)
                : 0.04;

            const roll = Math.random();
            w.tallies.callsProcessed += 1;

            if (roll < winProb) {
              // CLOSED WON!
              rep.state = 'CELEBRATING';
              rep.stateTimerSec = 1.7;
              rep.dealsWon += 1;
              rep.revenueWonUsd += call.dealValueUsd;
              rep.morale = clamp(rep.morale + 7);
              rep.energy = clamp(rep.energy - (rep.id === 'marcus' ? 7 : 5));
              rep.focus = clamp(rep.focus + 3);
              rep.speechText = call.isWarmTransfer
                ? `Closed AI transfer! +$${call.dealValueUsd}`
                : `Closed deal! +$${call.dealValueUsd}`;

              w.tallies.closedRevenueUsd += call.dealValueUsd;
              w.tallies.humanWonCount += 1;
              if (call.isWarmTransfer) {
                w.tallies.warmTransferRevenueUsd += call.dealValueUsd;
              }

              addPop(rep.cx, rep.cy - 36, `+$${call.dealValueUsd}`, 'emerald');
              w.packets.push({
                id: w.nextId++,
                kind: 'OUT_WIN',
                points: [
                  [rep.cx + 42, rep.cy],
                  [742, rep.cy],
                  [768, 86],
                ],
                progress: 0,
              });
              w.recentCalls.unshift({
                id: call.id,
                repName: rep.firstName,
                leadType: call.leadType,
                handler: 'HUMAN',
                outcome: call.isWarmTransfer ? 'WARM_TRANSFER_WON' : 'CLOSED_WON',
                dealValueUsd: call.dealValueUsd,
                note: call.isWarmTransfer
                  ? `${rep.firstName} closed a warm NLP transfer for $${call.dealValueUsd}`
                  : call.wasAiCoached
                  ? `${rep.firstName} used live AI coaching to win $${call.dealValueUsd}`
                  : `${rep.firstName} converted high-intent prospect for $${call.dealValueUsd}`,
              });
            } else if (roll < winProb + baseHandBack) {
              // HAND-BACK / CHERRY-PICK
              rep.state = 'HANDED_BACK';
              rep.stateTimerSec = 1.5;
              rep.handBacks += 1;
              rep.morale = clamp(rep.morale - 4);
              rep.energy = clamp(rep.energy - 3);
              rep.speechText =
                curStrategy === 'unpaced_ai'
                  ? 'Too tough — handing back for easier hot lead!'
                  : 'Returning lead to follow-up queue';

              w.tallies.returnedToQueueCount += 1;
              addPop(rep.cx, rep.cy - 36, 'Hand-Back', 'amber');
              w.packets.push({
                id: w.nextId++,
                kind: 'OUT_HANDBACK',
                points: [
                  [rep.cx + 42, rep.cy],
                  [748, 228],
                  [768, 228],
                ],
                progress: 0,
              });
              w.recentCalls.unshift({
                id: call.id,
                repName: rep.firstName,
                leadType: call.leadType,
                handler: 'HUMAN',
                outcome: 'RETURNED_QUEUE',
                dealValueUsd: call.dealValueUsd,
                note:
                  curStrategy === 'unpaced_ai'
                    ? `${rep.firstName} handed back tough $${call.dealValueUsd} lead (cherry-picking risk)`
                    : `${rep.firstName} returned lead for secondary callback attempt`,
              });
            } else {
              // CLOSED LOST / OPT-OUT
              rep.state = 'IDLE';
              rep.energy = clamp(rep.energy - 6);
              rep.morale = clamp(rep.morale - 3);
              rep.speechText =
                rep.energy < 38
                  ? 'Tired after rejection — need coffee!'
                  : 'Prospect opted out — dialing next';

              w.tallies.optOutCount += 1;
              w.packets.push({
                id: w.nextId++,
                kind: 'OUT_LOST',
                points: [
                  [rep.cx + 42, rep.cy],
                  [742, 378],
                  [768, 378],
                ],
                progress: 0,
              });
              w.recentCalls.unshift({
                id: call.id,
                repName: rep.firstName,
                leadType: call.leadType,
                handler: 'HUMAN',
                outcome: 'OPT_OUT',
                dealValueUsd: call.dealValueUsd,
                note: `${rep.firstName} logged prospect opt-out (6-month DNC rule)`,
              });
            }
            w.recentCalls = w.recentCalls.slice(0, 6);
          }
        }
      }

      // 4. Advance AI Voice Concierge Pods
      for (const pod of w.pods) {
        if (!pod.busy || !pod.currentCall) continue;
        pod.elapsedSec += dt;
        if (pod.elapsedSec >= pod.durationSec) {
          const call = pod.currentCall;
          pod.busy = false;
          pod.currentCall = null;
          pod.callsProcessed += 1;

          if (call.leadType === 'COLD') {
            w.tallies.aiHandledColdCount += 1;
          }

          if (call.willWarmTransfer) {
            const curRouting = propsRef.current.routingConfig;
            const idleReps = w.reps.filter((r) => r.state === 'IDLE');
            const eligibleIdle = idleReps.filter((r) => {
              const sk = REP_SKILL_MAP[r.id] ?? 'high_velocity_dialing';
              return curRouting.skillTags[sk].allowWarmTransfer;
            });
            const targetRep =
              (curRouting.useCustomWeights
                ? pickWeightedRepId(
                    eligibleIdle.length > 0 ? eligibleIdle : idleReps,
                    curRouting,
                    'WARM_TRANSFER'
                  )
                : idleReps.find((r) => r.id === 'priya') ?? idleReps[0]) ??
              w.reps.find((r) => r.state !== 'COFFEE_BREAK');

            if (targetRep) {
              pod.statusText = `Warm transfer -> ${targetRep.firstName}!`;
              addPop(pod.cx, pod.cy - 28, `Transfer -> ${targetRep.firstName}`, 'emerald');
              w.packets.push({
                id: w.nextId++,
                kind: 'WARM_TRANSFER',
                points: [
                  [pod.cx, pod.cy - 26],
                  [pod.cx, 326],
                  [targetRep.cx, targetRep.cy + 10],
                ],
                progress: 0,
                targetRepId: targetRep.id,
                payload: {
                  callId: call.id,
                  leadType: 'COLD',
                  dealValueUsd: call.dealValueUsd,
                  shiftCallNum: w.shiftCounter,
                  isWarmTransfer: true,
                },
              });
              continue;
            }
          }

          w.tallies.callsProcessed += 1;
          if (call.willWin) {
            w.tallies.closedRevenueUsd += call.dealValueUsd;
            w.tallies.aiWonCount += 1;
            pod.statusText = `AI closed +$${call.dealValueUsd} at $0.06 cost`;
            addPop(pod.cx, pod.cy - 28, `+$${call.dealValueUsd} AI`, 'emerald');
            w.packets.push({
              id: w.nextId++,
              kind: 'OUT_WIN',
              points: [
                [pod.cx + 95, pod.cy],
                [746, 390],
                [768, 92],
              ],
              progress: 0,
            });
            w.recentCalls.unshift({
              id: call.id,
              repName: pod.id === 'pod_a' ? 'AI Pod A' : 'AI Pod B',
              leadType: call.leadType,
              handler: 'AI',
              outcome: 'CLOSED_WON',
              dealValueUsd: call.dealValueUsd,
              note: `AI Voice Concierge closed $${call.dealValueUsd} self-serve policy ($0.06 cost)`,
            });
          } else {
            w.tallies.optOutCount += 1;
            pod.statusText = 'Qualified out — saved $1.85 rep cost';
            w.packets.push({
              id: w.nextId++,
              kind: 'OUT_LOST',
              points: [
                [pod.cx + 95, pod.cy],
                [768, 384],
              ],
              progress: 0,
            });
            w.recentCalls.unshift({
              id: call.id,
              repName: pod.id === 'pod_a' ? 'AI Pod A' : 'AI Pod B',
              leadType: call.leadType,
              handler: 'AI',
              outcome: 'OPT_OUT',
              dealValueUsd: call.dealValueUsd,
              note: `AI Voice filtered out low-intent inquiry — saved $1.85 human dial cost`,
            });
          }
          w.recentCalls = w.recentCalls.slice(0, 6);
        }
      }

      syncWorld();
    }, 50);

    return () => window.clearInterval(timer);
  }, [isRunning, addPop, syncWorld]);

  // Auto-spawner respecting speed & occupancy
  useEffect(() => {
    if (!isRunning) return;
    const intervalMs = Math.max(480, Math.round((1350 - occupancyPct * 4) / speed));
    const spawner = window.setInterval(() => {
      dispatchCall();
    }, intervalMs);
    return () => window.clearInterval(spawner);
  }, [isRunning, speed, occupancyPct, dispatchCall]);

  // Interactive Manager Actions for the Selected Sim Rep
  const handleSendCoffeeBreak = (repId: string) => {
    const rep = worldRef.current.reps.find((r) => r.id === repId);
    if (!rep) return;
    rep.activeCall = null;
    rep.state = 'COFFEE_BREAK';
    rep.stateTimerSec = 5.0;
    rep.speechText = 'Espresso break — recharging focus!';
    addPop(rep.cx, rep.cy - 36, 'Coffee Break', 'sky');
    syncWorld();
  };

  const handleAttachAiCoach = (repId: string) => {
    const rep = worldRef.current.reps.find((r) => r.id === repId);
    if (!rep) return;
    rep.aiCoachCharges = Math.min(6, rep.aiCoachCharges + 3);
    rep.focus = clamp(rep.focus + 22);
    rep.morale = clamp(rep.morale + 8);
    if (rep.activeCall) {
      rep.activeCall.wasAiCoached = true;
      rep.speechText = 'AI Coach live — rebuttal loaded!';
    } else if (rep.state !== 'COFFEE_BREAK') {
      rep.speechText = 'AI Co-Pilot armed for next 3 calls!';
    }
    addPop(rep.cx, rep.cy - 36, 'AI Coach +3', 'violet');
    syncWorld();
  };

  const handlePepTalk = (repId: string) => {
    const rep = worldRef.current.reps.find((r) => r.id === repId);
    if (!rep) return;
    rep.morale = clamp(rep.morale + 24);
    rep.energy = clamp(rep.energy + 10);
    rep.focus = clamp(rep.focus + 12);
    if (rep.state === 'HANDED_BACK') rep.state = 'IDLE';
    rep.speechText = 'Feeling locked in — bring on the deals!';
    addPop(rep.cx, rep.cy - 36, '+24 Morale', 'emerald');
    syncWorld();
  };

  const handleFloorSurge = () => {
    dispatchCall('HOT');
    window.setTimeout(() => dispatchCall('HOT'), 160);
    window.setTimeout(() => dispatchCall('COLD'), 320);
    window.setTimeout(() => dispatchCall('HOT'), 480);
    window.setTimeout(() => dispatchCall('COLD'), 640);
  };

  const handleResetFloor = () => {
    worldRef.current = createInitialWorld();
    syncWorld();
  };

  const selectedRep = world.reps.find((r) => r.id === selectedRepId) ?? world.reps[0];
  const activeRepCount = world.reps.filter(
    (r) => r.state === 'ON_HOT_CALL' || r.state === 'ON_COLD_CALL' || r.state === 'ON_WARM_TRANSFER'
  ).length;
  const selectedPlumbob = getRepPlumbob(selectedRep, strategy);

  return (
    <section id="call-flow" className="scroll-mt-20 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Interactive Live Call Center Floor Simulator
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Watch real sales reps work hot leads alongside AI Voice pods. Click any rep on the floor to monitor their energy and morale, route hot deals directly to them, attach Live AI Coaching, or send them on a coffee break.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => dispatchCall('HOT')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            Send Hot Lead
          </button>
          <button
            type="button"
            onClick={() => dispatchCall('COLD')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Snowflake className="w-3.5 h-3.5" />
            Send Cold Lead
          </button>
          <button
            type="button"
            onClick={handleFloorSurge}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            Rush Surge (+5)
          </button>
          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={handleResetFloor}
            title="Reset live floor"
            aria-label="Reset live floor"
            className="p-1.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split: Interactive Sims Call Floor (8 cols) + Rep Manager Desk & Feed (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          {/* Floor Status Header + Direct 3-Routing Switcher */}
          <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-600">
              <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200">
                {(['human_only', 'unpaced_ai', 'paced_ai_nlp'] as BusinessStrategy[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStrategyChange(s)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      strategy === s
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'human_only'
                      ? '1. Human Floor'
                      : s === 'unpaced_ai'
                      ? '2. Unpaced AI'
                      : '3. AI + NLP'}
                  </button>
                ))}
              </div>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono tabular-nums">
                {routingConfig.timeWindows[routingConfig.activeWindow].hours}
                {routingConfig.useCustomWeights ? ' · Custom Rules' : ''}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono tabular-nums text-emerald-700 font-semibold">
                Live Closed: ${world.tallies.closedRevenueUsd.toLocaleString()}
              </span>
            </div>

            <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer ${
                    speed === s ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Living Call Center Floor SVG */}
          <div className="p-3 bg-[#F6F8FB] overflow-x-auto flex-1 flex items-center">
            <svg
              viewBox="0 0 920 500"
              className="w-full min-w-[740px] h-auto select-none"
              role="img"
              aria-label="Interactive Sims-style Call Center Floor Simulator"
            >
              <defs>
                <pattern id="office-tiles" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path
                    d="M 28 0 L 0 0 0 28"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="0.7"
                    strokeOpacity="0.65"
                  />
                </pattern>
                <marker
                  id="fl-emerald"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
                </marker>
                <marker
                  id="fl-hot"
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
                  id="fl-cold"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284C7" />
                </marker>
              </defs>

              {/* Office Floor Base */}
              <rect width="920" height="500" fill="url(#office-tiles)" rx="8" />

              {/* ZONE: Human Sales Closers Room */}
              <rect
                x="224"
                y="18"
                width="516"
                height="304"
                rx="12"
                fill="#FFFFFF"
                stroke={strategy === 'unpaced_ai' ? '#F59E0B' : '#CBD5E1'}
                strokeWidth={strategy === 'unpaced_ai' ? '1.8' : '1.4'}
              />
              <text
                x="240"
                y="38"
                fontSize="11"
                fontWeight="700"
                fill="#0F172A"
                fontFamily="Bricolage Grotesque"
              >
                Sales Closers Floor
              </text>
              <text
                x="356"
                y="38"
                fontSize="10"
                fill="#64748B"
                fontFamily="Plus Jakarta Sans"
              >
                Click any rep to coach, route leads, or send on coffee break
              </text>
              <text
                x="726"
                y="38"
                textAnchor="end"
                fontSize="9.5"
                fontWeight="600"
                fill={profile.cherryPickRiskLevel === 'High' ? '#DC2626' : '#059669'}
                fontFamily="IBM Plex Mono"
              >
                Cherry-Pick Risk: {profile.cherryPickRiskLevel}
              </text>

              {/* ZONE: AI Voice Concierge Bay */}
              <rect
                x="224"
                y="340"
                width="516"
                height="142"
                rx="12"
                fill="#F0F9FF"
                stroke="#BAE6FD"
                strokeWidth="1.4"
              />
              <text
                x="240"
                y="361"
                fontSize="11"
                fontWeight="700"
                fill="#0369A1"
                fontFamily="Bricolage Grotesque"
              >
                AI Voice Concierge Bay
              </text>
              <text
                x="384"
                y="361"
                fontSize="10"
                fill="#0284C7"
                fontFamily="Plus Jakarta Sans"
              >
                Cold screening ({Math.round(profile.aiColdCaptureShare * 100)}%) &amp; overflow · $0.06/call
              </text>

              {/* Routing Guide Lines */}
              <line x1="136" y1="222" x2="152" y2="222" stroke="#64748B" strokeWidth="2" />
              <path
                d="M 206 202 L 222 156"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2"
                strokeOpacity="0.6"
                markerEnd="url(#fl-hot)"
              />
              <path
                d="M 206 242 L 222 412"
                fill="none"
                stroke="#0284C7"
                strokeWidth="2"
                strokeOpacity="0.6"
                markerEnd="url(#fl-cold)"
              />

              {/* Warm Transfer Bridge between AI Bay and Human Sales Floor */}
              <path
                d="M 482 340 L 482 322"
                fill="none"
                stroke="#059669"
                strokeWidth={strategy === 'paced_ai_nlp' ? '2.5' : '1.4'}
                strokeDasharray={strategy === 'paced_ai_nlp' ? 'none' : '4 3'}
                strokeOpacity={strategy === 'paced_ai_nlp' ? 0.95 : 0.3}
                markerEnd="url(#fl-emerald)"
              />
              <text
                x="492"
                y="334"
                fontSize="9"
                fontWeight="600"
                fill={strategy === 'paced_ai_nlp' ? '#047857' : '#94A3B8'}
                fontFamily="IBM Plex Mono"
              >
                {strategy === 'paced_ai_nlp' ? 'Warm NLP Transfer Active' : 'Warm Transfer Off'}
              </text>

              {/* Outgoing floor pipes */}
              <line x1="740" y1="90" x2="764" y2="90" stroke="#059669" strokeWidth="1.8" strokeOpacity="0.65" />
              <line x1="740" y1="226" x2="764" y2="226" stroke="#D97706" strokeWidth="1.8" strokeDasharray="5 3" strokeOpacity="0.7" />
              <line x1="740" y1="382" x2="764" y2="382" stroke="#94A3B8" strokeWidth="1.6" strokeOpacity="0.6" />

              {/* LEFT NODE 1: Inbound Pipeline */}
              <g transform="translate(14, 174)">
                <rect width="122" height="96" rx="10" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
                <text x="11" y="23" fontSize="11" fontWeight="700" fill="#0F172A" fontFamily="Bricolage Grotesque">
                  Lead Queue
                </text>
                <text x="11" y="42" fontSize="9.5" fill="#475569" fontFamily="Plus Jakarta Sans">
                  Hot: {hotLeadSharePct}% · Cold: {100 - hotLeadSharePct}%
                </text>
                <text x="11" y="59" fontSize="9.5" fill="#475569" fontFamily="Plus Jakarta Sans">
                  Avg Deal: ${avgDealValueUsd}
                </text>
                <text x="11" y="80" fontSize="10" fontWeight="600" fill="#0F172A" fontFamily="IBM Plex Mono">
                  {world.tallies.callsProcessed} routed
                </text>
              </g>

              {/* LEFT NODE 2: Intent Gate Diamond */}
              <g transform="translate(152, 188)">
                <polygon points="30,0 60,34 30,68 0,34" fill="#0F172A" />
                <text x="30" y="31" textAnchor="middle" fontSize="9" fontWeight="600" fill="#FFFFFF" fontFamily="Plus Jakarta Sans">
                  Intent
                </text>
                <text x="30" y="43" textAnchor="middle" fontSize="9" fontWeight="600" fill="#FFFFFF" fontFamily="Plus Jakarta Sans">
                  Gate
                </text>
              </g>

              {/* 6 INTERACTIVE SIM WORKSTATIONS */}
              {world.reps.map((rep, idx) => {
                const isSelected = rep.id === selectedRepId;
                const plumbob = getRepPlumbob(rep, strategy);
                const onCall =
                  rep.state === 'ON_HOT_CALL' ||
                  rep.state === 'ON_COLD_CALL' ||
                  rep.state === 'ON_WARM_TRANSFER';
                const bobY = Math.sin(world.tick * 0.14 + idx * 1.1) * 2.2;
                const talkPulse = onCall ? Math.sin(world.tick * 0.45 + idx) * 1.4 : 0;

                const monitorColor =
                  rep.state === 'ON_HOT_CALL'
                    ? '#EF4444'
                    : rep.state === 'ON_WARM_TRANSFER'
                    ? '#10B981'
                    : rep.state === 'ON_COLD_CALL'
                    ? '#0EA5E9'
                    : rep.state === 'COFFEE_BREAK'
                    ? '#F59E0B'
                    : rep.state === 'CELEBRATING'
                    ? '#10B981'
                    : '#CBD5E1';

                const deskFill = isSelected
                  ? '#F8FAFC'
                  : rep.state === 'CELEBRATING'
                  ? '#ECFDF5'
                  : rep.state === 'HANDED_BACK'
                  ? '#FFFBEB'
                  : '#FFFFFF';

                const deskStroke = isSelected
                  ? '#0F172A'
                  : rep.aiCoachCharges > 0
                  ? '#7C3AED'
                  : onCall
                  ? monitorColor
                  : '#E2E8F0';

                const callPct = rep.activeCall
                  ? Math.min(100, (rep.activeCall.elapsedSec / rep.activeCall.durationSec) * 100)
                  : 0;

                return (
                  <g
                    key={rep.id}
                    transform={`translate(${rep.cx - 76}, ${rep.cy - 56})`}
                    onClick={() => setSelectedRepId(rep.id)}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${rep.name}, ${rep.role}, ${plumbob.label}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRepId(rep.id);
                      }
                    }}
                  >
                    {/* Workstation Floor Pod */}
                    <rect
                      width="152"
                      height="112"
                      rx="10"
                      fill={deskFill}
                      stroke={deskStroke}
                      strokeWidth={isSelected ? '2.2' : '1.3'}
                    />

                    {/* Subtle Desk Surface */}
                    <rect
                      x="10"
                      y="58"
                      width="132"
                      height="24"
                      rx="5"
                      fill="#F1F5F9"
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />

                    {/* Dual Monitor Screen on Desk */}
                    <rect
                      x="22"
                      y="52"
                      width="38"
                      height="13"
                      rx="2.5"
                      fill="#1E293B"
                    />
                    <rect
                      x="24.5"
                      y="54.2"
                      width="33"
                      height="8.5"
                      rx="1.5"
                      fill={monitorColor}
                      fillOpacity={onCall || rep.state === 'CELEBRATING' ? 0.92 : 0.4}
                    />

                    {/* Coffee Mug on Desk (steams on break!) */}
                    <rect x="116" y="61" width="9" height="9" rx="2" fill="#FFFFFF" stroke="#64748B" strokeWidth="1" />
                    <path d="M 125 63 Q 128 65.5 125 68" fill="none" stroke="#64748B" strokeWidth="1" />
                    {rep.state === 'COFFEE_BREAK' && (
                      <g stroke="#0284C7" strokeWidth="1.2" fill="none" strokeLinecap="round">
                        <path d={`M 119 ${59 + bobY * 0.4} Q 117 54 120 50`} />
                        <path d={`M 123 ${59 - bobY * 0.4} Q 125 54 122 50`} />
                      </g>
                    )}

                    {/* Little Desk Plant */}
                    <rect x="13" y="64" width="6" height="6" rx="1" fill="#B45309" />
                    <circle cx="16" cy="61" r="3.5" fill="#10B981" />

                    {/* SIM CHARACTER (Swivel chair + torso + head + headset + arms) */}
                    <g transform={`translate(76, ${38 + talkPulse * 0.5})`}>
                      {/* Chair Back */}
                      <rect x="-15" y="-6" width="30" height="22" rx="7" fill="#334155" />

                      {/* Shoulders / Shirt */}
                      <path
                        d="M -16 18 C -16 8, 16 8, 16 18 L 16 24 L -16 24 Z"
                        fill={rep.shirtColor}
                      />

                      {/* Arms (raise up when celebrating!) */}
                      {rep.state === 'CELEBRATING' ? (
                        <g stroke={rep.shirtColor} strokeWidth="4.5" strokeLinecap="round">
                          <line x1="-13" y1="14" x2="-22" y2="-2" />
                          <line x1="13" y1="14" x2="22" y2="-2" />
                        </g>
                      ) : (
                        <g stroke={rep.shirtColor} strokeWidth="4" strokeLinecap="round">
                          <line x1="-13" y1="16" x2="-10" y2="23" />
                          <line x1="13" y1="16" x2="10" y2="23" />
                        </g>
                      )}

                      {/* Head */}
                      <circle cx="0" cy="-1" r="10.5" fill={rep.skinTone} />

                      {/* Hairstyles */}
                      {rep.hairStyle === 'bun' && (
                        <>
                          <circle cx="0" cy="-12" r="4.5" fill={rep.hairColor} />
                          <path d="M -10 -3 C -10 -12, 10 -12, 10 -3 C 6 -7, -6 -7, -10 -3 Z" fill={rep.hairColor} />
                        </>
                      )}
                      {rep.hairStyle === 'fade' && (
                        <path d="M -10 -3 C -10 -12, 10 -12, 10 -3 C 7 -7, -7 -7, -10 -3 Z" fill={rep.hairColor} />
                      )}
                      {rep.hairStyle === 'wave' && (
                        <path d="M -11 2 C -12 -13, 12 -13, 11 2 C 9 -6, -9 -6, -11 2 Z" fill={rep.hairColor} />
                      )}
                      {rep.hairStyle === 'short' && (
                        <path d="M -10 -4 C -9 -12, 9 -12, 10 -4 C 5 -7, -5 -7, -10 -4 Z" fill={rep.hairColor} />
                      )}
                      {rep.hairStyle === 'bob' && (
                        <path d="M -11 3 C -11 -13, 11 -13, 11 3 L 8 3 C 8 -6, -8 -6, -8 3 Z" fill={rep.hairColor} />
                      )}
                      {rep.hairStyle === 'part' && (
                        <path d="M -10 -3 C -10 -12, 10 -12, 10 -3 C 3 -8, -4 -5, -10 -3 Z" fill={rep.hairColor} />
                      )}

                      {/* Eyes & Expression */}
                      {rep.state === 'COFFEE_BREAK' ? (
                        <g stroke="#1E293B" strokeWidth="1.2" fill="none" strokeLinecap="round">
                          <path d="M -5 -1 Q -3.5 0.5 -2 -1" />
                          <path d="M 2 -1 Q 3.5 0.5 5 -1" />
                        </g>
                      ) : (
                        <>
                          <circle cx="-3.6" cy="-1" r="1.2" fill="#0F172A" />
                          <circle cx="3.6" cy="-1" r="1.2" fill="#0F172A" />
                        </>
                      )}

                      {/* Mouth */}
                      {rep.state === 'CELEBRATING' ? (
                        <path d="M -3.5 3 Q 0 7 3.5 3 Z" fill="#0F172A" />
                      ) : rep.state === 'HANDED_BACK' ? (
                        <path d="M -3 5 Q 0 2.5 3 5" fill="none" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
                      ) : onCall ? (
                        <ellipse
                          cx="0"
                          cy="4"
                          rx="2.3"
                          ry={1.2 + Math.abs(Math.sin(world.tick * 0.5 + idx)) * 1.1}
                          fill="#0F172A"
                        />
                      ) : (
                        <path d="M -2.5 3.8 Q 0 5.5 2.5 3.8" fill="none" stroke="#0F172A" strokeWidth="1.1" strokeLinecap="round" />
                      )}

                      {/* Call Center Headset + Mic Boom */}
                      <path
                        d="M -11 -1 A 11 11 0 0 1 11 -1"
                        fill="none"
                        stroke="#0F172A"
                        strokeWidth="1.8"
                      />
                      <rect x="-12.5" y="-3.5" width="3" height="6" rx="1.2" fill="#0F172A" />
                      <rect x="9.5" y="-3.5" width="3" height="6" rx="1.2" fill="#0F172A" />
                      <path d="M 10 1 Q 7 5 3 4.5" fill="none" stroke="#0F172A" strokeWidth="1.1" />

                      {/* Live Talking Voice Waves */}
                      {onCall && (
                        <g stroke={monitorColor} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.85">
                          <path d="M 15 -3 Q 18 0 15 3" />
                          <path d="M 18 -6 Q 22 0 18 6" opacity={Math.sin(world.tick * 0.4 + idx) > 0 ? 0.9 : 0.25} />
                        </g>
                      )}

                      {/* ICONIC SIMS FLOATING MOOD DIAMOND (PLUMBOB) */}
                      <g transform={`translate(0, ${-24 + bobY})`}>
                        <polygon
                          points="0,-9 5.5,0 0,9 -5.5,0"
                          fill={plumbob.color}
                          stroke="#FFFFFF"
                          strokeWidth="1.2"
                        />
                        <polygon
                          points="0,-9 2.5,0 0,9"
                          fill="#FFFFFF"
                          fillOpacity="0.28"
                        />
                      </g>
                    </g>

                    {/* Active Call Progress Strip along desk edge */}
                    {onCall && (
                      <g>
                        <rect x="10" y="79" width="132" height="3.5" rx="1.5" fill="#E2E8F0" />
                        <rect
                          x="10"
                          y="79"
                          width={Math.max(4, (132 * callPct) / 100)}
                          height="3.5"
                          rx="1.5"
                          fill={monitorColor}
                        />
                      </g>
                    )}

                    {/* Nameplate & Live Deal Count */}
                    <text
                      x="10"
                      y="95"
                      fontSize="10"
                      fontWeight="700"
                      fill="#0F172A"
                      fontFamily="Plus Jakarta Sans"
                    >
                      {rep.firstName}
                    </text>
                    <text
                      x="142"
                      y="95"
                      textAnchor="end"
                      fontSize="9"
                      fontWeight="600"
                      fill="#047857"
                      fontFamily="IBM Plex Mono"
                    >
                      ${rep.revenueWonUsd.toLocaleString()}
                    </text>

                    {/* Mini Sims Energy (left) & Morale (right) Micro-Bars */}
                    <rect x="10" y="101" width="58" height="4" rx="2" fill="#E2E8F0" />
                    <rect
                      x="10"
                      y="101"
                      width={(58 * rep.energy) / 100}
                      height="4"
                      rx="2"
                      fill={rep.energy < 40 ? '#DC2626' : '#0284C7'}
                    />
                    <rect x="84" y="101" width="58" height="4" rx="2" fill="#E2E8F0" />
                    <rect
                      x="84"
                      y="101"
                      width={(58 * rep.morale) / 100}
                      height="4"
                      rx="2"
                      fill={rep.morale < 45 ? '#D97706' : '#059669'}
                    />

                    {/* AI Coach Indicator */}
                    {rep.aiCoachCharges > 0 && (
                      <text
                        x="142"
                        y="14"
                        textAnchor="end"
                        fontSize="8.5"
                        fontWeight="700"
                        fill="#7C3AED"
                        fontFamily="IBM Plex Mono"
                      >
                        AI×{rep.aiCoachCharges}
                      </text>
                    )}

                    {/* Compact Speech Caption Bar */}
                    <text
                      x="10"
                      y="14"
                      fontSize="8.5"
                      fontWeight="600"
                      fill={
                        rep.state === 'CELEBRATING'
                          ? '#047857'
                          : rep.state === 'HANDED_BACK'
                          ? '#B45309'
                          : rep.state === 'COFFEE_BREAK'
                          ? '#0369A1'
                          : '#475569'
                      }
                      fontFamily="Plus Jakarta Sans"
                    >
                      {rep.speechText.length > 24
                        ? `${rep.speechText.slice(0, 23)}…`
                        : rep.speechText}
                    </text>
                  </g>
                );
              })}

              {/* 2 AI VOICE CONCIERGE PODS */}
              {world.pods.map((pod, idx) => {
                const waveHeight = (bar: number) =>
                  pod.busy
                    ? 6 + Math.abs(Math.sin(world.tick * 0.35 + bar * 0.9 + idx)) * 16
                    : 4;
                return (
                  <g key={pod.id} transform={`translate(${pod.cx - 114}, ${pod.cy - 44})`}>
                    <rect
                      width="228"
                      height="88"
                      rx="10"
                      fill="#FFFFFF"
                      stroke={pod.busy ? '#0284C7' : '#BAE6FD'}
                      strokeWidth={pod.busy ? '1.8' : '1.2'}
                    />
                    {/* AI Console Icon */}
                    <rect x="12" y="14" width="38" height="38" rx="8" fill="#E0F2FE" />
                    {/* Animated Live Voice Waveform Bars */}
                    {[0, 1, 2, 3, 4].map((b) => {
                      const h = waveHeight(b);
                      return (
                        <rect
                          key={b}
                          x={18 + b * 5.8}
                          y={33 - h / 2}
                          width="3.2"
                          height={h}
                          rx="1.5"
                          fill={pod.busy ? '#0284C7' : '#94A3B8'}
                        />
                      );
                    })}
                    <text
                      x="60"
                      y="27"
                      fontSize="10.5"
                      fontWeight="700"
                      fill="#0F172A"
                      fontFamily="Bricolage Grotesque"
                    >
                      {pod.label}
                    </text>
                    <text
                      x="60"
                      y="43"
                      fontSize="9.5"
                      fill={pod.busy ? '#0369A1' : '#64748B'}
                      fontFamily="Plus Jakarta Sans"
                    >
                      {pod.statusText.length > 31
                        ? `${pod.statusText.slice(0, 30)}…`
                        : pod.statusText}
                    </text>
                    <text
                      x="12"
                      y="73"
                      fontSize="9.5"
                      fontWeight="600"
                      fill="#0369A1"
                      fontFamily="IBM Plex Mono"
                    >
                      {pod.callsProcessed} calls handled
                    </text>
                    <text
                      x="216"
                      y="73"
                      textAnchor="end"
                      fontSize="9"
                      fill="#64748B"
                      fontFamily="IBM Plex Mono"
                    >
                      {pod.busy ? 'ACTIVE' : 'STANDBY'}
                    </text>
                  </g>
                );
              })}

              {/* RIGHT OUTCOME VAULTS */}
              <g transform="translate(766, 44)">
                <rect width="138" height="90" rx="10" fill="#ECFDF5" stroke="#059669" strokeWidth="1.6" />
                <text x="12" y="24" fontSize="11" fontWeight="700" fill="#065F46" fontFamily="Bricolage Grotesque">
                  Closed-Won ($)
                </text>
                <text x="12" y="48" fontSize="14" fontWeight="700" fill="#047857" fontFamily="IBM Plex Mono">
                  ${world.tallies.closedRevenueUsd.toLocaleString()}
                </text>
                <text x="12" y="68" fontSize="9.5" fill="#047857" fontFamily="IBM Plex Mono">
                  {world.tallies.humanWonCount} Rep · {world.tallies.aiWonCount} AI
                </text>
                <text x="12" y="81" fontSize="8.5" fill="#065F46" fontFamily="Plus Jakarta Sans">
                  +${world.tallies.warmTransferRevenueUsd.toLocaleString()} transfers
                </text>
              </g>

              <g transform="translate(766, 186)">
                <rect width="138" height="78" rx="10" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.5" />
                <text x="12" y="24" fontSize="11" fontWeight="700" fill="#92400E" fontFamily="Bricolage Grotesque">
                  Returned Deals
                </text>
                <text x="12" y="46" fontSize="13" fontWeight="700" fill="#B45309" fontFamily="IBM Plex Mono">
                  {world.tallies.returnedToQueueCount}
                </text>
                <text x="12" y="64" fontSize="9" fill="#92400E" fontFamily="Plus Jakarta Sans">
                  Hand-backs / cherry-pick
                </text>
              </g>

              <g transform="translate(766, 340)">
                <rect width="138" height="78" rx="10" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
                <text x="12" y="24" fontSize="11" fontWeight="700" fill="#334155" fontFamily="Bricolage Grotesque">
                  Closed Lost
                </text>
                <text x="12" y="46" fontSize="13" fontWeight="700" fill="#475569" fontFamily="IBM Plex Mono">
                  {world.tallies.optOutCount}
                </text>
                <text x="12" y="64" fontSize="9" fill="#64748B" fontFamily="Plus Jakarta Sans">
                  6-mo opt-out / filtered
                </text>
              </g>

              {/* ANIMATED FLYING CALL PACKETS */}
              {world.packets.map((pkt) => {
                const pt = pointAlongPath(pkt.points, pkt.progress);
                const color =
                  pkt.kind === 'INBOUND_HOT'
                    ? '#DC2626'
                    : pkt.kind === 'INBOUND_COLD'
                    ? '#0284C7'
                    : pkt.kind === 'WARM_TRANSFER' || pkt.kind === 'OUT_WIN'
                    ? '#059669'
                    : pkt.kind === 'OUT_HANDBACK'
                    ? '#D97706'
                    : '#64748B';
                const label =
                  pkt.kind === 'INBOUND_HOT'
                    ? 'H'
                    : pkt.kind === 'INBOUND_COLD'
                    ? 'C'
                    : pkt.kind === 'WARM_TRANSFER'
                    ? 'T'
                    : pkt.kind === 'OUT_WIN'
                    ? '$'
                    : pkt.kind === 'OUT_HANDBACK'
                    ? '↩'
                    : '×';
                return (
                  <g key={pkt.id} transform={`translate(${pt.x}, ${pt.y})`}>
                    <circle r="9.5" fill={color} stroke="#FFFFFF" strokeWidth="2" />
                    <text
                      y="3.3"
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="700"
                      fill="#FFFFFF"
                      fontFamily="IBM Plex Mono"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* FLOATING SIMS REACTION TOASTS (+$520, AI Coach, Coffee Break) */}
              {world.pops.map((pop) => {
                const opacity = Math.max(0, 1 - pop.ageSec / 1.9);
                const fill =
                  pop.tone === 'emerald'
                    ? '#047857'
                    : pop.tone === 'amber'
                    ? '#B45309'
                    : pop.tone === 'violet'
                    ? '#6D28D9'
                    : '#0369A1';
                return (
                  <g
                    key={pop.id}
                    transform={`translate(${pop.x}, ${pop.y})`}
                    opacity={opacity}
                    style={{ pointerEvents: 'none' }}
                  >
                    <rect
                      x="-38"
                      y="-11"
                      width="76"
                      height="18"
                      rx="6"
                      fill="#FFFFFF"
                      stroke={fill}
                      strokeWidth="1.2"
                    />
                    <text
                      y="1.5"
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="700"
                      fill={fill}
                      fontFamily="IBM Plex Mono"
                    >
                      {pop.text}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend & Strategy Note Footer */}
          <div className="px-5 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-start sm:items-center gap-2">
              {strategy === 'unpaced_ai' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <span>{profile.executiveSummary}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0 font-mono text-[11px] text-slate-500">
              <span>Mood Diamond: Emerald = Zone</span>
              <span aria-hidden="true">·</span>
              <span>Amber = Rushing</span>
              <span aria-hidden="true">·</span>
              <span>Violet = AI Coached</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (4 Cols): Interactive Sims Rep Inspector + Manager Actions + Live Feed */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
          {/* Quick Rep Selector Bar */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                Rep Manager Desk
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {selectedPlumbob.label}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {world.reps.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRepId(r.id)}
                  className={`px-1.5 py-1 text-[11px] font-medium rounded-md transition-colors truncate cursor-pointer ${
                    r.id === selectedRep.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.firstName}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Sim Rep Profile & Needs */}
          <div className="p-4 border-b border-slate-200 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{selectedRep.name}</div>
                <div className="text-xs text-slate-500">
                  {selectedRep.role} ·{' '}
                  <span className="font-medium text-slate-700">
                    {routingConfig.skillTags[REP_SKILL_MAP[selectedRep.id] ?? 'high_velocity_dialing'].label}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono tabular-nums font-semibold text-emerald-700">
                  ${selectedRep.revenueWonUsd.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-500">
                  {selectedRep.dealsWon} won · {selectedRep.handBacks} back
                </div>
              </div>
            </div>

            {/* Live Speech Thought Line */}
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center gap-2">
              <Headphones className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">&ldquo;{selectedRep.speechText}&rdquo;</span>
            </div>

            {/* Sims-Style Need Meters: Energy, Morale, Focus */}
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Energy / Stamina</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {Math.round(selectedRep.energy)}% · {meterStatusText(selectedRep.energy)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${meterBarColor(selectedRep.energy)}`}
                    style={{ width: `${selectedRep.energy}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Morale / Persistence</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {Math.round(selectedRep.morale)}% · {meterStatusText(selectedRep.morale)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${meterBarColor(selectedRep.morale)}`}
                    style={{ width: `${selectedRep.morale}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Close Focus</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {Math.round(selectedRep.focus)}% ·{' '}
                    {selectedRep.aiCoachCharges > 0
                      ? `AI Coach (${selectedRep.aiCoachCharges} left)`
                      : meterStatusText(selectedRep.focus)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 transition-all duration-150"
                    style={{ width: `${selectedRep.focus}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 4 Direct Interactive Manager Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => dispatchCall('HOT', selectedRep.id)}
                disabled={selectedRep.state === 'COFFEE_BREAK'}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-45 border border-red-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                Route Hot Lead
              </button>
              <button
                type="button"
                onClick={() => handleAttachAiCoach(selectedRep.id)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Live AI Coach
              </button>
              <button
                type="button"
                onClick={() => handleSendCoffeeBreak(selectedRep.id)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5" />
                Coffee Break
              </button>
              <button
                type="button"
                onClick={() => handlePepTalk(selectedRep.id)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5" />
                Pep Talk
              </button>
            </div>
          </div>

          {/* Live Floor Session Summary + Recent Activity Feed */}
          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-200 bg-slate-50/50 text-xs">
            <div className="px-4 py-2.5">
              <div className="text-[11px] text-slate-500">Session Revenue</div>
              <div className="font-mono tabular-nums font-semibold text-emerald-700 flex items-center gap-0.5 mt-0.5">
                <DollarSign className="w-3.5 h-3.5" />
                {world.tallies.closedRevenueUsd.toLocaleString()}
              </div>
            </div>
            <div className="px-4 py-2.5">
              <div className="text-[11px] text-slate-500">AI Cold Offloaded</div>
              <div className="font-mono tabular-nums font-semibold text-sky-700 mt-0.5">
                {world.tallies.aiHandledColdCount} calls · $
                {(world.tallies.aiHandledColdCount * 1.79).toFixed(0)} saved
              </div>
            </div>
          </div>

          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[210px]">
            {world.recentCalls.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Reps are picking up live calls on the floor...
              </div>
            ) : (
              world.recentCalls.map((call) => (
                <div key={call.id} className="px-4 py-2.5 text-xs space-y-0.5 hover:bg-slate-50/70">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 inline-flex items-center gap-1">
                        {call.handler === 'AI' ? (
                          <Bot className="w-3.5 h-3.5 text-sky-600" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-slate-700" />
                        )}
                        {call.repName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span
                        className={
                          call.leadType === 'HOT'
                            ? 'text-red-700 font-medium'
                            : 'text-sky-700 font-medium'
                        }
                      >
                        {call.leadType === 'HOT' ? 'Hot' : 'Cold'}
                      </span>
                    </div>

                    {call.outcome === 'CLOSED_WON' && (
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> +${call.dealValueUsd}
                      </span>
                    )}
                    {call.outcome === 'WARM_TRANSFER_WON' && (
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700">
                        <ArrowRight className="w-3.5 h-3.5" /> +${call.dealValueUsd}
                      </span>
                    )}
                    {call.outcome === 'RETURNED_QUEUE' && (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" /> Hand-Back
                      </span>
                    )}
                    {call.outcome === 'OPT_OUT' && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <XCircle className="w-3.5 h-3.5" /> Lost
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">{call.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
