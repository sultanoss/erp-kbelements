import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import NewTaskForm from "./NewTaskForm";

export default async function NewTaskPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userName = user.user_metadata?.full_name ?? user.email ?? "";

  const { data: { users } } = await adminSupabase.auth.admin.listUsers();
  const userList = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: (u.user_metadata?.full_name as string) ?? "",
  }));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Neue Aufgabe erstellen</h1>
        <p className="text-stone-500 text-sm mt-0.5">Aufgabe beschreiben und zuweisen</p>
      </div>
      <NewTaskForm userName={userName} users={userList} />
    </div>
  );
}
