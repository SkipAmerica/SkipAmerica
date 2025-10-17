-- ============================================
-- Fix RLS Recursion with SECURITY DEFINER
-- ============================================

-- 1) Create SECURITY DEFINER helper (bypasses RLS, breaks recursion)
CREATE OR REPLACE FUNCTION public.account_has_visible_content(_social_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creator_content cc
    WHERE cc.social_account_id = _social_account_id
      AND cc.deleted_at IS NULL
  );
$$;

-- 2) Drop the recursive policy
DROP POLICY IF EXISTS "Users can view social accounts for visible content" ON public.social_accounts;

-- 3) Create new non-recursive policy using the helper
CREATE POLICY "Users can view social accounts for visible content"
ON public.social_accounts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR
  public.account_has_visible_content(id)
);

-- 4) Performance index
CREATE INDEX IF NOT EXISTS cc_social_account_id_idx
  ON public.creator_content (social_account_id)
  WHERE deleted_at IS NULL;

-- 5) Grant permissions
GRANT EXECUTE ON FUNCTION public.account_has_visible_content(uuid) TO authenticated;