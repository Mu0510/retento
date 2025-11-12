import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">Retento</p>
        <h1 className="text-3xl font-semibold text-gray-900">プライバシーポリシー</h1>
        <p className="text-base leading-relaxed text-gray-600">
          ご登録情報や利用履歴は、学習体験の向上・サポート・不正防止の目的でのみ利用します。個人情報の管理には細心の注意を払い、法令を遵守します。
        </p>
        <div className="space-y-4 text-sm text-gray-600">
          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-800">1. 収集項目</h2>
            <p>
              メールアドレス・パスワード・ログイン履歴・課金履歴・学習進捗などを収集し、必要な範囲でのみ保持します。
            </p>
          </section>
          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-800">2. 利用目的</h2>
            <p>
              サービス提供、本人確認、改善活動、通知連絡などに利用し、目的外利用は行いません。
            </p>
          </section>
          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-800">3. 第三者提供</h2>
            <p>
              法令で認められる場合を除き、第三者に提供せず、必要な契約を結んだ委託先にのみ共有します。
            </p>
          </section>
        </div>
        <Link href="/" className="text-sm font-semibold text-[#c2255d] underline underline-offset-4">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
