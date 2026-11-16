"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, RESOLUTION_LABELS, formatDate } from "@/lib/status";
import { archiveReturnsBulk } from "./[id]/actions";

type ReturnItem = { sku: string; quantity: number; is_manual: boolean };

type ReturnRow = {
  id: string;
  created_at: string;
  order_number: string | null;
  description: string | null;
  status: string;
  resolution: string | null;
  resolution_notes: string | null;
  tracking_number: string | null;
  refund_status: string | null;
  refund_reason: string | null;
  received_by: string | null;
  resolved_by: string | null;
  is_outlet: boolean;
  last_reply_at: string | null;
  last_reply_author: string | null;
  return_items: ReturnItem[];
};

export default function ReturnsListClient({
  returns,
  currentUserName,
  hasFilters,
}: {
  returns: ReturnRow[];
  currentUserName: string;
  hasFilters: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelected((prev) =>
      prev.length === returns.length && returns.length > 0
        ? []
        : returns.map((r) => r.id)
    );

  const handleBulkArchive = () => {
    startTransition(async () => {
      await archiveReturnsBulk(selected);
      setSelected([]);
      router.refresh();
    });
  };

  const allChecked = returns.length > 0 && selected.length === returns.length;
  const someChecked = selected.length > 0 && selected.length < returns.length;
  const cell = "block px-4 py-3";

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    className="rounded border-stone-300 text-brand-red focus:ring-brand-red cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Auftrag</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">SKUs</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 max-w-[200px]">Beschreibung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Sendungsnummer</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Abschluss</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstattung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Bearbeiter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!returns.length ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-stone-400">
                    {hasFilters
                      ? "Keine Retouren für diese Filterkriterien gefunden."
                      : "Noch keine Retouren vorhanden. Erstelle die erste Retoure."}
                  </td>
                </tr>
              ) : (
                returns.map((r) => {
                  const href = `/returns/${r.id}`;
                  const items = r.return_items ?? [];
                  const skuList = items
                    .map((i) => `${i.sku}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`)
                    .join(", ");
                  const isReparatur = r.resolution_notes?.startsWith("REPARATUR:");
                  const status = isReparatur
                    ? STATUS_LABELS.reparatur
                    : (STATUS_LABELS[r.status] ?? { label: r.status, className: "bg-stone-100 text-stone-600" });
                  const resolution = r.resolution ? RESOLUTION_LABELS[r.resolution] : null;
                  const bearbeiter = r.status === "erledigt" ? r.resolved_by : r.received_by;
                  const hasNewReply =
                    !!r.last_reply_at &&
                    !!r.last_reply_author &&
                    r.last_reply_author !== currentUserName &&
                    r.status !== "warte_auf_kunde_antwort";
                  const isSelected = selected.includes(r.id);

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-stone-50 transition-colors cursor-pointer ${isSelected ? "bg-blue-50 hover:bg-blue-100" : ""}`}
                    >
                      <td className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(r.id)}
                          className="rounded border-stone-300 text-brand-red focus:ring-brand-red cursor-pointer"
                        />
                      </td>
                      <td className="p-0 text-stone-500 whitespace-nowrap text-xs">
                        <Link href={href} className={cell}>{formatDate(r.created_at)}</Link>
                      </td>
                      <td className="p-0 font-mono text-xs whitespace-nowrap">
                        <Link href={href} className={`${cell} text-stone-700`}>
                          {r.order_number || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <span className="text-xs text-stone-600 font-medium">
                            {skuList || <span className="text-stone-300">—</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0 max-w-[200px]">
                        <Link href={href} className={cell}>
                          <span className="text-xs text-stone-600 line-clamp-2">
                            {r.description || <span className="text-stone-300">—</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${status.className}`}>
                              {status.label}
                            </span>
                            {r.is_outlet && (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                                Outlet
                              </span>
                            )}
                            {hasNewReply && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-blue-500 animate-pulse" />
                                Neue Antwort von {r.last_reply_author}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} font-mono text-xs text-stone-600`}>
                          {r.tracking_number || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          {resolution ? (
                            <span className="text-xs text-stone-600 font-medium">{resolution}</span>
                          ) : (
                            <span className="text-stone-300 text-xs">—</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {r.refund_status === "ja" ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                            ✓ Ja
                          </span>
                        ) : r.refund_status === "nein" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                              ✗ Nein
                            </span>
                            {r.refund_reason && (
                              <span className="relative group cursor-default">
                                <svg className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="absolute left-0 bottom-full mb-1.5 w-52 rounded-lg bg-stone-800 text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-normal shadow-lg">
                                  {r.refund_reason}
                                </span>
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-stone-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-0 whitespace-nowrap">
                        <Link href={href} className={`${cell} text-xs text-stone-600`}>
                          {bearbeiter || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-stone-900 px-5 py-3 shadow-xl text-sm">
          <span className="text-stone-300">{selected.length} ausgewählt</span>
          <div className="w-px h-4 bg-stone-600" />
          <button
            onClick={handleBulkArchive}
            disabled={isPending}
            className="text-white font-medium hover:text-stone-200 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Archiviere...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
                </svg>
                Archivieren
              </>
            )}
          </button>
          <div className="w-px h-4 bg-stone-600" />
          <button
            onClick={() => setSelected([])}
            className="text-stone-400 hover:text-stone-200 transition-colors"
          >
            Aufheben
          </button>
        </div>
      )}
    </>
  );
}
