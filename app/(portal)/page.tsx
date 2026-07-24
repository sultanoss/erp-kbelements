import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userName = user.user_metadata?.full_name ?? user.email ?? "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const [
    { count: retourenHeute },
    { count: schadenHeute },
    { data: ankuenfte },
  ] = await Promise.all([
    supabase.from("returns").select("*", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
    supabase.from("schadenmeldungen").select("*", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
    supabase.from("china_bestellungen")
      .select("id, lager_ankunft, lager_ankunft_uhrzeiten, abgeladen")
      .not("lager_ankunft", "is", null)
      .order("lager_ankunft", { ascending: true }),
  ]);

  // Packliste-Dateien für alle Ankünfte laden
  const ids = ankuenfte?.map((b) => b.id) ?? [];
  const packlisteByBestellung: Record<string, Array<{ id: string; filename: string }>> = {};
  if (ids.length > 0) {
    const { data: packlisteFiles } = await supabase
      .from("china_media")
      .select("id, bestellung_id, filename")
      .in("bestellung_id", ids)
      .eq("media_type", "packliste");
    for (const f of packlisteFiles ?? []) {
      if (!packlisteByBestellung[f.bestellung_id]) packlisteByBestellung[f.bestellung_id] = [];
      packlisteByBestellung[f.bestellung_id].push({ id: f.id, filename: f.filename });
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Willkommen bei KB ELEMENTS Portal</h1>
        <p className="text-stone-500 text-sm mt-1">Hallo, {userName}</p>
      </div>

      {/* Statistiken heute */}
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
        <div className="card p-5">
          <div className="text-3xl font-bold text-stone-900">{retourenHeute ?? 0}</div>
          <div className="text-xs text-stone-500 mt-1 uppercase tracking-wide">Retouren heute</div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-bold text-stone-900">{schadenHeute ?? 0}</div>
          <div className="text-xs text-stone-500 mt-1 uppercase tracking-wide">Schadenmeldungen heute</div>
        </div>
      </div>

      {/* Waren Ankünfte */}
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">
          Waren Ankünfte{ankuenfte && ankuenfte.length > 0 ? ` (${ankuenfte.length})` : ""}
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
              const uhrzeiten = [...((b.lager_ankunft_uhrzeiten as string[] | null) ?? [])].sort();
              const files = packlisteByBestellung[b.id] ?? [];
              return (
                <div key={b.id} className="card p-5">
                  <div className="text-xs text-stone-500 uppercase tracking-wide mb-2">Waren Ankunft</div>
                  <div className="text-2xl font-bold text-stone-900">
                    {new Date(b.lager_ankunft!).toLocaleDateString("de-DE")}
                  </div>

                  {uhrzeiten.length > 0 ? (
                    uhrzeiten.map((t) => (
                      <div key={t} className="text-2xl font-bold text-red-600 mt-1">
                        {(t as string).slice(0, 5)} Uhr
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-stone-400 mt-1">Uhrzeit nicht angegeben</div>
                  )}

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {b.abgeladen && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                        Abgeladen
                      </span>
                    )}
                  </div>

                  {files.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                      {files.map((f) => (
                        <a
                          key={f.id}
                          href={`/api/china-media-download/${f.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {f.filename}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
