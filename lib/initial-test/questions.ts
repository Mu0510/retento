import initialTestQuestions from "@/data/initial-test-questions.json";
const MAX_USER_SCORE = 10000;

export type InitialTestQuestionRecord = {
  id: number;
  word_id: number;
  difficulty_score: number;
  sentence_context: string;
  sentence_japanese: string;
  correct_answer: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  feedback_for_choice_1?: string | null;
  feedback_for_choice_2?: string | null;
  feedback_for_choice_3?: string | null;
  feedback_for_choice_4?: string | null;
};

export type InitialTestChoicePayload = {
  id: string;
  label: string;
  isCorrect: boolean;
  feedback?: string | null;
};

export type InitialTestQuestionPayload = {
  id: number;
  wordId: number;
  difficultyScore: number;
  sentenceContext: string;
  sentenceJapanese: string;
  choices: InitialTestChoicePayload[];
};

const QUESTION_SET: InitialTestQuestionRecord[] = (
  initialTestQuestions as InitialTestQuestionRecord[]
).map((entry) => ({
  ...entry,
  feedback_for_choice_1: entry.feedback_for_choice_1 ?? null,
  feedback_for_choice_2: entry.feedback_for_choice_2 ?? null,
  feedback_for_choice_3: entry.feedback_for_choice_3 ?? null,
  feedback_for_choice_4: entry.feedback_for_choice_4 ?? null,
}));

const CHOICE_FIELDS: Array<keyof InitialTestQuestionRecord> = [
  "choice_1",
  "choice_2",
  "choice_3",
  "choice_4",
];

function buildChoices(record: InitialTestQuestionRecord): InitialTestChoicePayload[] {
  const normalizedCorrect = record.correct_answer.trim();
  const choices: InitialTestChoicePayload[] = [
    {
      id: `${record.id}-correct`,
      label: normalizedCorrect,
      isCorrect: true,
      feedback: null,
    },
  ];

  const seenLabels = new Set<string>([normalizedCorrect]);
  for (let index = 0; index < CHOICE_FIELDS.length && choices.length < 4; index += 1) {
    const field = CHOICE_FIELDS[index];
    const rawLabel = record[field];
    if (!rawLabel) continue;
    const trimmedLabel = rawLabel.trim();
    if (!trimmedLabel || seenLabels.has(trimmedLabel)) continue;
    seenLabels.add(trimmedLabel);
    const feedbackField = (`feedback_for_choice_${index + 1}` as keyof InitialTestQuestionRecord);
    choices.push({
      id: `${record.id}-choice-${index}`,
      label: trimmedLabel,
      isCorrect: false,
      feedback: record[feedbackField] ?? null,
    });
  }

  return shuffleArray(choices);
}

function shuffleArray<T>(items: T[]): T[] {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function buildPayload(record: InitialTestQuestionRecord): InitialTestQuestionPayload {
  return {
    id: record.id,
    wordId: record.word_id,
    difficultyScore: record.difficulty_score,
    sentenceContext: record.sentence_context,
    sentenceJapanese: record.sentence_japanese,
    choices: buildChoices(record),
  };
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), MAX_USER_SCORE);
}

export function selectInitialTestQuestion(
  estimatedScore: number,
  answeredQuestionIds: number[],
): InitialTestQuestionPayload {
  const remaining = QUESTION_SET.filter((entry) => !answeredQuestionIds.includes(entry.id));
  if (!remaining.length) {
    throw new Error("すべての問題に回答済みです");
  }

  const target = clampScore(estimatedScore);
  const rangeMin = Math.max(0, target - 50);
  const rangeMax = Math.min(MAX_USER_SCORE, target + 50);
  const inRange = remaining.filter(
    (entry) => entry.difficulty_score >= rangeMin && entry.difficulty_score <= rangeMax,
  );
  const pool = inRange.length ? inRange : remaining;

  let best = pool[0];
  let bestDiff = Math.abs(best.difficulty_score - target);
  for (let i = 1; i < pool.length; i += 1) {
    const candidate = pool[i];
    const diff = Math.abs(candidate.difficulty_score - target);
    if (diff < bestDiff || (diff === bestDiff && candidate.difficulty_score < best.difficulty_score)) {
      best = candidate;
      bestDiff = diff;
    }
  }

  return buildPayload(best);
}

export function findInitialTestQuestionById(id: number): InitialTestQuestionRecord | null {
  return QUESTION_SET.find((entry) => entry.id === id) ?? null;
}

export function getInitialTestQuestionPool(): InitialTestQuestionRecord[] {
  return [...QUESTION_SET];
}
