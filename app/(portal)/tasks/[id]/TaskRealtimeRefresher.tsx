"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TaskRealtimeRefresher({ taskId }: { taskId: string }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`task-${taskId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "tasks",
        filter: `id=eq.${taskId}`,
      }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  return null;
}
