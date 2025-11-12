'use client';

import Link from 'next/link';
import { type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

const socialProviders = [
  {
    id: 'google',
    label: 'Google アカウントで登録',
    buttonClass:
      'border border-gray-200 bg-white text-gray-900 shadow-sm hover:bg-gray-50',
  },
];

type SocialProviderId = 'google';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="h-5 w-5">
    <path
      d="M19.6 10.23c0-.68-.06-1.37-.18-2.02H10v3.82h5.2c-.22 1.2-.9 2.22-1.92 2.9v2.4h3.1c1.8-1.66 2.82-4.08 2.82-6.9z"
      fill="#4285F4"
    />
    <path
      d="M10 20c2.7 0 4.98-.9 6.64-2.42l-3.1-2.4c-.86.57-1.96.9-3.24.9-2.48 0-4.58-1.68-5.34-3.96H1.4v2.48C3.05 17.6 6.3 20 10 20z"
      fill="#34A853"
    />
    <path
      d="M4.66 11.12a5.9 5.9 0 0 1 0-2.24V6.4H1.4a9.99 9.99 0 0 0-.4 4.86c0 1.6.38 3.12 1.06 4.44z"
      fill="#FBBC05"
    />
    <path
      d="M10 3.92c1.47 0 2.8.5 3.84 1.48l2.88-2.88C15 1.06 12.7 0 10 0 6.3 0 3.05 2.4 1.4 5.92l3.26 2.96C5.42 6.6 7.52 3.92 10 3.92z"
      fill="#EA4335"
    />
  </svg>
);

const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
};

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const handleSocialSignIn = (providerId: SocialProviderId) => {
    void signIn(providerId, { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-[#f6f4f2]">
      <div className="relative mx-auto flex max-w-md flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-4 top-0 h-56 rounded-[28px] bg-gradient-to-b from-[#c2255d]/20 via-transparent to-transparent blur-3xl opacity-80" />
        <div className="relative rounded-[32px] border border-gray-100 bg-white/80 p-8 shadow-xl shadow-gray-200/50 backdrop-blur">
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">Retento</p>
            <h1 className="text-3xl font-semibold text-gray-900">アカウントを作成</h1>
          </div>

          <div className="mt-6 space-y-3">
            {socialProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleSocialSignIn(provider.id)}
                className={`w-full flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${provider.buttonClass}`}
              >
                <GoogleIcon />
                <span>{provider.label}</span>
              </button>
            ))}
            <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-gray-400">
              またはメールで登録
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="mt-5 space-y-5">
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
                placeholder="最低8文字"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:border-[#c2255d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2255d]/30"
              />
            </label>

            <div className="flex items-start gap-2 text-xs text-gray-600">
              <input
                id="agreement"
                type="checkbox"
                className="h-4 w-4 rounded border border-gray-300 bg-white accent-[#c2255d] focus:ring-[#c2255d] checked:bg-[#c2255d] checked:border-[#c2255d] origin-left"
                style={{ transform: "scale(0.85)" }}
              />
              <label htmlFor="agreement" className="leading-tight text-gray-700">
                「
                <Link href="/terms" className="text-[#c2255d] underline decoration-[#c2255d]/60">
                  利用規約
                </Link>
                」と「
                <Link href="/privacy" className="text-[#c2255d] underline decoration-[#c2255d]/60">
                  プライバシーポリシー
                </Link>
                」に同意します。
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full rounded-full bg-[#c2255d] text-white">
              無料で始める
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            <span>
              既にアカウントがありますか？{' '}
              <Link
                href="/auth/login"
                className="text-[#c2255d] opacity-[0.85] underline underline-offset-4"
              >
                ログイン
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
