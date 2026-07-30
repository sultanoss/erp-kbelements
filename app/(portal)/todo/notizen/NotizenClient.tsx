"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Notiz = {
  id: string;
  title: string | null;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export default function NotizenClient({
  notizen,
  userId,
}: {
  notizen: Notiz[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newContent.trim()) return;
    setSaving(true);
    await supabase.from("notizen").insert({
      title: newTitle.trim() || null,
      content: newContent.trim(),
      user_id: userId,
    });
    setNewTitle("");
    setNewContent("");
    setShowForm(false);
    setSaving(false);
    startTransition(() => router.refresh());
  }

  async function handleSaveEdit(id: string) {
    if (!editContent.trim()) return;
    setSaving(true);
    await supabase.from("notizen").update({
      title: editTitle.trim() || null,
      content: editContent.trim(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setEditId(null);
    setSaving(false);
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    await supabase.from("notizen").delete().eq("id", id);
    setDeleteId(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {/* New note button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          + Neue Notiz
        </button>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Neue Notiz</h2>
          <input
            type="text"
            placeholder="Titel (optional)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input w-full"
            autoFocus
          />
          <textarea
            placeholder="Inhalt *"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
            className="input w-full resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newContent.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "Speichern…" : "Speichern"}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewTitle(""); setNewContent(""); }}
              className="btn-secondary"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notizen.length === 0 && !showForm && (
        <p className="text-sm text-gray-400">Noch keine Notizen vorhanden.</p>
      )}

      {notizen.map((n) => (
        <div key={n.id} className="card p-5">
          {editId === n.id ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Titel (optional)"
                className="input w-full"
                autoFocus
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="input w-full resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(n.id)}
                  disabled={saving || !editContent.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? "…" : "Speichern"}
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="btn-secondary"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {n.title && (
                    <h3 className="font-semibold text-gray-900 mb-1">{n.title}</h3>
                  )}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { setEditId(n.id); setEditTitle(n.title ?? ""); setEditContent(n.content); }}
                    className="p-1.5 text-gray-400 hover:text-brand-red rounded transition-colors"
                    title="Bearbeiten"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteId(n.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Löschen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(n.updated_at).toLocaleDateString("de-DE", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>

              {/* Delete confirm */}
              {deleteId === n.id && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <span className="text-sm text-red-700">Notiz wirklich löschen?</span>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-sm font-semibold text-red-700 hover:text-red-900"
                  >
                    Löschen
                  </button>
                  <button
                    onClick={() => setDeleteId(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Abbrechen
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
