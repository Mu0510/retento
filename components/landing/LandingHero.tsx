'use client';

import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';

export type LandingHeroProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  visual: React.ReactNode;
  className?: string;
  stats?: Array<{ label: string; value: string }>;
};

export function LandingHero({
  eyebrow,
  title,
  description,
  actions,
  visual,
  className,
  stats,
}: LandingHeroProps) {
  return (
    <section
      className={`relative pt-16 sm:pt-20 pb-16 sm:pb-24 overflow-hidden ${className ?? ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/40 to-white -z-10" />
      <div className="mx-auto w-[90vw] max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {eyebrow && (
              <Badge variant="secondary" className="mb-6 bg-gray-100 text-sm">
                {eyebrow}
              </Badge>
            )}
            <div className="space-y-6">
              <div className="text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1]">
                {title}
              </div>
              {description && (
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {actions}
              </div>
            )}
            {stats && (
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-gray-100 bg-white/80 p-4 text-sm">
                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{item.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {visual}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
