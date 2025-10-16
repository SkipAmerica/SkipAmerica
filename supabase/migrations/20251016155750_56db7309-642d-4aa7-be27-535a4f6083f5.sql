-- Idempotent uniqueness for (user_id, platform)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'social_accounts_user_platform_uniq'
  ) THEN
    ALTER TABLE public.social_accounts
      ADD CONSTRAINT social_accounts_user_platform_uniq
      UNIQUE (user_id, platform);
  END IF;
END $$;

-- Secure, spoof-proof RPC: creates skip_native account for the
-- *current session user* only (uses auth.uid(); ignores external ids)
CREATE OR REPLACE FUNCTION public.ensure_skip_native_social_account()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  acc_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No authenticated user (auth.uid() is null)';
  END IF;

  INSERT INTO public.social_accounts (user_id, platform, platform_username, platform_user_id)
  VALUES (uid, 'skip_native', CONCAT('user_', LEFT(uid::text, 8)), uid::text)
  ON CONFLICT (user_id, platform)
    DO UPDATE SET platform_username = EXCLUDED.platform_username
  RETURNING id INTO acc_id;

  RETURN acc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_skip_native_social_account() TO authenticated;