import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface TurnHistoryItem {
  speaker: 'customer' | 'agent';
  text: string;
}

interface LeadProfile {
  name: string;
  product: string;
  initialTemp: 'HOT' | 'COLD';
  dropStage: string;
  annualPremiumUsd: number;
  priorAttempts: number;
  personaContext: string;
}

const NLP_TURN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    agentResponse: {
      type: Type.STRING,
      description:
        'In ai_voice mode: exact natural, concise spoken response (2-3 sentences) from the AI Voice Agent. In human_copilot mode: recommended verbatim spoken talk-track (2-3 sentences) for the human sales rep to deliver right now.',
    },
    intentScore: {
      type: Type.INTEGER,
      description: 'Real-time estimated purchase intent score from 0 to 100.',
    },
    leadTemp: {
      type: Type.STRING,
      description: 'Updated real-time temperature classification: HOT, WARM, or COLD.',
    },
    sentiment: {
      type: Type.STRING,
      description: 'Customer sentiment classification: POSITIVE, NEUTRAL, HESITANT, or FRICTION.',
    },
    detectedSignals: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2 to 4 concise NLP entity/intent signals extracted from the customer statement.',
    },
    objectionCategory: {
      type: Type.STRING,
      description:
        'Primary conversation state or objection category (e.g., Price & Deductible, Spouse Consultation, Coverage Clarity, Timing / Busy, Ready to Close, Hard Refusal).',
    },
    routingDecision: {
      type: Type.STRING,
      description:
        'One of: CONTINUE_AI, ESCALATE_HOT_TO_HUMAN, KEEP_HUMAN_PERSIST, GUARDRAIL_BLOCK_REALLOCATION, CLOSE_WON, MARK_DNC_6MO.',
    },
    revOpsCoaching: {
      type: Type.STRING,
      description:
        '1-2 sentence Revenue Operations coaching rationale connecting this call moment to reservation-value bias, expected lead value, or hot/cold routing rules.',
    },
    expectedValueUsd: {
      type: Type.NUMBER,
      description: 'Estimated expected conversion value in USD (conversion probability * annual premium).',
    },
    reallocationTemptationRisk: {
      type: Type.STRING,
      description: 'Risk that a human agent prematurely returns this lead to the queue: LOW, MODERATE, or HIGH.',
    },
  },
  required: [
    'agentResponse',
    'intentScore',
    'leadTemp',
    'sentiment',
    'detectedSignals',
    'objectionCategory',
    'routingDecision',
    'revOpsCoaching',
    'expectedValueUsd',
    'reallocationTemptationRisk',
  ],
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasKey: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/nlp/turn', async (req, res) => {
  try {
    const {
      mode,
      leadProfile,
      callPosition = 2,
      rhythmPhi = 0.22,
      history = [],
      customerMessage,
    } = req.body as {
      mode: 'ai_voice' | 'human_copilot';
      leadProfile: LeadProfile;
      callPosition?: number;
      rhythmPhi?: number;
      history?: TurnHistoryItem[];
      customerMessage: string;
    };

    if (!customerMessage || !customerMessage.trim()) {
      res.status(400).json({ error: 'Customer message is required.' });
      return;
    }

    const ai = getGeminiClient();

    const transcriptText = history
      .map((item) => `${item.speaker === 'customer' ? 'Customer' : 'Agent'}: ${item.text}`)
      .join('\n');

    const isEarlyPosition = callPosition <= 6;
    const isSteepRhythm = rhythmPhi >= 0.16;

    const systemInstruction =
      mode === 'ai_voice'
        ? `You are a real-time RevOps NLP engine powering an outbound Call Center AI Voice Agent for an online health & critical-illness insurance brokerage.
Operational Context:
- Cold leads (dropped before payment page) route to AI by default at near-zero marginal cost.
- If real-time NLP detects strong buying signals (intentScore >= 72 or explicit checkout/payment questions), immediately set routingDecision = "ESCALATE_HOT_TO_HUMAN" so a human closer takes a warm transfer instead of letting AI stall.
- If the customer explicitly demands never to be called again, set routingDecision = "MARK_DNC_6MO" (6-month do-not-call restriction).
- If the customer confirms purchase/payment link completion, set routingDecision = "CLOSE_WON".
- Otherwise set routingDecision = "CONTINUE_AI".
- Keep agentResponse natural, empathetic, concise (2-3 spoken sentences), and directly responsive to the customer's exact words.`
        : `You are a real-time Revenue Operations NLP Co-Pilot assisting a Human Sales Agent on an outbound Hot Lead call (customer previously reached the payment page without completing checkout).
Empirical Behavioral Risk Context (Fu et al., 2026):
- Current within-day call position: Call #${callPosition} of 50. Within-day front-loading rhythm phi = ${rhythmPhi.toFixed(2)} (${isSteepRhythm ? 'HIGH front-loading — strong reservation-value pullback risk' : 'CALM staggered rhythm — lower pullback risk'}).
- At early positions (Calls 1-6), parallel AI deployment makes agents expect an abundant stream of hot leads next, causing them to cut calls 13% shorter and reallocate viable leads +8.1 pp more often (reallocated leads still convert at 5.7% vs 3.0% retained!).
- Your job: analyze the customer's live statement, detect hesitation or objection friction, and if this is a viable hot lead facing early-shift objection friction (${isEarlyPosition ? 'YES — early shift high temptation' : 'NO — mid/late shift'}), set routingDecision = "GUARDRAIL_BLOCK_REALLOCATION" (or "KEEP_HUMAN_PERSIST") and give the human agent an exact, high-empathy 2-3 sentence objection-handling talk-track in agentResponse that preserves persistence.
- If customer confirms purchase, set routingDecision = "CLOSE_WON". If customer explicitly demands no further contact, set routingDecision = "MARK_DNC_6MO".`;

    const prompt = `Lead Profile:
- Name: ${leadProfile.name}
- Product: ${leadProfile.product} (Annual Premium: $${leadProfile.annualPremiumUsd})
- Initial Classification: ${leadProfile.initialTemp} (${leadProfile.dropStage})
- Prior Attempts: ${leadProfile.priorAttempts}
- Context: ${leadProfile.personaContext}

Conversation Transcript So Far:
${transcriptText || '(Call just connected)'}

Latest Customer Utterance:
"${customerMessage.trim()}"

Analyze this utterance in real time and return the structured JSON response.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: NLP_TURN_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: unknown) {
    console.error('NLP turn error:', err);
    const message = err instanceof Error ? err.message : 'Failed to process real-time NLP turn.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/nlp/simulate-customer', async (req, res) => {
  try {
    const { leadProfile, history = [] } = req.body as {
      leadProfile: LeadProfile;
      history?: TurnHistoryItem[];
    };

    const ai = getGeminiClient();

    const transcriptText = history
      .map((item) => `${item.speaker === 'customer' ? 'Customer' : 'Agent'}: ${item.text}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are roleplaying the prospective insurance customer on an outbound sales call.
Customer Profile:
- Name: ${leadProfile.name}
- Product browsed: ${leadProfile.product} ($${leadProfile.annualPremiumUsd}/yr)
- Funnel drop-off: ${leadProfile.dropStage} (${leadProfile.initialTemp} lead)
- Mindset: ${leadProfile.personaContext}

Conversation so far:
${transcriptText || '(The agent just greeted you.)'}

Respond naturally as this customer in 1 to 2 short spoken sentences. Be realistic: voice a genuine question, objection, hesitation, or warming buying signal depending on how persuasive the agent's last message was. Return ONLY the customer's spoken words with no quotation marks or speaker label.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    res.json({ customerMessage: (response.text ?? '').trim() });
  } catch (err: unknown) {
    console.error('Simulate customer error:', err);
    const message = err instanceof Error ? err.message : 'Failed to simulate customer reply.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`CadenceOps server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
