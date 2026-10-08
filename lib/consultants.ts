import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CONSULTANTS } from "./default-data";

export interface Consultant {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

// 第一次使用時自動建立 9 位預設顧問
export async function listConsultants(supabase: SupabaseClient): Promise<Consultant[]> {
  const { data, error } = await supabase
    .from("sales_consultants")
    .select("id, name, active, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (data && data.length > 0) return data as Consultant[];

  const { data: seeded, error: seedErr } = await supabase
    .from("sales_consultants")
    .insert(DEFAULT_CONSULTANTS.map((name, i) => ({ name, sort_order: i })))
    .select("id, name, active, sort_order");
  if (seedErr) throw seedErr;
  return seeded as Consultant[];
}

// 資料庫是否已經跑過 optimize-v2 的設定 SQL
export async function isSchemaReady(supabase: SupabaseClient) {
  const checks = await Promise.all([
    supabase.from("sales_consultants").select("id").limit(1),
    supabase.from("sales_rubrics").select("id").limit(1),
    supabase.from("call_trust_analysis").select("id").limit(1),
    supabase.from("recordings").select("consultant_id, customer_alias, duration_seconds, storage_path").limit(1),
  ]);
  return checks.every((c) => !c.error);
}
