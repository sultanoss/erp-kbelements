import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import UserAdminClient from "./UserAdminClient";

export default async function UsersAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/returns");

  const { data: { users }, error } = await adminSupabase.auth.admin.listUsers();

  const userList = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: (u.user_metadata?.full_name as string) ?? "",
    role: ((u.app_metadata?.role as string) ?? "user") as "admin" | "user",
    created_at: u.created_at,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          Fehler beim Laden: {error.message}
        </div>
      )}
      <UserAdminClient users={userList} currentUserId={user.id} />
    </div>
  );
}
