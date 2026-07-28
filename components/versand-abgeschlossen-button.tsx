"use client";

import { useState, useEffect } from "react";
import { getVersandAbgeschlossenStatus, confirmVersandAbgeschlossen } from "@/app/actions";

export function VersandAbgeschlossenButton() {
  const [status, setStatus] = useState<{ confirmed: boolean; timeLabel?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getVersandAbgeschlossenStatus().then(setStatus);
  }, []);

  async function handleClick() {
    setLoading(true);
    const result = await confirmVersandAbgeschlossen();
    setStatus(result);
    setLoading(false);
  }

  if (!status) return null;

  if (status.confirmed) {
    return (
      <div className="inline-flex items-center gap-2 rounded border border-green-200 bg-green-50 px-4 py-2 font-mono text-xs font-bold text-green-700">
        <span>✓ Versand abgeschlossen</span>
        {status.timeLabel && (
          <span className="font-normal text-green-500">{status.timeLabel}</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded border border-stone-300 bg-white px-4 py-2 font-mono text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
    >
      {loading ? "…" : "Versand abgeschlossen"}
    </button>
  );
}
