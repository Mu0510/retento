import { NextResponse } from "next/server";
import { logSessionMessage, resetGeneratorData } from "@/generator/backend/supabaseClient";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const reason = body.reason as string | undefined;

  try {
    const result = await resetGeneratorData();
    await logSessionMessage(null, "Generator data reset via dashboard", "info", {
      reason,
    });
    return NextResponse.json({ success: true, result: { reset: result } });
  } catch (error) {
    const err = error as { message?: string; details?: unknown; code?: string; hint?: string };
    const info = {
      message: err.message ?? "unknown error",
      details: err.details,
      code: err.code,
      hint: err.hint,
    };
    await logSessionMessage(null, "Generator reset failed", "error", {
      reason,
      ...info,
    });
    console.error("generator reset failed", reason, info);
    return NextResponse.json({ success: false, error: "reset failed", detail: info }, { status: 500 });
  }
}
