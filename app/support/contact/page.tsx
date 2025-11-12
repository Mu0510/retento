import Link from "next/link";

import { EmergencyContactLink } from "@/components/support/EmergencyContactLink";
import { MarketingPageShell } from "@/components/layout/MarketingPageShell";

const contactChannels = [
  {
    title: "メールサポート",
    detail: "support@retento.app",
    description: "もっとも確実な連絡手段です。受信後24時間以内に一次返信を目指しています。",
    cta: "メールアプリを開く",
    href: "mailto:support@retento.app",
  },
  {
    title: "お問い合わせテンプレート",
    detail: "ひな形を使って情報を整理",
    description: "下記のテンプレートに沿って内容をまとめると、確認と返信がスムーズになります。",
    cta: "テンプレートを確認",
    href: "#template",
  },
  {
    title: "X (旧Twitter)",
    detail: "@retento_app",
    description: "障害時のお知らせをポストしています。緊急連絡はDMでも受け付けています。",
    cta: "Xで確認する",
    href: "https://x.com/retento_app",
  },
];

const responseGuidelines = [
  {
    title: "通常のお問い合わせ",
    items: [
      "平日 10:00〜19:00 に順次対応",
      "24時間以内の一次返信を目標",
      "内容に応じて解決策や今後の予定を共有",
    ],
  },
  {
    title: "緊急の不具合",
    items: [
      "受信しだい優先的に調査",
      "状況をXとメールで随時共有",
      "暫定対処と復旧見込みを連絡",
    ],
  },
];

const preparationChecklist = [
  "利用しているデバイス・OS・ブラウザのバージョン",
  "発生手順と画面に表示されたメッセージ",
  "問題が起きた日時と期待していた動作",
];

const contactFaq = [
  {
    question: "営業時間外はどうすればよいですか？",
    answer:
      "フォームまたはメールでご連絡ください。確認でき次第返信します。夜間や休日はレスが遅れる場合がありますが、緊急の際は件名に【緊急】とご記載ください。",
  },
  {
    question: "請求に関する問い合わせ先は？",
    answer:
      "支払い関連も support@retento.app で受け付けています。決済に使用したメールアドレスと請求書番号が分かれば合わせてお知らせください。",
  },
  {
    question: "学習データの削除依頼はどこから行えますか？",
    answer:
      "プライバシー関連のご依頼は privacy@retento.app へメールをお願いいたします。本人確認のため、登録メールアドレスからのご連絡にご協力ください。",
  },
];

export default function SupportContactPage() {
  return (
    <MarketingPageShell>
      <section id="top" className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.35em] text-[#c2255d]">
            CONTACT
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            お問い合わせ
          </h1>
          <p className="mt-6 text-base leading-7 text-gray-600 sm:text-lg">
            Retentoは個人開発のプロジェクトです。ご連絡をいただくと開発者が直接状況を確認し、順次対応いたします。
            返信まで少しお時間をいただくことがありますが、なるべく早く解決に向けてフォローします。
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">対応時間</dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">平日 10:00 - 19:00</dd>
              <dd className="text-xs text-gray-500">夜間・休日は確認が遅れる場合があります</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">平均一次返信</dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">約 24 時間以内</dd>
              <dd className="text-xs text-gray-500">内容により前後する可能性があります</dd>
            </div>
          </dl>
          <div className="mt-10 rounded-lg border border-[#f5c5d7] bg-[#fff7fb] p-5 text-sm leading-6 text-[#5f1a33]">
            <p className="font-semibold">緊急時のご連絡について</p>
            <p className="mt-2">
              学習が停止している、アクセスできないなどの緊急事態は、メールの件名に【緊急】と記載するか、
              <EmergencyContactLink
                href="https://x.com/retento_app"
                className="ml-1 underline decoration-[#c2255d] underline-offset-4"
              >
                Xアカウント
              </EmergencyContactLink>
              へDMをお送りください。受信し次第優先的に確認します。
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">お問い合わせチャネル</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            状況に合わせて連絡しやすい窓口をお選びください。メールまたはフォームからご連絡いただくと記録が残るためおすすめです。
          </p>
          <dl className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
            {contactChannels.map((channel) => (
              <div key={channel.title} className="py-6">
                <dt className="text-base font-semibold text-gray-900">{channel.title}</dt>
                <dd className="mt-1 text-sm text-gray-500">{channel.detail}</dd>
                <dd className="mt-3 text-sm leading-6 text-gray-600">{channel.description}</dd>
                <dd className="mt-3">
                  <Link href={channel.href} className="text-sm font-semibold text-[#c2255d] hover:text-[#a01d4d]">
                    {channel.cta} →
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">対応の目安</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            ひとりで運用しているため、優先度に応じて順番にご案内しています。下記を目安にお待ちください。
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {responseGuidelines.map((plan) => (
              <div key={plan.title} className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">{plan.title}</p>
                <ul className="space-y-2 text-xs leading-5 text-gray-600">
                  {plan.items.map((item) => (
                    <li key={item} className="list-disc pl-4">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="template" className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">スムーズな対応のために</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            下記の情報をご準備いただくと調査がはかどります。可能な範囲で構いませんので、わかる項目をお知らせください。
          </p>
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">ご準備いただきたい情報</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
              {preparationChecklist.map((item) => (
                <li key={item} className="list-disc pl-5">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 text-xs leading-5 text-gray-500">
            オンライン通話によるサポートが必要な場合は、ご希望の日時をいくつかお知らせください。日程調整のうえ、ミーティングリンクをお送りします。
          </p>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">お問い合わせに関するよくある質問</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            下記はお問い合わせ前によく寄せられる質問です。該当する項目があれば、事前にご確認ください。
          </p>
          <dl className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
            {contactFaq.map((item) => (
              <div key={item.question} className="py-5">
                <dt className="text-sm font-semibold text-gray-900">{item.question}</dt>
                <dd className="mt-2 text-sm leading-6 text-gray-600">{item.answer}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 text-right text-xs">
            <a href="#top" className="text-gray-500 hover:text-[#c2255d]">
              ページ上部へ戻る ↑
            </a>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
