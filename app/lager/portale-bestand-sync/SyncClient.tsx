"use client";

import { useState, useTransition } from "react";
import { deleteSkuMapping, toggleSkuMappingActive, syncStock, saveBulkMappings, type SyncResult } from "./actions";
import { useRouter } from "next/navigation";

type Mapping = {
  id: string;
  marketplace: string;
  marketplaceSku: string;
  label: string | null;
  active: boolean;
  items: { id: string; internalSku: string; item: { stock: number; stockNS: number; sku: string } }[];
};

type MarketplaceSku = { marketplaceSku: string; title: string | null };

const MP_COLOR: Record<string, string> = {
  EBAY: "bg-yellow-100 text-yellow-800",
  EBAY_OUTLET: "bg-orange-100 text-orange-800",
};

export default function SyncClient({
  mappings,
  ebaySkus,
  ebayOutletSkus,
  suggestions = {},
}: {
  mappings: Mapping[];
  ebaySkus: MarketplaceSku[];
  ebayOutletSkus: MarketplaceSku[];
  suggestions?: Record<string, string>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsedMP, setCollapsedMP] = useState<Record<string, boolean>>({});

  // Per-portal state
  const [savingMP, setSavingMP] = useState<string | null>(null);
  const [saveMsgMap, setSaveMsgMap] = useState<Record<string, string>>({});
  const [syncingMP, setSyncingMP] = useState<string | null>(null);
  const [syncResultMap, setSyncResultMap] = useState<Record<string, SyncResult>>({});

  // Quick-map inputs: pre-filled with auto-suggestions, editable by user
  const [overrides, setOverrides] = useState<Record<string, string>>(suggestions);

  // Build a lookup of existing mappings
  const mappingLookup = new Map<string, Mapping>();
  for (const m of mappings) {
    mappingLookup.set(`${m.marketplace}:${m.marketplaceSku}`, m);
  }

  async function handleSync(marketplace: string) {
    setSyncingMP(marketplace);
    setSyncResultMap((prev) => { const n = { ...prev }; delete n[marketplace]; return n; });
    const results = await syncStock([marketplace]);
    const r = results[0];
    if (r) setSyncResultMap((prev) => ({ ...prev, [marketplace]: r }));
    setSyncingMP(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteSkuMapping(id);
    setDeletingId(null);
    startTransition(() => router.refresh());
  }

  async function handleToggle(id: string, active: boolean) {
    await toggleSkuMappingActive(id, active);
    startTransition(() => router.refresh());
  }

  async function handleSaveAll(marketplace: string, skus: MarketplaceSku[]) {
    setSavingMP(marketplace);
    setSaveMsgMap((prev) => { const n = { ...prev }; delete n[marketplace]; return n; });
    const entries = skus.map((s) => ({
      marketplace,
      marketplaceSku: s.marketplaceSku,
      internalSkus: overrides[`${marketplace}:${s.marketplaceSku}`]?.trim() || s.marketplaceSku,
    }));
    const result = await saveBulkMappings(entries);
    setSavingMP(null);
    setSaveMsgMap((prev) => ({ ...prev, [marketplace]: `${result.saved} Mapping${result.saved !== 1 ? "s" : ""} gespeichert` }));
    startTransition(() => router.refresh());
  }

  function renderSyncResult(r: SyncResult) {
    if (r.skipped) return <span className="text-xs text-gray-400">{r.skipped}</span>;
    return (
      <div className="text-xs">
        {r.ok > 0 && <span className="text-green-600">✓ {r.ok} aktualisiert</span>}
        {r.error > 0 && <span className="text-red-600 ml-2">✗ {r.error} Fehler</span>}
        {r.errors.map((e, i) => (
          <div key={i} className="text-red-500 mt-0.5">{e.sku}: {e.message}</div>
        ))}
      </div>
    );
  }

  function renderPortal(marketplace: string, label: string, skus: MarketplaceSku[], description: string) {
    const activeCount = mappings.filter((m) => m.marketplace === marketplace && m.active).length;
    const isSyncing = syncingMP === marketplace;
    const isSaving = savingMP === marketplace;
    const syncResult = syncResultMap[marketplace];
    const saveMsg = saveMsgMap[marketplace];
    const isCollapsed = collapsedMP[marketplace] ?? false;

    return (
      <div className="card">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2">
              <button
                onClick={() => setCollapsedMP((prev) => ({ ...prev, [marketplace]: !isCollapsed }))}
                className="mt-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                title={isCollapsed ? "Aufklappen" : "Einklappen"}
              >
                <svg className={`w-4 h-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${MP_COLOR[marketplace] ?? "bg-gray-100 text-gray-700"}`}>{label}</span>
                  <h2 className="font-semibold text-gray-900">SKU-Mappings ({skus.length} Produkte · {activeCount} aktiv)</h2>
                </div>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                onClick={() => handleSync(marketplace)}
                disabled={isSyncing || activeCount === 0}
                className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50 flex items-center gap-2"
              >
                {isSyncing ? (
                  <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>Synchronisiert…</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>Jetzt synchronisieren</>
                )}
              </button>
              {activeCount === 0 && <p className="text-[10px] text-gray-400">Keine aktiven Mappings</p>}
              {syncResult && renderSyncResult(syncResult)}
            </div>
          </div>
        </div>

        {/* SKU Table */}
        {isCollapsed ? null : skus.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">Keine Produkte gefunden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Marketplace-SKU</th>
                  <th className="text-left px-4 py-2.5">Produktname</th>
                  <th className="text-left px-4 py-2.5">Interne SKU(s)</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {skus.map((s) => {
                  const key = `${marketplace}:${s.marketplaceSku}`;
                  const existing = mappingLookup.get(key);
                  const override = overrides[key] ?? "";

                  return (
                    <tr key={s.marketplaceSku} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700 whitespace-nowrap">{s.marketplaceSku}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">{s.title ?? "–"}</td>
                      <td className="px-4 py-2.5">
                        {existing ? (
                          <div className="flex flex-wrap gap-1">
                            {existing.items.map((i) => (
                              <span key={i.id} className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">
                                {i.internalSku} ({marketplace === "EBAY_OUTLET" ? i.item.stockNS : i.item.stock})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <input
                              type="text"
                              value={override}
                              onChange={(e) => setOverrides((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder={s.marketplaceSku}
                              className={`input text-xs py-1 w-full max-w-[240px] font-mono ${suggestions[key] && override === suggestions[key] ? "border-blue-300 bg-blue-50" : ""}`}
                            />
                            {suggestions[key] && override === suggestions[key] && (
                              <p className="text-[10px] text-blue-500">Automatischer Vorschlag — bitte prüfen</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {existing ? (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${existing.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {existing.active ? "Aktiv" : "Inaktiv"}
                            </span>
                            <button onClick={() => handleToggle(existing.id, !existing.active)} className="text-xs text-gray-400 hover:text-gray-600">
                              {existing.active ? "Deaktiv." : "Aktivieren"}
                            </button>
                            <button onClick={() => handleDelete(existing.id)} disabled={deletingId === existing.id} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50">
                              Löschen
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Nicht gemappt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400">Leeres Feld = Marketplace-SKU als interne SKU · Kombi-Produkte: SKUs kommagetrennt</p>
              <div className="flex items-center gap-3 shrink-0">
                {saveMsg && <span className="text-xs text-green-600 font-medium">✓ {saveMsg}</span>}
                <button
                  onClick={() => handleSaveAll(marketplace, skus)}
                  disabled={isSaving}
                  className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50"
                >
                  {isSaving ? "Speichern…" : "Alle speichern"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* eBay re-auth */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">eBay Konten verbinden</p>
        <p className="mb-3 text-amber-700 text-xs">Falls der Sync nicht funktioniert, bitte Konto neu verbinden.</p>
        <div className="flex gap-3">
          <a href="/api/ebay/install" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
            eBay Hauptkonto neu verbinden
          </a>
          <a href="/api/ebay-outlet/install" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
            eBay Outlet neu verbinden
          </a>
        </div>
      </div>

      {renderPortal("EBAY", "eBay", ebaySkus, "Neuware-Lager · Alle aktiven eBay-Listings")}
      {renderPortal("EBAY_OUTLET", "eBay Outlet", ebayOutletSkus, "NS-Lager · Alle aktiven eBay Outlet-Listings")}
    </div>
  );
}
