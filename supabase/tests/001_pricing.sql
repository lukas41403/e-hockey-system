-- Price per skater (section 4.5). The same cases are in src/lib/pricing.test.ts.
begin;
select plan(9);

-- private.skater_price(mode, fixed_price, ice, goalie_fee, goalies_attended, payers, step)
select is(private.skater_price('dynamic', null, 18000, 1500, 2, 20, 50), 1050::bigint,
  'ice 180, 2 goalies x 15, 20 payers, step 0.50 -> 10.50');
select is(private.skater_price('dynamic', null, 18000, 1500, 2, 19, 50), 1150::bigint,
  'same with 19 payers -> 11.50 (210 / 19 = 11.05)');
select is(private.skater_price('dynamic', null, 18000, 1500, 1, 20, 50), 1000::bigint,
  'only 1 goalie attended, 20 payers -> 10.00 (195 / 20 = 9.75)');
select is(private.skater_price('dynamic', null, 18000, 1500, 2, 0, 50), null::bigint,
  '0 payers -> no price, nothing is charged');
select is(private.skater_price('dynamic', null, 20000, 0, 0, 20, 50), 1000::bigint,
  'exact division is not rounded up');
select is(private.skater_price('dynamic', null, 450000, 40000, 2, 20, 1000), 27000::bigint,
  'CZK: ice 4500, 2 goalies x 400, 20 payers, step 10 Kc -> 270 Kc');
select is(private.skater_price('dynamic', null, 0, 0, 2, 20, 50), 0::bigint,
  'no costs -> price 0');
select is(private.skater_price('fixed', 1200, 18000, 1500, 2, 7, 50), 1200::bigint,
  'fixed price ignores costs and payers');
select is(private.skater_price('fixed', 1200, 18000, 1500, 2, 0, 50), null::bigint,
  'fixed price with 0 payers -> nothing is charged');

select * from finish();
rollback;
