import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, RESOLUTION_LABELS, formatDate } from "@/lib/status";
import StatusChangeModal from "./StatusChangeModal";
import EditReturnModal from "./EditReturnModal";
import ReturnImages from "./ReturnImages";

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data: ret }, { data: events }, { data: images }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("returns")
      .select("*, return_items(sku, quantity, is_manual)")
      .eq("id", id)
      .single(),
    supabase
      .from("return_events")
      .select("*")
      .eq("return_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("return_images")
      .select("id, storage_path, filename")
      .eq("return_id", id)
      .order("created_at"),
  ]);

  if (!ret) notFound();
  if (!user) redirect("/login");

  const userName = user.user_metadata?.full_name ?? user.email ?? "";
  const status = STATUS_LABELS[ret.status] ?? { label: ret.status, className: "bg-stone-100 text-stone-600" };
  const items = (ret.return_items as Array<{ sku: string; quantity: number; is_manual: boolean }>) ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back + Header */}
      <div className="mb-6">
        <Link href="/returns" className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zur Liste
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-stone-900">Retoure</h1>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${status.className}`}>
                {status.label}
              </span>
              {ret.resolution && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-stone-100 text-stone-700">
                  {RESOLUTION_LABELS[ret.resolution]}
                </span>
              )}
            </div>
            <p className="text-stone-500 text-sm mt-1">
              Erfasst von <strong>{ret.received_by}</strong> · {formatDate(ret.created_at)}
            </p>
          </div>

          {/* Aktionen */}
          <div className="flex gap-2 flex-wrap items-start">
            <EditReturnModal
              returnId={id}
              currentStatus={ret.status}
              userName={userName}
              initialValues={{
                order_number: ret.order_number,
                description: ret.description,
                resolution: ret.resolution,
                resolution_notes: ret.resolution_notes,
                tracking_number: ret.tracking_number,
                refund_status: ret.refund_status ?? null,
                refund_note: ret.refund_note ?? null,
              }}
            />
            {ret.status !== "erledigt" && (
              <StatusChangeModal returnId={id} currentStatus={ret.status} userName={userName} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Spalte: Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Auftragsnummer */}
          {ret.order_number && (
            <div className="card p-4">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Auftragsnummer</div>
              <div className="text-stone-900 font-mono font-medium">{ret.order_number}</div>
            </div>
          )}

          {/* SKUs */}
          <div className="card p-4">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
              SKUs ({items.length})
            </div>
            {items.length === 0 ? (
              <p className="text-stone-400 text-sm">Keine SKUs eingetragen.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-800">{item.sku}</span>
                      {item.is_manual && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">manuell</span>
                      )}
                    </div>
                    <span className="text-sm text-stone-500">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Beschreibung (Eingang) */}
          {ret.description && (
            <div className="card p-4">
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Beschreibung (Eingang)</div>
              <p className="text-stone-700 text-sm whitespace-pre-wrap">{ret.description}</p>
            </div>
          )}

          {/* Bilder */}
          <ReturnImages
            returnId={id}
            userName={userName}
            initialImages={images ?? []}
          />

          {/* Abschluss-Details */}
          {ret.status === "erledigt" && (
            <div className="card p-4 border-green-200 bg-green-50">
              <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-3">Abschluss</div>
              <div className="space-y-3">
                {ret.resolved_by && (
                  <div>
                    <div className="text-xs text-green-600 mb-0.5">Erledigt von</div>
                    <div className="text-sm font-medium text-green-900">{ret.resolved_by}</div>
                  </div>
                )}
                {ret.resolved_at && (
                  <div>
                    <div className="text-xs text-green-600 mb-0.5">Datum</div>
                    <div className="text-sm text-green-900">{formatDate(ret.resolved_at)}</div>
                  </div>
                )}
                {ret.resolution_notes && (
                  <div>
                    <div className="text-xs text-green-600 mb-0.5">Was wurde gemacht</div>
                    <p className="text-sm text-green-900 whitespace-pre-wrap">{ret.resolution_notes}</p>
                  </div>
                )}
                {ret.tracking_number && (
                  <div>
                    <div className="text-xs text-green-600 mb-0.5">Sendungsnummer</div>
                    <div className="text-sm font-mono font-medium text-green-900">{ret.tracking_number}</div>
                  </div>
                )}
                {ret.refund_status && (
                  <div>
                    <div className="text-xs text-green-600 mb-0.5">Geld erstattet</div>
                    <div className="flex items-center gap-2">
                      {ret.refund_status === "ja" ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-200 text-green-800">
                          ✓ Ja
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                          ✗ Nein
                        </span>
                      )}
                    </div>
                    {ret.refund_note && (
                      <p className="text-xs text-green-800 mt-1">{ret.refund_note}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rechte Spalte: Verlauf */}
        <div className="card p-4 h-fit">
          <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">Verlauf</div>
          {!events?.length ? (
            <p className="text-stone-400 text-sm">Keine Einträge.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-stone-200" />
              <div className="space-y-4">
                {events.map((ev) => (
                  <div key={ev.id} className="relative pl-8">
                    <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-white ${
                      ev.event_type === "eingegangen" ? "bg-blue-400" :
                      ev.event_type === "erledigt" ? "bg-green-400" :
                      ev.event_type === "status_geaendert" ? "bg-amber-400" : "bg-stone-300"
                    }`} />
                    <div className="text-xs text-stone-400 mb-0.5">{formatDate(ev.created_at)}</div>
                    <div className="text-xs font-medium text-stone-700">{ev.author}</div>
                    {ev.note && <p className="text-xs text-stone-600 mt-0.5 whitespace-pre-wrap">{ev.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
