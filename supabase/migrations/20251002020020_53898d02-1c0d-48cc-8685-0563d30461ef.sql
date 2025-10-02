-- Create enums for inbox system
CREATE TYPE thread_type AS ENUM ('standard', 'priority', 'offer', 'request', 'system');
CREATE TYPE message_type AS ENUM ('text', 'attachment', 'system', 'offer_update', 'payment_receipt');
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'declined', 'countered', 'expired', 'canceled');
CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'accepted', 'refunded', 'released', 'failed');

-- Create threads table
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type thread_type NOT NULL,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_id UUID NULL,
  priority_payment_id UUID NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT,
  unread_count_creator INTEGER NOT NULL DEFAULT 0,
  unread_count_user INTEGER NOT NULL DEFAULT 0,
  is_archived_creator BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived_user BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create offers table
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id UUID UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  duration_minutes INTEGER NOT NULL,
  note TEXT,
  status offer_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create priority_payments table
CREATE TABLE priority_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status payment_status NOT NULL DEFAULT 'pending',
  hold_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL
);

-- Create profile_tags table
CREATE TABLE profile_tags (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, tag_id)
);

-- Add thread_id to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES threads(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mtype message_type NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by_creator BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by_user BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add foreign key to offers
ALTER TABLE threads ADD CONSTRAINT fk_threads_offers FOREIGN KEY (offer_id) REFERENCES offers(id);

-- Create indexes for performance
CREATE INDEX idx_threads_creator_id ON threads(creator_id);
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_type ON threads(type);
CREATE INDEX idx_threads_last_message_at ON threads(last_message_at DESC);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_offers_creator_id ON offers(creator_id);
CREATE INDEX idx_offers_status ON offers(status);

-- Enable RLS
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for threads
CREATE POLICY "Creators can view their threads" ON threads
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can view their threads" ON threads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create threads" ON threads
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "Thread participants can update threads" ON threads
  FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = user_id);

-- RLS Policies for offers
CREATE POLICY "Creators can view their offers" ON offers
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can view their offers" ON offers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create offers" ON offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Offer participants can update" ON offers
  FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = user_id);

-- RLS Policies for priority_payments
CREATE POLICY "Creators can view their priority payments" ON priority_payments
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can view their priority payments" ON priority_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create priority payments" ON priority_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tags
CREATE POLICY "Everyone can view tags" ON tags
  FOR SELECT USING (TRUE);

-- RLS Policies for profile_tags
CREATE POLICY "Users can manage their own tags" ON profile_tags
  FOR ALL USING (auth.uid() = profile_id);

CREATE POLICY "Everyone can view profile tags" ON profile_tags
  FOR SELECT USING (TRUE);

-- Function to get inbox counts for creator
CREATE OR REPLACE FUNCTION creator_inbox_counts(p_creator_id UUID)
RETURNS TABLE (
  standard_unread INTEGER,
  priority_unread INTEGER,
  offers_new INTEGER,
  requests_unread INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'standard' THEN t.unread_count_creator ELSE 0 END)::INTEGER, 0) AS standard_unread,
    COALESCE(SUM(CASE WHEN t.type = 'priority' THEN t.unread_count_creator ELSE 0 END)::INTEGER, 0) AS priority_unread,
    COALESCE(SUM(CASE WHEN t.type = 'offer' AND o.status = 'pending' THEN 1 ELSE 0 END)::INTEGER, 0) AS offers_new,
    COALESCE(SUM(CASE WHEN t.type = 'request' THEN t.unread_count_creator ELSE 0 END)::INTEGER, 0) AS requests_unread
  FROM threads t
  LEFT JOIN offers o ON o.id = t.offer_id
  WHERE t.creator_id = p_creator_id
    AND t.is_archived_creator = FALSE;
END;
$$;

-- Function to update thread on new message
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_rec RECORD;
BEGIN
  -- Get thread info
  SELECT creator_id, user_id INTO v_thread_rec
  FROM threads
  WHERE id = NEW.thread_id;

  -- Update thread last_message_at and preview
  UPDATE threads
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = SUBSTRING(NEW.content, 1, 100),
    -- Increment unread count for the recipient
    unread_count_creator = CASE 
      WHEN NEW.sender_id != v_thread_rec.creator_id THEN unread_count_creator + 1 
      ELSE unread_count_creator 
    END,
    unread_count_user = CASE 
      WHEN NEW.sender_id != v_thread_rec.user_id THEN unread_count_user + 1 
      ELSE unread_count_user 
    END
  WHERE id = NEW.thread_id;

  -- Set read flags based on sender
  IF NEW.sender_id = v_thread_rec.creator_id THEN
    NEW.read_by_creator := TRUE;
    NEW.read_by_user := FALSE;
  ELSE
    NEW.read_by_creator := FALSE;
    NEW.read_by_user := TRUE;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to update thread on new message
DROP TRIGGER IF EXISTS trigger_update_thread_on_message ON messages;
CREATE TRIGGER trigger_update_thread_on_message
  BEFORE INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL)
  EXECUTE FUNCTION update_thread_on_message();

-- Function to mark thread as read
CREATE OR REPLACE FUNCTION mark_thread_read(p_thread_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_creator BOOLEAN;
BEGIN
  -- Check if user is creator or user in this thread
  SELECT creator_id = p_user_id INTO v_is_creator
  FROM threads
  WHERE id = p_thread_id;

  -- Update unread count
  IF v_is_creator THEN
    UPDATE threads SET unread_count_creator = 0 WHERE id = p_thread_id;
    UPDATE messages SET read_by_creator = TRUE WHERE thread_id = p_thread_id;
  ELSE
    UPDATE threads SET unread_count_user = 0 WHERE id = p_thread_id;
    UPDATE messages SET read_by_user = TRUE WHERE thread_id = p_thread_id;
  END IF;
END;
$$;

-- Enable realtime for threads and messages
ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
ALTER PUBLICATION supabase_realtime ADD TABLE priority_payments;