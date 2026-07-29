"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { clearTaskBadge } from "./actions";

export function AllesErledigtButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearTaskBadge(taskId);
          setDone(true);
          router.refresh();
        })
      }
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 transition-colors ${
        done
          ? "border-green-300 bg-green-100 text-green-700"
          : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
      }`}
    >
      ✓ Alles erledigt
    </button>
  );
}
