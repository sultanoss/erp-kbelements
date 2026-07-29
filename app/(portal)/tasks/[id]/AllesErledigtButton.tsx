"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clearTaskBadge } from "./actions";

export function AllesErledigtButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearTaskBadge(taskId);
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
    >
      ✓ Alles erledigt
    </button>
  );
}
