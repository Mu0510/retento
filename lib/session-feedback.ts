export type FeedbackResult = {
  index: number;
  word: string;
  meaning: string;
  isCorrect: boolean;
  confidence: string;
  userAnswer: string | null;
  correctAnswer: string;
  sentence: string;
  translation: string;
};

export function buildFeedbackPrompt(results: FeedbackResult[]): string {
  const correctCount = results.filter((item) => item.isCorrect).length;
  const summary = `全${results.length}問中${correctCount}問正解。自信度: ${summarizeConfidence(results)}。`;
  const details = results
    .map((item) => {
      const status = item.isCorrect ? "正解" : "誤答";
      const answerPart = item.isCorrect
        ? ""
        : ` / 選択: ${item.userAnswer ?? "未回答"} → 正解: ${item.correctAnswer}`;
      return `${item.index}. ${item.word} (${item.meaning}) - ${status}${answerPart}\n   自信:${item.confidence} / 例文:${item.sentence}\n   訳:${item.translation}`;
    })
    .join("\n\n");

  return `以下は英単語セッションの結果です。

${summary}

${details}

この情報を踏まえて、造詣に富んだクリティカルな全体フィードバックを日本語で140字前後（最低120字）で作成してください。
要件:
- 安っぽい励ましは排除し、語源・派生・コアイメージ・誤答分析など具体的な学習指針を提示する
- 同じ語族・概念に属する単語同士の比較や、誤答に見られる思考パターンを指摘する
- すべて正解だった場合は「誤答」「混同」といった言葉を使わずに、得られた理解を深める視点でまとめる（矛盾を避ける）
- 次にどう復習するべきか1点以上アドバイスする
- プレーンテキストのみ、記号や絵文字は禁止`;
}

function summarizeConfidence(results: FeedbackResult[]): string {
  const counts = results.reduce<Record<string, number>>((acc, item) => {
    acc[item.confidence] = (acc[item.confidence] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([level, count]) => `${level}:${count}`)
    .join(" / ");
}
