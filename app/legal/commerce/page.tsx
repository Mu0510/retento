import Link from 'next/link';

export default function LegalCommercePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">Retento Legal</p>
        <h1 className="text-3xl font-semibold text-gray-900">特定商取引法に基づく表記</h1>
        <div className="space-y-4 text-sm text-gray-600">
          <p>販売業者：Retento 株式会社</p>
          <p>所在地：東京都港区六本木 1-2-3</p>
          <p>代表者：田中 未来</p>
          <p>料金：月額制（プランによって異なります）、自動更新あり</p>
          <p>支払い方法：クレジットカード / Apple Pay / Google Pay</p>
          <p>返品・キャンセル：ご購入後の原則返金不可、但し法令に基づく場合対応します。</p>
        </div>
        <Link href="/" className="text-sm font-semibold text-[#c2255d] underline underline-offset-4">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
