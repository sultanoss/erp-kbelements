import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";
import ChinaEditModal from "./ChinaEditModal";
import ChinaMedia from "./ChinaMedia";
import PacklisteUpload from "./PacklisteUpload";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-stone-500 mb-0.5">{label}</div>
      <div className="text-sm text-stone-800">{value}</div>
    </div>
  );
}

function StatusBadge({ active, labelYes, labelNo }: { active: boolean; labelYes: string; labelNo: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
      {active ? labelYes : labelNo}
    </span>
  );
}

export default async function ChinaBestellungDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: b }, { data: mediaRows }, { data: packlisteRows }] = await Promise.all([
    supabase.from("china_bestellungen").select("*").eq("id", id).single(),
    supabase.from("china_media").select("*").eq("bestellung_id", id).neq("media_type", "packliste").order("created_at", { ascending: true }),
    supabase.from("china_media").select("*").eq("bestellung_id", id).eq("media_type", "packliste").order("created_at", { ascending: true }),
  ]);

  if (!b) notFound();

  const isAdmin = user.app_metadata?.role === "admin";
  const userName = user.user_metadata?.full_name ?? user.email ?? "";

  // Non-admin: simplified read-only view
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="text-xs text-stone-500 uppercase tracking-wide mb-2">Waren Ankunft</div>
          <div className="text-4xl font-bold text-stone-900">
            {b.lager_ankunft
              ? new Date(b.lager_ankunft).toLocaleDateString("de-DE")
              : <span className="text-stone-300">—</span>}
          </div>
          {b.lager_ankunft_uhrzeit && (
            <div className="text-3xl font-bold text-red-600 mt-1">
              {(b.lager_ankunft_uhrzeit as string).slice(0, 5)} Uhr
            </div>
          )}
          {b.fabrik && (
            <p className="text-stone-500 text-sm mt-3">{b.fabrik}</p>
          )}
        </div>
        <PacklisteUpload
          bestellungId={id}
          userName={userName}
          initialFiles={(packlisteRows ?? []).map((m) => ({
            id: m.id,
            storage_path: m.storage_path,
            filename: m.filename,
          }))}
          canUpload={false}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 mb-5">
        <Link href="/china/bestellungen" className="hover:text-stone-700 transition-colors">China Bestellungen</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-stone-700 font-medium truncate max-w-xs">
          {b.order_pi_nummer ?? b.fabrik ?? "Bestellung"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {b.order_pi_nummer ? (
              <span className="font-mono">{b.order_pi_nummer}</span>
            ) : (
              <span className="text-stone-400 font-normal">Keine Order/PI-Nummer</span>
            )}
          </h1>
          {b.fabrik && <p className="text-stone-500 text-sm mt-1">{b.fabrik}</p>}
          <p className="text-stone-400 text-xs mt-1">Erstellt von <strong className="text-stone-600">{b.created_by}</strong> · {formatDate(b.created_at)}</p>
        </div>
        <ChinaEditModal bestellung={b} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status-Übersicht */}
          <div className="card p-4">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">Status</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <StatusBadge active={b.angezahlt} labelYes="Angezahlt" labelNo="Nicht angezahlt" />
                {b.angezahlt && b.angezahlt_notiz && (
                  <p className="text-xs text-stone-500 mt-1.5">{b.angezahlt_notiz}</p>
                )}
              </div>
              <div className="text-center">
                <StatusBadge active={b.bezahlt} labelYes="Bezahlt" labelNo="Nicht bezahlt" />
                {b.bezahlt && b.bezahlt_notiz && (
                  <p className="text-xs text-stone-500 mt-1.5">{b.bezahlt_notiz}</p>
                )}
              </div>
              <div className="text-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${b.verschifft ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-500"}`}>
                  {b.verschifft ? "Verschifft" : "Nicht verschifft"}
                </span>
                {b.verschifft && b.tracking_nummer && (
                  <p className="text-xs text-stone-500 font-mono mt-1.5">{b.tracking_nummer}</p>
                )}
              </div>
              <div className="text-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${b.abgeladen ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                  {b.abgeladen ? "Abgeladen" : "Nicht abgeladen"}
                </span>
              </div>
            </div>
          </div>

          {/* Termine */}
          <div className="card p-4">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">Termine</div>
            <div className="grid grid-cols-3 gap-4">
              <InfoRow
                label="Produktion fertig"
                value={b.produktion_fertig
                  ? new Date(b.produktion_fertig).toLocaleDateString("de-DE")
                  : <span className="text-stone-300">—</span>}
              />
              <InfoRow
                label="Ankunft erwartet"
                value={b.ankunft_erwartet
                  ? new Date(b.ankunft_erwartet).toLocaleDateString("de-DE")
                  : <span className="text-stone-300">—</span>}
              />
              <InfoRow
                label="Lager Ankunft"
                value={b.lager_ankunft
                  ? `${new Date(b.lager_ankunft).toLocaleDateString("de-DE")}${
                      (b.lager_ankunft_uhrzeiten as string[] | null)?.length
                        ? ` · ${[...(b.lager_ankunft_uhrzeiten as string[])].sort().map((t) => t.slice(0, 5)).join(", ")} Uhr`
                        : ""
                    }`
                  : <span className="text-stone-300">—</span>}
              />
            </div>
          </div>

          {/* Notiz */}
          {b.notiz && (
            <div className="card p-4">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Notiz</div>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{b.notiz}</p>
            </div>
          )}
        </div>

        {/* Right — Packliste + Dateien */}
        <div className="space-y-4">
          <PacklisteUpload
            bestellungId={id}
            userName={userName}
            initialFiles={(packlisteRows ?? []).map((m) => ({
              id: m.id,
              storage_path: m.storage_path,
              filename: m.filename,
            }))}
          />
          <ChinaMedia
            bestellungId={id}
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
