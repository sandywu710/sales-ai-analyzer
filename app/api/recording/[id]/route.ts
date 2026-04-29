import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  try {
    // Get audio_url for storage cleanup
    const { data: rec } = await supabase
      .from("recordings")
      .select("audio_url")
      .eq("id", id)
      .single();

    // Delete analysis first (references recordings)
    await supabase.from("analysis").delete().eq("recording_id", id);

    // Delete recording row
    const { error } = await supabase.from("recordings").delete().eq("id", id);
    if (error) throw error;

    // Best-effort: delete file from Supabase Storage
    if (rec?.audio_url) {
      try {
        const url = new URL(rec.audio_url);
        const marker = "/object/public/recordings/";
        const idx = url.pathname.indexOf(marker);
        if (idx !== -1) {
          const storagePath = url.pathname.slice(idx + marker.length);
          await supabase.storage.from("recordings").remove([storagePath]);
        }
      } catch {
        // Storage cleanup failure is non-fatal
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delete-recording]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
