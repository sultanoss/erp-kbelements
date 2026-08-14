import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/status";
import ErsatzteilEditModal from "./ErsatzteilEditModal";
import ErsatzteilMedia from "./ErsatzteilMedia";
import DeleteErsatzteilButton from "./DeleteErsatzteilButton";

function parseProdukt(orderPi: string | null): string {
  if (!orderPi?.startsWith("ERSATZTEIL:")) return "";
  return orderPi.slice(11);
}

export default async function ErsatzteilDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: eintrag } = await supabase
    .from("ware_in_china")
    .select("*")
    .eq("id", id)
    .single();

  if (!eintrag || !eintrag.order_pi_nummer?.startsWith("ERSATZTEIL:")) notFound();

  const produkt = parseProdukt(eintrag.order_pi_nummer);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500 mb-5">
        <Link href="/china/ersatzteile" className="hover:text-stone-700 transition-colors">
          Ersatzteile
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-stone-700 font-medium truncate max-w-xs">{produkt || eintrag.fabrik || "Eintrag"}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {produkt || <span className="text-stone-400 font-normal">Kein Produkt</span>}
          </h1>
          {eintrag.fabrik && (
            <p className="text-stone-500 text-sm mt-1">Fabrik: <strong className="text-stone-700">{eintrag.fabrik}</strong></p>
          )}
          <p className="text-stone-400 text-xs mt-1">
            Erstellt von <strong className="text-stone-600">{eintrag.created_by}</strong> · {formatDate(eintrag.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ErsatzteilEditModal eintrag={{ id: eintrag.id, produkt, fabrik: eintrag.fabrik, notiz: eintrag.notiz }} />
          <DeleteErsatzteilButton id={eintrag.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {eintrag.notiz ? (
            <div className="card p-4">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Notiz</div>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{eintrag.notiz}</p>
            </div>
          ) : (
            <div className="card p-4 text-sm text-stone-400">Keine Notiz eingetragen.</div>
          )}
        </div>
        <div>
          <ErsatzteilMedia eintragId={id} />
        </div>
      </div>
    </div>
  );
}
