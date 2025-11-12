import Link from 'next/link';

export default function SupportFaqPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">Retento Support</p>
        <h1 className="text-3xl font-semibold text-gray-900">よくある質問</h1>
        <div className="space-y-4 text-sm text-gray-600">
          <div className="space-y-1">
            <p className="font-semibold text-gray-800">Q: セッションの予約はどうやってできますか？</p>
            <p>A: メイン画面の「セッションを開始」をクリックし、希望の日時を選択すると即時予約されます。</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-gray-800">Q: 学習履歴は消えますか？</p>
            <p>A: アカウントに紐づけてクラウド保存するため、端末を変更しても維持されます。</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-gray-800">Q: サブスクリプションは解約できますか？</p>
            <p>A: マイページの「サブスクリプション管理」からいつでも解約できます（次回請求日前まで利用可能）。</p>
          </div>
        </div>
        <Link href="/support/help-center" className="text-sm font-semibold text-[#c2255d] underline underline-offset-4">
          その他のトラブルシューティングを参照
        </Link>
        <Link href="/" className="text-sm font-semibold text-[#c2255d] underline underline-offset-4">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
