"use client";

import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
  data: { label: string; count: number }[];
  von: string;
  bis: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="text-stone-500 mb-0.5">{label}</p>
      <p className="font-semibold text-stone-900">{payload[0].value} Retoure{payload[0].value !== 1 ? "n" : ""}</p>
    </div>
  );
}

export default function RetourenChart({ data, von, bis }: Props) {
  const router = useRouter();

  function update(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    router.push(`/?${params.toString()}`);
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">Retouren</div>
          <div className="text-2xl font-bold text-stone-900 mt-0.5">{total}</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={von}
            onChange={(e) => update("von", e.target.value)}
            className="input text-xs h-8 py-0 px-2 w-36"
          />
          <span className="text-stone-400 text-xs">—</span>
          <input
            type="date"
            value={bis}
            onChange={(e) => update("bis", e.target.value)}
            className="input text-xs h-8 py-0 px-2 w-36"
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-stone-400">
          Keine Retouren im gewählten Zeitraum.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#a8a29e" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#a8a29e" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f5f5f4" }} />
            <Bar dataKey="count" fill="#C0182A" radius={[3, 3, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
