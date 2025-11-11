type SectionProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function Section({ eyebrow, title, description, children }: SectionProps) {
  return (
    <section className="space-y-6 py-6">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-[#999]">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-3 max-w-3xl text-sm text-[#444]">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
