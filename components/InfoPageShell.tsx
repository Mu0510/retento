import Link from 'next/link';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type InfoPageShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function InfoPageShell({
  eyebrow,
  title,
  description,
  children,
  ctaLabel,
  ctaHref,
}: InfoPageShellProps) {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-white via-white to-[#f7f6f4]">
      <div className="mx-auto w-[90vw] max-w-4xl px-4">
        <div className="flex flex-col gap-10 rounded-[32px] border border-gray-100 bg-white/80 p-10 shadow-xl shadow-gray-200/40 backdrop-blur">
          <div className="space-y-3">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">{eyebrow}</p>
            )}
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">
              {title}
            </h1>
            <p className="text-base text-gray-600 leading-relaxed">{description}</p>
            {ctaLabel && ctaHref && (
              <div className="pt-2">
                <Link href={ctaHref} className="inline-flex">
                  <Button className="rounded-full bg-[#c2255d] text-white hover:bg-[#a01d4d]" size="md">
                    {ctaLabel}
                  </Button>
                </Link>
              </div>
            )}
          </div>
          <div className="space-y-6 text-sm text-gray-600">{children}</div>
        </div>
      </div>
    </section>
  );
}
