import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { transcribeAudio } from "@/lib/gemini";

const ALLOWED_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav"];

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const directTranscript = formData.get("transcript") as string | null;
    const userId = (formData.get("user_id") as string | null) ?? "00000000-0000-0000-0000-000000000001";

    if (!audioFile && !directTranscript) {
      return NextResponse.json({ error: "Missing audio or transcript" }, { status: 400 });
    }

    // Ensure demo user exists (upsert is safe when called concurrently)
    await supabase
      .from("users")
      .upsert({ id: userId, email: "demo@sales-ai.com" }, { onConflict: "id", ignoreDuplicates: true });

    let transcript: string;
    let audioUrl = "";

    if (audioFile) {
      // ── Audio path ──
      const mimeType = audioFile.type || "audio/mpeg";
      if (!ALLOWED_TYPES.includes(mimeType)) {
        return NextResponse.json({ error: "Only .mp3 and .wav are supported" }, { status: 415 });
      }

      const ext = audioFile.name.split(".").pop() ?? "mp3";
      const storagePath = `${userId}/${Date.now()}.${ext}`;
      const buffer = Buffer.from(await audioFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(storagePath, buffer, { contentType: mimeType });

      if (uploadError) throw uploadError;

      audioUrl = supabase.storage.from("recordings").getPublicUrl(storagePath).data.publicUrl;
      transcript = await transcribeAudio(buffer, mimeType);
    } else {
      // ── Text path ──
      transcript = directTranscript!.trim();
    }

    // Create recording row
    const { data: recording, error: insertError } = await supabase
      .from("recordings")
      .insert({ user_id: userId, audio_url: audioUrl, transcript, status: "done" })
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
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
