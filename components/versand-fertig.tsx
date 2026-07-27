"use client";

import { useState, useTransition } from "react";
import {
  getPendingShipments,
  createDailySalesFromShipments,
  undoDailySales,
  type DailySalesResult,
} from "@/app/actions";

type PendingShipment = Awaited<ReturnType<typeof getPendingShipments>>[number];

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "nothingNew" }
  | { phase: "selecting"; shipments: PendingShipment[] }
  | { phase: "processing" }
  | { phase: "success"; result: DailySalesResult }
  | { phase: "undone" };

function formatDate(d: Date | string) {
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.`;
}

export function VersandFertigButton() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isUndoing, startUndoTransition] = useTransition();

  async function handleOpen() {
    setState({ phase: "loading" });
    const shipments = await getPendingShipments();
    if (shipments.length === 0) {
      setState({ phase: "nothingNew" });
      return;
    }
    setSelected(new Set(shipments.map((s) => s.id)));
    setSearch("");
    setState({ phase: "selecting", shipments });
  }

  async function handleConfirm() {
    if (state.phase !== "selecting") return;
    setState({ phase: "processing" });
    const res = await createDailySalesFromShipments(Array.from(selected));
    if (res.nothingNew) {
      setState({ phase: "nothingNew" });
    } else {
      setState({ phase: "success", result: res });
    }
  }

  function handleUndo() {
    if (state.phase !== "success") return;
    const { saleIds, herdsetSaleIds, shipmentIds } = state.result;
    startUndoTransition(async () => {
      await undoDailySales({ saleIds, herdsetSaleIds, shipmentIds });
      setState({ phase: "undone" });
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(shipments: PendingShipment[]) {
    const visible = filtered(shipments);
    const allChecked = visible.every((s) => selected.has(s.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) visible.forEach((s) => next.delete(s.id));
      else visible.forEach((s) => next.add(s.id));
      return next;
    });
  }

  function filtered(shipments: PendingShipment[]) {
    if (!search.trim()) return shipments;
    const q = search.trim().toLowerCase();
    return shipments.filter((s) => s.order.orderNumber?.toLowerCase().includes(q));
  }

  if (state.phase === "undone") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-grey-border bg-white px-5 py-3 shadow-sm">
        <span className="font-mono text-sm text-grey-mid">Rückgängig gemacht — Versand fertig zurückgesetzt.</span>
        <button type="button" onClick={() => setState({ phase: "idle" })} className="font-mono text-xs text-grey-mid underline hover:text-brand-red">
          Zurück
        </button>
      </div>
    );
  }

  if (state.phase === "success") {
    const { salesCreated, herdsetsCreated } = state.result;
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3 shadow-sm">
        <svg className="h-5 w-5 flex-shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="flex-1 font-mono text-sm font-semibold text-green-800">
          {salesCreated} Verkäufe{herdsetsCreated > 0 ? ` + ${herdsetsCreated} Herdset${herdsetsCreated > 1 ? "s" : ""}` : ""} eingetragen
        </span>
        <button
          type="button"
          onClick={handleUndo}
          disabled={isUndoing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-green-700 hover:border-green-500 transition-colors disabled:opacity-50"
        >
          {isUndoing ? "Wird rückgängig gemacht…" : "↩ Rückgängig"}
        </button>
      </div>
    );
  }

  if (state.phase === "nothingNew") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-grey-border bg-white px-5 py-3 shadow-sm">
        <span className="font-mono text-sm text-grey-mid">Keine neuen Versendungen seit dem letzten Abschluss.</span>
        <button type="button" onClick={() => setState({ phase: "idle" })} className="font-mono text-xs text-grey-mid underline hover:text-brand-red">
          Zurück
        </button>
      </div>
    );
  }

  if (state.phase === "selecting") {
    const shipments = state.shipments;
    const visible = filtered(shipments);
    const allVisibleChecked = visible.length > 0 && visible.every((s) => selected.has(s.id));
    const selectedCount = selected.size;

    return (
      <div className="rounded-xl border border-grey-border bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-grey-border px-5 py-3">
          <svg className="h-4 w-4 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="font-mono text-sm font-semibold text-brand-black">
            Versand fertig — {shipments.length} offene Sendung{shipments.length !== 1 ? "en" : ""}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="text"
              placeholder="Bestellnummer suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-grey-border px-3 py-1.5 font-mono text-xs text-brand-black placeholder-grey-mid focus:border-brand-red focus:outline-none w-48"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-5 py-4 font-mono text-xs text-grey-mid">Keine Sendungen gefunden.</div>
          ) : (
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-grey-border bg-gray-50">
                  <th className="px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleChecked}
                      onChange={() => toggleAll(shipments)}
                      className="h-3.5 w-3.5 accent-brand-red"
                    />
                  </th>
                  <th className="px-2 py-2 text-left text-grey-mid">Datum</th>
                  <th className="px-2 py-2 text-left text-grey-mid">Marktplatz</th>
                  <th className="px-2 py-2 text-left text-grey-mid">Bestellnummer</th>
                  <th className="px-2 py-2 text-left text-grey-mid">Artikel</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => toggleOne(s.id)}
                    className={`border-b border-grey-border cursor-pointer transition-colors ${selected.has(s.id) ? "bg-white hover:bg-gray-50" : "bg-gray-100 opacity-60 hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleOne(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 accent-brand-red"
                      />
                    </td>
                    <td className="px-2 py-2 text-grey-mid">{formatDate(s.createdAt)}</td>
                    <td className="px-2 py-2 font-semibold text-brand-black">{s.order.marketplace}</td>
                    <td className="px-2 py-2 text-brand-black">{s.order.orderNumber ?? "—"}</td>
                    <td className="px-2 py-2 text-grey-mid">
                      {s.items.map((i) => `${i.internalSku} ×${i.quantity}`).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-grey-border px-5 py-3">
          <button
            type="button"
            onClick={() => setState({ phase: "idle" })}
            className="font-mono text-xs text-grey-mid underline hover:text-brand-red"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-mono text-xs font-bold text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {selectedCount === shipments.length
              ? `Alle ${selectedCount} bestätigen`
              : `${selectedCount} von ${shipments.length} bestätigen`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={state.phase === "loading"}
      className="inline-flex items-center gap-2.5 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-60 shadow-sm"
    >
      {state.phase === "loading" ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          Wird geladen…
        </>
      ) : (
        <>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Versand fertig
        </>
      )}
    </button>
  );
}
