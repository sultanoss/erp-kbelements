import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: media } = await supabase
    .from("china_media")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (!media) return new NextResponse("Not Found", { status: 404 });

  const { data: urlData } = await supabase.storage
    .from("china-media")
    .createSignedUrl(media.storage_path, 3600);

  if (!urlData?.signedUrl) return new NextResponse("Could not generate URL", { status: 500 });

  return NextResponse.redirect(urlData.signedUrl);
}
