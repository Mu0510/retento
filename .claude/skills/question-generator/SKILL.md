---
description: "英単語学習アプリRetento用の4択問題を生成。vocabulary.jsonから単語を読み込み、高品質な例文・自然な日本語訳・紛らわしい選択肢・丁寧な解説をCSV形式で出力。ユーザーが問題生成を依頼した際に使用"
allowed-tools: ["Read", "Write", "Bash"]
---

# Retento Question Generator Skill

このスキルは、英単語学習アプリ「Retento」用の高品質な4択問題を生成します。

## 🎯 目的

- `data/vocabulary.json` から英単語を読み込み
- 各単語について自然な例文と4択問題を作成
- CSV形式で出力し、後にデータベースにインポート可能にする

## 📊 CSVスキーマ

```csv
word,pattern_number,sentence_en,sentence_ja,choice_1,choice_2,choice_3,choice_4,correct_choice_index,feedback_1,feedback_2,feedback_3,feedback_4,tags,usage_scene,embedding_text
```

### カラム説明

- `word`: 対象単語（vocabulary.jsonのwordと紐づけ）
- `pattern_number`: パターン番号（1から開始、最終的に各単語20問まで）
- `sentence_en`: 英文例文（10-15語程度、該当単語は `<u>タグ</u>` で囲む）
- `sentence_ja`: 自然な日本語訳
- `choice_1` ~ `choice_4`: 日本語4択（どれも「ありえそう」に見える選択肢）
- `correct_choice_index`: 正解の番号（1-4の整数）
- `feedback_1` ~ `feedback_4`: 各選択肢への丁寧な解説
- `tags`: セミコロン区切りのタグ（1-5個）
- `usage_scene`: 使用場面の説明（1フレーズ）
- `embedding_text`: 埋め込みベクトル生成用テキスト

## 🔧 生成ルール

### 0. **【最重要】wordの形を絶対に変えないルール**

**vocabulary.jsonのwordフィールドに記載された英単語を、データベースに登録されている形のまま使用すること。時制・語形・接辞の追加は一切禁止。**

#### 絶対禁止事項：

1. **時制変化の禁止**
   - ❌ DB: `abandon` → 文中で `abandoned` / `abandons` / `abandoning` に変えない
   - ❌ DB: `abhor` → 文中で `abhors` / `abhorred` / `abhorring` に変えない
   - ❌ DB: `abolish` → 文中で `abolished` / `abolishes` に変えない

2. **接頭辞・接尾辞の追加禁止**
   - ❌ DB: `abashed` → 文中で `unabashed` に変えない
   - ❌ DB: `abash` → 文中で `abashed` に変えない

3. **単複変化の禁止**
   - ❌ DB: `aberration` → 文中で `aberrations` に変えない
   - ❌ DB: `ability` → 文中で `abilities` に変えない

4. **品詞変化の禁止**
   - ❌ DB: `abandon`（動詞） → 文中で `abandonment`（名詞）に変えない
   - ❌ DB: `quick`（形容詞） → 文中で `quickly`（副詞）に変えない

#### 正しい使い方（DBの形を厳守）：

- DB: `word: "abandon"` → 文: `Never <u>abandon</u> your dreams.` ✅
- DB: `word: "abandoned"` → 文: `The <u>abandoned</u> house was haunted.` ✅
- DB: `word: "abash"` → 文: `Don't let them <u>abash</u> you.` ✅
- DB: `word: "abhor"` → 文: `I <u>abhor</u> violence.` ✅

#### 重要な理解：

vocabulary.jsonには派生形が**それぞれ独立したエントリ**として登録されている：
- `abandon`（動詞）← id=2用の問題
- `abandoned`（形容詞）← id=3用の問題
- `abandonment`（名詞）← id=4用の問題

**各エントリは独立している。他のエントリの形を借用してはならない。**

#### 下線の付け方：

- ✅ `<u>abandoned</u>` ← 単語全体に下線
- ❌ `<u>abandon</u>ed` ← 一部だけ下線（禁止）
- ❌ `un<u>abashed</u>` ← 接頭辞除外（禁止）

### 1. 英文例文（sentence_en）

- **長さ**: difficulty_scoreに応じて調整
  - 1000-3000台: 7-10語（簡単な文）
  - 4000-6000台: 10-12語（中程度）
  - 7000-9000台: 12-15語（やや長め）
- **該当単語**: `<u>単語</u>` で囲む **（wordフィールドと完全一致させる）**
- **自然さ**: ネイティブが実際に使う表現を優先
- **文脈**: その単語の意味が明確に伝わる状況設定

### 2. 日本語訳（sentence_ja）

**最重要**: 自然な日本語を優先すること

- ❌ 悪い例: 「子供の放棄された感覚が...」
- ✅ 良い例: 「子どもが見捨てられたと感じたことが...」

#### ルール:

1. **抽象名詞は必要に応じてフレーズ化**
   - `abandonment` → 「放棄」ではなく「見捨てられたという感覚」
   - `ability` → 「能力」そのままでもOKだが、文脈次第で「〜できる力」

2. **英訳っぽい語順を避ける**
   - ❌ 「その本は歴史についてです。」
   - ✅ 「その本は歴史について書かれている。」または「その本のテーマは歴史だ。」

3. **高校生が参考書で見る自然な訳に近づける**
   - 機械翻訳感を排除
   - 日本語として読んで違和感がないか必ずチェック

4. **形容詞・分詞の訳は文脈に応じて自然に**
   - 建物・場所・無生物には「廃〜」「放棄された」など物理的表現
   - 人・動物・感情には「見捨てられた」「捨てられた」など感情的表現
   - 一つの訳語に固執せず、対象の性質に合わせて使い分ける

### 3. 選択肢設計（choice_1 ~ choice_4）

**最重要**: 文脈的に「どれもありえそう」に見える選択肢群にすること

#### 設計原則:

1. **4つとも「その文脈になんとなく入りそうな日本語」にする**
   - ❌ 悪い例（ability）: 能力 / 困難 / 計画 / 機会 ← 困難だけ明らかに遠い
   - ✅ 良い例: 能力 / 才能 / 資質 / 素質 ← どれもポジティブで近い

2. **最低1つは「意味は近いがニュアンスが違う」選択肢**
   - 例: 能力 vs 才能（abilityとtalentの違い）
   - 例: 退位 vs 辞任（abdicationとresignationの違い）

3. **最低1つは「同じ領域だが役割が違う」選択肢**
   - 例（abortion）: 中絶 / 出産 / 妊娠 / 避妊 ← 全て生殖領域
   - 例（abandon）: 放棄する / 延期する / 中断する / 撤回する ← 全て「やめる」系

4. **異分野の単語を無理に混ぜない**
   - ❌ 悪い例: 中絶 / 選挙 / 教育 / 貿易 ← バラバラすぎて社会科クイズ
   - ✅ 良い例: 中絶 / 出産 / 妊娠 / 避妊 ← 同じ領域で紛らわしい

#### 選択肢配置:

- `correct_choice_index` でランダム化（1-4のどこに正解を置いてもOK）
- パターンによって正解位置を変える

### 4. フィードバック（feedback_1 ~ feedback_4）

各選択肢について、以下を含む丁寧な解説を書く：

1. **正解の場合**:
   - なぜこれが正解か
   - 単語の意味・語源・ニュアンス
   - 文脈との結びつき
   - **試験での出方や覚え方のコツ（可能な限り全問に1文追加）**

2. **誤答の場合**:
   - なぜ不適切か
   - どんな英語表現になるか
   - 正解とどう違うか（意味・ニュアンス・使用場面）

#### **フィードバック文体ルール（最重要）**:

**日本語として自然であることを最優先する**。英語はあくまで「例」として日本語の中に差し込むだけ。

##### ✅ 推奨する書き方パターン:

```
「〜」に対応する英語は ○○ / △△ などです。
「〜」は英語では ○○ と言い、「〜〜という意味」になります。
○○ は「〜〜」の意味なので、この文脈では不自然で不正解です。
```

##### ❌ 絶対に禁止する書き方:

- 「〜 isforget」「〜 isbe absent from」など、**is + 単語列がくっついた形**
- 英語しかない断片（日本語の主語・述語がない）
  - 例: 「forgetで、記憶を失うこと。」← ダメ

##### 良い例（誤答フィードバック）:

```
「欠席する」に対応する英語は be absent from / skip / miss などで、「出席しない」という行為を表します。attend は「出席する」なので、意味が正反対になり、この文では不正解です。

「忘れる」は英語では forget で、「記憶から抜け落ちる」という意味になります。associate は「関連づける」「結びつける」という動きで、忘れるどころかむしろ何かを強く結びつけるイメージなので不正解です。

「比較する」は英語では compare で、類似点や相違点を検討することです。associate は関連づけることで、compare は違いや類似性を分析することを指します。associate の方がより自動的・無意識的な結びつきを示すため、ニュアンスが異なります。
```

##### 正解フィードバックの例:

```
「放棄する」が正解です。abandon は「危険や困難な状況で何かを諦めて去る」という意味で、沈没船という緊急事態に最適です。共通テストや模試では、abandon は「危険だから捨てる」イメージでよく出ます。

「継続的な」が正解です。continuous は「途切れることなく続く、連続的な」という意味で、24 hours a day（1日24時間）という説明と一致します。ビジネスや製造業の文脈で continuous operation（連続操業）としてよく使われます。類似語の continual（断続的だが繰り返される）との違いに注意しましょう。
```

#### ポイント:

1. **「〜は … です」で書く（is を単独で使わない）**
2. **英単語の前には必ずスペースを入れる**（be absent from / skip / miss のように）
3. **文法メタ情報は全部日本語で言う**（「〜という意味です」「〜を表します」「〜の反対です」など）

### 5. タグ設計（tags）

#### タグプール（初期版）:

```
academic, action, abstract, art, biology, business, causation, chemistry,
communication, comparison, concrete, daily_life, description, education,
emotion_negative, emotion_positive, formal, informal, law, literature,
medicine, mental, movement, nature, physical, physics, politics, quality,
quantity, relationship, science, social, sports, state, technology, time,
transformation, culture, moral, emergency, environment
```

#### ルール:

1. **1問につき1-5個のタグ**
2. **できれば「分野2-3個 + ニュアンス2-3個」の構成**
   - 分野例: science, politics, business, daily_life
   - ニュアンス例: formal, abstract, emotion_negative, action

3. **既存タグを優先使用**
   - 新タグは「どうしても既存で表現できない」場合のみ追加
   - 新タグを追加した場合は、理由をコメントで明記

4. **出題傾向調整に使える意味的な分類**
   - 例: `science, environment, formal, action` → 環境科学系の文章で使われる動詞

5. **セミコロン区切り**
   - ✅ `action;emergency;movement;formal`
   - ❌ `action,emergency,movement,formal` ← カンマは使用禁止

### 6. 使用場面（usage_scene）

**1フレーズ**で「どんな場面の文か」を説明:

#### 例:

- `emergency situation at sea`
- `university research presentation`
- `news article about climate change`
- `casual conversation between friends`
- `business email to a client`
- `high school classroom discussion`
- `psychological discussion about childhood trauma`

#### ルール:

- 具体的すぎず、抽象的すぎず
- テーマ性のあるセッション生成に使えるレベルの粒度
- 英語でOK（後処理で翻訳可能）

### 7. 埋め込みテキスト（embedding_text）

**フォーマット**:

```
word : sentence_en(タグ除去) / sentence_ja / 正解: correct_choice / tags: tags / scene: usage_scene
```

#### 例:

```
abandon : The crew had to abandon the sinking ship immediately. / 乗組員は沈没する船をすぐに放棄しなければならなかった。 / 正解: 放棄する / tags: action;emergency;movement;formal / scene: emergency situation at sea
```

#### ルール:

1. **`<u>...</u>` タグは削除**（意味には不要、ノイズになる）
2. **正解の日本語のみ含める**（誤答は不要）
3. **tags と usage_scene を文字列として連結**（テーマ性検索に効く）

## 🚀 使用方法

### 基本的な流れ:

1. **ユーザーから指示を受ける**
   - 例: 「最初の10語で問題を1問ずつ生成して」
   - 例: 「abandon から abrade まで pattern_number=1 を生成」
   - 例: 「続きから問題生成して」

2. **進捗状況を確認する**
   - `data/questions-bank-progress.json` を読んで、前回どこまで生成したかを確認
   - ファイルが存在しない場合は新規開始

3. **vocabulary.json を読み込む**
   ```bash
   python3 -c "
   import json
   with open('data/vocabulary.json', 'r') as f:
       vocab = json.load(f)
   # 必要な単語を抽出
   "
   ```

4. **スキップする単語**
   - `a` のみスキップ（基本語すぎて問題作成困難）

5. **問題を生成**
   - 上記ルールに従って1問ずつ生成
   - CSV形式で出力

6. **CSVファイルに追記**
   - 初回: `data/questions-bank.csv` を新規作成（ヘッダー含む）
   - 2回目以降: 既存ファイルに追記（ヘッダーなし）

7. **進捗状況を保存**
   - `data/questions-bank-progress.json` を更新
   - 次回はここから続行可能

### 出力例:

```csv
word,pattern_number,sentence_en,sentence_ja,choice_1,choice_2,choice_3,choice_4,correct_choice_index,feedback_1,feedback_2,feedback_3,feedback_4,tags,usage_scene,embedding_text
abandon,1,"The crew had to <u>abandon</u> the sinking ship immediately.",乗組員は沈没する船をすぐに放棄しなければならなかった。,放棄する,固定する,修理する,調査する,1,"「放棄する」が正解です。abandonは「危険や困難な状況で何かを諦めて去る」という意味で、沈没船という緊急事態に最適です。共通テストや模試では、abandonは「危険だから捨てる」イメージでよく出ます。","「固定する」はsecure/fastenで、船を安定させる行為。abandonとは逆の行動です。","「修理する」はrepairで、船を直す行為。しかしimmediately(すぐに)という緊急性と矛盾します。","「調査する」はinvestigate/inspectで、状況を調べる行為。沈没中の船では命を守ることが優先されます。",action;emergency;movement;formal,emergency situation at sea,"abandon : The crew had to abandon the sinking ship immediately. / 乗組員は沈没する船をすぐに放棄しなければならなかった。 / 正解: 放棄する / tags: action;emergency;movement;formal / scene: emergency situation at sea"
```

## 📝 品質チェックリスト

生成後、各問題について以下を確認:

- [ ] 英文は自然で、難易度に合った長さか？
- [ ] 日本語訳は自然か？（機械翻訳感がないか？）
- [ ] 選択肢4つとも「ありえそう」に見えるか？
- [ ] 少なくとも1つは「意味が近い」紛らわしい選択肢があるか？
- [ ] フィードバックは丁寧で、試験的視点が含まれているか？
- [ ] タグは適切で、タグプール内から選ばれているか？
- [ ] embedding_textに `<u>` タグが含まれていないか？

## 🎓 Claude への注意事項

1. **一度に生成する問題数**:
   - 10-20問ずつ推奨（品質確認しやすい）
   - ユーザーの指示に従う

2. **フィードバックの反映**:
   - ユーザーから修正指示があれば、このSKILL.mdを更新
   - 改善のイテレーションを重ねる

3. **タグプールの拡張**:
   - 新タグ追加時は必ず理由を説明
   - tag-pool.json（別ファイル）に記録

4. **出力形式**:
   - 必ずCSVヘッダーを含める
   - エスケープ処理に注意（カンマ・改行・ダブルクォート）

## 📂 進捗管理システム

### progress.jsonの構造

`data/questions-bank-progress.json`:

```json
{
  "version": "1.0.0",
  "last_updated": "2025-11-15T10:30:00Z",
  "total_words": 9000,
  "total_generated": 100,
  "current_pattern": 1,
  "last_word": "ability",
  "last_word_id": 500,
  "batches": [
    {
      "batch_id": 1,
      "timestamp": "2025-11-15T09:00:00Z",
      "words_generated": 20,
      "start_word": "abandon",
      "end_word": "abrade",
      "pattern_number": 1
    },
    {
      "batch_id": 2,
      "timestamp": "2025-11-15T10:30:00Z",
      "words_generated": 80,
      "start_word": "abroad",
      "end_word": "ability",
      "pattern_number": 1
    }
  ]
}
```

### 進捗確認の手順

1. **progress.jsonを読む**
   ```bash
   cat data/questions-bank-progress.json
   ```

2. **最後に生成した単語を確認**
   - `last_word_id` をチェック
   - vocabulary.jsonで次の単語を特定

3. **続きから生成**
   - `last_word_id + 1` から開始
   - 同じ `pattern_number` で続行

### CSVへの追記手順

#### 初回生成の場合:

```bash
# ヘッダー付きで新規作成
cat > data/questions-bank.csv << 'EOF'
word,pattern_number,sentence_en,sentence_ja,choice_1,choice_2,choice_3,choice_4,correct_choice_index,feedback_1,feedback_2,feedback_3,feedback_4,tags,usage_scene,embedding_text
abandon,1,"The crew had to <u>abandon</u> the sinking ship immediately.",乗組員は沈没する船をすぐに放棄しなければならなかった。,放棄する,固定する,修理する,調査する,1,"「放棄する」が正解です。...",..."
EOF
```

#### 2回目以降の追記:

```bash
# 既存ファイルに追記（ヘッダーなし）
cat >> data/questions-bank.csv << 'EOF'
abandoned,1,"The <u>abandoned</u> factory was covered with rust.",見捨てられた工場は錆に覆われていた。,...
EOF
```

### 進捗保存の手順

生成が完了したら、必ず `progress.json` を更新:

```bash
# Pythonで更新
python3 << 'EOF'
import json
from datetime import datetime

# 既存の進捗を読み込む
try:
    with open('data/questions-bank-progress.json', 'r') as f:
        progress = json.load(f)
except FileNotFoundError:
    progress = {
        "version": "1.0.0",
        "total_words": 9000,
        "total_generated": 0,
        "current_pattern": 1,
        "batches": []
    }

# 新しいバッチ情報を追加
new_batch = {
    "batch_id": len(progress["batches"]) + 1,
    "timestamp": datetime.utcnow().isoformat() + "Z",
    "words_generated": 20,  # 今回生成した単語数
    "start_word": "abandon",  # 開始単語
    "end_word": "abrade",  # 終了単語
    "pattern_number": 1
}

progress["batches"].append(new_batch)
progress["total_generated"] += new_batch["words_generated"]
progress["last_word"] = new_batch["end_word"]
progress["last_word_id"] = 20  # vocabulary.jsonのID
progress["last_updated"] = datetime.utcnow().isoformat() + "Z"

# 保存
with open('data/questions-bank-progress.json', 'w') as f:
    json.dump(progress, f, indent=2, ensure_ascii=False)

print(f"✅ Progress saved: {new_batch['words_generated']} words generated")
EOF
```

## 🔄 続きから再開する方法

### ユーザーが「続きから」と指示した場合:

1. **progress.jsonを確認**
   ```bash
   python3 -c "
   import json
   with open('data/questions-bank-progress.json', 'r') as f:
       p = json.load(f)
   print(f'Last word ID: {p[\"last_word_id\"]}')
   print(f'Last word: {p[\"last_word\"]}')
   print(f'Total generated: {p[\"total_generated\"]}')
   print(f'Pattern: {p[\"current_pattern\"]}')
   "
   ```

2. **次の単語から開始**
   ```bash
   python3 -c "
   import json

   # 進捗確認
   with open('data/questions-bank-progress.json', 'r') as f:
       progress = json.load(f)

   last_id = progress['last_word_id']
   pattern = progress['current_pattern']

   # vocabulary.jsonから次の単語を取得
   with open('data/vocabulary.json', 'r') as f:
       vocab = json.load(f)

   # 次の20語を取得（スキップする単語を考慮）
   next_words = [w for w in vocab if w['id'] > last_id][:20]

   for w in next_words:
       print(f\"{w['id']}: {w['word']} ({w['difficulty_score']})\")
   "
   ```

3. **生成開始**
   - 取得した単語リストで問題を生成
   - CSVに追記
   - progress.jsonを更新

### 完全に新規開始する場合:

```bash
# progress.jsonを削除または初期化
rm -f data/questions-bank-progress.json
rm -f data/questions-bank.csv
# これで次回は1番目の単語から開始
```

## 📚 参考資料

- `data/vocabulary.json`: 9,000+語の英単語データ
- `data/questions-bank.csv`: 生成された問題のCSVファイル
- `data/questions-bank-progress.json`: 進捗管理ファイル
- `docs/今後の方針.md`: Retentoの設計方針
- タグプール: `.claude/skills/question-generator/tag-pool.json`

---

**このスキルを使う際**: 「問題生成して」「次の100語で問題作って」「続きから生成して」などの指示で自動起動します。
