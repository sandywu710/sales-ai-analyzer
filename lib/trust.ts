// 信任度分析結果：型別定義 + 把 AI 回傳內容整理成固定格式（防止 AI 亂填）

import type { Rubric } from "./rubrics";
import { levelFor } from "./rubrics";
import { CLASSIFICATION_FIELDS, type ClassificationKey } from "./taxonomy";
import { STAGES, STUDENT_INFO_FIELDS } from "./trust-prompt";

export interface Evidence { time: string; reason: string }
export interface Quote { time: string; text: string }

export interface TrustResult {
  source: "audio" | "transcript";
  speakers: { consultant: string; customer: string };
  call_duration_seconds: number | null;
  dimensions: {
    key: string; name: string; basis: string;
    score: number; max_score: number; summary: string; evidence: Evidence[];
  }[];
  total_score: number;
  max_total: number;
  trust_level: string;
  stages: { key: string; name: string; ideal: string; start: string | null; status: "有" | "部分" | "沒有"; note: string }[];
  trust_curve: { early: { score: number; note: string }; middle: { score: number; note: string }; late: { score: number; note: string } };
  pain_keywords: { keyword: string; time: string; quote: string }[];
  softener: { count: number; examples: Quote[] };
  interrogation: { count: number; examples: Quote[] };
  key_moments: { up: Evidence[]; down: Evidence[] };
  coach_tip: string;
  student_info?: Record<string, string>; // 舊分析沒有這欄
  classification: Record<ClassificationKey, string | null>;
  classification_evidence: Partial<Record<ClassificationKey, Evidence>>;
  demo_advice: { angle: string; disc_tip: string };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const str = (v: any, d = "") => (typeof v === "string" ? v.trim() : v == null ? d : String(v));
const int = (v: any, min: number, max: number) => {
  const n = Math.round(Number(v));
  return isNaN(n) ? min : Math.min(max, Math.max(min, n));
};
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const ev = (v: any): Evidence => ({ time: str(v?.time, "—"), reason: str(v?.reason ?? v?.text) });
const quote = (v: any): Quote => ({ time: str(v?.time, "—"), text: str(v?.text ?? v?.reason) });

export function normalizeTrust(raw: any, rubric: Rubric, opts: { hasAudio: boolean; durationSeconds?: number | null }): TrustResult {
  const rawDims = arr(raw?.dimensions);
  const dimensions = rubric.dimensions.map((d, i) => {
    const r = rawDims.find((x) => x?.key === d.key) ?? rawDims.find((x) => x?.name === d.name) ?? rawDims[i] ?? {};
    return {
      key: d.key, name: d.name, basis: d.basis,
      max_score: Number(d.max_score),
      score: int(r.score, 0, Number(d.max_score)),
      summary: str(r.summary),
      evidence: arr(r.evidence).map(ev),
    };
  });
  const total = dimensions.reduce((s, d) => s + d.score, 0);
  const maxTotal = dimensions.reduce((s, d) => s + d.max_score, 0);
  // 若標準總分不是 100，換算成 100 分制再判斷等級
  const score100 = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  const rawStages = arr(raw?.stages);
  const stages = STAGES.map((s, i) => {
    const r = rawStages.find((x) => x?.key === s.key) ?? rawStages[i] ?? {};
    const status = ["有", "部分", "沒有"].includes(r.status) ? r.status : "沒有";
    const start = r.start && r.start !== "null" ? str(r.start) : null;
    return { key: s.key, name: s.name, ideal: s.ideal, start, status, note: str(r.note) };
  });

  const classification = {} as Record<ClassificationKey, string | null>;
  const classification_evidence: Partial<Record<ClassificationKey, Evidence>> = {};
  for (const f of CLASSIFICATION_FIELDS) {
    const v = raw?.classification?.[f.key];
    const ok = (f.options as readonly string[]).includes(v);
    const isOptional = "optional" in f && f.optional;
    classification[f.key] = ok ? v : isOptional ? null : f.options[f.options.length - 1];
    const e = raw?.classification_evidence?.[f.key];
    if (e) classification_evidence[f.key] = ev(e);
  }
  if (classification.motive_secondary === classification.motive_primary) classification.motive_secondary = null;

  const curve = (v: any) => ({ score: int(v?.score, 0, 100), note: str(v?.note) });

  const duration = opts.durationSeconds ?? (Number(raw?.call_duration_seconds) || null);

  return {
    source: opts.hasAudio ? "audio" : "transcript",
    speakers: { consultant: str(raw?.speakers?.consultant), customer: str(raw?.speakers?.customer) },
    call_duration_seconds: duration ? Math.round(duration) : null,
    dimensions,
    total_score: total,
    max_total: maxTotal,
    trust_level: levelFor(score100, rubric.levels),
    stages,
    trust_curve: { early: curve(raw?.trust_curve?.early), middle: curve(raw?.trust_curve?.middle), late: curve(raw?.trust_curve?.late) },
    pain_keywords: arr(raw?.pain_keywords).map((k) => ({ keyword: str(k?.keyword), time: str(k?.time, "—"), quote: str(k?.quote) })).filter((k) => k.keyword),
    softener: { count: int(raw?.softener?.count, 0, 999), examples: arr(raw?.softener?.examples).map(quote) },
    interrogation: { count: int(raw?.interrogation?.count, 0, 999), examples: arr(raw?.interrogation?.examples).map(quote) },
    key_moments: { up: arr(raw?.key_moments?.up).slice(0, 3).map(ev), down: arr(raw?.key_moments?.down).slice(0, 3).map(ev) },
    coach_tip: str(raw?.coach_tip),
    student_info: Object.fromEntries(STUDENT_INFO_FIELDS.map((f) => [f.key, str(raw?.student_info?.[f.key])])),
    classification,
    classification_evidence,
    demo_advice: { angle: str(raw?.demo_advice?.angle), disc_tip: str(raw?.demo_advice?.disc_tip) },
  };
}

// 四階段完成率：有=1、部分=0.5、沒有=0
export function stageCompletion(r: Pick<TrustResult, "stages">) {
  if (!r.stages?.length) return 0;
  const pts = r.stages.reduce((s, st) => s + (st.status === "有" ? 1 : st.status === "部分" ? 0.5 : 0), 0);
  return pts / r.stages.length;
}
