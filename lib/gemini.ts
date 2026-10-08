import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Part,
} from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import type { Rubric } from "./rubrics";
import { buildTrustPrompt } from "./trust-prompt";

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
        const isHard = msg.includes("404") || msg.includes("not found") || msg.includes("no longer available") || msg.includes("INVALID_JSON");
        if (isHard) break;           // try next model immediately
        if (!isRetryable) throw err; // non-retryable error, surface immediately
        // wait before retry: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

// ── Audio input ──────────────────────────────────────────────────────────────

// 小檔直接夾帶；大檔（> 15MB）先用 Gemini Files API 上傳，分析完再刪掉
const INLINE_LIMIT = 15 * 1024 * 1024;

async function prepareAudio(buffer: Buffer, mimeType: string): Promise<{ part: Part; cleanup: () => Promise<void> }> {
  if (buffer.length <= INLINE_LIMIT) {
    return { part: { inlineData: { mimeType, data: buffer.toString("base64") } }, cleanup: async () => {} };
  }
  const fm = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);
  const up = await fm.uploadFile(buffer, { mimeType, displayName: `call-${Date.now()}` });
  let file = up.file;
  for (let i = 0; i < 60 && file.state === FileState.PROCESSING; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    file = await fm.getFile(file.name);
  }
  if (file.state === FileState.FAILED) throw new Error("Gemini 無法處理這個音檔");
  return {
    part: { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
    cleanup: async () => { await fm.deleteFile(file.name).catch(() => {}); },
  };
}

// ── Transcription ────────────────────────────────────────────────────────────

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const { part, cleanup } = await prepareAudio(buffer, mimeType);
  try {
    return await withFallback(async (modelName) => {
      const model = getClient().getGenerativeModel({ model: modelName, safetySettings: SAFETY });
      const result = await model.generateContent([
        part,
        "請將此音訊完整逐字轉錄為繁體中文。只輸出逐字稿內容，不要加任何說明。",
      ]);
      return result.response.text().trim();
    });
  } finally {
    await cleanup();
  }
}

// ── Trust analysis（音檔直接給 Gemini 聽）─────────────────────────────────────

export async function analyzeTrust(
  input: { audio?: { buffer: Buffer; mimeType: string }; transcript?: string },
  rubric: Rubric,
  durationSeconds?: number | null
): Promise<{ raw: unknown; model: string }> {
  const hasAudio = !!input.audio;
  const prompt = buildTrustPrompt(rubric, { hasAudio, durationSeconds });
  const prepared = input.audio ? await prepareAudio(input.audio.buffer, input.audio.mimeType) : null;
  try {
    return await withFallback(async (modelName) => {
      const model = getClient().getGenerativeModel({
        model: modelName,
        safetySettings: SAFETY,
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      });
      const parts: (string | Part)[] = [prompt];
      if (prepared) parts.push(prepared.part);
      else parts.push(`以下是通話逐字稿：\n${input.transcript ?? ""}`);
      const result = await model.generateContent(parts);
      const text = result.response.text().replace(/^```(?:json)?\s*|\s*```$/g, "");
      try {
        return { raw: JSON.parse(text), model: modelName };
      } catch {
        throw new Error(`INVALID_JSON from ${modelName}`);
      }
    });
  } finally {
    await prepared?.cleanup();
  }
}

// ── Analysis ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一位 UIUX 與平面設計線上課程的資深設計師前輩。你的任務是分析「邀約電話」的逐字稿，產出讓業務在 Demo 階段直接使用的武器，不是報告。

說話風格規則（所有話術都必須遵守）：
- 你是前輩跟學弟妹分享經驗，不是業務在推銷
- 一律用「你」，絕對不可以用「您」
- 不可以出現「請問」、「非常榮幸」、「貴公司」、「感謝您撥冗」等敬語或業務腔
- 開頭要像：「我之前遇過很多心理系的學生，他們共同的問題是...」

分析維度：
1. 動機挖掘：對方為何對 UIUX/設計感興趣？他對現狀的具體不滿點是什麼。
2. 性格標籤：例如理性數據派、感性夢想派、焦慮尋求支持派。
3. 職業切入點：一句話說明這個人的職業或背景跟 UIUX 有什麼直接關聯。格式必須是：「[職業/背景描述]，[學習UIUX對他的直接價值]」。例如：「他做行銷，最懂用戶行為，學 UIUX 就是把這個直覺系統化」、「她是老師，天天在設計學習體驗，UIUX 就是把這件事變成可以接案的技能」。必須從電話內容提取具體職業，不可以是通用句子。
4. 客製化開場白：必須根據對方在電話中說的具體背景（學歷、職業、興趣、困擾），產出 2-3 句話，業務要能一眼看完就記住、直接念出來。不可以是通用話術，必須帶入電話中的具體細節。參考格式：「我接觸過很多像你這樣[具體背景]的人，他們共同的困擾是[具體痛點]，但其實[反轉觀點]，這點你應該很有體感吧？」
5. 成交子彈：找出 3 個對方在電話中提到的具體興趣點或動機亮點。
6. 背景共鳴話術：根據對方的學歷、職業、興趣，產出 2-3 句讓對方感覺「你懂我」的破冰句，每句都要帶入電話中的具體細節，格式：
   「我接觸過很多[對方具體背景]，他們共同的困擾都是[痛點]，但其實[反轉觀點]，這點你應該很有體感吧？」
7. 破冰引導話術：根據顧客性格與背景，產出「又捧又推」結構的引導話術，目的是讓顧客主動說更多、自我說服，不是被推銷。
   數量規則：
   - 電話內容豐富、資訊充足（有職業、學歷、興趣、擔憂、夢想等多個細節）→ 產出 5 個
   - 電話內容較短或資訊有限 → 產出 2-3 個
   每一個話術必須從不同維度切入，不可重複或太相似，維度例如：性格特質、職業背景、興趣愛好、內心擔憂、未來夢想。每個維度最多使用一次。
   結構必須包含三個步驟：
   a. 捧：先給對方一個正面標籤或觀察
   b. 推：拋出一個反向懷疑或輕度挑戰，讓他想反駁
   c. 引導：開放式問句讓對方自己說出否定，主動表態
   每一個話術輸出兩個欄位：
   - script：業務直接念的完整話術（一段話，包含捧推引導三步驟）
   - why：一句話說明為什麼這樣說的邏輯（業務理解用，不念出來）
   每一個話術都必須帶入電話中顧客的具體背景細節，絕對不可以是通用句子。
8. 反對預警：預測這個人在 Demo 時最可能說的 3 個拒絕理由，每一個給一句業務可以直接接的話。格式嚴格為：
   - issue：他可能說的話（一句話，直接引述他可能的說法）
   - response：你可以接的一句話（前輩語氣，簡短直接，業務直接念）
9. Demo 互動體驗設計：根據顧客的年齡、職業、生活習慣，推薦 1-2 個讓對方突然意識到「我每天都在被 UIUX 設計師設計卻不知道」的互動問題，目標是製造頓悟感。
   核心目的：不是在說服對方，是讓對方自己發現——原來設計師的決定每天都在影響自己的行為，而自己從來沒察覺。
   設計原則：
   - 從對方每天真實接觸的數位介面丟出問題，問題本身要讓對方有「欸我還真的沒想過」的感覺
   - 具體問法範例：「你有沒有想過為什麼 IG 限動是圓的不是方的？」「你有沒有想過為什麼 YouTube 的推薦影片總是你會想看的？」「你去提款機領錢，為什麼確認鍵永遠在右邊不在左邊？」
   - 年齡判斷：從逐字稿推斷顧客年齡——40 歲以上用提款機、Line 已讀功能、Google Maps 路線規劃、捷運票機；年輕族群用 IG、YouTube、Spotify、Netflix；有設計背景的人問視覺層級細節，例如「你有沒有想過為什麼 App 最重要的按鈕幾乎都在右下角」
   - 接話原則：不管對方回答什麼（包括「不知道」「沒想過」「因為好看」），業務都要能用一句話接住，並說明這是設計師刻意這樣做的結果
   - 每個互動問題最後必須有一句「頓悟收尾句」，讓對方意識到自己每天都在被設計卻不知道
   - 語氣是設計師前輩跟朋友聊天，不可以有敬語或業務腔
   每個互動問題輸出三個欄位：
   - question：丟給顧客的問題
   - bridge：不管對方怎麼回答，業務要怎麼接住並說明設計意圖
   - awakening：最後讓對方產生頓悟感的收尾句，必須帶入「你每天都在被設計師設計」這個核心概念

回傳格式必須嚴格為以下 JSON，不可有其他文字：
{
  "tags": ["string"],
  "motivation": "string",
  "personality": "string",
  "career_angle": "string",
  "opening_script": "string",
  "selling_points": ["string", "string", "string"],
  "resonance_scripts": ["string", "string"],
  "icebreaker_scripts": [
    { "script": "string", "why": "string" }
  ],
  "objections": [
    { "issue": "string", "response": "string" }
  ],
  "demo_interactions": [
    { "question": "string", "bridge": "string", "awakening": "string" }
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
      career_angle: string;
      opening_script: string;
      selling_points: string[];
      resonance_scripts: string[];
      icebreaker_scripts: { script: string; why: string }[];
      objections: { issue: string; response: string }[];
      demo_interactions: { question: string; bridge: string; awakening: string }[];
    };
  });
}
