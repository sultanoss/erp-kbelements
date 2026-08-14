"use client";

import { useTransition } from "react";
import { toggleGeplantCheck } from "./check-action";

export default function CheckToggle({ id, checked }: { id: string; checked: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(() => toggleGeplantCheck(id, !checked));
      }}
      title={checked ? "Erledigt – klicken zum Rücksetzen" : "Als erledigt markieren"}
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        pending ? "opacity-40" : ""
      } ${
        checked
          ? "bg-green-500 border-green-500 text-white"
          : "border-stone-300 bg-white hover:border-green-400"
      }`}
    >
      {checked && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
