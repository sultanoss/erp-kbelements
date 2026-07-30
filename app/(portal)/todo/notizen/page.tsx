import { createClient } from "@/lib/supabase/server";
import NotizenClient from "./NotizenClient";

export default async function NotizenPage() {
  const supabase = await createClient();

  const [{ data: notizen }, { data: { user } }] = await Promise.all([
    supabase.from("notizen").select("*").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notizen</h1>
      <NotizenClient notizen={notizen ?? []} userId={user?.id ?? ""} />
    </div>
  );
}
