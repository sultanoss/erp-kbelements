"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { SCHADEN_STATUS_LABELS, formatDate } from "@/lib/status";

interface Row {
  gel_nummer: string;
  auftragsnummer: string | null;
  artikel: string | null;
  rechnungsnummer: string | null;
  status: string;
  unterlagen_gesendet: boolean;
  created_at: string;
}

interface Props {
  rows: Row[];
}

const STATUS_OPTIONS = [
  { value: "offen",     label: "Offen" },
  { value: "reguliert", label: "Reguliert" },
  { value: "bezahlt",   label: "Bezahlt" },
];

export default function ExportButton({ rows }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(["offen", "reguliert", "bezahlt"]);

  function toggleStatus(val: string) {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  }

  function handleExport() {
    const filtered = rows.filter((r) => selected.includes(r.status));
    const data = filtered.map((r) => ({
      "GEL Nummer": r.gel_nummer,
      "Auftragsnummer": r.auftragsnummer ?? "",
      "Artikel": r.artikel ?? "",
      "Rechnungsnummer": r.rechnungsnummer ?? "",
      "Status": SCHADEN_STATUS_LABELS[r.status]?.label ?? r.status,
      "Unterlagen an GEL gesendet": r.unterlagen_gesendet ? "Ja" : "Nein",
      "Datum": formatDate(r.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schadenmeldungen");
    XLSX.writeFile(wb, "schadenmeldungen.xlsx");
    setOpen(false);
  }

  const exportCount = rows.filter((r) => selected.includes(r.status)).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={rows.length === 0}
        className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Excel exportieren
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">Excel exportieren</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-stone-500 mb-3">Welche Status sollen exportiert werden?</p>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((opt) => {
                  const count = rows.filter((r) => r.status === opt.value).length;
                  return (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-stone-200 px-3 py-2.5 hover:bg-stone-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selected.includes(opt.value)}
                        onChange={() => toggleStatus(opt.value)}
                        className="accent-brand-red w-4 h-4"
                      />
                      <span className="text-sm font-medium text-stone-700 flex-1">{opt.label}</span>
                      <span className="text-xs text-stone-400">{count} Einträge</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-secondary">Abbrechen</button>
              <button
                onClick={handleExport}
                disabled={selected.length === 0 || exportCount === 0}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {exportCount} Zeilen exportieren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
