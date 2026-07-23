"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TASK_TYPE_OPTIONS } from "@/lib/status";

interface Props {
  defaults: {
    q: string;
    status: string;
    type: string;
    from: string;
    to: string;
    assigned_to: string;
    created_by: string;
    urgent: string;
  };
  users: Array<{ id: string; email: string; full_name: string }>;
}

export default function TasksFilterBar({ defaults, users }: Props) {
  const [q, setQ] = useState(defaults.q);
  const [status, setStatus] = useState(defaults.status);
  const [type, setType] = useState(defaults.type);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [assignedTo, setAssignedTo] = useState(defaults.assigned_to);
  const [createdBy, setCreatedBy] = useState(defaults.created_by);
  const [urgent, setUrgent] = useState(defaults.urgent === "1");
  const router = useRouter();

  const hasActiveFilter = !!(defaults.q || defaults.status || defaults.type || defaults.from || defaults.to || defaults.assigned_to || defaults.created_by || defaults.urgent);
  const hasFormValues = !!(q || status || type || from || to || assignedTo || createdBy || urgent);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (type) p.set("type", type);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (assignedTo) p.set("assigned_to", assignedTo);
    if (createdBy) p.set("created_by", createdBy);
    if (urgent) p.set("urgent", "1");
    router.push(`/tasks${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function handleReset() {
    setQ(""); setStatus(""); setType(""); setFrom(""); setTo(""); setAssignedTo(""); setCreatedBy(""); setUrgent(false);
    router.push("/tasks");
  }

  return (
    <div className="card p-4 mb-5">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Suche (Name, Beschreibung)</label>
          <input
            className="input"
            placeholder="Suchen..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Alle</option>
            <option value="eingegangen">Eingegangen</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="erledigt">Erledigt</option>
          </select>
        </div>
        <div>
          <label className="label">Tag</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Alle</option>
            {TASK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Zugewiesen an</label>
          <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Alle</option>
            {users.map((u) => (
              <option key={u.id} value={u.email}>{u.full_name || u.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Erstellt von</label>
          <select className="input" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)}>
            <option value="">Alle</option>
            {users.map((u) => (
              <option key={u.id} value={u.full_name || u.email}>{u.full_name || u.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Von</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Bis</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-red-700">Nur dringende</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!hasFormValues}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Filtern
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasActiveFilter}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Zurücksetzen
          </button>
        </div>
      </form>
    </div>
  );
}
