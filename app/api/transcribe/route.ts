import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { transcribeAudio } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const body = await req.json();
    const { storage_path, user_id, transcript: directTranscript } = body;

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

    if (storage_path) {
      // Download file from Supabase Storage (server-side, no size limit)
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

    // Create recording row
    const { data: recording, error: insertError } = await supabase
      .from("recordings")
      .insert({ user_id: resolvedUserId, audio_url: audioUrl, transcript, status: "done" })
      .select()
      .single();

    if (insertError) throw insertError;
    const recordingId = (recording as { id: string }).id;

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
