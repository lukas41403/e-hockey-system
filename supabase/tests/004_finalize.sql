-- Session finalization and reopening (section 4.6).
begin;
select plan(28);

select tests.set_now('2030-01-01 12:00+00');
select tests.create_user('admin@fin.test', 'Adam Admin') as admin \gset
select tests.create_user('member@fin.test', 'Miro Člen') as member \gset
select tests.create_group(:'admin') as grp \gset

-- 20 skaters + 2 goalies.
create temporary table skaters as
select tests.create_user('s' || i || '@fin.test', 'Hráč ' || i) as user_id, i
from generate_series(1, 20) i;
select tests.create_user('g1@fin.test', 'Gabo Brankár') as g1 \gset
select tests.create_user('g2@fin.test', 'Gusto Brankár') as g2 \gset
select tests.join(:'grp', user_id) from skaters;
select tests.join(:'grp', u) from unnest(array[:'g1', :'g2', :'member']::uuid[]) u;

select tests.create_session(:'admin', :'grp', '2030-01-10 19:00+00', 20, 2) as sess \gset
select tests.register(user_id, :'sess') from skaters order by i;
select tests.register(:'g1', :'sess', 'goalie') as rg1 \gset
select tests.register(:'g2', :'sess', 'goalie') as rg2 \gset
select (select r.id from public.registrations r join skaters s on s.user_id = r.user_id where s.i = 20 and r.session_id = :'sess') as r_absent \gset
select (select user_id from skaters where i = 20) as absent_user \gset

select tests.act_as(:'admin');
select throws_ok(
  format($$ select public.finalize_session(%L, tests.attendance(%L)) $$, :'sess', :'sess'),
  'P0001', 'SESSION_NOT_STARTED', 'cannot finalize before the start'
);

select tests.set_now('2030-01-10 21:00+00');
select throws_ok(
  format($$ select public.finalize_session(%L, '{}'::jsonb) $$, :'sess'),
  'P0001', 'ATTENDANCE_INCOMPLETE', 'attendance must cover every confirmed registration'
);
select throws_ok(
  format($$ select public.finalize_session(%L, tests.attendance(%L) || jsonb_build_object(gen_random_uuid()::text, true)) $$, :'sess', :'sess'),
  'P0001', 'INVALID_ATTENDANCE', 'unknown registration in attendance is rejected'
);
select tests.act_as(:'member');
select throws_ok(
  format($$ select public.finalize_session(%L, tests.attendance(%L)) $$, :'sess', :'sess'),
  'P0001', 'NOT_GROUP_ADMIN', 'only admins finalize'
);

-- Skater 20 and goalie 2 did not come. 1 goalie: (180 + 15) / 20 = 9.75 -> 10.00.
select tests.act_as(:'admin');
select public.finalize_session(:'sess', tests.attendance(:'sess', array[:'r_absent', :'rg2']::uuid[]));

select is((select status::text from public.sessions where id = :'sess'), 'completed', 'session is completed');
select is((select final_price_per_skater_cents from public.sessions where id = :'sess'), 1000::bigint, 'price 10.00 with one goalie');
select isnt((select finalized_at from public.sessions where id = :'sess'), null, 'finalized_at is set');
select is((select finalized_by from public.sessions where id = :'sess'), :'admin'::uuid, 'finalized_by is the admin');
select is((select count(*)::int from public.ledger_entries where session_id = :'sess' and type = 'charge'), 20, 'every confirmed skater is charged');
select is(tests.balance(:'grp', :'absent_user'), -1000::bigint, 'skater who did not come pays too');
select is((select attended from public.registrations where id = :'r_absent'), false, 'attendance is stored');
select is(tests.balance(:'grp', :'g1'), 1500::bigint, 'attending goalie earns the fee');
select is(tests.balance(:'grp', :'g2'), 0::bigint, 'goalie who did not come earns nothing');

select tests.set_now('2030-01-10 21:05+00');
select throws_ok(
  format($$ select public.finalize_session(%L, tests.attendance(%L)) $$, :'sess', :'sess'),
  'P0001', 'ALREADY_FINALIZED', 'finalization cannot happen twice'
);
select is(
  (select result_cents from public.session_summaries where session_id = :'sess'),
  20000::bigint - 18000 - 1500,
  'session result = charged - ice - goalie fees'
);

-- Reopen: every entry reversed, everything back to zero.
select public.reopen_session(:'sess');
select is((select status::text from public.sessions where id = :'sess'), 'scheduled', 'reopened session is scheduled');
select is((select count(*)::int from public.ledger_entries where session_id = :'sess' and type = 'reversal'), 21, 'each entry gets a reversal');
select is((select coalesce(sum(amount_cents), 0)::bigint from public.ledger_entries where session_id = :'sess'), 0::bigint, 'session ledger nets to zero');
select is(
  (select count(*)::int from public.ledger_entries e where e.session_id = :'sess' and e.type = 'reversal'
     and e.amount_cents = -(select o.amount_cents from public.ledger_entries o where o.id = e.reverses_entry_id)),
  21, 'reversals are exact opposites'
);
select is(tests.balance(:'grp', :'g1'), 0::bigint, 'goalie balance back to zero');
select throws_ok(
  format($$ select public.reopen_session(%L) $$, :'sess'),
  'P0001', 'SESSION_NOT_FINALIZED', 'only a completed session can be reopened'
);

-- Corrected attendance: both goalies came. (180 + 30) / 20 = 10.50.
select tests.set_now('2030-01-10 21:10+00');
select public.finalize_session(:'sess', tests.attendance(:'sess'));
select is((select final_price_per_skater_cents from public.sessions where id = :'sess'), 1050::bigint, 'refinalized with 2 goalies: 10.50');
select is(tests.balance(:'grp', :'absent_user'), -1050::bigint, 'balance reflects only the new finalization');
select is(tests.balance(:'grp', :'g2'), 1500::bigint, 'second goalie now earns the fee');

-- Nobody paying: the session still completes, the cost stays with the group.
select tests.set_now('2030-01-11 12:00+00');
select tests.create_session(:'admin', :'grp', '2030-01-12 19:00+00', 20, 2) as empty_sess \gset
select tests.register(:'g1', :'empty_sess', 'goalie') as eg1 \gset
select tests.set_now('2030-01-12 21:00+00');
select tests.act_as(:'admin');
select public.finalize_session(:'empty_sess', tests.attendance(:'empty_sess'));
select is((select status::text from public.sessions where id = :'empty_sess'), 'completed', '0 payers: finalization succeeds');
select is((select final_price_per_skater_cents from public.sessions where id = :'empty_sess'), null::bigint, '0 payers: no price');
select is((select count(*)::int from public.ledger_entries where session_id = :'empty_sess' and type = 'charge'), 0, '0 payers: no charges');
select is(
  (select result_cents from public.session_summaries where session_id = :'empty_sess'),
  -18000::bigint - 1500,
  '0 payers: the whole cost is the group''s loss'
);

select * from finish();
rollback;
