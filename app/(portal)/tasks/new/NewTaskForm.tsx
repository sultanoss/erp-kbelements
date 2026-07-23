"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPE_OPTIONS } from "@/lib/status";

interface Props {
  userName: string;
  users: Array<{ id: string; email: string; full_name: string }>;
}

const MAX_PX = 1200;
const WEBP_QUALITY = 0.75;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const BUCKET = "task-media";

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

interface PendingFile {
  file: File;
  preview?: string;
  mediaType: string;
}

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

export default function NewTaskForm({ userName, users }: Props) {
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function toggleTag(val: string) {
    setTags((prev) => (prev[0] === val ? [] : [val]));
  }

  function toggleUser(email: string) {
    setAssignedTo((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  }

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const toAdd: PendingFile[] = [];
    for (const file of Array.from(files)) {
      const mediaType = getMediaType(file);
      if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) {
        setError(`Video "${file.name}" ist zu groß (max. 100 MB).`); continue;
      }
      if (mediaType !== "image" && mediaType !== "video" && file.size > MAX_DOC_BYTES) {
        setError(`"${file.name}" ist zu groß (max. 20 MB).`); continue;
      }
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
    if (!description.trim()) { setError("Beschreibung ist erforderlich."); return; }
    setSaving(true);
    setError("");

    const { data, error: dbError } = await supabase
      .from("tasks")
      .insert({ tags, description: description.trim(), assigned_to: assignedTo, is_urgent: isUrgent, created_by: userName })
      .select("id")
      .single();

    if (dbError) { setError(dbError.message); setSaving(false); return; }

    const taskId = data.id;

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

        const path = `${taskId}/${randomId()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET).upload(path, uploadBlob, { contentType, upsert: false });
        if (uploadErr) throw uploadErr;

        await supabase.from("task_media").insert({
          task_id: taskId, storage_path: path, filename: pf.file.name,
          media_type: pf.mediaType, uploaded_by: userName,
        });
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
      }
    }

    router.push(`/tasks/${taskId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Priorität */}
      <div>
        <label className="label">Priorität</label>
        <button type="button" onClick={() => setIsUrgent((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border-2 transition-colors ${
            isUrgent ? "border-red-600 bg-red-50 text-red-700" : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
          }`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Dringend
        </button>
      </div>

      {/* Tag */}
      <div>
        <label className="label">Tag</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {TASK_TYPE_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => toggleTag(o.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium border-2 transition-colors ${
                tags.includes(o.value)
                  ? "border-brand-red bg-red-50 text-brand-red"
                  : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
              }`}>{o.label}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Beschreibung <span className="text-brand-red">*</span></label>
        <textarea rows={4} className="input resize-none" placeholder="Was ist zu tun?"
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {/* Zugewiesen an */}
      <div>
        <label className="label">Zuweisen an <span className="text-stone-400 font-normal">(optional, mehrere möglich)</span></label>
        {users.length === 0 ? (
          <p className="text-sm text-stone-400 mt-1">Keine Benutzer verfügbar.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-1">
            {users.map((u) => (
              <button key={u.id} type="button" onClick={() => toggleUser(u.email)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium border-2 transition-colors ${
                  assignedTo.includes(u.email)
                    ? "border-brand-red bg-red-50 text-brand-red"
                    : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                }`}>{u.full_name || u.email}</button>
            ))}
          </div>
        )}
      </div>

      {/* Medien */}
      <div>
        <label className="label">Dateien <span className="text-stone-400 font-normal">(optional — Bilder, Videos, PDF, Excel, Word)</span></label>

        {pendingFiles.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {pendingFiles.map((pf, i) => (
              <div key={i} className="relative group aspect-square">
                {pf.mediaType === "video" ? (
                  <div className="w-full h-full rounded-lg bg-stone-100 border border-stone-200 flex flex-col items-center justify-center gap-1">
                    <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                    <span className="text-xs text-stone-400 truncate px-1 max-w-full">{pf.file.name}</span>
                  </div>
                ) : pf.mediaType === "image" ? (
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
        <input ref={inputRef} type="file" accept="image/*,video/*,.pdf,.xlsx,.xls,.doc,.docx"
          multiple className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.push("/tasks")} className="btn-secondary" disabled={saving}>Abbrechen</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? (pendingFiles.length > 0 ? "Erstellen & Hochladen..." : "Erstellen...") : "Aufgabe erstellen"}
        </button>
      </div>
    </form>
  );
}
