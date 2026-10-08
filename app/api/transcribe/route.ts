import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { transcribeAudio } from "@/lib/gemini";
import { mimeFromPath } from "@/lib/audio";

export const maxDuration = 300;

// Extract a human-readable name from a filename.
// Priority: Chinese characters → phone number → fallback empty (UI shows "未知")
// "2026-04-28 14-47-36 +886903622779.mp3" → "+886903622779"
// "小明.mp3" → "小明"
// "John Smith.mp3" → "John Smith"
function extractName(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, "").trim();

  // 1. Chinese characters — grab first continuous Chinese sequence
  const chinese = base.match(/[一-龥]{1,10}/);
  if (chinese) return chinese[0];

  // 2. Phone number — scan segments from right, look for 8+ digits
  const segments = base.split(/\s+/);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (/^[+\d(]/.test(seg) && seg.replace(/\D/g, "").length >= 8) {
      return seg;
    }
  }

  // 3. If not a timestamp-only string, use the full base as a name
  if (!/^\d{4}[-/]\d{2}[-/]\d{2}/.test(base)) {
    return base;
  }

  return ""; // UI will display "未知"
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const body = await req.json();
    const { storage_path, user_id, transcript: directTranscript, filename, consultant_id, customer_alias, duration_seconds } = body;

    const resolvedUserId = user_id ?? "00000000-0000-0000-0000-000000000001";

    if (!storage_path && !directTranscript) {
      return NextResponse.json({ error: "Missing storage_path or transcript" }, { status: 400 });
    }

    // Ensure demo user exists
    await supabase
      .from("users")
      .upsert({ id: resolvedUserId, email: "demo@sales-ai.com" }, { onConflict: "id", ignoreDuplicates: true });

    let transcript: string;
    let audioUrl = "";
    const alias = typeof customer_alias === "string" ? customer_alias.trim() : "";
    const name = alias || (filename ? extractName(filename) : "手動輸入");

    if (storage_path) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("recordings")
        .download(storage_path);

      if (downloadError) throw downloadError;

      audioUrl = supabase.storage.from("recordings").getPublicUrl(storage_path).data.publicUrl;

      const mimeType = mimeFromPath(storage_path);
      const buffer = Buffer.from(await fileData.arrayBuffer());

      transcript = await transcribeAudio(buffer, mimeType);
    } else {
      transcript = directTranscript.trim();
    }

    // 依序嘗試：含顧問等新欄位 → 含 name → 最基本欄位（資料庫還沒更新時也能用）
    const base = { user_id: resolvedUserId, audio_url: audioUrl, transcript, status: "done" };
    const attempts = [
      {
        ...base, name,
        consultant_id: consultant_id || null,
        customer_alias: alias || null,
        duration_seconds: Number(duration_seconds) ? Math.round(Number(duration_seconds)) : null,
        storage_path: storage_path || null,
      },
      { ...base, name },
      base,
    ];
    let recordingId = "";
    let lastErr: unknown = null;
    for (const payload of attempts) {
      const { data, error } = await supabase.from("recordings").insert(payload).select().single();
      if (!error) { recordingId = (data as { id: string }).id; break; }
      lastErr = error;
    }
    if (!recordingId) throw lastErr;

    // Auto-trigger analysis
    const origin = req.nextUrl.origin;
    const analyzeRes = await fetch(`${origin}/api/analyze`, {
      method: "POST",
      // 帶上原本的 cookie，預覽網站有登入保護時內部呼叫才不會被擋
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
      body: JSON.stringify({ recording_id: recordingId }),
    });

    const analysisResult = analyzeRes.ok ? await analyzeRes.json() : null;

    return NextResponse.json({ recording_id: recordingId, transcript, analysis: analysisResult });
  } catch (err) {
    console.error("[transcribe]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
