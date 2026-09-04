"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  returnId: string;
  currentReparaturStatus: string | null;
}

export default function ReparaturStatusButtons({ returnId, currentReparaturStatus }: Props) {
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  async function setStatus(newStatus: string | null) {
    setSaving(true);
    await supabase
      .from("returns")
      .update({ reparatur_status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", returnId);
    setSaving(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      <button
        onClick={() => setStatus("wartet_auf_teile")}
        disabled={saving}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
          currentReparaturStatus === "wartet_auf_teile"
            ? "bg-amber-100 text-amber-700 border-amber-300"
            : "bg-white text-stone-500 border-stone-200 hover:border-amber-300 hover:text-amber-700"
        }`}
      >
        Wartet auf Teile
      </button>
      <button
        onClick={() => setStatus("erledigt")}
        disabled={saving}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
          currentReparaturStatus === "erledigt"
            ? "bg-green-100 text-green-700 border-green-300"
            : "bg-white text-stone-500 border-stone-200 hover:border-green-300 hover:text-green-700"
        }`}
      >
        Erledigt
      </button>
    </div>
  );
}
