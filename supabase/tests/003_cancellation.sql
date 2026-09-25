-- Cancellation branches (section 4.4).
begin;
select plan(22);

select tests.set_now('2030-01-01 12:00+00');
select tests.create_user('admin@cxl.test', 'Adam Admin') as admin \gset
select tests.create_user('p1@cxl.test', 'Peter Jeden') as p1 \gset
select tests.create_user('p2@cxl.test', 'Pavol Dva') as p2 \gset
select tests.create_user('p3@cxl.test', 'Pavel Tri') as p3 \gset
select tests.create_user('p4@cxl.test', 'Patrik Štyri') as p4 \gset
select tests.create_user('p5@cxl.test', 'Pio Päť') as p5 \gset
select tests.create_user('p6@cxl.test', 'Pišta Šesť') as p6 \gset
select tests.create_user('g1@cxl.test', 'Gabo Brankár') as g1 \gset
select tests.create_group(:'admin') as grp \gset
select tests.join(:'grp', u) from unnest(array[:'p1', :'p2', :'p3', :'p4', :'p5', :'p6', :'g1']::uuid[]) u;

-- Session on 10 Jan 19:00 UTC, free cancellation until 9 Jan 19:00 UTC (24 h).
select tests.create_session(:'admin', :'grp', '2030-01-10 19:00+00', 3, 1) as sess \gset
select tests.register(:'p1', :'sess') as r1 \gset
select tests.register(:'p2', :'sess') as r2 \gset
select tests.register(:'p3', :'sess') as r3 \gset
select tests.register(:'p4', :'sess') as r4 \gset
select tests.register(:'g1', :'sess', 'goalie') as rg1 \gset

select is(tests.status_of(:'r4'), 'waitlist', 'setup: p4 waits');

-- Just before the deadline it is still free.
select tests.set_now('2030-01-09 18:59+00');
select tests.register(:'p5', :'sess') as r5 \gset
select tests.act_as(:'p5');
select is((public.cancel_registration(:'r5')).cancel_reason::text, 'self', 'waitlisted player cancels for free');

-- After the deadline, with a waitlist: the waiting player takes the spot, no fee.
select tests.set_now('2030-01-10 10:00+00');
select tests.act_as(:'p1');
select is((public.cancel_registration(:'r1')).status::text, 'cancelled', 'late cancellation with a waitlist is free');
select is((select cancel_reason::text from public.registrations where id = :'r1'), 'replaced', 'reason: replaced');
select is(tests.status_of(:'r4'), 'confirmed', 'waitlisted player is promoted');

-- After the deadline, no waitlist: late_cancelled (pays at finalization).
select tests.act_as(:'p2');
select is((public.cancel_registration(:'r2')).status::text, 'late_cancelled', 'late cancellation without a waitlist');
select isnt((select cancelled_at from public.registrations where id = :'r2'), null, 'cancelled_at is recorded');

-- Someone new registers into the freed spot: the oldest late cancellation is released.
select tests.register(:'p5', :'sess') as r5b \gset
select is(tests.status_of(:'r5b'), 'confirmed', 'new player gets the freed spot');
select is(tests.status_of(:'r2'), 'cancelled', 'late cancellation is released');
select is((select cancel_reason::text from public.registrations where id = :'r2'), 'late_released', 'reason: late_released');

-- Own late cancellation is released when the same player comes back.
select tests.act_as(:'p3');
select is((public.cancel_registration(:'r3')).status::text, 'late_cancelled', 'p3 cancels late');
select tests.register(:'p3', :'sess') as r3b \gset
select is(tests.status_of(:'r3b'), 'confirmed', 'p3 registers again');
select is(tests.status_of(:'r3'), 'cancelled', 'p3 does not pay for the earlier late cancellation');

-- Two late cancellations, one new player: only the oldest one is released.
select tests.act_as(:'p4');
select public.cancel_registration(:'r4');
select tests.set_now('2030-01-10 10:05+00');
select tests.act_as(:'p5');
select public.cancel_registration(:'r5b');
select is(tests.status_of(:'r4'), 'late_cancelled', 'p4 late cancelled first');
select is(tests.status_of(:'r5b'), 'late_cancelled', 'p5 late cancelled second');
select tests.register(:'p6', :'sess') as r6 \gset
select is(tests.status_of(:'r4'), 'cancelled', 'oldest late cancellation (p4) is released');
select is(tests.status_of(:'r5b'), 'late_cancelled', 'newer late cancellation (p5) still pays');

-- Goalie late cancellation without a replacement: late_cancelled, but never pays.
select tests.act_as(:'g1');
select is((public.cancel_registration(:'rg1')).status::text, 'late_cancelled', 'goalie can be late_cancelled');

-- A cancelled or late-cancelled registration cannot be cancelled again.
select tests.act_as(:'p5');
select throws_ok(
  format($$ select public.cancel_registration(%L) $$, :'r5b'),
  'P0001', 'REGISTRATION_NOT_ACTIVE', 'late_cancelled registration cannot be cancelled again'
);
select tests.act_as(:'p6');
select throws_ok(
  format($$ select public.cancel_registration(%L) $$, :'r3b'),
  'P0001', 'NOT_REGISTRATION_OWNER', 'nobody cancels someone else''s registration'
);

-- Finalization: late_cancelled skater pays, late_cancelled goalie gets nothing.
select tests.set_now('2030-01-10 21:00+00');
select tests.act_as(:'admin');
select public.finalize_session(:'sess', tests.attendance(:'sess'));
select is(
  (select sum(amount_cents)::bigint from public.ledger_entries where registration_id = :'r5b'),
  (select -final_price_per_skater_cents from public.sessions where id = :'sess'),
  'late_cancelled skater is charged the session price'
);
select is(
  (select count(*)::int from public.ledger_entries where user_id = :'g1'), 0,
  'late_cancelled goalie is neither charged nor paid'
);

select * from finish();
rollback;
