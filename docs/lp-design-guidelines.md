# Retento LPデザインルール

Landing Page（LP）のデザインをテンプレートとして再利用するための共通ルールをまとめる。全体的なトーンは「落ち着いたプロフェッショナルさ」と「UX中心のやわらかさ」を両立させるライトテーマで統一する。

## レイアウトとグリッド
- ビューポート横幅の90%をベース幅とし、最大幅は1600pxに制限する。余白は左右16px/24px/32px（モバイル/タブレット/デスクトップ）を基準にする。スクロール面で `mx-auto w-[90vw] max-w-[1600px] px-4 sm:px-6 lg:px-8` を共有する。 【F:app/page.tsx†L270-L308】【F:components/layout/SiteHeader.tsx†L105-L159】【F:components/layout/SiteFooter.tsx†L41-L78】
- セクションの垂直リズムは `pt-16 sm:pt-20 pb-16 sm:pb-24` を基本とし、背景グラデーションやグリッドでレイヤーを作る。 【F:app/page.tsx†L270-L310】
- ファーストビューは左右2カラム、情報セクションは3カラム以上のレスポンシブグリッドで組む。カードや統計は `grid lg:grid-cols-2 gap-12 lg:gap-16` などで余白を広く取る。 【F:app/page.tsx†L290-L350】【F:app/page.tsx†L520-L640】

## カラーパレット
- ベース背景は `#fdfdfd` とホワイト。セクションやカードの背景に `bg-white`, `bg-gray-50`, `bg-gradient-to-b from-gray-50/50 to-white` を組み合わせて軽さを出す。 【F:app/layout.tsx†L22-L25】【F:app/page.tsx†L273-L310】
- アクセントカラーは `#c2255d`（ホバー時は `#a01d4d`）をボタン、下線、プログレスバーに限定使用し、広い面には使わない。 【F:app/page.tsx†L310-L340】【F:app/page.tsx†L660-L708】
- ニュートラルは `text-gray-600`〜`text-gray-900`、境界線は `border-gray-100/200` を用いて静かなコントラストを保つ。 【F:components/layout/SiteHeader.tsx†L111-L196】【F:components/layout/SiteFooter.tsx†L49-L78】

## タイポグラフィ
- フォントは `Inter` を採用し、`--font-inter` をbodyに適用する。 【F:app/layout.tsx†L5-L25】
- 見出しは `text-4xl` 以上を基準に、`tracking-tight` と広めの余白をつけて視線誘導を行う。本文は `text-lg text-gray-600` を基本とし、行間は `leading-relaxed` などで余裕を確保する。 【F:app/page.tsx†L300-L340】【F:app/page.tsx†L360-L420】
- サブ情報やラベルは `text-sm` や `text-xs` を使用し、モノトーンのコントラストで階層化する。 【F:components/layout/SiteHeader.tsx†L134-L187】【F:components/layout/SiteFooter.tsx†L61-L78】

## コンポーネント指針
### グローバルヘッダー
- 固定配置・半透明背景（`bg-white/95`）・`backdrop-blur` で視認性を担保しつつ軽さを演出する。ナビゲーションは最大1600px幅のコンテナに収める。 【F:components/layout/SiteHeader.tsx†L93-L164】
- アカウントメニューは丸型アバターとソフトシャドウ。ドロップダウンは丸み16pxのカードで、ラベル＋説明文の2ライン構成。 【F:components/layout/SiteHeader.tsx†L135-L190】
- モバイルではドロワー風のフル幅メニューとし、同じナビゲーション項目・CTAを提供する。 【F:components/layout/SiteHeader.tsx†L197-L268】

### フッター
- 上段で4カラムの情報ブロック、下段でコピーライトを中心揃えで表示する。背景は `bg-gray-50`、枠線は `border-gray-100`。リンクはホバーで濃いグレーに変化させる。 【F:components/layout/SiteFooter.tsx†L41-L78】
- プロダクトナビはヘッダーと同一項目を共有し、スクロールでセクションにスムーズに移動できるよう `onClick` を許容する。 【F:components/layout/SiteFooter.tsx†L15-L31】【F:app/page.tsx†L246-L266】

### ボタン
- プライマリーボタンはアクセントカラーの塗りつぶし＋ホバー時の彩度調整。セカンダリは `variant="outline"` を基準に白地のまま境界線で差別化する。`size="lg"` をヒーローCTAに使い、角丸は `rounded-full` ではなく標準のボタンスタイルを踏襲する。 【F:app/page.tsx†L310-L340】【F:components/layout/SiteHeader.tsx†L149-L166】

### カードとバッジ
- カードは `Card` コンポーネントに `shadow-xl` や `border-0` を重ね、背景に淡いグラデーションを敷く。内容領域は `p-8` でゆったり配置し、内側のサブカードには薄い境界線を使う。 【F:app/page.tsx†L332-L360】【F:app/page.tsx†L520-L640】
- バッジは `Badge` の `variant="secondary"` を使い、灰色トーンでサブ情報を提示する。 【F:app/page.tsx†L304-L310】

## モーション
- `motion` コンポーネントを使い、フェード＋スライド（`opacity`, `y`）を0.6秒程度で適用。重要セクションには `whileInView` を組み合わせ、スクロールに応じた穏やかなアニメーションを行う。 【F:app/page.tsx†L284-L316】【F:app/page.tsx†L460-L540】
- ヘッダーの透過度はスクロール量に応じて `useScroll` と `useTransform` で制御し、常にわずかな透明感を維持する。 【F:app/page.tsx†L244-L254】

## アイコンとビジュアル
- アイコンは `lucide-react` を採用し、線幅を統一。アクセント用途ではなく情報補強として使用し、色は基本的にグレー。 【F:app/page.tsx†L10-L24】【F:app/page.tsx†L450-L520】
- 画像は `ImageWithFallback` を通して読み込み、角丸やシャドウで軽さを出す。ユーザーアバターは丸型にトリムし、フォールバックは頭文字を表示する。 【F:components/layout/SiteHeader.tsx†L140-L158】【F:app/page.tsx†L600-L656】

## その他のインタラクション
- モバイルでのスクロール補助としてカスタムスクロールバーを実装し、ドラッグ操作時のみ濃度が上がる。テンプレートを流用する際も、縦長ページでは同様のUXを検討する。 【F:app/page.tsx†L930-L982】
- CTAやナビゲーションはすべて `router.push` またはスムーススクロールで即時に遷移し、余計なモーダルや中間画面を挟まない。 【F:app/page.tsx†L246-L266】【F:components/layout/SiteHeader.tsx†L174-L215】

これらのルールを守ることで、Retentoの全ページに一貫したビジュアルと言語体験をもたらし、LPで確立した洗練されたUXを横展開できる。
