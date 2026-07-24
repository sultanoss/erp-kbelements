import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = user.app_metadata?.role === "admin";
  const userName = user.user_metadata?.full_name ?? user.email ?? "";

  const { data: ankuenfte } = await supabase
    .from("china_bestellungen")
    .select("id, fabrik, order_pi_nummer, lager_ankunft, angezahlt, bezahlt, verschifft")
    .not("lager_ankunft", "is", null)
    .order("lager_ankunft", { ascending: true });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Willkommen bei KB ELEMENTS Portal</h1>
        <p className="text-stone-500 text-sm mt-1">Hallo, {userName}</p>
      </div>

      {/* Ankünfte */}
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">
          Waren Ankünfte {ankuenfte && ankuenfte.length > 0 ? `(${ankuenfte.length})` : ""}
        </h2>

        {!ankuenfte || ankuenfte.length === 0 ? (
          <div className="card p-10 text-center">
            <svg className="w-10 h-10 mx-auto mb-3 text-stone-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-stone-400 text-sm">Keine Waren-Ankünfte eingetragen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ankuenfte.map((b) => {
              const cardContent = (
                <div className="card p-5 hover:shadow-md transition-shadow h-full">
                  <div className="text-sm font-semibold text-stone-800 truncate">
                    {b.fabrik ?? b.order_pi_nummer ?? "—"}
                  </div>
                  {b.order_pi_nummer && b.fabrik && (
                    <div className="text-xs text-stone-400 mt-0.5 font-mono truncate">{b.order_pi_nummer}</div>
                  )}
                  <div className="mt-4">
                    <div className="text-xs text-stone-500 uppercase tracking-wide mb-0.5">Waren Ankunft</div>
                    <div className="text-2xl font-bold text-stone-900">
                      {new Date(b.lager_ankunft!).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.angezahlt ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-400"}`}>
                      {b.angezahlt ? "Angezahlt" : "Offen"}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.bezahlt ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-400"}`}>
                      {b.bezahlt ? "Bezahlt" : "Unbezahlt"}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.verschifft ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-400"}`}>
                      {b.verschifft ? "Verschifft" : "Nicht verschifft"}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="mt-3 text-xs text-stone-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Packliste hochladen
                    </div>
                  )}
                </div>
              );

              return isAdmin ? (
                <Link key={b.id} href={`/china/bestellungen/${b.id}`} className="block h-full">
                  {cardContent}
                </Link>
              ) : (
                <div key={b.id}>{cardContent}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
