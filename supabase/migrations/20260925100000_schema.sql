-- Partička: core schema.
-- All money amounts are integers in the smallest currency unit (cents / haléře).
-- Writes to registrations, money and membership go exclusively through security definer
-- functions defined in later migrations; clients only get SELECT (filtered by RLS).

create schema if not exists private;
revoke all on schema private from public;

-- Nothing new is reachable by clients unless granted explicitly (see the grants migration).
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Clock
-- ---------------------------------------------------------------------------

-- Current time used by all business logic. Direct database sessions (seed scripts and
-- pgTAP tests connect as postgres) may pin the clock with `set app.now = '...'` so that
-- historical data can be created through the same functions the app uses. API requests
-- connect as `authenticator`, so they can never influence the clock.
create function private.current_ts()
returns timestamptz
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_override text;
begin
  if session_user in ('postgres', 'supabase_admin') then
    v_override := current_setting('app.now', true);
    if v_override is not null and v_override <> '' then
      return v_override::timestamptz;
    end if;
  end if;
  return clock_timestamp();
end;
$$;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.country_code as enum ('SK', 'CZ');
create type public.currency_code as enum ('EUR', 'CZK');
create type public.member_role as enum ('admin', 'member', 'guest');
create type public.player_role as enum ('skater', 'goalie');
create type public.pricing_mode as enum ('fixed', 'dynamic');
create type public.session_status as enum ('scheduled', 'completed', 'cancelled');
create type public.registration_status as enum (
  'pending', 'confirmed', 'waitlist', 'cancelled', 'late_cancelled'
);
-- Why a registration ended up cancelled; lets the UI explain it in the player's words.
create type public.cancel_reason as enum (
  'self',              -- player cancelled before the free-cancellation deadline (or from waitlist / pending)
  'replaced',          -- late cancellation, but a waitlisted player took the spot
  'late_released',     -- was late_cancelled, released because someone new took the spot
  'removed',           -- admin removed the registration
  'rejected',          -- admin rejected a guest
  'session_cancelled', -- the whole session was cancelled
  'member_removed'     -- the member was removed from the group
);
create type public.ledger_entry_type as enum (
  'topup', 'charge', 'goalie_earning', 'goalie_payout', 'reversal', 'adjustment'
);
create type public.payment_direction as enum ('incoming', 'outgoing');
-- Extensible later (e.g. 'card') with ALTER TYPE ... ADD VALUE.
create type public.payment_method as enum ('transfer', 'cash');
create type public.payment_status as enum ('pending', 'reported', 'confirmed', 'rejected', 'cancelled');

-- Variable symbols: numeric, at most 10 digits, globally unique.
create sequence public.payment_variable_symbol_seq
  as bigint start with 1000001 minvalue 1000001 maxvalue 9999999999 no cycle;

-- ---------------------------------------------------------------------------
-- Validation helpers (immutable, shared by constraints and functions)
-- ---------------------------------------------------------------------------

-- IBAN: country-specific length + mod 97 checksum. SK and CZ additionally require a numeric BBAN.
create function private.is_valid_iban(p_iban text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
  v_country text;
  v_expected int;
  v_rearranged text;
  v_char text;
  v_remainder int := 0;
  i int;
begin
  if p_iban is null then
    return false;
  end if;
  v := upper(regexp_replace(p_iban, '\s', '', 'g'));
  if v !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
    return false;
  end if;
  v_country := left(v, 2);
  v_expected := case v_country
    when 'SK' then 24 when 'CZ' then 24 when 'AT' then 20 when 'BE' then 16 when 'BG' then 22
    when 'CH' then 21 when 'CY' then 28 when 'DE' then 22 when 'DK' then 18 when 'EE' then 20
    when 'ES' then 24 when 'FI' then 18 when 'FR' then 27 when 'GB' then 22 when 'GR' then 27
    when 'HR' then 21 when 'HU' then 28 when 'IE' then 22 when 'IT' then 27 when 'LI' then 21
    when 'LT' then 20 when 'LU' then 20 when 'LV' then 21 when 'MT' then 31 when 'NL' then 18
    when 'NO' then 15 when 'PL' then 28 when 'PT' then 25 when 'RO' then 24 when 'SE' then 24
    when 'SI' then 19 when 'UA' then 29
    else null
  end;
  if v_expected is null or length(v) <> v_expected then
    return false;
  end if;
  if v_country in ('SK', 'CZ') and substr(v, 5) !~ '^[0-9]{20}$' then
    return false;
  end if;
  v_rearranged := substr(v, 5) || left(v, 4);
  for i in 1..length(v_rearranged) loop
    v_char := substr(v_rearranged, i, 1);
    if v_char ~ '[0-9]' then
      v_remainder := (v_remainder * 10 + v_char::int) % 97;
    else
      v_remainder := (v_remainder * 100 + (ascii(v_char) - 55)) % 97;
    end if;
  end loop;
  return v_remainder = 1;
end;
$$;

create function private.normalize_iban(p_iban text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g')), '');
$$;

-- Plain ASCII for bank messages (banks render diacritics inconsistently) and without the
-- SPD field separator '*'.
create function private.to_bank_ascii(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(
      coalesce(p_text, ''),
      'áäčďéěíĺľňóôöŕřšťúůüýžÁÄČĎÉĚÍĹĽŇÓÔÖŔŘŠŤÚŮÜÝŽ',
      'aacdeeillnooorrstuuuyzAACDEEILLNOOORRSTUUUYZ'
    ),
    '[^A-Za-z0-9 .,:/+()-]', '', 'g'
  );
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  nickname text,
  jersey_number smallint,
  preferred_role public.player_role not null default 'skater',
  avatar_url text,
  is_superadmin boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default private.current_ts(),
  updated_at timestamptz not null default private.current_ts(),
  constraint profiles_full_name_length check (char_length(full_name) <= 80),
  constraint profiles_nickname_length check (nickname is null or char_length(nickname) between 1 and 30),
  constraint profiles_jersey_number_range check (jersey_number is null or jersey_number between 0 and 99),
  constraint profiles_onboarded_has_name check (onboarded_at is null or char_length(trim(full_name)) >= 2)
);

-- Sensitive contact and bank data; readable only by the owner and admins of shared groups.
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone_e164 text,
  iban text,
  updated_at timestamptz not null default private.current_ts(),
  constraint profile_private_phone_format check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint profile_private_iban_valid check (iban is null or private.is_valid_iban(iban))
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null,
  country public.country_code not null,
  currency public.currency_code not null,
  iban text not null,
  account_holder_name text not null,
  whatsapp_invite_url text,
  invite_code text not null unique,
  default_venue text not null default '',
  default_duration_minutes integer not null default 75,
  default_skater_capacity integer not null default 20,
  default_goalie_slots integer not null default 2,
  default_ice_cost_cents bigint not null default 0,
  default_goalie_fee_cents bigint not null default 0,
  default_pricing_mode public.pricing_mode not null default 'dynamic',
  default_price_per_skater_cents bigint,
  rounding_step_cents integer not null,
  cancellation_hours integer not null default 24,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default private.current_ts(),
  updated_at timestamptz not null default private.current_ts(),
  constraint groups_name_length check (char_length(trim(name)) between 2 and 80),
  constraint groups_city_length check (char_length(trim(city)) between 1 and 60),
  constraint groups_currency_matches_country check (
    (country = 'SK' and currency = 'EUR') or (country = 'CZ' and currency = 'CZK')
  ),
  constraint groups_iban_valid check (private.is_valid_iban(iban) and iban = upper(iban)),
  constraint groups_account_holder_length check (char_length(trim(account_holder_name)) between 2 and 70),
  constraint groups_whatsapp_url check (
    whatsapp_invite_url is null or whatsapp_invite_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$'
  ),
  constraint groups_invite_code_format check (invite_code ~ '^[A-Z0-9]{8}$'),
  constraint groups_default_duration check (default_duration_minutes between 15 and 300),
  constraint groups_default_skater_capacity check (default_skater_capacity between 1 and 100),
  constraint groups_default_goalie_slots check (default_goalie_slots between 0 and 4),
  constraint groups_default_ice_cost check (default_ice_cost_cents between 0 and 100000000),
  constraint groups_default_goalie_fee check (default_goalie_fee_cents between 0 and 10000000),
  constraint groups_default_fixed_price check (
    (default_pricing_mode = 'dynamic' and (default_price_per_skater_cents is null or default_price_per_skater_cents > 0))
    or (default_pricing_mode = 'fixed' and default_price_per_skater_cents > 0)
  ),
  constraint groups_rounding_step check (rounding_step_cents between 1 and 100000),
  constraint groups_cancellation_hours check (cancellation_hours between 0 and 168)
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default private.current_ts(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  series_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null,
  skater_capacity integer not null,
  goalie_slots integer not null,
  ice_cost_cents bigint not null,
  goalie_fee_cents bigint not null,
  pricing_mode public.pricing_mode not null,
  price_per_skater_cents bigint,
  rounding_step_cents integer not null,
  cancellation_hours integer not null,
  status public.session_status not null default 'scheduled',
  notes text,
  final_price_per_skater_cents bigint,
  finalized_at timestamptz,
  finalized_by uuid references public.profiles (id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default private.current_ts(),
  updated_at timestamptz not null default private.current_ts(),
  constraint sessions_id_group_unique unique (id, group_id),
  constraint sessions_time_order check (ends_at > starts_at and ends_at <= starts_at + interval '6 hours'),
  constraint sessions_venue_length check (char_length(trim(venue)) between 1 and 120),
  constraint sessions_skater_capacity check (skater_capacity between 1 and 100),
  constraint sessions_goalie_slots check (goalie_slots between 0 and 4),
  constraint sessions_ice_cost check (ice_cost_cents between 0 and 100000000),
  constraint sessions_goalie_fee check (goalie_fee_cents between 0 and 10000000),
  constraint sessions_fixed_price check (
    (pricing_mode = 'dynamic' and (price_per_skater_cents is null or price_per_skater_cents > 0))
    or (pricing_mode = 'fixed' and price_per_skater_cents > 0)
  ),
  constraint sessions_rounding_step check (rounding_step_cents between 1 and 100000),
  constraint sessions_cancellation_hours check (cancellation_hours between 0 and 168),
  constraint sessions_notes_length check (notes is null or char_length(notes) <= 500),
  constraint sessions_finalized_consistency check (
    (status = 'completed') = (finalized_at is not null)
  ),
  constraint sessions_final_price check (final_price_per_skater_cents is null or final_price_per_skater_cents >= 0)
);
create index sessions_group_starts_idx on public.sessions (group_id, starts_at);
create index sessions_starts_idx on public.sessions (starts_at) where status = 'scheduled';

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  -- Monotonic tie-breaker so waitlist order never has duplicates.
  seq bigint generated always as identity,
  session_id uuid not null,
  group_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete restrict,
  role public.player_role not null,
  status public.registration_status not null,
  is_guest boolean not null default false,
  attended boolean,
  promoted_at timestamptz,
  promotion_seen_at timestamptz,
  cancel_reason public.cancel_reason,
  created_at timestamptz not null default private.current_ts(),
  cancelled_at timestamptz,
  updated_at timestamptz not null default private.current_ts(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint registrations_session_fk foreign key (session_id, group_id)
    references public.sessions (id, group_id) on delete cascade,
  constraint registrations_cancel_consistency check (
    (status = 'cancelled') = (cancel_reason is not null)
  ),
  constraint registrations_cancelled_at check (
    status not in ('cancelled', 'late_cancelled') or cancelled_at is not null
  ),
  constraint registrations_promotion_seen check (promotion_seen_at is null or promoted_at is not null)
);
-- One active registration per person and session.
create unique index registrations_one_active_idx on public.registrations (session_id, user_id)
  where status in ('pending', 'confirmed', 'waitlist');
create index registrations_session_status_idx on public.registrations (session_id, role, status, created_at, seq);
create index registrations_user_idx on public.registrations (user_id, status);
create index registrations_group_idx on public.registrations (group_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  direction public.payment_direction not null,
  method public.payment_method not null,
  amount_cents bigint not null,
  currency public.currency_code not null,
  variable_symbol bigint not null unique default nextval('public.payment_variable_symbol_seq'),
  message text not null default '',
  note text,
  status public.payment_status not null default 'pending',
  reported_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default private.current_ts(),
  updated_at timestamptz not null default private.current_ts(),
  constraint payments_amount_positive check (amount_cents > 0 and amount_cents <= 100000000),
  constraint payments_variable_symbol_range check (variable_symbol between 1 and 9999999999),
  constraint payments_message_length check (char_length(message) <= 60),
  constraint payments_confirmed_consistency check ((status = 'confirmed') = (confirmed_at is not null)),
  constraint payments_outgoing_not_reported check (direction = 'incoming' or reported_at is null)
);
create index payments_group_status_idx on public.payments (group_id, status, created_at desc);
create index payments_user_idx on public.payments (user_id, group_id, created_at desc);

-- Immutable journal. Balance of a member = sum(amount_cents) of their entries in the group.
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  session_id uuid references public.sessions (id) on delete restrict,
  registration_id uuid references public.registrations (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete restrict,
  type public.ledger_entry_type not null,
  amount_cents bigint not null,
  note text,
  reverses_entry_id uuid references public.ledger_entries (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default private.current_ts(),
  constraint ledger_amount_nonzero check (amount_cents <> 0),
  constraint ledger_amount_sign check (
    case type
      when 'topup' then amount_cents > 0
      when 'charge' then amount_cents < 0
      when 'goalie_earning' then amount_cents > 0
      when 'goalie_payout' then amount_cents < 0
      else true
    end
  ),
  constraint ledger_reversal_link check ((type = 'reversal') = (reverses_entry_id is not null)),
  constraint ledger_adjustment_note check (type <> 'adjustment' or char_length(trim(coalesce(note, ''))) > 0),
  constraint ledger_payment_link check (
    (type in ('topup', 'goalie_payout')) = (payment_id is not null)
  ),
  constraint ledger_session_link check (
    type not in ('charge', 'goalie_earning') or (session_id is not null and registration_id is not null)
  )
);
create index ledger_group_user_idx on public.ledger_entries (group_id, user_id);
create index ledger_session_idx on public.ledger_entries (session_id) where session_id is not null;
-- An entry can be reversed at most once; a payment produces at most one ledger entry.
create unique index ledger_single_reversal_idx on public.ledger_entries (reverses_entry_id)
  where reverses_entry_id is not null;
create unique index ledger_single_payment_entry_idx on public.ledger_entries (payment_id)
  where payment_id is not null;

create table public.open_spot_posts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  offer_skaters boolean not null,
  offer_goalies boolean not null,
  require_approval boolean not null default true,
  note text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default private.current_ts(),
  deactivated_at timestamptz,
  constraint open_spot_posts_offers check (offer_skaters or offer_goalies),
  constraint open_spot_posts_note_length check (note is null or char_length(note) <= 280)
);
create unique index open_spot_posts_one_active_idx on public.open_spot_posts (session_id) where is_active;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- The ledger is append-only for everyone, including service_role and table owners.
create function private.forbid_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'LEDGER_IMMUTABLE' using errcode = 'P0001',
    detail = 'Ledger entries cannot be updated or deleted; add a correcting entry instead.';
end;
$$;

create trigger ledger_entries_no_update_delete
  before update or delete on public.ledger_entries
  for each row execute function private.forbid_ledger_mutation();

create trigger ledger_entries_no_truncate
  before truncate on public.ledger_entries
  for each statement execute function private.forbid_ledger_mutation();

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := private.current_ts();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger profile_private_touch before update on public.profile_private
  for each row execute function private.touch_updated_at();
create trigger groups_touch before update on public.groups
  for each row execute function private.touch_updated_at();
create trigger sessions_touch before update on public.sessions
  for each row execute function private.touch_updated_at();
create trigger registrations_touch before update on public.registrations
  for each row execute function private.touch_updated_at();
create trigger payments_touch before update on public.payments
  for each row execute function private.touch_updated_at();

-- Every auth user gets a profile row (and an empty private row) immediately.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.profile_private (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
