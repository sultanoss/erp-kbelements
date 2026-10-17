"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveBestellung } from "./actions";

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await archiveBestellung(id, !archived);
    setLoading(false);
    if (!result.error) {
      router.refresh();
    } else {
      alert("Fehler: " + result.error);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        archived
          ? "bg-stone-100 text-stone-700 hover:bg-stone-200"
          : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
      }`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d={archived
            ? "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12l1-12"
            : "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12l1-12"
          }
        />
      </svg>
      {loading ? "..." : archived ? "Aus Archiv holen" : "Archivieren"}
    </button>
  );
}
