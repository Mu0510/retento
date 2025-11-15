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

## セッション開始API
Next.js API ルート `/api/sessions/start` はログイン済みのユーザーを対象に、`user_profiles.word_score` を起点として 301 語近傍（ターゲットより易しい最大 200 語＋難しい最大 100 語）を候補としてセッションを組み立てます。生成済みのセッションがあればスコア帯が一致するものを再利用し、そうでない場合は新規作成して `study_sessions` に保存します。AI 問題生成もこのルート内で行われるため、クライアント側から `/api/sessions/plan` や `/api/sessions/questions` を連続で呼ぶ必要がありません。

### リクエスト例 (POST)
```jsonc
{
  "sessionSize": 5
}
```

`sessionSize` は生成したい問題数（デフォルト 5、最大 20）です。`userScore` や `reviewIds` のような手動スコア指定は不要で、常に保存済みのスコアが利用されます。

### レスポンス
```jsonc
{
  "sessionId": "dd4e3bce-xxxx-xxxx-xxxx-xxxxxx",
  "plan": {
    "words": [ ... ],
    "metadata": {
      "sessionSize": 5,
      "baseWordIds": [ 120, 450, 780 ],
      "userScore": 5360,
      "difficultyRange": [ 3890, 4465 ]
    }
  },
  "questions": [ ... ],
  "source": "immediate"
}
```

`plan.metadata.difficultyRange` は候補プールに含まれる語の `difficulty_score` の最小／最大値（ユーザーのスコアを基準に下200語、上100語の局所バンド）を示します。これを UI で「band 3890–4465」のように表示すれば、実際の `user_profiles.word_score` に沿った帯域を表現できます。
