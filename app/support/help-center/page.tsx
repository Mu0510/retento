import Link from "next/link";

import { MarketingPageShell } from "@/components/layout/MarketingPageShell";
import { SupportSearchForm } from "@/components/support/SupportSearchForm";

const helpCategories = [
  {
    title: "はじめてのセットアップ",
    description: "アカウント登録から初回セッション開始までの流れを案内します。",
    highlights: [
      "アプリのインストールとログイン手順",
      "学習レベル診断の受け方",
      "デバイス間同期のチェックポイント",
    ],
    href: "/docs/retento-ux-spec.md",
  },
  {
    title: "学習サイクルを整える",
    description: "復習通知やAI解説を活用して学習を習慣化するためのヒントです。",
    highlights: [
      "復習キューと通知タイミングの調整",
      "AIフィードバックの読み解き方",
      "苦手単語タグの活用術",
    ],
    href: "/support/faq",
  },
  {
    title: "トラブルシューティング",
    description: "同期不具合や表示崩れなど、よくあるトラブルの一次対応をまとめています。",
    highlights: [
      "ログインエラーの確認項目",
      "スマートフォンで動作が重い場合",
      "お問い合わせ時に共有いただきたい情報",
    ],
    href: "/support/contact",
  },
];

const resourceLinks = [
  {
    title: "スタートガイド（PDF）",
    body: "基本操作を10ページにまとめた簡易マニュアルです。初回オンボーディング時にご活用ください。",
    href: "/docs/retento-ux-spec.md",
  },
  {
    title: "更新履歴",
    body: "最近追加した機能や改善の概要を一覧で確認できます。",
    href: "/docs/retento-ux-spec.md#changelog",
  },
  {
    title: "お問い合わせ手順",
    body: "不具合報告時に添えていただきたい情報やスクリーンショットの撮り方を解説しています。",
    href: "/support/contact",
  },
];

const popularArticles = [
  {
    title: "初回オンボーディングを10分で終わらせるチェックリスト",
    href: "/docs/retento-ux-spec.md#onboarding",
  },
  {
    title: "通知の頻度をライフスタイルに合わせて調整する",
    href: "/support/faq#学習体験とコンテンツ",
  },
  {
    title: "エラー発生時のセルフチェック手順",
    href: "/support/faq#不具合・要望の連絡",
  },
];

const selfServiceSteps = [
  "検索バーでキーワードを入力し、該当する記事を確認します。",
  "記事内の関連リンクから追加情報を参照します。",
  "解決しない場合はお問い合わせフォームから詳細をお知らせください。",
];

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9faf]+/gi, "-")
    .replace(/^-+|-+$/g, "");

export default function SupportHelpCenterPage() {
  return (
    <MarketingPageShell>
      <section id="top" className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.35em] text-[#c2255d]">
            HELP CENTER
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            ヘルプセンター
          </h1>
          <p className="mt-6 text-base leading-7 text-gray-600 sm:text-lg">
            小さな開発体制でも必要な情報にたどり着けるよう、操作ガイドとセルフチェックの手順をまとめています。
            気になるトピックは下記のカテゴリから選び、詳細記事へアクセスしてください。
          </p>
          <div className="mt-8 space-y-6">
            <SupportSearchForm
              inputId="help-search"
              label="記事を検索"
              placeholder="キーワード例: 復習、同期、エラー"
            />
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="rounded-full bg-gray-100 px-3 py-1">更新頻度: 月1回</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">記事数: 24 本</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">推定読了時間: 3〜4分</span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">よく読まれている記事</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#c2255d]">
                {popularArticles.map((article) => (
                  <li key={article.href}>
                    <Link
                      href={article.href}
                      className="inline-flex items-center gap-2 hover:text-[#a01d4d]"
                    >
                      <span>{article.title}</span>
                      <span aria-hidden>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <nav aria-label="ヘルプカテゴリ一覧" className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">カテゴリにジャンプ</p>
              <ul className="mt-3 flex flex-wrap gap-3 text-sm text-[#c2255d]">
                {helpCategories.map((category) => {
                  const id = slugify(category.title);
                  return (
                    <li key={category.title}>
                      <a href={`#${id}`} className="inline-flex items-center gap-1 rounded-full bg-[#fce8f0] px-3 py-1 hover:bg-[#f8d0df]">
                        <span>{category.title}</span>
                        <span aria-hidden>↗</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">カテゴリから探す</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            目的に近いカテゴリを選び、サマリーを確認してから詳細記事を開いてください。内容は順次更新しています。
          </p>
          <div className="mt-8 space-y-10">
            {helpCategories.map((category) => {
              const id = slugify(category.title);
              return (
                <article key={category.title} id={id}>
                  <header className="border-l-4 border-[#c2255d] pl-4">
                    <h3 className="text-xl font-semibold text-gray-900">{category.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{category.description}</p>
                  </header>
                  <ul className="mt-4 space-y-2 pl-4 text-sm leading-6 text-gray-600">
                    {category.highlights.map((highlight) => (
                      <li key={highlight} className="list-disc">
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    <Link href={category.href} className="text-sm font-semibold text-[#c2255d] hover:text-[#a01d4d]">
                      記事一覧を見る →
                    </Link>
                  </div>
                  <div className="mt-4 text-right text-xs">
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
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">おすすめリソース</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            個人での運用でも迷わず使えるよう、簡潔な資料とサポート手順を用意しています。
          </p>
          <ul className="mt-8 space-y-6">
            {resourceLinks.map((resource) => (
              <li key={resource.title} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{resource.title}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{resource.body}</p>
                  </div>
                  <Link href={resource.href} className="text-sm font-semibold text-[#c2255d] hover:text-[#a01d4d]">
                    詳細を見る
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">サポートへの連絡</h2>
          <p className="mt-4 text-sm leading-6 text-gray-600">
            記事で解決しない場合は、開発者が直接対応します。スクリーンショットや再現手順を添えていただけるとスムーズです。
          </p>
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">セルフサポートの流れ</p>
            <ol className="mt-3 space-y-3 text-sm leading-6 text-gray-600">
              {selfServiceSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white text-xs font-semibold text-[#c2255d]">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/support/contact"
              className="inline-flex items-center justify-center rounded-md bg-[#c2255d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a01d4d]"
            >
              お問い合わせフォームへ
            </Link>
            <Link
              href="/support/faq"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              よくある質問を見る
            </Link>
          </div>
          <p className="mt-6 text-xs leading-5 text-gray-500">
            平日の夜間帯に対応することが多いため、内容によっては返信まで最大48時間ほどお時間をいただきます。障害発生時はXアカウントで状況を随時共有します。
          </p>
        </div>
      </section>
    </MarketingPageShell>
  );
}
