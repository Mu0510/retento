import Link from 'next/link';

export default function SupportHelpCenterPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">Retento Support</p>
        <h1 className="text-3xl font-semibold text-gray-900">ヘルプセンター</h1>
        <p className="text-base leading-relaxed text-gray-600">
          よくあるご質問やトラブルシューティングをまとめました。以下のセクションを参照するか、サポートチームまでご連絡ください。
        </p>
        <div className="space-y-3 text-sm text-gray-600">
          <p>• 認証に関する問題 – パスワードのリセット、SNSログイン</p>
          <p>• ご契約・請求 – プラン変更や自動更新設定</p>
          <p>• 使用方法ガイド – セッションの進め方、AIフィードバックの見方</p>
        </div>
        <Link href="/support/contact" className="text-sm font-semibold text-[#c2255d] underline underline-offset-4">
          まだ解決しない場合はお問い合わせ
        </Link>
        <Link href="/" className="text-sm font-semibold text-[#c2255d] underline underline-offset-4">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
