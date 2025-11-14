import type { SessionWord } from "@/lib/session-builder";

export type SessionChoice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type SessionQuestion = {
  word: SessionWord;
  sentence: string;
  translation: string;
  choices: SessionChoice[];
};

export type QuestionConversation = {
  system: string;
  user: string;
  assistant: string;
};

export type QuestionGenerationResult = {
  questions: SessionQuestion[];
  conversation: QuestionConversation | null;
};
