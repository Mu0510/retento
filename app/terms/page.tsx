import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">Retento</p>
        <h1 className="text-3xl font-semibold text-gray-900">利用規約</h1>
        <p className="text-base leading-relaxed text-gray-600">
          Retentoを安心してお使いいただくための基本的なルールをまとめています。登録前に目を通し、同意のうえご利用ください。
        </p>
        <div className="space-y-4 text-sm text-gray-600">
          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-800">1. サービス提供</h2>
            <p>
              当社はAIによる語学学習セッションを提供し、無断転載や商用利用などを禁止します。ユーザーは正常な方法でサービスに接続してください。
            </p>
          </section>
          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-800">2. アカウント</h2>
            <p>
              登録情報は正確に管理し、第三者が利用しないようにしてください。ログイン情報の流出による損害はお客様の責任となります。
            </p>
          </section>
          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-800">3. 禁止事項</h2>
            <p>
              著作権侵害、プロンプト汚染、意図的な不正操作などの行為は禁止し、違反時には利用停止やアカウント削除を行う場合があります。
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
