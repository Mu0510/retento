import Link from 'next/link';

export default function SupportContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">Retento Support</p>
        <h1 className="text-3xl font-semibold text-gray-900">お問い合わせ</h1>
        <p className="text-base leading-relaxed text-gray-600">
          ご質問・ご要望・操作トラブルなどは以下の方法で承ります。ご返信は通常2営業日以内です。
        </p>
        <div className="space-y-3 text-sm text-gray-600">
          <p>• メール：support@retento.ai</p>
          <p>• 導入サポート：enterprises@retento.ai</p>
          <p>• 受付時間：平日10:00〜19:00（祝日除く）</p>
        </div>
        <Link href="/support/help-center" className="text-sm font-semibold text-[#c2255d] underline underline-offset-4">
          よくある質問を見る
        </Link>
        <Link href="/" className="text-sm font-semibold text-[#c2255d] underline underline-offset-4">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
