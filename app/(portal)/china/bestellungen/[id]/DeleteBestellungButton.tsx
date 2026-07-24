"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteBestellungButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("china_media").delete().eq("bestellung_id", id);
    await supabase.from("china_bestellungen").delete().eq("id", id);
    router.push("/china/bestellungen");
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-stone-600">Sicher löschen?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Löschen..." : "Ja, löschen"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={deleting}
          className="btn-secondary text-sm"
        >
          Abbrechen
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
    >
      Löschen
    </button>
  );
}
