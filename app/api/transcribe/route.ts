import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { transcribeAudio } from "@/lib/gemini";

// Extract a human-readable name from a filename.
// "2026-04-28 14-47-36 +886903622779.mp3" → "+886903622779"
// "小明.mp3" → "小明"
function extractName(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, "").trim();
  const parts = base.split(/\s+/);
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    // Looks like a phone number (starts with + or digit, at least 6 digits)
    if (/^[+\d]/.test(last) && last.replace(/\D/g, "").length >= 6) {
      return last;
    }
  }
  return base;
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const body = await req.json();
    const { storage_path, user_id, transcript: directTranscript, filename } = body;

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
    const name = filename ? extractName(filename) : "手動輸入";

    if (storage_path) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("recordings")
        .download(storage_path);

      if (downloadError) throw downloadError;

      audioUrl = supabase.storage.from("recordings").getPublicUrl(storage_path).data.publicUrl;

      const ext = storage_path.split(".").pop()?.toLowerCase() ?? "mp3";
      const mimeType = ext === "wav" ? "audio/wav" : "audio/mpeg";
      const buffer = Buffer.from(await fileData.arrayBuffer());

      transcript = await transcribeAudio(buffer, mimeType);
    } else {
      transcript = directTranscript.trim();
    }

    // Try insert with name; fall back without if column doesn't exist yet
    let recordingId: string;
    const { data: recording, error: insertError } = await supabase
      .from("recordings")
      .insert({ user_id: resolvedUserId, audio_url: audioUrl, transcript, status: "done", name })
      .select()
      .single();

    if (insertError) {
      // name column may not exist yet — retry without it
      const fb = await supabase
        .from("recordings")
        .insert({ user_id: resolvedUserId, audio_url: audioUrl, transcript, status: "done" })
        .select()
        .single();
      if (fb.error) throw fb.error;
      recordingId = (fb.data as { id: string }).id;
    } else {
      recordingId = (recording as { id: string }).id;
    }

    // Auto-trigger analysis
    const origin = req.nextUrl.origin;
    const analyzeRes = await fetch(`${origin}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recording_id: recordingId }),
    });

    const analysisResult = analyzeRes.ok ? await analyzeRes.json() : null;

    return NextResponse.json({ recording_id: recordingId, transcript, analysis: analysisResult });
  } catch (err) {
    console.error("[transcribe]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
