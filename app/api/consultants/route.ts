import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { listConsultants } from "@/lib/consultants";

export async function GET() {
  try {
    return NextResponse.json(await listConsultants(createServerSupabaseClient()));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// 新增顧問
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "請輸入名字" }, { status: 400 });
  const all = await listConsultants(supabase);
  const { data, error } = await supabase
    .from("sales_consultants")
    .insert({ name: name.trim(), sort_order: all.length })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 改名或停用／啟用（不提供刪除，舊資料才會一直保留）
export async function PATCH(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { id, name, active } = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (typeof active === "boolean") patch.active = active;
  const { data, error } = await supabase.from("sales_consultants").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
