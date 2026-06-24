import { deleteUser, upsertUser } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/shell";
import { Field, Panel, SelectField, SubmitButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const actor = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <AppShell>
      <PageHeader title="Benutzerverwaltung" eyebrow="Nur Admin" />
      <Panel className="mb-6 p-5">
        <div className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Neuen Benutzer anlegen</div>
        <form action={upsertUser} className="grid gap-4 md:grid-cols-6">
          <Field label="Name" name="name" />
          <Field label="E-Mail" name="email" type="email" />
          <Field label="Passwort" name="password" type="password" />
          <SelectField label="Rolle" name="role" defaultValue="USER">
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </SelectField>
          <label className="flex items-end gap-2 pb-2.5">
            <input name="active" type="checkbox" defaultChecked className="h-4 w-4 rounded accent-brand-red" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Aktiv</span>
          </label>
          <div className="flex items-end"><SubmitButton>Anlegen</SubmitButton></div>
        </form>
      </Panel>

      <div className="grid gap-4">
        {users.map((user) => (
          <Panel key={user.id} className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-grey-light border border-grey-border text-sm font-bold text-grey-dark">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-grey-dark">{user.name}</div>
                <div className="font-mono text-[10px] text-grey-mid">{user.email}</div>
              </div>
              <div className="ml-auto flex gap-2">
                <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${user.role === "ADMIN" ? "border-brand-red/20 bg-brand-red/5 text-brand-red" : "border-grey-border bg-grey-light text-grey-mid"}`}>
                  {user.role}
                </span>
                {!user.active && <span className="rounded border border-brand-red/20 bg-brand-red/5 px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-red">Inaktiv</span>}
              </div>
            </div>
            <form action={upsertUser} className="grid gap-4 lg:grid-cols-7">
              <input type="hidden" name="id" value={user.id} />
              <Field label="Name" name="name" defaultValue={user.name} />
              <Field label="E-Mail" name="email" type="email" defaultValue={user.email} />
              <Field label="Neues Passwort" name="password" type="password" required={false} />
              <SelectField label="Rolle" name="role" defaultValue={user.role}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </SelectField>
              <label className="flex items-end gap-2 pb-2.5">
                <input name="active" type="checkbox" defaultChecked={user.active} className="h-4 w-4 rounded accent-brand-red" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">Aktiv</span>
              </label>
              <div className="flex items-end"><SubmitButton>Speichern</SubmitButton></div>
            </form>
            <div className="mt-4 border-t border-grey-border pt-4">
              <form action={deleteUser}>
                <input type="hidden" name="id" value={user.id} />
                <SubmitButton tone={user.id === actor.id ? "ghost" : "danger"}>
                  {user.id === actor.id ? "Eigenes Konto — geschuetzt" : "Benutzer loeschen"}
                </SubmitButton>
              </form>
            </div>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
