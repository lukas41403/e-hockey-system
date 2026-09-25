-- Sessions, registrations, capacity, waitlist and cancellation rules.

-- ---------------------------------------------------------------------------
-- Internal helpers (not executable by clients)
-- ---------------------------------------------------------------------------

create function private.confirmed_count(p_session_id uuid, p_role public.player_role)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from public.registrations r
  where r.session_id = p_session_id and r.role = p_role and r.status = 'confirmed';
$$;

create function private.role_capacity(p_session public.sessions, p_role public.player_role)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_role when 'skater' then p_session.skater_capacity else p_session.goalie_slots end;
$$;

-- Locks and returns the session; every capacity-changing operation goes through this lock,
-- so concurrent registrations are serialized per session.
create function private.lock_session(p_session_id uuid)
returns public.sessions
language plpgsql
set search_path = ''
as $$
declare
  v_session public.sessions;
begin
  select * into v_session from public.sessions s where s.id = p_session_id for update;
  if not found then
    perform private.fail('SESSION_NOT_FOUND');
  end if;
  return v_session;
end;
$$;

-- A new confirmed registration releases a late cancellation (see DECISIONS.md):
-- own late cancellation first; otherwise, for direct confirmations, the oldest one of the role.
create function private.release_late_cancellation(
  p_session_id uuid,
  p_role public.player_role,
  p_user_id uuid,
  p_direct boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.registrations r
  set status = 'cancelled', cancel_reason = 'late_released'
  where r.session_id = p_session_id and r.user_id = p_user_id and r.status = 'late_cancelled';
  if found or not p_direct then
    return;
  end if;

  select r.id into v_id
  from public.registrations r
  where r.session_id = p_session_id and r.role = p_role and r.status = 'late_cancelled'
  order by r.cancelled_at, r.seq
  limit 1;

  if v_id is not null then
    update public.registrations r
    set status = 'cancelled', cancel_reason = 'late_released'
    where r.id = v_id;
  end if;
end;
$$;

-- Promotes waitlisted players (in registration order) into free spots. Only before the
-- session starts. The caller must hold the session lock.
create function private.fill_from_waitlist(p_session_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_role public.player_role;
  v_next public.registrations;
  v_promoted integer := 0;
begin
  select * into v_session from public.sessions s where s.id = p_session_id;
  if v_session.status <> 'scheduled' or v_session.starts_at <= private.current_ts() then
    return 0;
  end if;

  foreach v_role in array array['skater', 'goalie']::public.player_role[] loop
    while private.confirmed_count(p_session_id, v_role) < private.role_capacity(v_session, v_role) loop
      select * into v_next
      from public.registrations r
      where r.session_id = p_session_id and r.role = v_role and r.status = 'waitlist'
      order by r.created_at, r.seq
      limit 1;
      exit when not found;

      update public.registrations r
      set status = 'confirmed', promoted_at = private.current_ts(), promotion_seen_at = null
      where r.id = v_next.id;
      perform private.release_late_cancellation(p_session_id, v_role, v_next.user_id, false);
      v_promoted := v_promoted + 1;
    end loop;
  end loop;
  return v_promoted;
end;
$$;

create function private.capacity_status(p_session public.sessions, p_role public.player_role)
returns public.registration_status
language sql
stable
set search_path = ''
as $$
  select case
    when private.confirmed_count(p_session.id, p_role) < private.role_capacity(p_session, p_role)
      then 'confirmed'::public.registration_status
    else 'waitlist'::public.registration_status
  end;
$$;

create function private.ensure_guest_membership(p_group_id uuid, p_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  insert into public.group_members (group_id, user_id, role)
  values (p_group_id, p_user_id, 'guest')
  on conflict (group_id, user_id) do nothing;
$$;

create function private.validate_session_fields(
  p_duration_minutes integer,
  p_venue text,
  p_skater_capacity integer,
  p_goalie_slots integer,
  p_ice_cost_cents bigint,
  p_goalie_fee_cents bigint,
  p_pricing_mode public.pricing_mode,
  p_price_per_skater_cents bigint,
  p_rounding_step_cents integer,
  p_cancellation_hours integer,
  p_notes text
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if char_length(trim(coalesce(p_venue, ''))) not between 1 and 120 then
    perform private.fail('VENUE_REQUIRED');
  end if;
  if p_notes is not null and char_length(p_notes) > 500 then
    perform private.fail('NOTES_TOO_LONG');
  end if;
  perform private.validate_group_defaults(
    p_duration_minutes, p_skater_capacity, p_goalie_slots, p_ice_cost_cents, p_goalie_fee_cents,
    p_pricing_mode, p_price_per_skater_cents, p_rounding_step_cents, p_cancellation_hours
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

-- Creates one session, or a weekly series (1-12). Omitted values come from group defaults.
-- Weekly repetition keeps the local wall-clock time across daylight-saving changes.
create function public.create_sessions(
  p_group_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer default null,
  p_venue text default null,
  p_skater_capacity integer default null,
  p_goalie_slots integer default null,
  p_ice_cost_cents bigint default null,
  p_goalie_fee_cents bigint default null,
  p_pricing_mode public.pricing_mode default null,
  p_price_per_skater_cents bigint default null,
  p_rounding_step_cents integer default null,
  p_cancellation_hours integer default null,
  p_notes text default null,
  p_repeat_weeks integer default 1
)
returns setof public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_group public.groups;
  v_duration integer;
  v_venue text;
  v_skaters integer;
  v_goalies integer;
  v_ice bigint;
  v_fee bigint;
  v_mode public.pricing_mode;
  v_price bigint;
  v_step integer;
  v_cancel_hours integer;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_series uuid;
  v_start timestamptz;
  v_session public.sessions;
  i integer;
begin
  perform private.require_group_admin(p_group_id);
  select * into v_group from public.groups g where g.id = p_group_id;

  if p_starts_at is null then
    perform private.fail('START_REQUIRED');
  end if;
  if p_starts_at <= private.current_ts() then
    perform private.fail('SESSION_IN_PAST');
  end if;
  if p_repeat_weeks is null or p_repeat_weeks not between 1 and 12 then
    perform private.fail('INVALID_REPEAT');
  end if;

  v_duration := coalesce(p_duration_minutes, v_group.default_duration_minutes);
  v_venue := trim(coalesce(nullif(trim(coalesce(p_venue, '')), ''), v_group.default_venue));
  v_skaters := coalesce(p_skater_capacity, v_group.default_skater_capacity);
  v_goalies := coalesce(p_goalie_slots, v_group.default_goalie_slots);
  v_ice := coalesce(p_ice_cost_cents, v_group.default_ice_cost_cents);
  v_fee := coalesce(p_goalie_fee_cents, v_group.default_goalie_fee_cents);
  v_mode := coalesce(p_pricing_mode, v_group.default_pricing_mode);
  v_price := case when v_mode = 'fixed'
    then coalesce(p_price_per_skater_cents, v_group.default_price_per_skater_cents) end;
  v_step := coalesce(p_rounding_step_cents, v_group.rounding_step_cents);
  v_cancel_hours := coalesce(p_cancellation_hours, v_group.cancellation_hours);

  perform private.validate_session_fields(
    v_duration, v_venue, v_skaters, v_goalies, v_ice, v_fee, v_mode, v_price, v_step, v_cancel_hours, v_notes
  );

  if p_repeat_weeks > 1 then
    v_series := gen_random_uuid();
  end if;

  for i in 0..(p_repeat_weeks - 1) loop
    v_start := ((p_starts_at at time zone 'Europe/Bratislava') + make_interval(days => 7 * i))
      at time zone 'Europe/Bratislava';
    insert into public.sessions (
      group_id, series_id, starts_at, ends_at, venue, skater_capacity, goalie_slots,
      ice_cost_cents, goalie_fee_cents, pricing_mode, price_per_skater_cents, rounding_step_cents,
      cancellation_hours, notes, created_by
    )
    values (
      p_group_id, v_series, v_start, v_start + make_interval(mins => v_duration), v_venue, v_skaters, v_goalies,
      v_ice, v_fee, v_mode, v_price, v_step, v_cancel_hours, v_notes, v_uid
    )
    returning * into v_session;
    return next v_session;
  end loop;
end;
$$;

create function public.update_session(
  p_session_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_venue text,
  p_skater_capacity integer,
  p_goalie_slots integer,
  p_ice_cost_cents bigint,
  p_goalie_fee_cents bigint,
  p_pricing_mode public.pricing_mode,
  p_price_per_skater_cents bigint,
  p_rounding_step_cents integer,
  p_cancellation_hours integer,
  p_notes text
)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  perform private.require_uid();
  v_session := private.lock_session(p_session_id);
  perform private.require_group_admin(v_session.group_id);

  if v_session.status = 'completed' then
    perform private.fail('SESSION_FINALIZED');
  elsif v_session.status = 'cancelled' then
    perform private.fail('SESSION_CANCELLED');
  end if;
  if p_starts_at is null then
    perform private.fail('START_REQUIRED');
  end if;

  perform private.validate_session_fields(
    p_duration_minutes, p_venue, p_skater_capacity, p_goalie_slots, p_ice_cost_cents, p_goalie_fee_cents,
    p_pricing_mode, p_price_per_skater_cents, p_rounding_step_cents, p_cancellation_hours, v_notes
  );

  if private.confirmed_count(p_session_id, 'skater') > p_skater_capacity
     or private.confirmed_count(p_session_id, 'goalie') > p_goalie_slots then
    perform private.fail('CAPACITY_BELOW_CONFIRMED');
  end if;

  update public.sessions s
  set starts_at = p_starts_at,
      ends_at = p_starts_at + make_interval(mins => p_duration_minutes),
      venue = trim(p_venue),
      skater_capacity = p_skater_capacity,
      goalie_slots = p_goalie_slots,
      ice_cost_cents = p_ice_cost_cents,
      goalie_fee_cents = p_goalie_fee_cents,
      pricing_mode = p_pricing_mode,
      price_per_skater_cents = case when p_pricing_mode = 'fixed' then p_price_per_skater_cents end,
      rounding_step_cents = p_rounding_step_cents,
      cancellation_hours = p_cancellation_hours,
      notes = v_notes
  where s.id = p_session_id
  returning * into v_session;

  perform private.fill_from_waitlist(p_session_id);
  return v_session;
end;
$$;

create function public.cancel_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_session public.sessions;
  v_now timestamptz := private.current_ts();
begin
  v_session := private.lock_session(p_session_id);
  perform private.require_group_admin(v_session.group_id);

  if v_session.status = 'completed' then
    perform private.fail('SESSION_FINALIZED');
  elsif v_session.status = 'cancelled' then
    perform private.fail('SESSION_CANCELLED');
  end if;

  update public.registrations r
  set status = 'cancelled', cancel_reason = 'session_cancelled', cancelled_at = coalesce(r.cancelled_at, v_now)
  where r.session_id = p_session_id and r.status in ('pending', 'confirmed', 'waitlist', 'late_cancelled');

  update public.open_spot_posts p
  set is_active = false, deactivated_at = v_now
  where p.session_id = p_session_id and p.is_active;

  update public.sessions s
  set status = 'cancelled', cancelled_at = v_now, cancelled_by = v_uid
  where s.id = p_session_id
  returning * into v_session;
  return v_session;
end;
$$;

-- ---------------------------------------------------------------------------
-- Registrations
-- ---------------------------------------------------------------------------

-- Registers the caller (or, for admins, any member) for a session. Capacity is enforced
-- under a row lock on the session, so concurrent registrations can never overfill it.
create function public.register_for_session(
  p_session_id uuid,
  p_role public.player_role,
  p_user_id uuid default null
)
returns public.registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_target uuid := coalesce(p_user_id, v_uid);
  v_session public.sessions;
  v_is_admin boolean;
  v_member_role public.member_role;
  v_post public.open_spot_posts;
  v_status public.registration_status;
  v_is_guest boolean;
  v_registration public.registrations;
begin
  if p_role is null then
    perform private.fail('INVALID_ROLE');
  end if;

  v_session := private.lock_session(p_session_id);
  v_is_admin := private.is_group_admin(v_session.group_id);

  if v_target <> v_uid and not v_is_admin then
    perform private.fail('NOT_GROUP_ADMIN');
  end if;
  if v_session.status <> 'scheduled' then
    perform private.fail('REGISTRATION_CLOSED');
  end if;
  if v_session.starts_at <= private.current_ts() and not v_is_admin then
    perform private.fail('REGISTRATION_CLOSED');
  end if;
  if p_role = 'goalie' and v_session.goalie_slots = 0 then
    perform private.fail('NO_GOALIE_SLOTS');
  end if;
  if exists (
    select 1 from public.registrations r
    where r.session_id = p_session_id and r.user_id = v_target and r.status in ('pending', 'confirmed', 'waitlist')
  ) then
    perform private.fail('ALREADY_REGISTERED');
  end if;

  v_member_role := private.member_role(v_session.group_id, v_target);

  -- Keep the waitlist order fair before looking at free spots.
  perform private.fill_from_waitlist(p_session_id);

  if v_target <> v_uid then
    -- Admin adds a member of the group (e.g. someone who asked on WhatsApp).
    if v_member_role is null then
      perform private.fail('NOT_GROUP_MEMBER');
    end if;
    v_is_guest := v_member_role = 'guest';
    v_status := private.capacity_status(v_session, p_role);
  elsif v_member_role in ('admin', 'member') then
    v_is_guest := false;
    v_status := private.capacity_status(v_session, p_role);
  else
    -- Guests and non-members can only join through an active marketplace post.
    select * into v_post from public.open_spot_posts p where p.session_id = p_session_id and p.is_active;
    if not found
       or (p_role = 'skater' and not v_post.offer_skaters)
       or (p_role = 'goalie' and not v_post.offer_goalies) then
      perform private.fail('SPOT_NOT_OFFERED');
    end if;
    v_is_guest := true;
    if v_post.require_approval then
      v_status := 'pending';
    else
      v_status := private.capacity_status(v_session, p_role);
      perform private.ensure_guest_membership(v_session.group_id, v_target);
    end if;
  end if;

  insert into public.registrations (session_id, group_id, user_id, role, status, is_guest, created_by)
  values (p_session_id, v_session.group_id, v_target, p_role, v_status, v_is_guest, v_uid)
  returning * into v_registration;

  if v_status = 'confirmed' then
    perform private.release_late_cancellation(p_session_id, p_role, v_target, true);
  end if;
  return v_registration;
end;
$$;

-- The player cancels their own registration. Before the free-cancellation deadline it is
-- free; after it, the player pays unless a waitlisted player takes the spot.
create function public.cancel_registration(p_registration_id uuid)
returns public.registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_session_id uuid;
  v_session public.sessions;
  v_registration public.registrations;
  v_now timestamptz := private.current_ts();
  v_has_waitlist boolean;
begin
  select r.session_id into v_session_id from public.registrations r where r.id = p_registration_id;
  if v_session_id is null then
    perform private.fail('REGISTRATION_NOT_FOUND');
  end if;
  v_session := private.lock_session(v_session_id);
  select * into v_registration from public.registrations r where r.id = p_registration_id for update;

  if v_registration.user_id <> v_uid then
    perform private.fail('NOT_REGISTRATION_OWNER');
  end if;
  if v_session.status <> 'scheduled' or v_session.starts_at <= v_now then
    perform private.fail('REGISTRATION_CLOSED');
  end if;

  if v_registration.status in ('pending', 'waitlist') then
    update public.registrations r
    set status = 'cancelled', cancel_reason = 'self', cancelled_at = v_now
    where r.id = p_registration_id
    returning * into v_registration;
  elsif v_registration.status = 'confirmed' then
    if v_now < v_session.starts_at - make_interval(hours => v_session.cancellation_hours) then
      update public.registrations r
      set status = 'cancelled', cancel_reason = 'self', cancelled_at = v_now
      where r.id = p_registration_id
      returning * into v_registration;
      perform private.fill_from_waitlist(v_session.id);
    else
      v_has_waitlist := exists (
        select 1 from public.registrations r
        where r.session_id = v_session.id and r.role = v_registration.role and r.status = 'waitlist'
      );
      if v_has_waitlist then
        update public.registrations r
        set status = 'cancelled', cancel_reason = 'replaced', cancelled_at = v_now
        where r.id = p_registration_id
        returning * into v_registration;
        perform private.fill_from_waitlist(v_session.id);
      else
        update public.registrations r
        set status = 'late_cancelled', cancelled_at = v_now
        where r.id = p_registration_id
        returning * into v_registration;
      end if;
    end if;
  else
    perform private.fail('REGISTRATION_NOT_ACTIVE');
  end if;

  return v_registration;
end;
$$;

-- Admin removes a registration without any fee (also waives a late cancellation).
create function public.remove_registration(p_registration_id uuid)
returns public.registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_session public.sessions;
  v_registration public.registrations;
  v_was_confirmed boolean;
begin
  perform private.require_uid();
  select r.session_id into v_session_id from public.registrations r where r.id = p_registration_id;
  if v_session_id is null then
    perform private.fail('REGISTRATION_NOT_FOUND');
  end if;
  v_session := private.lock_session(v_session_id);
  perform private.require_group_admin(v_session.group_id);

  if v_session.status = 'completed' then
    perform private.fail('SESSION_FINALIZED');
  elsif v_session.status = 'cancelled' then
    perform private.fail('SESSION_CANCELLED');
  end if;

  select * into v_registration from public.registrations r where r.id = p_registration_id for update;
  if v_registration.status not in ('pending', 'confirmed', 'waitlist', 'late_cancelled') then
    perform private.fail('REGISTRATION_NOT_ACTIVE');
  end if;
  v_was_confirmed := v_registration.status = 'confirmed';

  update public.registrations r
  set status = 'cancelled', cancel_reason = 'removed', cancelled_at = coalesce(r.cancelled_at, private.current_ts())
  where r.id = p_registration_id
  returning * into v_registration;

  if v_was_confirmed then
    perform private.fill_from_waitlist(v_session.id);
  end if;
  return v_registration;
end;
$$;

create function public.approve_registration(p_registration_id uuid)
returns public.registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_session public.sessions;
  v_registration public.registrations;
  v_status public.registration_status;
begin
  perform private.require_uid();
  select r.session_id into v_session_id from public.registrations r where r.id = p_registration_id;
  if v_session_id is null then
    perform private.fail('REGISTRATION_NOT_FOUND');
  end if;
  v_session := private.lock_session(v_session_id);
  perform private.require_group_admin(v_session.group_id);

  select * into v_registration from public.registrations r where r.id = p_registration_id for update;
  if v_registration.status <> 'pending' then
    perform private.fail('REGISTRATION_NOT_PENDING');
  end if;
  if v_session.status <> 'scheduled' or v_session.starts_at <= private.current_ts() then
    perform private.fail('REGISTRATION_CLOSED');
  end if;

  perform private.fill_from_waitlist(v_session.id);
  v_status := private.capacity_status(v_session, v_registration.role);
  perform private.ensure_guest_membership(v_session.group_id, v_registration.user_id);

  update public.registrations r set status = v_status
  where r.id = p_registration_id
  returning * into v_registration;

  if v_status = 'confirmed' then
    perform private.release_late_cancellation(v_session.id, v_registration.role, v_registration.user_id, true);
  end if;
  return v_registration;
end;
$$;

create function public.reject_registration(p_registration_id uuid)
returns public.registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_session public.sessions;
  v_registration public.registrations;
begin
  perform private.require_uid();
  select r.session_id into v_session_id from public.registrations r where r.id = p_registration_id;
  if v_session_id is null then
    perform private.fail('REGISTRATION_NOT_FOUND');
  end if;
  v_session := private.lock_session(v_session_id);
  perform private.require_group_admin(v_session.group_id);

  select * into v_registration from public.registrations r where r.id = p_registration_id for update;
  if v_registration.status <> 'pending' then
    perform private.fail('REGISTRATION_NOT_PENDING');
  end if;

  update public.registrations r
  set status = 'cancelled', cancel_reason = 'rejected', cancelled_at = private.current_ts()
  where r.id = p_registration_id
  returning * into v_registration;
  return v_registration;
end;
$$;

create function public.mark_promotion_seen(p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  update public.registrations r
  set promotion_seen_at = private.current_ts()
  where r.id = p_registration_id and r.user_id = v_uid and r.promoted_at is not null and r.promotion_seen_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Membership removal (needs the registration helpers above)
-- ---------------------------------------------------------------------------

create function public.remove_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.member_role;
  v_session_id uuid;
  v_now timestamptz := private.current_ts();
begin
  perform private.require_group_admin(p_group_id);
  perform 1 from public.groups g where g.id = p_group_id for update;

  select gm.role into v_role from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id = p_user_id
  for update;
  if v_role is null then
    perform private.fail('NOT_GROUP_MEMBER');
  end if;
  if v_role = 'admin' and (
    select count(*) from public.group_members gm where gm.group_id = p_group_id and gm.role = 'admin'
  ) <= 1 then
    perform private.fail('LAST_ADMIN');
  end if;
  if private.member_balance(p_group_id, p_user_id) <> 0 then
    perform private.fail('MEMBER_HAS_BALANCE');
  end if;

  for v_session_id in
    select distinct r.session_id
    from public.registrations r
    join public.sessions s on s.id = r.session_id
    where r.group_id = p_group_id and r.user_id = p_user_id and s.status = 'scheduled'
      and r.status in ('pending', 'confirmed', 'waitlist', 'late_cancelled')
    order by r.session_id
  loop
    perform private.lock_session(v_session_id);
    update public.registrations r
    set status = 'cancelled', cancel_reason = 'member_removed', cancelled_at = coalesce(r.cancelled_at, v_now)
    where r.session_id = v_session_id and r.user_id = p_user_id
      and r.status in ('pending', 'confirmed', 'waitlist', 'late_cancelled');
    perform private.fill_from_waitlist(v_session_id);
  end loop;

  update public.payments p
  set status = 'cancelled', cancelled_at = v_now
  where p.group_id = p_group_id and p.user_id = p_user_id and p.status in ('pending', 'reported');

  delete from public.group_members gm where gm.group_id = p_group_id and gm.user_id = p_user_id;
end;
$$;
