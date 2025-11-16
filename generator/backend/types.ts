export type VocabularyEntry = {
  id: number;
  word: string;
  part_of_speech?: string | null;
  difficulty_score: number;
  meaning_1?: string | null;
  meaning_2?: string | null;
  meaning_3?: string | null;
};

export type QuestionPayload = {
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
};

export type GeminiResponseItem = QuestionPayload;

export type GeminiResponse = GeminiResponseItem[];
