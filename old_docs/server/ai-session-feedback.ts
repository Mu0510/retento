import { ENV } from "./_core/env";

/**
 * セッション全体のフィードバックを生成する
 * 
 * @param sessionResults セッションの結果（各問題の単語、問題文、正誤、間違えた選択肢）
 * @param questions 各問題の詳細情報
 * @returns 全体フィードバック（140字程度）
 */
export async function generateSessionFeedback(
  sessionResults: {
    word: string;
    meaning: string;
    isCorrect: boolean;
    confidenceLevel: string;
  }[],
  questions: {
    word: string;
    sentenceContext: string;
    correctAnswer: string;
    userAnswer?: string;
  }[]
): Promise<string> {
  const apiKey = ENV.forgeApiKey;
  const apiUrl = ENV.forgeApiUrl;

  if (!apiKey || !apiUrl) {
    throw new Error("OpenAI API configuration is missing");
  }

  // セッション結果と問題文を組み合わせて詳細なプロンプトを作成
  const detailedResults = sessionResults
    .map((r, idx) => {
      const question = questions[idx];
      const status = r.isCorrect ? "正解" : "不正解";
      const wrongAnswer = !r.isCorrect && question?.userAnswer 
        ? ` (誤答: ${question.userAnswer})` 
        : "";
      return `${idx + 1}. ${r.word} (${r.meaning}) - ${status}${wrongAnswer}\n   例文: ${question?.sentenceContext || ""}`;
    })
    .join("\n\n");

  const prompt = `以下は、ユーザーが今回のセッションで学習した英単語の結果です。

${detailedResults}

この結果を踏まえて、造詣に富んだクリティカルで学習に役立つフィードバックを140字程度で生成してください。

**重要な指示：**
- 「わあ」「素晴らしい」「頑張りましょう」などの安っぽい励ましは避ける
- セッション内の単語を関連付けて、語源・用法・ニュアンスの違いなどを指摘する
- 間違えた単語がある場合は、なぜその選択肢を選んでしまったのか、正しい理解のポイントを示す
- 正解した単語でも、より深い理解や応用的な使い方を提示する
- 学術的で知的なトーンで書く

例：
「"vague"と"ambiguous"の使い分けに注意。前者は境界不定による不明瞭さ、後者は複数の解釈可能性を指します。"inquire"は"ask"より形式的で、公的な場面で使われます。語源のラテン語"quaerere"（探求する）を意識すると、単なる質問以上の意味が見えてきます。」`;

  try {
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "あなたは英語学習の専門家です。造詣に富んだクリティカルで学習に役立つフィードバックを提供してください。安っぽい励ましは避け、語源・用法・ニュアンスの違いなど、学術的な視点から指摘してください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[Session Feedback] API Response:", JSON.stringify(data, null, 2));
    
    const feedback = data.choices?.[0]?.message?.content?.trim();

    if (!feedback) {
      console.error("[Session Feedback] No feedback generated");
      throw new Error("Failed to generate session feedback");
    }

    console.log("[Session Feedback] Generated feedback:", feedback);
    console.log("[Session Feedback] Feedback length:", feedback.length);
    
    return feedback;
  } catch (error) {
    console.error("Error generating session feedback:", error);
    // フォールバック
    return "今回のセッションで学習した単語群には共通する語源や用法のパターンが見られます。次回はこれらの関連性を意識して学習を進めることで、より深い理解が得られるでしょう。";
  }
}
