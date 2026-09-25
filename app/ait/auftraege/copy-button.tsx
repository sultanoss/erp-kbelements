"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded border border-grey-border bg-white px-1.5 py-0.5 font-mono text-[10px] text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors"
    >
      {copied ? "✓" : "Kopieren"}
    </button>
  );
}
