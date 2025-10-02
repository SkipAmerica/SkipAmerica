-- Create creator_onboarding table
CREATE TABLE IF NOT EXISTS public.creator_onboarding (
  creator_id uuid PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
  has_photo boolean NOT NULL DEFAULT false,
  has_display_name boolean NOT NULL DEFAULT false,
  has_tagline boolean NOT NULL DEFAULT false,
  industries_count integer NOT NULL DEFAULT 0,
  percent_complete integer NOT NULL DEFAULT 0,
  search_unlocked boolean NOT NULL DEFAULT false,
  last_nudged_at timestamp with time zone,
  onboarding_skipped boolean NOT NULL DEFAULT false,
  onboarding_completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Creators can view their own onboarding"
  ON public.creator_onboarding
  FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own onboarding"
  ON public.creator_onboarding
  FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own onboarding"
  ON public.creator_onboarding
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "System can manage all onboarding"
  ON public.creator_onboarding
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Function to calculate onboarding progress
CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress(p_creator_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_percent integer := 0;
  v_has_photo boolean;
  v_has_display_name boolean;
  v_has_tagline boolean;
  v_industries_count integer;
BEGIN
  -- Get current status
  SELECT has_photo, has_display_name, has_tagline, industries_count
  INTO v_has_photo, v_has_display_name, v_has_tagline, v_industries_count
  FROM creator_onboarding
  WHERE creator_id = p_creator_id;

  -- Calculate percentage based on weights
  IF v_has_photo THEN
    v_percent := v_percent + 30;
  END IF;

  IF v_has_display_name THEN
    v_percent := v_percent + 20;
  END IF;

  IF v_has_tagline THEN
    v_percent := v_percent + 20;
  END IF;

  IF v_industries_count >= 1 THEN
    v_percent := v_percent + 30;
  END IF;

  RETURN v_percent;
END;
$$;

-- Function to update onboarding progress and search_unlocked status
CREATE OR REPLACE FUNCTION public.update_onboarding_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate new percentage
  NEW.percent_complete := public.calculate_onboarding_progress(NEW.creator_id);
  
  -- Determine if search should be unlocked
  NEW.search_unlocked := NEW.has_photo AND NEW.has_display_name AND NEW.has_tagline AND NEW.industries_count >= 1;
  
  -- Update timestamp
  NEW.updated_at := now();
  
  -- Set completion timestamp if just completed
  IF NEW.search_unlocked AND OLD.search_unlocked = false THEN
    NEW.onboarding_completed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-update progress
CREATE TRIGGER update_creator_onboarding_progress
  BEFORE UPDATE ON public.creator_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_progress();

-- Function to initialize onboarding for new creator
CREATE OR REPLACE FUNCTION public.initialize_creator_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if creator has avatar_url, full_name, headline, and categories
  INSERT INTO public.creator_onboarding (
    creator_id,
    has_photo,
    has_display_name,
    has_tagline,
    industries_count
  ) VALUES (
    NEW.id,
    NEW.avatar_url IS NOT NULL,
    NEW.full_name IS NOT NULL AND NEW.full_name != '',
    NEW.headline IS NOT NULL AND NEW.headline != '',
    COALESCE(array_length(NEW.categories, 1), 0)
  )
  ON CONFLICT (creator_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-initialize onboarding when creator is created
CREATE TRIGGER initialize_onboarding_on_creator_insert
  AFTER INSERT ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_creator_onboarding();