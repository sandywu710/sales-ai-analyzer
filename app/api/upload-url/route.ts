import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const { filename, user_id } = await req.json();
    if (!filename || !user_id) {
      return NextResponse.json({ error: "Missing filename or user_id" }, { status: 400 });
    }

    const ext = filename.split(".").pop() ?? "mp3";
    const storagePath = `${user_id}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("recordings")
      .createSignedUploadUrl(storagePath);

    if (error) throw error;

    return NextResponse.json({ signed_url: data.signedUrl, path: storagePath, token: data.token });
  } catch (err) {
    console.error("[upload-url]", err);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
}
