'use client';

import { cn } from '@/lib/utils';

export type SiteFooterLink = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export interface SiteFooterProps {
  productLinks?: SiteFooterLink[];
  supportLinks?: SiteFooterLink[];
  legalLinks?: SiteFooterLink[];
  description?: string;
  className?: string;
  containerClassName?: string;
  innerClassName?: string;
  copyright?: string;
}

const DEFAULT_CONTAINER_CLASS = 'mx-auto w-[90vw] max-w-[1600px] px-4 sm:px-6 lg:px-8';
const DEFAULT_FOOTER_CLASS = 'bg-gray-50 border-t border-gray-100';

const renderLink = (link: SiteFooterLink) => {
  if (link.onClick) {
    return (
      <button
        type="button"
        onClick={link.onClick}
        className="hover:text-gray-900"
      >
        {link.label}
      </button>
    );
  }

  return (
    <a href={link.href ?? '#'} className="hover:text-gray-900">
      {link.label}
    </a>
  );
};

export function SiteFooter({
  productLinks = [],
  supportLinks = [],
  legalLinks = [],
  description = '大学受験向け英単語学習アプリ',
  className,
  containerClassName,
  innerClassName,
  copyright = '© 2025 Retento. All rights reserved.',
}: SiteFooterProps) {
  return (
    <footer className={cn(DEFAULT_FOOTER_CLASS, className)}>
      <div className={cn('w-full py-12', innerClassName)}>
        <div className={cn(DEFAULT_CONTAINER_CLASS, containerClassName)}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
                  <span className="text-white">R</span>
                </div>
                <span className="text-xl tracking-tight">Retento</span>
              </div>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
            <div>
              <h4 className="mb-4 text-gray-900">プロダクト</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {productLinks.map((link) => (
                  <li key={link.label}>{renderLink(link)}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-gray-900">サポート</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {supportLinks.map((link) => (
                  <li key={link.label}>{renderLink(link)}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-gray-900">法務</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {legalLinks.map((link) => (
                  <li key={link.label}>{renderLink(link)}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>{copyright}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
