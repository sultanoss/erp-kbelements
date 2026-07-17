"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { storniereBestellung } from "./actions";

export function StorniereButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("Bestellung wirklich stornieren?\nRechnung wird storniert und Lager zurückgebucht.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", orderId);
      await storniereBestellung(fd);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-mono text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Wird storniert…" : "Bestellung stornieren"}
    </button>
  );
}
