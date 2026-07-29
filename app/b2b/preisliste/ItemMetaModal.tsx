"use client";

import { useState, useRef, useTransition } from "react";
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
  const [description, setDescription] = useState(item.description ?? "");
  const [highlights, setHighlights] = useState(item.highlights ?? "");
  const [scopeOfDelivery, setScopeOfDelivery] = useState(item.scopeOfDelivery ?? "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, startSaving] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-grey-border px-5 py-4">
          <div>
            <div className="font-mono text-xs font-bold text-brand-red">{item.sku}</div>
            <div className="text-sm font-semibold text-grey-dark">{item.name || "–"}</div>
          </div>
          <button onClick={onClose} className="text-grey-mid hover:text-grey-dark text-lg leading-none">✕</button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Image */}
          <div>
            <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-grey-mid">Product Image</div>
            {imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt={item.sku} className="h-16 w-16 rounded-lg object-contain border border-grey-border bg-grey-light/40" />
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="rounded border border-grey-border px-3 py-1 font-mono text-xs text-grey-dark hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-40"
                  >
                    Replace
                  </button>
                  <button
                    onClick={handleRemoveImage}
                    disabled={uploading}
                    className="rounded border border-red-200 px-3 py-1 font-mono text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-grey-border font-mono text-xs text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-40"
              >
                {uploading ? "Uploading…" : "↑ Upload Image"}
              </button>
            )}
            {uploadError && <p className="mt-1 font-mono text-xs text-red-600">{uploadError}</p>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-grey-mid">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-grey-border px-3 py-2 font-mono text-xs text-grey-dark placeholder:text-grey-mid/50 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 resize-none"
              placeholder="Short product description…"
            />
          </div>

          {/* Highlights */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-grey-mid">Highlights</label>
            <textarea
              rows={2}
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              className="w-full rounded-md border border-grey-border px-3 py-2 font-mono text-xs text-grey-dark placeholder:text-grey-mid/50 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 resize-none"
              placeholder="Key features / Besonderheiten…"
            />
          </div>

          {/* Scope of Delivery */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-grey-mid">Scope of Delivery</label>
            <textarea
              rows={2}
              value={scopeOfDelivery}
              onChange={(e) => setScopeOfDelivery(e.target.value)}
              className="w-full rounded-md border border-grey-border px-3 py-2 font-mono text-xs text-grey-dark placeholder:text-grey-mid/50 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 resize-none"
              placeholder="What's included…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-grey-border px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-grey-border px-4 py-2 font-mono text-xs text-grey-mid hover:text-grey-dark transition-colors">
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
  );
}
