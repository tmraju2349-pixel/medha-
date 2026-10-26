import { Router, type IRouter } from "express";

const router: IRouter = Router();
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

interface VoiceBody {
  audioBase64?: unknown;
  mimeType?: unknown;
  languageHint?: unknown;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function parseStructuredResponse(raw: string) {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as {
    transcript?: unknown;
    language?: unknown;
    possibleTask?: {
      title?: unknown;
      time?: unknown;
      recurrence?: unknown;
    } | null;
  };

  return {
    transcript: typeof parsed.transcript === "string" ? parsed.transcript : "",
    language: typeof parsed.language === "string" ? parsed.language : "unknown",
    possibleTask:
      parsed.possibleTask &&
      typeof parsed.possibleTask.title === "string" &&
      typeof parsed.possibleTask.time === "string" &&
      typeof parsed.possibleTask.recurrence === "string"
        ? {
            title: parsed.possibleTask.title,
            time: parsed.possibleTask.time,
            recurrence: parsed.possibleTask.recurrence,
          }
        : null,
  };
}

router.post("/voice/transcribe", async (req, res) => {
  const body = req.body as VoiceBody;
  const audioBase64 = typeof body.audioBase64 === "string" ? body.audioBase64 : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const languageHint = typeof body.languageHint === "string" ? body.languageHint : "Assamese, Hindi, or English";

  if (!audioBase64 || !mimeType) {
    res.status(400).json({ error: "audioBase64 and mimeType are required" });
    return;
  }

  const approximateBytes = Math.floor((audioBase64.length * 3) / 4);
  if (approximateBytes > MAX_AUDIO_BYTES) {
    res.status(413).json({ error: "Recording is larger than the supported 8 MB limit" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Gemini integration is not configured" });
    return;
  }

  const prompt = [
    "You are the Voice Diary assistant for an elderly care app.",
    "Transcribe the audio faithfully. Do not diagnose, infer medical conditions, or invent details.",
    "Detect the spoken language.",
    "If the speaker clearly asks for a reminder or names a future task, extract it as possibleTask.",
    "Return only valid JSON matching this exact shape:",
    '{"transcript":"string","language":"string","possibleTask":{"title":"string","time":"string","recurrence":"string"} or null}',
    `Language hints: ${languageHint}.`,
  ].join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: audioBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!response.ok) {
      req.log.error({ status: response.status }, "Gemini transcription request failed");
      res.status(502).json({ error: "Gemini transcription failed" });
      return;
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    if (!text) {
      res.status(502).json({ error: "Gemini returned no transcription" });
      return;
    }

    res.json(parseStructuredResponse(text));
  } catch (error) {
    req.log.error({ err: error }, "Voice transcription failed");
    res.status(502).json({ error: "Voice transcription failed" });
  }
});

export default router;