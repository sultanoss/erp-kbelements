"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/status";
import { AllesErledigtButton } from "./AllesErledigtButton";

interface Reply {
  id: string;
  content: string;
  author: string;
  created_at: string;
}

interface Props {
  returnId: string;
  userName: string;
  initialReplies: Reply[];
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-pink-500",
];

function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function ReturnReplies({ returnId, userName, initialReplies }: Props) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [replies, setReplies] = useState<Reply[]>(initialReplies);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`return-replies-${returnId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "return_replies",
        filter: `return_id=eq.${returnId}`,
      }, (payload) => {
        setReplies((prev) => {
          if (prev.some((r) => r.id === (payload.new as Reply).id)) return prev;
          return [...prev, payload.new as Reply];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError("");

    const { data, error: dbErr } = await supabase
      .from("return_replies")
      .insert({ return_id: returnId, content: content.trim(), author: userName })
      .select("id, created_at")
      .single();

    if (dbErr || !data) { setError(dbErr?.message ?? "Fehler beim Senden"); setSaving(false); return; }

    await supabase
      .from("returns")
      .update({ last_reply_at: data.created_at, last_reply_author: userName })
      .eq("id", returnId);

    await supabase
      .from("returns")
      .update({ status: "in_bearbeitung" })
      .eq("id", returnId)
      .eq("status", "warte_auf_kunde_antwort");

    setReplies((prev) => [...prev, { id: data.id, content: content.trim(), author: userName, created_at: data.created_at }]);
    setContent("");
    setSaving(false);
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">
        Nachrichten ({replies.length})
      </div>

      {replies.length === 0 ? (
        <p className="text-sm text-stone-400">Noch keine Nachrichten vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {replies.map((reply) => {
            const initials = reply.author
              ? reply.author.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
              : "?";
            return (
              <div key={reply.id} className="flex gap-3">
                <div className={`flex-shrink-0 w-7 h-7 rounded-full ${getAvatarColor(reply.author ?? "")} flex items-center justify-center`}>
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
          placeholder="Nachricht schreiben..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center justify-between mt-2">
          <AllesErledigtButton returnId={returnId} />
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
