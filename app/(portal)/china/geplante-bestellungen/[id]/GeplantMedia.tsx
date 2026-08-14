"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface FileRecord { name: string; path: string; mediaType: string; url?: string; }

const BUCKET = "china-media";
const MAX_PX = 1200;
const WEBP_QUALITY = 0.75;
const MAX_MEDIA = 10;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function getMediaTypeFromFile(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  if (file.name.match(/\.xlsx?$/i)) return "excel";
  if (file.name.match(/\.docx?$/i)) return "word";
  return "image";
}

function getMediaTypeFromExt(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["webp", "jpg", "jpeg", "png", "gif", "avif"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  if (["xlsx", "xls"].includes(ext)) return "excel";
  if (["docx", "doc"].includes(ext)) return "word";
  return "image";
}

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

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function DocBadge({ type }: { type: string }) {
  const cfg: Record<string, { label: string; bg: string; text: string }> = {
    pdf:   { label: "PDF", bg: "bg-red-100",   text: "text-red-700" },
    excel: { label: "XLS", bg: "bg-green-100", text: "text-green-700" },
    word:  { label: "DOC", bg: "bg-blue-100",  text: "text-blue-700" },
  };
  const c = cfg[type] ?? { label: "DOC", bg: "bg-stone-100", text: "text-stone-700" };
  return (
    <div className="w-full h-full rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center">
      <span className={`rounded px-2 py-1 text-sm font-bold ${c.bg} ${c.text}`}>{c.label}</span>
    </div>
  );
}

export default function GeplantMedia({ bestellungId }: { bestellungId: string }) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [error, setError] = useState("");

  const prefix = `geplant/${bestellungId}`;

  async function loadFiles() {
    setLoading(true);
    const { data } = await supabase.storage.from(BUCKET).list(prefix);
    if (!data) { setLoading(false); return; }
    const records: FileRecord[] = data
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => ({ name: f.name, path: `${prefix}/${f.name}`, mediaType: getMediaTypeFromExt(f.name) }));
    if (records.length > 0) {
      const urls = await Promise.all(
        records.map(async (r) => {
          const { data: d } = await supabase.storage.from(BUCKET).createSignedUrl(r.path, 3600);
          return d?.signedUrl ?? "";
        })
      );
      records.forEach((r, i) => { r.url = urls[i]; });
    }
    setFiles(records);
    setLoading(false);
  }

  useEffect(() => { loadFiles(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    setError("");
    const remaining = MAX_MEDIA - files.length;
    if (remaining <= 0) { setError(`Maximal ${MAX_MEDIA} Dateien.`); return; }
    const toUpload = Array.from(fileList).slice(0, remaining);
    setUploading(true);
    for (const file of toUpload) {
      const mediaType = getMediaTypeFromFile(file);
      if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) { setError(`Video "${file.name}" zu groß (max. 100 MB).`); continue; }
      if (!["image", "video"].includes(mediaType) && file.size > MAX_DOC_BYTES) { setError(`"${file.name}" zu groß (max. 20 MB).`); continue; }
      try {
        let uploadBlob: Blob = file;
        let contentType = file.type;
        let ext = file.name.split(".").pop() ?? "bin";
        if (mediaType === "image") {
          uploadBlob = await compressImage(file);
          contentType = "image/webp";
          ext = "webp";
        }
        const name = `${randomId()}.${ext}`;
        const path = `${prefix}/${name}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, uploadBlob, { contentType, upsert: false });
        if (uploadError) throw uploadError;
        const { data: signedData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        setFiles((prev) => [...prev, { name, path, mediaType, url: signedData?.signedUrl ?? "" }]);
      } catch (e) {
        setError(`Fehler bei "${file.name}": ${(e as Error).message}`);
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(file: FileRecord) {
    setDeletingPath(file.path);
    setError("");
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.path]);
    if (storageError) { setError(`Löschen fehlgeschlagen: ${storageError.message}`); setDeletingPath(null); return; }
    setFiles((prev) => prev.filter((f) => f.path !== file.path));
    setDeletingPath(null);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">
          Dateien ({loading ? "…" : `${files.length}/${MAX_MEDIA}`})
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading || loading || files.length >= MAX_MEDIA}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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

      {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {[1, 2, 3].map((i) => <div key={i} className="aspect-square rounded-lg bg-stone-100 animate-pulse" />)}
        </div>
      ) : files.length === 0 ? (
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
          {files.map((file) => {
            const isDeleting = deletingPath === file.path;
            return (
              <div key={file.path} className="relative group aspect-square">
                {file.url ? (
                  file.mediaType === "video" ? (
                    <video src={file.url} controls className="w-full h-full object-cover rounded-lg border border-stone-200" />
                  ) : file.mediaType === "image" ? (
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-lg border border-stone-200" />
                    </a>
                  ) : (
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <DocBadge type={file.mediaType} />
                    </a>
                  )
                ) : (
                  <div className="w-full h-full rounded-lg bg-stone-100 animate-pulse" />
                )}
                <button onClick={() => handleDelete(file)} disabled={isDeleting}
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
