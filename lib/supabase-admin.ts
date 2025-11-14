import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const missingSupabaseConfig = !supabaseUrl || !supabaseServiceRoleKey;
export const hasSupabaseAdminConfig = !missingSupabaseConfig;

function createMissingConfigProxy(): SupabaseClient {
  return new Proxy(
    {} as SupabaseClient,
    {
      get() {
        throw new Error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
      },
    },
  );
}

export const supabaseAdminClient: SupabaseClient = missingSupabaseConfig
  ? createMissingConfigProxy()
  : createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

export const supabaseAdminConfig = {
  url: supabaseUrl,
  secret: supabaseServiceRoleKey,
};
