'use client';

import Link from 'next/link';
import { type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

const trustSignals = [
  {
    title: '傾向分析',
    detail: '直近の回答速度・正誤率をスコア化し、AIコーチが再調整したセッションを提示します。',
  },
  {
    title: '非同期キュー',
    detail: '回答直後に次の10問を生成し、読み終わる頃には新しいセッションが待っています。',
  },
  {
    title: '監査済みセキュリティ',
    detail: '多要素認証・暗号化・24時間監視で学習進捗とメタデータを守ります。',
  },
];

const reminders = ['24時間セッション復帰', '最新のAIフィードバック', '進捗グラフ・テーマ分析'];

const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#fdfdfd] text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <p className="text-[0.65rem] uppercase tracking-[0.7em] text-gray-400">科学的再開</p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            ログインして、今のテーマを即時再開
          </h1>
          <p className="max-w-3xl text-base text-gray-600">
            セッションステータスはクラウドと同期済み。AIコーチがあなたの直近の傾向を読み取り、次に何を学ぶべきかを提示します。下のフォームで1分以内に戻りましょう。
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>アカウントをお持ちでない方はこちら</span>
            <Link href="/auth/signup" className="font-semibold text-[#c2255d] underline-offset-4 hover:underline">
              サインアップする
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleFormSubmit} className="space-y-5 rounded-3xl border border-gray-100 bg-white/80 p-8">
            <p className="text-sm font-semibold text-gray-700">ログイン情報</p>
            <label className="flex flex-col text-sm text-gray-700">
              <span className="mb-2 font-medium text-gray-600">メールアドレス</span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus-visible:border-[#c2255d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2255d]/40"
              />
            </label>
            <label className="flex flex-col text-sm text-gray-700">
              <span className="mb-2 font-medium text-gray-600">パスワード</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus-visible:border-[#c2255d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2255d]/40"
              />
            </label>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <button type="button" className="underline underline-offset-4 hover:text-gray-900">
                パスワードを忘れた場合
              </button>
              <span>セキュアセッション 24時間</span>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full bg-[#c2255d] text-white hover:bg-[#a01d4d]"
            >
              ログイン
            </Button>
          </form>

          <div className="space-y-6 rounded-3xl border border-gray-100 bg-white/70 p-8">
            <p className="text-sm font-semibold text-gray-700">信頼の層</p>
            <div className="space-y-4">
              {trustSignals.map((signal) => (
                <div key={signal.title} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">{signal.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{signal.detail}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              {reminders.map((reminder) => (
                <div key={reminder} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[#c2255d]" />
                  <span>{reminder}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
