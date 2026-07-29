"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { updateItemMeta } from "./actions";

interface ItemMeta {
  sku: string;
  name: string;
  description: string | null;
  highlights: string | null;
  scopeOfDelivery: string | null;
  imageUrl: string | null;
}

interface Props {
  item: ItemMeta;
  onClose: () => void;
  onSaved: (updated: Partial<ItemMeta>) => void;
}

export function ItemMetaModal({ item, onClose, onSaved }: Props) {
  const [description, setDescription]       = useState(item.description ?? "");
  const [highlights, setHighlights]         = useState(item.highlights ?? "");
  const [scopeOfDelivery, setScopeOfDelivery] = useState(item.scopeOfDelivery ?? "");
  const [imageUrl, setImageUrl]             = useState(item.imageUrl ?? "");
  const [uploading, setUploading]           = useState(false);
  const [uploadError, setUploadError]       = useState("");
  const [saving, startSaving]               = useTransition();
  const [lightboxOpen, setLightboxOpen]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close lightbox on ESC
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/items/${encodeURIComponent(item.sku)}/image`, {
      method: "PUT",
      body: form,
    });
    if (res.ok) {
      const data = await res.json();
      setImageUrl(data.url);
    } else {
      setUploadError("Upload failed");
    }
    setUploading(false);
  }

  async function handleRemoveImage() {
    setUploading(true);
    await fetch(`/api/items/${encodeURIComponent(item.sku)}/image`, { method: "DELETE" });
    setImageUrl("");
    setUploading(false);
  }

  function handleSave() {
    startSaving(async () => {
      await updateItemMeta(item.sku, { description, highlights, scopeOfDelivery });
      onSaved({ description, highlights, scopeOfDelivery, imageUrl });
      onClose();
    });
  }

  return (
    <>
      {/* Lightbox */}
      {lightboxOpen && imageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={imageUrl}
            alt={item.sku}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-6 text-white/70 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">

          {/* Header — zentriert */}
          <div className="relative flex flex-col items-center border-b border-grey-border px-7 py-5">
            <div className="font-mono text-[11px] font-bold tracking-wide text-brand-red">{item.sku}</div>
            <div className="mt-0.5 text-sm font-semibold text-grey-dark text-center">{item.name || "–"}</div>
            <button
              onClick={onClose}
              className="absolute right-5 top-5 text-grey-mid hover:text-grey-dark text-lg leading-none"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5 px-7 py-6">

            {/* Image */}
            <div>
              <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-grey-mid">
                Product Image
              </div>
              {imageUrl ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="group relative block w-full overflow-hidden rounded-lg border border-grey-border bg-grey-light/30"
                    title="Klicken für Vollbild"
                  >
                    <img
                      src={imageUrl}
                      alt={item.sku}
                      className="h-40 w-full object-contain transition-opacity group-hover:opacity-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="rounded-md bg-black/50 px-3 py-1.5 font-mono text-[11px] font-semibold text-white">
                        🔍 Vollbild
                      </span>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex-1 rounded border border-grey-border py-1.5 font-mono text-xs text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-40"
                    >
                      Replace
                    </button>
                    <button
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      className="flex-1 rounded border border-red-200 py-1.5 font-mono text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-grey-border font-mono text-xs text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-40"
                >
                  {uploading ? "Uploading…" : "↑ Upload Image"}
                </button>
              )}
              {uploadError && <p className="mt-1 font-mono text-xs text-red-600">{uploadError}</p>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-grey-mid">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-grey-border px-3 py-2.5 font-mono text-xs text-grey-dark placeholder:text-grey-mid/50 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 resize-y"
                placeholder="Short product description…"
              />
            </div>

            {/* Highlights */}
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-grey-mid">
                Highlights
              </label>
              <textarea
                rows={4}
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                className="w-full rounded-md border border-grey-border px-3 py-2.5 font-mono text-xs text-grey-dark placeholder:text-grey-mid/50 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 resize-y"
                placeholder={"One highlight per line:\nBoost-Funktion\nTimer\nKindersicherung"}
              />
              <p className="mt-1 font-mono text-[10px] text-grey-mid/70">Ein Punkt pro Zeile (kein Komma)</p>
            </div>

            {/* Scope of Delivery */}
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-grey-mid">
                Scope of Delivery
              </label>
              <textarea
                rows={4}
                value={scopeOfDelivery}
                onChange={(e) => setScopeOfDelivery(e.target.value)}
                className="w-full rounded-md border border-grey-border px-3 py-2.5 font-mono text-xs text-grey-dark placeholder:text-grey-mid/50 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 resize-y"
                placeholder="What's included…"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-grey-border px-7 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-grey-border px-4 py-2 font-mono text-xs text-grey-mid hover:text-grey-dark transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="rounded-lg bg-brand-red px-5 py-2 font-mono text-xs font-semibold text-white hover:bg-brand-red/90 disabled:opacity-40 transition-opacity"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
