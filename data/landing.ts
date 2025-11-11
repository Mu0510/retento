export const loginUrl =
  "https://manus.im/app-auth?appId=JaSyYjpqHW5rrvhiJ2bj3J&redirectUri=https%3A%2F%2Fretento.manus.space%2Fapi%2Foauth%2Fcallback&state=aHR0cHM6Ly9yZXRlbnVzLnNwYWNlL2FwaS9vYXV0aC9jYWxsYmFjaw%3D%3D&type=signIn";

export const heroCopy = {
  eyebrow: "科学と詩情が共鳴する学習体験",
  title: "Retentoが描く、記憶に寄り添う英単語の旅路",
  body:
    "忘却曲線・自信度スワイプ・非同期生成を組み合わせ、余白とタイポグラフィで静かな信頼を紡ぐLP。短いアニメーションとハイコントラストで、視覚的にも機能的にも説得力のある第一印象を提供します。",
  cta: "UX仕様書を確認",
  ctaUrl: "/docs/retento-ux-spec.md",
};

export const heroHighlights = [
  "5つのUXの柱による学習戦略",
  "非同期アーキテクチャで待ち時間ゼロ",
  "AIコーチング×科学的根拠のフィードバック",
];

export const pillars = [
  {
    title: "摩擦ゼロの学習フロー",
    detail:
      "起動と同時に問題カード。スワイプで再開・復習・短期を自然につなぐ、流れるような導線。",
  },
  {
    title: "高品質なAIコーチング",
    detail:
      "語源・類義語・記憶術を惜しみなく盛り込んだ解説により、理論的な確かさとAha体験を両立します。",
  },
  {
    title: "科学的根拠との融合",
    detail:
      "忘却曲線をベースに関連語をグルーピング。セッションは論理的に構築され、復習間隔は自信度と速度で補正。",
  },
  {
    title: "持続的モチベーション",
    detail:
      "ランクやオプトイン式ランキング、診断テストで自己成長の軌跡を可視化します。",
  },
  {
    title: "待ち時間ゼロのアーキテクチャ",
    detail:
      "AI解説を事前生成・セッションは非同期キューで準備。完了通知と文脈のある提示で、ユーザーの呼吸に合わせます。",
  },
];

export const flows = [
  {
    title: "問題表示",
    detail:
      "カードは文脈と下線訳を併記し、選択後すぐに正誤を色で提示。AI解説は即座に横に並びます。",
    meta: "起動直後に問題画面",
  },
  {
    title: "解説と自信度",
    detail:
      "AIの解説を読み、スワイプでマスター／通常／短期を残す。カードの傾きや薄文字で物理的な手応えを残します。",
    meta: "スワイプは上＝マスター、左＝短期",
  },
  {
    title: "次のセッション",
    detail:
      "回答と同時に非同期ジョブが次のセッションを構築。完了通知とタイムスタンプで待ち時間ゼロを体感。",
    meta: "非同期生成＋キュー",
  },
];

export const architecture = [
  {
    title: "AI解説の事前生成",
    detail:
      "語源・類義語・記憶術を先読みして保存。ユーザーは一瞬で豊かな解説に触れられます。",
  },
  {
    title: "セッション生成の非同期キュー",
    detail:
      "各セッション完了後に次をキューに投入。ワーカーが順に構築し、30セッションの在庫を維持。",
  },
  {
    title: "AI総合解説の非同期完了",
    detail:
      "10問目応答時に生成を開始し、AI解説が読み終わる頃には完了。タイムラグなしで信頼できる振り返りを提供。",
  },
];

export const supports = [
  {
    label: "UX仕様書（Markdown）",
    href: "/docs/retento-ux-spec.md",
  },
  {
    label: "ロードマップ・アクション",
    href: "/docs/retento-ux-spec.md",
  },
];
