-- Centralized Queue Service V1
-- Atomic remove operation with front detection + session-end cleanup trigger

-- ============================================================================
-- RPC: remove_from_queue_v1
-- Atomically determine if removed fan was at front, then delete
-- ============================================================================
create or replace function public.remove_from_queue_v1(
  p_creator_id uuid,
  p_fan_id     uuid,
  p_reason     text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_front boolean := false;
  v_deleted   int := 0;
  v_front_fan_id uuid;
begin
  -- Lock relevant rows for creator to serialize front calculation under contention
  perform 1 from call_queue where creator_id = p_creator_id for update;

  -- Determine front fan before deletion
  select fan_id into v_front_fan_id
  from call_queue
  where creator_id = p_creator_id
    and status = 'waiting'
  order by priority desc, joined_at asc
  limit 1;

  -- Perform deletion
  delete from call_queue
  where creator_id = p_creator_id
    and fan_id = p_fan_id
    and status in ('waiting', 'in_call');
  
  get diagnostics v_deleted = row_count;

  -- Was the deleted fan at the front?
  v_was_front := (v_front_fan_id = p_fan_id);

  return jsonb_build_object(
    'success', v_deleted > 0,
    'removed_was_front', coalesce(v_was_front, false)
  );
end;
$$;

-- ============================================================================
-- Trigger: Cleanup queue entry when session ends
-- Safety net for app-level cleanup failures
-- ============================================================================
create or replace function public.cleanup_queue_on_session_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- When session transitions to 'ended', remove associated queue entry
  if NEW.status = 'ended' and OLD.status is distinct from 'ended' then
    delete from call_queue
    where creator_id = NEW.creator_id
      and fan_id = NEW.fan_id
      and status in ('waiting', 'in_call');
  end if;
  
  return NEW;
end;
$$;

create trigger trg_cleanup_queue_on_session_end
  after update on almighty_sessions
  for each row
  when (NEW.status = 'ended' and OLD.status is distinct from 'ended')
  execute function cleanup_queue_on_session_end();