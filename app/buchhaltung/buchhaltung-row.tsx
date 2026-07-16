"use client";
import { useRouter } from "next/navigation";

export function BuchhaltungRow({ id, children }: { id: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/buchhaltung/${id}`)}
      className="cursor-pointer border-b border-grey-border hover:bg-grey-light/60 transition-colors"
    >
      {children}
    </tr>
  );
}
