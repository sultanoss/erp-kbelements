import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewReturnForm from "./NewReturnForm";

export default async function NewReturnPage() {
  const supabase = await createClient();

  const [{ data: { user } }, { data: skus }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("skus").select("sku, name").eq("active", true).order("sku"),
  ]);

  if (!user) redirect("/login");

  const userName = user.user_metadata?.full_name ?? user.email ?? "";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Neue Retoure erfassen</h1>
        <p className="text-stone-500 text-sm mt-0.5">Retoure dokumentieren und SKUs zuweisen</p>
      </div>
      <NewReturnForm skus={skus ?? []} userName={userName} />
    </div>
  );
}
