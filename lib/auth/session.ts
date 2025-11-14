import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { authOptions } from "@/lib/auth";

const USER_ID_COOKIE_NAME = "retento-user-id";
const USER_ID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type SessionWithOptionalId = Session & {
  user?: (Session["user"] & { id?: string }) | null;
};

export type SessionWithUserId = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

export class UnauthorizedError extends Error {
  constructor(message = "認証が必要です") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function getSessionUser() {
  const session = (await getServerSession(authOptions)) as SessionWithOptionalId | null;
  const userId = normalizeUserId(session?.user?.id);

  await synchronizeUserIdCookie(userId);

  return { session, userId };
}

export async function requireSessionUser(): Promise<{ session: SessionWithUserId; userId: string }> {
  const { session, userId } = await getSessionUser();
  if (!session || !userId) {
    throw new UnauthorizedError();
  }
  return {
    session: {
      ...session,
      user: {
        ...(session.user ?? {}),
        id: userId,
      },
    } as SessionWithUserId,
    userId,
  };
}

function normalizeUserId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function synchronizeUserIdCookie(userId: string | null) {
  try {
    const cookieStore = await cookies();
    if (userId) {
      const existing = cookieStore.get(USER_ID_COOKIE_NAME)?.value;
      if (existing !== userId) {
        cookieStore.set(USER_ID_COOKIE_NAME, userId, {
          maxAge: USER_ID_COOKIE_MAX_AGE_SECONDS,
          sameSite: "lax",
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });
      }
    } else if (cookieStore.get(USER_ID_COOKIE_NAME)) {
      cookieStore.delete(USER_ID_COOKIE_NAME);
    }
  } catch (error) {
    console.warn("[AuthSession] Failed to synchronize user id cookie", error);
  }
}

export const SESSION_USER_ID_COOKIE = USER_ID_COOKIE_NAME;
