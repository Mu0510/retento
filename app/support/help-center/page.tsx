import Link from 'next/link';
import InfoPageShell from '@/components/InfoPageShell';
import PublicLayout from '@/components/PublicLayout';

const helpTopics = [
  '認証に関する問題 – パスワードのリセットやSNSログイン',
  'ご契約・請求 – プラン変更や自動更新の管理',
  '使用方法ガイド – セッションの進め方やAIフィードバックの見かた',
];

export default function SupportHelpCenterPage() {
  return (
    <PublicLayout>
      <InfoPageShell
        eyebrow="Support"
        title="ヘルプセンター"
        description="よくあるご質問・利用時のトラブルを一覧化しています。まずはこちらをご確認いただき、それでも解決しない場合はお問い合わせください。"
        ctaLabel="お問い合わせへ"
        ctaHref="/support/contact"
      >
        <div className="space-y-4">
          {helpTopics.map((topic) => (
            <div key={topic} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <p className="text-sm text-gray-600">{topic}</p>
            </div>
          ))}
          <p className="text-sm text-gray-600">
            サポートチームは通常1営業日以内に返信します。緊急のトラブルはメール件名に「至急」とご記載ください。
          </p>
          <p>
            <Link href="/" className="text-[#c2255d] underline">
              ホームに戻る
            </Link>
          </p>
        </div>
      </InfoPageShell>
    </PublicLayout>
  );
}
