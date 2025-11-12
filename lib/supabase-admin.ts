import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseAdminConfig = {
  url: supabaseUrl,
  secret: supabaseServiceRoleKey,
};
