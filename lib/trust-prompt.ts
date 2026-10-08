// ============================================================
// 邀約 Call 信任度分析：送給 Gemini 的提示詞
// 評分面向、配分、說明「不寫在這裡」，而是從資料庫的「目前使用中」評分標準讀取。
// 這裡只放固定的說明文字與輸出格式，想調整語氣或要求可以直接改中文。
// ============================================================

import type { Rubric } from "./rubrics";
import { CLASSIFICATION_FIELDS, MOTIVES, SEGMENTS, DISC, MOTIVE_DEMO_ANGLE, DISC_TALK_TIP } from "./taxonomy";

// 四階段（理想時間點只是參考）
export const STAGES = [
  { key: "icebreak", name: "破冰與角色設定", ideal: "0:00–0:15" },
  { key: "chat", name: "閒聊放下警戒", ideal: "約 1–2 分鐘" },
  { key: "pain", name: "痛點放大（推拉）", ideal: "約 3–6 分鐘" },
  { key: "invite", name: "塑造價值與邀約", ideal: "約 7–10 分鐘" },
];

// 通話長度建議範圍（秒）
export const IDEAL_DURATION = { min: 8 * 60, max: 12 * 60 };

export function buildTrustPrompt(
  rubric: Rubric,
  opts: { hasAudio: boolean; durationSeconds?: number | null }
) {
  const dims = rubric.dimensions
    .map(
      (d, i) =>
        `${i + 1}. 【key: ${d.key}】${d.name}（${d.max_score} 分）—— 判斷依據：${d.basis}\n${d.description}`
    )
    .join("\n\n");

  const levels = [...rubric.levels]
    .sort((a, b) => a.min - b.min)
    .map((l) => `${l.min} 分以上：${l.label}`)
    .join("｜");

  const classList = CLASSIFICATION_FIELDS.map(
    (f) => `- ${f.key}（${f.title}）：只能從 [${f.options.map((o) => `"${o}"`).join(", ")}] 選一個${
      "optional" in f && f.optional ? "，沒有就填 null" : ""
    }`
  ).join("\n");

  const optionHints = [
    "主要動機說明：" + MOTIVES.map((o) => `${o.label}＝${o.hint}`).join("；"),
    "客群說明：" + SEGMENTS.map((o) => `${o.label}＝${o.hint}`).join("；"),
    "DISC 說明：" + DISC.map((o) => `${o.label}＝${o.hint}`).join("；"),
  ].join("\n");

  const angleHints = Object.entries(MOTIVE_DEMO_ANGLE).map(([k, v]) => `${k} → ${v}`).join("\n");
  const discHints = Object.entries(DISC_TALK_TIP).map(([k, v]) => `${k} → ${v}`).join("\n");

  const sourceNote = opts.hasAudio
    ? `你會「直接聽到」通話錄音。
重要：標示「聲音」的項目，只根據音調、語速、停頓、笑聲、音量變化判斷，不要只看文字內容。
請先分辨哪個聲音是顧問（打電話的業務、介紹課程的人）、哪個是客戶（填表單的人）。`
    : `這次「沒有音檔」，只有逐字稿。標示「聲音」的項目只能依文字線索（回答長短、語助詞、笑聲標記）推估，
請在該項的證據原因開頭加上「（無音檔，依文字推估）」。`;

  const durationNote = opts.durationSeconds
    ? `這通電話實際長度是 ${Math.round(opts.durationSeconds)} 秒，時間點不可以超過這個長度。`
    : `請自己判斷通話總長度（秒）。`;

  return `你是一位資深的電話銷售教練，專門評估「線上 UIUX 設計課程」的邀約電話。你要評估「客戶對顧問的信任度」。

【通話背景】
${rubric.background}

【分析方式】
${sourceNote}
${durationNote}
每一個評分都必須附「時間點 mm:ss + 原因」當證據。時間點用 mm:ss 格式（例如 03:25）。

【評分標準：${rubric.name}（總分 ${rubric.dimensions.reduce((s, d) => s + Number(d.max_score), 0)}）】
${dims}

信任等級：${levels}

【四階段時間軸】
${STAGES.map((s) => `- key: ${s.key}，${s.name}（理想：${s.ideal}）`).join("\n")}
每個階段請給：實際開始時間 start（mm:ss，沒做到填 null）、status 只能是 "有" / "部分" / "沒有"、note 一句說明。

【其他要抓的】
- trust_curve：把通話平均切成前段、中段、後段，各給 0–100 的信任分數和一句說明
- pain_keywords：客戶親口說出的痛點／渴望關鍵字（例如：加班、薪水低、迷茫、想出國、沒自由），附時間點和客戶原話。這些是 Demo 要用的錨點
- softener：顧問使用軟性語助詞開頭（「我好奇……」「我不曉得……」「我不確定……」等）的次數與例句
- interrogation：顧問說出質問句（例如「你為什麼填表單？」「你到底要不要？」）的次數與例句
- key_moments：2–3 個信任「上升」的時間點、2–3 個信任「下降」的時間點，各附一句原因
- coach_tip：一句教練建議，下一通電話最該改的一件事

【客戶歸類：一定要從固定選項中選，不能自由發揮】
${classList}
${optionHints}
每個歸類都要在 classification_evidence 附「判斷依據＋時間點」。

【Demo 應對建議】
demo_advice.angle：依主要動機寫切入角度（要帶入這通電話的具體內容）：
${angleHints}
demo_advice.disc_tip：依 DISC 個性補一句說話方式的建議：
${discHints}

【輸出】只輸出以下 JSON，不要有任何其他文字。dimensions 必須包含上面每一個 key，score 是整數且不可超過該項配分。
{
  "speakers": { "consultant": "顧問的聲音特徵（例如：女聲、語速中等）", "customer": "客戶的聲音特徵" },
  "call_duration_seconds": 600,
  "dimensions": [
    { "key": "string", "score": 0, "summary": "一句總評", "evidence": [ { "time": "mm:ss", "reason": "string" } ] }
  ],
  "stages": [
    { "key": "icebreak", "start": "mm:ss 或 null", "status": "有", "note": "string" }
  ],
  "trust_curve": {
    "early": { "score": 0, "note": "string" },
    "middle": { "score": 0, "note": "string" },
    "late": { "score": 0, "note": "string" }
  },
  "pain_keywords": [ { "keyword": "string", "time": "mm:ss", "quote": "客戶原話" } ],
  "softener": { "count": 0, "examples": [ { "time": "mm:ss", "text": "string" } ] },
  "interrogation": { "count": 0, "examples": [ { "time": "mm:ss", "text": "string" } ] },
  "key_moments": {
    "up": [ { "time": "mm:ss", "reason": "string" } ],
    "down": [ { "time": "mm:ss", "reason": "string" } ]
  },
  "coach_tip": "string",
  "classification": {
    "motive_primary": "string", "motive_secondary": null, "segment": "string", "disc": "string",
    "initial_guard": "string", "motive_strength": "string", "budget_sensitivity": "string", "decision_maker": "string"
  },
  "classification_evidence": {
    "motive_primary": { "time": "mm:ss", "reason": "string" }
  },
  "demo_advice": { "angle": "string", "disc_tip": "string" }
}`;
}
