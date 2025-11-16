import { NextResponse } from "next/server";
import { startGeneration } from "@/generator/backend/controller";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parallel = Number(body.parallel ?? 1);
  const startWordId = Number(body.startWordId ?? 2);
  const limit = Number(body.limit ?? 50);
  const patternCount = Number(body.patternCount ?? 10);

  const forceNew = Boolean(body.forceNew);

  try {
    const { processed, sessionId, startWordId: actualStart, limit: actualLimit, patternCount: actualPatternCount, resumed } =
      await startGeneration({
        parallel,
        startWordId,
        limit,
        patternCount,
        resumeExisting: !forceNew,
        metadata: {
          startWordId,
          limit,
          parallel,
          patternCount,
          clientTimestamp: new Date().toISOString(),
        },
      });
    return NextResponse.json({
      success: true,
      processed,
      sessionId,
      startWordId: actualStart,
      limit: actualLimit,
      patternCount: actualPatternCount,
      resumed,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
