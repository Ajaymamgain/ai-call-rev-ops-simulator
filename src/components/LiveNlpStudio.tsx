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
import { PRESET_NLP_SCENARIOS, PresetLeadScenario } from '../data/researchModel';

interface TranscriptTurn {
  id: string;
  speaker: 'agent' | 'customer';
  speakerLabel: string;
  text: string;
  timestamp: string;
  intentSnapshot?: number;
}

interface NlpAnalysis {
  agentResponse: string;
  intentScore: number;
  leadTemp: 'HOT' | 'WARM' | 'COLD' | string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'HESITANT' | 'FRICTION' | string;
  detectedSignals: string[];
  objectionCategory: string;
  routingDecision:
    | 'CONTINUE_AI'
    | 'ESCALATE_HOT_TO_HUMAN'
    | 'KEEP_HUMAN_PERSIST'
    | 'GUARDRAIL_BLOCK_REALLOCATION'
    | 'CLOSE_WON'
    | 'MARK_DNC_6MO'
    | string;
  revOpsCoaching: string;
  expectedValueUsd: number;
  reallocationTemptationRisk: 'LOW' | 'MODERATE' | 'HIGH' | string;
}

const ROUTING_DECISION_META: Record<
  string,
  { title: string; toneClass: string; icon: 'escalate' | 'guardrail' | 'won' | 'dnc' | 'continue' }
> = {
  CONTINUE_AI: {
    title: 'Keep in AI Voice Stream (Near-Zero Marginal Cost)',
    toneClass: 'bg-sky-50 border-sky-200 text-sky-900',
    icon: 'continue',
  },
  ESCALATE_HOT_TO_HUMAN: {
    title: 'Warm Escalation Triggered — Route Now to Human Closer',
    toneClass: 'bg-emerald-50 border-emerald-300 text-emerald-950',
    icon: 'escalate',
  },
  KEEP_HUMAN_PERSIST: {
    title: 'Human Persistence Active — Stay Engaged on Call',
    toneClass: 'bg-slate-50 border-slate-300 text-slate-900',
    icon: 'continue',
  },
  GUARDRAIL_BLOCK_REALLOCATION: {
    title: 'RevOps Guardrail — Block Early-Shift Reallocation & Handle Objection',
    toneClass: 'bg-amber-50 border-amber-300 text-amber-950',
    icon: 'guardrail',
  },
  CLOSE_WON: {
    title: 'Policy Checkout Confirmed — Deal Closed Won',
    toneClass: 'bg-emerald-50 border-emerald-300 text-emerald-950',
    icon: 'won',
  },
  MARK_DNC_6MO: {
    title: 'Explicit Refusal Detected — Apply 6-Month Do-Not-Call Rule',
    toneClass: 'bg-red-50 border-red-200 text-red-950',
    icon: 'dnc',
  },
};

export const LiveNlpStudio: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<PresetLeadScenario>(PRESET_NLP_SCENARIOS[0]);
  const [mode, setMode] = useState<'ai_voice' | 'human_copilot'>(PRESET_NLP_SCENARIOS[0].mode);
  const [callPosition, setCallPosition] = useState<number>(PRESET_NLP_SCENARIOS[0].callPosition);
  const [rhythmPhi, setRhythmPhi] = useState<number>(0.22);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const [transcript, setTranscript] = useState<TranscriptTurn[]>([
    {
      id: 'init-0',
      speaker: 'agent',
      speakerLabel:
        PRESET_NLP_SCENARIOS[0].mode === 'ai_voice' ? 'AI Voice Agent' : 'Human Closer',
      text: PRESET_NLP_SCENARIOS[0].openingAgentLine,
      timestamp: '00:04',
    },
  ]);

  const [customerInput, setCustomerInput] = useState<string>('');
  const [isLoadingTurn, setIsLoadingTurn] = useState<boolean>(false);
  const [isSimulatingCustomer, setIsSimulatingCustomer] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NlpAnalysis | null>(null);
  const [intentHistory, setIntentHistory] = useState<number[]>([
    PRESET_NLP_SCENARIOS[0].leadProfile.initialTemp === 'HOT' ? 74 : 26,
  ]);
  const [pendingSuggestedLine, setPendingSuggestedLine] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, pendingSuggestedLine]);

  const speakText = (text: string) => {
    if (!voiceOutputEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.03;
    window.speechSynthesis.speak(utter);
  };

  const loadScenario = (scenario: PresetLeadScenario) => {
    setSelectedScenario(scenario);
    setMode(scenario.mode);
    setCallPosition(scenario.callPosition);
    setAnalysis(null);
    setPendingSuggestedLine(null);
    setErrorMessage(null);
    setCustomerInput('');
    setIntentHistory([scenario.leadProfile.initialTemp === 'HOT' ? 74 : 26]);
    setTranscript([
      {
        id: `init-${scenario.id}`,
        speaker: 'agent',
        speakerLabel: scenario.mode === 'ai_voice' ? 'AI Voice Agent' : 'Human Closer',
        text: scenario.openingAgentLine,
        timestamp: '00:04',
      },
    ]);
  };

  const formatElapsed = (turnCount: number) => {
    const secs = 4 + turnCount * 14;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const submitCustomerMessage = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || isLoadingTurn) return;

    setErrorMessage(null);
    setIsLoadingTurn(true);
    setCustomerInput('');
    setPendingSuggestedLine(null);

    const customerTurn: TranscriptTurn = {
      id: `cust-${Date.now()}`,
      speaker: 'customer',
      speakerLabel: selectedScenario.leadProfile.name,
      text: trimmed,
      timestamp: formatElapsed(transcript.length),
    };

    const updatedTranscript = [...transcript, customerTurn];
    setTranscript(updatedTranscript);

    try {
      const response = await fetch('/api/nlp/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          leadProfile: selectedScenario.leadProfile,
          callPosition,
          rhythmPhi,
          history: transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
          customerMessage: trimmed,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Real-time NLP engine returned an error.');
      }

      const nlpResult = data as NlpAnalysis;
      setAnalysis(nlpResult);
      setIntentHistory((prev) => [...prev, nlpResult.intentScore]);

      if (mode === 'ai_voice') {
        const aiTurn: TranscriptTurn = {
          id: `agent-${Date.now()}`,
          speaker: 'agent',
          speakerLabel:
            nlpResult.routingDecision === 'ESCALATE_HOT_TO_HUMAN'
              ? 'AI Voice Agent (Initiating Warm Transfer)'
              : 'AI Voice Agent',
          text: nlpResult.agentResponse,
          timestamp: formatElapsed(updatedTranscript.length),
          intentSnapshot: nlpResult.intentScore,
        };
        setTranscript((prev) => [...prev, aiTurn]);
        speakText(nlpResult.agentResponse);
      } else {
        // In Human + Co-Pilot mode, show the live recommended talk-track so the human rep can send it with 1 click
        setPendingSuggestedLine(nlpResult.agentResponse);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to reach NLP service.');
    } finally {
      setIsLoadingTurn(false);
    }
  };

  const handleDeliverHumanScript = () => {
    if (!pendingSuggestedLine) return;
    const textToDeliver = pendingSuggestedLine;
    setTranscript((prev) => [
      ...prev,
      {
        id: `human-${Date.now()}`,
        speaker: 'agent',
        speakerLabel: 'Human Closer (Co-Pilot Guided)',
        text: textToDeliver,
        timestamp: formatElapsed(prev.length),
        intentSnapshot: analysis?.intentScore,
      },
    ]);
    speakText(textToDeliver);
    setPendingSuggestedLine(null);
  };

  const handleSimulateCustomerTurn = async () => {
    if (isSimulatingCustomer || isLoadingTurn) return;
    setErrorMessage(null);
    setIsSimulatingCustomer(true);
    try {
      const response = await fetch('/api/nlp/simulate-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          leadProfile: selectedScenario.leadProfile,
          history: transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not simulate customer reply.');
      }
      if (data.customerMessage) {
        await submitCustomerMessage(data.customerMessage);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to simulate customer.');
    } finally {
      setIsSimulatingCustomer(false);
    }
  };

  const toggleVoiceCapture = () => {
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

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMessage('Browser speech recognition is unavailable here—type or click a quick customer prompt below.');
      return;
    }

    if (isListening && recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript;
      if (spoken) {
        setCustomerInput(spoken);
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    setIsListening(true);
    rec.start();
  };

  const currentIntent = analysis?.intentScore ?? intentHistory[intentHistory.length - 1];
  const currentTemp = analysis?.leadTemp ?? selectedScenario.leadProfile.initialTemp;
  const routingMeta =
    ROUTING_DECISION_META[analysis?.routingDecision ?? (mode === 'ai_voice' ? 'CONTINUE_AI' : 'KEEP_HUMAN_PERSIST')] ??
    ROUTING_DECISION_META.CONTINUE_AI;

  return (
    <div className="space-y-6">
      {/* Header & Scenario Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Real-Time Customer NLP Call Studio
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Interact live with an AI Voice Agent or Human RevOps Co-Pilot. Watch real-time natural language intent scoring, cold-to-hot warm escalation, and early-shift reallocation guardrails respond to every customer objection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            {PRESET_NLP_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => loadScenario(sc)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedScenario.id === sc.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Context Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">{selectedScenario.leadProfile.name}</span>
          <span aria-hidden="true">·</span>
          <span>{selectedScenario.leadProfile.product}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums font-medium text-slate-900">
            ${selectedScenario.leadProfile.annualPremiumUsd}/yr
          </span>
          <span aria-hidden="true">·</span>
          <span>{selectedScenario.leadProfile.dropStage}</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="nlp-pos" className="text-slate-600 whitespace-nowrap">
              Shift Call #:
            </label>
            <input
              id="nlp-pos"
              type="range"
              min={1}
              max={90}
              value={callPosition}
              onChange={(e) => setCallPosition(Number(e.target.value))}
              className="w-20"
            />
            <span className="font-mono tabular-nums font-semibold text-slate-900 w-7">
              #{callPosition}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setRhythmPhi(0.22)}
              className={`px-2 py-1 text-[11px] font-mono rounded transition-colors cursor-pointer whitespace-nowrap ${
                rhythmPhi === 0.22 ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600'
              }`}
            >
              φ=0.22 Front-Loaded
            </button>
            <button
              type="button"
              onClick={() => setRhythmPhi(0.10)}
              className={`px-2 py-1 text-[11px] font-mono rounded transition-colors cursor-pointer whitespace-nowrap ${
                rhythmPhi === 0.10 ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600'
              }`}
            >
              φ=0.10 Staggered
            </button>
          </div>

          <button
            type="button"
            onClick={() => setVoiceOutputEnabled((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            {voiceOutputEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {voiceOutputEnabled ? 'Voice On' : 'Voice Muted'}
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Call Transcript & Customer Input */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              {mode === 'ai_voice' ? (
                <Bot className="w-4 h-4 text-sky-600" />
              ) : (
                <User className="w-4 h-4 text-slate-800" />
              )}
              <span className="font-semibold text-slate-900">
                {mode === 'ai_voice'
                  ? 'Autonomous AI Voice Agent Stream'
                  : 'Human Closer + Real-Time NLP Co-Pilot'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSimulateCustomerTurn}
                disabled={isSimulatingCustomer || isLoadingTurn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                {isSimulatingCustomer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Simulate Customer Reply
              </button>
              <button
                type="button"
                onClick={() => loadScenario(selectedScenario)}
                title="Restart call"
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="p-5 space-y-4 min-h-[340px] max-h-[440px] overflow-y-auto bg-[#FAFBFD]">
            {transcript.map((turn) => {
              const isCustomer = turn.speaker === 'customer';
              return (
                <div
                  key={turn.id}
                  className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                    <span className="font-medium text-slate-700">{turn.speakerLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{turn.timestamp}</span>
                    {typeof turn.intentSnapshot === 'number' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-600">
                          Intent {turn.intentSnapshot}/100
                        </span>
                      </>
                    )}
                  </div>
                  <div
                    className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed border ${
                      isCustomer
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-800 border-slate-200'
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>
              );
            })}

            {/* Co-Pilot Suggested Talk-Track Box (Human Mode) */}
            {pendingSuggestedLine && mode === 'human_copilot' && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-950">
                    Recommended Human Talk-Track (Co-Pilot Objection Rebuttal)
                  </span>
                  <button
                    type="button"
                    onClick={handleDeliverHumanScript}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Deliver Talk-Track
                  </button>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">&ldquo;{pendingSuggestedLine}&rdquo;</p>
              </div>
            )}

            {isLoadingTurn && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                <span>Running real-time NLP intent extraction &amp; routing evaluation...</span>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                {errorMessage}
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Quick Realistic Customer Prompts */}
          <div className="px-5 py-3 border-t border-slate-200 bg-white space-y-2.5">
            <div className="text-[11px] font-medium text-slate-500">
              One-click customer utterances (speak as {selectedScenario.leadProfile.name}):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedScenario.quickCustomerPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoadingTurn}
                  onClick={() => submitCustomerMessage(prompt)}
                  className="text-left text-xs px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  &ldquo;{prompt.length > 68 ? `${prompt.slice(0, 68)}…` : prompt}&rdquo;
                </button>
              ))}
            </div>

            {/* Freeform Input + Mic */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitCustomerMessage(customerInput);
              }}
              className="flex items-center gap-2 pt-1"
            >
              <button
                type="button"
                onClick={toggleVoiceCapture}
                title={isListening ? 'Stop microphone' : 'Speak as customer'}
                className={`p-2.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={customerInput}
                onChange={(e) => setCustomerInput(e.target.value)}
                placeholder="Type what the customer says on the call..."
                disabled={isLoadingTurn}
                className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900"
              />
              <button
                type="submit"
                disabled={isLoadingTurn || !customerInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right: Real-Time NLP Telemetry & RevOps Routing Engine */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active Routing Decision Card */}
          <div className={`rounded-xl border p-4 ${routingMeta.toneClass}`}>
            <div className="flex items-start gap-3">
              {routingMeta.icon === 'escalate' && <ArrowUpRight className="w-5 h-5 shrink-0 mt-0.5" />}
              {routingMeta.icon === 'guardrail' && <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />}
              {routingMeta.icon === 'won' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
              {routingMeta.icon === 'dnc' && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
              {routingMeta.icon === 'continue' && <Bot className="w-5 h-5 shrink-0 mt-0.5" />}
              <div>
                <div className="text-[11px] font-medium opacity-75">Real-Time Routing Action</div>
                <div className="text-sm font-semibold mt-0.5">{routingMeta.title}</div>
              </div>
            </div>
          </div>

          {/* Structured NLP Scoring Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900">Live NLP Classification</h2>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  currentTemp === 'HOT'
                    ? 'text-red-700'
                    : currentTemp === 'WARM'
                    ? 'text-amber-700'
                    : 'text-sky-700'
                }`}
              >
                {currentTemp === 'HOT' ? (
                  <Flame className="w-3.5 h-3.5" />
                ) : (
                  <Snowflake className="w-3.5 h-3.5" />
                )}
                {currentTemp} LEAD
              </span>
            </div>

            {/* Intent Score Bar */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-600 font-medium">Real-Time Purchase Intent</span>
                <span className="text-2xl font-mono tabular-nums font-semibold text-slate-900">
                  {currentIntent}
                  <span className="text-xs font-normal text-slate-400"> / 100</span>
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    currentIntent >= 70
                      ? 'bg-emerald-600'
                      : currentIntent >= 45
                      ? 'bg-amber-500'
                      : 'bg-sky-600'
                  }`}
                  style={{ width: `${Math.max(4, Math.min(100, currentIntent))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>0 · Cold</span>
                <span>72 · Warm Transfer Threshold</span>
                <span>100 · Close</span>
              </div>
            </div>

            {/* Key NLP Dimensions */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <div className="text-[11px] text-slate-500">Customer Sentiment</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  {analysis?.sentiment ?? 'NEUTRAL'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Objection Category</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  {analysis?.objectionCategory ?? 'Opening Discovery'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Expected Call Value</div>
                <div className="mt-0.5 text-sm font-mono tabular-nums font-semibold text-emerald-700">
                  ${(analysis?.expectedValueUsd ?? Math.round(selectedScenario.leadProfile.annualPremiumUsd * 0.08)).toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Reallocation Risk (Pos #{callPosition})</div>
                <div
                  className={`mt-0.5 text-sm font-semibold ${
                    (analysis?.reallocationTemptationRisk ?? (callPosition <= 6 && rhythmPhi >= 0.16 ? 'HIGH' : 'LOW')) ===
                    'HIGH'
                      ? 'text-red-700'
                      : 'text-slate-900'
                  }`}
                >
                  {analysis?.reallocationTemptationRisk ??
                    (callPosition <= 6 && rhythmPhi >= 0.16 ? 'HIGH' : 'MODERATE')}
                </div>
              </div>
            </div>

            {/* Extracted Signals */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-xs font-semibold text-slate-900">Extracted NLP Signals</div>
              {analysis?.detectedSignals?.length ? (
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {analysis.detectedSignals.map((sig, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-mono text-slate-400">0{i + 1}.</span>
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  Send a customer utterance or click &ldquo;Simulate Customer Reply&rdquo; to inspect live entity &amp; objection extraction.
                </p>
              )}
            </div>

            {/* RevOps Coaching Rationale */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <div className="text-xs font-semibold text-slate-900">RevOps Behavioral Note</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {analysis?.revOpsCoaching ??
                  (mode === 'human_copilot'
                    ? `At Call #${callPosition} with rhythm φ=${rhythmPhi.toFixed(2)}, human agents face elevated outside-option temptation. Co-pilot keeps the rep persisting through objections instead of releasing a viable lead.`
                    : 'AI Voice Agent screens cold leads at ~$0.04/call and monitors live NLP intent to escalate immediately if purchase intent crosses 72/100.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
