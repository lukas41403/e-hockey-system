-- Capacity, waitlist, separate goalie queue, admin registrations, series and cancellation of a session.
begin;
select plan(30);

select tests.set_now('2030-01-01 12:00+00');
select tests.create_user('admin@cap.test', 'Adam Admin') as admin \gset
select tests.create_user('p1@cap.test', 'Peter Prvý') as p1 \gset
select tests.create_user('p2@cap.test', 'Pavol Druhý') as p2 \gset
select tests.create_user('p3@cap.test', 'Pavel Tretí') as p3 \gset
select tests.create_user('p4@cap.test', 'Patrik Štvrtý') as p4 \gset
select tests.create_user('p5@cap.test', 'Pio Piaty') as p5 \gset
select tests.create_user('g1@cap.test', 'Gabo Brankár') as g1 \gset
select tests.create_user('g2@cap.test', 'Gusto Brankár') as g2 \gset
select tests.create_user('outsider@cap.test', 'Oto Cudzí') as outsider \gset

select tests.create_group(:'admin') as grp \gset
select tests.join(:'grp', u) from unnest(array[:'p1', :'p2', :'p3', :'p4', :'p5', :'g1', :'g2']::uuid[]) u;
select tests.create_session(:'admin', :'grp', '2030-01-10 19:00+00', 3, 1) as sess \gset

select tests.register(:'p1', :'sess') as r1 \gset
select tests.register(:'p2', :'sess') as r2 \gset
select tests.register(:'p3', :'sess') as r3 \gset
select tests.register(:'p4', :'sess') as r4 \gset
select tests.register(:'p5', :'sess') as r5 \gset
select tests.register(:'g1', :'sess', 'goalie') as rg1 \gset
select tests.register(:'g2', :'sess', 'goalie') as rg2 \gset

select is(tests.status_of(:'r3'), 'confirmed', 'third skater fills the last spot');
select is(tests.status_of(:'r4'), 'waitlist', 'full session puts the fourth skater on the waitlist');
select is(tests.status_of(:'r5'), 'waitlist', 'fifth skater is on the waitlist too');
select is(tests.status_of(:'rg1'), 'confirmed', 'goalies have their own capacity');
select is(tests.status_of(:'rg2'), 'waitlist', 'second goalie waits in the goalie queue');
select is(private.confirmed_count(:'sess', 'skater'), 3, 'goalies do not take skater spots');

select results_eq(
  $$ select r.user_id from public.registrations r
     where r.session_id = '$$ || :'sess' || $$' and r.role = 'skater' and r.status = 'waitlist'
     order by r.created_at, r.seq $$,
  format($$ values (%L::uuid), (%L::uuid) $$, :'p4', :'p5'),
  'waitlist keeps registration order'
);

select throws_ok(
  format($$ select tests.register(%L, %L) $$, :'p2', :'sess'),
  'P0001', 'ALREADY_REGISTERED', 'one active registration per person'
);
select throws_ok(
  format($$ select tests.register(%L, %L) $$, :'outsider', :'sess'),
  'P0001', 'SPOT_NOT_OFFERED', 'non-member cannot register without a marketplace post'
);

-- Cancel before the free-cancellation deadline: free, first in the queue moves up.
select tests.act_as(:'p1');
select is((public.cancel_registration(:'r1')).status::text, 'cancelled', 'early cancellation is free');
select is((select cancel_reason::text from public.registrations where id = :'r1'), 'self', 'reason is self');
select is(tests.status_of(:'r4'), 'confirmed', 'first waitlisted skater is promoted');
select isnt((select promoted_at from public.registrations where id = :'r4'), null, 'promoted_at is set');
select is(tests.status_of(:'r5'), 'waitlist', 'second waitlisted skater keeps waiting');

select tests.act_as(:'g1');
select public.cancel_registration(:'rg1');
select is(tests.status_of(:'rg2'), 'confirmed', 'goalie queue promotes the waiting goalie');
select is(tests.status_of(:'r5'), 'waitlist', 'goalie cancellation does not promote skaters');

-- The promotion notice is acknowledged once.
select tests.act_as(:'p4');
select public.mark_promotion_seen(:'r4');
select isnt((select promotion_seen_at from public.registrations where id = :'r4'), null, 'promotion can be acknowledged');

-- Re-registering after cancelling goes to the end of the queue.
select tests.register(:'p1', :'sess') as r1b \gset
select is(tests.status_of(:'r1b'), 'waitlist', 'cancelled player can register again and waits');

-- Admin adds a member; a non-admin cannot register someone else.
select tests.act_as(:'p2');
select throws_ok(
  format($$ select public.register_for_session(%L, 'skater', %L) $$, :'sess', :'p3'),
  'P0001', 'NOT_GROUP_ADMIN', 'only admins register other people'
);
select tests.act_as(:'admin');
select is((public.register_for_session(:'sess', 'skater', :'admin')).status::text, 'waitlist',
  'admin registration follows the same capacity rules');
select throws_ok(
  format($$ select public.register_for_session(%L, 'skater', %L) $$, :'sess', :'outsider'),
  'P0001', 'NOT_GROUP_MEMBER', 'admin can only add members of the group'
);

-- Capacity change: increase promotes, decrease below confirmed fails.
select public.update_session(:'sess', '2030-01-10 19:00+00', 75, 'Zimný štadión', 4, 1, 18000, 1500,
  'dynamic', null, 50, 24, null);
select is(tests.status_of(:'r5'), 'confirmed', 'raising capacity promotes the next waitlisted skater');
select throws_ok(
  format($$ select public.update_session(%L, '2030-01-10 19:00+00', 75, 'Zimný štadión', 2, 1, 18000, 1500, 'dynamic', null, 50, 24, null) $$, :'sess'),
  'P0001', 'CAPACITY_BELOW_CONFIRMED', 'capacity cannot drop below confirmed players'
);

-- Registration closes when the session starts.
select tests.set_now('2030-01-10 19:00+00');
select throws_ok(
  format($$ select tests.register(%L, %L) $$, :'outsider', :'sess'),
  'P0001', 'REGISTRATION_CLOSED', 'no registration after the start'
);
select throws_ok(
  format($$ select tests.act_as(%L); select public.cancel_registration(%L) $$, :'p2', :'r2'),
  'P0001', 'REGISTRATION_CLOSED', 'no self-cancellation after the start'
);

-- Weekly series keeps the local time across the daylight-saving change (31 March 2030).
select tests.set_now('2030-03-01 12:00+00');
select tests.act_as(:'admin');
select is(
  (select array_agg(to_char(s.starts_at at time zone 'Europe/Bratislava', 'YYYY-MM-DD HH24:MI') order by s.starts_at)
   from public.create_sessions(p_group_id => :'grp', p_starts_at => '2030-03-21 20:00 Europe/Bratislava', p_repeat_weeks => 3) s),
  array['2030-03-21 20:00', '2030-03-28 20:00', '2030-04-04 20:00'],
  'weekly series keeps 20:00 local time'
);
select throws_ok(
  format($$ select public.create_sessions(p_group_id => %L, p_starts_at => '2030-03-21 20:00+00', p_repeat_weeks => 13) $$, :'grp'),
  'P0001', 'INVALID_REPEAT', 'at most 12 weeks'
);

-- Cancelling a session cancels every registration without a fee.
select tests.create_session(:'admin', :'grp', '2030-03-10 19:00+00', 2, 1) as sess2 \gset
select tests.register(:'p1', :'sess2') as s2r1 \gset
select tests.register(:'p2', :'sess2') as s2r2 \gset
select tests.register(:'p3', :'sess2') as s2r3 \gset
select tests.act_as(:'admin');
select is((public.cancel_session(:'sess2')).status::text, 'cancelled', 'session is cancelled');
select is(
  (select count(*)::int from public.registrations where session_id = :'sess2' and status = 'cancelled' and cancel_reason = 'session_cancelled'),
  3, 'all registrations are cancelled with the session'
);
select is((select count(*)::int from public.ledger_entries where session_id = :'sess2'), 0, 'no fee for a cancelled session');

select * from finish();
rollback;
