-- Local seed data. Every group, session, registration, cancellation, finalization, payment,
-- payout and adjustment is created through the same database functions the app calls, with
-- the business clock pinned via `app.now`, so the data satisfies all rules and invariants.
-- All seed users have the password `hokej123` (local only).

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create temporary table seed_people (
  key text primary key,
  id uuid not null default gen_random_uuid(),
  email text not null,
  full_name text not null,
  nickname text,
  jersey integer,
  role public.player_role not null,
  phone text,
  country text not null,
  bban text
);

insert into seed_people (key, email, full_name, nickname, jersey, role, phone, country, bban) values
  -- Slovakia
  ('kovac',     'martin.kovac@particka.test',      'Martin Kováč',       'Kovi',    17, 'skater', '+421905100017', 'SK', '09000000005100000017'),
  ('horvath',   'tomas.horvath@particka.test',     'Tomáš Horváth',      null,       9, 'skater', '+421905100009', 'SK', '11000000002600000009'),
  ('balaz',     'peter.balaz@particka.test',       'Peter Baláž',        'Balo',    22, 'skater', '+421905100022', 'SK', '02000000001500000022'),
  ('szabo',     'juraj.szabo@particka.test',       'Juraj Szabó',        null,       5, 'skater', '+421905100005', 'SK', '75000000004000000005'),
  ('varga',     'michal.varga@particka.test',      'Michal Varga',       'Vargi',   88, 'skater', '+421905100088', 'SK', '09000000005100000088'),
  ('molnar',    'lukas.molnar@particka.test',      'Lukáš Molnár',       null,      14, 'skater', '+421905100014', 'SK', '11000000002600000014'),
  ('toth',      'marek.toth@particka.test',        'Marek Tóth',         null,       3, 'skater', null,            'SK', null),
  ('nagy',      'jan.nagy@particka.test',          'Ján Nagy',           null,      71, 'skater', '+421905100071', 'SK', null),
  ('lukac',     'robert.lukac@particka.test',      'Róbert Lukáč',       'Robo',    11, 'skater', '+421905100011', 'SK', null),
  ('simko',     'andrej.simko@particka.test',      'Andrej Šimko',       null,      27, 'skater', null,            'SK', null),
  ('polak',     'filip.polak@particka.test',       'Filip Polák',        null,      19, 'skater', '+421905100019', 'SK', null),
  ('krajci',    'matus.krajci@particka.test',      'Matúš Krajčí',       null,      44, 'skater', null,            'SK', null),
  ('durica',    'samuel.durica@particka.test',     'Samuel Ďurica',      'Ďuri',    61, 'skater', '+421905100061', 'SK', null),
  ('svec',      'lubomir.svec@particka.test',      'Ľubomír Švec',       'Ľubo',    20, 'skater', '+421905100020', 'SK', null),
  ('cierny',    'stanislav.cierny@particka.test',  'Stanislav Čierny',   null,      24, 'skater', null,            'SK', null),
  ('zahorsky',  'rastislav.zahorsky@particka.test','Rastislav Záhorský', null,      15, 'skater', null,            'SK', null),
  ('bednar',    'simon.bednar@particka.test',      'Šimon Bednár',       null,      36, 'skater', null,            'SK', null),
  ('kral',      'oliver.kral@particka.test',       'Oliver Kráľ',        null,      91, 'skater', '+421905100091', 'SK', null),
  ('beno',      'igor.beno@particka.test',         'Igor Beňo',          null,      77, 'skater', '+421905100077', 'SK', null),
  ('kollar',    'ondrej.kollar@particka.test',     'Ondrej Kollár',      null,       6, 'skater', null,            'SK', null),
  ('mikus',     'daniel.mikus@particka.test',      'Daniel Mikuš',       null,      12, 'skater', null,            'SK', null),
  ('oravec',    'vladimir.oravec@particka.test',   'Vladimír Oravec',    'Vlado',   10, 'skater', '+421905100010', 'SK', '56000000000300000010'),
  ('ferenc',    'jakub.ferenc@particka.test',      'Jakub Ferenc',       null,      21, 'skater', null,            'SK', null),
  ('gal',       'norbert.gal@particka.test',       'Norbert Gál',        null,       4, 'skater', null,            'SK', null),
  ('hudak',     'richard.hudak@particka.test',     'Richard Hudák',      'Huďo',    30, 'goalie', '+421905100030', 'SK', '09000000005100000030'),
  ('bartos',    'pavol.bartos@particka.test',      'Pavol Bartoš',       null,       1, 'goalie', '+421905100001', 'SK', '11000000002600000001'),
  ('blaho',     'erik.blaho@particka.test',        'Erik Blaho',         null,      31, 'goalie', '+421905100031', 'SK', null),
  ('hlinka',    'boris.hlinka@particka.test',      'Boris Hlinka',       null,      33, 'goalie', '+421905100033', 'SK', '75000000004000000033'),
  -- Czechia
  ('novak',     'petr.novak@particka.test',        'Petr Novák',         null,      13, 'skater', '+420731200013', 'CZ', '08000000000200000013'),
  ('dvorak',    'jiri.dvorak@particka.test',       'Jiří Dvořák',        null,       7, 'skater', '+420731200007', 'CZ', null),
  ('cerny',     'tomas.cerny@particka.test',       'Tomáš Černý',        null,      16, 'skater', null,            'CZ', null),
  ('prochazka', 'jan.prochazka@particka.test',     'Jan Procházka',      null,      23, 'skater', null,            'CZ', null),
  ('kucera',    'lukas.kucera@particka.test',      'Lukáš Kučera',       null,       2, 'skater', null,            'CZ', null),
  ('horak',     'jakub.horak@particka.test',       'Jakub Horák',        null,      18, 'skater', null,            'CZ', null),
  ('nemec',     'vojtech.nemec@particka.test',     'Vojtěch Němec',      null,      92, 'skater', null,            'CZ', null),
  ('svoboda',   'ondrej.svoboda@particka.test',    'Ondřej Svoboda',     null,      28, 'skater', null,            'CZ', null),
  ('pokorny',   'martin.pokorny@particka.test',    'Martin Pokorný',     null,      68, 'skater', '+420731200068', 'CZ', null),
  ('vesely',    'radek.vesely@particka.test',      'Radek Veselý',       null,      35, 'goalie', '+420731200035', 'CZ', '03000000000100000035'),
  -- Operator
  ('superadmin','superadmin@particka.test',        'Správca Partičky',   null,    null, 'skater', null,            'SK', null);

create function pg_temp.make_iban(p_country text, p_bban text)
returns text
language plpgsql
immutable
as $$
declare
  v text := p_bban || p_country || '00';
  v_remainder int := 0;
  c text;
  i int;
begin
  for i in 1..length(v) loop
    c := substr(v, i, 1);
    if c ~ '[0-9]' then
      v_remainder := (v_remainder * 10 + c::int) % 97;
    else
      v_remainder := (v_remainder * 100 + ascii(c) - 55) % 97;
    end if;
  end loop;
  return p_country || lpad((98 - v_remainder)::text, 2, '0') || p_bban;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated', p.email,
  extensions.crypt('hokej123', extensions.gen_salt('bf', 8)), now() - interval '10 weeks',
  '{"provider":"email","providers":["email"]}', '{}', now() - interval '10 weeks', now() - interval '10 weeks',
  '', '', '', ''
from seed_people p;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select p.id::text, p.id,
  jsonb_build_object('sub', p.id::text, 'email', p.email, 'email_verified', true, 'phone_verified', false),
  'email', now() - interval '10 weeks', now() - interval '10 weeks', now() - interval '10 weeks'
from seed_people p;

-- ---------------------------------------------------------------------------
-- Helpers: act as a user, pin the clock
-- ---------------------------------------------------------------------------

create function pg_temp.uid(p_key text)
returns uuid
language sql
stable
as $$
  select id from pg_temp.seed_people where key = p_key;
$$;

create function pg_temp.act(p_key text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := pg_temp.uid(p_key);
begin
  if v_id is null then
    raise exception 'unknown seed user %', p_key;
  end if;
  perform set_config('request.jwt.claim.sub', v_id::text, false);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, false);
  return v_id;
end;
$$;

create function pg_temp.at(p_ts timestamptz)
returns void
language sql
as $$
  select set_config('app.now', p_ts::text, false);
$$;

-- Local wall-clock time in Bratislava / Prague, `p_weeks` weeks from the current week.
create function pg_temp.slot(p_weekday_offset interval, p_weeks integer)
returns timestamptz
language sql
stable
as $$
  select (date_trunc('week', now() at time zone 'Europe/Bratislava') + p_weekday_offset
          + make_interval(days => 7 * p_weeks)) at time zone 'Europe/Bratislava';
$$;

create function pg_temp.new_session(p_admin text, p_group uuid, p_starts_at timestamptz, p_created_at timestamptz)
returns uuid
language plpgsql
as $$
declare
  v_session public.sessions;
begin
  perform pg_temp.at(p_created_at);
  perform pg_temp.act(p_admin);
  select * into v_session from public.create_sessions(p_group_id => p_group, p_starts_at => p_starts_at);
  return v_session.id;
end;
$$;

create function pg_temp.reg(p_key text, p_session uuid, p_role public.player_role, p_at timestamptz)
returns uuid
language plpgsql
as $$
declare
  v_registration public.registrations;
begin
  perform pg_temp.at(p_at);
  perform pg_temp.act(p_key);
  v_registration := public.register_for_session(p_session, p_role);
  return v_registration.id;
end;
$$;

create function pg_temp.cancel(p_key text, p_session uuid, p_at timestamptz)
returns text
language plpgsql
as $$
declare
  v_registration public.registrations;
begin
  perform pg_temp.at(p_at);
  perform pg_temp.act(p_key);
  v_registration := public.cancel_registration((
    select r.id from public.registrations r
    where r.session_id = p_session and r.user_id = pg_temp.uid(p_key) and r.status in ('confirmed', 'waitlist', 'pending')
  ));
  return v_registration.status::text;
end;
$$;

create function pg_temp.finalize(p_admin text, p_session uuid, p_absent text[], p_at timestamptz)
returns void
language plpgsql
as $$
begin
  perform pg_temp.at(p_at);
  perform pg_temp.act(p_admin);
  perform public.finalize_session(p_session, (
    select coalesce(jsonb_object_agg(r.id::text, not (p.key = any (p_absent))), '{}'::jsonb)
    from public.registrations r
    join pg_temp.seed_people p on p.id = r.user_id
    where r.session_id = p_session and r.status = 'confirmed'
  ));
end;
$$;

-- Player pays by transfer: request, "Zaplatil som", and the admin confirms a day later.
create function pg_temp.pay(p_key text, p_group uuid, p_amount bigint, p_admin text, p_at timestamptz)
returns void
language plpgsql
as $$
declare
  v_payment public.payments;
begin
  perform pg_temp.at(p_at);
  perform pg_temp.act(p_key);
  v_payment := public.create_payment_request(p_group, p_amount);
  perform pg_temp.at(p_at + interval '4 minutes');
  perform public.report_payment(v_payment.id);
  perform pg_temp.at(p_at + interval '1 day 2 hours');
  perform pg_temp.act(p_admin);
  perform public.confirm_payment(v_payment.id);
end;
$$;

create function pg_temp.cash(p_admin text, p_key text, p_group uuid, p_amount bigint, p_at timestamptz)
returns void
language plpgsql
as $$
begin
  perform pg_temp.at(p_at);
  perform pg_temp.act(p_admin);
  perform public.record_cash_payment(p_group, pg_temp.uid(p_key), p_amount, 'Hotovosť v šatni');
end;
$$;

create function pg_temp.balance(p_group uuid, p_key text)
returns bigint
language sql
stable
as $$
  select private.member_balance(p_group, pg_temp.uid(p_key));
$$;

-- Deterministic pseudo-random choice so the seed is identical on every reset.
create function pg_temp.chance(p_key text, p_salt integer, p_percent integer)
returns boolean
language sql
immutable
as $$
  select abs(hashtext(p_key || ':' || p_salt)) % 100 < p_percent;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (onboarding through the app function)
-- ---------------------------------------------------------------------------

select pg_temp.at(now() - interval '10 weeks');
select pg_temp.act(p.key), public.update_my_profile(
  p.full_name, p.nickname, p.jersey, p.role, p.phone,
  case when p.bban is not null then pg_temp.make_iban(p.country, p.bban) end
)
from seed_people p
order by p.key;

-- The superadmin flag is an operator setting, not an app action.
update public.profiles set is_superadmin = true where id = pg_temp.uid('superadmin');

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------

create temporary table seed_groups (key text primary key, id uuid, invite_code text);

do $$
declare
  v_group public.groups;
begin
  perform pg_temp.at(now() - interval '9 weeks');

  perform pg_temp.act('kovac');
  v_group := public.create_group(
    p_name => 'Štvrtková partička Nitra', p_city => 'Nitra', p_country => 'SK',
    p_iban => pg_temp.make_iban('SK', '09000000005012345678'), p_account_holder_name => 'Martin Kováč',
    p_default_venue => 'Zimný štadión Nitra', p_default_duration_minutes => 75,
    p_default_skater_capacity => 20, p_default_goalie_slots => 2,
    p_default_ice_cost_cents => 18000, p_default_goalie_fee_cents => 1500,
    p_default_pricing_mode => 'dynamic', p_cancellation_hours => 24,
    p_whatsapp_invite_url => 'https://chat.whatsapp.com/KqN8tX2pLm4R7vWz'
  );
  insert into seed_groups values ('nitra', v_group.id, v_group.invite_code);

  perform pg_temp.act('oravec');
  v_group := public.create_group(
    p_name => 'Nedeľné ráno Trnava', p_city => 'Trnava', p_country => 'SK',
    p_iban => pg_temp.make_iban('SK', '56000000000398765432'), p_account_holder_name => 'Vladimír Oravec',
    p_default_venue => 'Mestská hala Trnava', p_default_duration_minutes => 60,
    p_default_skater_capacity => 18, p_default_goalie_slots => 2,
    p_default_ice_cost_cents => 12000, p_default_goalie_fee_cents => 1500,
    p_default_pricing_mode => 'fixed', p_default_price_per_skater_cents => 1200, p_cancellation_hours => 24,
    p_whatsapp_invite_url => 'https://chat.whatsapp.com/Tr9nAvA0Nedela22ab'
  );
  insert into seed_groups values ('trnava', v_group.id, v_group.invite_code);

  perform pg_temp.act('novak');
  v_group := public.create_group(
    p_name => 'Úterní hokej Brno', p_city => 'Brno', p_country => 'CZ',
    p_iban => pg_temp.make_iban('CZ', '08000000001234567890'), p_account_holder_name => 'Petr Novák',
    p_default_venue => 'Zimní stadion Brno-Líšeň', p_default_duration_minutes => 75,
    p_default_skater_capacity => 20, p_default_goalie_slots => 2,
    p_default_ice_cost_cents => 450000, p_default_goalie_fee_cents => 40000,
    p_default_pricing_mode => 'dynamic', p_cancellation_hours => 24
  );
  insert into seed_groups values ('brno', v_group.id, v_group.invite_code);
end;
$$;

create function pg_temp.gid(p_key text)
returns uuid
language sql
stable
as $$
  select id from pg_temp.seed_groups where key = p_key;
$$;

-- Members join through the invite code.
do $$
declare
  v_key text;
begin
  perform pg_temp.at(now() - interval '9 weeks' + interval '1 day');
  foreach v_key in array array[
    'horvath', 'balaz', 'szabo', 'varga', 'molnar', 'toth', 'nagy', 'lukac', 'simko', 'polak', 'krajci',
    'durica', 'svec', 'cierny', 'zahorsky', 'bednar', 'kral', 'beno', 'kollar', 'mikus', 'pokorny',
    'hudak', 'bartos'
  ] loop
    perform pg_temp.act(v_key);
    perform public.join_group((select invite_code from pg_temp.seed_groups where key = 'nitra'));
  end loop;
  foreach v_key in array array['ferenc', 'gal', 'varga', 'beno', 'kollar', 'mikus', 'blaho', 'bartos', 'hlinka'] loop
    perform pg_temp.act(v_key);
    perform public.join_group((select invite_code from pg_temp.seed_groups where key = 'trnava'));
  end loop;
  foreach v_key in array array['dvorak', 'cerny', 'prochazka', 'kucera', 'horak', 'nemec', 'svoboda', 'pokorny', 'vesely'] loop
    perform pg_temp.act(v_key);
    perform public.join_group((select invite_code from pg_temp.seed_groups where key = 'brno'));
  end loop;
  -- A second admin in Nitra.
  perform pg_temp.act('kovac');
  perform public.set_member_role(pg_temp.gid('nitra'), pg_temp.uid('horvath'), 'admin');
end;
$$;

-- ---------------------------------------------------------------------------
-- Štvrtková partička Nitra: Thursday 20:30, dynamic price
-- ---------------------------------------------------------------------------

do $$
declare
  v_group uuid := pg_temp.gid('nitra');
  v_skaters text[] := array[
    'kovac', 'horvath', 'balaz', 'szabo', 'varga', 'molnar', 'toth', 'nagy', 'lukac', 'simko', 'polak',
    'krajci', 'durica', 'svec', 'cierny', 'zahorsky', 'bednar', 'kral', 'beno', 'kollar', 'mikus', 'pokorny'
  ];
  v_regulars text[] := array[
    'kovac', 'horvath', 'balaz', 'szabo', 'varga', 'molnar', 'lukac', 'simko', 'polak', 'krajci', 'durica',
    'cierny', 'zahorsky', 'bednar', 'kral', 'beno', 'kollar', 'mikus'
  ];
  v_week integer;
  v_start timestamptz;
  v_session uuid;
  v_players text[];
  v_key text;
  v_t timestamptz;
  i integer;
  v_payout public.payments;
begin
  -- Before the first session most players prepay 50 €.
  v_t := pg_temp.slot(interval '3 days 20 hours 30 minutes', -6);
  foreach v_key in array v_regulars loop
    perform pg_temp.pay(v_key, v_group, 5000, 'kovac', v_t);
    v_t := v_t + interval '17 minutes';
  end loop;
  -- Toth reports a transfer that never arrives; the admin rejects it.
  perform pg_temp.at(v_t);
  perform pg_temp.act('toth');
  perform public.report_payment((public.create_payment_request(v_group, 5000)).id);
  perform pg_temp.at(v_t + interval '2 days');
  perform pg_temp.act('kovac');
  perform public.reject_payment((select id from public.payments where user_id = pg_temp.uid('toth') and status = 'reported'));
  -- Nagy creates a payment and cancels it, then pays properly.
  perform pg_temp.at(v_t + interval '1 hour');
  perform pg_temp.act('nagy');
  perform public.cancel_payment((public.create_payment_request(v_group, 4000)).id);
  perform pg_temp.pay('nagy', v_group, 4000, 'kovac', v_t + interval '2 hours');

  for v_week in -5..0 loop
    v_start := pg_temp.slot(interval '3 days 20 hours 30 minutes', v_week);
    continue when v_start > now() - interval '3 hours';

    v_session := pg_temp.new_session('kovac', v_group, v_start, v_start - interval '6 days 2 hours');

    -- Most players come; Ľubo Švec always plays (and never pays).
    select array_agg(k order by abs(hashtext(k || v_week))) into v_players
    from unnest(v_skaters) k
    where k in ('kovac', 'svec') or not pg_temp.chance(k, v_week, 18);

    v_t := v_start - interval '6 days';
    for i in 1..array_length(v_players, 1) loop
      perform pg_temp.reg(v_players[i], v_session, 'skater', v_t);
      v_t := v_t + interval '23 minutes';
    end loop;
    perform pg_temp.reg('hudak', v_session, 'goalie', v_t);
    if v_week <> -4 then
      perform pg_temp.reg('bartos', v_session, 'goalie', v_t + interval '1 hour');
    end if;

    -- One free cancellation, one late cancellation (pays unless the waitlist covers it).
    perform pg_temp.cancel(v_players[3], v_session, v_start - interval '3 days');
    perform pg_temp.cancel(v_players[5], v_session, v_start - interval '5 hours');

    -- One no-show, who pays anyway.
    perform pg_temp.finalize('kovac', v_session, array[v_players[7]], v_start + interval '2 hours');

    -- Top-ups: regulars who ran low pay again during the week.
    v_t := v_start + interval '1 day';
    foreach v_key in array v_regulars || array['toth', 'nagy'] loop
      if pg_temp.balance(v_group, v_key) < 1500 then
        perform pg_temp.pay(v_key, v_group, case when pg_temp.chance(v_key, v_week, 50) then 5000 else 3000 end,
          case when pg_temp.chance(v_key, v_week, 70) then 'kovac' else 'horvath' end, v_t);
        v_t := v_t + interval '41 minutes';
      end if;
    end loop;
    -- Martin Pokorný pays cash at the rink.
    if pg_temp.balance(v_group, 'pokorny') < 0 then
      perform pg_temp.cash('kovac', 'pokorny', v_group, 2000, v_start + interval '90 minutes');
    end if;

    -- Pavol Bartoš is paid out after the third session; Richard Hudák keeps his earnings.
    if v_week = -3 then
      perform pg_temp.at(v_start + interval '2 days');
      perform pg_temp.act('kovac');
      v_payout := public.create_goalie_payout(v_group, pg_temp.uid('bartos'), pg_temp.balance(v_group, 'bartos'), 'transfer');
      perform pg_temp.at(v_start + interval '2 days 10 minutes');
      perform public.confirm_goalie_payout(v_payout.id);
    end if;
  end loop;

  -- Current payment states for the demo.
  perform pg_temp.at(now() - interval '1 day');
  perform pg_temp.act('horvath');
  perform public.create_payment_request(v_group, 2000);                          -- pending
  perform pg_temp.act('balaz');
  perform public.report_payment((public.create_payment_request(v_group, 5000)).id); -- reported
  perform pg_temp.at(now() - interval '3 hours');
  perform pg_temp.act('szabo');
  perform public.report_payment((public.create_payment_request(v_group, 3000)).id); -- reported
end;
$$;

-- Upcoming Nitra sessions: full with a waitlist, half-empty looking for a goalie, no goalie yet.
do $$
declare
  v_group uuid := pg_temp.gid('nitra');
  v_full_order text[] := array[
    'kovac', 'horvath', 'balaz', 'szabo', 'varga', 'toth', 'nagy', 'lukac', 'simko', 'polak', 'krajci',
    'durica', 'svec', 'cierny', 'zahorsky', 'bednar', 'kral', 'beno', 'kollar', 'mikus', 'molnar', 'pokorny'
  ];
  v_starts timestamptz[];
  v_session uuid;
  v_t timestamptz;
  i integer;
begin
  select array_agg(s order by s) into v_starts
  from unnest(array[
    pg_temp.slot(interval '3 days 20 hours 30 minutes', 0),
    pg_temp.slot(interval '3 days 20 hours 30 minutes', 1),
    pg_temp.slot(interval '3 days 20 hours 30 minutes', 2),
    pg_temp.slot(interval '3 days 20 hours 30 minutes', 3)
  ]) s
  where s > now() + interval '2 hours';

  -- 1) Full: 22 skaters for 20 spots. Varga cancels in time, Lukáš Molnár moves up from the
  --    waitlist and will see the promotion notice.
  v_session := pg_temp.new_session('kovac', v_group, v_starts[1], now() - interval '3 days');
  v_t := now() - interval '3 days' + interval '10 minutes';
  for i in 1..array_length(v_full_order, 1) loop
    perform pg_temp.reg(v_full_order[i], v_session, 'skater', v_t);
    v_t := v_t + interval '13 minutes';
  end loop;
  perform pg_temp.reg('hudak', v_session, 'goalie', v_t);
  perform pg_temp.reg('bartos', v_session, 'goalie', v_t + interval '5 minutes');
  perform pg_temp.cancel('varga', v_session, least(now() - interval '1 hour', v_starts[1] - interval '25 hours'));

  -- 2) Half-empty, one goalie; posted to the marketplace, a goalie from Trnava asks to join.
  v_session := pg_temp.new_session('kovac', v_group, v_starts[2], now() - interval '2 days');
  v_t := now() - interval '2 days' + interval '1 hour';
  foreach i in array array[1, 2, 3, 4, 6, 8, 9, 13, 14] loop
    perform pg_temp.reg(v_full_order[i], v_session, 'skater', v_t);
    v_t := v_t + interval '47 minutes';
  end loop;
  perform pg_temp.reg('bartos', v_session, 'goalie', v_t);
  perform pg_temp.at(now() - interval '20 hours');
  perform pg_temp.act('kovac');
  perform public.publish_open_spots(v_session, false, true, true, 'Hľadáme brankára, odmena 15 € za termín.');
  perform pg_temp.reg('hlinka', v_session, 'goalie', now() - interval '6 hours');

  -- 3) No goalie yet.
  v_session := pg_temp.new_session('kovac', v_group, v_starts[3], now() - interval '1 day');
  v_t := now() - interval '1 day' + interval '2 hours';
  foreach i in array array[1, 2, 11, 12, 15, 20] loop
    perform pg_temp.reg(v_full_order[i], v_session, 'skater', v_t);
    v_t := v_t + interval '31 minutes';
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Nedeľné ráno Trnava: Sunday 08:00, fixed 12 €
-- ---------------------------------------------------------------------------

do $$
declare
  v_group uuid := pg_temp.gid('trnava');
  v_skaters text[] := array['oravec', 'ferenc', 'gal', 'varga', 'beno', 'kollar', 'mikus'];
  v_week integer;
  v_start timestamptz;
  v_session uuid;
  v_players text[];
  v_t timestamptz;
  i integer;
  v_payout public.payments;
begin
  perform pg_temp.pay('varga', v_group, 5000, 'oravec', pg_temp.slot(interval '6 days 8 hours', -5));

  for v_week in -4..0 loop
    v_start := pg_temp.slot(interval '6 days 8 hours', v_week);
    continue when v_start > now() - interval '3 hours';

    v_session := pg_temp.new_session('oravec', v_group, v_start, v_start - interval '5 days');
    select array_agg(k order by abs(hashtext(k || v_week))) into v_players
    from unnest(v_skaters) k
    where k = 'oravec' or not pg_temp.chance(k, v_week + 100, 20);

    v_t := v_start - interval '4 days';
    for i in 1..array_length(v_players, 1) loop
      perform pg_temp.reg(v_players[i], v_session, 'skater', v_t);
      v_t := v_t + interval '53 minutes';
    end loop;
    perform pg_temp.reg('blaho', v_session, 'goalie', v_t);
    if v_week % 2 = 0 then
      perform pg_temp.reg('hlinka', v_session, 'goalie', v_t + interval '2 hours');
    end if;

    perform pg_temp.finalize('oravec', v_session, array[]::text[], v_start + interval '75 minutes');

    -- Everybody except Varga (prepaid by transfer) pays 12 € cash after the game.
    foreach i in array array[1, 2, 3, 4, 5, 6, 7] loop
      exit when i > array_length(v_players, 1);
      if v_players[i] <> 'varga' then
        perform pg_temp.cash('oravec', v_players[i], v_group, 1200, v_start + interval '80 minutes' + make_interval(mins => i));
      end if;
    end loop;

    -- Week -3: Gál's cash was recorded twice; the admin corrects it.
    if v_week = -3 and 'gal' = any (v_players) then
      perform pg_temp.cash('oravec', 'gal', v_group, 1200, v_start + interval '95 minutes');
      perform pg_temp.at(v_start + interval '1 day');
      perform pg_temp.act('oravec');
      perform public.add_adjustment(v_group, pg_temp.uid('gal'), -1200, 'Hotovosť bola zapísaná dvakrát');
    end if;

    -- Week -2: Erik Blaho is paid out in cash.
    if v_week = -2 then
      perform pg_temp.at(v_start + interval '85 minutes');
      perform pg_temp.act('oravec');
      v_payout := public.create_goalie_payout(v_group, pg_temp.uid('blaho'), pg_temp.balance(v_group, 'blaho'), 'cash');
      perform public.confirm_goalie_payout(v_payout.id);
    end if;
  end loop;

  -- Upcoming: half-empty Sundays, skater spots on the marketplace without approval.
  v_start := pg_temp.slot(interval '6 days 8 hours', case when pg_temp.slot(interval '6 days 8 hours', 0) > now() + interval '2 hours' then 0 else 1 end);
  v_session := pg_temp.new_session('oravec', v_group, v_start, now() - interval '2 days');
  v_t := now() - interval '2 days' + interval '30 minutes';
  foreach i in array array[1, 2, 4, 5, 6] loop
    perform pg_temp.reg(v_skaters[i], v_session, 'skater', v_t);
    v_t := v_t + interval '2 hours';
  end loop;
  perform pg_temp.reg('blaho', v_session, 'goalie', v_t);
  perform pg_temp.at(now() - interval '1 day');
  perform pg_temp.act('oravec');
  perform public.publish_open_spots(v_session, true, false, false, 'Voľná ľadová plocha, príď si zahrať.');

  v_session := pg_temp.new_session('oravec', v_group, v_start + interval '7 days', now() - interval '1 day');
  perform pg_temp.reg('oravec', v_session, 'skater', now() - interval '20 hours');
  perform pg_temp.reg('kollar', v_session, 'skater', now() - interval '18 hours');
end;
$$;

-- ---------------------------------------------------------------------------
-- Úterní hokej Brno: Tuesday 21:00, dynamic price in CZK
-- ---------------------------------------------------------------------------

do $$
declare
  v_group uuid := pg_temp.gid('brno');
  v_skaters text[] := array['novak', 'dvorak', 'cerny', 'prochazka', 'kucera', 'horak', 'nemec', 'svoboda', 'pokorny'];
  v_week integer;
  v_start timestamptz;
  v_session uuid;
  v_players text[];
  v_key text;
  v_t timestamptz;
  i integer;
  v_payout public.payments;
begin
  v_t := pg_temp.slot(interval '1 day 21 hours', -5);
  foreach v_key in array v_skaters loop
    perform pg_temp.pay(v_key, v_group, 200000, 'novak', v_t);
    v_t := v_t + interval '29 minutes';
  end loop;

  for v_week in -4..0 loop
    v_start := pg_temp.slot(interval '1 day 21 hours', v_week);
    continue when v_start > now() - interval '3 hours';

    v_session := pg_temp.new_session('novak', v_group, v_start, v_start - interval '6 days');
    select array_agg(k order by abs(hashtext(k || v_week))) into v_players
    from unnest(v_skaters) k
    where k = 'novak' or not pg_temp.chance(k, v_week + 200, 15);

    v_t := v_start - interval '5 days';
    for i in 1..array_length(v_players, 1) loop
      perform pg_temp.reg(v_players[i], v_session, 'skater', v_t);
      v_t := v_t + interval '37 minutes';
    end loop;
    perform pg_temp.reg('vesely', v_session, 'goalie', v_t);
    if v_week = -2 then
      perform pg_temp.cancel(v_players[2], v_session, v_start - interval '2 hours');
    end if;
    perform pg_temp.finalize('novak', v_session, array[]::text[], v_start + interval '2 hours');

    v_t := v_start + interval '1 day';
    foreach v_key in array v_skaters loop
      if pg_temp.balance(v_group, v_key) < 50000 then
        perform pg_temp.pay(v_key, v_group, 200000, 'novak', v_t);
        v_t := v_t + interval '33 minutes';
      end if;
    end loop;

    if v_week = -2 then
      perform pg_temp.at(v_start + interval '2 days');
      perform pg_temp.act('novak');
      v_payout := public.create_goalie_payout(v_group, pg_temp.uid('vesely'), 80000, 'transfer');
      perform public.confirm_goalie_payout(v_payout.id);
    end if;
  end loop;

  v_start := pg_temp.slot(interval '1 day 21 hours', case when pg_temp.slot(interval '1 day 21 hours', 0) > now() + interval '2 hours' then 0 else 1 end);
  v_session := pg_temp.new_session('novak', v_group, v_start, now() - interval '2 days');
  v_t := now() - interval '2 days' + interval '1 hour';
  foreach i in array array[1, 2, 3, 5, 6, 8] loop
    perform pg_temp.reg(v_skaters[i], v_session, 'skater', v_t);
    v_t := v_t + interval '71 minutes';
  end loop;
  perform pg_temp.reg('vesely', v_session, 'goalie', v_t);
  perform pg_temp.at(now() - interval '12 hours');
  perform pg_temp.act('novak');
  perform public.publish_open_spots(v_session, true, true, true, 'Hledáme hráče do pole i gólmana.');

  v_session := pg_temp.new_session('novak', v_group, v_start + interval '7 days', now() - interval '1 day');
  perform pg_temp.reg('novak', v_session, 'skater', now() - interval '22 hours');
end;
$$;

-- Back to the real clock and no impersonation.
select set_config('app.now', '', false);
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '', false);
