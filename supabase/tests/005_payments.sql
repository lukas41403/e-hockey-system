-- Payments, goalie payouts and adjustments (sections 4.7, 4.8).
begin;
select plan(35);

select tests.set_now('2030-01-01 12:00+00');
select tests.create_user('admin@pay.test', 'Adam Admin') as admin \gset
select tests.create_user('player@pay.test', 'Ľubomír Šťastný') as player \gset
select tests.create_user('goalie@pay.test', 'Gabo Brankár') as goalie \gset
select tests.create_user('outsider@pay.test', 'Oto Cudzí') as outsider \gset
select tests.create_group(:'admin', 'Štvrtková partička') as grp \gset
select tests.join(:'grp', u) from unnest(array[:'player', :'goalie']::uuid[]) u;

-- Payment request
select tests.act_as(:'player');
select (public.create_payment_request(:'grp', 5000)).id as pay1 \gset
select is((select status::text from public.payments where id = :'pay1'), 'pending', 'request starts pending');
select ok((select variable_symbol between 1 and 9999999999 from public.payments where id = :'pay1'), 'VS is numeric with at most 10 digits');
select is((select message from public.payments where id = :'pay1'), 'Lubomir Stastny - Stvrtkova particka', 'message is short ASCII without diacritics');
select is((select currency::text from public.payments where id = :'pay1'), 'EUR', 'currency comes from the group');
select (public.create_payment_request(:'grp', 2000)).id as pay2 \gset
select isnt((select variable_symbol from public.payments where id = :'pay1'), (select variable_symbol from public.payments where id = :'pay2'), 'variable symbols are unique');
select throws_ok(
  format($$ select public.create_payment_request(%L, 0) $$, :'grp'),
  'P0001', 'INVALID_AMOUNT', 'amount must be positive'
);
select tests.act_as(:'outsider');
select throws_ok(
  format($$ select public.create_payment_request(%L, 1000) $$, :'grp'),
  'P0001', 'NOT_GROUP_MEMBER', 'only members pay to the group'
);

-- Report
select tests.act_as(:'player');
select is((public.report_payment(:'pay1')).status::text, 'reported', 'player reports the transfer');
select throws_ok(
  format($$ select public.report_payment(%L) $$, :'pay1'),
  'P0001', 'PAYMENT_NOT_REPORTABLE', 'cannot report twice'
);

-- Confirm
select throws_ok(
  format($$ select public.confirm_payment(%L) $$, :'pay1'),
  'P0001', 'NOT_GROUP_ADMIN', 'player cannot confirm'
);
select tests.act_as(:'admin');
select is((public.confirm_payment(:'pay1')).status::text, 'confirmed', 'admin confirms');
select is((select count(*)::int from public.ledger_entries where payment_id = :'pay1'), 1, 'exactly one ledger entry');
select is((select type::text from public.ledger_entries where payment_id = :'pay1'), 'topup', 'the entry is a topup');
select is(tests.balance(:'grp', :'player'), 5000::bigint, 'balance increases by the amount');
select throws_ok(
  format($$ select public.confirm_payment(%L) $$, :'pay1'),
  'P0001', 'PAYMENT_ALREADY_CONFIRMED', 'double confirmation fails'
);
select is((select count(*)::int from public.ledger_entries where payment_id = :'pay1'), 1, 'still exactly one topup');

-- Reject
select is((public.reject_payment(:'pay2')).status::text, 'rejected', 'admin rejects');
select is((select count(*)::int from public.ledger_entries where payment_id = :'pay2'), 0, 'rejected payment creates no entry');
select throws_ok(
  format($$ select public.confirm_payment(%L) $$, :'pay2'),
  'P0001', 'PAYMENT_NOT_CONFIRMABLE', 'rejected payment cannot be confirmed'
);

-- Cancel
select tests.act_as(:'player');
select (public.create_payment_request(:'grp', 3000)).id as pay3 \gset
select is((public.cancel_payment(:'pay3')).status::text, 'cancelled', 'player cancels an unconfirmed payment');
select throws_ok(
  format($$ select public.cancel_payment(%L) $$, :'pay1'),
  'P0001', 'PAYMENT_NOT_CANCELLABLE', 'confirmed payment cannot be cancelled'
);

-- Cash
select tests.act_as(:'admin');
select (public.record_cash_payment(:'grp', :'player', 1500, 'V šatni')).id as cash1 \gset
select is((select status::text || '/' || method::text from public.payments where id = :'cash1'), 'confirmed/cash', 'cash is confirmed immediately');
select is(tests.balance(:'grp', :'player'), 6500::bigint, 'cash increases the balance');
select throws_ok(
  format($$ select public.record_cash_payment(%L, %L, 1000) $$, :'grp', :'outsider'),
  'P0001', 'NOT_GROUP_MEMBER', 'cash only for members'
);

-- Goalie payout: goalie earns 15.00 at a finalized session.
select tests.create_session(:'admin', :'grp', '2030-01-10 19:00+00', 20, 2) as sess \gset
select tests.register(:'goalie', :'sess', 'goalie');
select tests.register(:'player', :'sess');
select tests.set_now('2030-01-10 21:00+00');
select tests.act_as(:'admin');
select public.finalize_session(:'sess', tests.attendance(:'sess'));
select is(tests.balance(:'grp', :'goalie'), 1500::bigint, 'goalie is owed 15.00');

select throws_ok(
  format($$ select public.create_goalie_payout(%L, %L, 1501) $$, :'grp', :'goalie'),
  'P0001', 'PAYOUT_EXCEEDS_BALANCE', 'payout above the balance fails'
);
select throws_ok(
  format($$ select public.create_goalie_payout(%L, %L, 100) $$, :'grp', :'player'),
  'P0001', 'NOT_A_GOALIE', 'payouts are for goalies'
);
select (public.create_goalie_payout(:'grp', :'goalie', 1000)).id as payout1 \gset
select is((select direction::text || '/' || status::text from public.payments where id = :'payout1'), 'outgoing/pending', 'payout is prepared as pending outgoing');
select is(tests.balance(:'grp', :'goalie'), 1500::bigint, 'nothing moves before the payout is confirmed');
select (public.create_goalie_payout(:'grp', :'goalie', 1500)).id as payout2 \gset
select is((select status::text from public.payments where id = :'payout1'), 'cancelled', 'a new payout replaces the unconfirmed one');
select is((public.confirm_goalie_payout(:'payout2')).status::text, 'confirmed', 'admin confirms the payout');
select is(tests.balance(:'grp', :'goalie'), 0::bigint, 'goalie balance drops to zero');
select is((select type::text from public.ledger_entries where payment_id = :'payout2'), 'goalie_payout', 'payout creates a goalie_payout entry');

-- Adjustments need a note.
select throws_ok(
  format($$ select public.add_adjustment(%L, %L, 500, '  ') $$, :'grp', :'player'),
  'P0001', 'NOTE_REQUIRED', 'adjustment needs a note'
);
select is((public.add_adjustment(:'grp', :'player', -500, 'Oprava')).amount_cents, -500::bigint, 'adjustment with a note is recorded');

select * from finish();
rollback;
