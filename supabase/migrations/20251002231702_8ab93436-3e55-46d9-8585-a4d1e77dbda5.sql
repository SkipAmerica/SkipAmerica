-- Update the handle_new_user function to create creator records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_account_type account_type;
BEGIN
  -- Extract account type from metadata
  user_account_type := COALESCE(
    (NEW.raw_user_meta_data->>'account_type')::account_type,
    'fan'::account_type
  );

  -- Insert into profiles table
  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_account_type
  );

  -- If creator, also create creator record
  IF user_account_type = 'creator' THEN
    INSERT INTO public.creators (
      id,
      full_name,
      avatar_url,
      profile_completeness
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Creator'),
      NEW.raw_user_meta_data->>'avatar_url',
      0
    );
  END IF;

  RETURN NEW;
END;
$$;