"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface MediaRecord {
  id: string;
  storage_path: string;
  filename: string;
  media_type: string;
}

const MAX_PX = 1200;
const WEBP_QUALITY = 0.75;
const MAX_FILES = 10;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const BUCKET = "note-media";

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
  if (file.type === "application/pdf") return "pdf";
  if (file.name.match(/\.xlsx?$/i)) return "excel";
  if (file.name.match(/\.docx?$/i)) return "word";
  return "image";
}

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function DocBadge({ type, filename }: { type: string; filename: string }) {
  const cfg = {
    pdf:   { label: "PDF", bg: "bg-red-100",   text: "text-red-700"   },
    excel: { label: "XLS", bg: "bg-green-100",  text: "text-green-700" },
    word:  { label: "DOC", bg: "bg-blue-100",   text: "text-blue-700"  },
  }[type] ?? { label: "DOC", bg: "bg-stone-100", text: "text-stone-700" };
  return (
    <div className="w-full h-full rounded-lg border border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-1 p-2">
      <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
      <span className="text-xs text-stone-400 truncate text-center max-w-full px-1">{filename}</span>
    </div>
  );
}

export default function NotizenMedia({ noteId, userId }: { noteId: string; userId: string }) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loadedUrls, setLoadedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("note_media").select("id, storage_path, filename, media_type")
      .eq("note_id", noteId).order("created_at")
      .then(({ data }) => {
        if (data?.length) {
          setMedia(data);
          Promise.all(
            data.map(async (m) => {
              const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(m.storage_path, 3600);
              return [m.id, s?.signedUrl ?? ""] as const;
            })
          ).then((entries) => setLoadedUrls(Object.fromEntries(entries)));
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    if (media.length >= MAX_FILES) { setError(`Maximal ${MAX_FILES} Dateien pro Notiz.`); return; }
    const toUpload = Array.from(files).slice(0, MAX_FILES - media.length);
    setUploading(true);

    for (const file of toUpload) {
      const mediaType = getMediaType(file);
      if (mediaType !== "image" && file.size > MAX_DOC_BYTES) {
        setError(`"${file.name}" ist zu groß (max. 20 MB).`); continue;
      }
      try {
        let uploadBlob: Blob = file;
        let contentType = file.type;
        let ext = file.name.split(".").pop() ?? "bin";
        if (mediaType === "image") {
          uploadBlob = await compressImage(file);
          contentType = "image/webp"; ext = "webp";
        }
        const path = `${noteId}/${randomId()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, uploadBlob, { contentType, upsert: false });
        if (upErr) throw upErr;

        const { data: row, error: dbErr } = await supabase.from("note_media")
          .insert({ note_id: noteId, storage_path: path, filename: file.name, media_type: mediaType, user_id: userId })
          .select("id, storage_path, filename, media_type").single();
        if (dbErr) throw dbErr;

        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        const url = s?.signedUrl ?? "";
        setMedia((prev) => [...prev, row]);
        setLoadedUrls((prev) => ({ ...prev, [row.id]: url }));
      } catch (e) {
        setError(`Fehler bei "${file.name}": ${(e as Error).message}`);
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(item: MediaRecord) {
    setDeletingId(item.id);
    await supabase.storage.from(BUCKET).remove([item.storage_path]);
    await supabase.from("note_media").delete().eq("id", item.id);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    setLoadedUrls((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
    setDeletingId(null);
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Dateien ({media.length}/{MAX_FILES})
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || media.length >= MAX_FILES}
          className="inline-flex items-center gap-1 text-xs text-brand-red hover:underline disabled:opacity-40 disabled:no-underline"
        >
          {uploading ? "Hochladen…" : (
            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>Datei hinzufügen</>
          )}
        </button>
        <input ref={inputRef} type="file" accept="image/*,.pdf,.xlsx,.xls,.doc,.docx"
          multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600">{error}</p>
      )}

      {media.length === 0 ? (
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full rounded-lg border-2 border-dashed border-gray-200 py-4 text-center text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors disabled:opacity-40">
          Bilder, PDFs, Excel oder Word hochladen
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {media.map((item) => {
            const url = loadedUrls[item.id];
            return (
              <div key={item.id} className="relative group aspect-square">
                {url ? (
                  item.media_type === "image" ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <img src={url} alt={item.filename} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                    </a>
                  ) : (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <DocBadge type={item.media_type} filename={item.filename} />
                    </a>
                  )
                ) : (
                  <div className="w-full h-full rounded-lg bg-gray-100 animate-pulse" />
                )}
                <button onClick={() => handleDelete(item)} disabled={deletingId === item.id}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:opacity-50">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
