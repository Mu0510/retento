import Link from 'next/link';
import InfoPageShell from '@/components/InfoPageShell';
import PublicLayout from '@/components/PublicLayout';

const faqs = [
  {
    question: 'セッションの予約はどうやってできますか？',
    answer: 'メイン画面の「セッションを開始」をタップし、希望の日時を選ぶだけで即時予約が完了します。',
  },
  {
    question: '学習履歴は端末を変えても残りますか？',
    answer: 'はい。アカウントにひもづいてクラウド保存されるため、端末を替えても進捗はそのままです。',
  },
  {
    question: 'サブスクリプションはいつでも解約できますか？',
    answer: 'マイページの「サブスクリプション管理」でいつでも解約できます（次回請求日前まで利用可能）。',
  },
];

export default function SupportFaqPage() {
  return (
    <PublicLayout>
      <InfoPageShell
        eyebrow="Support"
        title="よくある質問"
        description="Retentoの利用でよくある疑問をまとめました。必要に応じてヘルプセンターやサポートへお繋ぎします。"
        ctaLabel="ヘルプセンターを確認"
        ctaHref="/support/help-center"
      >
        {faqs.map((faq) => (
          <div key={faq.question} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-sm font-semibold text-gray-900">{`Q: ${faq.question}`}</p>
            <p className="text-sm text-gray-600 mt-2">{`A: ${faq.answer}`}</p>
          </div>
        ))}
        <p>
          ほかのトラブルシューティングは
          <span className="text-[#c2255d] underline">
            <Link href="/support/help-center" className="ml-1">
              ヘルプセンター
            </Link>
          </span>
          をご利用ください。
        </p>
      </InfoPageShell>
    </PublicLayout>
  );
}
