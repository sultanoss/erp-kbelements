"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryKauflandButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch(`/api/kaufland/retry-notify?orderId=${orderId}`);
      const data = await res.json();
      if (data.result === "success") {
        setState("success");
        router.refresh();
      } else {
        setErrorMsg(data.error ?? "Unbekannter Fehler");
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
      <span className="font-mono text-[10px] text-red-600" title={errorMsg}>
        Fehler — {errorMsg.length > 40 ? errorMsg.slice(0, 40) + "…" : errorMsg}
      </span>
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
