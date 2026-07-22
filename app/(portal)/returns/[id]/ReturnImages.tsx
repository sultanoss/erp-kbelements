"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ImageRecord {
  id: string;
  storage_path: string;
  filename: string;
  url?: string;
}

interface Props {
  returnId: string;
  userName: string;
  initialImages: Array<{ id: string; storage_path: string; filename: string }>;
}

const MAX_PX = 1200;
const WEBP_QUALITY = 0.75;
const MAX_IMAGES = 10;
const BUCKET = "return-images";

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Komprimierung fehlgeschlagen"))),
      "image/webp",
      WEBP_QUALITY
    )
  );
}

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function getSignedUrl(supabase: ReturnType<typeof createClient>, path: string): Promise<string> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}

export default function ReturnImages({ returnId, userName, initialImages }: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageRecord[]>(initialImages);
  const [loadedUrls, setLoadedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Load signed URLs for images that don't have one yet
  async function ensureUrls(imgs: ImageRecord[]) {
    const missing = imgs.filter((img) => !loadedUrls[img.id]);
    if (!missing.length) return;
    const entries = await Promise.all(
      missing.map(async (img) => [img.id, await getSignedUrl(supabase, img.storage_path)] as const)
    );
    setLoadedUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }

  // Load URLs on first render
  useState(() => {
    if (initialImages.length) ensureUrls(initialImages);
  });

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError("");

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Maximal ${MAX_IMAGES} Bilder pro Retoure.`);
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    const newImages: ImageRecord[] = [];

    for (const file of toUpload) {
      try {
        const blob = await compressImage(file);
        const path = `${returnId}/${randomId()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: "image/webp", upsert: false });

        if (uploadError) throw uploadError;

        const { data: row, error: dbError } = await supabase
          .from("return_images")
          .insert({ return_id: returnId, storage_path: path, filename: file.name, uploaded_by: userName })
          .select("id, storage_path, filename")
          .single();

        if (dbError) throw dbError;

        const url = await getSignedUrl(supabase, path);
        newImages.push({ ...row, url });
        setLoadedUrls((prev) => ({ ...prev, [row.id]: url }));
      } catch (e) {
        setError(`Fehler beim Hochladen von "${file.name}": ${(e as Error).message}`);
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);

    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(img: ImageRecord) {
    setDeletingId(img.id);
    setError("");

    const { error: storageError } = await supabase.storage.from(BUCKET).remove([img.storage_path]);
    if (storageError) {
      setError(`Löschen fehlgeschlagen: ${storageError.message}`);
      setDeletingId(null);
      return;
    }

    await supabase.from("return_images").delete().eq("id", img.id);

    setImages((prev) => prev.filter((i) => i.id !== img.id));
    setLoadedUrls((prev) => { const n = { ...prev }; delete n[img.id]; return n; });
    setDeletingId(null);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">
          Bilder ({images.length}/{MAX_IMAGES})
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin text-stone-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Hochladen...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Bilder hinzufügen
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {images.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-lg border-2 border-dashed border-stone-200 py-8 text-center text-xs text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-colors disabled:opacity-40"
        >
          <svg className="w-8 h-8 mx-auto mb-2 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Bilder hochladen
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => {
            const url = loadedUrls[img.id];
            const isDeleting = deletingId === img.id;
            return (
              <div key={img.id} className="relative group aspect-square">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                    <img
                      src={url}
                      alt={img.filename}
                      className="w-full h-full object-cover rounded-lg border border-stone-200"
                    />
                  </a>
                ) : (
                  <div className="w-full h-full rounded-lg bg-stone-100 animate-pulse" />
                )}
                <button
                  onClick={() => handleDelete(img)}
                  disabled={isDeleting}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:opacity-50"
                  title="Bild löschen"
                >
                  {isDeleting ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
