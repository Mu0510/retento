import Link from 'next/link';
import InfoPageShell from '@/components/InfoPageShell';
import PublicLayout from '@/components/PublicLayout';

export default function LegalCommercePage() {
  return (
    <PublicLayout>
      <InfoPageShell
        eyebrow="Legal"
        title="特定商取引法に基づく表記"
        description="Retentoの販売条件・決済・お問い合わせ窓口を透明に開示しています。ご購入前にご一読ください。"
        ctaLabel="ホームに戻る"
        ctaHref="/"
      >
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 space-y-3 text-sm text-gray-600">
          <p>販売業者：Retento 株式会社</p>
          <p>所在地：東京都港区六本木 1-2-3</p>
          <p>代表者：田中 未来</p>
          <p>料金：月額制プランを提供（プランによって金額が異なり、自動更新あり）</p>
          <p>支払い方法：クレジットカード・Apple Pay・Google Pay</p>
          <p>返品・キャンセル：原則として返金不可ですが、法令による場合は対応します。</p>
        </div>
        <div className="text-sm text-gray-600">
          <p>
            請求に関するご相談は
            <Link href="/support/contact" className="text-[#c2255d] underline ml-1">
              サポート窓口
            </Link>
            をご利用ください。
          </p>
        </div>
      </InfoPageShell>
    </PublicLayout>
  );
}
