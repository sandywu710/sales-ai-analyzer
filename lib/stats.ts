// 統計儀表板的計算邏輯（不含畫面）

import type { TrustResult } from "./trust";
import { stageCompletion } from "./trust";
import { MOTIVES, SEGMENTS, DISC } from "./taxonomy";

export interface StatRow {
  recording_id: string;
  consultant_id: string | null;
  call_date: string;
  score100: number;
  duration: number | null;
  result: TrustResult;
}

export const DIMENSIONS = [
  { key: "motive_primary", title: "主要動機", options: MOTIVES.map((o) => o.label) },
  { key: "segment", title: "客群", options: SEGMENTS.map((o) => o.label) },
  { key: "disc", title: "個性（DISC）", options: DISC.map((o) => o.label) },
] as const;
export type DimKey = (typeof DIMENSIONS)[number]["key"];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function toScore100(total: number, max: number) {
  return max > 0 ? Math.round((total / max) * 100) : 0;
}

// 同一通電話分析多次，只取最新一次
export function latestPerRecording<T extends { recording_id: string; created_at: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const r of rows) {
    const cur = map.get(r.recording_id);
    if (!cur || r.created_at > cur.created_at) map.set(r.recording_id, r);
  }
  return [...map.values()];
}

export function distribution(rows: StatRow[], key: DimKey) {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const v = r.result.classification?.[key];
    if (v) counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

export function consultantSummary(rows: StatRow[]) {
  const durations = rows.map((r) => r.duration).filter((d): d is number => d != null);
  const softener = rows.reduce((s, r) => s + (r.result.softener?.count ?? 0), 0);
  const interrogation = rows.reduce((s, r) => s + (r.result.interrogation?.count ?? 0), 0);
  return {
    count: rows.length,
    avgScore: avg(rows.map((r) => r.score100)),
    avgDuration: avg(durations),
    stageRate: avg(rows.map((r) => stageCompletion(r.result))),
    softener,
    interrogation,
    dist: Object.fromEntries(DIMENSIONS.map((d) => [d.key, distribution(rows, d.key)])) as Record<DimKey, Record<string, number>>,
  };
}

// 交叉分析：每個分類選項的平均信任分數
export function crossAverages(rows: StatRow[], key: DimKey, options: readonly string[]) {
  return options
    .map((opt) => {
      const xs = rows.filter((r) => r.result.classification?.[key] === opt).map((r) => r.score100);
      return { label: opt, count: xs.length, avg: avg(xs) };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
}
