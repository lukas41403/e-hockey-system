-- Marketplace of open spots, reporting views and realtime.

-- ---------------------------------------------------------------------------
-- Marketplace
-- ---------------------------------------------------------------------------

create function public.publish_open_spots(
  p_session_id uuid,
  p_offer_skaters boolean,
  p_offer_goalies boolean,
  p_require_approval boolean default true,
  p_note text default null
)
returns public.open_spot_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_session public.sessions;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_now timestamptz := private.current_ts();
  v_post public.open_spot_posts;
begin
  v_session := private.lock_session(p_session_id);
  perform private.require_group_admin(v_session.group_id);

  if v_session.status <> 'scheduled' or v_session.starts_at <= v_now then
    perform private.fail('REGISTRATION_CLOSED');
  end if;
  if not coalesce(p_offer_skaters, false) and not coalesce(p_offer_goalies, false) then
    perform private.fail('NOTHING_OFFERED');
  end if;
  if coalesce(p_offer_goalies, false) and v_session.goalie_slots = 0 then
    perform private.fail('NO_GOALIE_SLOTS');
  end if;
  if v_note is not null and char_length(v_note) > 280 then
    perform private.fail('NOTE_TOO_LONG');
  end if;

  update public.open_spot_posts p set is_active = false, deactivated_at = v_now
  where p.session_id = p_session_id and p.is_active;

  insert into public.open_spot_posts (session_id, offer_skaters, offer_goalies, require_approval, note, created_by)
  values (p_session_id, coalesce(p_offer_skaters, false), coalesce(p_offer_goalies, false),
          coalesce(p_require_approval, true), v_note, v_uid)
  returning * into v_post;
  return v_post;
end;
$$;

create function public.unpublish_open_spots(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  perform private.require_uid();
  select s.group_id into v_group_id from public.sessions s where s.id = p_session_id;
  if v_group_id is null then
    perform private.fail('SESSION_NOT_FOUND');
  end if;
  perform private.require_group_admin(v_group_id);
  update public.open_spot_posts p set is_active = false, deactivated_at = private.current_ts()
  where p.session_id = p_session_id and p.is_active;
end;
$$;

-- Occupancy and price information of a post, computed from registrations (never stored).
-- Internal: callers decide which columns to expose.
create function private.post_details(p_post_id uuid)
returns table (
  post_id uuid,
  session_id uuid,
  group_id uuid,
  group_name text,
  city text,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  offer_skaters boolean,
  offer_goalies boolean,
  require_approval boolean,
  note text,
  skater_capacity integer,
  goalie_slots integer,
  confirmed_skaters integer,
  confirmed_goalies integer,
  free_skater_spots integer,
  free_goalie_spots integer,
  pricing_mode public.pricing_mode,
  price_per_skater_cents bigint,
  estimated_price_cents bigint,
  estimated_full_price_cents bigint,
  goalie_fee_cents bigint,
  currency public.currency_code,
  is_available boolean
)
language sql
stable
set search_path = ''
as $$
  with base as (
    select p.*, s.group_id as s_group_id, s.starts_at as s_starts_at, s.ends_at as s_ends_at, s.venue as s_venue,
      s.status as s_status, s.skater_capacity as s_skater_capacity, s.goalie_slots as s_goalie_slots,
      s.pricing_mode as s_pricing_mode, s.price_per_skater_cents as s_price, s.ice_cost_cents as s_ice,
      s.goalie_fee_cents as s_fee, s.rounding_step_cents as s_step,
      g.name as g_name, g.city as g_city, g.currency as g_currency,
      (select count(*)::integer from public.registrations r
        where r.session_id = s.id and r.role = 'skater' and r.status = 'confirmed') as c_skaters,
      (select count(*)::integer from public.registrations r
        where r.session_id = s.id and r.role = 'goalie' and r.status = 'confirmed') as c_goalies,
      (select count(*)::integer from public.registrations r
        where r.session_id = s.id and r.role = 'skater' and r.status = 'late_cancelled') as lc_skaters
    from public.open_spot_posts p
    join public.sessions s on s.id = p.session_id
    join public.groups g on g.id = s.group_id
    where p.id = p_post_id
  )
  select
    b.id, b.session_id, b.s_group_id, b.g_name, b.g_city, b.s_venue, b.s_starts_at, b.s_ends_at,
    b.offer_skaters, b.offer_goalies, b.require_approval, b.note,
    b.s_skater_capacity, b.s_goalie_slots, b.c_skaters, b.c_goalies,
    greatest(b.s_skater_capacity - b.c_skaters, 0),
    greatest(b.s_goalie_slots - b.c_goalies, 0),
    b.s_pricing_mode,
    case when b.s_pricing_mode = 'fixed' then b.s_price end,
    -- Estimate if one more skater joins, with the currently registered goalies.
    private.skater_price(b.s_pricing_mode, b.s_price, b.s_ice, b.s_fee, b.c_goalies,
      b.c_skaters + b.lc_skaters + 1, b.s_step),
    private.skater_price(b.s_pricing_mode, b.s_price, b.s_ice, b.s_fee, b.s_goalie_slots,
      b.s_skater_capacity, b.s_step),
    b.s_fee,
    b.g_currency,
    b.is_active and b.s_status = 'scheduled' and b.s_starts_at > private.current_ts() and (
      (b.offer_skaters and b.c_skaters < b.s_skater_capacity)
      or (b.offer_goalies and b.c_goalies < b.s_goalie_slots)
    )
  from base b;
$$;

create function public.list_open_spots(
  p_city text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_role public.player_role default null
)
returns table (
  post_id uuid,
  session_id uuid,
  group_id uuid,
  group_name text,
  city text,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  offer_skaters boolean,
  offer_goalies boolean,
  require_approval boolean,
  note text,
  skater_capacity integer,
  goalie_slots integer,
  free_skater_spots integer,
  free_goalie_spots integer,
  pricing_mode public.pricing_mode,
  price_per_skater_cents bigint,
  estimated_price_cents bigint,
  estimated_full_price_cents bigint,
  goalie_fee_cents bigint,
  currency public.currency_code,
  is_member boolean,
  my_registration_status public.registration_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  return query
  select d.post_id, d.session_id, d.group_id, d.group_name, d.city, d.venue, d.starts_at, d.ends_at,
    d.offer_skaters, d.offer_goalies, d.require_approval, d.note, d.skater_capacity, d.goalie_slots,
    case when d.offer_skaters then d.free_skater_spots end,
    case when d.offer_goalies then d.free_goalie_spots end,
    d.pricing_mode, d.price_per_skater_cents, d.estimated_price_cents, d.estimated_full_price_cents,
    case when d.offer_goalies then d.goalie_fee_cents end,
    d.currency,
    exists (
      select 1 from public.group_members gm
      where gm.group_id = d.group_id and gm.user_id = v_uid and gm.role in ('admin', 'member')
    ),
    (select r.status from public.registrations r
      where r.session_id = d.session_id and r.user_id = v_uid and r.status in ('pending', 'confirmed', 'waitlist')
      limit 1)
  from public.open_spot_posts p
  cross join lateral private.post_details(p.id) d
  where p.is_active
    and d.is_available
    and (p_city is null or lower(d.city) = lower(trim(p_city)))
    and (p_date_from is null or (d.starts_at at time zone 'Europe/Bratislava')::date >= p_date_from)
    and (p_date_to is null or (d.starts_at at time zone 'Europe/Bratislava')::date <= p_date_to)
    and (
      p_role is null
      or (p_role = 'skater' and d.offer_skaters and d.free_skater_spots > 0)
      or (p_role = 'goalie' and d.offer_goalies and d.free_goalie_spots > 0)
    )
  order by d.starts_at, d.group_name;
end;
$$;

create function public.list_open_spot_cities()
returns table (city text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_uid();
  return query
  select distinct d.city
  from public.open_spot_posts p
  cross join lateral private.post_details(p.id) d
  where p.is_active and d.is_available
  order by d.city;
end;
$$;

-- Public (also anonymous) view of a single post, with a deliberately limited set of fields:
-- no names of players, no contacts, no bank data.
create function public.get_public_post(p_post_id uuid)
returns table (
  post_id uuid,
  session_id uuid,
  group_name text,
  city text,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  offer_skaters boolean,
  offer_goalies boolean,
  require_approval boolean,
  note text,
  free_skater_spots integer,
  free_goalie_spots integer,
  pricing_mode public.pricing_mode,
  price_per_skater_cents bigint,
  estimated_price_cents bigint,
  estimated_full_price_cents bigint,
  goalie_fee_cents bigint,
  currency public.currency_code,
  is_available boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.post_id, d.session_id, d.group_name, d.city, d.venue, d.starts_at, d.ends_at,
    d.offer_skaters, d.offer_goalies, d.require_approval, d.note,
    case when d.offer_skaters then d.free_skater_spots end,
    case when d.offer_goalies then d.free_goalie_spots end,
    d.pricing_mode, d.price_per_skater_cents, d.estimated_price_cents, d.estimated_full_price_cents,
    case when d.offer_goalies then d.goalie_fee_cents end,
    d.currency, d.is_available
  from private.post_details(p_post_id) d;
$$;

-- ---------------------------------------------------------------------------
-- Reporting views (security_invoker: RLS of the caller applies)
-- ---------------------------------------------------------------------------

-- Balance = sum of ledger entries. A member sees their own rows, an admin all rows of the group.
create view public.member_balances
with (security_invoker = true)
as
select gm.group_id, gm.user_id, coalesce(sum(le.amount_cents), 0)::bigint as balance_cents
from public.group_members gm
left join public.ledger_entries le on le.group_id = gm.group_id and le.user_id = gm.user_id
where gm.user_id = (select auth.uid()) or private.is_group_admin(gm.group_id)
group by gm.group_id, gm.user_id;

-- Ledger entries classified by their origin (a reversal counts toward the type it reverses).
create view public.ledger_entries_classified
with (security_invoker = true)
as
select le.*, coalesce(orig.type, le.type) as origin_type
from public.ledger_entries le
left join public.ledger_entries orig on orig.id = le.reverses_entry_id;

-- Per-member finance table for admins.
create view public.member_finance
with (security_invoker = true)
as
select gm.group_id, gm.user_id, gm.role,
  count(distinct e.session_id) filter (where e.origin_type in ('charge', 'goalie_earning') and not exists (
    select 1 from public.ledger_entries x where x.reverses_entry_id = e.id
  ) and e.type <> 'reversal')::integer as sessions_count,
  coalesce(sum(e.amount_cents) filter (where e.origin_type = 'topup'), 0)::bigint as paid_cents,
  coalesce(-sum(e.amount_cents) filter (where e.origin_type = 'charge'), 0)::bigint as charged_cents,
  coalesce(sum(e.amount_cents) filter (where e.origin_type = 'goalie_earning'), 0)::bigint as goalie_earned_cents,
  coalesce(-sum(e.amount_cents) filter (where e.origin_type = 'goalie_payout'), 0)::bigint as goalie_paid_out_cents,
  coalesce(sum(e.amount_cents) filter (where e.origin_type = 'adjustment'), 0)::bigint as adjustments_cents,
  coalesce(sum(e.amount_cents), 0)::bigint as balance_cents
from public.group_members gm
left join public.ledger_entries_classified e on e.group_id = gm.group_id and e.user_id = gm.user_id
where private.is_group_admin(gm.group_id)
group by gm.group_id, gm.user_id, gm.role;

-- Occupancy of every session (visible to whoever can see its registrations) and, for admins,
-- the financial result of completed sessions: charged - ice - goalie earnings.
create view public.session_summaries
with (security_invoker = true)
as
select s.id as session_id, s.group_id, s.starts_at, s.status,
  count(r.id) filter (where r.role = 'skater' and r.status = 'confirmed')::integer as confirmed_skaters,
  count(r.id) filter (where r.role = 'goalie' and r.status = 'confirmed')::integer as confirmed_goalies,
  count(r.id) filter (where r.role = 'skater' and r.status = 'waitlist')::integer as waitlist_skaters,
  count(r.id) filter (where r.role = 'goalie' and r.status = 'waitlist')::integer as waitlist_goalies,
  count(r.id) filter (where r.status = 'pending')::integer as pending_count,
  count(r.id) filter (where r.role = 'skater' and r.status = 'late_cancelled')::integer as late_cancelled_skaters,
  count(r.id) filter (where r.role = 'skater' and r.status = 'confirmed' and r.attended)::integer as attended_skaters,
  count(r.id) filter (where r.role = 'goalie' and r.status = 'confirmed' and r.attended)::integer as attended_goalies,
  fin.charged_cents,
  case when s.status = 'completed' and private.is_group_admin(s.group_id) then s.ice_cost_cents end as ice_cost_cents,
  fin.goalie_earnings_cents,
  case when s.status = 'completed' and private.is_group_admin(s.group_id)
    then fin.charged_cents - s.ice_cost_cents - fin.goalie_earnings_cents end as result_cents
from public.sessions s
left join public.registrations r on r.session_id = s.id
left join lateral (
  select
    coalesce(-sum(e.amount_cents) filter (where e.origin_type = 'charge'), 0)::bigint as charged_cents,
    coalesce(sum(e.amount_cents) filter (where e.origin_type = 'goalie_earning'), 0)::bigint as goalie_earnings_cents
  from public.ledger_entries_classified e
  where e.session_id = s.id and s.status = 'completed' and private.is_group_admin(s.group_id)
) fin on s.status = 'completed' and private.is_group_admin(s.group_id)
group by s.id, fin.charged_cents, fin.goalie_earnings_cents;

-- Group totals for admins.
-- cash_available = collected - paid_out - ice_total, and the invariant
-- cash_available = balances_total + sessions_result_total - adjustments_total must always hold.
create view public.group_finance_summary
with (security_invoker = true)
as
select g.id as group_id, g.currency,
  coalesce(pay.collected_cents, 0)::bigint as collected_cents,
  coalesce(pay.paid_out_cents, 0)::bigint as paid_out_cents,
  coalesce(ses.ice_total_cents, 0)::bigint as ice_total_cents,
  (coalesce(pay.collected_cents, 0) - coalesce(pay.paid_out_cents, 0) - coalesce(ses.ice_total_cents, 0))::bigint
    as cash_available_cents,
  coalesce(bal.debts_cents, 0)::bigint as debts_cents,
  coalesce(bal.credits_cents, 0)::bigint as credits_cents,
  coalesce(bal.balances_total_cents, 0)::bigint as balances_total_cents,
  coalesce(res.sessions_result_cents, 0)::bigint as sessions_result_cents,
  coalesce(adj.adjustments_cents, 0)::bigint as adjustments_cents,
  coalesce(pend.reported_count, 0)::integer as reported_payments_count
from public.groups g
left join lateral (
  select
    sum(p.amount_cents) filter (where p.direction = 'incoming') as collected_cents,
    sum(p.amount_cents) filter (where p.direction = 'outgoing') as paid_out_cents
  from public.payments p
  where p.group_id = g.id and p.status = 'confirmed'
) pay on true
left join lateral (
  select sum(s.ice_cost_cents) as ice_total_cents
  from public.sessions s
  where s.group_id = g.id and s.status = 'completed'
) ses on true
left join lateral (
  select
    -sum(b.balance) filter (where b.balance < 0) as debts_cents,
    sum(b.balance) filter (where b.balance > 0) as credits_cents,
    sum(b.balance) as balances_total_cents
  from (
    select sum(le.amount_cents) as balance
    from public.ledger_entries le
    where le.group_id = g.id
    group by le.user_id
  ) b
) bal on true
left join lateral (
  select sum(ss.result_cents) as sessions_result_cents
  from public.session_summaries ss
  where ss.group_id = g.id and ss.status = 'completed'
) res on true
left join lateral (
  select sum(le.amount_cents) as adjustments_cents
  from public.ledger_entries le
  where le.group_id = g.id and le.type = 'adjustment'
) adj on true
left join lateral (
  select count(*) as reported_count
  from public.payments p
  where p.group_id = g.id and p.direction = 'incoming' and p.status = 'reported'
) pend on true
where private.is_group_admin(g.id);

-- ---------------------------------------------------------------------------
-- Realtime: session detail and lists refresh when registrations change.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.registrations, public.sessions, public.payments;
