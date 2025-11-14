-- initial_test_questions/community
CREATE TABLE IF NOT EXISTS public.initial_test_questions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  word_id INTEGER NOT NULL,
  difficulty_score INTEGER NOT NULL,
  sentence_context TEXT NOT NULL,
  sentence_japanese TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  choice_1 TEXT NOT NULL,
  choice_2 TEXT NOT NULL,
  choice_3 TEXT NOT NULL,
  choice_4 TEXT NOT NULL,
  feedback_for_choice_1 TEXT,
  feedback_for_choice_2 TEXT,
  feedback_for_choice_3 TEXT,
  feedback_for_choice_4 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS initial_test_questions_difficulty_idx
  ON public.initial_test_questions (difficulty_score);

CREATE TABLE IF NOT EXISTS public.user_initial_test_results (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_score INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_details JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_initial_test_results_user_idx
  ON public.user_initial_test_results (user_id);

CREATE TABLE IF NOT EXISTS public.user_initial_test_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  progress JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
