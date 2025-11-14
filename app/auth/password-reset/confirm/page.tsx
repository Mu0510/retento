"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function PasswordResetConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("トークンがありません");
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setStatus("トークンが必要です");
      return;
    }
    if (password.length < 8) {
      setStatus("パスワードは8文字以上にしてください");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "更新に失敗しました");
      }
      setStatus("パスワードを更新しました。ログインしてください。");
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fb] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-900">新しいパスワードを設定</h1>
        <p className="text-sm text-slate-500 mt-2">
          メールで届いたリンクからこのページにお越しください。
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1 text-sm">
            <label className="font-semibold text-slate-600">新しいパスワード</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "更新中…" : "パスワードを更新"}
          </Button>
          {status && <p className="text-sm text-slate-600">{status}</p>}
        </form>
      </div>
    </div>
  );
}
