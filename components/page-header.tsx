export function PageHeader({
  title,
  eyebrow,
  backHref,
  backLabel,
}: {
  title: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-8">
      {backHref && (
        <a
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-grey-mid transition-colors hover:text-brand-red"
        >
          ← {backLabel ?? "Zurück"}
        </a>
      )}
      {eyebrow && (
        <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-red">
          {eyebrow}
        </div>
      )}
      <h1 className="text-3xl font-black tracking-tight text-brand-black">{title}</h1>
    </header>
  );
}
