"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Sku {
  id: string;
  sku: string;
  name: string | null;
  active: boolean;
}

interface Props {
  initialSkus: Sku[];
}

export default function SkuAdminClient({ initialSkus }: Props) {
  const [skus, setSkus] = useState<Sku[]>(initialSkus);
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const filtered = skus.filter(
    (s) =>
      s.sku.toLowerCase().includes(search.toLowerCase()) ||
      (s.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newSku.trim()) return;
    setAdding(true);
    setError("");

    const { data, error: e2 } = await supabase
      .from("skus")
      .insert({ sku: newSku.trim().toUpperCase(), name: newName.trim() || null, active: true })
      .select()
      .single();

    if (e2) {
      setError(e2.message.includes("unique") ? `SKU "${newSku.trim().toUpperCase()}" existiert bereits.` : e2.message);
    } else if (data) {
      setSkus((prev) => [...prev, data].sort((a, b) => a.sku.localeCompare(b.sku)));
      setNewSku("");
      setNewName("");
    }
    setAdding(false);
  }

  async function toggleActive(id: string, active: boolean) {
    const { error: e } = await supabase
      .from("skus")
      .update({ active: !active })
      .eq("id", id);
    if (!e) setSkus((prev) => prev.map((s) => s.id === id ? { ...s, active: !active } : s));
  }

  async function handleDelete(id: string, sku: string) {
    if (!confirm(`SKU "${sku}" wirklich löschen?`)) return;
    const { error: e } = await supabase.from("skus").delete().eq("id", id);
    if (!e) setSkus((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-5">
      {/* Add Form */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">SKU hinzufügen</h2>
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
          <div className="flex-shrink-0">
            <label className="label">SKU</label>
            <input
              type="text"
              className="input w-40 font-mono uppercase"
              placeholder="KB-12345"
              value={newSku}
              onChange={(e) => setNewSku(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Produktname <span className="text-stone-400 font-normal">(optional)</span></label>
            <input
              type="text"
              className="input"
              placeholder="z.B. Bluetooth Lautsprecher"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary" disabled={adding}>
              {adding ? "Hinzufügen..." : "Hinzufügen"}
            </button>
          </div>
        </form>
      </div>

      {/* SKU List */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-stone-700">
            {skus.length} SKUs gesamt
          </span>
          <input
            type="text"
            className="input w-48 py-1.5 text-sm"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-600">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Produktname</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                    {search ? "Keine SKUs gefunden." : "Noch keine SKUs vorhanden."}
                  </td>
                </tr>
              ) : (
                filtered.map((sku) => (
                  <tr key={sku.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-stone-800">{sku.sku}</td>
                    <td className="px-4 py-3 text-stone-600">{sku.name ?? <span className="text-stone-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(sku.id, sku.active)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
                          sku.active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                        }`}
                      >
                        {sku.active ? "Aktiv" : "Inaktiv"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(sku.id, sku.sku)}
                        className="text-stone-400 hover:text-red-500 transition-colors"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
