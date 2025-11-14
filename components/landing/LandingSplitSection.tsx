'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

export type LandingSplitSectionProps = {
  eyebrow?: ReactNode;
  badge?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  bullets?: Array<{ id?: string; text: ReactNode }>;
  image: ReactNode;
  reverse?: boolean;
  className?: string;
  actions?: ReactNode;
};

export function LandingSplitSection({
  eyebrow,
  badge,
  title,
  description,
  bullets,
  image,
  reverse,
  className,
  actions,
}: LandingSplitSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`grid lg:grid-cols-2 gap-12 items-center ${className ?? ''}`}
    >
      <div className={reverse ? 'lg:order-2 space-y-6' : 'space-y-6'}>
        {badge}
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{eyebrow}</p>
        )}
        <h3 className="text-2xl sm:text-3xl tracking-tight">{title}</h3>
        {description && <p className="text-gray-600 leading-relaxed">{description}</p>}
        {bullets && bullets.length > 0 && (
          <ul className="space-y-3">
            {bullets.map((item, index) => (
              <li key={item.id ?? `bullet-${index}`} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{item.text}</span>
              </li>
            ))}
          </ul>
        )}
        {actions && <div className="mt-2">{actions}</div>}
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>{image}</div>
    </motion.div>
  );
}
