"use client";

export function PrintLabelButton({ url }: { url: string }) {
  function handlePrint() {
    const proxyUrl = `/api/shipping/label-page1?url=${encodeURIComponent(url)}`;
    const win = window.open(proxyUrl, "_blank", "width=600,height=800");
    if (win) win.onload = () => win.print();
  }

  return (
    <div className="border-t border-grey-border px-5 py-4">
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-red px-4 py-2.5 font-mono text-xs font-semibold text-brand-red hover:bg-brand-red hover:text-white transition-colors"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Label drucken (A5)
      </button>
    </div>
  );
}
