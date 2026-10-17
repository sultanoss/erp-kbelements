"use client";

import { useState } from "react";

export function NotizenModal({ notiz }: { notiz: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        title="Notiz anzeigen"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Notiz</span>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{notiz}</p>
          </div>
        </div>
      )}
    </>
  );
}
