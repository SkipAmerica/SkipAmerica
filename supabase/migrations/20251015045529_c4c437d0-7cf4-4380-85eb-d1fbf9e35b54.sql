-- Fix session_invites realtime events
-- This migration resolves the issue where fans don't receive session invites

-- Fix 1: Set REPLICA IDENTITY FULL to capture complete row data for realtime
ALTER TABLE public.session_invites REPLICA IDENTITY FULL;

-- Fix 2: Add RLS policies (required for realtime to publish events)

-- Policy: Users can view their own invites
CREATE POLICY "Users can view their own invites"
ON public.session_invites
FOR SELECT
TO authenticated
USING (invitee_id = auth.uid());

-- Policy: Creators can create invites through sessions they own
CREATE POLICY "Creators can create invites"
ON public.session_invites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.almighty_sessions
    WHERE id = session_id
    AND creator_id = auth.uid()
  )
);

-- Policy: Service role can manage all (for system operations via edge functions)
CREATE POLICY "Service role can manage all invites"
ON public.session_invites
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Invitees can update status of their own invites
CREATE POLICY "Invitees can update their invite status"
ON public.session_invites
FOR UPDATE
TO authenticated
USING (invitee_id = auth.uid())
WITH CHECK (invitee_id = auth.uid());