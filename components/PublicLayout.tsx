'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'ホーム', href: '/' },
  { label: 'サポート', href: '/support/help-center' },
  { label: '法務', href: '/terms' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-[90vw] max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:py-5">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 text-white">
              R
            </div>
            Retento
          </Link>
          <nav className="hidden gap-8 text-sm font-medium text-gray-600 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-gray-900">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/auth/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
              ログイン
            </Link>
            <Link href="/auth/signup">
              <Button className="rounded-full bg-[#c2255d] px-4 text-white hover:bg-[#a01d4d]" size="sm">
                今すぐ始める
              </Button>
            </Link>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 text-gray-600 md:hidden"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="メニューを開く"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="space-y-2 px-4 pb-4 pt-3 text-sm font-medium text-gray-700">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-2xl px-3 py-2 hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/auth/login"
                className="block rounded-2xl px-3 py-2 hover:bg-gray-50 hover:text-gray-900"
                onClick={() => setIsMenuOpen(false)}
              >
                ログイン
              </Link>
              <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full rounded-full bg-[#c2255d] text-white hover:bg-[#a01d4d]" size="sm">
                  今すぐ始める
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto w-[90vw] max-w-[1600px] px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 text-white">
                  R
                </div>
                <span className="text-xl font-semibold text-gray-900">Retento</span>
              </div>
              <p className="text-sm text-gray-600">大学受験向け英単語学習アプリ</p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">プロダクト</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/" className="hover:text-gray-900">
                    ホーム
                  </Link>
                </li>
                <li>
                  <Link href="/support/help-center" className="hover:text-gray-900">
                    ヘルプ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">サポート</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/support/help-center" className="hover:text-gray-900">
                    ヘルプセンター
                  </Link>
                </li>
                <li>
                  <Link href="/support/faq" className="hover:text-gray-900">
                    よくある質問
                  </Link>
                </li>
                <li>
                  <Link href="/support/contact" className="hover:text-gray-900">
                    お問い合わせ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">法務</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/terms" className="hover:text-gray-900">
                    利用規約
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-gray-900">
                    プライバシーポリシー
                  </Link>
                </li>
                <li>
                  <Link href="/legal/commerce" className="hover:text-gray-900">
                    特定商取引法表記
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-gray-500">© 2025 Retento. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
