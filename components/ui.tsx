import type { ReactNode } from "react";
import { clsx } from "clsx";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-xl border border-grey-border bg-white shadow-panel", className)}>
      {children}
    </section>
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = true,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark placeholder:text-grey-mid/60 transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  children,
  defaultValue,
}: {
  label: string;
  name: string;
  children: ReactNode;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 rounded-lg border border-grey-border bg-white px-3 text-sm text-grey-dark transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
      >
        {children}
      </select>
    </label>
  );
}

export function SubmitButton({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "danger" | "ghost";
}) {
  return (
    <button
      type="submit"
      className={clsx(
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-all",
        tone === "primary" && "bg-brand-red text-white hover:bg-brand-red-dark",
        tone === "danger" && "border border-brand-red/30 text-brand-red hover:bg-brand-red/5",
        tone === "ghost" && "border border-grey-border bg-white text-grey-dark hover:bg-grey-light",
      )}
    >
      {children}
    </button>
  );
}

export function FileField({ label, name, accept }: { label: string; name: string; accept?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid">{label}</span>
      <input
        name={name}
        type="file"
        accept={accept}
        required
        className="h-10 rounded-lg border border-grey-border bg-white px-3 py-2 text-sm text-grey-dark file:mr-3 file:rounded file:border-0 file:bg-grey-light file:px-2 file:py-1 file:text-xs file:font-semibold file:text-grey-dark transition-colors focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
      />
    </label>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-grey-border p-8 text-center font-mono text-sm text-grey-mid">
      {text}
    </div>
  );
}
