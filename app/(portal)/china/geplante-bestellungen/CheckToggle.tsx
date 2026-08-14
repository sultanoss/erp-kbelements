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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-all ${
        pending ? "opacity-40" : ""
      } ${
        checked
          ? "bg-green-100 text-green-700"
          : "bg-stone-100 text-stone-400 hover:text-stone-600"
      }`}
    >
      Checken
    </button>
  );
}
