import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { analyzeTrust } from "@/lib/gemini";
import { getActiveRubric } from "@/lib/rubrics";
import { normalizeTrust } from "@/lib/trust";
import { mimeFromPath, storagePathFromUrl } from "@/lib/audio";

export const maxDuration = 300;

// 邀約 Call 信任度分析：用「目前使用中」的評分標準，音檔直接給 Gemini 聽
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  try {
    const { recording_id } = await req.json();
    if (!recording_id) return NextResponse.json({ error: "缺少 recording_id" }, { status: 400 });

    const { data: rec, error } = await supabase.from("recordings").select("*").eq("id", recording_id).single();
    if (error || !rec) return NextResponse.json({ error: "找不到這筆紀錄" }, { status: 404 });

    const rubric = await getActiveRubric(supabase);

    // 優先用音檔；舊紀錄或下載失敗就退回逐字稿
    let audio: { buffer: Buffer; mimeType: string } | undefined;
    const path = rec.storage_path ?? storagePathFromUrl(rec.audio_url);
    if (path) {
      const { data: file } = await supabase.storage.from("recordings").download(path);
      if (file) audio = { buffer: Buffer.from(await file.arrayBuffer()), mimeType: mimeFromPath(path) };
    }
    if (!audio && !rec.transcript) {
      return NextResponse.json({ error: "這筆紀錄沒有音檔也沒有逐字稿，無法分析" }, { status: 400 });
    }

    const duration = rec.duration_seconds ?? null;
    const { raw, model } = await analyzeTrust({ audio, transcript: rec.transcript ?? "" }, rubric, duration);
    const result = normalizeTrust(raw, rubric, { hasAudio: !!audio, durationSeconds: duration });

    const { data: saved, error: insErr } = await supabase
      .from("call_trust_analysis")
      .insert({
        recording_id,
        rubric_id: rubric.id,
        rubric_name: rubric.name,
        total_score: result.total_score,
        trust_level: result.trust_level,
        call_duration_seconds: result.call_duration_seconds,
        source: result.source,
        model_used: model,
        result,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // 舊紀錄沒存通話長度的，順便補上
    if (!rec.duration_seconds && result.call_duration_seconds) {
      await supabase.from("recordings").update({ duration_seconds: result.call_duration_seconds }).eq("id", recording_id);
    }

    return NextResponse.json(saved);
  } catch (err) {
    console.error("[trust-analyze]", err);
    const msg = String(err instanceof Error ? err.message : err);
    const friendly = msg.includes("429") ? "Gemini 免費額度暫時用完，請稍後再試" : msg;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
