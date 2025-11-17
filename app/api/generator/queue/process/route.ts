import { NextResponse } from "next/server";
import { processRegenerationQueue } from "@/generator/backend/regenerationQueue";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    parallel?: unknown;
    patternCount?: unknown;
  };
  const parallel = typeof body.parallel === "number" ? body.parallel : Number(body.parallel ?? 2);
  const patternCount =
    typeof body.patternCount === "number" ? body.patternCount : Number(body.patternCount ?? 10);

  try {
    const result = await processRegenerationQueue(parallel, patternCount);
    return NextResponse.json({
      success: true,
      processed: result.processed,
      sessionId: result.sessionId,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
