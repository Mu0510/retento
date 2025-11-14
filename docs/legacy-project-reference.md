# 旧プロジェクト参照ガイド

`old_docs/` ディレクトリには、Retento の旧スタック（Vite + Express + Drizzle）のソースがそのまま保存されています。現行の Next.js 実装と挙動を比較したり、過去の API 契約や UI フローを参照したい場合に活用してください。

## 主要ディレクトリ
- `old_docs/client/` – 旧クライアントアプリ。`src/pages/InitialTest.tsx` や `src/pages/app/session.tsx` などに主要画面がまとまっています。
- `old_docs/server/` – Express/TRPC ベースの API 群。`routers.ts` にセッション開始・回答処理・スコア計算などコアロジックが集約されています。
- `old_docs/shared/` – クライアントとサーバーで共通利用していた型定義やユーティリティ。
- `old_docs/data/` – 生成済みの 1,000 語リストや初期診断問題セットなどの CSV データ。

## コード参照時のヒント
- 旧スタックを実際に起動する必要はありません。コードを読むだけで挙動を把握したい場合は、上記ディレクトリとエントリポイントを中心に確認すると効率的です。
- API の I/O 仕様は `old_docs/shared/types.ts` に、テストデータや語彙リストは `old_docs/data/` にまとまっています。現行実装と比較する際の補助資料として活用してください。

## 参考になるエントリポイント
- セッション開始・回答処理: `old_docs/server/routers.ts` の `learning.startSession` と `learning.submitAnswer`
- ユーザースコア再計算: `old_docs/server/routers.ts` の `learning.calculateSessionScore`
- 初期レベル診断フロー: `old_docs/server/routers.ts` の `initialTest.*` 系ハンドラと `old_docs/client/src/pages/InitialTest.tsx`

現行実装との比較で迷った場合は、上記ファイルをたどると旧仕様を確認できます。
