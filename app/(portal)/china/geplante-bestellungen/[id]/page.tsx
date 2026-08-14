import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";
import { parseOrderPi } from "../utils";
import GeplantEditModal from "./GeplantEditModal";
import GeplantMedia from "./GeplantMedia";
import DeleteGeplantButton from "./DeleteGeplantButton";

function formatDatum(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function TypBadge({ typ }: { typ: "ORDER" | "LOADING" }) {
  if (typ === "LOADING") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
        Loading
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
      Order
    </span>
  );
}

export default async function GeplantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: ware }, { data: artikel }] = await Promise.all([
    supabase.from("ware_in_china").select("*").eq("id", id).single(),
    supabase.from("ware_in_china_artikel").select("*").eq("ware_id", id).order("created_at", { ascending: true }),
  ]);

  if (!ware || !ware.order_pi_nummer?.startsWith("DATUM:")) notFound();

  const { datum, typ, checked } = parseOrderPi(ware.order_pi_nummer);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = datum < today;
  const isSoon = !isOverdue && datum <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 mb-5">
        <Link href="/china/geplante-bestellungen" className="hover:text-stone-700 transition-colors">
          Bestellungen / Loading
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-stone-700 font-medium truncate max-w-xs">
          {ware.fabrik ?? formatDatum(datum)}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-900">
              {ware.fabrik || <span className="text-stone-400 font-normal">Keine Fabrik</span>}
            </h1>
            <TypBadge typ={typ} />
            {isOverdue && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                Überfällig
              </span>
            )}
            {isSoon && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                Bald
              </span>
            )}
          </div>
          <p className="text-stone-500 text-sm mt-1">
            Geplant am <strong className="text-stone-700">{formatDatum(datum)}</strong>
          </p>
          <p className="text-stone-400 text-xs mt-1">
            Erstellt von <strong className="text-stone-600">{ware.created_by}</strong> · {formatDate(ware.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GeplantEditModal
            bestellung={{ id: ware.id, fabrik: ware.fabrik, datum, typ, checked, notiz: ware.notiz }}
            initialArtikel={(artikel ?? []).map((a) => ({ id: a.id, artikel: a.artikel, anzahl: a.anzahl }))}
          />
          <DeleteGeplantButton id={ware.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Links — Artikel + Notiz */}
        <div className="lg:col-span-2 space-y-5">
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

          {ware.notiz && (
            <div className="card p-4">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Notiz</div>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{ware.notiz}</p>
            </div>
          )}
        </div>

        {/* Rechts — Dateien */}
        <div>
          <GeplantMedia bestellungId={id} />
        </div>
      </div>
    </div>
  );
}
