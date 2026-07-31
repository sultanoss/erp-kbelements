"use client";

import { useState, useTransition } from "react";
import { saveSkuMapping, deleteSkuMapping, toggleSkuMappingActive, syncStock, saveBulkMappings, type SyncResult } from "./actions";
import { useRouter } from "next/navigation";

type Mapping = {
  id: string;
  marketplace: string;
  marketplaceSku: string;
  label: string | null;
  active: boolean;
  items: { id: string; internalSku: string; item: { stock: number; sku: string } }[];
};

type MarketplaceSku = { marketplaceSku: string; title: string | null };

const MP_LABEL: Record<string, string> = {
  EBAY: "eBay",
  EBAY_OUTLET: "eBay Outlet",
  OTTO: "Otto",
  SHOPIFY: "Shopify",
  KAUFLAND: "Kaufland",
  MEDIAMARKT: "MediaMarkt",
};

const MP_COLOR: Record<string, string> = {
  EBAY: "bg-yellow-100 text-yellow-800",
  EBAY_OUTLET: "bg-orange-100 text-orange-800",
  OTTO: "bg-red-100 text-red-800",
  SHOPIFY: "bg-green-100 text-green-800",
  KAUFLAND: "bg-blue-100 text-blue-800",
  MEDIAMARKT: "bg-purple-100 text-purple-800",
};

export default function SyncClient({
  mappings,
  ebaySkus,
  ebayOutletSkus,
}: {
  mappings: Mapping[];
  ebaySkus: MarketplaceSku[];
  ebayOutletSkus: MarketplaceSku[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Quick-map inputs: { [marketplace_sku]: internalSkus string }
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Build a lookup of existing mappings: "MARKETPLACE:marketplaceSku" -> Mapping
  const mappingLookup = new Map<string, Mapping>();
  for (const m of mappings) {
    mappingLookup.set(`${m.marketplace}:${m.marketplaceSku}`, m);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResults(null);
    const activeMPs = [...new Set(mappings.filter((m) => m.active).map((m) => m.marketplace))];
    const results = await syncStock(activeMPs);
    setSyncResults(results);
    setSyncing(false);
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
    setSaving(true);
    const entries = skus.map((s) => ({
      marketplace,
      marketplaceSku: s.marketplaceSku,
      internalSkus: overrides[`${marketplace}:${s.marketplaceSku}`]?.trim() || s.marketplaceSku,
    }));
    await saveBulkMappings(entries);
    setSaving(false);
    startTransition(() => router.refresh());
  }

  const activeCount = mappings.filter((m) => m.active).length;

  function renderSkuTable(marketplace: string, skus: MarketplaceSku[]) {
    if (skus.length === 0) return <p className="text-sm text-gray-400 py-4">Keine Bestellungen für dieses Portal gefunden.</p>;

    return (
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
                            {i.internalSku} ({i.item.stock})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={override}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={s.marketplaceSku}
                        className="input text-xs py-1 w-full max-w-[240px] font-mono"
                      />
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
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">Leeres Feld = Marketplace-SKU wird direkt als interne SKU verwendet · Kombi-Produkte: SKUs kommagetrennt eingeben</p>
          <button
            onClick={() => handleSaveAll(marketplace, skus)}
            disabled={saving}
            className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Alle speichern"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Button */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Bestand synchronisieren</h2>
            <p className="text-sm text-gray-500 mt-0.5">{activeCount} aktive Mappings · sendet aktuellen ERP-Bestand zu den Portalen</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || activeCount === 0}
            className="btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            {syncing ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>Synchronisiert…</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>Jetzt synchronisieren</>
            )}
          </button>
        </div>

        {syncResults && (
          <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
            {syncResults.map((r) => (
              <div key={r.marketplace} className="flex items-start gap-3">
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${MP_COLOR[r.marketplace] ?? "bg-gray-100 text-gray-700"}`}>
                  {MP_LABEL[r.marketplace] ?? r.marketplace}
                </span>
                {r.skipped ? (
                  <span className="text-sm text-gray-400">{r.skipped}</span>
                ) : (
                  <div className="text-sm">
                    {r.ok > 0 && <span className="text-green-600">✓ {r.ok} aktualisiert</span>}
                    {r.error > 0 && <span className="text-red-600 ml-2">✗ {r.error} Fehler</span>}
                    {r.errors.map((e, i) => (
                      <div key={i} className="text-xs text-red-500 mt-0.5">{e.sku}: {e.message}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* eBay re-auth */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-2">eBay einmalig neu verbinden (für Inventory-Zugriff)</p>
        <p className="mb-3 text-amber-700">Der Bestand-Sync benötigt einen erweiterten eBay-Scope. Bitte einmal auf "Neu verbinden" klicken — du wirst zu eBay weitergeleitet und danach automatisch zurückgeleitet.</p>
        <div className="flex gap-3">
          <a href="/api/ebay/install" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
            eBay Hauptkonto neu verbinden
          </a>
          <a href="/api/ebay-outlet/install" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
            eBay Outlet neu verbinden
          </a>
        </div>
      </div>

      {/* eBay SKU Mapping */}
      <div className="card">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${MP_COLOR.EBAY}`}>eBay</span>
            <h2 className="font-semibold text-gray-900">SKU-Mappings ({ebaySkus.length} Produkte)</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">Alle SKUs aus eBay-Bestellungen. Interne SKU leer lassen wenn identisch mit Marketplace-SKU.</p>
        </div>
        {renderSkuTable("EBAY", ebaySkus)}
      </div>

      {/* eBay Outlet SKU Mapping */}
      <div className="card">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${MP_COLOR.EBAY_OUTLET}`}>eBay Outlet</span>
            <h2 className="font-semibold text-gray-900">SKU-Mappings ({ebayOutletSkus.length} Produkte)</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">Alle SKUs aus eBay Outlet-Bestellungen.</p>
        </div>
        {renderSkuTable("EBAY_OUTLET", ebayOutletSkus)}
      </div>
    </div>
  );
}
