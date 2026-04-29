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
      const { data: saved, error: insertError } = await supabase
        .from("analysis")
        .insert({
          recording_id,
          tags: analysis.tags,
          motivation: analysis.motivation,
          personality: analysis.personality,
          opening_script: analysis.opening_script,
          selling_points: analysis.selling_points,
          objections: analysis.objections,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return NextResponse.json(saved);
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
