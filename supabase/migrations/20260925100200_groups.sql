-- Profile and group management.

create function private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- No 0/O/1/I to keep codes readable when dictated.
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  i int;
begin
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.groups g where g.invite_code = v_code);
  end loop;
  return v_code;
end;
$$;

create function private.slugify(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(private.to_bank_ascii(p_text)), '[^a-z0-9]+', '-', 'g'));
$$;

create function private.require_group_admin(p_group_id uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  perform private.require_uid();
  if not exists (select 1 from public.groups g where g.id = p_group_id) then
    perform private.fail('GROUP_NOT_FOUND');
  end if;
  if not private.is_group_admin(p_group_id) then
    perform private.fail('NOT_GROUP_ADMIN');
  end if;
end;
$$;

create function private.validate_group_defaults(
  p_default_duration_minutes integer,
  p_default_skater_capacity integer,
  p_default_goalie_slots integer,
  p_default_ice_cost_cents bigint,
  p_default_goalie_fee_cents bigint,
  p_default_pricing_mode public.pricing_mode,
  p_default_price_per_skater_cents bigint,
  p_rounding_step_cents integer,
  p_cancellation_hours integer
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_default_duration_minutes is null or p_default_duration_minutes not between 15 and 300 then
    perform private.fail('INVALID_DURATION');
  end if;
  if p_default_skater_capacity is null or p_default_skater_capacity not between 1 and 100 then
    perform private.fail('INVALID_CAPACITY');
  end if;
  if p_default_goalie_slots is null or p_default_goalie_slots not between 0 and 4 then
    perform private.fail('INVALID_GOALIE_SLOTS');
  end if;
  if p_default_ice_cost_cents is null or p_default_ice_cost_cents not between 0 and 100000000
     or p_default_goalie_fee_cents is null or p_default_goalie_fee_cents not between 0 and 10000000 then
    perform private.fail('INVALID_AMOUNT');
  end if;
  if p_default_pricing_mode = 'fixed' and coalesce(p_default_price_per_skater_cents, 0) <= 0 then
    perform private.fail('PRICE_REQUIRED');
  end if;
  if p_rounding_step_cents is null or p_rounding_step_cents not between 1 and 100000 then
    perform private.fail('INVALID_ROUNDING_STEP');
  end if;
  if p_cancellation_hours is null or p_cancellation_hours not between 0 and 168 then
    perform private.fail('INVALID_CANCELLATION_HOURS');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------

create function public.update_my_profile(
  p_full_name text,
  p_nickname text default null,
  p_jersey_number integer default null,
  p_preferred_role public.player_role default 'skater',
  p_phone_e164 text default null,
  p_iban text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_name text := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  v_nickname text := nullif(trim(coalesce(p_nickname, '')), '');
  v_phone text := nullif(regexp_replace(coalesce(p_phone_e164, ''), '\s', '', 'g'), '');
  v_iban text := private.normalize_iban(p_iban);
  v_profile public.profiles;
begin
  if char_length(v_name) not between 2 and 80 then
    perform private.fail('FULL_NAME_REQUIRED');
  end if;
  if v_nickname is not null and char_length(v_nickname) > 30 then
    perform private.fail('NICKNAME_TOO_LONG');
  end if;
  if p_jersey_number is not null and p_jersey_number not between 0 and 99 then
    perform private.fail('INVALID_JERSEY_NUMBER');
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    perform private.fail('INVALID_PHONE');
  end if;
  if v_iban is not null and not private.is_valid_iban(v_iban) then
    perform private.fail('INVALID_IBAN');
  end if;

  update public.profiles p
  set full_name = v_name,
      nickname = v_nickname,
      jersey_number = p_jersey_number,
      preferred_role = coalesce(p_preferred_role, 'skater'),
      onboarded_at = coalesce(p.onboarded_at, private.current_ts())
  where p.id = v_uid
  returning * into v_profile;

  insert into public.profile_private (user_id, phone_e164, iban)
  values (v_uid, v_phone, v_iban)
  on conflict (user_id) do update set phone_e164 = excluded.phone_e164, iban = excluded.iban;

  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------

create function public.create_group(
  p_name text,
  p_city text,
  p_country public.country_code,
  p_iban text,
  p_account_holder_name text,
  p_default_venue text default '',
  p_default_duration_minutes integer default 75,
  p_default_skater_capacity integer default 20,
  p_default_goalie_slots integer default 2,
  p_default_ice_cost_cents bigint default 0,
  p_default_goalie_fee_cents bigint default 0,
  p_default_pricing_mode public.pricing_mode default 'dynamic',
  p_default_price_per_skater_cents bigint default null,
  p_rounding_step_cents integer default null,
  p_cancellation_hours integer default 24,
  p_whatsapp_invite_url text default null
)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_name text := trim(coalesce(p_name, ''));
  v_city text := trim(coalesce(p_city, ''));
  v_iban text := private.normalize_iban(p_iban);
  v_holder text := trim(coalesce(p_account_holder_name, ''));
  v_whatsapp text := nullif(trim(coalesce(p_whatsapp_invite_url, '')), '');
  v_currency public.currency_code;
  v_step integer;
  v_group public.groups;
begin
  if char_length(v_name) not between 2 and 80 then
    perform private.fail('INVALID_GROUP_NAME');
  end if;
  if char_length(v_city) not between 1 and 60 then
    perform private.fail('CITY_REQUIRED');
  end if;
  if p_country is null then
    perform private.fail('COUNTRY_REQUIRED');
  end if;
  if not private.is_valid_iban(v_iban) then
    perform private.fail('INVALID_IBAN');
  end if;
  if char_length(v_holder) not between 2 and 70 then
    perform private.fail('ACCOUNT_HOLDER_REQUIRED');
  end if;
  if v_whatsapp is not null and v_whatsapp !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$' then
    perform private.fail('INVALID_WHATSAPP_URL');
  end if;

  v_currency := case p_country when 'SK' then 'EUR'::public.currency_code else 'CZK'::public.currency_code end;
  v_step := coalesce(p_rounding_step_cents, case v_currency when 'EUR' then 50 else 1000 end);

  perform private.validate_group_defaults(
    p_default_duration_minutes, p_default_skater_capacity, p_default_goalie_slots,
    p_default_ice_cost_cents, p_default_goalie_fee_cents, p_default_pricing_mode,
    p_default_price_per_skater_cents, v_step, p_cancellation_hours
  );

  insert into public.groups (
    name, slug, city, country, currency, iban, account_holder_name, whatsapp_invite_url, invite_code,
    default_venue, default_duration_minutes, default_skater_capacity, default_goalie_slots,
    default_ice_cost_cents, default_goalie_fee_cents, default_pricing_mode,
    default_price_per_skater_cents, rounding_step_cents, cancellation_hours, created_by
  )
  values (
    v_name,
    left(private.slugify(v_name), 60) || '-' || lower(substr(md5(gen_random_uuid()::text), 1, 6)),
    v_city, p_country, v_currency, v_iban, v_holder, v_whatsapp, private.generate_invite_code(),
    trim(coalesce(p_default_venue, '')), p_default_duration_minutes, p_default_skater_capacity,
    p_default_goalie_slots, p_default_ice_cost_cents, p_default_goalie_fee_cents, p_default_pricing_mode,
    case when p_default_pricing_mode = 'fixed' then p_default_price_per_skater_cents end,
    v_step, p_cancellation_hours, v_uid
  )
  returning * into v_group;

  insert into public.group_members (group_id, user_id, role) values (v_group.id, v_uid, 'admin');
  return v_group;
end;
$$;

create function public.update_group_settings(
  p_group_id uuid,
  p_name text,
  p_city text,
  p_country public.country_code,
  p_iban text,
  p_account_holder_name text,
  p_default_venue text,
  p_default_duration_minutes integer,
  p_default_skater_capacity integer,
  p_default_goalie_slots integer,
  p_default_ice_cost_cents bigint,
  p_default_goalie_fee_cents bigint,
  p_default_pricing_mode public.pricing_mode,
  p_default_price_per_skater_cents bigint,
  p_rounding_step_cents integer,
  p_cancellation_hours integer,
  p_whatsapp_invite_url text
)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_city text := trim(coalesce(p_city, ''));
  v_iban text := private.normalize_iban(p_iban);
  v_holder text := trim(coalesce(p_account_holder_name, ''));
  v_whatsapp text := nullif(trim(coalesce(p_whatsapp_invite_url, '')), '');
  v_group public.groups;
begin
  perform private.require_group_admin(p_group_id);
  select * into v_group from public.groups g where g.id = p_group_id for update;

  if char_length(v_name) not between 2 and 80 then
    perform private.fail('INVALID_GROUP_NAME');
  end if;
  if char_length(v_city) not between 1 and 60 then
    perform private.fail('CITY_REQUIRED');
  end if;
  if not private.is_valid_iban(v_iban) then
    perform private.fail('INVALID_IBAN');
  end if;
  if char_length(v_holder) not between 2 and 70 then
    perform private.fail('ACCOUNT_HOLDER_REQUIRED');
  end if;
  if v_whatsapp is not null and v_whatsapp !~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$' then
    perform private.fail('INVALID_WHATSAPP_URL');
  end if;
  -- The currency follows the country; it cannot change once money has moved.
  if p_country is distinct from v_group.country and (
    exists (select 1 from public.payments p where p.group_id = p_group_id)
    or exists (select 1 from public.ledger_entries le where le.group_id = p_group_id)
  ) then
    perform private.fail('CURRENCY_LOCKED');
  end if;

  perform private.validate_group_defaults(
    p_default_duration_minutes, p_default_skater_capacity, p_default_goalie_slots,
    p_default_ice_cost_cents, p_default_goalie_fee_cents, p_default_pricing_mode,
    p_default_price_per_skater_cents, p_rounding_step_cents, p_cancellation_hours
  );

  update public.groups g
  set name = v_name,
      city = v_city,
      country = p_country,
      currency = case p_country when 'SK' then 'EUR'::public.currency_code else 'CZK'::public.currency_code end,
      iban = v_iban,
      account_holder_name = v_holder,
      whatsapp_invite_url = v_whatsapp,
      default_venue = trim(coalesce(p_default_venue, '')),
      default_duration_minutes = p_default_duration_minutes,
      default_skater_capacity = p_default_skater_capacity,
      default_goalie_slots = p_default_goalie_slots,
      default_ice_cost_cents = p_default_ice_cost_cents,
      default_goalie_fee_cents = p_default_goalie_fee_cents,
      default_pricing_mode = p_default_pricing_mode,
      default_price_per_skater_cents = case when p_default_pricing_mode = 'fixed' then p_default_price_per_skater_cents end,
      rounding_step_cents = p_rounding_step_cents,
      cancellation_hours = p_cancellation_hours
  where g.id = p_group_id
  returning * into v_group;
  return v_group;
end;
$$;

create function public.get_invite_preview(p_invite_code text)
returns table (group_id uuid, name text, city text, member_count integer, is_member boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  return query
  select g.id, g.name, g.city,
    (select count(*)::integer from public.group_members gm where gm.group_id = g.id and gm.role <> 'guest'),
    exists (
      select 1 from public.group_members gm
      where gm.group_id = g.id and gm.user_id = v_uid and gm.role in ('admin', 'member')
    )
  from public.groups g
  where g.invite_code = upper(trim(coalesce(p_invite_code, '')));
end;
$$;

create function public.join_group(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_group_id uuid;
begin
  select g.id into v_group_id from public.groups g where g.invite_code = upper(trim(coalesce(p_invite_code, '')));
  if v_group_id is null then
    perform private.fail('INVALID_INVITE_CODE');
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_uid, 'member')
  on conflict (group_id, user_id) do update
    set role = 'member'
    where public.group_members.role = 'guest';

  return v_group_id;
end;
$$;

create function public.regenerate_invite_code(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  perform private.require_group_admin(p_group_id);
  update public.groups g set invite_code = private.generate_invite_code()
  where g.id = p_group_id
  returning g.invite_code into v_code;
  return v_code;
end;
$$;

create function public.set_member_role(p_group_id uuid, p_user_id uuid, p_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.member_role;
begin
  perform private.require_group_admin(p_group_id);
  -- Serialize admin changes within the group.
  perform 1 from public.groups g where g.id = p_group_id for update;

  select gm.role into v_current from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id = p_user_id;
  if v_current is null then
    perform private.fail('NOT_GROUP_MEMBER');
  end if;
  if p_role is null then
    perform private.fail('INVALID_ROLE');
  end if;
  if v_current = 'admin' and p_role <> 'admin' and (
    select count(*) from public.group_members gm where gm.group_id = p_group_id and gm.role = 'admin'
  ) <= 1 then
    perform private.fail('LAST_ADMIN');
  end if;

  update public.group_members gm set role = p_role
  where gm.group_id = p_group_id and gm.user_id = p_user_id;
end;
$$;

-- Contact to the group's admins for members, guests and people with a registration.
create function public.get_group_admin_contacts(p_group_id uuid)
returns table (user_id uuid, full_name text, nickname text, phone_e164 text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_uid();
  if not (private.is_group_member(p_group_id) or private.has_registration_in_group(p_group_id)) then
    perform private.fail('NOT_GROUP_MEMBER');
  end if;
  return query
  select p.id, p.full_name, p.nickname, pp.phone_e164
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  left join public.profile_private pp on pp.user_id = gm.user_id
  where gm.group_id = p_group_id and gm.role = 'admin'
  order by p.full_name;
end;
$$;

create function public.admin_list_groups()
returns table (
  group_id uuid, name text, city text, country public.country_code,
  member_count integer, session_count integer, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_uid();
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_superadmin) then
    perform private.fail('NOT_SUPERADMIN');
  end if;
  return query
  select g.id, g.name, g.city, g.country,
    (select count(*)::integer from public.group_members gm where gm.group_id = g.id),
    (select count(*)::integer from public.sessions s where s.group_id = g.id),
    g.created_at
  from public.groups g
  order by g.name;
end;
$$;
