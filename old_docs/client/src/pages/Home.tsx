import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_TITLE, getLoginUrl } from "@/const";
import { ChevronRight, Target, Palette, Code, Zap, Brain, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  
  // 初回テスト完了状況を確認
  const { data: testStatus } = trpc.initialTest.checkStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Retento</h1>
            <p className="text-xs text-muted-foreground">大学受験向け英単語学習アプリ</p>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/app">
                <Button variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  アプリを開く
                </Button>
              </Link>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <Button variant="outline" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    ログイン
                  </Button>
                </a>
                <a href={getLoginUrl()}>
                  <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <UserPlus className="w-4 h-4" />
                    登録
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 初回テストバナー */}
      {isAuthenticated && testStatus && !testStatus.completed && (
        <div className="border-b border-border bg-accent/5">
          <div className="container py-4">
            <Alert className="border-accent/20">
              <AlertCircle className="h-4 w-4 text-accent" />
              <AlertTitle className="text-accent">初回レベルテストを受けてください</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm text-muted-foreground mb-3">
                  あなたの現在の単語力を測定し、最適な学習プランを作成します。テストは30問、約10分程度で完了します。
                </p>
                <Link href="/initial-test">
                  <Button variant="default" className="gap-2">
                    <Target className="w-4 h-4" />
                    初回テストを始める
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* ヒーローセクション */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Target className="w-4 h-4" />
              プロジェクト概要
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              科学とAIが融合した<br />次世代の英単語学習体験
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Retentoは、忘却曲線に基づく復習システムとAIによるパーソナライズを組み合わせ、大学受験生に最適化された英単語学習アプリです。このドキュメントでは、プロジェクトのコンセプト、UX設計、そして開発ロードマップを包括的に整理しています。
            </p>
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4">
                <a href={getLoginUrl()}>
                  <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8">
                    無料で始める
                  </Button>
                </a>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" asChild>
                  <a href="#concept">詳しく見る</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* コアコンセプト */}
      <section id="concept" className="py-16 bg-secondary/30">
        <div className="container">
          <h3 className="text-3xl font-bold text-foreground mb-12">コアコンセプト</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <ConceptCard
              icon={<Brain className="w-6 h-6" />}
              title="科学的根拠"
              description="忘却曲線に基づく間隔反復学習により、記憶の定着を最大化します。回答速度や自信度も考慮した高度なアルゴリズムで、最適なタイミングで復習を提示します。"
            />
            <ConceptCard
              icon={<Zap className="w-6 h-6" />}
              title="AIパーソナライゼーション"
              description="各単語の語源、類義語比較、記憶術など、学習に資するクリティカルな情報をAIが生成。テーマ別セッションにより、関連単語をまとめて学習し、深い理解を促進します。"
            />
            <ConceptCard
              icon={<Palette className="w-6 h-6" />}
              title="卓越したUX"
              description="モダンで洗練されたミニマルデザイン。スワイプ操作による直感的な自信度入力、待ち時間ゼロの学習フロー、そしてモチベーションを維持するランク・ランキングシステム。"
            />
          </div>
        </div>
      </section>

      {/* UX設計の詳細 */}
      <section className="py-16">
        <div className="container">
          <h3 className="text-3xl font-bold text-foreground mb-12">UX設計の核心</h3>
          
          <div className="space-y-12">
            {/* 問題画面 */}
            <UXDetailCard
              title="問題画面：学習への抵抗感をゼロに"
              description="アプリを開いた瞬間から学習が始まる。メニューを経由せず、即座に問題が表示されるデフォルト設計。スマホでは縦積み、PCでは左右分割レイアウトで、デバイスに最適化された体験を提供します。"
              features={[
                "下線部の英単語の意味を問う4択問題",
                "モノトーン基調に、アクセントカラー（#c2255d）を効果的に使用",
                "プログレスバーで進捗を可視化",
              ]}
            />

            {/* フィードバック画面 */}
            <UXDetailCard
              title="フィードバック画面：色で示す、静かな正誤判定"
              description="回答後、選択肢の背景色が薄い緑（正解）または薄い赤（不正解）に変化。○や✕といった記号、派手なアニメーションは一切使わず、洗練された静的なフィードバックで学習のテンポを維持します。"
              features={[
                "問題（左/上）とフィードバック（右/下）の分割表示",
                "AIによる語源、類義語、記憶術の解説",
                "スワイプで自信度を入力（完璧/もう一回/自信ない）",
              ]}
            />

            {/* テーマ別セッション */}
            <UXDetailCard
              title="テーマ別セッション：関連単語で深い学びを"
              description="1セッション10問は、類義語、語源、カテゴリなど、関連性の高い単語でグループ化。セッション終了後、AIがテーマ全体を踏まえた総合フィードバックを生成し、学習の文脈を明確にします。"
              features={[
                "忘却曲線に基づく復習を最優先しつつ、テーマ性を付与",
                "深夜バッチ処理による事前生成で、待ち時間ゼロ",
                "ユーザーが能動的にテーマをリクエスト可能（1日3回まで）",
              ]}
            />

            {/* モチベーション維持 */}
            <UXDetailCard
              title="モチベーション維持：健全な競争と成長実感"
              description="ランク（S+, S, A...）とランキング（全国/学校/グループ、週間/総合）で、ユーザーの学習意欲を刺激。ランキングはオプトイン方式で、プレッシャーを感じたくないユーザーは不参加を選択できます。"
              features={[
                "絶対評価のランクシステムで、次の目標を明確化",
                "「上位〇%」表示で、全てのユーザーにモチベーションを",
                "週間ランキングで、学習量を競う新たな軸を提供",
              ]}
            />
          </div>
        </div>
      </section>

      {/* 開発ロードマップ */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <h3 className="text-3xl font-bold text-foreground mb-12">開発ロードマップ</h3>
          
          <div className="space-y-6">
            <RoadmapPhase
              phase="Phase 1"
              title="基盤構築"
              tasks={[
                "データベース設計と構築（users, words, user_word_progress等）",
                "初期単語データ（9000語）の投入とベクトル埋め込み生成",
                "Supabase Authによるユーザー認証機能の実装",
                "UIコアコンポーネントの作成（Next.js + shadcn/ui）",
              ]}
            />

            <RoadmapPhase
              phase="Phase 2"
              title="コア学習機能の実装"
              tasks={[
                "問題画面の実装（レスポンシブ対応）",
                "問題取得APIの開発",
                "フィードバック画面の実装（色変化、スワイプ操作）",
                "回答記録APIの開発",
              ]}
            />

            <RoadmapPhase
              phase="Phase 3"
              title="AI連携と応用機能"
              tasks={[
                "AIフィードバック生成の実装（OpenAI API）",
                "忘却曲線スケジューラーの実装",
                "テーマ別セッション生成システムの実装（非同期キューイング）",
                "初期レベル診断テストの実装（適応型テスト）",
              ]}
            />

            <RoadmapPhase
              phase="Phase 4"
              title="ソーシャル機能と仕上げ"
              tasks={[
                "スコア＆ランクシステムの実装",
                "ランキング機能の実装（オプトイン方式）",
                "グループ＆学校設定機能の実装",
                "全体テストとデプロイ",
              ]}
            />
          </div>
        </div>
      </section>

      {/* 技術スタック */}
      <section className="py-16">
        <div className="container">
          <h3 className="text-3xl font-bold text-foreground mb-12">技術スタック</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <TechStackCard
              category="フロントエンド"
              items={[
                "React 19",
                "TypeScript",
                "Tailwind CSS 4",
                "shadcn/ui",
                "tRPC",
              ]}
            />
            <TechStackCard
              category="バックエンド"
              items={[
                "Express + tRPC",
                "MySQL (TiDB)",
                "Drizzle ORM",
                "Manus Auth",
              ]}
            />
            <TechStackCard
              category="AI・機械学習"
              items={[
                "OpenAI API (GPT-4)",
                "ベクトル埋め込み（単語の類似度計算）",
                "適応型テスト（CAT）アルゴリズム",
              ]}
            />
            <TechStackCard
              category="インフラ・その他"
              items={[
                "Manus Platform (ホスティング)",
                "非同期ジョブキュー",
                "S3互換ストレージ",
              ]}
            />
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <p className="text-sm text-muted-foreground text-center">
            © 2025 Retento Project. このドキュメントは、プロジェクトの設計思想と開発計画を記録したものです。
          </p>
        </div>
      </footer>
    </div>
  );
}

// コンセプトカードコンポーネント
function ConceptCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
        {icon}
      </div>
      <h4 className="text-xl font-semibold text-foreground mb-3">{title}</h4>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

// UX詳細カードコンポーネント
function UXDetailCard({ title, description, features }: { title: string; description: string; features: string[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-8">
      <h4 className="text-2xl font-semibold text-foreground mb-4">{title}</h4>
      <p className="text-muted-foreground leading-relaxed mb-6">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <ChevronRight className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <span className="text-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ロードマップフェーズコンポーネント
function RoadmapPhase({ phase, title, tasks }: { phase: string; title: string; tasks: string[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-semibold">
          {phase}
        </div>
        <h4 className="text-xl font-semibold text-foreground">{title}</h4>
      </div>
      <ul className="space-y-2 ml-4">
        {tasks.map((task, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-2" />
            <span className="text-muted-foreground">{task}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 技術スタックカードコンポーネント
function TechStackCard({ category, items }: { category: string; items: string[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Code className="w-5 h-5 text-accent" />
        <h4 className="text-lg font-semibold text-foreground">{category}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
