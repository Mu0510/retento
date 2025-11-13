import { ENV } from "./_core/env";

/**
 * OpenAI APIを使用して例文と選択肢を生成する
 */
export async function generateQuestionContent(
  word: string,
  partOfSpeech: string,
  correctAnswer: string,
  otherMeanings: string[]
) {
  const apiKey = ENV.forgeApiKey;
  const apiUrl = ENV.forgeApiUrl;

  if (!apiKey || !apiUrl) {
    throw new Error("OpenAI API configuration is missing");
  }

  // プロンプトを構築
  const prompt = `単語: ${word}
品詞: ${partOfSpeech}
正解: ${correctAnswer}

以下のJSON形式で出力してください。他のテキストは一切含めないでください。

{
  "sentence": "単語を<u>タグで囲んだ簡潔な英語例文（10-15単語程度）",
  "wrongChoices": ["紛らわしい不正解1", "紛らわしい不正解2", "紛らわしい不正解3"]
}

例文は簡潔に、選択肢は正解と紛らわしいが間違っているものを。`;

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
              "あなたは大学受験向け英単語学習アプリの問題作成AIです。指示に従って、自然で適切な例文と紛らわしい選択肢を生成してください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
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
    console.log('[AI] Raw response for word', word, ':', content);
    
    // デバッグ用: ファイルに保存
    try {
      const fs = await import('fs');
      const logPath = '/tmp/ai-responses.log';
      const logEntry = `\n=== ${new Date().toISOString()} - Word: ${word} ===\n${content}\n`;
      fs.appendFileSync(logPath, logEntry);
    } catch (e) {
      console.error('[AI] Failed to write log file:', e);
    }

    // JSONをパース（強力なサニタイズ処理）
    let jsonContent = content.trim();
    
    // 1. マークダウンコードブロックを除去
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    // 2. 前後の余分なテキストを除去（JSON部分のみを抽出）
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    
    // 3. 改行をスペースに置換
    jsonContent = jsonContent.replace(/\n/g, ' ');
    
    // 4. 安全なJSONパース（エラー時は手動で修正）
    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      // JSONパースに失敗した場合、文字列値内の特殊文字をエスケープ
      console.log('[AI] JSON parse failed, attempting to fix:', jsonContent.substring(0, 200));
      
      // 簡易的な修正: 文字列値内のエスケープされていない引用符を修正
      // 注: これは完璧ではないが、多くのケースで機能する
      try {
        // sentenceとwrongChoicesを手動で抽出
        const sentenceMatch = jsonContent.match(/"sentence"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);        const wrongChoicesMatch = jsonContent.match(/"wrongChoices"\s*:\s*\[([^\]]+)\]/);
        
        if (sentenceMatch && wrongChoicesMatch) {
          const sentence = sentenceMatch[1];
          const wrongChoicesStr = wrongChoicesMatch[1];
          const wrongChoices = wrongChoicesStr.match(/"([^"]*(?:\\.[^"]*)*)"/g)?.map((s: string) => s.slice(1, -1)) || [];
          
          parsed = { sentence, wrongChoices };
        } else {
          throw parseError;
        }
      } catch (fixError) {
        console.error('[AI] Failed to fix JSON:', fixError);
        throw parseError;
      }
    }

    return {
      sentence: parsed.sentence,
      wrongChoices: parsed.wrongChoices,
    };
  } catch (error) {
    console.error("[AI] Failed to generate question content:", error);
    throw error;
  }
}

/**
 * AIフィードバックを生成する（後で実装）
 */
export async function generateFeedback(
  word: string,
  partOfSpeech: string,
  correctAnswer: string,
  isCorrect: boolean
) {
  // TODO: 実装
  return null;
}
