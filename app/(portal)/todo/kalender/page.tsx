import { createClient } from "@/lib/supabase/server";
import KalenderClient from "./KalenderClient";

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ monat?: string }>;
}) {
  const { monat } = await searchParams;
  const supabase = await createClient();

  const now = new Date();
  const [year, month] = monat
    ? monat.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: eintraege }, { data: settings }] = await Promise.all([
    supabase
      .from("kalender_eintraege")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .gte("date", firstOfMonth)
      .lte("date", lastOfMonth)
      .order("created_at"),
    supabase
      .from("user_settings")
      .select("ntfy_topic")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Terminkalender</h1>
      <KalenderClient
        eintraege={eintraege ?? []}
        year={year}
        month={month}
        userId={user?.id ?? ""}
        ntfyTopic={settings?.ntfy_topic ?? ""}
      />
    </div>
  );
}
