export function PageHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <header className="mb-8">
      {eyebrow && (
        <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-red">
          {eyebrow}
        </div>
      )}
      <h1 className="text-3xl font-black tracking-tight text-brand-black">{title}</h1>
    </header>
  );
}
