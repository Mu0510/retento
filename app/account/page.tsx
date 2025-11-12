import Link from 'next/link';

export default function AccountSettingsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-[90vw] max-w-4xl px-4 py-16 sm:py-20">
        <div className="space-y-10">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Account</p>
            <h1 className="text-4xl font-semibold text-gray-900 leading-tight">
              アカウント設定
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Retentoの学習セッションや通知は、科学的根拠と摩擦ゼロのUXをベースに設計されています。
              アカウント情報を確認して、好みの通知やセッションリズムに合わせてみましょう。
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <article className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-5 shadow-sm">
              <h2 className="text-sm font-semibold tracking-tight text-gray-900">プロフィール</h2>
              <p className="text-sm text-gray-600">
                名前やメールアドレス、プロフィール画像などの基本情報をここから更新できます。
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                すっきりとした入力欄で、余裕を持って変更
              </p>
            </article>
            <article className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-5 shadow-sm">
              <h2 className="text-sm font-semibold tracking-tight text-gray-900">通知・セキュリティ</h2>
              <p className="text-sm text-gray-600">
                ゲーム感のあるランキングも通知のオンとオフでコントロール。セッションを妨げないタイミングでお届けします。
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                通知も、Retentoらしい静かなプロフェッショナルさ
              </p>
            </article>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white/90 p-6">
            <p className="text-sm text-gray-600">
              ご希望の設定がすぐに反映されるよう、必要な情報をそっと整えています。アカウント変更は何度でも可能です。
            </p>
            <Link
              href="/"
              className="text-sm font-semibold text-[#c2255d] underline underline-offset-4 decoration-[#c2255d]/60"
            >
              ランディングページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
