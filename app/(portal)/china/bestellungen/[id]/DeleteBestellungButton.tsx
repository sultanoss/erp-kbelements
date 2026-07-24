"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBestellung } from "./actions";

export default function DeleteBestellungButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    setError("");
    const result = await deleteBestellung(id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    router.push("/china/bestellungen");
    router.refresh();
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">{error}</span>
        <button onClick={() => { setError(""); setConfirm(false); }} className="btn-secondary text-sm">
          Schließen
        </button>
      </div>
    );
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
