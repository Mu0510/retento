import Link from "next/link";

import { MarketingPageShell } from "@/components/layout/MarketingPageShell";

const commerceDetails = [
  {
    label: "販売業者",
    value: "Retento（個人事業主）",
  },
  {
    label: "運営責任者",
    value: "Retento 開発者",
  },
  {
    label: "所在地",
    value: "東京都内（自宅兼事務所のため、ご請求時に詳細をお伝えします）",
  },
  {
    label: "連絡先",
    value: "support@retento.app（メール対応のみ）",
  },
  {
    label: "販売価格",
    value: "料金ページに表示している金額（税込）",
  },
  {
    label: "お支払い方法",
    value: "クレジットカード（Stripe）、Apple Pay、Google Pay",
  },
  {
    label: "サービス提供時期",
    value: "決済完了後すぐに利用開始できます。手動承認が必要な場合は24時間以内にご案内します。",
  },
  {
    label: "返品・キャンセル",
    value: "デジタルコンテンツの性質上、原則として返金はお受けしていません。動作不良がある場合は14日以内にご相談ください。",
  },
  {
    label: "動作環境",
    value: "最新版のChrome / Safari / Edge および iOS・Android の最新2バージョンを推奨",
  },
];

const purchaseFlow = [
  "料金ページからプランを選択し、メールアドレスとカード情報を入力します。",
  "Stripeの決済画面で内容を確認し、決済を完了すると自動でアカウントが有効化されます。",
  "領収書と利用開始手順を記載したメールを数分以内にお送りします。届かない場合は迷惑メールをご確認ください。",
];

const downloadableDocuments = [
  {
    label: "個人向けご利用ガイド（PDF）",
    href: "/docs/retento-ux-spec.md",
  },
  {
    label: "請求情報の確認方法",
    href: "/support/faq",
  },
];

export default function LegalCommercePage() {
  return (
    <MarketingPageShell>
      <section id="top" className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.35em] text-[#c2255d]">LEGAL</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            特定商取引法に基づく表記
          </h1>
          <p className="mt-6 text-base leading-7 text-gray-600 sm:text-lg">
            Retentoは個人で開発・運営しているため、やり取りはメール中心で行っています。
            ご購入前に不明点があれば、お問い合わせからお気軽にご相談ください。
          </p>
          <p className="mt-4 text-xs leading-5 text-gray-500">最終更新日: 2025年4月12日</p>
          <nav className="mt-8 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">関連ドキュメント</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              <li>
                <Link href="/terms" className="inline-flex items-center gap-2 hover:text-[#c2255d]">
                  <span>利用規約</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="inline-flex items-center gap-2 hover:text-[#c2255d]">
                  <span>プライバシーポリシー</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">取引情報</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            以下の内容は特定商取引法第11条に基づいて掲載しています。必要に応じてメールにて詳細資料を共有します。
          </p>
          <dl className="mt-8 divide-y divide-gray-200 border-y border-gray-200 text-sm leading-6 text-gray-600">
            {commerceDetails.map((item) => (
              <div key={item.label} className="grid gap-4 py-5 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-gray-900">{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">お申し込みの流れ</p>
            <ol className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
              {purchaseFlow.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white text-xs font-semibold text-[#c2255d]">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">参考資料</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#c2255d]">
              {downloadableDocuments.map((doc) => (
                <li key={doc.href}>
                  <Link
                    href={doc.href}
                    className="inline-flex items-center gap-2 hover:text-[#a01d4d]"
                  >
                    <span>{doc.label}</span>
                    <span aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">連絡・サポート窓口</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            個人で対応しているため、返信まで1〜2営業日いただくことがあります。状況に応じて夜間・休日でも確認します。
          </p>
          <ul className="mt-6 space-y-2 text-sm leading-6 text-gray-600">
            <li>メール: support@retento.app</li>
            <li>お問い合わせフォーム: <Link href="/support/contact" className="font-semibold text-[#c2255d] hover:text-[#a01d4d]">お問い合わせページ</Link></li>
            <li>請求に関するご相談: 件名に「請求」とご記載ください。</li>
          </ul>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">書面の交付について</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            領収書や契約内容の写しが必要な場合はPDFでお送りします。郵送をご希望の場合は、宛名と送付先をご連絡ください。
          </p>
          <div className="mt-6">
            <Link href="mailto:support@retento.app" className="text-sm font-semibold text-[#c2255d] hover:text-[#a01d4d]">
              書面の送付を依頼する →
            </Link>
          </div>
          <div className="mt-6 text-xs text-gray-500">
            <a href="#top" className="hover:text-[#c2255d]">
              ページ上部へ戻る ↑
            </a>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
