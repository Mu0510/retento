import Link from "next/link";

import { MarketingPageShell } from "@/components/layout/MarketingPageShell";

const termsSections = [
  {
    title: "第1条（目的および適用範囲）",
    paragraphs: [
      "本規約は、個人開発者が運営する学習支援サービス「Retento」（以下「本サービス」といいます）の利用条件を定めるものです。",
      "本サービスを利用するすべての方（以下「ユーザー」といいます）は、本規約の全文を確認したうえで利用するものとし、未成年のユーザーは保護者の同意を得てください。",
    ],
  },
  {
    title: "第2条（定義）",
    paragraphs: [
      "本規約における主な用語の定義は次のとおりです。",
    ],
    list: [
      "「開発者」：本サービスを企画・開発・運用する個人事業主",
      "「アカウント」：本サービスを利用するためにユーザーが登録した認証情報",
      "「学習データ」：ユーザーが本サービスを通じて入力した回答、学習履歴、メモ等の情報",
    ],
  },
  {
    title: "第3条（契約の成立および期間）",
    paragraphs: [
      "ユーザーが所定の登録手続を完了し、開発者がこれを承認した時点で利用契約が成立します。",
      "有料プランは申込時に表示される期間を契約期間とし、ユーザーが解約手続きを完了しない限り同一条件で更新されます。",
    ],
  },
  {
    title: "第4条（アカウントの管理）",
    paragraphs: [
      "ユーザーはアカウント情報を厳重に管理し、第三者に利用させてはなりません。パスワード漏えいが判明した場合は速やかに開発者へ連絡してください。",
      "セキュリティ保全のため、長期間利用がないアカウントや不正利用が疑われるアカウントを一時停止または削除する場合があります。",
    ],
  },
  {
    title: "第5条（料金および支払い）",
    paragraphs: [
      "本サービスの料金はウェブサイトに掲載する金額とし、表示価格は税込です。",
      "Stripe等の決済代行サービスを通じてお支払いいただきます。決済に失敗した場合は通知後7日以内に再決済をお願いすることがあります。",
    ],
  },
  {
    title: "第6条（知的財産権）",
    paragraphs: [
      "本サービスに含まれるプログラム、文章、画像、ロゴ等に関する知的財産権は開発者または正当な権利者に帰属します。",
      "ユーザーが生成した学習データはユーザーに帰属しますが、個人を特定できない形で機能改善に利用する場合があります。",
    ],
  },
  {
    title: "第7条（禁止事項）",
    paragraphs: [
      "ユーザーは以下の行為を行ってはなりません。",
    ],
    list: [
      "法令または公序良俗に違反する行為",
      "本サービスやサーバーに過度な負荷を与える行為",
      "本サービスのソースコード解析やリバースエンジニアリングを目的とした行為",
      "開発者または第三者の権利を侵害する情報の投稿、頒布、再販売",
    ],
  },
  {
    title: "第8条（サービスの提供、変更、中断）",
    paragraphs: [
      "開発者は機能追加や品質向上のために本サービスの内容を随時変更できます。重要な変更はアプリ内通知や公式ブログでお知らせします。",
      "サーバーメンテナンス、災害、通信障害その他やむを得ない事由により、本サービスの提供を一時的に停止することがあります。",
    ],
  },
  {
    title: "第9条（保証の否認）",
    paragraphs: [
      "本サービスは現状有姿で提供され、特定の目的への適合性、完全性、継続性について開発者は保証しません。",
      "ユーザー同士またはユーザーと第三者の間で生じたトラブルについて、開発者に故意または重過失がない限り責任を負いません。",
    ],
  },
  {
    title: "第10条（責任の制限）",
    paragraphs: [
      "開発者がユーザーに損害賠償責任を負う場合、その責任額は過去12か月間にユーザーが支払った利用料金の総額を上限とします。ただし、開発者の故意または重過失による場合はこの限りではありません。",
    ],
  },
  {
    title: "第11条（損害賠償）",
    paragraphs: [
      "ユーザーが本規約に違反し開発者に損害を与えた場合、ユーザーは直接・間接を問わず一切の損害を賠償するものとします。",
      "第三者からの請求がユーザーの行為に起因する場合、当該請求をユーザーの責任と費用で解決し、開発者に損害が生じたときは補償するものとします。",
    ],
  },
  {
    title: "第12条（契約の解除および退会）",
    paragraphs: [
      "ユーザーは設定画面またはお問い合わせによりいつでも退会できます。退会後も既に発生した料金の支払い義務は残ります。",
      "ユーザーが本規約に違反した場合、開発者は催告のうえ利用契約を解除し、必要に応じてアカウントを削除できます。",
    ],
  },
  {
    title: "第13条（個人開発体制について）",
    paragraphs: [
      "本サービスは個人で開発・運用しているため、問い合わせへの回答や機能改善に時間を要する場合があります。",
      "緊急対応が必要な障害については最優先で復旧しますが、即時の代替手段を提供できない可能性があります。",
    ],
  },
  {
    title: "第14条（準拠法および裁判管轄）",
    paragraphs: [
      "本規約は日本法を準拠法とします。本サービスに関連して紛争が生じた場合、開発者の住所地を管轄する簡易裁判所または地方裁判所を第一審の専属的合意管轄裁判所とします。",
    ],
  },
  {
    title: "第15条（規約の改定）",
    paragraphs: [
      "開発者は必要に応じて本規約を改定できます。改定内容はウェブサイトやアプリ内で事前告知し、告知時に定める効力発生日から適用します。",
      "改定後も本サービスを継続利用する場合、ユーザーは変更内容に同意したものとみなします。",
    ],
  },
];

const updateHistory = [
  {
    date: "2025年4月12日",
    summary: "個人開発体制に関する条項を追加し、支払い方法の説明を見直しました。",
  },
  {
    date: "2024年12月1日",
    summary: "退会手続きと責任制限に関する表現を明確化しました。",
  },
  {
    date: "2024年8月15日",
    summary: "学習データの取り扱いに関する定義を追加しました。",
  },
];

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9faf]+/gi, "-")
    .replace(/^-+|-+$/g, "");

export default function TermsPage() {
  return (
    <MarketingPageShell>
      <section id="top" className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.35em] text-[#c2255d]">LEGAL</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">利用規約</h1>
          <p className="mt-6 text-base leading-7 text-gray-600 sm:text-lg">
            Retentoをご利用いただく際のルールと、お互いに安心してサービスを使い続けるための約束事をまとめています。
            個人開発ならではの運用体制についても記載していますので、ご利用前にご確認ください。
          </p>
          <p className="mt-4 text-xs leading-5 text-gray-500">最終更新日: 2025年4月12日</p>
          <nav className="mt-8 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">関連ドキュメント</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              <li>
                <Link href="/privacy" className="inline-flex items-center gap-2 hover:text-[#c2255d]">
                  <span>プライバシーポリシー</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
              <li>
                <Link href="/legal/commerce" className="inline-flex items-center gap-2 hover:text-[#c2255d]">
                  <span>特定商取引法に基づく表記</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-12">
            <aside className="self-start mb-10 md:sticky md:top-32 md:mb-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">目次</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
                {termsSections.map((section) => {
                  const id = slugify(section.title);
                  return (
                    <li key={section.title}>
                      <a href={`#${id}`} className="hover:text-[#c2255d]">
                        {section.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </aside>
            <div className="space-y-12">
              {termsSections.map((section) => {
                const id = slugify(section.title);
                return (
                  <article key={section.title} id={id} className="space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{section.title}</h2>
                    <div className="space-y-3 text-sm leading-6 text-gray-600">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {section.list ? (
                        <ul className="list-disc space-y-2 pl-5">
                          {section.list.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="text-right text-xs">
                      <a href="#top" className="text-gray-500 hover:text-[#c2255d]">
                        ページ上部へ戻る ↑
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">改定履歴</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            主な変更点は以下のとおりです。細かな差分はお問い合わせいただければ最新版のPDFを共有します。
          </p>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-gray-600">
            {updateHistory.map((entry) => (
              <li key={entry.date} className="border-l-2 border-[#c2255d] pl-4">
                <p className="font-semibold text-gray-900">{entry.date}</p>
                <p className="mt-1">{entry.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">お問い合わせ</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            規約に関するご質問は開発者が直接お答えします。個別の契約条件や学習データの取り扱いについてもお気軽にご相談ください。
            返信まで最大2営業日ほどお時間をいただく場合があります。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/support/contact"
              className="inline-flex items-center justify-center rounded-md bg-[#c2255d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a01d4d]"
            >
              サポートへ問い合わせる
            </Link>
            <Link
              href="/support/faq"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              よくある質問を見る
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
