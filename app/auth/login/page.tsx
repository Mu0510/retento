'use client';

import Link from 'next/link';
import { type FormEvent } from 'react';
import { Button } from '@/components/ui/button';

const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-[#f6f4f2]">
      <div className="relative mx-auto flex max-w-md flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-4 top-0 h-56 rounded-[28px] bg-gradient-to-b from-[#c2255d]/20 via-transparent to-transparent blur-3xl opacity-80" />
        <div className="relative rounded-[32px] border border-gray-100 bg-white/80 p-8 shadow-xl shadow-gray-200/50 backdrop-blur">
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">Retento</p>
            <h1 className="text-3xl font-semibold text-gray-900">ログイン</h1>
            <p className="text-sm text-gray-500">
              セッションステータスを読み込み、すぐに学習を続けましょう。
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="mt-6 space-y-5">
            <label className="block text-sm text-gray-700">
              <span className="mb-1 block font-medium text-gray-600">メールアドレス</span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:border-[#c2255d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2255d]/30"
              />
            </label>

            <label className="block text-sm text-gray-700">
              <span className="mb-1 block font-medium text-gray-600">パスワード</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:border-[#c2255d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2255d]/30"
              />
            </label>

            <Button type="submit" size="lg" className="w-full rounded-full bg-[#c2255d] text-white">
              ログイン
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-sm text-gray-500">
            <button type="button" className="underline underline-offset-4 hover:text-gray-900">
              パスワードを忘れた場合
            </button>
            <Link
              href="/auth/signup"
              className="text-xs text-gray-500 underline underline-offset-4 decoration-[#c2255d]/40 hover:text-gray-700"
            >
              まだアカウントを持っていませんか？無料で作成
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
