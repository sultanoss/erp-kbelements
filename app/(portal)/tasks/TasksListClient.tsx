"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, TASK_TYPE_LABELS, formatDate } from "@/lib/status";
import { archiveTasksBulk } from "./[id]/actions";

type TaskRow = {
  id: string;
  created_at: string;
  description: string;
  status: string;
  tags: string[] | null;
  assigned_to: string[] | null;
  sendungsnummer: string | null;
  created_by: string | null;
  is_urgent: boolean | null;
  last_reply_at: string | null;
  last_reply_author: string | null;
};

export default function TasksListClient({
  tasks,
  currentUserName,
  userNameByEmail,
  hasFilters,
}: {
  tasks: TaskRow[];
  currentUserName: string;
  userNameByEmail: Record<string, string>;
  hasFilters: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelected((prev) =>
      prev.length === tasks.length && tasks.length > 0
        ? []
        : tasks.map((t) => t.id)
    );

  const handleBulkArchive = () => {
    startTransition(async () => {
      await archiveTasksBulk(selected);
      setSelected([]);
      router.refresh();
    });
  };

  const allChecked = tasks.length > 0 && selected.length === tasks.length;
  const someChecked = selected.length > 0 && selected.length < tasks.length;
  const cell = "block px-4 py-3";

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    className="rounded border-stone-300 text-brand-red focus:ring-brand-red cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Tag</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 max-w-[280px]">Beschreibung</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Zugewiesen an</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Sendungsnummer</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Erstellt von</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!tasks.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-400">
                    {hasFilters
                      ? "Keine Aufgaben für diese Filterkriterien gefunden."
                      : "Noch keine Aufgaben vorhanden. Erstelle die erste Aufgabe."}
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  const href = `/tasks/${t.id}`;
                  const status = STATUS_LABELS[t.status] ?? { label: t.status, className: "bg-stone-100 text-stone-600" };
                  const tags: string[] = t.tags ?? [];
                  const assigned: string[] = t.assigned_to ?? [];
                  const urgent: boolean = t.is_urgent ?? false;
                  const hasNewReply =
                    !!t.last_reply_at &&
                    !!t.last_reply_author &&
                    t.last_reply_author !== currentUserName &&
                    !tags.includes("warte_auf_kunde_antwort");
                  const isSelected = selected.includes(t.id);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-stone-50 transition-colors cursor-pointer ${urgent ? "border-l-2 border-l-red-500" : ""} ${isSelected ? "bg-blue-50 hover:bg-blue-100" : ""}`}
                    >
                      <td
                        className="px-4 py-3 w-10"
                        onClick={(e) => { e.stopPropagation(); toggle(t.id); }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(t.id)}
                          className="rounded border-stone-300 text-brand-red focus:ring-brand-red cursor-pointer"
                        />
                      </td>
                      <td className="p-0 text-stone-500 whitespace-nowrap text-xs">
                        <Link href={href} className={cell}>{formatDate(t.created_at)}</Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <div className="flex flex-wrap gap-1">
                            {urgent && (
                              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                Dringend
                              </span>
                            )}
                            {tags.length > 0
                              ? tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                                      tag === "warte_auf_kunde_antwort"
                                        ? "bg-amber-50 text-amber-700 border border-dashed border-amber-400"
                                        : "bg-stone-100 text-stone-700"
                                    }`}
                                  >
                                    {TASK_TYPE_LABELS[tag] ?? tag}
                                  </span>
                                ))
                              : !urgent && !hasNewReply && <span className="text-stone-300">—</span>}
                            {hasNewReply && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-blue-500 animate-pulse" />
                                Neue Antwort von {t.last_reply_author}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="p-0 max-w-[280px]">
                        <Link href={href} className={cell}>
                          <span className="text-xs text-stone-600 line-clamp-2">{t.description}</span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-xs text-stone-600`}>
                          {assigned.length > 0
                            ? assigned.map((e) => userNameByEmail[e] || e).join(", ")
                            : <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={cell}>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} font-mono text-xs text-stone-600`}>
                          {t.sendungsnummer || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className={`${cell} text-xs text-stone-600`}>
                          {t.created_by || <span className="text-stone-300">—</span>}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-stone-900 px-5 py-3 shadow-xl text-sm">
          <span className="text-stone-300">{selected.length} ausgewählt</span>
          <div className="w-px h-4 bg-stone-600" />
          <button
            onClick={handleBulkArchive}
            disabled={isPending}
            className="text-white font-medium hover:text-stone-200 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Archiviere...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
                </svg>
                Archivieren
              </>
            )}
          </button>
          <div className="w-px h-4 bg-stone-600" />
          <button
            onClick={() => setSelected([])}
            className="text-stone-400 hover:text-stone-200 transition-colors"
          >
            Aufheben
          </button>
        </div>
      )}
    </>
  );
}
