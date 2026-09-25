-- Session finalization, payments, goalie payouts and adjustments.
-- This is the only place that writes to ledger_entries.

-- ---------------------------------------------------------------------------
-- Finalization
-- ---------------------------------------------------------------------------

-- p_attendance: {"<registration_id>": true|false, ...} for every confirmed registration
-- (skaters and goalies). In one transaction: stores attendance, charges every paying skater
-- (all confirmed incl. no-shows + all late_cancelled), credits attending goalies and marks
-- the session completed.
create function public.finalize_session(p_session_id uuid, p_attendance jsonb)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_session public.sessions;
  v_now timestamptz := private.current_ts();
  v_key text;
  v_value jsonb;
  v_goalies_attended integer;
  v_payers integer;
  v_price bigint;
begin
  v_session := private.lock_session(p_session_id);
  perform private.require_group_admin(v_session.group_id);

  if v_session.status = 'completed' then
    perform private.fail('ALREADY_FINALIZED');
  elsif v_session.status = 'cancelled' then
    perform private.fail('SESSION_CANCELLED');
  end if;
  if v_session.starts_at > v_now then
    perform private.fail('SESSION_NOT_STARTED');
  end if;

  if p_attendance is null or jsonb_typeof(p_attendance) <> 'object' then
    perform private.fail('INVALID_ATTENDANCE');
  end if;
  for v_key, v_value in select e.key, e.value from jsonb_each(p_attendance) e loop
    if jsonb_typeof(v_value) <> 'boolean'
       or v_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      perform private.fail('INVALID_ATTENDANCE', v_key);
    end if;
    if not exists (
      select 1 from public.registrations r
      where r.id = v_key::uuid and r.session_id = p_session_id and r.status = 'confirmed'
    ) then
      perform private.fail('INVALID_ATTENDANCE', v_key);
    end if;
  end loop;
  if exists (
    select 1 from public.registrations r
    where r.session_id = p_session_id and r.status = 'confirmed' and not (p_attendance ? r.id::text)
  ) then
    perform private.fail('ATTENDANCE_INCOMPLETE');
  end if;

  -- 1. attendance
  update public.registrations r
  set attended = (p_attendance ->> r.id::text)::boolean
  where r.session_id = p_session_id and r.status = 'confirmed';

  -- 2. payers and 3. price
  select count(*) filter (where r.role = 'goalie' and r.status = 'confirmed' and r.attended),
         count(*) filter (where r.role = 'skater' and r.status in ('confirmed', 'late_cancelled'))
  into v_goalies_attended, v_payers
  from public.registrations r
  where r.session_id = p_session_id;

  v_price := private.skater_price(
    v_session.pricing_mode, v_session.price_per_skater_cents, v_session.ice_cost_cents,
    v_session.goalie_fee_cents, v_goalies_attended, v_payers, v_session.rounding_step_cents
  );

  if v_price is not null and v_price > 0 then
    insert into public.ledger_entries (group_id, user_id, session_id, registration_id, type, amount_cents, created_by, created_at)
    select v_session.group_id, r.user_id, p_session_id, r.id, 'charge', -v_price, v_uid, v_now
    from public.registrations r
    where r.session_id = p_session_id and r.role = 'skater' and r.status in ('confirmed', 'late_cancelled')
    order by r.created_at, r.seq;
  end if;

  -- 4. goalie earnings
  if v_session.goalie_fee_cents > 0 then
    insert into public.ledger_entries (group_id, user_id, session_id, registration_id, type, amount_cents, created_by, created_at)
    select v_session.group_id, r.user_id, p_session_id, r.id, 'goalie_earning', v_session.goalie_fee_cents, v_uid, v_now
    from public.registrations r
    where r.session_id = p_session_id and r.role = 'goalie' and r.status = 'confirmed' and r.attended
    order by r.created_at, r.seq;
  end if;

  -- 5. close
  update public.open_spot_posts p
  set is_active = false, deactivated_at = v_now
  where p.session_id = p_session_id and p.is_active;

  update public.sessions s
  set status = 'completed',
      final_price_per_skater_cents = v_price,
      finalized_at = v_now,
      finalized_by = v_uid
  where s.id = p_session_id
  returning * into v_session;
  return v_session;
end;
$$;

-- Reverts a finalization: every charge and goalie earning of the session gets an exact
-- opposite reversal entry and the session is scheduled again (attendance is kept for editing).
create function public.reopen_session(p_session_id uuid)
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

  if v_session.status <> 'completed' then
    perform private.fail('SESSION_NOT_FINALIZED');
  end if;

  insert into public.ledger_entries (
    group_id, user_id, session_id, registration_id, type, amount_cents, note, reverses_entry_id, created_by, created_at
  )
  select e.group_id, e.user_id, e.session_id, e.registration_id, 'reversal', -e.amount_cents,
         'Znovuotvorenie termínu', e.id, v_uid, v_now
  from public.ledger_entries e
  where e.session_id = p_session_id
    and e.type in ('charge', 'goalie_earning')
    and not exists (select 1 from public.ledger_entries x where x.reverses_entry_id = e.id)
  order by e.created_at, e.id;

  update public.sessions s
  set status = 'scheduled',
      final_price_per_skater_cents = null,
      finalized_at = null,
      finalized_by = null
  where s.id = p_session_id
  returning * into v_session;
  return v_session;
end;
$$;

-- ---------------------------------------------------------------------------
-- Incoming payments
-- ---------------------------------------------------------------------------

create function private.max_payment_cents(p_currency public.currency_code)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case p_currency when 'EUR' then 1000000::bigint else 10000000::bigint end;
$$;

create function private.payment_message(p_group_name text, p_person_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(trim(private.to_bank_ascii(p_person_name) || ' - ' || private.to_bank_ascii(p_group_name)), 60);
$$;

create function public.create_payment_request(p_group_id uuid, p_amount_cents bigint)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_group public.groups;
  v_payment public.payments;
begin
  select * into v_group from public.groups g where g.id = p_group_id;
  if not found then
    perform private.fail('GROUP_NOT_FOUND');
  end if;
  if not private.is_group_member(p_group_id) then
    perform private.fail('NOT_GROUP_MEMBER');
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > private.max_payment_cents(v_group.currency) then
    perform private.fail('INVALID_AMOUNT');
  end if;

  insert into public.payments (group_id, user_id, direction, method, amount_cents, currency, message, status, created_by)
  values (
    p_group_id, v_uid, 'incoming', 'transfer', p_amount_cents, v_group.currency,
    private.payment_message(v_group.name, (select p.full_name from public.profiles p where p.id = v_uid)),
    'pending', v_uid
  )
  returning * into v_payment;
  return v_payment;
end;
$$;

create function public.report_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_payment public.payments;
begin
  select * into v_payment from public.payments p where p.id = p_payment_id for update;
  if not found or v_payment.user_id <> v_uid then
    perform private.fail('PAYMENT_NOT_FOUND');
  end if;
  if v_payment.direction <> 'incoming' or v_payment.status <> 'pending' then
    perform private.fail('PAYMENT_NOT_REPORTABLE');
  end if;

  update public.payments p set status = 'reported', reported_at = private.current_ts()
  where p.id = p_payment_id
  returning * into v_payment;
  return v_payment;
end;
$$;

-- The payer can cancel their own unconfirmed payment; an admin can cancel any unconfirmed one.
create function public.cancel_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_payment public.payments;
begin
  select * into v_payment from public.payments p where p.id = p_payment_id for update;
  if not found then
    perform private.fail('PAYMENT_NOT_FOUND');
  end if;
  if not (
    (v_payment.user_id = v_uid and v_payment.direction = 'incoming')
    or private.is_group_admin(v_payment.group_id)
  ) then
    perform private.fail('PAYMENT_NOT_FOUND');
  end if;
  if v_payment.status not in ('pending', 'reported') then
    perform private.fail('PAYMENT_NOT_CANCELLABLE');
  end if;

  update public.payments p set status = 'cancelled', cancelled_at = private.current_ts()
  where p.id = p_payment_id
  returning * into v_payment;
  return v_payment;
end;
$$;

create function public.confirm_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_payment public.payments;
  v_now timestamptz := private.current_ts();
begin
  select * into v_payment from public.payments p where p.id = p_payment_id for update;
  if not found then
    perform private.fail('PAYMENT_NOT_FOUND');
  end if;
  perform private.require_group_admin(v_payment.group_id);
  if v_payment.direction <> 'incoming' then
    perform private.fail('PAYMENT_NOT_CONFIRMABLE');
  end if;
  if v_payment.status = 'confirmed' then
    perform private.fail('PAYMENT_ALREADY_CONFIRMED');
  end if;
  if v_payment.status not in ('pending', 'reported') then
    perform private.fail('PAYMENT_NOT_CONFIRMABLE');
  end if;

  update public.payments p set status = 'confirmed', confirmed_at = v_now, confirmed_by = v_uid
  where p.id = p_payment_id
  returning * into v_payment;

  insert into public.ledger_entries (group_id, user_id, payment_id, type, amount_cents, created_by, created_at)
  values (v_payment.group_id, v_payment.user_id, v_payment.id, 'topup', v_payment.amount_cents, v_uid, v_now);
  return v_payment;
end;
$$;

create function public.reject_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
begin
  perform private.require_uid();
  select * into v_payment from public.payments p where p.id = p_payment_id for update;
  if not found then
    perform private.fail('PAYMENT_NOT_FOUND');
  end if;
  perform private.require_group_admin(v_payment.group_id);
  if v_payment.direction <> 'incoming' or v_payment.status not in ('pending', 'reported') then
    perform private.fail('PAYMENT_NOT_REJECTABLE');
  end if;

  update public.payments p set status = 'rejected', rejected_at = private.current_ts()
  where p.id = p_payment_id
  returning * into v_payment;
  return v_payment;
end;
$$;

create function public.record_cash_payment(
  p_group_id uuid,
  p_user_id uuid,
  p_amount_cents bigint,
  p_note text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_group public.groups;
  v_payment public.payments;
  v_now timestamptz := private.current_ts();
begin
  perform private.require_group_admin(p_group_id);
  select * into v_group from public.groups g where g.id = p_group_id;
  if private.member_role(p_group_id, p_user_id) is null then
    perform private.fail('NOT_GROUP_MEMBER');
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > private.max_payment_cents(v_group.currency) then
    perform private.fail('INVALID_AMOUNT');
  end if;

  insert into public.payments (
    group_id, user_id, direction, method, amount_cents, currency, message, note, status,
    confirmed_at, confirmed_by, created_by
  )
  values (
    p_group_id, p_user_id, 'incoming', 'cash', p_amount_cents, v_group.currency, 'Hotovost',
    nullif(trim(coalesce(p_note, '')), ''), 'confirmed', v_now, v_uid, v_uid
  )
  returning * into v_payment;

  insert into public.ledger_entries (group_id, user_id, payment_id, type, amount_cents, note, created_by, created_at)
  values (p_group_id, p_user_id, v_payment.id, 'topup', p_amount_cents, v_payment.note, v_uid, v_now);
  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Goalie payouts
-- ---------------------------------------------------------------------------

create function public.create_goalie_payout(
  p_group_id uuid,
  p_user_id uuid,
  p_amount_cents bigint,
  p_method public.payment_method default 'transfer'
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_group public.groups;
  v_balance bigint;
  v_payment public.payments;
  v_now timestamptz := private.current_ts();
begin
  perform private.require_group_admin(p_group_id);
  select * into v_group from public.groups g where g.id = p_group_id;
  -- Serialize money operations for this member.
  perform 1 from public.group_members gm where gm.group_id = p_group_id and gm.user_id = p_user_id for update;
  if not found then
    perform private.fail('NOT_GROUP_MEMBER');
  end if;
  if not exists (
    select 1 from public.ledger_entries le
    where le.group_id = p_group_id and le.user_id = p_user_id and le.type = 'goalie_earning'
  ) then
    perform private.fail('NOT_A_GOALIE');
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    perform private.fail('INVALID_AMOUNT');
  end if;
  v_balance := private.member_balance(p_group_id, p_user_id);
  if p_amount_cents > v_balance then
    perform private.fail('PAYOUT_EXCEEDS_BALANCE');
  end if;

  update public.payments p set status = 'cancelled', cancelled_at = v_now
  where p.group_id = p_group_id and p.user_id = p_user_id and p.direction = 'outgoing' and p.status = 'pending';

  insert into public.payments (group_id, user_id, direction, method, amount_cents, currency, message, status, created_by)
  values (
    p_group_id, p_user_id, 'outgoing', coalesce(p_method, 'transfer'), p_amount_cents, v_group.currency,
    left('Odmena brankar - ' || private.to_bank_ascii(v_group.name), 60), 'pending', v_uid
  )
  returning * into v_payment;
  return v_payment;
end;
$$;

create function public.confirm_goalie_payout(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_payment public.payments;
  v_now timestamptz := private.current_ts();
begin
  select * into v_payment from public.payments p where p.id = p_payment_id for update;
  if not found then
    perform private.fail('PAYMENT_NOT_FOUND');
  end if;
  perform private.require_group_admin(v_payment.group_id);
  if v_payment.direction <> 'outgoing' then
    perform private.fail('PAYMENT_NOT_CONFIRMABLE');
  end if;
  if v_payment.status = 'confirmed' then
    perform private.fail('PAYMENT_ALREADY_CONFIRMED');
  end if;
  if v_payment.status <> 'pending' then
    perform private.fail('PAYMENT_NOT_CONFIRMABLE');
  end if;

  perform 1 from public.group_members gm
  where gm.group_id = v_payment.group_id and gm.user_id = v_payment.user_id
  for update;
  if v_payment.amount_cents > private.member_balance(v_payment.group_id, v_payment.user_id) then
    perform private.fail('PAYOUT_EXCEEDS_BALANCE');
  end if;

  update public.payments p set status = 'confirmed', confirmed_at = v_now, confirmed_by = v_uid
  where p.id = p_payment_id
  returning * into v_payment;

  insert into public.ledger_entries (group_id, user_id, payment_id, type, amount_cents, created_by, created_at)
  values (v_payment.group_id, v_payment.user_id, v_payment.id, 'goalie_payout', -v_payment.amount_cents, v_uid, v_now);
  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Manual adjustments
-- ---------------------------------------------------------------------------

create function public.add_adjustment(p_group_id uuid, p_user_id uuid, p_amount_cents bigint, p_note text)
returns public.ledger_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_entry public.ledger_entries;
begin
  perform private.require_group_admin(p_group_id);
  if private.member_role(p_group_id, p_user_id) is null then
    perform private.fail('NOT_GROUP_MEMBER');
  end if;
  if p_amount_cents is null or p_amount_cents = 0 or abs(p_amount_cents) > 10000000 then
    perform private.fail('INVALID_AMOUNT');
  end if;
  if char_length(trim(coalesce(p_note, ''))) = 0 then
    perform private.fail('NOTE_REQUIRED');
  end if;

  perform 1 from public.group_members gm where gm.group_id = p_group_id and gm.user_id = p_user_id for update;
  insert into public.ledger_entries (group_id, user_id, type, amount_cents, note, created_by, created_at)
  values (p_group_id, p_user_id, 'adjustment', p_amount_cents, trim(p_note), v_uid, private.current_ts())
  returning * into v_entry;
  return v_entry;
end;
$$;
