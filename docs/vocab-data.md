# vocabulary asset build

このリポジトリでは `vocabulary_new.csv`（9,223 語）をマスターとし、静的に利用する語彙データを `data/vocabulary.json` としつつ、当面の検索やテスト用に `data/vocabulary.db`（SQLite）も生成しています。

## 使い方
```bash
python3 scripts/build_vocab.py
```

必要であれば `--no-db` でSQLiteの出力を飛ばし、`--no-json` でJSONの出力をスキップできます。デフォルトでは両方作成されます。

`--sort-by` で `id` / `word` / `difficulty_score` のいずれかでソートでき、`--renumber` を併用するとソート後に `id` を先頭から振り直します（例：`--sort-by word --renumber` でアルファベット順に ID 再割り当て）。

`--scale-difficulty` を付けると `difficulty_score` が 5〜10,000 の帯域にマッピングされ、`--difficulty-scale-alpha` で中央寄りの強調具合（0 = 線形、0.25 くらいで中央を少し広げる）を調整できます。スケーリング時に `data/difficulty-thresholds.json` も更新され、既存の 1-100 / 101-500 … などのレンジが新しい値でどこに対応するかが記録されます。

出力ファイル:

- `data/vocabulary.db`：`vocabulary` テーブル（`id`, `word`, `part_of_speech`, `difficulty_score`, `meaning_1`-`meaning_3`）を持つSQLite。
- `data/vocabulary.json`：そのままNext.js側で読み込める JSON 配列。後続で `lib/` 内に `Map` 化して使うもよし、そのままベクトル・類似度計算に使うもよし。
- `data/difficulty-thresholds.json`：`--scale-difficulty` を使ってスコアを再分布させたときの範囲マッピング（例：`高校標準` が何点〜何点になったか）を記録した JSON。

## 更新手順
1. `vocabulary_new.csv` を編集（順番・スコア・意味など）。
2. `python3 scripts/build_vocab.py` で SQLite/JSON を再生成。
3. 変更を `git` に追加。

必要であればこの JSON をベースに `lib/vocabulary.ts` やベクトル生成スクリプトを追加することで、AI 解説／関連語の探索も高速化できます。

## 埋め込み生成
`data/vocabulary.json` に対して OpenAI埋め込みを生成するスクリプトを `scripts/generate_embeddings.py` に用意しています。使い方の例:

```bash
OPENAI_API_KEY=xxx python3 scripts/generate_embeddings.py --batch 100 --resume
```

ポイント
1. `pip install openai` を事前にしておく。
2. `--resume` で既存の `data/vocab-embeddings.jsonl` を尊重し、途中から再開できる。
3. `--prompt` に意味や文脈を付加すると埋め込みの精度が上がるか試せる。
4. 進捗・失敗時の再試行に `--sleep` を調整（デフォルト 1 秒）。

生成されるファイル: `data/vocab-embeddings.jsonl`（1行1語、`id`, `word`, `difficulty_score`, `embedding`）。実行中は `Processing words 1-50 / 9223` のような進捗ログが標準出力に出ます。

## セッション生成API
Next.js API ルート `/api/sessions/plan` は `data/vocabulary.json` と `data/vocab-embeddings.jsonl` を利用して、Retento で使う 10 問セッションの単語リストを組み立てるための汎用エンドポイントです。

### リクエスト例 (POST)
```jsonc
{
  "userScore": 4200,
  "sessionSize": 10,
  "reviewIds": [12, 37]
}
```

### パラメータ
- `userScore`: セッションを組む際の参考スコア（5〜10,000 で変換済み）。スコアに近い難易度の単語がベースになります。
- `sessionSize`: 生成したい単語数（デフォルト 10、最大 20）。
- `reviewIds`: レビュー候補（1件～3件）を先に含める場合に ID を渡します。

### レスポンス
```jsonc
{
  "words": [
    { "id": 5, "word": "it", "basis": "review", "difficultyScore": 10, "meanings": ["それは", "それが"], "neighborScore": null },
    ...
  ],
  "metadata": {
    "sessionSize": 10,
    "baseWordIds": [5, 239, 52],
    "userScore": 4200,
    "difficultyRange": [3800, 4600]
  }
}
```

ベースワード（`basis` が `review` または `score`）を最大3つ選び、残りはベース単語とのコサイン類似度が高い語で埋めます。埋め込み未生成時はベース単語のみで構成されます。API を呼ぶフローに組み込むことで、ユーザーのスコア／レビュー候補に応じたセッションを一律に再現できます。
