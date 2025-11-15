# Retento TODO

## Phase 5: 紹介ページの改修
- [x] 未ログイン時、「アプリに移動」を「今すぐ始める」に文言置き換え

## Phase 7: 認証機能の実装
- [ ] ログインページの修正 (メールアドレスサインナップ&ログインに継続してバグあり)
- [ ] 保護されたルートの実装

## Phase 8: 学習アプリのコア機能実装
- [ ] tRPCプロシージャ（セッション開始、回答記録）
- [ ] 忘却曲線に基づく復習スケジューリング

## Phase 9: AI連携とテーマ別セッション
- [ ] AIフィードバック生成機能の実装
- [ ] テーマ別セッション生成アルゴリズムの実装
- [x] 例文と選択肢のAI生成

## Phase 10: 例文と選択肢のAI生成
- [x] OpenAI APIクライアントの設定
- [x] 例文生成プロンプトの設計
- [x] 選択肢生成プロンプトの設計
- [ ] startSessionプロシージャへのAI生成機能の統合
- [ ] AI生成失敗時のフォールバック実装
- [ ] 生成された例文と選択肢の品質確認

## Phase 11: キャッシング機能の実装
- [ ] wordsテーブルにキャッシュ用カラムを追加（cachedSentence, cachedChoices）
- [ ] 単語データに対して例文と選択肢を事前生成するスクリプトを作成
- [ ] startSessionプロシージャをキャッシュ優先に変更
- [ ] キャッシュがない場合のみAI生成を実行するフォールバック実装

## Phase 12: UX改善とスワイプ実装
- [x] 9000語の新しいCSVを準備（ユーザーがDB更新済み）
- [x] 自信度選択ボタンを削除
- [x] スワイプ操作で自信度判定（左=自信ない、右=微妙、上=完璧）
- [ ] スマホで1画面に収まるUIに調整（縦スクロール不要）
- [ ] 例文で問題以外の単語をタップして自信度を設定できる仕組みを追加し、知らない単語は復習に回す（初回テストで自動的に完璧扱いになっている単語を拾う用途も想定）

## 将来の機能（初回テスト実装後）
- [ ] 問題数とトークン利用量監視（必要に応じて制限）
- [ ] テーマリクエスト機能の実装

## Phase 14: 全単語のベクトル生成とデータベース保存（後回し）
- [x] wordsテーブルにembeddingカラムを追加
- [x] OpenAI Embeddings APIを使用して全単語のベクトルを生成
- [x] 生成したベクトルをデータベースに保存
- [ ] ベクトル類似度検索のヘルパー関数を作成

## Phase 16: AIフィードバック生成機能の実装
- [x] 各選択肢ごとのフィードバックをJSON構造に追加
- [x] 正解の場合のフィードバック（なぜ正解か、成り立ち、覚え方、豆知識、140字程度）
- [x] 不正解の場合のフィードバック（なぜ不正解か、その訳ならどんな表現か、140字程度）
- [x] フィードバックをフロントエンドで表示

## Phase 17: 不正解時のUI改善とセッション終了画面
- [ ] 不正解時はどこにスワイプしても✕扱いにする
- [ ] 不正解時の視覚的フィードバックを改善
- [ ] セッション終了画面の実装（正解数、スコア、復習リスト）
- [ ] マーク表示（◎完璧・緑、○微妙・オレンジ、△自信無し・黄、✕不正解・黒）

## Phase 18: AI生成とUI改善
- [ ] AI生成が成功し、フィードバックが正しく表示されることを確認

## Phase 20: プロンプト改善
- [ ] AI問題生成プロンプトに「例文中の問題以外の単語は、問題単語より簡単にする」指示を追加

## Phase 21: 問題生成ロジックの修正（5問）
- [x] 1セッション5問に変更
- [x] 未出題単語またはアクティブリコール1~3つ + 関連単語で残りを埋める

## Phase 22: ユーザーデータ蓄積の改善
- [ ] 単語力スコアのヘルパー関数を作成し、計算を差分計算にする (処理負荷軽減)
- [ ] ユーザースコアは「完璧=1・微妙=0.5・覚えてない/不正解=0」×単語難易度の合計で算出する仕様に正しく合わせる（計算は差分だけに絞るが、差分ロジックは後で事故らないよう厳格にする）

## Phase 23: セッション終了画面
- [ ] 最後の問題後にAIで全体フィードバック生成
- [ ] ユーザースコア変化の表示
- [ ] 各問題の単語・訳・状況（◎○△✕）表示

## セッション終了画面の改善
- [ ] フィードバック生成完了を待たずに終了画面に移行
- [ ] フィードバック生成中はスケルトン表示 (薄い灰色控えめ)、完了したら表示更新

## セッション終了画面の追加修正
- [ ] ◎○△✕に色を追加（◎=緑、○=オレンジ、△=黄色、✕=赤）
- [ ] 単語力スコアをトップに配置
- [ ] スケルトンを薄い灰色に変更
- [ ] セクションに色付きアイコンを追加（今回の学習内容と学習アドバイス）
- [ ] 単語力スコアが0→0になっている問題を修正（endSessionで結果を保存してからスコア計算）
- [ ] 「次のセッション」ボタンで問題カードが表示されない問題を修正

## Phase 25: スコア表示の改善
- [ ] 1桁・2桁の場合は小数点以下も含めて有効数字3桁表示
- [ ] 小数点以下を小さく表示、下揃え

## Phase 26: 初回ユーザーレベルテスト
- [ ] テスト用テーブルの作成（initial_test_questions, user_initial_test_results）
- [ ] 30問の適応型テストUI実装
- [ ] リアルタイムスコア推定アルゴリズム実装 - スコア変動は正解かつ完璧なら200アップ、微妙なら75アップ、覚えてないなら100減らす、不正解なら150減らすってな感じ（上昇・下降スコア量は1-20問目は100%、21-30問目で補正 - 21問目は100%、30問目は30%になるように線形補正　& スコアがマイナスになるもしくは10000を超えることの無いように上限下限を設ける）推定スコアに合わせて次の出題を決める
- [ ] 初回ユーザーレベルテスト終了時の推定スコアをそのユーザーの初期スコアに設定
- [ ] 初期スコアに基づく単語マーキング（完璧・微妙の自動設定）- 自動設定はラベルを付けておく & 初期スコア*0.8以下の単語は全て完璧に設定 この時点で算出された単語力スコアと、初期スコアとの差を算出して、差が最も小さくなるまで、残ってるうちの簡単な単語から順に「微妙」を設定していきます 初期スコア超えたら、超える前と超えたあとで初期スコアに近い方で止める、同じ近さなら低い方で止めるって感じ
- [ ] テスト結果画面の実装
- [ ] 1000題の固定問題を難易度別に事前生成（管理者が1度のみ手動実行）

## Phase 29: 既存ユーザーへの初回テストバナー
- [ ] 初回テスト未完了の既存ユーザーに/appにてバナーを表示
- [ ] バナーから初回テストページへ誘導

## Phase 32: スコア差分表示の修正
- [ ] スコア差分を有効数字4桁に修正

## Phase 33: 初回テストUIの共通化
- [ ] 初回テストはチュートリアルを兼ねるのでUIは通常のセッションと共通のコンポーネントを使う
- [ ] 推定スコアをヘッダーに小さく表示

## Phase 34: 初回テスト出題ロジックの改善
- [ ] 推定スコア±50の範囲から1問ずつ動的に問題を選定

## Phase 35: 初回テストのバグ修正と機能追加
- [ ] 初回テスト問題にAIフィードバックを追加

## Legacy learning features still missing in the new app
- [x] Hook `/api/sessions/start` into the UI so we actually persist sessions, consume pregenerated sets, and keep the background pregeneration loop running just like the old `learning.startSession` flow did in `old_docs/server/routers.ts:30-230`; the page now only hits `/api/sessions/start`, and `/api/sessions/plan`/`/api/sessions/questions` have been retired.
- [ ] Record each answer/confidence and update `user_word_confidences`/`user_profiles` (old `submitAnswer` + `calculateSessionScore` in `old_docs/server/routers.ts:233-356`) so that spaced-repetition scheduling actually happens instead of leaving review data on the client.
- [ ] Reintroduce the initial-level test workflow (status/start/next-question/submit) plus the question-generation helpers that populated `initial_test_questions`/`user_initial_test_results` (`old_docs/server/routers.ts:395-508`, `old_docs/server/initial-test-helpers.ts`, `old_docs/client/src/pages/InitialTest.tsx`). The new app currently has no `/initial-test` page or API.
- [ ] Run the historical generators (`old_docs/server/generate-initial-test-questions.mjs`, `old_docs/server/generate-1000-questions.ts`) so the curated 1,000/30-question data sets are available again.
