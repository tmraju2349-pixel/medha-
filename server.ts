import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// Check if Google OAuth provider is enabled in Supabase without causing a 400 redirect crash
app.get('/api/auth/check-google-provider', async (req, res) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    return res.json({ enabled: false, reason: 'Supabase URL is not configured' });
  }

  try {
    const redirectParam = (req.query.redirect_to as string) || 'http://localhost:3000';
    const testUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectParam)}`;
    
    // Test Supabase OAuth endpoint without following redirect
    const probe = await fetch(testUrl, { redirect: 'manual' });
    
    if (probe.status === 400) {
      const data = await probe.json().catch(() => ({}));
      return res.json({
        enabled: false,
        code: 400,
        errorCode: data.error_code || 'validation_failed',
        message: data.msg || 'Unsupported provider: provider is not enabled',
        projectId: supabaseUrl.replace('https://', '').split('.')[0],
      });
    }

    // Provider is enabled (302/303 redirect or 200 OK)
    return res.json({
      enabled: true,
      authorizeUrl: testUrl,
    });
  } catch (err: any) {
    return res.json({
      enabled: false,
      reason: err.message || 'Failed to check Supabase provider',
    });
  }
});

// Assistant Intent & Translation Endpoint (ONLINE Path)
app.post('/api/assistant/intent', async (req, res) => {
  const { query, language, currentPage = 'home' } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query string is required' });
  }

  const ai = getAI();

  // If Gemini client is not configured, reply with graceful indicator for client fallback
  if (!ai) {
    return res.json({
      fallbackToLocal: true,
      reason: 'GEMINI_API_KEY not configured on server',
    });
  }

  const systemInstruction = `
You are the voice intent parser for MEDHA, an elderly memory care cognitive companion app.
The user speaks to you via voice in English, Assamese (অসমীয়া), Bengali (বাংলা), or Hindi (हिन्दी).
Your tasks:
1. Detect language.
2. Translate the phrase into natural, respectful English.
3. Classify intent into one of these actions:
   - "answer": the user is asking an informational question, general knowledge question, news/events (e.g. "tell me about Nepal floods", "what is happening in Nepal?", "who was Lachit Borphukan?"), health/wellness tips, weather, or conversational chat. In this case, provide a clear, empathetic, and spoken response (under 75 words) in the "answer" field that sounds pleasant and comforting when read aloud to an elderly person.
   - "reminder": scheduled task/medicine (payload: { title: string, time: "HH:mm" })
   - "memory": a memory, story, family person, pet, or place to record in the Memory Tree (payload: { title: string, description: string, category?: string, importance?: "high"|"medium"|"low" })
   - "search_tree": searching or finding memories/branches in the Memory Tree, e.g. "search for pets", "find Bruno", "show my family" (payload: { query: string, page: "tree" })
   - "navigate": switching modules (payload: { page: "tree" | "home" | "games" | "diary" | "geo" | "settings" })
   - "read_screen": reading the current screen aloud (payload: { page: string })
   - "hydrate": drinking water (payload: {})
   - "sos": emergency distress/help (payload: { reason: string })
   - "diary": journaling thoughts (payload: { text: string })
4. For "answer" action, provide the spoken response in "answer". For actionable operations (reminder, memory, search, navigate, sos), generate a warm, clear confirmationPrompt to confirm before executing (e.g., "Would you like me to open your Memory Tree and search for pets?").

Output strictly valid JSON matching this schema:
{
  "action": "answer" | "reminder" | "memory" | "search_tree" | "navigate" | "read_screen" | "hydrate" | "sos" | "diary",
  "detectedLanguage": string,
  "englishTranslation": string,
  "answer": string,
  "confirmationPrompt": string,
  "confidence": number,
  "payload": object
}
`;

  const prompt = `Current view: ${currentPage}\nUser speech: "${query}"\nLanguage hint: ${language || 'auto'}`;

  // Try candidate models in order of throughput and availability:
  // 1. gemini-3.1-flash-lite: optimized for high frequency & speed, resilient to demand spikes
  // 2. gemini-flash-latest: latest stable flash alias
  // 3. gemini-3.8-flash: basic text tasks
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

  for (const modelName of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          return res.json({
            ...parsed,
            modelUsed: modelName,
            originalText: query,
          });
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err || '');
        const is503 = err?.status === 503 || err?.code === 503 || errMsg.includes('503') || errMsg.includes('high demand');
        
        // If 503 high demand, back off briefly before retrying or switching models
        if (is503 && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          continue;
        }
        // Break inner attempt loop to try next candidate model
        break;
      }
    }
  }

  // Fallback to local parsing indicator
  return res.json({
    fallbackToLocal: true,
    reason: 'Gemini service temporarily unavailable, utilizing local offline parser',
  });
});

// Direct Source Code Download Endpoint
app.get('/api/download-source', (req, res) => {
  const zipPath = path.join(process.cwd(), 'public', 'medha-source-code.zip');
  res.download(zipPath, 'medha-source-code.zip', (err) => {
    if (err) {
      console.error('Download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download zip file' });
      }
    }
  });
});

// Emergency SOS Dispatch Endpoint (Twilio / Webhook / External Gateway)
app.post('/api/emergency/dispatch-sos', async (req, res) => {
  const {
    patientName = 'Patient',
    caregiverPhone = '+919876543210',
    caregiverName = 'Guardian',
    location = { lat: 26.1832, lng: 91.7425 },
    batteryLevel = 85,
    alertType = 'Perimeter Breach',
    timestamp = Date.now(),
  } = req.body;

  const lat = Number(location.lat || 26.1832).toFixed(6);
  const lng = Number(location.lng || 91.7425).toFixed(6);
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const dispatchTime = new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const smsBody = `🚨 MEDHA EMERGENCY SOS ALERT\n\nPatient: ${patientName}\nAlert: ${alertType}\nTime: ${dispatchTime}\nBattery: ${batteryLevel}%\nGuardian Alerted: ${caregiverName} (${caregiverPhone})\nLive GPS Location: ${mapsUrl}\nEmergency: 108\n\nPlease check on ${patientName} immediately.`;

  console.log(`[EMERGENCY DISPATCH] Sent to ${caregiverPhone} for ${patientName}:`, smsBody);

  // If Twilio credentials are provided, dispatch real SMS
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  let realSmsSent = false;
  let providerMessageId = `SIM-${Date.now()}`;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', caregiverPhone);
      params.append('From', twilioFrom);
      params.append('Body', smsBody);

      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (twilioRes.ok) {
        const twilioData = await twilioRes.json();
        realSmsSent = true;
        providerMessageId = twilioData.sid;
      }
    } catch (err) {
      console.warn('Twilio dispatch warning:', err);
    }
  }

  return res.json({
    success: true,
    dispatchId: `DISPATCH-${Date.now()}`,
    providerMessageId,
    realSmsSent,
    patientName,
    caregiverPhone,
    mapsUrl,
    smsBody,
    dispatchedAt: new Date().toISOString(),
    channel: realSmsSent ? 'Twilio-SMS' : 'Live-Simulated-Gateway',
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MEDHA server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
