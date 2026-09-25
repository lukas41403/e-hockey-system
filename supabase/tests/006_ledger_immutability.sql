-- The ledger is append-only for everyone (section 4.1).
begin;
select plan(6);

select tests.set_now('2030-01-01 12:00+00');
select tests.create_user('admin@led.test', 'Adam Admin') as admin \gset
select tests.create_user('player@led.test', 'Peter Hráč') as player \gset
select tests.create_group(:'admin') as grp \gset
select tests.join(:'grp', :'player');
select tests.act_as(:'admin');
select (public.record_cash_payment(:'grp', :'player', 2000)).id as pay \gset
select (select id from public.ledger_entries where payment_id = :'pay') as entry \gset

select throws_ok(
  format($$ update public.ledger_entries set amount_cents = 99999 where id = %L $$, :'entry'),
  'P0001', 'LEDGER_IMMUTABLE', 'update is blocked even for the table owner'
);
select throws_ok(
  format($$ delete from public.ledger_entries where id = %L $$, :'entry'),
  'P0001', 'LEDGER_IMMUTABLE', 'delete is blocked even for the table owner'
);
select throws_ok(
  $$ truncate public.ledger_entries cascade $$,
  'P0001', 'LEDGER_IMMUTABLE', 'truncate is blocked'
);

-- service_role bypasses RLS but not the trigger.
grant update, delete on public.ledger_entries to service_role;
set local role service_role;
select throws_ok(
  format($$ update public.ledger_entries set note = 'x' where id = %L $$, :'entry'),
  'P0001', 'LEDGER_IMMUTABLE', 'service_role cannot update'
);
select throws_ok(
  format($$ delete from public.ledger_entries where id = %L $$, :'entry'),
  'P0001', 'LEDGER_IMMUTABLE', 'service_role cannot delete'
);
reset role;

select is((select amount_cents from public.ledger_entries where id = :'entry'), 2000::bigint, 'entry is unchanged');

select * from finish();
rollback;
