"use client";

import { useState, useTransition } from "react";
import { saveSkuMapping, deleteSkuMapping, toggleSkuMappingActive, syncStock, type SyncResult } from "./actions";
import { useRouter } from "next/navigation";

type Mapping = {
  id: string;
  marketplace: string;
  marketplaceSku: string;
  label: string | null;
  active: boolean;
  items: { id: string; internalSku: string; item: { stock: number } }[];
};

const MARKETPLACES = ["EBAY", "EBAY_OUTLET", "OTTO", "SHOPIFY", "KAUFLAND", "MEDIAMARKT"];

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

export default function SyncClient({ mappings }: { mappings: Mapping[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [marketplace, setMarketplace] = useState("EBAY");
  const [marketplaceSku, setMarketplaceSku] = useState("");
  const [label, setLabel] = useState("");
  const [internalSkus, setInternalSkus] = useState("");
  const [saving, setSaving] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSave() {
    if (!marketplaceSku.trim() || !internalSkus.trim()) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("marketplace", marketplace);
    fd.append("marketplaceSku", marketplaceSku);
    fd.append("label", label);
    fd.append("internalSkus", internalSkus);
    await saveSkuMapping(fd);
    setMarketplaceSku(""); setLabel(""); setInternalSkus(""); setShowForm(false);
    setSaving(false);
    startTransition(() => router.refresh());
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

  async function handleSync() {
    setSyncing(true);
    setSyncResults(null);
    const activeMPs = [...new Set(mappings.filter((m) => m.active).map((m) => m.marketplace))];
    const results = await syncStock(activeMPs);
    setSyncResults(results);
    setSyncing(false);
  }

  const activeCount = mappings.filter((m) => m.active).length;

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

        {/* Sync Results */}
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

      {/* Mapping Table */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">SKU-Mappings ({mappings.length})</h2>
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-sm py-1.5 px-3">
            {showForm ? "Abbrechen" : "+ Mapping hinzufügen"}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="p-5 border-b border-gray-100 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-gray-500">Portal</span>
                <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)} className="input">
                  {MARKETPLACES.map((m) => <option key={m} value={m}>{MP_LABEL[m]}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-gray-500">Marketplace-SKU *</span>
                <input type="text" value={marketplaceSku} onChange={(e) => setMarketplaceSku(e.target.value)}
                  placeholder="z.B. ELK75EV1P/ELK60CR1" className="input" />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-gray-500">Interne SKUs * (kommagetrennt bei Kombi-Produkten)</span>
              <input type="text" value={internalSkus} onChange={(e) => setInternalSkus(e.target.value)}
                placeholder="z.B. ELK75EV1P,ELK60CR1" className="input" />
              <span className="text-xs text-gray-400">Bei Kombis: Menge = Minimum aller beteiligten SKUs</span>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-gray-500">Bezeichnung (optional)</span>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder="z.B. Herdset Klein" className="input" />
            </label>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !marketplaceSku.trim() || !internalSkus.trim()}
                className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50">
                {saving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {mappings.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Noch keine Mappings. Füge das erste Mapping hinzu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Portal</th>
                  <th className="text-left px-5 py-3">Marketplace-SKU</th>
                  <th className="text-left px-5 py-3">Interne SKUs</th>
                  <th className="text-right px-5 py-3">Bestand</th>
                  <th className="text-left px-5 py-3">Bezeichnung</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mappings.map((m) => {
                  const quantity = Math.min(...m.items.map((i) => i.item.stock));
                  return (
                    <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${!m.active ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${MP_COLOR[m.marketplace] ?? "bg-gray-100 text-gray-700"}`}>
                          {MP_LABEL[m.marketplace] ?? m.marketplace}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-700">{m.marketplaceSku}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.items.map((item) => (
                            <span key={item.id} className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">
                              {item.internalSku} ({item.item.stock})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">
                        {quantity}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{m.label ?? "–"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleToggle(m.id, !m.active)}
                            className="text-xs text-gray-400 hover:text-gray-600">
                            {m.active ? "Deaktivieren" : "Aktivieren"}
                          </button>
                          <button onClick={() => handleDelete(m.id)} disabled={deletingId === m.id}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
  );
}
