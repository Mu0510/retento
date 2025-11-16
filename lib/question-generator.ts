import type { SessionWord } from "@/lib/session-builder";
import type {
  QuestionGenerationResult,
  SessionChoice,
  SessionQuestion,
} from "@/types/questions";
import { hasSupabaseAdminConfig, supabaseAdminClient } from "@/lib/supabase-admin";

type GeneratedQuestionRow = {
  id: string;
  session_id: string | null;
  word_id: number | null;
  word: string;
  pattern_number: number;
  sentence_en: string;
  sentence_ja: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_choice_index: number;
  feedback_1: string;
  feedback_2: string;
  feedback_3: string;
  feedback_4: string;
  tags: string;
  usage_scene: string;
  embedding_text: string;
  created_at: string;
};

export async function generateQuestionsForWords(words: SessionWord[]): Promise<QuestionGenerationResult> {
  if (!words.length) {
    return { questions: [], conversation: null };
  }

  if (!hasSupabaseAdminConfig) {
    throw new Error("Supabaseの設定がないため、事前生成された問題バンクのみを使えません");
  }

  const rows = await fetchRandomQuestionRows(words.length);
  if (rows.length < words.length) {
    throw new Error(`DBに十分な問題がありません（要求: ${words.length}, 取得: ${rows.length}）`);
  }

  const questions = rows.map((row, index) => buildQuestionFromRow(row, index + 1));
  return { questions, conversation: null };
}

async function fetchRandomQuestionRows(limit: number): Promise<GeneratedQuestionRow[]> {
  if (limit <= 0) {
    return [];
  }
  const { count, error: countError } = await supabaseAdminClient
    .from("generated_questions")
    .select("id", { count: "exact", head: true });
  if (countError) {
    throw countError;
  }
  const total = typeof count === "number" ? count : 0;
  if (total === 0) {
    return [];
  }
  const actualLimit = Math.min(limit, total);
  const maxOffset = Math.max(total - actualLimit, 0);
  const offset = Math.floor(Math.random() * (maxOffset + 1));
  const { data, error } = await supabaseAdminClient
    .from("generated_questions")
    .select("*")
    .range(offset, offset + actualLimit - 1);
  if (error) {
    throw error;
  }
  return (data ?? []) as GeneratedQuestionRow[];
}

function buildQuestionFromRow(row: GeneratedQuestionRow, fallbackId: number): SessionQuestion {
  const correctIndex = Number(row.correct_choice_index) || 1;
  const baseChoices: Array<Omit<SessionChoice, "id">> = [
    {
      label: sanitizePlainText(row.choice_1),
      correct: correctIndex === 1,
      feedback: sanitizePlainText(row.feedback_1),
    },
    {
      label: sanitizePlainText(row.choice_2),
      correct: correctIndex === 2,
      feedback: sanitizePlainText(row.feedback_2),
    },
    {
      label: sanitizePlainText(row.choice_3),
      correct: correctIndex === 3,
      feedback: sanitizePlainText(row.feedback_3),
    },
    {
      label: sanitizePlainText(row.choice_4),
      correct: correctIndex === 4,
      feedback: sanitizePlainText(row.feedback_4),
    },
  ];

  const word = buildSessionWordFromRow(row, fallbackId, baseChoices[correctIndex - 1]?.label ?? "");
  const choices = assignChoiceIds(shuffleArray(baseChoices), word.id);
  return {
    word,
    sentence: sanitizeSentence(row.sentence_en, word.word),
    translation: sanitizePlainText(row.sentence_ja),
    choices,
  };
}

function buildSessionWordFromRow(
  row: GeneratedQuestionRow,
  fallbackId: number,
  meaning: string,
): SessionWord {
  return {
    id: typeof row.word_id === "number" && !Number.isNaN(row.word_id) ? row.word_id : fallbackId,
    word: row.word,
    partOfSpeech: null,
    difficultyScore: undefined,
    meanings: meaning ? [meaning] : [row.word],
    basis: "score",
  };
}

function sanitizeSentence(sentence: string, word: string): string {
  if (!sentence) {
    return `Please study ${word}.`;
  }
  const preserved = sentence
    .replace(/<u>/gi, "[[U_OPEN]]")
    .replace(/<\/u>/gi, "[[U_CLOSE]]");
  const stripped = stripHtml(preserved);
  return stripped
    .replace(/\[\[U_OPEN\]\]/g, "<u>")
    .replace(/\[\[U_CLOSE\]\]/g, "</u>");
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

function sanitizePlainText(value: string): string {
  if (!value) return "";
  return stripHtml(value);
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
