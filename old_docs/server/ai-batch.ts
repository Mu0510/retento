import { ENV } from "./_core/env";
import { Word } from "../drizzle/schema";

/**
 * 5単語分の問題を一括生成する
 * 各問題には例文、選択肢、各選択肢のフィードバックが含まれる
 */
export async function generateBatchQuestions(words: Word[]) {
  const apiKey = ENV.forgeApiKey;
  const apiUrl = ENV.forgeApiUrl;

  if (!apiKey || !apiUrl) {
    throw new Error("OpenAI API configuration is missing");
  }

  // 単語リストをプロンプト用に整形
  const wordsList = words
    .map(
      (w, idx) =>
        `${idx + 1}. ${w.word} (${w.partOfSpeech}) - 正解: ${w.commonMeaning1}`
    )
    .join("\n");

  // プロンプトを構築
  const prompt = `以下の5個の英単語について、大学受験レベルの4択問題を作成してください。

単語リスト:
${wordsList}

以下のJSON形式で出力してください。他のテキストは一切含めないでください。

{
  "questions": [
    {
      "wordIndex": 1,
      "sentence": "単語を<u>タグで囲んだ簡潔な英語例文（10-15単語程度）",
      "sentenceJapanese": "例文の日本語訳",
      "wrongChoices": ["紛らわしい不正解1", "紛らわしい不正解2", "紛らわしい不正解3"],
      "feedbacks": {
        "correct": "正解の場合のフィードバック（なぜ正解か、語源、覚え方、豆知識など、140字程度）",
        "choice1": "選択肢1が不正解の理由（その訳ならどんな表現になるか、140字程度）",
        "choice2": "選択肢2が不正解の理由（その訳ならどんな表現になるか、140字程度）",
        "choice3": "選択肢3が不正解の理由（その訳ならどんな表現になるか、140字程度）"
      }
    }
  ]
}

要件:
- 例文は簡潔で自然な英語（10-15単語程度）
- **最重要**: 例文には必ず問題単語そのものを含めること（単語が抜けた不完全な文にしないこと）
- **重要**: 例文中の問題単語以外の単語は、問題単語より簡単なものを使用すること（学習者が問題単語以外の単語で躓かないように）
- 選択肢は正解と紛らわしいが間違っているもの
- フィードバックは学習に資するクリティカルな情報（語源、類義語との違い、記憶術など）を含む
- 正解のフィードバックは「なぜ正解か」「単語の成り立ち」「覚え方」「豆知識」を含む
- 不正解のフィードバックは「なぜ不正解か」「その訳ならどんな表現になるか」を含む
- 各フィードバックは140字程度に収める
- 5問すべてに一貫性を持たせる（テーマ性を意識）`;

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
              "あなたは大学受験向け英単語学習アプリの問題作成AIです。指示に従って、自然で適切な例文、紛らわしい選択肢、学習に資するフィードバックを生成してください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 20000, // 5問分の詳細なフィードバックを含むため十分なトークン数を確保
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in OpenAI API response");
    }

    // 生のレスポンスをログに出力とファイルに保存
    console.log("[AI Batch] Raw response:", content.substring(0, 200) + "...");

    // デバッグ用: ファイルに保存
    try {
      const fs = await import("fs");
      const logPath = "/tmp/ai-batch-responses.log";
      const logEntry = `\n=== ${new Date().toISOString()} ===\n${content}\n`;
      fs.appendFileSync(logPath, logEntry);
    } catch (e) {
      console.error("[AI Batch] Failed to write log file:", e);
    }

    // JSONをパース（強力なサニタイズ処理）
    let jsonContent = content.trim();

    // 1. マークダウンコードブロックを除去
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    // 2. 前後の余分なテキストを除去（JSON部分のみを抽出）
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    // 3. JSONパース
    const parsed = JSON.parse(jsonContent);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid response format: questions array not found");
    }

    return parsed.questions;
  } catch (error) {
    console.error("[AI Batch] Failed to generate batch questions:", error);
    throw error;
  }
}

/**
 * 生成された問題データの型定義
 */
export type GeneratedQuestion = {
  wordIndex: number;
  sentence: string;
  sentenceJapanese: string;
  wrongChoices: string[];
  feedbacks: {
    correct: string;
    choice1: string;
    choice2: string;
    choice3: string;
  };
};
