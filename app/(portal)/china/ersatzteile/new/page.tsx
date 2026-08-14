import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewErsatzteilForm from "./NewErsatzteilForm";

export default async function NewErsatzteilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Ersatzteil anlegen</h1>
      <NewErsatzteilForm userName={user.email ?? "unbekannt"} />
    </div>
  );
}
