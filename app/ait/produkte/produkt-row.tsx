"use client";

import { useTransition, useState } from "react";
import { updateAitDimensions } from "./actions";

type Item = {
  sku: string;
  name: string;
  aitWeight: number | null;
  aitHeight: number | null;
  aitWidth: number | null;
  aitDepth: number | null;
};

export function AitProduktRow({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [w, setW] = useState(item.aitWeight?.toString() ?? "");
  const [h, setH] = useState(item.aitHeight?.toString() ?? "");
  const [b, setB] = useState(item.aitWidth?.toString() ?? "");
  const [t, setT] = useState(item.aitDepth?.toString() ?? "");

  const cubic = h && b && t
    ? (parseInt(h) * parseInt(b) * parseInt(t) / 1_000_000).toFixed(3)
    : null;

  function handleSave() {
    const fd = new FormData();
    fd.set("sku", item.sku);
    fd.set("aitWeight", w);
    fd.set("aitHeight", h);
    fd.set("aitWidth", b);
    fd.set("aitDepth", t);
    startTransition(async () => {
      await updateAitDimensions(fd);
      setEditing(false);
    });
  }

  const inputCls = "w-20 rounded border border-grey-border bg-white px-2 py-1 font-mono text-xs text-grey-dark focus:border-brand-red focus:outline-none";

  return (
    <tr className="transition-colors hover:bg-grey-light/60">
      <td className="px-4 py-2 font-mono text-sm font-semibold text-brand-red">{item.sku}</td>
      <td className="px-4 py-2 text-sm text-grey-dark">{item.name || <span className="italic text-grey-mid">—</span>}</td>
      {editing ? (
        <>
          <td className="px-4 py-2"><input className={inputCls} value={w} onChange={e => setW(e.target.value)} placeholder="kg" /></td>
          <td className="px-4 py-2"><input className={inputCls} value={h} onChange={e => setH(e.target.value)} placeholder="cm" /></td>
          <td className="px-4 py-2"><input className={inputCls} value={b} onChange={e => setB(e.target.value)} placeholder="cm" /></td>
          <td className="px-4 py-2"><input className={inputCls} value={t} onChange={e => setT(e.target.value)} placeholder="cm" /></td>
          <td className="px-4 py-2 font-mono text-xs text-grey-mid tabular-nums">{cubic ?? "—"}</td>
          <td className="px-4 py-2 flex gap-2">
            <button
              onClick={handleSave}
              disabled={pending}
              className="rounded border border-brand-red bg-brand-red px-2.5 py-1 font-mono text-xs font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50 transition-colors"
            >
              {pending ? "…" : "Speichern"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded border border-grey-border px-2.5 py-1 font-mono text-xs text-grey-mid hover:text-grey-dark transition-colors"
            >
              Abbrechen
            </button>
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-2 font-mono tabular-nums text-sm text-grey-dark">{item.aitWeight ?? <span className="text-grey-mid">—</span>}</td>
          <td className="px-4 py-2 font-mono tabular-nums text-sm text-grey-dark">{item.aitHeight ?? <span className="text-grey-mid">—</span>}</td>
          <td className="px-4 py-2 font-mono tabular-nums text-sm text-grey-dark">{item.aitWidth ?? <span className="text-grey-mid">—</span>}</td>
          <td className="px-4 py-2 font-mono tabular-nums text-sm text-grey-dark">{item.aitDepth ?? <span className="text-grey-mid">—</span>}</td>
          <td className="px-4 py-2 font-mono tabular-nums text-sm text-grey-mid">
            {item.aitHeight && item.aitWidth && item.aitDepth
              ? (item.aitHeight * item.aitWidth * item.aitDepth / 1_000_000).toFixed(3)
              : "—"}
          </td>
          <td className="px-4 py-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded border border-grey-border px-2.5 py-1 font-mono text-xs text-grey-mid hover:border-brand-red hover:text-brand-red transition-colors"
            >
              Bearbeiten
            </button>
          </td>
        </>
      )}
    </tr>
  );
}
