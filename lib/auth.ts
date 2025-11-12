import type { NextAuthOptions } from "next-auth";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdminClient, supabaseAdminConfig } from "./supabase-admin";

const formatUserName = (name?: string) => name?.trim() || undefined;

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: supabaseAdminConfig.url,
    secret: supabaseAdminConfig.secret,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "メールアドレス / パスワード",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;
        if (!email || !password) {
          throw new Error("メールアドレスとパスワードを入力してください");
        }

        const { data, error } = await supabaseAdminClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          throw new Error(error?.message ?? "認証に失敗しました");
        }

        return {
          id: data.user.id,
          email: data.user.email ?? undefined,
          name:
            formatUserName(data.user.user_metadata?.full_name ?? data.user.user_metadata?.name) ??
            data.user.email ??
            undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = token.id ?? user.id;
      }
      return token;
    },
    async session({ session, token }) {
      const normalizedSession = session ?? { user: {} };
      const userId = (token?.id ?? normalizedSession.user?.id) as string | undefined;
      return {
        ...normalizedSession,
        user: {
          ...(normalizedSession.user ?? {}),
          ...(userId ? { id: userId } : {}),
        },
      };
    },
  },
};
