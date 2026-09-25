-- Authorization helpers, pricing and RLS policies.

-- ---------------------------------------------------------------------------
-- Error helper
-- ---------------------------------------------------------------------------

-- Raises an error with a stable machine-readable code in the message (mapped to Slovak
-- messages in src/lib/errors.ts).
create function private.fail(p_code text, p_detail text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_code using errcode = 'P0001', detail = coalesce(p_detail, '');
end;
$$;

create function private.require_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    perform private.fail('NOT_AUTHENTICATED');
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Membership predicates (security definer so RLS policies can use them without recursion)
-- ---------------------------------------------------------------------------

create function private.member_role(p_group_id uuid, p_user_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select gm.role from public.group_members gm where gm.group_id = p_group_id and gm.user_id = p_user_id;
$$;

create function private.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm where gm.group_id = p_group_id and gm.user_id = auth.uid()
  );
$$;

-- Admins and regular members (not guests).
create function private.is_group_full_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid() and gm.role in ('admin', 'member')
  );
$$;

create function private.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid() and gm.role = 'admin'
  );
$$;

create function private.has_registration_on_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.registrations r where r.session_id = p_session_id and r.user_id = auth.uid()
  );
$$;

create function private.has_registration_in_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.registrations r where r.group_id = p_group_id and r.user_id = auth.uid()
  );
$$;

-- Profiles are visible to people who share a group, and to admins of a group the person
-- has registered for (a guest waiting for approval is not a member yet).
create function private.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = auth.uid()
    or exists (
      select 1
      from public.group_members mine
      join public.group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid() and theirs.user_id = p_user_id
    )
    or exists (
      select 1
      from public.group_members mine
      join public.registrations r on r.group_id = mine.group_id
      where mine.user_id = auth.uid() and mine.role = 'admin' and r.user_id = p_user_id
    );
$$;

-- Private contact and bank data: owner, or an admin of a group where the person is a member
-- or has a registration.
create function private.is_admin_of_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1
      from public.group_members mine
      join public.group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid() and mine.role = 'admin' and theirs.user_id = p_user_id
    )
    or exists (
      select 1
      from public.group_members mine
      join public.registrations r on r.group_id = mine.group_id
      where mine.user_id = auth.uid() and mine.role = 'admin' and r.user_id = p_user_id
    );
$$;

-- ---------------------------------------------------------------------------
-- Money helpers
-- ---------------------------------------------------------------------------

-- Binding price per paying skater. Returns null when nobody pays.
-- dynamic: ceil((ice + goalie_fee * goalies_attended) / payers) rounded up to rounding_step.
create function private.skater_price(
  p_pricing_mode public.pricing_mode,
  p_price_per_skater_cents bigint,
  p_ice_cost_cents bigint,
  p_goalie_fee_cents bigint,
  p_goalies_attended integer,
  p_payers integer,
  p_rounding_step_cents integer
)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_total bigint;
  v_unit bigint;
begin
  if p_payers is null or p_payers <= 0 then
    return null;
  end if;
  if p_pricing_mode = 'fixed' then
    return p_price_per_skater_cents;
  end if;
  v_total := coalesce(p_ice_cost_cents, 0) + coalesce(p_goalie_fee_cents, 0) * coalesce(p_goalies_attended, 0);
  v_unit := p_payers::bigint * p_rounding_step_cents;
  return ((v_total + v_unit - 1) / v_unit) * p_rounding_step_cents;
end;
$$;

create function private.member_balance(p_group_id uuid, p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(le.amount_cents), 0)::bigint
  from public.ledger_entries le
  where le.group_id = p_group_id and le.user_id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;
alter table public.registrations enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.payments enable row level security;
alter table public.open_spot_posts enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (private.can_view_profile(id));

create policy profile_private_select on public.profile_private
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin_of_user(user_id));

create policy groups_select on public.groups
  for select to authenticated
  using (private.is_group_member(id) or private.has_registration_in_group(id));

create policy group_members_select on public.group_members
  for select to authenticated
  using (private.is_group_member(group_id));

-- Guests only see sessions they have a registration on.
create policy sessions_select on public.sessions
  for select to authenticated
  using (private.is_group_full_member(group_id) or private.has_registration_on_session(id));

create policy registrations_select on public.registrations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_group_full_member(group_id)
    or (private.is_group_member(group_id) and private.has_registration_on_session(session_id))
  );

create policy ledger_entries_select on public.ledger_entries
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_group_admin(group_id));

create policy payments_select on public.payments
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_group_admin(group_id));

create policy open_spot_posts_select on public.open_spot_posts
  for select to authenticated
  using (true);
