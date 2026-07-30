import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: due } = await adminSupabase
    .from("kalender_eintraege")
    .select("id, title, description, user_id")
    .lte("reminder_at", now)
    .eq("reminder_sent", false);

  if (!due?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const entry of due) {
    const { data: settings } = await adminSupabase
      .from("user_settings")
      .select("ntfy_topic")
      .eq("user_id", entry.user_id)
      .single();

    if (settings?.ntfy_topic) {
      await fetch(`https://ntfy.sh/${settings.ntfy_topic}`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "Title": "KB Portal Erinnerung",
          "Priority": "default",
        },
        body: entry.description
          ? `${entry.title}\n${entry.description}`
          : entry.title,
      });
      sent++;
    }

    await adminSupabase
      .from("kalender_eintraege")
      .update({ reminder_sent: true })
      .eq("id", entry.id);
  }

  return NextResponse.json({ sent, total: due.length });
}
