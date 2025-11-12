import Link from 'next/link';
import InfoPageShell from '@/components/InfoPageShell';
import PublicLayout from '@/components/PublicLayout';

const privacySections = [
  {
    title: '1. 収集項目',
    body: 'メールアドレス・パスワード・ログイン履歴・課金履歴・学習進捗など、サービス提供に必要な範囲でのみ収集します。',
  },
  {
    title: '2. 利用目的',
    body: 'サービス提供、本人確認、改善活動、通知連絡などに利用し、目的外での利用や保存は行いません。',
  },
  {
    title: '3. 第三者提供',
    body: '法令で求められる場合を除き第三者提供は行わず、委託先には厳格な契約のもとで必要最小限の情報を共有します。',
  },
];

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <InfoPageShell
        eyebrow="Legal"
        title="プライバシーポリシー"
        description="ご登録情報は学習体験の向上、サポート、セキュリティ目的でのみ利用します。透明性・法令順守・最小限の収集を徹底しています。"
        ctaLabel="ホームに戻る"
        ctaHref="/"
      >
        {privacySections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              {section.title}
            </p>
            <p className="text-sm text-gray-600 mt-2">{section.body}</p>
          </section>
        ))}
        <p className="text-sm text-gray-600">
          ご不明点は
          <Link href="/support/contact" className="text-[#c2255d] underline ml-1">
            サポート
          </Link>
          までご連絡ください。
        </p>
      </InfoPageShell>
    </PublicLayout>
  );
}
