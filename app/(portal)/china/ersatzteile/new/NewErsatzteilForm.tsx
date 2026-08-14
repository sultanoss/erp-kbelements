"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props { userName: string; }

const BUCKET = "china-media";
const MAX_PX = 1200;
const WEBP_QUALITY = 0.75;
const MAX_DOC_BYTES = 20 * 1024 * 1024;

function getMediaTypeFromFile(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.name.match(/\.xlsx?$/i)) return "excel";
  if (file.name.match(/\.docx?$/i)) return "word";
  if (file.type === "application/pdf") return "pdf";
  return "image";
}

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
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
      (blob) => (blob ? resolve(blob) : reject(new Error("Fehler"))),
      "image/webp", WEBP_QUALITY
    )
  );
}

export default function NewErsatzteilForm({ userName }: Props) {
  const [fabrik, setFabrik] = useState("");
  const [produkt, setProdukt] = useState("");
  const [notiz, setNotiz] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleFileSelect(fileList: FileList | null) {
    if (!fileList) return;
    const valid: File[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_DOC_BYTES) { setError(`"${file.name}" zu groß (max. 20 MB).`); continue; }
      valid.push(file);
    }
    setPendingFiles((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!produkt.trim()) { setError("Produkt ist erforderlich."); return; }
    setSaving(true);
    setError("");
    setUploadProgress("");

    const { data, error: dbError } = await supabase
      .from("ware_in_china")
      .insert({
        order_pi_nummer: `ERSATZTEIL:${produkt.trim()}`,
        fabrik: fabrik.trim() || null,
        notiz: notiz.trim() || null,
        created_by: userName,
      })
      .select("id")
      .single();

    if (dbError || !data) { setError(dbError?.message ?? "Fehler beim Speichern."); setSaving(false); return; }

    if (pendingFiles.length > 0) {
      const prefix = `ersatzteile/${data.id}`;
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        setUploadProgress(`Datei ${i + 1} von ${pendingFiles.length} hochladen…`);
        try {
          const mediaType = getMediaTypeFromFile(file);
          let uploadBlob: Blob = file;
          let contentType = file.type;
          let ext = file.name.split(".").pop() ?? "bin";
          if (mediaType === "image") {
            uploadBlob = await compressImage(file);
            contentType = "image/webp";
            ext = "webp";
          }
          await supabase.storage.from(BUCKET).upload(`${prefix}/${randomId()}.${ext}`, uploadBlob, { contentType, upsert: false });
        } catch { /* einzelne Datei-Fehler ignorieren */ }
      }
    }

    router.push(`/china/ersatzteile/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card p-4 space-y-4">
        <div>
          <label className="label">Produkt</label>
          <input className="input" placeholder="z.B. Lüftermotor, Dichtung, Platine…" value={produkt} onChange={(e) => setProdukt(e.target.value)} required />
        </div>
        <div>
          <label className="label">Fabrik <span className="text-stone-400 font-normal">(optional)</span></label>
          <input className="input" placeholder="z.B. Guangzhou Electronics Co." value={fabrik} onChange={(e) => setFabrik(e.target.value)} />
        </div>
        <div>
          <label className="label">Notiz <span className="text-stone-400 font-normal">(optional)</span></label>
          <textarea rows={4} className="input resize-none" placeholder="Weitere Informationen, Teilenummer, Beschreibung…" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="label mb-0">Dateien <span className="text-stone-400 font-normal">(optional)</span></label>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Datei hinzufügen
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.doc,.docx"
            className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
        </div>
        {pendingFiles.length === 0 ? (
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-stone-200 py-6 text-center text-xs text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-colors">
            <svg className="w-7 h-7 mx-auto mb-1.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Bilder, Excel oder Word hochladen
          </button>
        ) : (
          <div className="space-y-1.5">
            {pendingFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-stone-50 border border-stone-200 px-3 py-2">
                <span className="text-xs text-stone-700 truncate max-w-xs">{file.name}</span>
                <button type="button" onClick={() => removeFile(idx)} className="ml-2 text-stone-400 hover:text-red-600 transition-colors flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => router.push("/china/ersatzteile")} disabled={saving}>Abbrechen</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? (uploadProgress || "Erstellen…") : "Eintrag erstellen"}
        </button>
      </div>
    </form>
  );
}
