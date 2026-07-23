import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SCHADEN_STATUS_LABELS, formatDate } from "@/lib/status";
import SchadenEditModal from "./SchadenEditModal";
import SchadenMedia from "./SchadenMedia";

export default async function SchadenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: schaden, error } = await supabase
    .from("schadenmeldungen")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !schaden) notFound();

  const { data: mediaRows } = await supabase
    .from("schaden_media")
    .select("id, storage_path, filename, media_type")
    .eq("schaden_id", id)
    .order("created_at", { ascending: true });

  const userName = user.user_metadata?.full_name ?? user.email ?? "";
  const status = SCHADEN_STATUS_LABELS[schaden.status] ?? { label: schaden.status, className: "bg-stone-100 text-stone-600" };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 mb-5">
        <Link href="/schadenmeldungen" className="hover:text-stone-700 transition-colors">
          Schadenmeldungen
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-stone-700 font-mono font-medium">{schaden.gel_nummer}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-stone-900 font-mono">{schaden.gel_nummer}</h1>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>
        <SchadenEditModal
          schadenId={id}
          current={{
            gel_nummer: schaden.gel_nummer,
            auftragsnummer: schaden.auftragsnummer,
            artikel: schaden.artikel,
            beschreibung: schaden.beschreibung,
            rechnungsnummer: schaden.rechnungsnummer,
            status: schaden.status,
            unterlagen_gesendet: schaden.unterlagen_gesendet ?? false,
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Beschreibung + Medien */}
        <div className="lg:col-span-2 space-y-4">
          {schaden.beschreibung && (
            <div className="card p-5">
              <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Beschreibung</h2>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{schaden.beschreibung}</p>
            </div>
          )}

          <SchadenMedia
            schadenId={id}
            userName={userName}
            initialMedia={mediaRows ?? []}
          />
        </div>

        {/* Sidebar: Metadaten */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              {schaden.auftragsnummer && (
                <div>
                  <dt className="text-xs text-stone-400 mb-0.5">Auftragsnummer</dt>
                  <dd className="font-mono text-stone-800">{schaden.auftragsnummer}</dd>
                </div>
              )}

              {schaden.artikel && (
                <div>
                  <dt className="text-xs text-stone-400 mb-0.5">Artikel</dt>
                  <dd className="text-stone-700">{schaden.artikel}</dd>
                </div>
              )}

              {schaden.rechnungsnummer ? (
                <div>
                  <dt className="text-xs text-stone-400 mb-0.5">Rechnungsnummer</dt>
                  <dd className="font-mono text-stone-800">{schaden.rechnungsnummer}</dd>
                </div>
              ) : (
                <div>
                  <dt className="text-xs text-stone-400 mb-0.5">Rechnungsnummer</dt>
                  <dd className="text-stone-300 italic text-xs">Noch nicht gesetzt</dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-stone-400 mb-0.5">Status</dt>
                <dd>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-xs text-stone-400 mb-0.5">Unterlagen an GEL gesendet</dt>
                <dd>
                  {schaden.unterlagen_gesendet ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Ja
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">Nein</span>
                  )}
                </dd>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <dt className="text-xs text-stone-400 mb-0.5">Erstellt von</dt>
                <dd className="text-stone-700">{schaden.created_by}</dd>
              </div>

              <div>
                <dt className="text-xs text-stone-400 mb-0.5">Erstellt am</dt>
                <dd className="text-stone-600">{formatDate(schaden.created_at)}</dd>
              </div>

              {schaden.updated_at && schaden.updated_at !== schaden.created_at && (
                <div>
                  <dt className="text-xs text-stone-400 mb-0.5">Zuletzt geändert</dt>
                  <dd className="text-stone-600">{formatDate(schaden.updated_at)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
