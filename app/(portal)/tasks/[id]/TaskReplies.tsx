"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/status";

interface Reply {
  id: string;
  content: string;
  author: string;
  created_at: string;
}

interface Props {
  taskId: string;
  userName: string;
  initialReplies: Reply[];
}

export default function TaskReplies({ taskId, userName, initialReplies }: Props) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError("");

    const { error: dbErr } = await supabase.from("task_replies").insert({
      task_id: taskId,
      content: content.trim(),
      author: userName,
    });

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }

    setContent("");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">
        Verlauf ({initialReplies.length})
      </div>

      {initialReplies.length === 0 ? (
        <p className="text-sm text-stone-400">Noch keine Einträge vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {initialReplies.map((reply) => {
            const initials = reply.author
              ? reply.author.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
              : "?";
            return (
              <div key={reply.id} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-red flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-medium text-stone-700">{reply.author}</span>
                    <span className="text-xs text-stone-400">{formatDate(reply.created_at)}</span>
                  </div>
                  <p className="text-sm text-stone-600 mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="pt-2 border-t border-stone-100">
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <textarea
          rows={3}
          className="input resize-none text-sm"
          placeholder="Antwort schreiben..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Senden..." : "Antworten"}
          </button>
        </div>
      </form>
    </div>
  );
}
