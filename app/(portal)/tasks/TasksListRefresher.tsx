"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TasksListRefresher() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("tasks-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, () => router.refresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
