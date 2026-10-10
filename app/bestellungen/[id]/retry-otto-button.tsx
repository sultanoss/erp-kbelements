"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryOttoButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch(`/api/otto/retry-shipment-notify?orderId=${orderId}`);
      const data = await res.json() as { orderId?: string; results?: Array<{ result: string; error?: string }>; result?: string; error?: string };
      if (res.ok && data.results?.every((r) => r.result === "success")) {
        setState("success");
        router.refresh();
      } else {
        const msg = data.results?.find((r) => r.error)?.error ?? data.error ?? data.result ?? "Unbekannter Fehler";
        setErrorMsg(msg);
        setState("error");
      }
    } catch {
      setErrorMsg("Netzwerkfehler");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-2 py-0.5 font-mono text-[10px] font-bold text-green-700">
        Gemeldet ✓
      </span>
    );
  }

  if (state === "error") {
    return (
      <div className="max-w-sm rounded border border-red-200 bg-red-50 p-2">
        <div className="font-mono text-[10px] font-bold text-red-700 mb-1">Fehler:</div>
        <div className="font-mono text-[10px] text-red-600 break-all whitespace-pre-wrap">{errorMsg}</div>
        <button onClick={handleClick} className="mt-1 font-mono text-[10px] text-brand-red hover:underline">Nochmal versuchen</button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="font-mono text-[10px] font-semibold text-brand-red hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {state === "loading" ? "Wird gesendet…" : "Erneut versuchen"}
    </button>
  );
}
