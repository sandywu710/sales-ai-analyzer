import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { analyzeTranscript } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const { recording_id, transcript: directTranscript } = await req.json();

    let transcript: string;

    if (recording_id) {
      const { data, error } = await supabase
        .from("recordings")
        .select("transcript")
        .eq("id", recording_id)
        .single();

      if (error || !(data as { transcript: string | null })?.transcript) {
        return NextResponse.json(
          { error: "Recording not found or transcript missing" },
          { status: 404 }
        );
      }
      transcript = (data as { transcript: string }).transcript;
    } else if (directTranscript) {
      transcript = directTranscript;
    } else {
      return NextResponse.json(
        { error: "Provide recording_id or transcript" },
        { status: 400 }
      );
    }

    const analysis = await analyzeTranscript(transcript);

    if (recording_id) {
      const fullPayload = {
        recording_id,
        tags: analysis.tags,
        motivation: analysis.motivation,
        personality: analysis.personality,
        opening_script: analysis.opening_script,
        selling_points: analysis.selling_points,
        resonance_scripts: analysis.resonance_scripts ?? [],
        objections: analysis.objections,
      };

      let { data: saved, error: insertError } = await supabase
        .from("analysis")
        .insert(fullPayload)
        .select()
        .single();

      // Graceful fallback: if resonance_scripts column doesn't exist yet, retry without it
      if (insertError) {
        console.warn("[analyze] full insert failed, retrying without resonance_scripts:", insertError.message);
        const { resonance_scripts: _omit, ...fallbackPayload } = fullPayload;
        const fb = await supabase
          .from("analysis")
          .insert(fallbackPayload)
          .select()
          .single();
        if (fb.error) throw new Error(`DB insert failed: ${fb.error.message}`);
        saved = fb.data;
      }

      return NextResponse.json(saved);
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
