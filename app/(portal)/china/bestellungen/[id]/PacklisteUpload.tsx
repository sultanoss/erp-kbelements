"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PacklisteFile {
  id: string;
  storage_path: string;
  filename: string;
  url?: string;
}

interface Props {
  bestellungId: string;
  userName: string;
  initialFiles: Array<{ id: string; storage_path: string; filename: string }>;
  canUpload?: boolean;
}

const BUCKET = "china-media";
const MAX_BYTES = 50 * 1024 * 1024;

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fileLabel(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, { label: string; bg: string; text: string }> = {
    pdf:  { label: "PDF",  bg: "bg-red-100",    text: "text-red-700" },
    xlsx: { label: "XLS",  bg: "bg-green-100",  text: "text-green-700" },
    xls:  { label: "XLS",  bg: "bg-green-100",  text: "text-green-700" },
    docx: { label: "DOC",  bg: "bg-blue-100",   text: "text-blue-700" },
    doc:  { label: "DOC",  bg: "bg-blue-100",   text: "text-blue-700" },
  };
  return map[ext] ?? { label: ext.toUpperCase() || "FILE", bg: "bg-stone-100", text: "text-stone-700" };
}

export default function PacklisteUpload({ bestellungId, userName, initialFiles, canUpload = true }: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PacklisteFile[]>(initialFiles);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadUrls(items: PacklisteFile[]) {
    const missing = items.filter((f) => !urls[f.id]);
    if (!missing.length) return;
    const entries = await Promise.all(
      missing.map(async (f) => {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 3600);
        return [f.id, data?.signedUrl ?? ""] as const;
      })
    );
    setUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }

  useEffect(() => {
    if (initialFiles.length) loadUrls(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) { setError(`Datei zu groß (max. 50 MB).`); return; }
    setError("");
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${bestellungId}/packliste/${randomId()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: row, error: dbErr } = await supabase
        .from("china_media")
        .insert({ bestellung_id: bestellungId, storage_path: path, filename: file.name, media_type: "packliste", uploaded_by: userName })
        .select("id, storage_path, filename")
        .single();
      if (dbErr) throw dbErr;

      const { data: urlData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      const url = urlData?.signedUrl ?? "";
      setFiles((prev) => [...prev, { ...row, url }]);
      setUrls((prev) => ({ ...prev, [row.id]: url }));
    } catch (e) {
      setError(`Fehler: ${(e as Error).message}`);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(f: PacklisteFile) {
    setDeletingId(f.id);
    setError("");
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([f.storage_path]);
    if (storageErr) { setError(`Löschen fehlgeschlagen: ${storageErr.message}`); setDeletingId(null); return; }
    await supabase.from("china_media").delete().eq("id", f.id);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    setUrls((prev) => { const n = { ...prev }; delete n[f.id]; return n; });
    setDeletingId(null);
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">Packliste</div>
        {canUpload && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
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
                </svg>Packliste hochladen</>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf,.xlsx,.xls,.doc,.docx,.csv,.txt,video/*"
              className="hidden"
              onChange={handleFile}
            />
          </>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {files.length === 0 ? (
        canUpload ? (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-lg border-2 border-dashed border-stone-200 py-6 text-center text-xs text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-colors disabled:opacity-40"
          >
            <svg className="w-7 h-7 mx-auto mb-1.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Packliste hochladen (PDF, Excel, Word, ...)
          </button>
        ) : (
          <p className="text-xs text-stone-400 text-center py-4">Keine Packliste vorhanden.</p>
        )
      ) : (
        <div className="space-y-2">
          {files.map((f) => {
            const url = urls[f.id];
            const isDeleting = deletingId === f.id;
            const lbl = fileLabel(f.filename);
            return (
              <div key={f.id} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold flex-shrink-0 ${lbl.bg} ${lbl.text}`}>{lbl.label}</span>
                <span className="flex-1 text-xs text-stone-700 truncate">{f.filename}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors">
                      Herunterladen
                    </a>
                  )}
                  {canUpload && (
                    <button
                      onClick={() => handleDelete(f)}
                      disabled={isDeleting}
                      className="text-stone-300 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Löschen"
                    >
                      {isDeleting ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
