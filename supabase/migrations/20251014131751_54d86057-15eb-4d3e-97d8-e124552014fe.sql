-- ============================================================================
-- ENTERPRISE SKIPS MANAGEMENT SYSTEM
-- ============================================================================

-- 1. Create skips_transactions ledger table (immutable audit trail)
CREATE TABLE public.skips_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_skips INTEGER NOT NULL CHECK (amount_skips > 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'promo', 'tip', 'refund', 'admin_adjustment')),
  reference_id UUID, -- session_id for tips, promo_code_id for promos, etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skips_transactions_from_user ON public.skips_transactions(from_user_id, created_at DESC);
CREATE INDEX idx_skips_transactions_to_user ON public.skips_transactions(to_user_id, created_at DESC);
CREATE INDEX idx_skips_transactions_type ON public.skips_transactions(transaction_type);

-- 2. Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  skips_amount INTEGER NOT NULL CHECK (skips_amount > 0),
  max_redemptions INTEGER,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_promo_codes_code ON public.promo_codes(code) WHERE is_active = true;

-- 3. Create promo_code_redemptions table
CREATE TABLE public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skips_received INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(promo_code_id, user_id)
);

CREATE INDEX idx_promo_redemptions_user ON public.promo_code_redemptions(user_id);

-- 4. Create atomic transfer_skips function
CREATE OR REPLACE FUNCTION public.transfer_skips(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount_skips INTEGER,
  p_transaction_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance INTEGER;
  v_to_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Validate inputs
  IF p_amount_skips <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_amount_skips < 10 AND p_transaction_type = 'tip' THEN
    RAISE EXCEPTION 'Minimum tip is 10 Skips';
  END IF;

  -- Lock and get sender balance
  SELECT balance_skips INTO v_from_balance
  FROM user_balances
  WHERE user_id = p_from_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Initialize if doesn't exist
    INSERT INTO user_balances (user_id, balance_skips)
    VALUES (p_from_user_id, 0)
    RETURNING balance_skips INTO v_from_balance;
  END IF;

  -- Check sufficient balance
  IF v_from_balance < p_amount_skips THEN
    RAISE EXCEPTION 'Insufficient balance. You have % Skips.', v_from_balance;
  END IF;

  -- Lock and get recipient balance
  SELECT balance_skips INTO v_to_balance
  FROM user_balances
  WHERE user_id = p_to_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO user_balances (user_id, balance_skips)
    VALUES (p_to_user_id, 0)
    RETURNING balance_skips INTO v_to_balance;
  END IF;

  -- Atomic balance updates
  UPDATE user_balances
  SET balance_skips = balance_skips - p_amount_skips
  WHERE user_id = p_from_user_id;

  UPDATE user_balances
  SET balance_skips = balance_skips + p_amount_skips
  WHERE user_id = p_to_user_id;

  -- Record transaction
  INSERT INTO skips_transactions (
    from_user_id,
    to_user_id,
    amount_skips,
    transaction_type,
    reference_id,
    metadata
  )
  VALUES (
    p_from_user_id,
    p_to_user_id,
    p_amount_skips,
    p_transaction_type,
    p_reference_id,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_from_balance - p_amount_skips
  );
END;
$$;

-- 5. Create initialize_user_skips function
CREATE OR REPLACE FUNCTION public.initialize_user_skips(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create balance record
  INSERT INTO user_balances (user_id, balance_skips)
  VALUES (p_user_id, 1000)
  ON CONFLICT (user_id) DO NOTHING;

  -- Record transaction
  INSERT INTO skips_transactions (
    to_user_id,
    amount_skips,
    transaction_type,
    metadata
  )
  VALUES (
    p_user_id,
    1000,
    'promo',
    jsonb_build_object('reason', 'new_user_bonus')
  );
END;
$$;

-- 6. Create redeem_promo_code function
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo_code RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Lock and validate promo code
  SELECT * INTO v_promo_code
  FROM promo_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid promo code');
  END IF;

  IF NOT v_promo_code.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code is no longer active');
  END IF;

  IF v_promo_code.expires_at IS NOT NULL AND v_promo_code.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code has expired');
  END IF;

  IF v_promo_code.max_redemptions IS NOT NULL AND v_promo_code.current_redemptions >= v_promo_code.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code has reached max redemptions');
  END IF;

  -- Check if user already redeemed
  IF EXISTS (SELECT 1 FROM promo_code_redemptions WHERE promo_code_id = v_promo_code.id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already redeemed this code');
  END IF;

  -- Add skips to user balance
  INSERT INTO user_balances (user_id, balance_skips)
  VALUES (p_user_id, v_promo_code.skips_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET balance_skips = user_balances.balance_skips + v_promo_code.skips_amount
  RETURNING balance_skips INTO v_new_balance;

  -- Record redemption
  INSERT INTO promo_code_redemptions (promo_code_id, user_id, skips_received)
  VALUES (v_promo_code.id, p_user_id, v_promo_code.skips_amount);

  -- Update promo code redemption count
  UPDATE promo_codes
  SET current_redemptions = current_redemptions + 1
  WHERE id = v_promo_code.id;

  -- Record transaction
  INSERT INTO skips_transactions (
    to_user_id,
    amount_skips,
    transaction_type,
    reference_id,
    metadata
  )
  VALUES (
    p_user_id,
    v_promo_code.skips_amount,
    'promo',
    v_promo_code.id,
    jsonb_build_object('code', p_code)
  );

  RETURN jsonb_build_object(
    'success', true,
    'skips_received', v_promo_code.skips_amount,
    'new_balance', v_new_balance
  );
END;
$$;

-- 7. Update handle_new_user trigger to initialize skips
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_account_type account_type;
BEGIN
  user_account_type := COALESCE(
    (NEW.raw_user_meta_data->>'account_type')::account_type,
    'fan'::account_type
  );

  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_account_type
  );

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

  -- Initialize user with 1000 Skips
  PERFORM public.initialize_user_skips(NEW.id);

  RETURN NEW;
END;
$$;

-- 8. Create creator_ratings_summary view (anonymized)
CREATE OR REPLACE VIEW public.creator_ratings_summary AS
SELECT
  rated_user_id AS creator_id,
  COUNT(*) AS total_ratings,
  ROUND(AVG(rating), 2) AS average_rating,
  COUNT(*) FILTER (WHERE rating >= 4) AS positive_ratings,
  COUNT(*) FILTER (WHERE rating <= 2) AS negative_ratings,
  jsonb_agg(
    jsonb_build_object(
      'rating', rating,
      'comment', comment,
      'tags', tags,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ) AS recent_ratings
FROM session_ratings
GROUP BY rated_user_id;

-- 9. Create get_anonymous_ratings function
CREATE OR REPLACE FUNCTION public.get_anonymous_ratings(p_creator_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  rating NUMERIC,
  comment TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rating, comment, tags, created_at
  FROM session_ratings
  WHERE rated_user_id = p_creator_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- 10. Enable RLS on new tables
ALTER TABLE public.skips_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies for skips_transactions
CREATE POLICY "Users can view their own transactions"
ON public.skips_transactions FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "System can insert transactions"
ON public.skips_transactions FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 12. RLS Policies for promo_codes
CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes FOR ALL
USING ((auth.jwt() ->> 'role') = 'service_role');

-- 13. RLS Policies for promo_code_redemptions
CREATE POLICY "Users can view their own redemptions"
ON public.promo_code_redemptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert redemptions"
ON public.promo_code_redemptions FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 14. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.transfer_skips TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_user_skips TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_anonymous_ratings TO authenticated;