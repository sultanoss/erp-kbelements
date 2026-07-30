"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Eintrag = {
  id: string;
  date: string;
  title: string;
  description: string | null;
  reminder_at: string | null;
  reminder_sent: boolean;
  user_id: string;
  created_at: string;
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTH_NAMES = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function KalenderClient({
  eintraege,
  year,
  month,
  userId,
  ntfyTopic: initialNtfyTopic,
}: {
  eintraege: Eintrag[];
  year: number;
  month: number;
  userId: string;
  ntfyTopic: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const today = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReminderAt, setEditReminderAt] = useState("");

  // ntfy settings
  const [ntfyTopic, setNtfyTopic] = useState(initialNtfyTopic);
  const [ntfyInput, setNtfyInput] = useState(initialNtfyTopic);
  const [savingNtfy, setSavingNtfy] = useState(false);
  const [showNtfySettings, setShowNtfySettings] = useState(false);

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const entryMap = new Map<string, Eintrag[]>();
  for (const e of eintraege) {
    const list = entryMap.get(e.date) ?? [];
    list.push(e);
    entryMap.set(e.date, list);
  }

  function navMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    router.push(`/todo/kalender?monat=${y}-${String(m).padStart(2, "0")}`);
  }

  function selectDay(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setShowForm(false);
    setEditId(null);
  }

  async function handleAdd() {
    if (!title.trim() || !selectedDate) return;
    setSaving(true);
    await supabase.from("kalender_eintraege").insert({
      date: selectedDate,
      title: title.trim(),
      description: description.trim() || null,
      reminder_at: reminderAt || null,
      reminder_sent: false,
      user_id: userId,
    });
    setTitle(""); setDescription(""); setReminderAt(""); setShowForm(false);
    setSaving(false);
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    await supabase.from("kalender_eintraege").delete().eq("id", id);
    startTransition(() => router.refresh());
  }

  async function handleSaveEdit(id: string) {
    if (!editTitle.trim()) return;
    setSaving(true);
    await supabase.from("kalender_eintraege").update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      reminder_at: editReminderAt || null,
      reminder_sent: false,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setEditId(null); setSaving(false);
    startTransition(() => router.refresh());
  }

  async function handleSaveNtfy() {
    setSavingNtfy(true);
    await supabase.from("user_settings").upsert({
      user_id: userId,
      ntfy_topic: ntfyInput.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setNtfyTopic(ntfyInput.trim());
    setSavingNtfy(false);
    setShowNtfySettings(false);
  }

  const dayEntries = selectedDate ? (entryMap.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-6">
      {/* ntfy Settings */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Push-Erinnerungen (ntfy.sh)</span>
            {ntfyTopic ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                ✓ {ntfyTopic}
              </span>
            ) : (
              <span className="text-xs text-gray-400">nicht eingerichtet</span>
            )}
          </div>
          <button
            onClick={() => { setShowNtfySettings((v) => !v); setNtfyInput(ntfyTopic); }}
            className="text-xs text-brand-red hover:underline"
          >
            {showNtfySettings ? "Schließen" : "Einrichten"}
          </button>
        </div>

        {showNtfySettings && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">So richtest du ntfy.sh ein:</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Installiere die <strong>ntfy App</strong> auf deinem Handy (kostenlos, Android &amp; iOS)</li>
                <li>Wähle einen einzigartigen Topic-Namen, z.B. <code>kb-radwan-x7k2</code></li>
                <li>Abonniere diesen Topic in der App</li>
                <li>Trage denselben Topic-Namen hier ein</li>
              </ol>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={ntfyInput}
                onChange={(e) => setNtfyInput(e.target.value)}
                placeholder="z.B. kb-radwan-x7k2"
                className="input flex-1"
              />
              <button
                onClick={handleSaveNtfy}
                disabled={savingNtfy}
                className="btn-primary disabled:opacity-50"
              >
                {savingNtfy ? "…" : "Speichern"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navMonth(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={() => navMonth(1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const hasEntries = entryMap.has(dateStr);
            return (
              <button
                key={i}
                onClick={() => selectDay(day)}
                className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-sm font-medium transition-colors ${
                  isSelected ? "bg-brand-red text-white"
                  : isToday ? "bg-red-50 text-brand-red font-bold"
                  : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {day}
                {hasEntries && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-brand-red"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries for selected day */}
      {selectedDate && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("de-DE", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </h2>
            <button
              onClick={() => { setShowForm(true); setEditId(null); }}
              className="btn-primary text-sm py-1.5 px-3"
            >
              + Eintrag
            </button>
          </div>

          {showForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <input
                type="text"
                placeholder="Titel *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input w-full"
                autoFocus
              />
              <textarea
                placeholder="Beschreibung (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="input w-full resize-none"
              />
              <label className="grid gap-1">
                <span className="text-xs text-gray-500">Erinnerung (optional)</span>
                <input
                  type="datetime-local"
                  value={reminderAt}
                  onChange={(e) => setReminderAt(e.target.value)}
                  className="input w-full"
                />
              </label>
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !title.trim()} className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50">
                  {saving ? "Speichern…" : "Speichern"}
                </button>
                <button onClick={() => { setShowForm(false); setTitle(""); setDescription(""); setReminderAt(""); }} className="btn-secondary text-sm py-1.5 px-4">
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {dayEntries.length === 0 && !showForm && (
            <p className="text-sm text-gray-400">Keine Einträge für diesen Tag.</p>
          )}

          <ul className="space-y-2">
            {dayEntries.map((e) => (
              <li key={e.id} className="border border-gray-200 rounded-lg p-3">
                {editId === e.id ? (
                  <div className="space-y-2">
                    <input type="text" value={editTitle} onChange={(ev) => setEditTitle(ev.target.value)} className="input w-full" autoFocus />
                    <textarea value={editDescription} onChange={(ev) => setEditDescription(ev.target.value)} rows={2} className="input w-full resize-none" placeholder="Beschreibung (optional)" />
                    <label className="grid gap-1">
                      <span className="text-xs text-gray-500">Erinnerung (optional)</span>
                      <input type="datetime-local" value={editReminderAt} onChange={(ev) => setEditReminderAt(ev.target.value)} className="input w-full" />
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(e.id)} disabled={saving || !editTitle.trim()} className="btn-primary text-sm py-1 px-3 disabled:opacity-50">
                        {saving ? "…" : "Speichern"}
                      </button>
                      <button onClick={() => setEditId(null)} className="btn-secondary text-sm py-1 px-3">Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{e.title}</p>
                      {e.description && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{e.description}</p>}
                      {e.reminder_at && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${e.reminder_sent ? "text-gray-400" : "text-brand-red"}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          {e.reminder_sent ? "Erinnerung gesendet" : new Date(e.reminder_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => { setEditId(e.id); setEditTitle(e.title); setEditDescription(e.description ?? ""); setEditReminderAt(e.reminder_at ? e.reminder_at.slice(0, 16) : ""); setShowForm(false); }}
                        className="p-1.5 text-gray-400 hover:text-brand-red rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
