import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_RUBRIC } from "./default-data";

export interface RubricDimension {
  key: string;
  name: string;
  basis: string; // 內容 / 聲音 / 內容＋聲音
  max_score: number;
  description: string;
}

export interface RubricLevel {
  min: number;
  label: string;
}

export interface Rubric {
  id: string;
  name: string;
  background: string;
  dimensions: RubricDimension[];
  levels: RubricLevel[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function rubricTotal(r: Pick<Rubric, "dimensions">) {
  return r.dimensions.reduce((s, d) => s + (Number(d.max_score) || 0), 0);
}

export function levelFor(score: number, levels: RubricLevel[]) {
  const sorted = [...levels].sort((a, b) => a.min - b.min);
  let label = sorted[0]?.label ?? "";
  for (const l of sorted) if (score >= l.min) label = l.label;
  return label;
}

// 第一次使用時自動建立「Sandy 版 v1」
export async function listRubrics(supabase: SupabaseClient): Promise<Rubric[]> {
  const { data, error } = await supabase
    .from("sales_rubrics")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (data && data.length > 0) return data as Rubric[];

  const { data: seeded, error: seedErr } = await supabase
    .from("sales_rubrics")
    .insert(DEFAULT_RUBRIC)
    .select();
  if (seedErr) throw seedErr;
  return seeded as Rubric[];
}

export async function getActiveRubric(supabase: SupabaseClient): Promise<Rubric> {
  const all = await listRubrics(supabase);
  return all.find((r) => r.is_active) ?? all[0];
}
