import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

function getClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Models tried in order; next is used when the current returns 503/429/404
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];

async function withFallback<T>(
  fn: (modelName: string) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await fn(model);
      } catch (err: unknown) {
        lastError = err;
        const msg = String(err);
        const isRetryable = msg.includes("503") || msg.includes("429") || msg.includes("overloaded");
        const isHard = msg.includes("404") || msg.includes("not found") || msg.includes("no longer available");
        if (isHard) break;           // try next model immediately
        if (!isRetryable) throw err; // non-retryable error, surface immediately
        // wait before retry: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

// ── Transcription ────────────────────────────────────────────────────────────

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  return withFallback(async (modelName) => {
    const model = getClient().getGenerativeModel({ model: modelName, safetySettings: SAFETY });
    const result = await model.generateContent([
      { inlineData: { mimeType, data: buffer.toString("base64") } },
      "請將此音訊完整逐字轉錄為繁體中文。只輸出逐字稿內容，不要加任何說明。",
    ]);
    return result.response.text().trim();
  });
}

// ── Analysis ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一位 UIUX 線上課程的電銷成交專家。你的任務是分析「邀約電話」的逐字稿，產出讓業務在 Demo 階段使用的戰略報告。

分析維度：
1. 動機挖掘：對方為何對數位遊牧感興趣？他對現狀的具體不滿點。
2. 性格標籤：例如理性數據派、感性夢想派、焦慮尋求支持派。
3. Demo 破冰話術：根據內容給出一個客製化開場白。
4. 成交子彈：找出 3 個對方提到的亮點。
5. 反對預警：預測 Demo 時可能遇到的拒絕理由，並提供應對方案。

回傳格式必須嚴格為以下 JSON，不可有其他文字：
{
  "tags": ["string"],
  "motivation": "string",
  "personality": "string",
  "opening_script": "string",
  "selling_points": ["string", "string", "string"],
  "objections": [
    { "issue": "string", "response": "string" }
  ]
}`;

export async function analyzeTranscript(transcript: string) {
  return withFallback(async (modelName) => {
    const model = getClient().getGenerativeModel({
      model: modelName,
      safetySettings: SAFETY,
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent([SYSTEM_PROMPT, transcript]);
    return JSON.parse(result.response.text()) as {
      tags: string[];
      motivation: string;
      personality: string;
      opening_script: string;
      selling_points: string[];
      objections: { issue: string; response: string }[];
    };
  });
}
