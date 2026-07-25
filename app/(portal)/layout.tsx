import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalShell from "@/components/PortalShell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userName = user.user_metadata?.full_name ?? user.email ?? "Mitarbeiter";
  const isAdmin = user.app_metadata?.role === "admin";

  return (
    <PortalShell userName={userName} userEmail={user.email ?? ""} isAdmin={isAdmin}>
      {children}
    </PortalShell>
  );
}
