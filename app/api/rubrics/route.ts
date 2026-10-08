import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { listRubrics, type Rubric } from "@/lib/rubrics";

export async function GET() {
  try {
    return NextResponse.json(await listRubrics(createServerSupabaseClient()));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// action: "copy"（複製成新版本）或 "activate"（設為使用中）
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { action, id, name } = await req.json();
  const { data: src, error } = await supabase.from("sales_rubrics").select("*").eq("id", id).single();
  if (error || !src) return NextResponse.json({ error: "找不到這個版本" }, { status: 404 });

  if (action === "copy") {
    const r = src as Rubric;
    const { data, error: e } = await supabase
      .from("sales_rubrics")
      .insert({
        name: name?.trim() || `${r.name}（複製）`,
        background: r.background,
        dimensions: r.dimensions,
        levels: r.levels,
        is_active: false,
      })
      .select()
      .single();
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === "activate") {
    await supabase.from("sales_rubrics").update({ is_active: false }).neq("id", id);
    const { data, error: e } = await supabase.from("sales_rubrics").update({ is_active: true }).eq("id", id).select().single();
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "未知的動作" }, { status: 400 });
}

// 儲存修改
export async function PATCH(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { id, name, background, dimensions, levels } = await req.json();
  const { data, error } = await supabase
    .from("sales_rubrics")
    .update({ name, background, dimensions, levels, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
