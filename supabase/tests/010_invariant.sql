-- Financial invariant for every group (section 11.8), on the seed data and after a scenario:
--   cash available = sum of balances + sum of results of completed sessions - sum of adjustments
-- If it does not hold, the bug is in the logic, not in this test.
begin;
select plan(12);

select is_empty($$ select * from tests.invariant_violations() $$, 'invariant holds for every group in the current data');
select ok((select count(*) from public.groups) >= 3, 'seed data is present');

-- The admin view agrees with the raw computation for every group.
select is_empty(
  $$ select g.id from public.groups g where not tests.summary_satisfies_invariant(g.id) $$,
  'group_finance_summary satisfies the invariant for every group'
);

-- Scenario touching every ledger entry type, including reopen and re-finalize.
select tests.set_now('2030-01-01 12:00+00');
select tests.create_user('admin@inv.test', 'Adam Admin') as admin \gset
select tests.create_group(:'admin', 'Invariant partička') as grp \gset
create temporary table inv_players as
select tests.create_user('p' || i || '@inv.test', 'Hráč ' || i) as user_id, i from generate_series(1, 19) i;
select tests.create_user('g1@inv.test', 'Brankár Jeden') as g1 \gset
select tests.create_user('g2@inv.test', 'Brankár Dva') as g2 \gset
select tests.join(:'grp', user_id) from inv_players;
select tests.join(:'grp', u) from unnest(array[:'g1', :'g2']::uuid[]) u;

-- Prepayments (transfer and cash), a rejected and a cancelled payment.
select tests.act_as(user_id), public.report_payment((public.create_payment_request(:'grp', 3000)).id)
from inv_players where i <= 10;
select tests.act_as(:'admin');
select public.confirm_payment(p.id) from public.payments p where p.group_id = :'grp' and p.status = 'reported';
select public.record_cash_payment(:'grp', user_id, 2000) from inv_players where i between 11 and 14;
select tests.act_as((select user_id from inv_players where i = 15));
select (public.create_payment_request(:'grp', 5000)).id as rejected_pay \gset
select tests.act_as(:'admin');
select public.reject_payment(:'rejected_pay');

-- Session 1: 19 players incl. a late cancellation, both goalies, one no-show.
select tests.create_session(:'admin', :'grp', '2030-01-10 19:00+00', 20, 2) as s1 \gset
select tests.register(user_id, :'s1') from inv_players order by i;
select tests.register(:'g1', :'s1', 'goalie');
select tests.register(:'g2', :'s1', 'goalie');
select tests.set_now('2030-01-10 12:00+00');
select tests.act_as((select user_id from inv_players where i = 19));
select public.cancel_registration((select id from public.registrations where session_id = :'s1' and user_id = (select user_id from inv_players where i = 19)));
select tests.set_now('2030-01-10 21:00+00');
select tests.act_as(:'admin');
select public.finalize_session(:'s1', tests.attendance(:'s1', array[(select id from public.registrations where session_id = :'s1' and user_id = (select user_id from inv_players where i = 3))]));
select is_empty($$ select * from tests.invariant_violations() $$, 'invariant after finalization');

-- Reopen, correct and finalize again.
select public.reopen_session(:'s1');
select is_empty($$ select * from tests.invariant_violations() $$, 'invariant after reopening');
select public.finalize_session(:'s1', tests.attendance(:'s1'));
select is_empty($$ select * from tests.invariant_violations() $$, 'invariant after re-finalization');

-- Session 2 with nobody paying (only a goalie).
select tests.set_now('2030-01-11 12:00+00');
select tests.create_session(:'admin', :'grp', '2030-01-12 19:00+00', 20, 2) as s2 \gset
select tests.register(:'g1', :'s2', 'goalie');
select tests.set_now('2030-01-12 21:00+00');
select tests.act_as(:'admin');
select public.finalize_session(:'s2', tests.attendance(:'s2'));
select is_empty($$ select * from tests.invariant_violations() $$, 'invariant with a loss-making session');

-- Goalie payout and adjustments.
select public.confirm_goalie_payout((public.create_goalie_payout(:'grp', :'g1', 2000)).id);
select public.add_adjustment(:'grp', (select user_id from inv_players where i = 1), 500, 'Vrátený preplatok');
select public.add_adjustment(:'grp', (select user_id from inv_players where i = 2), -300, 'Požičaná hokejka');
select is_empty($$ select * from tests.invariant_violations() $$, 'invariant after payouts and adjustments');

-- Cancelled session changes nothing.
select tests.set_now('2030-01-13 12:00+00');
select tests.create_session(:'admin', :'grp', '2030-01-20 19:00+00', 20, 2) as s3 \gset
select tests.register(user_id, :'s3') from inv_players where i <= 5;
select tests.act_as(:'admin');
select public.cancel_session(:'s3');
select is_empty($$ select * from tests.invariant_violations() $$, 'invariant after a cancelled session');

-- Balances equal the sum of ledger entries, also through the view, for every member.
select tests.act_as(:'admin');
select is_empty(
  $$ select 1 from public.member_balances mb
     where mb.group_id = '$$ || :'grp' || $$'
       and mb.balance_cents <> (select coalesce(sum(le.amount_cents), 0) from public.ledger_entries le
                                where le.group_id = mb.group_id and le.user_id = mb.user_id) $$,
  'member_balances equals the ledger sum for every member'
);
set local role authenticated;
select is(
  (select cash_available_cents from public.group_finance_summary where group_id = :'grp'),
  (select balances_total_cents + sessions_result_cents - adjustments_cents from public.group_finance_summary where group_id = :'grp'),
  'the finance summary view satisfies the invariant'
);
select is(
  (select cash_available_cents from public.group_finance_summary where group_id = :'grp'),
  (select collected_cents - paid_out_cents - ice_total_cents from public.group_finance_summary where group_id = :'grp'),
  'cash available = collected - paid out - ice'
);
reset role;

select * from finish();
rollback;
