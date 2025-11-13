import mysql from "mysql2/promise";

const ENV = {
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL,
  dbHost: process.env.DB_HOST,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  dbPort: process.env.DB_PORT || 3306,
};

/**
 * 300題の初回テスト用問題を生成
 * 難易度スコア100-3400を10区間に分け、各区間から30単語を選定
 */
async function generateInitialTestQuestions() {
  console.log("[Generate] Starting initial test question generation...");

  // データベース接続
  const connection = await mysql.createConnection({
    host: ENV.dbHost,
    user: ENV.dbUser,
    password: ENV.dbPassword,
    database: ENV.dbName,
    port: ENV.dbPort,
  });

  // 難易度スコアの範囲を10区間に分割
  const ranges = [
    { min: 100, max: 430 },    // 区間1
    { min: 431, max: 760 },    // 区間2
    { min: 761, max: 1090 },   // 区間3
    { min: 1091, max: 1420 },  // 区間4
    { min: 1421, max: 1750 },  // 区間5
    { min: 1751, max: 2080 },  // 区間6
    { min: 2081, max: 2410 },  // 区間7
    { min: 2411, max: 2740 },  // 区間8
    { min: 2741, max: 3070 },  // 区間9
    { min: 3071, max: 3400 },  // 区間10
  ];

  const selectedWords = [];

  // 各区間から30単語をランダム選定
  for (const range of ranges) {
    console.log(`[Generate] Selecting 30 words from range ${range.min}-${range.max}...`);
    
    const [rows] = await connection.execute(
      `SELECT * FROM words 
       WHERE difficultyScore >= ? AND difficultyScore <= ? 
       ORDER BY RAND() 
       LIMIT 30`,
      [range.min, range.max]
    );

    if (rows.length < 30) {
      console.warn(`[Generate] Warning: Only ${rows.length} words found in range ${range.min}-${range.max}`);
    }

    selectedWords.push(...rows);
  }

  console.log(`[Generate] Selected ${selectedWords.length} words total`);

  // AIで問題を一括生成（10単語ずつ）
  const batchSize = 10;
  let generatedCount = 0;

  for (let i = 0; i < selectedWords.length; i += batchSize) {
    const batch = selectedWords.slice(i, i + batchSize);
    console.log(`[Generate] Generating questions for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(selectedWords.length / batchSize)}...`);

    try {
      const questions = await generateQuestionsForBatch(batch);

      // データベースに保存
      for (let j = 0; j < questions.length; j++) {
        const question = questions[j];
        const word = batch[j];

        await connection.execute(
          `INSERT INTO initial_test_questions 
           (wordId, difficultyScore, sentenceContext, sentenceJapanese, correctAnswer, choice1, choice2, choice3, choice4) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            word.id,
            word.difficultyScore,
            question.sentence,
            question.sentenceJapanese,
            word.commonMeaning1,
            question.choices[0],
            question.choices[1],
            question.choices[2],
            question.choices[3],
          ]
        );

        generatedCount++;
      }

      console.log(`[Generate] Progress: ${generatedCount}/${selectedWords.length} questions generated`);
    } catch (error) {
      console.error(`[Generate] Error generating batch:`, error);
    }
  }

  console.log(`[Generate] Completed! Generated ${generatedCount} questions`);
  await connection.end();
}

/**
 * 10単語分の問題を一括生成
 */
async function generateQuestionsForBatch(words) {
  const wordsList = words
    .map((w, idx) => `${idx + 1}. ${w.word} (${w.partOfSpeech}) - 正解: ${w.commonMeaning1}`)
    .join("\n");

  const prompt = `以下の10個の英単語について、初回レベルテスト用の4択問題を作成してください。

単語リスト:
${wordsList}

以下のJSON形式で出力してください。他のテキストは一切含めないでください。

{
  "questions": [
    {
      "wordIndex": 1,
      "sentence": "単語を<u>タグで囲んだ簡潔な英語例文（10-15単語程度）",
      "sentenceJapanese": "例文の日本語訳",
      "choices": ["正解の訳", "紛らわしい不正解1", "紛らわしい不正解2", "紛らわしい不正解3"]
    }
  ]
}

**重要な要件:**
- **類推しにくい文章**: 文脈から単語の意味を推測できないようにする
- **純粋な単語力を測る**: 単語を知っているかどうかだけで正誤が決まるようにする
- 例文は簡潔で自然な英語（10-15単語程度）
- 例文中の問題単語以外の単語は、問題単語より簡単なものを使用
- 選択肢は正解と紛らわしいが間違っているもの
- 選択肢の順番はランダム（正解が常に最初にならないように）`;

  const response = await fetch(`${ENV.forgeApiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは英単語レベルテスト用の問題作成AIです。類推しにくく、純粋な単語力を測る問題を作成してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 10000,
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

  // JSONをパース
  let jsonContent = content.trim();
  if (jsonContent.startsWith("```")) {
    jsonContent = jsonContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonContent = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonContent);

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error("Invalid response format: questions array not found");
  }

  return parsed.questions;
}

// スクリプト実行
generateInitialTestQuestions().catch((error) => {
  console.error("[Generate] Fatal error:", error);
  process.exit(1);
});
