"use client";

import { useRef, useState, useTransition } from "react";
import { shipOrder, ShipOrderResult } from "./actions";

interface StockItem {
  sku: string;
  name: string;
  stock: number;
  stockNS: number;
}

interface SelectedItem {
  internalSku: string;
  quantity: number;
  warehouse: "neuware" | "ns";
}

interface ManualItem {
  id: string;
  description: string;
  quantity: number;
  warehouse: "neuware" | "ns";
}

interface OrderItemSummary {
  marketplaceSku: string;
  quantity: number;
}

interface Consignee {
  name: string;
  street: string;
  zip: string;
  city: string;
  country: string;
}

interface Props {
  orderId: string;
  orderNumber?: string | null;
  marketplace: string;
  orderItems: OrderItemSummary[];
  consignee: Consignee;
}

const WEIGHT_CLASSES = [
  { label: "3 kg",    value: "3" },
  { label: "5 kg",    value: "5" },
  { label: "10 kg",   value: "10" },
  { label: "15 kg",   value: "15" },
  { label: "20 kg",   value: "20" },
  { label: "30 kg",   value: "30" },
  { label: "31,5 kg", value: "31.5" },
];

const inputClass =
  "h-9 w-full rounded-lg border border-grey-border bg-white px-3 font-mono text-sm text-grey-dark focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/10";

export function ShipDialog({ orderId, orderNumber, marketplace, orderItems, consignee }: Props) {
  const [open, setOpen] = useState(false);
  const [carrier, setCarrier] = useState<"DHL" | "GEL">("DHL");
  const [weight, setWeight] = useState("");
  const [manualTracking, setManualTracking] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<ShipOrderResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const manualIdRef = useRef(0);

  const [shipName, setShipName] = useState(consignee.name);
  const [shipStreet, setShipStreet] = useState(consignee.street);
  const [shipZip, setShipZip] = useState(consignee.zip);
  const [shipCity, setShipCity] = useState(consignee.city);
  const [shipCountry, setShipCountry] = useState(consignee.country);

  function handlePrint(url: string, crop: boolean) {
    const proxyUrl = `/api/shipping/label-page1?url=${encodeURIComponent(url)}${crop ? "&crop=1" : ""}`;
    const win = window.open(proxyUrl, "_blank", "width=600,height=800");
    if (win) win.onload = () => win.print();
  }

  async function handleSearch(q: string) {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(q)}`);
      const data = await res.json() as StockItem[];
      // Filter out already selected
      setSearchResults(data.filter((d) => !selectedItems.some((s) => s.internalSku === d.sku)));
    } finally {
      setSearching(false);
    }
  }

  function addItem(item: StockItem) {
    setSelectedItems((prev) => [
      ...prev,
      { internalSku: item.sku, quantity: 1, warehouse: "neuware" },
    ]);
    setSearch("");
    setSearchResults([]);
  }

  function removeItem(sku: string) {
    setSelectedItems((prev) => prev.filter((i) => i.internalSku !== sku));
  }

  function updateItem(sku: string, patch: Partial<SelectedItem>) {
    setSelectedItems((prev) =>
      prev.map((i) => (i.internalSku === sku ? { ...i, ...patch } : i))
    );
  }

  function addManualItem() {
    const id = String(++manualIdRef.current);
    setManualItems((prev) => [...prev, { id, description: "", quantity: 1, warehouse: "neuware" }]);
  }

  function removeManualItem(id: string) {
    setManualItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateManualItem(id: string, patch: Partial<ManualItem>) {
    setManualItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("id", orderId);
    fd.set("carrier", carrier);
    if (carrier === "DHL") fd.set("weight", weight);
    if (carrier === "GEL") fd.set("trackingNumber", manualTracking);
    fd.set("items", JSON.stringify(selectedItems));
    fd.set("manualItems", JSON.stringify(manualItems));
    fd.set("shipName", shipName.trim());
    fd.set("shipStreet", shipStreet.trim());
    fd.set("shipZip", shipZip.trim());
    fd.set("shipCity", shipCity.trim());
    fd.set("shipCountry", shipCountry.trim());

    startTransition(async () => {
      const res = await shipOrder(fd);
      setResult(res);
    });
  }

  function handleClose() {
    setOpen(false);
    setResult(null);
    setSelectedItems([]);
    setManualItems([]);
    setCarrier("DHL");
    setWeight("");
    setManualTracking("");
    setSearch("");
    setSearchResults([]);
    setShipName(consignee.name);
    setShipStreet(consignee.street);
    setShipZip(consignee.zip);
    setShipCity(consignee.city);
    setShipCountry(consignee.country);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2.5 rounded-xl bg-brand-red px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-red-dark"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        Versenden
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-grey-border px-6 py-4">
              <div>
                <div className="text-sm font-bold text-grey-dark">Bestellung versenden</div>
                {orderNumber && (
                  <div className="mt-0.5 font-mono text-xs text-grey-mid">{orderNumber}</div>
                )}
                {orderItems.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {orderItems.map((item) => (
                      <span key={item.marketplaceSku} className="inline-flex items-center rounded border border-grey-border bg-grey-light px-1.5 py-0.5 font-mono text-[10px] font-semibold text-grey-dark">
                        {item.marketplaceSku}
                        {item.quantity > 1 && <span className="ml-1 text-grey-mid">×{item.quantity}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-grey-mid hover:bg-grey-light hover:text-grey-dark"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {result?.ok ? (
              result.sandbox ? (
                /* Sandbox Test State */
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-grey-dark">Sandbox-Test erfolgreich</div>
                    <div className="mt-1 font-mono text-xs text-grey-mid">
                      DHL API funktioniert — kein echter Versand
                    </div>
                  </div>
                  <div className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left">
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-600 mb-1">Test-Tracking</div>
                    <div className="font-mono text-xs text-blue-800 break-all">{result.trackingNumber}</div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-mono text-[10px] text-amber-700 text-left w-full">
                    Bestellung bleibt offen · Kein Lagerabzug · Otto nicht benachrichtigt.<br />
                    Für echten Versand: <strong>DHL_ENV=production</strong> in Vercel setzen.
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg border border-grey-border px-4 py-2 font-mono text-xs text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              ) : (
              /* Production Success State */
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-green-200 bg-green-50 text-green-700">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-grey-dark">Versand erstellt</div>
                  <div className="mt-1 font-mono text-xs text-grey-mid">
                    Tracking: {result.trackingNumber}
                  </div>
                </div>
                {result.labelUrl && (
                  <button
                    type="button"
                    onClick={() => result.labelUrl && handlePrint(result.labelUrl, !!result.returnTrackingNumber)}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-red px-4 py-2 font-mono text-xs font-semibold text-brand-red hover:bg-brand-red hover:text-white transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Label drucken (A5)
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-2 rounded-lg border border-grey-border px-4 py-2 font-mono text-xs text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors"
                >
                  Schließen
                </button>
              </div>
              )
            ) : (
              /* Form */
              <form ref={formRef} onSubmit={handleSubmit}>
                <div className="max-h-[60vh] overflow-y-auto p-6 space-y-5">

                  {/* Error */}
                  {result && !result.ok && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-mono text-xs text-red-700">
                      {result.error}
                    </div>
                  )}

                  {/* Carrier selection */}
                  <div>
                    <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                      Versandart
                    </div>
                    <div className="flex gap-3">
                      {(["DHL", "GEL"] as const).map((c) => (
                        <label
                          key={c}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors ${
                            carrier === c
                              ? "border-brand-red bg-brand-red/5 text-brand-red"
                              : "border-grey-border text-grey-dark hover:border-grey-dark"
                          }`}
                        >
                          <input
                            type="radio"
                            name="carrier"
                            value={c}
                            checked={carrier === c}
                            onChange={() => setCarrier(c)}
                            className="sr-only"
                          />
                          <span className="font-mono text-sm font-semibold">
                            {c === "DHL" ? "DHL Paket" : "GEL Express"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Lieferadresse */}
                  <div>
                    <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                      Lieferadresse
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={shipName}
                        onChange={(e) => setShipName(e.target.value)}
                        placeholder="Name"
                        required
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={shipStreet}
                        onChange={(e) => setShipStreet(e.target.value)}
                        placeholder="Straße + Hausnummer"
                        required
                        className={inputClass}
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={shipZip}
                          onChange={(e) => setShipZip(e.target.value)}
                          placeholder="PLZ"
                          required
                          className={`${inputClass} w-28 flex-shrink-0`}
                        />
                        <input
                          type="text"
                          value={shipCity}
                          onChange={(e) => setShipCity(e.target.value)}
                          placeholder="Stadt"
                          required
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={shipCountry}
                          onChange={(e) => setShipCountry(e.target.value)}
                          placeholder="Land"
                          required
                          className={`${inputClass} w-16 flex-shrink-0`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ERP article search */}
                  <div>
                    <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                      ERP-Artikel zuordnen
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="SKU oder Artikelname suchen …"
                        className={inputClass}
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-grey-border bg-white shadow-lg">
                          {searchResults.map((item) => (
                            <button
                              key={item.sku}
                              type="button"
                              onClick={() => addItem(item)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-grey-light"
                            >
                              <div>
                                <div className="font-mono text-xs font-semibold text-grey-dark">{item.sku}</div>
                                <div className="text-xs text-grey-mid">{item.name}</div>
                              </div>
                              <div className="font-mono text-[10px] text-grey-mid">
                                {item.stock} NW · {item.stockNS} NS
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searching && (
                        <div className="absolute right-3 top-2 font-mono text-[10px] text-grey-mid">
                          Suche…
                        </div>
                      )}
                    </div>

                    {/* Selected ERP items */}
                    {selectedItems.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedItems.map((item) => (
                          <SelectedItemRow
                            key={item.internalSku}
                            item={item}
                            onUpdate={(patch) => updateItem(item.internalSku, patch)}
                            onRemove={() => removeItem(item.internalSku)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Manual items */}
                    {manualItems.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {manualItems.map((item) => (
                          <ManualItemRow
                            key={item.id}
                            item={item}
                            onUpdate={(patch) => updateManualItem(item.id, patch)}
                            onRemove={() => removeManualItem(item.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Add manual item button */}
                    <button
                      type="button"
                      onClick={addManualItem}
                      className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-grey-border px-3 py-2 font-mono text-xs text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Manuell hinzufügen
                    </button>
                  </div>

                  {/* Carrier-specific fields */}
                  {carrier === "DHL" && (
                    <div>
                      <label className="grid gap-1.5">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                          Gewicht (kg)
                        </span>
                        <select
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          required
                          className={inputClass}
                        >
                          <option value="">Gewichtsklasse wählen …</option>
                          {WEIGHT_CLASSES.map((w) => (
                            <option key={w.value} value={w.value}>{w.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}

                  {carrier === "GEL" && (
                    <div>
                      <label className="grid gap-1.5">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
                          Tracking-Nummer
                        </span>
                        <input
                          type="text"
                          value={manualTracking}
                          onChange={(e) => setManualTracking(e.target.value)}
                          placeholder="GEL Tracking-Nummer"
                          required
                          className={inputClass}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-grey-border px-6 py-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg border border-grey-border px-4 py-2 font-mono text-sm text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || (selectedItems.length === 0 && manualItems.length === 0)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        Versende…
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        Versenden
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ManualItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: ManualItem;
  onUpdate: (patch: Partial<ManualItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-grey-border bg-amber-50/40 p-2.5">
      <input
        type="text"
        value={item.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder="Artikelbezeichnung (z.B. Filter)"
        className="h-7 flex-1 min-w-0 rounded border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
      />
      <input
        type="number"
        min="1"
        value={item.quantity}
        onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
        className="h-7 w-16 rounded border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark text-center focus:border-brand-red focus:outline-none"
      />
      <select
        value={item.warehouse}
        onChange={(e) => onUpdate({ warehouse: e.target.value as "neuware" | "ns" })}
        className="h-7 rounded border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
      >
        <option value="neuware">Neuware</option>
        <option value="ns">NS-Lager</option>
      </select>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-grey-mid hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function SelectedItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: SelectedItem;
  onUpdate: (patch: Partial<SelectedItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-grey-border bg-grey-light/50 p-2.5">
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs font-semibold text-grey-dark truncate">{item.internalSku}</div>
      </div>
      <input
        type="number"
        min="1"
        value={item.quantity}
        onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
        className="h-7 w-16 rounded border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark text-center focus:border-brand-red focus:outline-none"
      />
      <select
        value={item.warehouse}
        onChange={(e) => onUpdate({ warehouse: e.target.value as "neuware" | "ns" })}
        className="h-7 rounded border border-grey-border bg-white px-2 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none"
      >
        <option value="neuware">Neuware</option>
        <option value="ns">NS-Lager</option>
      </select>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-grey-mid hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
