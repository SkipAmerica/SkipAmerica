-- =============================================
-- Phase 1: Session Management Tables
-- =============================================

-- Create user_sessions table for single source of truth
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  device_info jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  ended_at timestamptz,
  end_reason text
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON public.user_sessions(email) WHERE is_active = true;

-- RLS policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.user_sessions;
CREATE POLICY "Service role can manage all sessions"
  ON public.user_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- Phase 2: Email Uniqueness
-- =============================================

-- Add email column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'profiles' 
                 AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
END $$;

-- Backfill emails from auth.users
UPDATE public.profiles p
SET email = (SELECT email FROM auth.users WHERE id = p.id)
WHERE email IS NULL;

-- Add unique constraint on email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- =============================================
-- Phase 3: Session Management Functions
-- =============================================

CREATE OR REPLACE FUNCTION public.create_user_session(
  p_user_id uuid,
  p_session_token text,
  p_email text,
  p_device_info jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- End all other active sessions for this user (single session per user)
  UPDATE user_sessions
  SET is_active = false,
      ended_at = now(),
      end_reason = 'new_session_created'
  WHERE user_id = p_user_id
    AND is_active = true;
  
  -- Create new session
  INSERT INTO user_sessions (
    user_id,
    session_token,
    email,
    expires_at,
    device_info
  ) VALUES (
    p_user_id,
    p_session_token,
    p_email,
    now() + interval '7 days',
    p_device_info
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_user_session(
  p_session_token text,
  p_reason text DEFAULT 'manual_signout'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = false,
      ended_at = now(),
      end_reason = p_reason
  WHERE session_token = p_session_token
    AND is_active = true;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_user_session(
  p_session_token text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_sessions
    WHERE session_token = p_session_token
      AND user_id = p_user_id
      AND is_active = true
      AND expires_at > now()
  );
END;
$$;

-- =============================================
-- Phase 4: Audit Logging Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  email text,
  session_token text,
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON public.auth_audit_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON public.auth_audit_log(event_type, timestamp DESC);

-- RLS for audit log (admin only)
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.auth_audit_log;
CREATE POLICY "Service role can manage audit logs"
  ON public.auth_audit_log FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');