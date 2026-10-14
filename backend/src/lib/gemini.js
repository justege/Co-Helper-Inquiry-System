import { GoogleGenerativeAI } from "@google/generative-ai";

const buckets = new Map();

export function geminiConfigured() {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== "your-gemini-api-key");
}

export function assistantError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function allowRequest(key, limit, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((stamp) => now - stamp < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function clientAddress(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = (raw ? String(raw).split(",")[0] : req.ip) || "unknown";
  return ip.trim().slice(0, 80);
}

function requireKey() {
  if (!geminiConfigured()) {
    throw assistantError(503, "Add GEMINI_API_KEY to the server environment");
  }
  return process.env.GEMINI_API_KEY.trim();
}

export function mapGeminiError(err) {
  const key = process.env.GEMINI_API_KEY || "";
  const raw = String(err?.message || "Gemini request failed").replaceAll(key, "[key]");
  if (/API key not valid|API_KEY_INVALID|permission denied|unregistered callers/i.test(raw)) {
    return { status: 503, error: "Gemini rejected the API key. Check GEMINI_API_KEY on the server." };
  }
  if (/quota|RESOURCE_EXHAUSTED|rate limit|429/i.test(raw)) {
    return { status: 429, error: "Gemini is rate limiting requests. Try again in a minute." };
  }
  if (/not found|not supported|404/i.test(raw)) {
    return { status: 503, error: "That Gemini model is unavailable. Set GEMINI_MODEL on the server." };
  }
  console.error("[assistant]", raw.slice(0, 400));
  return { status: 502, error: "The assistant is unavailable right now." };
}

export function sendAssistantError(res, err) {
  const status = Number(err?.status) || 0;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: err.message });
  }
  if (status === 503) {
    return res.status(503).json({ error: err.message });
  }
  const mapped = mapGeminiError(err);
  return res.status(mapped.status).json({ error: mapped.error });
}

export async function geminiJson(system, prompt) {
  const ai = new GoogleGenerativeAI(requireKey());
  const model = ai.getGenerativeModel({
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    systemInstruction: system,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });
  let raw = "";
  try {
    const result = await model.generateContent(prompt, { timeout: 25000 });
    raw = result.response.text();
  } catch (err) {
    if (err?.status) throw err;
    const message = String(err?.message || "");
    if (/blocked|safety|RECITATION|no candidates/i.test(message)) {
      throw assistantError(422, "The assistant couldn't write that. Try rephrasing.");
    }
    throw err;
  }
  return parseModelJson(raw);
}

export function parseModelJson(raw) {
  const trimmed = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw assistantError(422, "The assistant returned something I couldn't use");
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw assistantError(422, "The assistant returned something I couldn't use");
  }
}
