import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";
import WareEditModal from "./WareEditModal";
import WareMedia from "./WareMedia";
import DeleteWareButton from "./DeleteWareButton";

export default async function WareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: ware }, { data: artikel }, { data: mediaRows }] = await Promise.all([
    supabase.from("ware_in_china").select("*").eq("id", id).single(),
    supabase.from("ware_in_china_artikel").select("*").eq("ware_id", id).order("created_at", { ascending: true }),
    supabase.from("ware_media").select("*").eq("ware_id", id).order("created_at", { ascending: true }),
  ]);

  if (!ware) notFound();

  const userName = user.user_metadata?.full_name ?? user.email ?? "";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 mb-5">
        <Link href="/china/ware" className="hover:text-stone-700 transition-colors">Ware in China</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-stone-700 font-medium truncate max-w-xs">
          {ware.fabrik ?? ware.order_pi_nummer ?? "Eintrag"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {ware.fabrik || <span className="text-stone-400 font-normal">Keine Fabrik</span>}
          </h1>
          {ware.order_pi_nummer && (
            <p className="text-stone-500 text-sm mt-1 font-mono">{ware.order_pi_nummer}</p>
          )}
          <p className="text-stone-400 text-xs mt-1">
            Erstellt von <strong className="text-stone-600">{ware.created_by}</strong> · {formatDate(ware.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WareEditModal
            ware={{ id: ware.id, fabrik: ware.fabrik, order_pi_nummer: ware.order_pi_nummer, notiz: ware.notiz }}
            initialArtikel={(artikel ?? []).map((a) => ({ id: a.id, artikel: a.artikel, anzahl: a.anzahl }))}
          />
          <DeleteWareButton id={ware.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Links — Artikel + Notiz */}
        <div className="lg:col-span-2 space-y-5">
          {/* Artikel */}
          <div className="card p-4">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
              Artikel ({(artikel ?? []).length})
            </div>
            {!artikel?.length ? (
              <p className="text-sm text-stone-400">Keine Artikel eingetragen.</p>
            ) : (
              <div className="space-y-2">
                {artikel.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                    <span className="text-sm text-stone-800">{a.artikel}</span>
                    <span className="text-sm font-medium text-stone-500">×{a.anzahl}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notiz */}
          {ware.notiz && (
            <div className="card p-4">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Notiz</div>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{ware.notiz}</p>
            </div>
          )}
        </div>

        {/* Rechts — Dateien */}
        <div>
          <WareMedia
            wareId={id}
            userName={userName}
            initialMedia={(mediaRows ?? []).map((m) => ({
              id: m.id,
              storage_path: m.storage_path,
              filename: m.filename,
              media_type: m.media_type,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
