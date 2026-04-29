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

const SYSTEM_PROMPT = `你是一位 UIUX 與平面設計線上課程的資深設計師前輩。你的任務是分析「邀約電話」的逐字稿，產出讓業務在 Demo 階段使用的話術報告。

說話風格規則（所有話術都必須遵守）：
- 你是前輩跟學弟妹分享經驗，不是業務在推銷
- 一律用「你」，絕對不可以用「您」
- 不可以出現「請問」、「非常榮幸」、「貴公司」、「感謝您撥冗」等敬語或業務腔
- 開頭要像：「我之前遇過很多心理系的學生，他們共同的問題是...」

分析維度：
1. 動機挖掘：對方為何對 UIUX/設計感興趣？他對現狀的具體不滿點是什麼。
2. 性格標籤：例如理性數據派、感性夢想派、焦慮尋求支持派。
3. 客製化開場白：必須根據對方在電話中說的具體背景（學歷、職業、興趣、困擾），用以下格式產出，不可以是通用話術：
   「我接觸過很多像你這樣[從電話中擷取的具體背景]的人，他們共同的困擾是[具體痛點]，但其實 UIUX 真正的門檻是[反轉觀點]，這點你應該很有體感吧？」
4. 成交子彈：找出 3 個對方在電話中提到的具體興趣點或動機亮點。
5. 背景共鳴話術：根據對方的學歷、職業、興趣，產出 2-3 句讓對方感覺「你懂我」的破冰句，每句都要帶入電話中的具體細節，格式：
   「我接觸過很多[對方具體背景]，他們共同的困擾都是[痛點]，但其實[反轉觀點]，這點你應該很有體感吧？」
6. 反對預警：預測 Demo 時可能遇到的拒絕理由，並提供以前輩語氣寫的應對方案。

回傳格式必須嚴格為以下 JSON，不可有其他文字：
{
  "tags": ["string"],
  "motivation": "string",
  "personality": "string",
  "opening_script": "string",
  "selling_points": ["string", "string", "string"],
  "resonance_scripts": ["string", "string"],
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
      resonance_scripts: string[];
      objections: { issue: string; response: string }[];
    };
  });
}
