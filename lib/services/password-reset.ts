import crypto from "crypto";
import { supabaseAdminClient } from "@/lib/supabase-admin";

const PASSWORD_RESET_TABLE = "password_reset_tokens";
const TOKEN_LIFETIME_MS = 30 * 60 * 1000; // 30 minutes

export async function createPasswordResetToken(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const {
    data: userResponse,
    error: userError,
  } = await supabaseAdminClient.auth.admin.getUserByEmail(normalizedEmail);
  const user = userResponse?.user ?? null;

  if (userError || !user) {
    throw new Error(userError?.message ?? "ユーザーが見つかりませんでした");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString();

  await supabaseAdminClient.from(PASSWORD_RESET_TABLE).delete().eq("user_id", user.id);

  const { error: insertError } = await supabaseAdminClient.from(PASSWORD_RESET_TABLE).insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
  });
  if (insertError) {
    throw new Error(insertError.message);
  }
  return { token, userId: user.id };
}

export async function consumePasswordResetToken(token: string) {
  const { data, error } = await supabaseAdminClient
    .from(PASSWORD_RESET_TABLE)
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("トークンが無効です");
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await supabaseAdminClient.from(PASSWORD_RESET_TABLE).delete().eq("token", token);
    throw new Error("トークンの有効期限が切れています");
  }
  await supabaseAdminClient.from(PASSWORD_RESET_TABLE).delete().eq("token", token);
  return data.user_id;
}

export async function updatePassword(userId: string, password: string) {
  const { error } = await supabaseAdminClient.auth.admin.updateUserById(userId, { password });
  if (error) {
    throw new Error(error.message);
  }
}
