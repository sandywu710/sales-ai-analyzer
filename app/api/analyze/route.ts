import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { analyzeTranscript } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const { recording_id, transcript: directTranscript } = await req.json();

    let transcript: string;

    if (recording_id) {
      // Idempotency: if analysis already exists, return it without calling Gemini
      const { data: existing } = await supabase
        .from("analysis")
        .select("*")
        .eq("recording_id", recording_id)
        .single();
      if (existing) {
        return NextResponse.json(existing);
      }

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
        icebreaker_scripts: analysis.icebreaker_scripts ?? [],
        objections: analysis.objections,
      };

      // Progressive fallback: full → without icebreaker → without both new columns
      let { data: saved, error: err1 } = await supabase
        .from("analysis").insert(fullPayload).select().single();

      if (err1) {
        const { icebreaker_scripts: _i, ...withoutIcebreaker } = fullPayload;
        const r2 = await supabase.from("analysis").insert(withoutIcebreaker).select().single();
        if (r2.error) {
          const { resonance_scripts: _r, icebreaker_scripts: _i2, ...basePayload } = fullPayload;
          const r3 = await supabase.from("analysis").insert(basePayload).select().single();
          if (r3.error) throw new Error(`DB insert failed: ${r3.error.message}`);
          saved = r3.data;
        } else {
          saved = r2.data;
        }
      }

      return NextResponse.json(saved);
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
