-- Fix social_accounts RLS to allow viewing accounts for visible posts
-- This enables new users to see the timeline feed from other creators

-- Drop existing restrictive SELECT policy if it exists
drop policy if exists "Users can only view their own social accounts" on public.social_accounts;
drop policy if exists "Users can view their own social accounts" on public.social_accounts;

-- Create new policy: Allow viewing social accounts for visible content
create policy "Users can view social accounts for visible content"
on public.social_accounts
for select
to authenticated
using (
  -- Users can see their own social accounts
  auth.uid() = user_id
  OR
  -- OR social accounts linked to visible (non-deleted) creator posts
  exists (
    select 1 
    from public.creator_content cc
    where cc.social_account_id = social_accounts.id
      and cc.deleted_at is null
  )
);