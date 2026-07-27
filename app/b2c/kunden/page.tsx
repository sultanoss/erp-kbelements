import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/page-header";
import { Panel, SubmitButton } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { deleteB2cCustomer } from "./actions";

export const dynamic = "force-dynamic";

export default async function B2cKundenPage() {
  await requireUser();

  const customers = await prisma.b2cCustomer.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <AppShell>
      <PageHeader title="B2C Kunden" eyebrow="Buchhaltung" />

      <Panel className="overflow-x-auto">
        {customers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-mono text-sm text-grey-mid">Noch kein B2C Kunde vorhanden.</p>
            <p className="mt-1 font-mono text-xs text-grey-mid/70">Beim Erstellen einer Rechnung „Kunde speichern (B2C)" anhaken.</p>
          </div>
        ) : (
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-grey-border bg-grey-light">
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Name</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Adresse</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Gespeichert am</th>
                <th className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-border">
              {customers.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-grey-light/60">
                  <td className="px-4 py-3 font-semibold text-grey-dark">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-grey-mid whitespace-pre-wrap">{c.address || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-grey-mid">
                    {new Date(c.createdAt).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteB2cCustomer.bind(null, c.id)}>
                      <SubmitButton tone="danger">Löschen</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </AppShell>
  );
}
