"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userName: string;
}

const MAX_PX = 1200;
const WEBP_QUALITY = 0.75;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const BUCKET = "schaden-media";

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

interface PendingFile { file: File; preview?: string; mediaType: string; }

function DocBadge({ type, filename }: { type: string; filename: string }) {
  const cfg = {
    pdf:   { label: "PDF", bg: "bg-red-100",   text: "text-red-700"   },
    excel: { label: "XLS", bg: "bg-green-100",  text: "text-green-700" },
    word:  { label: "DOC", bg: "bg-blue-100",   text: "text-blue-700"  },
  }[type] ?? { label: "DOC", bg: "bg-stone-100", text: "text-stone-700" };
  return (
    <div className="w-full h-full rounded-lg border border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-1 p-1">
      <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
      <span className="text-xs text-stone-400 truncate text-center max-w-full px-1">{filename}</span>
    </div>
  );
}

export default function NewSchadenForm({ userName }: Props) {
  const [gelNummer, setGelNummer] = useState("");
  const [auftragsnummer, setAuftragsnummer] = useState("");
  const [artikel, setArtikel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const toAdd: PendingFile[] = [];
    for (const file of Array.from(files)) {
      const mediaType = getMediaType(file);
      if (file.size > MAX_DOC_BYTES) {
        setError(`"${file.name}" ist zu groß (max. 20 MB).`); continue;
      }
      const preview = mediaType === "image" ? URL.createObjectURL(file) : undefined;
      toAdd.push({ file, preview, mediaType });
    }
    setPendingFiles((prev) => [...prev, ...toAdd].slice(0, 10));
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(i: number) {
    setPendingFiles((prev) => {
      const next = [...prev];
      if (next[i].preview) URL.revokeObjectURL(next[i].preview!);
      next.splice(i, 1);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gelNummer.trim()) { setError("GEL Nummer ist erforderlich."); return; }
    setSaving(true); setError("");

    const { data, error: dbErr } = await supabase
      .from("schadenmeldungen")
      .insert({
        gel_nummer: gelNummer.trim(),
        auftragsnummer: auftragsnummer.trim() || null,
        artikel: artikel.trim() || null,
        beschreibung: beschreibung.trim() || null,
        created_by: userName,
      })
      .select("id").single();

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }

    const schadenId = data.id;

    for (const pf of pendingFiles) {
      try {
        let uploadBlob: Blob = pf.file;
        let contentType = pf.file.type;
        let ext = pf.file.name.split(".").pop() ?? "bin";

        if (pf.mediaType === "image") {
          uploadBlob = await compressImage(pf.file);
          contentType = "image/webp";
          ext = "webp";
        }

        const path = `${schadenId}/${randomId()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET).upload(path, uploadBlob, { contentType, upsert: false });
        if (uploadErr) throw uploadErr;

        await supabase.from("schaden_media").insert({
          schaden_id: schadenId, storage_path: path,
          filename: pf.file.name, media_type: pf.mediaType, uploaded_by: userName,
        });
      } catch (uploadErr) {
        console.error("Upload error:", uploadErr);
      }
    }

    router.push(`/schadenmeldungen/${schadenId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="label">GEL Nummer <span className="text-brand-red">*</span></label>
        <input className="input" placeholder="z.B. GEL-2024-001" value={gelNummer}
          onChange={(e) => setGelNummer(e.target.value)} />
      </div>

      <div>
        <label className="label">Auftragsnummer <span className="text-stone-400 font-normal">(optional)</span></label>
        <input className="input" placeholder="z.B. 123456" value={auftragsnummer}
          onChange={(e) => setAuftragsnummer(e.target.value)} />
      </div>

      <div>
        <label className="label">Artikel <span className="text-stone-400 font-normal">(optional)</span></label>
        <input className="input" placeholder="Artikelbezeichnung" value={artikel}
          onChange={(e) => setArtikel(e.target.value)} />
      </div>

      <div>
        <label className="label">Beschreibung <span className="text-stone-400 font-normal">(optional)</span></label>
        <textarea rows={4} className="input resize-none" placeholder="Schadensbeschreibung…"
          value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
      </div>

      <div>
        <label className="label">Dateien <span className="text-stone-400 font-normal">(optional — Bilder, PDF, Excel, Word)</span></label>

        {pendingFiles.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {pendingFiles.map((pf, i) => (
              <div key={i} className="relative group aspect-square">
                {pf.mediaType === "image" ? (
                  <img src={pf.preview} alt={pf.file.name}
                    className="w-full h-full object-cover rounded-lg border border-stone-200" />
                ) : (
                  <DocBadge type={pf.mediaType} filename={pf.file.name} />
                )}
                <button type="button" onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={() => inputRef.current?.click()} disabled={pendingFiles.length >= 10}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-stone-600 hover:border-stone-400 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Dateien hinzufügen ({pendingFiles.length}/10)
        </button>
        <input ref={inputRef} type="file" accept="image/*,.pdf,.xlsx,.xls,.doc,.docx"
          multiple className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.push("/schadenmeldungen")} className="btn-secondary" disabled={saving}>Abbrechen</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Erstellen..." : "Meldung erstellen"}
        </button>
      </div>
    </form>
  );
}
