'use client';

import Link from 'next/link';
import { type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

const benefitList = [
  'メール認証で即時承認・クレジットカード不要',
  '1日3セッション保証。AIフィードバックが段階的に高度化',
  '進捗はテーマ別にクラウド保存され、端末をまたいで同期',
];

const proofPoints = [
  {
    label: '非同期生成',
    detail: '10問セッションは回答直後にAIが生成し、待ち時間ゼロでプレイ可能。',
  },
  {
    label: '科学的根拠',
    detail: '忘却曲線×AI分析で今日必要な単語を絞り込み、精度の高い出題を自動構築。',
  },
  {
    label: '継続モチベ',
    detail: 'S+からA-までのランクと週次ランキングで努力量を可視化します。',
  },
];

const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#fdfdfd] text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <p className="text-[0.65rem] uppercase tracking-[0.7em] text-gray-400">New learner</p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            初期登録でAIコーチングを即時スタート
          </h1>
          <p className="max-w-3xl text-base text-gray-600">
            登録完了からクラウド同期・テーマ自動構築・ランキング設定までを1分でシームレスに完了します。下のフォームでアカウントを作成し、学習を科学的に加速させましょう。
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>すでにアカウントをお持ちの方</span>
            <Link href="/auth/login" className="font-semibold text-[#c2255d] underline-offset-4 hover:underline">
              ログインする
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleFormSubmit} className="space-y-5 rounded-3xl border border-gray-100 bg-white/80 p-8">
            <p className="text-sm font-semibold text-gray-700">アカウントを作る</p>
            <label className="flex flex-col text-sm text-gray-700">
              <span className="mb-2 font-medium text-gray-600">フルネーム</span>
              <input
                type="text"
                required
                placeholder="例：山田 太郎"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus-visible:border-[#c2255d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2255d]/40"
              />
            </label>
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
                placeholder="最低8文字"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus-visible:border-[#c2255d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2255d]/40"
              />
            </label>
            <label className="flex flex-col text-sm text-gray-700">
              <span className="mb-2 font-medium text-gray-600">パスワード（確認）</span>
              <input
                type="password"
                required
                placeholder="もう一度入力"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus-visible:border-[#c2255d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2255d]/40"
              />
            </label>
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full bg-[#c2255d] text-white hover:bg-[#a01d4d]"
            >
              無料で始める
            </Button>
            <p className="text-xs text-gray-500">
              1日3セッション無料。継続すればAIコーチが自信度を学習し、より的確な復習サイクルを提案します。
            </p>
          </form>

          <div className="space-y-6 rounded-3xl border border-gray-100 bg-white/70 p-8 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-semibold text-gray-700">学習のエンジン</p>
            <div className="space-y-5 text-sm text-gray-600">
              {proofPoints.map((proof) => (
                <div key={proof.label} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2255d]" />
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">{proof.label}</p>
                  </div>
                  <p>{proof.detail}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              {benefitList.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <span className="h-1 w-4 rounded-full bg-[#c2255d]" aria-hidden />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
