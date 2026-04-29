import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

function getClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Transcribe audio using Gemini 1.5 Flash multimodal
export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: SAFETY,
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: buffer.toString("base64"),
      },
    },
    "請將此音訊完整逐字轉錄為繁體中文。只輸出逐字稿內容，不要加任何說明或標點以外的文字。",
  ]);

  return result.response.text().trim();
}

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
  const model = getClient().getGenerativeModel({
    model: "gemini-1.5-flash",
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
}
