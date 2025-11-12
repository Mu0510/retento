import Link from "next/link";

import { MarketingPageShell } from "@/components/layout/MarketingPageShell";

const privacySections = [
  {
    title: "第1条（基本方針）",
    paragraphs: [
      "Retentoは個人開発者が提供するサービスであり、個人情報の取り扱いにあたり関連する法令・ガイドラインを順守し、透明性の高い運用を行います。",
      "このプライバシーポリシーでは、取得する情報の種類と利用目的、保護体制について説明します。",
    ],
  },
  {
    title: "第2条（取得する情報）",
    paragraphs: [
      "本サービスでは、以下の情報を利用目的の達成に必要な範囲で取得します。",
    ],
    list: [
      "アカウント情報：メールアドレス、表示名、登録日時など",
      "学習データ：回答履歴、自信度、ノート、タグ等の学習コンテンツ",
      "利用状況：アクセスログ、端末情報、ブラウザ情報、Cookie識別子など",
      "お問い合わせ内容：サポートフォームに記載された要望や添付ファイル",
    ],
  },
  {
    title: "第3条（利用目的）",
    paragraphs: [
      "取得した情報は以下の目的で利用します。利用目的が変わる場合は事前に告知し、必要に応じて同意を再度取得します。",
    ],
    list: [
      "本サービスの提供、本人認証、契約の管理",
      "学習体験の改善、利用状況の分析、機能開発に関する参考",
      "障害対応やお問い合わせへの返信、重要なアップデートの通知",
      "不正利用の監視、セキュリティ対策および法令に基づく対応",
    ],
  },
  {
    title: "第4条（保管期間と削除）",
    paragraphs: [
      "利用目的が達成された情報は、必要な期間を経過した後に削除または匿名化します。",
      "退会が完了したアカウントについては、法令で定められた保存義務がない限り、30日以内にデータベースから削除します。",
    ],
  },
  {
    title: "第5条（第三者提供および委託）",
    paragraphs: [
      "法令で認められる場合やユーザーの同意がある場合を除き、個人情報を第三者へ提供しません。",
      "インフラ運用や分析のためにクラウドサービス（例：Vercel、Supabase、PostHog）へ処理を委託する場合がありますが、機密保持契約等を締結したうえで安全管理措置を講じます。",
    ],
  },
  {
    title: "第6条（Cookie等の利用）",
    paragraphs: [
      "利便性向上とアクセス解析のためCookieや類似技術を使用します。必須でないCookieは設定画面からいつでも無効にできます。",
      "Cookieを無効にすると一部機能が動作しない場合がありますが、サービスの核心機能に支障がないよう可能な限り配慮しています。",
    ],
  },
  {
    title: "第7条（安全管理措置）",
    paragraphs: [
      "個人開発体制ながら、アクセス権限の最小化、通信の暗号化、脆弱性診断ツールの活用など、技術的・組織的な安全管理措置を実施します。",
      "外部サービスの障害やセキュリティインシデントが発生した場合は、確認が取れ次第ステータスページまたはメールでお知らせします。",
    ],
  },
  {
    title: "第8条（国外でのデータ処理）",
    paragraphs: [
      "サーバーは主に国内もしくはEU圏内のデータセンターに配置されたクラウドサービスを利用しています。",
      "国外事業者を利用する場合でも、各国の法令を確認し、適切な契約条項と暗号化を用いて個人情報を保護します。",
    ],
  },
  {
    title: "第9条（未成年者のプライバシー）",
    paragraphs: [
      "未成年の方が利用する場合は、保護者または学校担当者の同意を得たうえでご登録ください。",
      "保護者からの開示・削除等の請求には、本人確認後速やかに対応します。",
    ],
  },
  {
    title: "第10条（ユーザーの権利）",
    paragraphs: [
      "ユーザーは、保有個人データの開示、訂正、利用停止、消去、データポータビリティを求める権利を有します。",
      "リクエストはアプリ内のプライバシー設定または下記のお問い合わせ先で受け付け、概ね7営業日以内に対応します。",
    ],
  },
  {
    title: "第11条（連絡先）",
    paragraphs: [
      "個人情報の取り扱いに関するお問い合わせは privacy@retento.app までご連絡ください。",
      "自宅兼事務所のため住所詳細は請求時に開示します。郵送での対応が必要な場合は事前にメールでご相談ください。",
    ],
  },
  {
    title: "第12条（ポリシーの改定）",
    paragraphs: [
      "サービス内容や法令の改正に応じて、本ポリシーを改定する場合があります。重要な変更はアプリ内通知またはメールでお知らせします。",
      "改定後に本サービスを利用した場合は、変更内容に同意したものとみなします。",
    ],
  },
];

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9faf]+/gi, "-")
    .replace(/^-+|-+$/g, "");

export default function PrivacyPage() {
  return (
    <MarketingPageShell>
      <section id="top" className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.35em] text-[#c2255d]">LEGAL</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">プライバシーポリシー</h1>
          <p className="mt-6 text-base leading-7 text-gray-600 sm:text-lg">
            個人で開発・運用しているRetentoが、みなさまのデータをどのように扱い、守っているかをご説明します。
            小規模な体制でも信頼いただけるよう、保管先や対応フローを明記しています。
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
                {privacySections.map((section) => {
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
              {privacySections.map((section) => {
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

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Cookie設定のサポート</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            設定 &gt; プライバシーから、解析用Cookieの許可・拒否をいつでも切り替えられます。変更内容は即時反映されます。
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            ブラウザ設定でCookieを完全にブロックした場合は、ログイン状態が保持されないことがあります。操作が不安なときはお気軽にお問い合わせください。
          </p>
          <div className="mt-6">
            <Link href="/support/contact" className="text-sm font-semibold text-[#c2255d] hover:text-[#a01d4d]">
              Cookie設定について相談する →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">お問い合わせ</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            データの開示請求や削除依頼は、開発者が責任を持って対応します。内容に応じて最大7営業日ほどお時間をいただく場合があります。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="mailto:privacy@retento.app"
              className="inline-flex items-center justify-center rounded-md bg-[#c2255d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a01d4d]"
            >
              メールで問い合わせる
            </Link>
            <Link
              href="/support/contact"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              お問い合わせフォームを開く
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
