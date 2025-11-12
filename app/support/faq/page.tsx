import Link from "next/link";

import { MarketingPageShell } from "@/components/layout/MarketingPageShell";

const faqSections = [
  {
    title: "アカウントとサブスクリプション",
    description:
      "プラン変更や請求、ログインに関するお問い合わせの中でも特に多い内容をまとめました。",
    items: [
      {
        question: "Q. プランの変更はいつでもできますか？",
        answer:
          "A. 月の途中でもお申し込みいただけます。現在のサイクルが終了したタイミングで新しいプランが適用されます。変更内容はStripeの領収書にも反映されます。",
      },
      {
        question: "Q. 請求履歴はどこから確認できますか？",
        answer:
          "A. 決済完了時に自動送信されるメールに領収書のリンクが記載されています。メールが見つからない場合は、登録メールアドレスからご連絡いただければ再送いたします。",
      },
      {
        question: "Q. ログイン用メールアドレスを変更したいです。",
        answer:
          "A. セキュリティ確保のため開発者が手動で対応しています。お問い合わせフォームから旧アドレスと新アドレスをご連絡ください。1〜2営業日以内に切り替えを完了します。",
      },
    ],
  },
  {
    title: "学習体験とコンテンツ",
    description:
      "学習の進め方やAIフィードバックの活用方法など、日々の使い方に関する質問です。",
    items: [
      {
        question: "Q. 復習タイミングはどのように決まりますか？",
        answer:
          "A. 自信度・回答時間・過去の復習結果をもとに個別の復習日を算出しています。調整したい場合はセッション画面の「復習間隔を微調整する」から設定を変更できます。",
      },
      {
        question: "Q. AI解説をまとめて見返す方法はありますか？",
        answer:
          "A. セッション完了後に表示されるレビュー画面で\"お気に入り\"を選択すると、ノートブックに自動保存されます。保存件数には上限がないため、復習にご活用ください。",
      },
      {
        question: "Q. 複数端末で学習してもデータは同期されますか？",
        answer:
          "A. 同じアカウントでログインしていればリアルタイムに同期されます。同期遅延が発生した際はアプリを再起動し、改善しない場合はサポートへご連絡ください。",
      },
    ],
  },
  {
    title: "不具合・要望の連絡",
    description:
      "トラブルが発生した際の一次対応や、改善リクエストに関する案内です。",
    items: [
      {
        question: "Q. エラーが出たときの確認ポイントは？",
        answer:
          "A. まずはブラウザのリロード、キャッシュ削除、ネットワークの再接続をお試しください。それでも解決しない場合はエラー画面のスクリーンショットを添えてご連絡いただけると助かります。",
      },
      {
        question: "Q. 障害情報はどこで確認できますか？",
        answer:
          "A. 大きな障害が発生した場合はアプリ内バナーとXアカウント（@retento_app）でお知らせします。個別の進捗はメールで共有します。",
      },
      {
        question: "Q. 新機能の提案や改善要望を送りたいです。",
        answer:
          "A. お問い合わせフォームから送信してください。個人開発のため時間はかかりますが、リクエストはすべて確認し、対応予定が決まり次第お知らせします。",
      },
    ],
  },
];

const supportShortcuts = [
  {
    label: "ヘルプセンター",
    href: "/support/help-center",
    description: "操作ガイドやチュートリアルはこちら",
  },
  {
    label: "お問い合わせ",
    href: "/support/contact",
    description: "個別のご相談や不具合報告",
  },
  {
    label: "アップデートノート",
    href: "/docs/retento-ux-spec.md",
    description: "最近の改善内容を確認",
  },
];

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9faf]+/gi, "-")
    .replace(/^-+|-+$/g, "");

export default function SupportFaqPage() {
  return (
    <MarketingPageShell>
      <section id="top" className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.35em] text-[#c2255d]">
            SUPPORT DESK
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            よくある質問
          </h1>
          <p className="mt-6 text-base leading-7 text-gray-600 sm:text-lg">
            Retentoを一人で開発・運用しているため、よくいただく質問をカテゴリ別に整理しました。
            お困りごとはまずこちらから確認いただき、解決しない場合はお問い合わせフォームへご連絡ください。
          </p>
          <div className="mt-8 flex flex-col gap-4">
            <form
              role="search"
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center"
              onSubmit={(event) => event.preventDefault()}
            >
              <label htmlFor="faq-search" className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                キーワードで探す
              </label>
              <input
                id="faq-search"
                type="search"
                inputMode="search"
                placeholder="例: プラン変更、復習、エラー"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#c2255d] focus:outline-none focus:ring-2 focus:ring-[#f3d0dc]"
              />
            </form>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">ショートカット</p>
              <ul className="mt-3 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
                {supportShortcuts.map((shortcut) => {
                  const isExternal = shortcut.href.startsWith("http");
                  return (
                    <li key={shortcut.href}>
                      <Link
                        href={shortcut.href}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        className="group block rounded-lg border border-gray-200 bg-white px-3 py-3 transition hover:border-[#c2255d] hover:bg-[#fff7fb]"
                      >
                        <p className="font-semibold text-gray-900 group-hover:text-[#c2255d]">{shortcut.label}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{shortcut.description}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <nav aria-label="FAQカテゴリ一覧" className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">カテゴリにジャンプ</p>
              <ul className="mt-3 flex flex-wrap gap-3 text-sm text-[#c2255d]">
                {faqSections.map((section) => {
                  const id = slugify(section.title);
                  return (
                    <li key={section.title}>
                      <a href={`#${id}`} className="inline-flex items-center gap-1 rounded-full bg-[#fce8f0] px-3 py-1 hover:bg-[#f8d0df]">
                        <span>{section.title}</span>
                        <span aria-hidden>↗</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <p className="text-xs leading-5 text-gray-500">最終更新日: 2025年4月12日</p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-semibold text-gray-700">カテゴリ一覧</p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            回答は順次更新しています。最新情報が反映された項目には記事内で更新日を明記しています。
          </p>
          <div className="mt-10 space-y-12">
            {faqSections.map((section) => {
              const id = slugify(section.title);
              return (
                <article key={section.title} id={id}>
                  <header>
                    <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                      {section.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{section.description}</p>
                  </header>
                  <dl className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
                    {section.items.map((item) => (
                      <div key={item.question} className="py-6">
                        <dt className="text-sm font-semibold text-gray-800">{item.question}</dt>
                        <dd className="mt-2 text-sm leading-6 text-gray-600">{item.answer}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-6 text-right text-xs">
                    <a href="#top" className="text-gray-500 hover:text-[#c2255d]">
                      ページ上部へ戻る ↑
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            解決しない場合はお問い合わせへ
          </h2>
          <p className="mt-4 text-sm leading-6 text-gray-600">
            メールでの返信は平日を中心に1〜2営業日以内を目安としています。緊急の場合は件名に【緊急】と記載していただけると優先して確認します。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/support/contact"
              className="inline-flex items-center justify-center rounded-md bg-[#c2255d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a01d4d]"
            >
              サポートに問い合わせる
            </Link>
            <Link
              href="/support/help-center"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-white"
            >
              ヘルプセンターで調べる
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
