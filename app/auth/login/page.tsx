'use client';

import Link from 'next/link';
import { type FormEvent } from 'react';
import { Button } from '@/components/ui/button';

const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-8 rounded-3xl bg-white/5 px-6 py-10 shadow-2xl shadow-slate-900/50 backdrop-blur">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Retento</p>
          <div>
            <h1 className="text-3xl font-semibold">ログイン</h1>
            <p className="text-sm text-slate-300">
              セッションステータスを読み込み、すぐに学習を続けましょう。
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          <label className="block text-sm text-slate-200">
            <span className="mb-1 block font-medium text-slate-300">メールアドレス</span>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
            />
          </label>

          <label className="block text-sm text-slate-200">
            <span className="mb-1 block font-medium text-slate-300">パスワード</span>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
            />
          </label>

          <Button type="submit" size="lg" className="w-full rounded-full bg-white text-slate-950">
            ログイン
          </Button>
        </form>

        <div className="flex flex-col gap-2 text-center text-xs text-slate-400">
          <Link href="/auth/signup" className="font-semibold text-white underline-offset-4 hover:underline">
            アカウントを作成
          </Link>
          <button type="button" className="underline underline-offset-4 hover:text-white">
            パスワードを忘れた場合
          </button>
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
            24時間暗号化・セキュアな接続
          </p>
        </div>
      </div>
    </div>
  );
}
