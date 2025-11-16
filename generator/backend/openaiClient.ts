import {
  OPENAI_API_BASE,
  OPENAI_API_KEY,
  OPENAI_CONVERSATION_WORD_LIMIT,
  OPENAI_MAX_COMPLETION_TOKENS,
  OPENAI_MODEL,
  SYSTEM_PROMPT,
} from "./config";
import type { VocabularyEntry } from "./types";
import { buildUserPrompt } from "./promptBuilder";

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIChoice = {
  message?: OpenAIMessage;
};

type OpenAIResponse = {
  choices?: OpenAIChoice[];
};

type ConversationState = {
  messages: OpenAIMessage[];
  wordsUsed: number;
};

const MAX_RETRIES = 3;
const DEFAULT_WORD_LIMIT = 10;
const conversationLimit =
  OPENAI_CONVERSATION_WORD_LIMIT !== undefined && OPENAI_CONVERSATION_WORD_LIMIT > 0
    ? OPENAI_CONVERSATION_WORD_LIMIT
    : DEFAULT_WORD_LIMIT;
const conversationCache = new Map<string, ConversationState>();

export async function requestOpenAIForWord(
  entry: VocabularyEntry,
  tagPool: string[],
  patternCount: number,
  options: { sessionId?: string; workerId?: number | string } = {}
) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured for the generator");
  }

  const key = buildConversationKey(options);
  const state = ensureConversation(key);
  const userMessage: OpenAIMessage = {
    role: "user",
    content: buildUserPrompt(entry, tagPool, patternCount),
  };

  const payload: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages: [...state.messages, userMessage],
  };
  if (OPENAI_MAX_COMPLETION_TOKENS !== undefined) {
    payload.max_completion_tokens = OPENAI_MAX_COMPLETION_TOKENS;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${OPENAI_API_BASE.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES) {
        await sleep(2_000);
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      const data = (await response.json()) as OpenAIResponse;
      const message = data.choices?.[0]?.message?.content ?? "";
      if (!message.trim()) {
        throw new Error("OpenAI returned an empty message");
      }
      state.messages.push(userMessage, { role: "assistant", content: message });
      state.wordsUsed += 1;
      if (state.wordsUsed >= conversationLimit) {
        conversationCache.delete(key);
      }
      return message;
    }

    const detailText = await response.text();
    const detailJson = safeParseJson(detailText) as { error?: { details?: unknown[] } } | null;
    if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
      const retryDelayMs =
        parseRetryDelay(detailJson?.error?.details) ?? parseRetryAfter(response.headers.get("retry-after")) ?? 10_000;
      await sleep(retryDelayMs);
      continue;
    }

    const errorPayload = detailText || "no response body";
    throw new Error(`OpenAI ${response.status} ${response.statusText}: ${errorPayload}`);
  }

  throw lastError ?? new Error("OpenAI request retried too many times");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseRetryDelay(details: unknown): number | null {
  if (!Array.isArray(details)) {
    return null;
  }
  for (const detail of details) {
    if (typeof detail !== "object" || detail === null) continue;
    const retryDelay = (detail as { retryDelay?: string }).retryDelay;
    if (typeof retryDelay === "string") {
      const seconds = parseFloat(retryDelay.replace(/s$/, ""));
      if (!Number.isNaN(seconds)) {
        return Math.floor(seconds * 1000);
      }
    }
  }
  return null;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = parseFloat(value);
  if (Number.isNaN(seconds)) return null;
  return Math.floor(seconds * 1000);
}

function buildConversationKey(options: { sessionId?: string; workerId?: number | string }): string {
  const sessionPart = options.sessionId ?? "global";
  const workerPart = options.workerId ?? "default";
  return `${sessionPart}:${workerPart}`;
}

function ensureConversation(key: string): ConversationState {
  const existing = conversationCache.get(key);
  if (existing) {
    return existing;
  }
  const initial: ConversationState = {
    messages: [{ role: "system", content: SYSTEM_PROMPT }],
    wordsUsed: 0,
  };
  conversationCache.set(key, initial);
  return initial;
}
