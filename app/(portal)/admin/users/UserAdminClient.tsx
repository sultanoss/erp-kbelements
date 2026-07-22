"use client";

import { useState, useTransition } from "react";
import { createUser, updateUserRole, deleteUser } from "./actions";
import { formatDate } from "@/lib/status";

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "user";
  created_at: string;
}

interface Props {
  users: UserRecord[];
  currentUserId: string;
}

export default function UserAdminClient({ users: initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUser(fd);
      if (result.error) {
        setCreateError(result.error);
      } else {
        setShowCreate(false);
        (e.target as HTMLFormElement).reset();
        // Refresh user list from server
        window.location.reload();
      }
    });
  }

  async function handleRoleChange(userId: string, role: "admin" | "user") {
    startTransition(async () => {
      const result = await updateUserRole(userId, role);
      if (!result.error) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
      }
    });
  }

  async function handleDelete(userId: string) {
    setDeletingId(userId);
    const result = await deleteUser(userId);
    if (!result.error) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Benutzerverwaltung</h1>
          <p className="text-stone-500 text-sm mt-0.5">{users.length} Benutzer</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateError(""); }} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Benutzer anlegen
        </button>
      </div>

      {/* User table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="text-left px-4 py-3 font-medium text-stone-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">E-Mail</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Rolle</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Erstellt</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-stone-900">{u.full_name || "—"}</span>
                    {u.id === currentUserId && (
                      <span className="text-xs text-stone-400">(ich)</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-600 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red disabled:opacity-50"
                    value={u.role}
                    disabled={u.id === currentUserId || isPending}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as "admin" | "user")}
                  >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                  {formatDate(u.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== currentUserId && (
                    confirmDeleteId === u.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-stone-500">Sicher?</span>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deletingId === u.id}
                          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingId === u.id ? "..." : "Löschen"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-stone-400 hover:text-stone-600"
                        >
                          Abbrechen
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(u.id)}
                        className="text-stone-300 hover:text-red-500 transition-colors"
                        title="Benutzer löschen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">Benutzer anlegen</h2>
              <button onClick={() => setShowCreate(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="px-6 py-5 space-y-4">
                {createError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {createError}
                  </div>
                )}
                <div>
                  <label className="label">Name <span className="text-brand-red">*</span></label>
                  <input name="name" type="text" className="input" placeholder="Max Mustermann" required />
                </div>
                <div>
                  <label className="label">E-Mail <span className="text-brand-red">*</span></label>
                  <input name="email" type="email" className="input" placeholder="max@kbelements.de" required />
                </div>
                <div>
                  <label className="label">Passwort <span className="text-brand-red">*</span></label>
                  <input name="password" type="password" className="input" placeholder="Mindestens 6 Zeichen" required minLength={6} />
                </div>
                <div>
                  <label className="label">Rolle</label>
                  <select name="role" className="input">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? "Anlegen..." : "Anlegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
