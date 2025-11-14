import { NextRequest, NextResponse } from "next/server";
import { buildSession, type SessionRequestOptions } from "@/lib/session-builder";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const userScore = typeof payload.userScore === "number" ? payload.userScore : Number(payload.userScore ?? 1500);
    if (Number.isNaN(userScore)) {
      return NextResponse.json({ error: "userScore must be a number" }, { status: 400 });
    }
    const sessionSize = payload.sessionSize;
    const reviewIds = Array.isArray(payload.reviewIds)
      ? (payload.reviewIds as unknown[])
          .map((value) => (typeof value === "number" ? value : Number(value)))
          .filter((value): value is number => Number.isFinite(value))
      : undefined;
    const options: SessionRequestOptions = {
      userScore,
      reviewIds,
      sessionSize: typeof sessionSize === "number" ? sessionSize : undefined,
    };
    const plan = buildSession(options);
    return NextResponse.json(plan);
  } catch (error) {
    console.error("failed to build session plan", error);
    return NextResponse.json(
      { error: "Unable to build session plan" },
      { status: 500 },
    );
  }
}
