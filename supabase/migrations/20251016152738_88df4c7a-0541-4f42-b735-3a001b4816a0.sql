-- Enable RLS on social_accounts
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own social_accounts" ON public.social_accounts;
CREATE POLICY "users can read own social_accounts"
ON public.social_accounts FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users can insert own social_accounts" ON public.social_accounts;
CREATE POLICY "users can insert own social_accounts"
ON public.social_accounts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users can update own social_accounts" ON public.social_accounts;
CREATE POLICY "users can update own social_accounts"
ON public.social_accounts FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Helper function to ensure skip_native account exists
CREATE OR REPLACE FUNCTION public.ensure_skip_native_social_account(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.social_accounts (user_id, platform, platform_username, platform_user_id)
  VALUES (p_user_id, 'skip_native', CONCAT('user_', LEFT(p_user_id::text, 8)), p_user_id::text)
  ON CONFLICT (user_id, platform) DO NOTHING;
END;
$$;

-- Trigger function for new profiles
CREATE OR REPLACE FUNCTION public.tg_profiles_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_skip_native_social_account(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_after_insert ON public.profiles;
CREATE TRIGGER profiles_after_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_after_insert();

-- Backfill existing users
INSERT INTO public.social_accounts (user_id, platform, platform_username, platform_user_id)
SELECT p.id, 'skip_native', CONCAT('user_', LEFT(p.id::text, 8)), p.id::text
FROM public.profiles p
LEFT JOIN public.social_accounts sa ON sa.user_id = p.id AND sa.platform = 'skip_native'
WHERE sa.id IS NULL;