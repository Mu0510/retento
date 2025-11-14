import type { AdapterUser } from "next-auth/adapters";
import type { NextAuthOptions, Session } from "next-auth";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { hasSupabaseAdminConfig, supabaseAdminClient, supabaseAdminConfig } from "./supabase-admin";
import { ensurePublicUser, registerAuthMethod } from "@/lib/services/user-progress";

const formatUserName = (name?: string) => name?.trim() || undefined;

export const authOptions: NextAuthOptions = {
  adapter: hasSupabaseAdminConfig
    ? SupabaseAdapter({
        url: supabaseAdminConfig.url,
        secret: supabaseAdminConfig.secret,
      })
    : undefined,
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
    async signIn({ user, account }) {
      if (!user?.id) return false;
      await ensurePublicUser(user.id);
      if (account) {
        await registerAuthMethod({
          userId: user.id,
          provider: account.provider,
          providerUserId: account.providerAccountId ?? user.id,
          email: user.email ?? undefined,
          isPrimary: account.provider === "credentials",
        });
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user && typeof (user as AdapterUser | undefined)?.id === "string") {
        token.id = token.id ?? (user as AdapterUser).id;
      }
      if (!token.id && typeof token.sub === "string") {
        token.id = token.sub;
      }
      return token;
    },
    async session({ session, token, user }) {
      const normalizedSession: Session & {
        user?: (Session["user"] & { id?: string }) | undefined;
      } = session ?? { user: {} };

      const adapterUser = user as AdapterUser | undefined;
      const candidateIds: Array<string | undefined> = [
        normalizedSession.user?.id as string | undefined,
        typeof token?.id === "string" ? token.id : undefined,
        typeof token?.sub === "string" ? token.sub : undefined,
        typeof adapterUser?.id === "string" ? adapterUser.id : undefined,
      ];

      const userId = candidateIds.find((value) => typeof value === "string" && value.trim().length > 0);
      const email = adapterUser?.email ?? normalizedSession.user?.email ?? token?.email;
      const name = adapterUser?.name ?? normalizedSession.user?.name;

      return {
        ...normalizedSession,
        user: {
          ...(normalizedSession.user ?? {}),
          ...(userId ? { id: userId } : {}),
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
        },
      };
    },
  },
};
