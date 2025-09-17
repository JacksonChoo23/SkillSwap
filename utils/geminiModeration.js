// utils/geminiModeration.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

const baseModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `
Output ONLY valid JSON. No fences. No prose.
Schema:
{
  "isAdult": boolean,
  "isToxic": boolean,
  "scores": {
    "sexual": number,
    "sexual_minors": number,
    "harassment": number,
    "hate": number,
    "self_harm": number,
    "violence": number
  },
  "reasons": string[]
}
Rules:
- isAdult = sexual >= 0.8 OR sexual_minors >= 0.2
- isToxic = harassment >= 0.8 OR hate >= 0.8 OR violence >= 0.8
`
});

const suggestModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `
Output ONLY valid JSON. No fences. No prose.
Schema:
{
  "isAdult": boolean,
  "isToxic": boolean,
  "scores": {
    "sexual": number,
    "sexual_minors": number,
    "harassment": number,
    "hate": number,
    "self_harm": number,
    "violence": number
  },
  "reasons": string[],
  "suggestions": {
    "title": string,
    "description": string,
    "notes": string[]
  },
  "rewrite": {
    "title": string,
    "description": string
  }
}
Rules:
- First, classify same as moderation. Thresholds:
  - isAdult = sexual >= 0.8 OR sexual_minors >= 0.2
  - isToxic = harassment >= 0.8 OR hate >= 0.8 OR violence >= 0.8
- Then, give actionable improvement. Keep the same meaning. Remove sexual/toxic parts.
- Tone: neutral, simple, safe for a public listing.
- Title <= {MAX_TITLE} chars. Description <= {MAX_DESC} chars.
- If input field missing, echo empty string for that field.
- Use plain words. No marketing fluff.
`
});

const generationConfig = {
  responseMimeType: "application/json",
  temperature: 0,
  maxOutputTokens: 512
};

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

function shapeModeration(o = {}) {
  const s = o.scores || {};
  const sexual = num(s.sexual);
  const sexualMinors = num(s["sexual_minors"]);
  const harassment = num(s.harassment);
  const hate = num(s.hate);
  const selfHarm = num(s["self_harm"]);
  const violence = num(s.violence);

  const isAdult = sexual >= 0.8 || sexualMinors >= 0.2;
  const isToxic = harassment >= 0.8 || hate >= 0.8 || violence >= 0.8;

  return {
    isAdult,
    isToxic,
    scores: {
      sexual,
      sexual_minors: sexualMinors,
      harassment,
      hate,
      self_harm: selfHarm,
      violence
    },
    reasons: Array.isArray(o.reasons) ? o.reasons.slice(0, 10) : []
  };
}

function shapeSuggest(o = {}, maxTitle = 80, maxDesc = 800) {
  const base = shapeModeration(o);
  const suggestions = o.suggestions || {};
  const rewrite = o.rewrite || {};

  const safe = (v) => (typeof v === "string" ? v : "");
  const clip = (v, n) => (safe(v).length > n ? safe(v).slice(0, n) : safe(v));

  return {
    ...base,
    suggestions: {
      title: clip(suggestions.title, maxTitle),
      description: clip(suggestions.description, maxDesc),
      notes: Array.isArray(suggestions.notes) ? suggestions.notes.slice(0, 10).map(String) : []
    },
    rewrite: {
      title: clip(rewrite.title, maxTitle),
      description: clip(rewrite.description, maxDesc)
    }
  };
}

async function runModel(model, prompt, cfg = generationConfig) {
  const res = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: cfg
  });

  let raw = "";
  try {
    raw = res.response.text().trim();
  } catch {
    raw =
      res?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() || "";
  }
  return raw;
}

// 保留：旧 API（只做判定）
export async function checkAdultAndToxicContent(text) {
  const prompt = `Analyze the text and return ONLY JSON in the required schema.

Text:
"""${(text ?? "").toString().slice(0, 8000)}"""`;

  const raw = await runModel(baseModel, prompt);

  try {
    return shapeModeration(JSON.parse(raw));
  } catch {
    const i = raw.indexOf("{");
    const j = raw.lastIndexOf("}");
    if (i >= 0 && j > i) return shapeModeration(JSON.parse(raw.slice(i, j + 1)));
    throw new Error("Gemini moderation: non-JSON response");
  }
}

// 新增：判定 + 修改建议 + 安全改写
export async function checkContentWithSuggestions(payload) {
  const {
    title = "",
    description = "",
    maxTitle = 80,
    maxDescription = 800
  } = payload || {};

  const prompt = `You will analyze and improve a listing draft. Return ONLY JSON.

{MAX_TITLE}: ${maxTitle}
{MAX_DESC}: ${maxDescription}

Input:
Title:
"""${title.toString().slice(0, 500)}"""

Description:
"""${description.toString().slice(0, 7000)}"""`;

  const raw = await runModel(suggestModel, prompt);

  try {
    return shapeSuggest(JSON.parse(raw), maxTitle, maxDescription);
  } catch {
    const i = raw.indexOf("{");
    const j = raw.lastIndexOf("}");
    if (i >= 0 && j > i)
      return shapeSuggest(JSON.parse(raw.slice(i, j + 1)), maxTitle, maxDescription);
    // 兜底：退回基础判定
    const base = await checkAdultAndToxicContent([title, description].join("\n"));
    return { ...base, suggestions: { title: "", description: "", notes: [] }, rewrite: { title: "", description: "" } };
  }
}
