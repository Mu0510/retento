import { readFileSync } from "node:fs";
import { join } from "node:path";

const systemPromptPath = join(process.cwd(), "generator", "system_prompt.md");
const rawSystemPrompt = readFileSync(systemPromptPath, "utf-8");
const SYSTEM_PROMPT = rawSystemPrompt.trim() || "あなたは英単語学習アプリ「Retento」用の4択問題を生成する専用エンジンです。";

export { SYSTEM_PROMPT };

const parseNumberEnv = (value?: string) => {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parsedMaxCompletionTokens = parseNumberEnv(process.env.OPENAI_MAX_COMPLETION_TOKENS);
const parsedConversationWordLimit = parseNumberEnv(process.env.OPENAI_CONVERSATION_WORD_LIMIT);

export const OPENAI_API_BASE = process.env.OPENAI_API_BASE ?? "https://api.openai.com";
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
export const OPENAI_MAX_COMPLETION_TOKENS =
  parsedMaxCompletionTokens !== undefined && parsedMaxCompletionTokens > 0
    ? Math.floor(parsedMaxCompletionTokens)
    : undefined;
export const OPENAI_CONVERSATION_WORD_LIMIT =
  parsedConversationWordLimit !== undefined && parsedConversationWordLimit > 0
    ? Math.floor(parsedConversationWordLimit)
    : undefined;

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const MAX_CONCURRENT_SESSIONS = Number(process.env.GENERATOR_MAX_CONCURRENT ?? "2");
export const SESSION_WORD_BATCH_SIZE = Number(process.env.GENERATOR_WORDS_PER_SESSION ?? "5");
export const QUESTIONS_PER_WORD = Number(process.env.GENERATOR_QUESTIONS_PER_WORD ?? "10");
export const TAG_POOL =
  process.env.GENERATOR_TAG_POOL?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? ["daily_life", "education", "action"];
