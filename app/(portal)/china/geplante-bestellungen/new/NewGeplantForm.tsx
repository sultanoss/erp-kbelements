"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GeplantTyp } from "../utils";
import { buildOrderPi } from "../utils";

interface Props { userName: string; }
interface ArtikelRow { id: string; artikel: string; anzahl: string; }

const BUCKET = "china-media";
const MAX_PX = 1200;
const WEBP_QUALITY = 0.75;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function newRow(): ArtikelRow {
  return { id: Math.random().toString(36).slice(2), artikel: "", anzahl: "" };
}

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getMediaTypeFromFile(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  if (file.name.match(/\.xlsx?$/i)) return "excel";
  if (file.name.match(/\.docx?$/i)) return "word";
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

export default function NewGeplantForm({ userName }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [typ, setTyp] = useState<GeplantTyp>("ORDER");
  const [fabrik, setFabrik] = useState("");
  const [datum, setDatum] = useState(today);
  const [notiz, setNotiz] = useState("");
  const [artikel, setArtikel] = useState<ArtikelRow[]>([newRow()]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function addRow() { setArtikel((prev) => [...prev, newRow()]); }
  function removeRow(id: string) { setArtikel((prev) => prev.filter((r) => r.id !== id)); }
  function updateRow(id: string, field: "artikel" | "anzahl", value: string) {
    setArtikel((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  function handleFileSelect(fileList: FileList | null) {
    if (!fileList) return;
    const validFiles: File[] = [];
    for (const file of Array.from(fileList)) {
      const mediaType = getMediaTypeFromFile(file);
      if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) { setError(`Video "${file.name}" zu groß (max. 100 MB).`); continue; }
      if (!["image", "video"].includes(mediaType) && file.size > MAX_DOC_BYTES) { setError(`"${file.name}" zu groß (max. 20 MB).`); continue; }
      validFiles.push(file);
    }
    setPendingFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!datum) { setError("Datum ist erforderlich."); return; }
    const validArtikel = artikel.filter((a) => a.artikel.trim());
    setSaving(true);
    setError("");
    setUploadProgress("");

    const { data, error: dbError } = await supabase
      .from("ware_in_china")
      .insert({
        order_pi_nummer: buildOrderPi(datum, typ),
        fabrik: fabrik.trim() || null,
        notiz: notiz.trim() || null,
        created_by: userName,
      })
      .select("id")
      .single();

    if (dbError || !data) { setError(dbError?.message ?? "Fehler beim Speichern."); setSaving(false); return; }

    if (validArtikel.length > 0) {
      const { error: artError } = await supabase
        .from("ware_in_china_artikel")
        .insert(validArtikel.map((a) => ({ ware_id: data.id, artikel: a.artikel.trim(), anzahl: parseInt(a.anzahl) || 1 })));
      if (artError) { setError(artError.message); setSaving(false); return; }
    }

    if (pendingFiles.length > 0) {
      const prefix = `geplant/${data.id}`;
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

    router.push(`/china/geplante-bestellungen/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card p-4 space-y-4">
        {/* Typ-Auswahl */}
        <div>
          <label className="label">Typ</label>
          <div className="flex gap-3">
            {(["ORDER", "LOADING"] as GeplantTyp[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTyp(t)}
                className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                  typ === t
                    ? t === "LOADING"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-stone-700 bg-stone-100 text-stone-800"
                    : "border-stone-200 bg-white text-stone-400 hover:border-stone-300"
                }`}
              >
                {t === "ORDER" ? "Order" : "Loading"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Fabrik <span className="text-stone-400 font-normal">(optional)</span></label>
          <input className="input" placeholder="z.B. Guangzhou Electronics Co." value={fabrik} onChange={(e) => setFabrik(e.target.value)} />
        </div>
        <div>
          <label className="label">Geplantes Datum</label>
          <input type="date" className="input" required value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="label mb-0">Artikel</label>
          <button type="button" onClick={addRow}
            className="inline-flex items-center gap-1 text-xs text-brand-red hover:text-red-700 font-medium transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Artikel hinzufügen
          </button>
        </div>
        <div className="space-y-2">
          {artikel.map((row, i) => (
            <div key={row.id} className="flex gap-2 items-center">
              <input
                className="input flex-1"
                placeholder={`Artikel ${i + 1}, z.B. Backofen`}
                value={row.artikel}
                onChange={(e) => updateRow(row.id, "artikel", e.target.value)}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-stone-400">×</span>
                <input type="text" className="input w-16 text-center" placeholder="Menge"
                  value={row.anzahl} onChange={(e) => updateRow(row.id, "anzahl", e.target.value)} />
              </div>
              {artikel.length > 1 && (
                <button type="button" onClick={() => removeRow(row.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <label className="label">Notiz <span className="text-stone-400 font-normal">(optional)</span></label>
        <textarea rows={3} className="input resize-none" placeholder="Weitere Informationen..." value={notiz} onChange={(e) => setNotiz(e.target.value)} />
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
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.xlsx,.xls,.doc,.docx"
            className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
        </div>
        {pendingFiles.length === 0 ? (
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-stone-200 py-6 text-center text-xs text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-colors">
            <svg className="w-7 h-7 mx-auto mb-1.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Bilder, Videos, PDFs, Excel oder Word
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
        <button type="button" className="btn-secondary" onClick={() => router.push("/china/geplante-bestellungen")} disabled={saving}>Abbrechen</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? (uploadProgress || "Erstellen…") : "Eintrag erstellen"}
        </button>
      </div>
    </form>
  );
}
