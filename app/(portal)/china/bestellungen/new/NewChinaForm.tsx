"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userName: string;
}

const MAX_PX = 1200;
const WEBP_QUALITY = 0.75;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
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

interface PendingFile { file: File; preview?: string; mediaType: string; }

function DocBadge({ type, filename }: { type: string; filename: string }) {
  const cfg = {
    pdf:   { label: "PDF", bg: "bg-red-100",   text: "text-red-700" },
    excel: { label: "XLS", bg: "bg-green-100", text: "text-green-700" },
    word:  { label: "DOC", bg: "bg-blue-100",  text: "text-blue-700" },
  }[type] ?? { label: "DOC", bg: "bg-stone-100", text: "text-stone-700" };
  return (
    <div className="w-full h-full rounded-lg border border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-1 p-1">
      <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
      <span className="text-xs text-stone-400 truncate text-center max-w-full px-1">{filename}</span>
    </div>
  );
}

function BoolToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[{ v: true, label: "Ja", active: "border-green-500 bg-green-50 text-green-700" },
        { v: false, label: "Nein", active: "border-stone-400 bg-stone-100 text-stone-700" }].map(({ v, label, active }) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
            value === v ? active : "border-stone-200 text-stone-500 hover:border-stone-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function NewChinaForm({ userName }: Props) {
  const [orderPiNummer, setOrderPiNummer] = useState("");
  const [fabrik, setFabrik] = useState("");
  const [angezahlt, setAngezahlt] = useState(false);
  const [angezahltNotiz, setAngezahltNotiz] = useState("");
  const [bezahlt, setBezahlt] = useState(false);
  const [bezahltNotiz, setBezahltNotiz] = useState("");
  const [notiz, setNotiz] = useState("");
  const [produktionFertig, setProduktionFertig] = useState("");
  const [ankunftErwartet, setAnkunftErwartet] = useState("");
  const [verschifft, setVerschifft] = useState(false);
  const [trackingNummer, setTrackingNummer] = useState("");
  const [lagerAnkunft, setLagerAnkunft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    setError("");
    const toAdd: PendingFile[] = [];
    for (const file of Array.from(files)) {
      const mediaType = getMediaType(file);
      if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) { setError(`Video "${file.name}" zu groß (max. 100 MB).`); continue; }
      if (mediaType !== "image" && mediaType !== "video" && file.size > MAX_DOC_BYTES) { setError(`"${file.name}" zu groß (max. 20 MB).`); continue; }
      const preview = mediaType === "image" ? URL.createObjectURL(file) : undefined;
      toAdd.push({ file, preview, mediaType });
    }
    setPendingFiles((prev) => [...prev, ...toAdd].slice(0, 10));
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => {
      const next = [...prev];
      if (next[index].preview) URL.revokeObjectURL(next[index].preview!);
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data, error: dbError } = await supabase
      .from("china_bestellungen")
      .insert({
        order_pi_nummer: orderPiNummer.trim() || null,
        fabrik: fabrik.trim() || null,
        angezahlt,
        angezahlt_notiz: angezahltNotiz.trim() || null,
        bezahlt,
        bezahlt_notiz: bezahltNotiz.trim() || null,
        notiz: notiz.trim() || null,
        produktion_fertig: produktionFertig || null,
        ankunft_erwartet: ankunftErwartet || null,
        verschifft,
        tracking_nummer: trackingNummer.trim() || null,
        lager_ankunft: lagerAnkunft || null,
        created_by: userName,
      })
      .select("id")
      .single();

    if (dbError || !data) { setError(dbError?.message ?? "Fehler beim Speichern."); setSaving(false); return; }

    const bestellungId = data.id;

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
        const path = `${bestellungId}/${randomId()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, uploadBlob, { contentType, upsert: false });
        if (uploadErr) throw uploadErr;
        await supabase.from("china_media").insert({
          bestellung_id: bestellungId, storage_path: path, filename: pf.file.name,
          media_type: pf.mediaType, uploaded_by: userName,
        });
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
      }
    }

    router.push(`/china/bestellungen/${bestellungId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card p-4 space-y-4">
        <div>
          <label className="label">Order / PI Nummer <span className="text-stone-400 font-normal">(optional)</span></label>
          <input className="input font-mono" placeholder="z.B. PI-2025-001" value={orderPiNummer} onChange={(e) => setOrderPiNummer(e.target.value)} />
        </div>
        <div>
          <label className="label">Fabrik <span className="text-stone-400 font-normal">(optional)</span></label>
          <input className="input" placeholder="z.B. Guangzhou Electronics Co." value={fabrik} onChange={(e) => setFabrik(e.target.value)} />
        </div>
      </div>

      {/* Angezahlt */}
      <div className="card p-4 space-y-3">
        <div>
          <label className="label">Angezahlt</label>
          <BoolToggle value={angezahlt} onChange={setAngezahlt} />
        </div>
        {angezahlt && (
          <div>
            <label className="label">Anzahlung Details <span className="text-stone-400 font-normal">(optional)</span></label>
            <input className="input" placeholder="z.B. 30% = 5.000 € überwiesen am 01.01.2025" value={angezahltNotiz} onChange={(e) => setAngezahltNotiz(e.target.value)} />
          </div>
        )}
      </div>

      {/* Bezahlt */}
      <div className="card p-4 space-y-3">
        <div>
          <label className="label">Vollständig bezahlt</label>
          <BoolToggle value={bezahlt} onChange={setBezahlt} />
        </div>
        {bezahlt && (
          <div>
            <label className="label">Zahlung Details <span className="text-stone-400 font-normal">(optional)</span></label>
            <input className="input" placeholder="z.B. Restbetrag 10.000 € am 15.02.2025" value={bezahltNotiz} onChange={(e) => setBezahltNotiz(e.target.value)} />
          </div>
        )}
      </div>

      {/* Termine */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Produktion fertig (ca.) <span className="text-stone-400 font-normal">(optional)</span></label>
          <input type="date" className="input" value={produktionFertig} onChange={(e) => setProduktionFertig(e.target.value)} />
        </div>
        <div>
          <label className="label">Ankunft erwartet (ca.) <span className="text-stone-400 font-normal">(optional)</span></label>
          <input type="date" className="input" value={ankunftErwartet} onChange={(e) => setAnkunftErwartet(e.target.value)} />
        </div>
      </div>

      {/* Versand */}
      <div className="card p-4 space-y-3">
        <div>
          <label className="label">Verschifft</label>
          <BoolToggle value={verschifft} onChange={setVerschifft} />
        </div>
        {verschifft && (
          <div>
            <label className="label">Tracking Nummer <span className="text-stone-400 font-normal">(optional)</span></label>
            <input className="input font-mono" placeholder="z.B. MSKU1234567" value={trackingNummer} onChange={(e) => setTrackingNummer(e.target.value)} />
          </div>
        )}
        <div>
          <label className="label">Lager Ankunft <span className="text-stone-400 font-normal">(optional)</span></label>
          <input type="date" className="input" value={lagerAnkunft} onChange={(e) => setLagerAnkunft(e.target.value)} />
        </div>
      </div>

      {/* Notiz */}
      <div className="card p-4">
        <label className="label">Allgemeine Notiz <span className="text-stone-400 font-normal">(optional)</span></label>
        <textarea rows={3} className="input resize-none" placeholder="Weitere Informationen..." value={notiz} onChange={(e) => setNotiz(e.target.value)} />
      </div>

      {/* Dateien */}
      <div className="card p-4">
        <label className="label">Dateien <span className="text-stone-400 font-normal">(optional — Bilder, Videos, PDF, Excel, Word)</span></label>
        {pendingFiles.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {pendingFiles.map((pf, i) => (
              <div key={i} className="relative group aspect-square">
                {pf.mediaType === "video" ? (
                  <div className="w-full h-full rounded-lg bg-stone-100 border border-stone-200 flex flex-col items-center justify-center gap-1">
                    <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                    <span className="text-xs text-stone-400 truncate px-1 max-w-full">{pf.file.name}</span>
                  </div>
                ) : pf.mediaType === "image" ? (
                  <img src={pf.preview} alt={pf.file.name} className="w-full h-full object-cover rounded-lg border border-stone-200" />
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
        <input ref={inputRef} type="file" accept="image/*,video/*,.pdf,.xlsx,.xls,.doc,.docx"
          multiple className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => router.push("/china/bestellungen")}>Abbrechen</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? (pendingFiles.length > 0 ? "Erstellen & Hochladen..." : "Erstellen...") : "Bestellung erstellen"}
        </button>
      </div>
    </form>
  );
}
