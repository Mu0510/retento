import Link from 'next/link';
import InfoPageShell from '@/components/InfoPageShell';
import PublicLayout from '@/components/PublicLayout';

export default function SupportContactPage() {
  return (
    <PublicLayout>
      <InfoPageShell
        eyebrow="Support"
        title="お問い合わせ"
        description="ご質問・ご要望・操作トラブルなどは、以下の窓口で承っています。可能な限り翌営業日までにご返信します。"
        ctaLabel="ホームに戻る"
        ctaHref="/"
      >
        <div className="space-y-4">
          <p className="font-semibold text-gray-900">いつでも相談窓口</p>
          <p>• メール：support@retento.ai（サポート）</p>
          <p>• 導入サポート：enterprises@retento.ai（法人向けプラン）</p>
          <p>• 受付時間：平日 10:00〜19:00（祝日を除く）</p>
        </div>
        <div className="space-y-3">
          <p className="font-semibold text-gray-900">トラブルシューティングの活用</p>
          <p>問題がすぐに解決しない場合は、ヘルプセンターやFAQと併せてご確認ください。</p>
          <p>• <Link href="/support/help-center" className="text-[#c2255d] underline">ヘルプセンター</Link></p>
          <p>• <Link href="/support/faq" className="text-[#c2255d] underline">よくある質問</Link></p>
        </div>
      </InfoPageShell>
    </PublicLayout>
  );
}
