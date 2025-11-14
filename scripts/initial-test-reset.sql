-- delete user-related auth tables but keep vocabulary/problem tables intact
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'user_initial_test_progress' AND n.nspname = 'public') THEN
    EXECUTE 'TRUNCATE TABLE public.user_initial_test_progress CASCADE';
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'user_initial_test_results' AND n.nspname = 'public') THEN
    EXECUTE 'TRUNCATE TABLE public.user_initial_test_results CASCADE';
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'user_word_confidences' AND n.nspname = 'public') THEN
    EXECUTE 'TRUNCATE TABLE public.user_word_confidences CASCADE';
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'user_profiles' AND n.nspname = 'public') THEN
    EXECUTE 'TRUNCATE TABLE public.user_profiles CASCADE';
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'sessions' AND n.nspname = 'next_auth') THEN
    EXECUTE 'TRUNCATE TABLE next_auth.sessions CASCADE';
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'users' AND n.nspname = 'next_auth') THEN
    EXECUTE 'TRUNCATE TABLE next_auth.users CASCADE';
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'users' AND n.nspname = 'auth') THEN
    EXECUTE 'TRUNCATE TABLE auth.users CASCADE';
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'refresh_tokens' AND n.nspname = 'auth') THEN
    EXECUTE 'TRUNCATE TABLE auth.refresh_tokens CASCADE';
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'auth_methods' AND n.nspname = 'public') THEN
    EXECUTE 'TRUNCATE TABLE public.auth_methods CASCADE';
  END IF;
END$$;
COMMIT;
