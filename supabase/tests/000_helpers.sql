-- Test helpers shared by all pgTAP files. This file commits so the helpers persist in the
-- local database; every other test file runs inside a transaction that is rolled back.
begin;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

-- Creates an auth user (the trigger creates the profile). With a name, the profile is onboarded.
create or replace function tests.create_user(p_email text, p_full_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email, '',
    now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );
  if p_full_name is not null then
    update public.profiles set full_name = p_full_name, onboarded_at = now() where id = v_id;
  end if;
  return v_id;
end;
$$;

-- Impersonates a user for auth.uid() (function calls). For RLS checks additionally run
-- `set local role authenticated`.
create or replace function tests.act_as(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user_id::text, ''), true);
  perform set_config(
    'request.jwt.claims',
    case when p_user_id is null then '{"role":"anon"}'
      else json_build_object('sub', p_user_id, 'role', 'authenticated')::text end,
    true
  );
end;
$$;

-- Pins the business clock (honoured only for direct postgres sessions).
create or replace function tests.set_now(p_ts timestamptz)
returns void
language sql
set search_path = ''
as $$
  select set_config('app.now', p_ts::text, true);
$$;

-- A group with the given admin (IBAN is a valid test IBAN).
create or replace function tests.create_group(
  p_admin uuid,
  p_name text default 'Testovacia partička',
  p_country public.country_code default 'SK',
  p_pricing_mode public.pricing_mode default 'dynamic',
  p_ice_cost_cents bigint default 18000,
  p_goalie_fee_cents bigint default 1500,
  p_skater_capacity integer default 20,
  p_price_per_skater_cents bigint default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_group public.groups;
begin
  perform tests.act_as(p_admin);
  v_group := public.create_group(
    p_name => p_name,
    p_city => case p_country when 'SK' then 'Nitra' else 'Brno' end,
    p_country => p_country,
    p_iban => case p_country when 'SK' then 'SK3112000000198742637541' else 'CZ6508000000192000145399' end,
    p_account_holder_name => 'Testovací Admin',
    p_default_venue => 'Zimný štadión',
    p_default_skater_capacity => p_skater_capacity,
    p_default_ice_cost_cents => p_ice_cost_cents,
    p_default_goalie_fee_cents => p_goalie_fee_cents,
    p_default_pricing_mode => p_pricing_mode,
    p_default_price_per_skater_cents => p_price_per_skater_cents
  );
  return v_group.id;
end;
$$;

-- Adds users as members through the invite code.
create or replace function tests.join(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform tests.act_as(p_user_id);
  perform public.join_group((select g.invite_code from public.groups g where g.id = p_group_id));
end;
$$;

create or replace function tests.create_session(
  p_admin uuid,
  p_group_id uuid,
  p_starts_at timestamptz,
  p_skater_capacity integer default null,
  p_goalie_slots integer default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_session public.sessions;
begin
  perform tests.act_as(p_admin);
  select * into v_session from public.create_sessions(
    p_group_id => p_group_id,
    p_starts_at => p_starts_at,
    p_skater_capacity => p_skater_capacity,
    p_goalie_slots => p_goalie_slots
  );
  return v_session.id;
end;
$$;

create or replace function tests.register(p_user_id uuid, p_session_id uuid, p_role public.player_role default 'skater')
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_registration public.registrations;
begin
  perform tests.act_as(p_user_id);
  v_registration := public.register_for_session(p_session_id, p_role);
  return v_registration.id;
end;
$$;

create or replace function tests.status_of(p_registration_id uuid)
returns text
language sql
set search_path = ''
as $$
  select r.status::text from public.registrations r where r.id = p_registration_id;
$$;

create or replace function tests.balance(p_group_id uuid, p_user_id uuid)
returns bigint
language sql
set search_path = ''
as $$
  select coalesce(sum(le.amount_cents), 0)::bigint from public.ledger_entries le
  where le.group_id = p_group_id and le.user_id = p_user_id;
$$;

-- Attendance map {registration_id: true} for all confirmed registrations, with exceptions.
create or replace function tests.attendance(p_session_id uuid, p_absent uuid[] default '{}')
returns jsonb
language sql
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(r.id::text, not (r.id = any (p_absent))), '{}'::jsonb)
  from public.registrations r
  where r.session_id = p_session_id and r.status = 'confirmed';
$$;

-- Financial invariant per group, computed from raw tables (independent of the views):
-- cash_available = sum(balances) + sum(results of completed sessions) - sum(adjustments)
create or replace function tests.invariant_violations()
returns table (group_id uuid, cash_available bigint, rhs bigint)
language sql
set search_path = ''
as $$
  with g as (select id from public.groups),
  cash as (
    select g.id,
      coalesce((select sum(p.amount_cents) from public.payments p
        where p.group_id = g.id and p.status = 'confirmed' and p.direction = 'incoming'), 0)
      - coalesce((select sum(p.amount_cents) from public.payments p
        where p.group_id = g.id and p.status = 'confirmed' and p.direction = 'outgoing'), 0)
      - coalesce((select sum(s.ice_cost_cents) from public.sessions s
        where s.group_id = g.id and s.status = 'completed'), 0) as cash_available
    from g
  ),
  balances as (
    select g.id, coalesce((select sum(le.amount_cents) from public.ledger_entries le where le.group_id = g.id), 0) as total
    from g
  ),
  results as (
    select g.id, coalesce(sum(
      -- charged - ice - goalie earnings, all net of reversals
      coalesce((select -sum(le.amount_cents) from public.ledger_entries le
        left join public.ledger_entries o on o.id = le.reverses_entry_id
        where le.session_id = s.id and coalesce(o.type, le.type) = 'charge'), 0)
      - s.ice_cost_cents
      - coalesce((select sum(le.amount_cents) from public.ledger_entries le
        left join public.ledger_entries o on o.id = le.reverses_entry_id
        where le.session_id = s.id and coalesce(o.type, le.type) = 'goalie_earning'), 0)
    ), 0) as total
    from g
    left join public.sessions s on s.group_id = g.id and s.status = 'completed'
    group by g.id
  ),
  adjustments as (
    select g.id, coalesce((select sum(le.amount_cents) from public.ledger_entries le
      where le.group_id = g.id and le.type = 'adjustment'), 0) as total
    from g
  )
  select c.id, c.cash_available::bigint, (b.total + r.total - a.total)::bigint
  from cash c
  join balances b on b.id = c.id
  join results r on r.id = c.id
  join adjustments a on a.id = c.id
  where c.cash_available <> b.total + r.total - a.total;
$$;

-- Reads group_finance_summary as the group's admin and checks the invariant on the view.
create or replace function tests.summary_satisfies_invariant(p_group_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v public.group_finance_summary;
begin
  perform tests.act_as((
    select gm.user_id from public.group_members gm where gm.group_id = p_group_id and gm.role = 'admin' limit 1
  ));
  select * into v from public.group_finance_summary f where f.group_id = p_group_id;
  return found
    and v.cash_available_cents = v.balances_total_cents + v.sessions_result_cents - v.adjustments_cents
    and v.cash_available_cents = v.collected_cents - v.paid_out_cents - v.ice_total_cents;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select pass('test helpers installed');
select * from finish();

commit;
