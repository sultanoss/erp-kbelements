import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewWareForm from "./NewWareForm";

export default async function NewWarePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const userName = user.user_metadata?.full_name ?? user.email ?? "";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-stone-500 mb-5">
        <Link href="/china/ware" className="hover:text-stone-700 transition-colors">Ware in China</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-stone-700 font-medium">Neuer Eintrag</span>
      </div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Ware in China — Neuer Eintrag</h1>
      <NewWareForm userName={userName} />
    </div>
  );
}
