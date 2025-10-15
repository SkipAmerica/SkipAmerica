-- === Session Invites: Realtime + RLS Cleanup ===
-- Safe, idempotent cleanup + recreate minimal policies for Realtime broadcasting

-- 1) Ensure Realtime can capture full row data
ALTER TABLE public.session_invites REPLICA IDENTITY FULL;

-- 2) Drop any existing/legacy policies to avoid conflicts
DROP POLICY IF EXISTS "session_invites_select" ON public.session_invites;
DROP POLICY IF EXISTS "session_invites_insert_creator" ON public.session_invites;
DROP POLICY IF EXISTS "session_invites_update_invitee" ON public.session_invites;
DROP POLICY IF EXISTS "Users can view their own invites" ON public.session_invites;
DROP POLICY IF EXISTS "Creators can create invites" ON public.session_invites;
DROP POLICY IF EXISTS "Service role can manage all invites" ON public.session_invites;
DROP POLICY IF EXISTS "Invitees can update their invite status" ON public.session_invites;
DROP POLICY IF EXISTS "invites_select" ON public.session_invites;
DROP POLICY IF EXISTS "invites_insert" ON public.session_invites;
DROP POLICY IF EXISTS "invites_update" ON public.session_invites;
DROP POLICY IF EXISTS "invites_service" ON public.session_invites;

-- 3) Recreate clean, minimal policies
-- SELECT: Invitee OR Creator (via almighty_sessions creator_id)
CREATE POLICY "invites_select"
ON public.session_invites
FOR SELECT
TO authenticated
USING (
  invitee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.almighty_sessions s
    WHERE s.id = session_id AND s.creator_id = auth.uid()
  )
);

-- INSERT: Auth user can insert invites only for sessions they own
CREATE POLICY "invites_insert"
ON public.session_invites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.almighty_sessions s
    WHERE s.id = session_id AND s.creator_id = auth.uid()
  )
);

-- UPDATE: Invitee can update their own invite status
CREATE POLICY "invites_update"
ON public.session_invites
FOR UPDATE
TO authenticated
USING (invitee_id = auth.uid())
WITH CHECK (invitee_id = auth.uid());

-- Service role (edge functions) full control
CREATE POLICY "invites_service"
ON public.session_invites
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4) Ensure table is in realtime publication (no-op if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'session_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_invites;
  END IF;
END $$;