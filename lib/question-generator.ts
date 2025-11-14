import type { SessionWord } from "@/lib/session-builder";
import type {
  QuestionConversation,
  QuestionGenerationResult,
  SessionChoice,
  SessionQuestion,
} from "@/types/questions";

const OPENAI_API_BASE = process.env.OPENAI_API_BASE ?? "https://api.openai.com";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = 60_000;
export const QUESTION_SYSTEM_MESSAGE =
  "あなたは大学受験向け英単語学習アプリの問題作成AIです。例文・和訳・選択肢・各選択肢のフィードバックを厳密にJSONで出力し、教育的価値の高い内容だけを提供してください。";

type RawQuestion = {
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

type RawQuestionResponse = {
  questions: RawQuestion[];
};

export async function generateQuestionsForWords(words: SessionWord[]): Promise<QuestionGenerationResult> {
  if (!words.length) {
    return { questions: [], conversation: null };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const prompt = buildPrompt(words);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(`${OPENAI_API_BASE.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.6,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: QUESTION_SYSTEM_MESSAGE,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await safeReadJson(response);
      throw new Error(detail?.error?.message ?? `OpenAI API request failed (${response.status})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenAI API returned an empty response");
    }

    const parsed = parseQuestions(content);
    const generated = transformQuestions(parsed.questions ?? [], words);
    const questions = ensureAllWordsHaveQuestions(words, generated);
    const conversation: QuestionConversation = {
      system: QUESTION_SYSTEM_MESSAGE,
      user: prompt,
      assistant: content,
    };
    return { questions, conversation };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("OpenAI API request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildFallbackQuestions(words: SessionWord[], pool: SessionWord[] = words): SessionQuestion[] {
  return words.map((word, index) => {
    const templateIndex = index % 2;
    const sentence =
      templateIndex === 0
        ? `She accepted the award with great ${word.word}.`
        : `Researchers discussed ${word.word} in detail.`;
    const translation =
      templateIndex === 0
        ? `彼女は大きな ${word.meanings[0] ?? "意味"} をもって賞を受け取った。`
        : `${word.meanings[0] ?? "語"} について研究者たちが議論した。`;

    const distractors = pickFallbackDistractors(word, pool, 3);
    const baseChoices: Array<Omit<SessionChoice, "id">> = [
      {
        label: word.meanings[0] ?? `${word.word} の定義`,
        correct: true,
        feedback: "正解です。AIフィードバックの生成に失敗したため、簡易的な説明を表示しています。",
      },
      ...distractors.map((label) => ({
        label,
        correct: false,
        feedback: "この選択肢は誤答です。AIフィードバックの生成に失敗したため、簡易的な説明を表示しています。",
      })),
    ];

    const choices = assignChoiceIds(shuffleArray(baseChoices), word.id);
    return {
      word,
      sentence,
      translation,
      choices,
    };
  });
}

async function safeReadJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildPrompt(words: SessionWord[]): string {
  const header = `以下の${words.length}個の英単語について、大学受験レベルの4択問題を作成してください。`;
  const list = words
    .map(
      (word, idx) =>
        `${idx + 1}. ${word.word} (${word.partOfSpeech ?? "品詞不明"}) - 正解: ${word.meanings[0] ?? "意味不明"}`
    )
    .join("\n");

  return `${header}

単語リスト:
${list}

以下のJSON形式で必ず応答し、他のテキストは一切含めないでください。
{
  "questions": [
    {
      "wordIndex": 1,
      "sentence": "単語を<u>タグで囲んだ簡潔な英語例文（10-15単語程度）",
      "sentenceJapanese": "例文の自然な日本語訳",
      "wrongChoices": ["紛らわしい不正解1", "紛らわしい不正解2", "紛らわしい不正解3"],
      "feedbacks": {
        "correct": "正解の場合のフィードバック（なぜ正解か・語源・覚え方・豆知識など、140字程度）",
        "choice1": "wrongChoices[0]が不正解の理由（その訳ならどんな表現になるか、140字程度）",
        "choice2": "wrongChoices[1]が不正解の理由（その訳ならどんな表現になるか、140字程度）",
        "choice3": "wrongChoices[2]が不正解の理由（その訳ならどんな表現になるか、140字程度）"
      }
    }
  ]
}

要件:
- 例文は簡潔で自然な英語（10-15単語程度）
- **最重要**: 例文には必ず問題単語そのものを含め、問題単語のみ<u>タグ</u>で強調し、それ以外にHTMLや記号を入れないこと
- **重要**: 例文中の問題単語以外の語彙はより易しい単語を使うこと
- sentenceJapanese は自然な日本語訳のみ（HTMLタグ・記号・括弧を入れない）
- 選択肢は正解と紛らわしいが明確に誤っている日本語訳にする
- フィードバックは学習に資するクリティカルな情報（語源、類義語との違い、記憶術など）を含め、各140字前後（最低120字）で書く（テンプレ的な1行は禁止）
- フィードバックや選択肢の文面は純粋な日本語テキストのみで、HTMLタグ・半角記号による装飾は絶対に入れない
- 全問で一貫したテーマ性（語感や文脈）が出るよう配慮する
- JSON以外の文字列（前置き・後置き・コードフェンスなど）を絶対に出力しない`;
}

function parseQuestions(content: string): RawQuestionResponse {
  let trimmed = content.trim();
  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    trimmed = jsonMatch[0];
  }
  try {
    return JSON.parse(trimmed) as RawQuestionResponse;
  } catch (error) {
    console.error("[QuestionGenerator] Failed to parse OpenAI response:", trimmed);
    throw error;
  }
}

function transformQuestions(raw: RawQuestion[], words: SessionWord[]): SessionQuestion[] {
  const questions: SessionQuestion[] = [];
  for (const entry of raw) {
    const word = words[entry.wordIndex - 1];
    if (!word) continue;
    const correctAnswer = word.meanings[0] ?? `${word.word} の定義`;
    const wrongChoices = Array.isArray(entry.wrongChoices) ? entry.wrongChoices.filter(Boolean) : [];
    const baseChoices: Array<Omit<SessionChoice, "id">> = [
      {
        label: correctAnswer,
        correct: true,
        feedback: sanitizePlainText(entry.feedbacks?.correct ?? "正解です。"),
      },
      ...wrongChoices.slice(0, 3).map((label, idx) => ({
        label: sanitizePlainText(label),
        correct: false,
        feedback: sanitizePlainText(
          entry.feedbacks?.[(`choice${idx + 1}` as keyof RawQuestion["feedbacks"])] ?? "この選択肢は誤答です。",
        ),
      })),
    ];

    const choices = assignChoiceIds(shuffleArray(baseChoices), word.id);
    questions.push({
      word,
      sentence: sanitizeSentence(entry.sentence, word.word),
      translation: sanitizePlainText(entry.sentenceJapanese ?? ""),
      choices,
    });
  }
  return questions;
}

function ensureAllWordsHaveQuestions(words: SessionWord[], generated: SessionQuestion[]): SessionQuestion[] {
  const byWordId = new Map(generated.map((question) => [question.word.id, question]));
  const missing: SessionWord[] = [];

  for (const word of words) {
    if (!byWordId.has(word.id)) {
      missing.push(word);
    }
  }

  if (missing.length) {
    const fallback = buildFallbackQuestions(missing, words);
    for (const question of fallback) {
      byWordId.set(question.word.id, question);
    }
  }

  const ordered: SessionQuestion[] = [];
  for (const word of words) {
    const question = byWordId.get(word.id);
    if (question) {
      ordered.push(question);
    }
  }
  return ordered;
}

function sanitizeSentence(sentence: string, word: string): string {
  if (!sentence) {
    return `Please study ${word}.`;
  }
  return stripHtml(sentence);
}

function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function assignChoiceIds(choices: Array<Omit<SessionChoice, "id">>, wordId: number): SessionChoice[] {
  return choices.map((choice, idx) => ({
    ...choice,
    id: `${wordId}-${idx}`,
  }));
}

function pickFallbackDistractors(source: SessionWord, pool: SessionWord[], max: number): string[] {
  const candidates = pool.filter((item) => item.id !== source.id && item.meanings.length);
  const shuffled = shuffleArray(candidates);
  const results: string[] = [];
  for (const item of shuffled) {
    if (results.length >= max) break;
    const meaning = item.meanings[0];
    if (meaning) {
      results.push(meaning);
    }
  }
  return results;
}

function sanitizePlainText(value: string): string {
  if (!value) return "";
  return stripHtml(value);
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
