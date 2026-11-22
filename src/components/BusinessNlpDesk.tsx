import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Flame,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  ShieldAlert,
  Snowflake,
  Sparkles,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BusinessStrategy } from '../data/businessModel';
import { PRESET_NLP_SCENARIOS, PresetLeadScenario } from '../data/researchModel';

interface BusinessNlpDeskProps {
  strategy: BusinessStrategy;
  avgDealValueUsd: number;
}

interface TranscriptLine {
  id: string;
  speaker: 'agent' | 'customer';
  label: string;
  text: string;
  time: string;
  intentScore?: number;
}

interface NlpEngineResponse {
  agentResponse: string;
  intentScore: number;
  leadTemp: string;
  sentiment: string;
  detectedSignals: string[];
  objectionCategory: string;
  routingDecision: string;
  revOpsCoaching: string;
  expectedValueUsd: number;
  reallocationTemptationRisk: string;
}

const ROUTING_LABELS: Record<
  string,
  { headline: string; style: string; icon: 'escalate' | 'guardrail' | 'won' | 'dnc' | 'continue' }
> = {
  CONTINUE_AI: {
    headline: 'Keep With AI Voice Concierge ($0.06/call Qualification)',
    style: 'bg-sky-50 border-sky-200 text-sky-900',
    icon: 'continue',
  },
  ESCALATE_HOT_TO_HUMAN: {
    headline: 'High Buying Intent Detected — Warm Transfer to Sales Closer Now',
    style: 'bg-emerald-50 border-emerald-300 text-emerald-950',
    icon: 'escalate',
  },
  KEEP_HUMAN_PERSIST: {
    headline: 'Stay on Call — High Revenue Potential Worth Closing Now',
    style: 'bg-slate-50 border-slate-300 text-slate-900',
    icon: 'continue',
  },
  GUARDRAIL_BLOCK_REALLOCATION: {
    headline: 'Revenue Protection Alert — Hold Deal & Handle Objection (Do Not Hand Back)',
    style: 'bg-amber-50 border-amber-300 text-amber-950',
    icon: 'guardrail',
  },
  CLOSE_WON: {
    headline: 'Checkout Confirmed — Revenue Booked',
    style: 'bg-emerald-50 border-emerald-300 text-emerald-950',
    icon: 'won',
  },
  MARK_DNC_6MO: {
    headline: 'Customer Opted Out — Apply 6-Month Do-Not-Call Rule',
    style: 'bg-red-50 border-red-200 text-red-950',
    icon: 'dnc',
  },
};

export const BusinessNlpDesk: React.FC<BusinessNlpDeskProps> = ({ strategy, avgDealValueUsd }) => {
  const [scenario, setScenario] = useState<PresetLeadScenario>(PRESET_NLP_SCENARIOS[0]);
  const [mode, setMode] = useState<'ai_voice' | 'human_copilot'>(PRESET_NLP_SCENARIOS[0].mode);
  const [voiceOn, setVoiceOn] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const [transcript, setTranscript] = useState<TranscriptLine[]>([
    {
      id: 'open-0',
      speaker: 'agent',
      label: PRESET_NLP_SCENARIOS[0].mode === 'ai_voice' ? 'AI Voice Concierge' : 'Sales Closer',
      text: PRESET_NLP_SCENARIOS[0].openingAgentLine,
      time: '00:04',
    },
  ]);

  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isAutoReplying, setIsAutoReplying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NlpEngineResponse | null>(null);
  const [suggestedTalkTrack, setSuggestedTalkTrack] = useState<string | null>(null);

  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const recRef = useRef<unknown>(null);

  const effectivePremium = Math.round(
    (scenario.leadProfile.annualPremiumUsd / 680) * avgDealValueUsd
  );

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [transcript, suggestedTalkTrack]);

  const speak = (text: string) => {
    if (!voiceOn || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.03;
    window.speechSynthesis.speak(u);
  };

  const selectScenario = (sc: PresetLeadScenario) => {
    setScenario(sc);
    setMode(sc.mode);
    setAnalysis(null);
    setSuggestedTalkTrack(null);
    setErrorMsg(null);
    setInput('');
    setTranscript([
      {
        id: `open-${sc.id}`,
        speaker: 'agent',
        label: sc.mode === 'ai_voice' ? 'AI Voice Concierge' : 'Sales Closer',
        text: sc.openingAgentLine,
        time: '00:04',
      },
    ]);
  };

  const formatTimer = (n: number) => {
    const secs = 4 + n * 14;
    return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  };

  const sendUtterance = async (text: string) => {
    const clean = text.trim();
    if (!clean || isSending) return;

    setErrorMsg(null);
    setIsSending(true);
    setInput('');
    setSuggestedTalkTrack(null);

    const customerLine: TranscriptLine = {
      id: `c-${Date.now()}`,
      speaker: 'customer',
      label: scenario.leadProfile.name,
      text: clean,
      time: formatTimer(transcript.length),
    };
    const nextList = [...transcript, customerLine];
    setTranscript(nextList);

    try {
      const resp = await fetch('/api/nlp/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          leadProfile: { ...scenario.leadProfile, annualPremiumUsd: effectivePremium },
          callPosition: scenario.callPosition,
          rhythmPhi: strategy === 'unpaced_ai' ? 0.22 : 0.10,
          history: transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
          customerMessage: clean,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Real-time NLP service error.');

      const result = data as NlpEngineResponse;
      setAnalysis(result);

      if (mode === 'ai_voice') {
        setTranscript((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            speaker: 'agent',
            label:
              result.routingDecision === 'ESCALATE_HOT_TO_HUMAN'
                ? 'AI Voice Concierge (Warm Transferring)'
                : 'AI Voice Concierge',
            text: result.agentResponse,
            time: formatTimer(nextList.length),
            intentScore: result.intentScore,
          },
        ]);
        speak(result.agentResponse);
      } else {
        setSuggestedTalkTrack(result.agentResponse);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to connect to real-time NLP service.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeliverCoachingLine = () => {
    if (!suggestedTalkTrack) return;
    const text = suggestedTalkTrack;
    setTranscript((prev) => [
      ...prev,
      {
        id: `h-${Date.now()}`,
        speaker: 'agent',
        label: 'Sales Closer (Live Coached)',
        text,
        time: formatTimer(prev.length),
        intentScore: analysis?.intentScore,
      },
    ]);
    speak(text);
    setSuggestedTalkTrack(null);
  };

  const handleAutoCustomer = async () => {
    if (isAutoReplying || isSending) return;
    setErrorMsg(null);
    setIsAutoReplying(true);
    try {
      const resp = await fetch('/api/nlp/simulate-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          leadProfile: { ...scenario.leadProfile, annualPremiumUsd: effectivePremium },
          history: transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Could not generate simulated customer response.');
      if (data.customerMessage) {
        await sendUtterance(data.customerMessage);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Simulation failed.');
    } finally {
      setIsAutoReplying(false);
    }
  };

  const toggleMic = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
    };
    const Rec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Rec) {
      setErrorMsg('Browser speech capture is unavailable here—type or click a quick customer prompt below.');
      return;
    }
    if (isListening && recRef.current) {
      (recRef.current as { stop: () => void }).stop();
      setIsListening(false);
      return;
    }
    const r = new Rec();
    r.lang = 'en-US';
    r.interimResults = false;
    r.onresult = (ev) => {
      const spoken = ev.results?.[0]?.[0]?.transcript;
      if (spoken) setInput(spoken);
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    recRef.current = r;
    setIsListening(true);
    r.start();
  };

  const intentScore = analysis?.intentScore ?? (scenario.leadProfile.initialTemp === 'HOT' ? 74 : 26);
  const leadTemp = analysis?.leadTemp ?? scenario.leadProfile.initialTemp;
  const routeBadge =
    ROUTING_LABELS[analysis?.routingDecision ?? (mode === 'ai_voice' ? 'CONTINUE_AI' : 'KEEP_HUMAN_PERSIST')] ??
    ROUTING_LABELS.CONTINUE_AI;

  return (
    <section id="live-nlp" className="scroll-mt-20 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Real-Time Customer NLP Call Simulator
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Test live natural-language conversations: watch AI qualify cold leads and warm-transfer buying spikes, or coach human closers through tough objections to protect deal revenue.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
          {[
            { sc: PRESET_NLP_SCENARIOS[0], label: 'Hot Deal · Checkout Hesitation' },
            { sc: PRESET_NLP_SCENARIOS[1], label: 'Cold Inquiry → Warm Transfer' },
            { sc: PRESET_NLP_SCENARIOS[2], label: 'High-ACV · Complex Objection' },
          ].map((item) => (
            <button
              key={item.sc.id}
              type="button"
              onClick={() => selectScenario(item.sc)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scenario.id === item.sc.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Live Call Window */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              {mode === 'ai_voice' ? (
                <Bot className="w-4 h-4 text-sky-600" />
              ) : (
                <User className="w-4 h-4 text-slate-800" />
              )}
              <span className="font-semibold text-slate-900">{scenario.leadProfile.name}</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-700">
                ${effectivePremium} Deal
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">
                {mode === 'ai_voice' ? 'AI Voice Concierge' : 'Sales Closer + Live Coaching'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoCustomer}
                disabled={isAutoReplying || isSending}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-md cursor-pointer whitespace-nowrap"
              >
                {isAutoReplying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Simulate Customer
              </button>
              <button
                type="button"
                onClick={() => setVoiceOn((v) => !v)}
                title={voiceOn ? 'Mute speech' : 'Enable speech'}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                {voiceOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => selectScenario(scenario)}
                title="Reset conversation"
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="p-5 space-y-3.5 min-h-[300px] max-h-[380px] overflow-y-auto bg-[#FAFBFD]">
            {transcript.map((line) => {
              const isCust = line.speaker === 'customer';
              return (
                <div key={line.id} className={`flex flex-col ${isCust ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                    <span className="font-medium text-slate-700">{line.label}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{line.time}</span>
                    {typeof line.intentScore === 'number' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">Intent {line.intentScore}/100</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`max-w-[88%] rounded-xl px-4 py-2.5 text-sm leading-relaxed border ${
                      isCust
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-800 border-slate-200'
                    }`}
                  >
                    {line.text}
                  </div>
                </div>
              );
            })}

            {suggestedTalkTrack && mode === 'human_copilot' && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/75 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-950">
                    Live Coaching Rebuttal (Recommended for Sales Rep)
                  </span>
                  <button
                    type="button"
                    onClick={handleDeliverCoachingLine}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    Deliver Rebuttal
                  </button>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">&ldquo;{suggestedTalkTrack}&rdquo;</p>
              </div>
            )}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                <span>Analyzing customer intent, objection signals &amp; routing action...</span>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {errorMsg}
              </div>
            )}
            <div ref={scrollAnchorRef} />
          </div>

          {/* Quick Prompts + Freeform Input */}
          <div className="px-5 py-3 border-t border-slate-200 bg-white space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {scenario.quickCustomerPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isSending}
                  onClick={() => sendUtterance(p)}
                  className="text-left text-xs px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  &ldquo;{p.length > 62 ? `${p.slice(0, 62)}…` : p}&rdquo;
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendUtterance(input);
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleMic}
                title={isListening ? 'Stop voice input' : 'Speak as customer'}
                className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a customer question or objection..."
                disabled={isSending}
                className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right: Real-Time Commercial Intelligence */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Commercial Routing Action */}
          <div className={`rounded-xl border p-4 ${routeBadge.style}`}>
            <div className="flex items-start gap-3">
              {routeBadge.icon === 'escalate' && <ArrowUpRight className="w-5 h-5 shrink-0 mt-0.5" />}
              {routeBadge.icon === 'guardrail' && <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />}
              {routeBadge.icon === 'won' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
              {routeBadge.icon === 'dnc' && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
              {routeBadge.icon === 'continue' && <Bot className="w-5 h-5 shrink-0 mt-0.5" />}
              <div>
                <div className="text-[11px] font-medium opacity-75">Live Routing &amp; Revenue Action</div>
                <div className="text-sm font-semibold mt-0.5">{routeBadge.headline}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Real-Time Deal Intelligence</h3>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  leadTemp === 'HOT'
                    ? 'text-red-700'
                    : leadTemp === 'WARM'
                    ? 'text-amber-700'
                    : 'text-sky-700'
                }`}
              >
                {leadTemp === 'HOT' ? (
                  <Flame className="w-3.5 h-3.5" />
                ) : (
                  <Snowflake className="w-3.5 h-3.5" />
                )}
                {leadTemp} PROSPECT
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-slate-600">Live Buying Intent</span>
                <span className="text-xl font-mono tabular-nums font-semibold text-slate-900">
                  {intentScore}
                  <span className="text-xs font-normal text-slate-400"> / 100</span>
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    intentScore >= 72
                      ? 'bg-emerald-600'
                      : intentScore >= 45
                      ? 'bg-amber-500'
                      : 'bg-sky-600'
                  }`}
                  style={{ width: `${Math.max(4, Math.min(100, intentScore))}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <div className="text-[11px] text-slate-500">Expected Deal Value</div>
                <div className="mt-0.5 text-base font-mono tabular-nums font-semibold text-emerald-700">
                  ${(analysis?.expectedValueUsd ?? Math.round(effectivePremium * 0.12)).toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Primary Objection</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  {analysis?.objectionCategory ?? 'Opening Qualification'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Customer Sentiment</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  {analysis?.sentiment ?? 'NEUTRAL'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Rep Hand-Back Risk</div>
                <div
                  className={`mt-0.5 text-sm font-semibold ${
                    (analysis?.reallocationTemptationRisk ?? (strategy === 'unpaced_ai' ? 'HIGH' : 'MODERATE')) ===
                    'HIGH'
                      ? 'text-red-700'
                      : 'text-slate-900'
                  }`}
                >
                  {analysis?.reallocationTemptationRisk ??
                    (strategy === 'unpaced_ai' ? 'HIGH' : 'CONTROLLED')}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <div className="text-xs font-semibold text-slate-900">Detected Buying &amp; Objection Signals</div>
              {analysis?.detectedSignals?.length ? (
                <ul className="space-y-1 text-xs text-slate-600">
                  {analysis.detectedSignals.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-slate-400">0{idx + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  Click any quick customer prompt or &ldquo;Simulate Customer&rdquo; to inspect live NLP extraction.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1">
              <div className="text-xs font-semibold text-slate-900">RevOps Coaching Guidance</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {analysis?.revOpsCoaching ??
                  (mode === 'human_copilot'
                    ? 'High-intent prospects often stall over billing or coverage clarity. Coaching the rep through a 45-second rebuttal protects deal value instead of letting a viable prospect slip back into the queue.'
                    : 'AI Voice Concierge screens early inquiries for $0.06/call and escalates immediately to a live sales closer the moment buying intent crosses 72/100.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
