import Link from 'next/link';
import InfoPageShell from '@/components/InfoPageShell';
import PublicLayout from '@/components/PublicLayout';

const termSections = [
  {
    title: '1. サービス提供',
    description: 'AIによる語学学習セッションを提供し、無断転載・商用利用・不正な操作を禁止します。正常にサービスをご利用ください。',
  },
  {
    title: '2. アカウント',
    description: '登録情報は正確に保護し、他者と共有しないでください。ログイン情報の漏洩による損害はお客様の責任です。',
  },
  {
    title: '3. 禁止事項',
    description: '著作権侵害、プロンプト汚染、意図的な不正操作などは禁じられており、違反時は利用停止やアカウント削除を行います。',
  },
];

export default function TermsPage() {
  return (
    <PublicLayout>
      <InfoPageShell
        eyebrow="Legal"
        title="利用規約"
        description="Retentoを安心してお使いいただくための基本的なルールを定めています。登録前にご確認のうえ、同意してご利用ください。"
        ctaLabel="ホームに戻る"
        ctaHref="/"
      >
        {termSections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              {section.title}
            </p>
            <p className="text-sm text-gray-600 mt-2">{section.description}</p>
          </section>
        ))}
        <p className="text-sm text-gray-600">
          ご不明点があれば
          <Link href="/support/contact" className="text-[#c2255d] underline ml-1">
            サポート
          </Link>
          へお問い合わせください。
        </p>
      </InfoPageShell>
    </PublicLayout>
  );
}
