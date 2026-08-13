"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface MediaRecord {
  id: string;
  storage_path: string;
  filename: string;
  media_type: string;
  url?: string;
}

interface Props {
  wareId: string;
  userName: string;
  initialMedia: Array<{ id: string; storage_path: string; filename: string; media_type: string }>;
}

const MAX_PX = 1200;
const WEBP_QUALITY = 0.75;
const MAX_MEDIA = 10;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const BUCKET = "china-media";

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Komprimierung fehlgeschlagen"))),
      "image/webp", WEBP_QUALITY
    )
  );
}

function getMediaType(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  if (file.name.match(/\.xlsx?$/i)) return "excel";
  if (file.name.match(/\.docx?$/i)) return "word";
  return "image";
}

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function getSignedUrl(supabase: ReturnType<typeof createClient>, path: string): Promise<string> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}

function DocBadge({ type, filename }: { type: string; filename: string }) {
  const cfg = {
    pdf:   { label: "PDF", bg: "bg-red-100",   text: "text-red-700" },
    excel: { label: "XLS", bg: "bg-green-100", text: "text-green-700" },
    word:  { label: "DOC", bg: "bg-blue-100",  text: "text-blue-700" },
  }[type] ?? { label: "DOC", bg: "bg-stone-100", text: "text-stone-700" };
  return (
    <div className="w-full h-full rounded-lg border border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-1 p-2">
      <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
      <span className="text-xs text-stone-400 truncate text-center max-w-full px-1">{filename}</span>
    </div>
  );
}

export default function WareMedia({ wareId, userName, initialMedia }: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<MediaRecord[]>(initialMedia);
  const [loadedUrls, setLoadedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function ensureUrls(items: MediaRecord[]) {
    const missing = items.filter((m) => !loadedUrls[m.id]);
    if (!missing.length) return;
    const entries = await Promise.all(
      missing.map(async (m) => [m.id, await getSignedUrl(supabase, m.storage_path)] as const)
    );
    setLoadedUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }

  useEffect(() => {
    if (initialMedia.length) ensureUrls(initialMedia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError("");
    const remaining = MAX_MEDIA - media.length;
    if (remaining <= 0) { setError(`Maximal ${MAX_MEDIA} Dateien.`); return; }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    const newMedia: MediaRecord[] = [];

    for (const file of toUpload) {
      const mediaType = getMediaType(file);
      if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) { setError(`Video "${file.name}" zu groß (max. 100 MB).`); continue; }
      if (mediaType !== "image" && mediaType !== "video" && file.size > MAX_DOC_BYTES) { setError(`"${file.name}" zu groß (max. 20 MB).`); continue; }

      try {
        let uploadBlob: Blob = file;
        let contentType = file.type;
        let ext = file.name.split(".").pop() ?? "bin";
        if (mediaType === "image") {
          uploadBlob = await compressImage(file);
          contentType = "image/webp";
          ext = "webp";
        }
        const path = `ware/${wareId}/${randomId()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, uploadBlob, { contentType, upsert: false });
        if (uploadError) throw uploadError;

        const { data: row, error: dbError } = await supabase
          .from("ware_media")
          .insert({ ware_id: wareId, storage_path: path, filename: file.name, media_type: mediaType, uploaded_by: userName })
          .select("id, storage_path, filename, media_type")
          .single();
        if (dbError) throw dbError;

        const url = await getSignedUrl(supabase, path);
        newMedia.push({ ...row, url });
        setLoadedUrls((prev) => ({ ...prev, [row.id]: url }));
      } catch (e) {
        setError(`Fehler bei "${file.name}": ${(e as Error).message}`);
      }
    }

    setMedia((prev) => [...prev, ...newMedia]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(item: MediaRecord) {
    setDeletingId(item.id);
    setError("");
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path]);
    if (storageError) { setError(`Löschen fehlgeschlagen: ${storageError.message}`); setDeletingId(null); return; }
    await supabase.from("ware_media").delete().eq("id", item.id);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    setLoadedUrls((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
    setDeletingId(null);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">
          Dateien ({media.length}/{MAX_MEDIA})
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || media.length >= MAX_MEDIA}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <><svg className="w-3.5 h-3.5 animate-spin text-stone-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>Hochladen...</>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>Datei hinzufügen</>
          )}
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/*,.pdf,.xlsx,.xls,.doc,.docx"
          multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {media.length === 0 ? (
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full rounded-lg border-2 border-dashed border-stone-200 py-8 text-center text-xs text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-colors disabled:opacity-40">
          <svg className="w-8 h-8 mx-auto mb-2 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Bilder, Videos, PDFs, Excel oder Word hochladen
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {media.map((item) => {
            const url = loadedUrls[item.id];
            const isDeleting = deletingId === item.id;
            return (
              <div key={item.id} className="relative group aspect-square">
                {url ? (
                  item.media_type === "video" ? (
                    <video src={url} controls className="w-full h-full object-cover rounded-lg border border-stone-200" />
                  ) : item.media_type === "image" ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <img src={url} alt={item.filename} className="w-full h-full object-cover rounded-lg border border-stone-200" />
                    </a>
                  ) : (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <DocBadge type={item.media_type} filename={item.filename} />
                    </a>
                  )
                ) : (
                  <div className="w-full h-full rounded-lg bg-stone-100 animate-pulse" />
                )}
                <button onClick={() => handleDelete(item)} disabled={isDeleting}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:opacity-50"
                  title="Löschen">
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
