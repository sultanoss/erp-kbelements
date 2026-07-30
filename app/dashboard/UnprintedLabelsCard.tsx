import { Panel } from "@/components/ui";
import Link from "next/link";

type Shipment = {
  id: string;
  order: {
    id: string;
    orderNumber: string | null;
    customerName: string;
    marketplace: string;
  };
};

export function UnprintedLabelsCard({ shipments }: { shipments: Shipment[] }) {
  const count = shipments.length;

  return (
    <Panel className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">
          Label nicht gedruckt
        </span>
        {count > 0 ? (
          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-red px-1.5 font-mono text-[11px] font-bold text-white">
            {count}
          </span>
        ) : (
          <span className="text-green-600 text-sm">✓</span>
        )}
      </div>

      {count === 0 ? (
        <p className="font-mono text-xs text-grey-mid">Alle Labels gedruckt</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shipments.map((s) => (
            <li key={s.id}>
              <Link
                href={`/bestellungen/${s.order.id}`}
                className="flex items-center justify-between rounded-lg border border-grey-border px-3 py-2 text-xs hover:border-brand-red transition-colors"
              >
                <span className="font-mono font-semibold text-grey-dark">
                  {s.order.orderNumber ?? "—"}
                </span>
                <span className="text-grey-mid truncate max-w-[120px] text-right">
                  {s.order.customerName}
                </span>
                <span className="ml-2 font-mono text-[10px] text-brand-red font-semibold shrink-0">
                  {s.order.marketplace}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
