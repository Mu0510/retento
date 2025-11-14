import { NextRequest, NextResponse } from "next/server";

import { createPasswordResetToken } from "@/lib/services/password-reset";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "メールアドレスを指定してください" }, { status: 400 });
    }
    const { token } = await createPasswordResetToken(email);
    console.log("[PasswordResetRequest] token", token);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "リクエストに失敗しました" }, { status: 400 });
  }
}
