"use client";

import { useState, useTransition } from "react";
import { Panel } from "@/components/ui";
import { createLaterShipment, updateLaterShipment, deleteLaterShipment } from "./actions";

type Entry = {
  id: string;
  orderNumber: string;
  note: string | null;
  shippingDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

const inputClass =
  "h-9 w-full rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";

function fmtDate(d: Date) {
  const date = new Date(d);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toDateStr(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function SpaeterVersandCard({
  initialEntries,
  dueCount,
}: {
  initialEntries: Entry[];
  dueCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();

  // Add form state
  const [addOrderNumber, setAddOrderNumber] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addError, setAddError] = useState("");

  // Search filter
  const [search, setSearch] = useState("");

  // Inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editOrderNumber, setEditOrderNumber] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");

  const today = todayStr();

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          (e.note ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  function handleAdd() {
    if (!addOrderNumber.trim()) { setAddError("Auftragsnummer erforderlich"); return; }
    if (!addDate) { setAddError("Datum erforderlich"); return; }
    setAddError("");

    startTransition(async () => {
      await createLaterShipment({ orderNumber: addOrderNumber, note: addNote, shippingDate: addDate });
      const newEntry: Entry = {
        id: Math.random().toString(36).slice(2),
        orderNumber: addOrderNumber.trim(),
        note: addNote.trim() || null,
        shippingDate: new Date(addDate + "T12:00:00"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setEntries((prev) => [...prev, newEntry].sort((a, b) => new Date(a.shippingDate).getTime() - new Date(b.shippingDate).getTime()));
      setAddOrderNumber("");
      setAddNote("");
      setAddDate("");
    });
  }

  function startEdit(e: Entry) {
    setEditId(e.id);
    setEditOrderNumber(e.orderNumber);
    setEditNote(e.note ?? "");
    setEditDate(toDateStr(e.shippingDate));
  }

  function handleUpdate() {
    if (!editId || !editOrderNumber.trim() || !editDate) return;
    startTransition(async () => {
      await updateLaterShipment(editId, { orderNumber: editOrderNumber, note: editNote, shippingDate: editDate });
      setEntries((prev) =>
        prev
          .map((e) =>
            e.id === editId
              ? { ...e, orderNumber: editOrderNumber.trim(), note: editNote.trim() || null, shippingDate: new Date(editDate + "T12:00:00"), updatedAt: new Date() }
              : e
          )
          .sort((a, b) => new Date(a.shippingDate).getTime() - new Date(b.shippingDate).getTime())
      );
      setEditId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLaterShipment(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (editId === id) setEditId(null);
    });
  }

  return (
    <>
      {/* Card */}
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left"
      >
        <Panel className="p-5 hover:border-brand-red/40 transition-colors cursor-pointer">
          <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
            Späterer Versand
          </div>
          <div className="flex items-end gap-3">
            <div className="font-mono text-4xl font-black tabular-nums text-grey-dark">
              {entries.length}
            </div>
            {dueCount > 0 && (
              <div className="mb-1 rounded-full bg-brand-red px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                {dueCount} heute
              </div>
            )}
          </div>
          <div className="mt-1 font-mono text-[10px] text-grey-mid">Einträge gesamt</div>
        </Panel>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-grey-border px-6 py-4">
              <h2 className="text-base font-bold text-grey-dark">Späterer Versand</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-grey-mid hover:text-grey-dark"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Add form */}
              <div className="rounded-lg border border-grey-border bg-grey-light/30 p-4">
                <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                  Neuer Eintrag
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_9rem_auto]">
                  <div>
                    <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                      Auftragsnummer
                    </label>
                    <input
                      type="text"
                      value={addOrderNumber}
                      onChange={(e) => setAddOrderNumber(e.target.value)}
                      placeholder="z.B. 12345"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                      Notiz (optional)
                    </label>
                    <input
                      type="text"
                      value={addNote}
                      onChange={(e) => setAddNote(e.target.value)}
                      placeholder="Beliebige Notiz"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                      Versanddatum
                    </label>
                    <input
                      type="date"
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAdd}
                      disabled={isPending}
                      className="h-9 rounded-lg bg-brand-red px-4 font-semibold text-white text-sm hover:bg-brand-red/90 disabled:opacity-50 whitespace-nowrap"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
                {addError && (
                  <p className="mt-2 font-mono text-xs text-brand-red">{addError}</p>
                )}
              </div>

              {/* Search + Table */}
              <div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen nach Auftragsnummer oder Notiz…"
                  className={inputClass + " mb-3"}
                />

                {filtered.length === 0 ? (
                  <div className="rounded-lg border border-grey-border px-5 py-8 text-center font-mono text-sm text-grey-mid">
                    {entries.length === 0 ? "Noch keine Einträge." : "Keine Treffer."}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-grey-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-grey-border bg-grey-light/50">
                          <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                            Datum
                          </th>
                          <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                            Auftragsnummer
                          </th>
                          <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                            Notiz
                          </th>
                          <th className="px-4 py-2.5 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                            Aktionen
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-grey-border">
                        {filtered.map((entry) => {
                          const isToday = toDateStr(entry.shippingDate) === today;
                          const isEditing = editId === entry.id;

                          if (isEditing) {
                            return (
                              <tr key={entry.id} className="bg-brand-red/5">
                                <td className="px-4 py-2">
                                  <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="h-8 w-full rounded border border-grey-border px-2 font-mono text-xs focus:border-brand-red focus:outline-none"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={editOrderNumber}
                                    onChange={(e) => setEditOrderNumber(e.target.value)}
                                    className="h-8 w-full rounded border border-grey-border px-2 font-mono text-xs focus:border-brand-red focus:outline-none"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={editNote}
                                    onChange={(e) => setEditNote(e.target.value)}
                                    className="h-8 w-full rounded border border-grey-border px-2 font-mono text-xs focus:border-brand-red focus:outline-none"
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={handleUpdate}
                                      disabled={isPending}
                                      className="rounded px-3 py-1 font-mono text-xs font-semibold bg-brand-red text-white hover:bg-brand-red/90 disabled:opacity-50"
                                    >
                                      Speichern
                                    </button>
                                    <button
                                      onClick={() => setEditId(null)}
                                      className="rounded px-3 py-1 font-mono text-xs font-semibold border border-grey-border text-grey-dark hover:border-grey-mid"
                                    >
                                      Abbrechen
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={entry.id} className={isToday ? "bg-red-50" : ""}>
                              <td className="px-4 py-3 font-mono text-sm tabular-nums text-grey-dark">
                                {isToday && (
                                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-brand-red align-middle" />
                                )}
                                {fmtDate(entry.shippingDate)}
                              </td>
                              <td className="px-4 py-3 font-mono text-sm font-semibold text-grey-dark">
                                {entry.orderNumber}
                              </td>
                              <td className="px-4 py-3 font-mono text-sm text-grey-mid">
                                {entry.note ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => startEdit(entry)}
                                    className="rounded px-3 py-1 font-mono text-xs font-semibold border border-grey-border text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors"
                                  >
                                    Bearbeiten
                                  </button>
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    disabled={isPending}
                                    className="rounded px-3 py-1 font-mono text-xs font-semibold border border-grey-border text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-50"
                                  >
                                    Löschen
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
