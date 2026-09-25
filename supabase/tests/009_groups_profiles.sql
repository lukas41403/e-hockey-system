-- Groups, membership, roles and profiles (sections 3, 4.11).
begin;
select plan(28);

select tests.set_now('2030-01-01 12:00+00');
select tests.create_user('admin@grp.test', 'Adam Admin') as admin \gset
select tests.create_user('second@grp.test', 'Boris Druhý') as second \gset
select tests.create_user('member@grp.test', 'Miro Člen') as member \gset
select tests.create_user('new@grp.test') as newbie \gset

-- IBAN validation
select ok(private.is_valid_iban('SK31 1200 0000 1987 4263 7541'), 'valid SK IBAN with spaces');
select ok(private.is_valid_iban('CZ6508000000192000145399'), 'valid CZ IBAN');
select ok(not private.is_valid_iban('SK3112000000198742637542'), 'wrong checksum is rejected');
select ok(not private.is_valid_iban('SK311200000019874263754'), 'wrong length for the country is rejected');
select ok(not private.is_valid_iban('XX3112000000198742637541'), 'unknown country is rejected');

-- Group creation
select tests.act_as(:'admin');
select throws_ok(
  $$ select public.create_group('Partička', 'Nitra', 'SK', 'SK3112000000198742637542', 'Adam Admin') $$,
  'P0001', 'INVALID_IBAN', 'group IBAN is validated'
);
select (public.create_group('Úterní hokej', 'Brno', 'CZ', 'CZ65 0800 0000 1920 0014 5399', 'Adam Admin')).id as grp_cz \gset
select is((select currency::text from public.groups where id = :'grp_cz'), 'CZK', 'CZ group uses CZK');
select is((select rounding_step_cents from public.groups where id = :'grp_cz'), 1000, 'CZK rounds to 10 Kc by default');
select is((select iban from public.groups where id = :'grp_cz'), 'CZ6508000000192000145399', 'IBAN is stored normalized');
select tests.create_group(:'admin') as grp \gset
select is((select rounding_step_cents from public.groups where id = :'grp'), 50, 'EUR rounds to 0.50 by default');
select is(private.member_role(:'grp', :'admin')::text, 'admin', 'creator becomes admin');
select ok((select invite_code ~ '^[A-Z0-9]{8}$' from public.groups where id = :'grp'), 'invite code has 8 characters');

-- Invite codes
select tests.act_as(:'member');
select throws_ok($$ select public.join_group('NEPLATNY') $$, 'P0001', 'INVALID_INVITE_CODE', 'unknown invite code');
select (select invite_code from public.groups where id = :'grp') as old_code \gset
select is(public.join_group(:'old_code'), :'grp'::uuid, 'joining with the invite code');
select is(public.join_group(:'old_code'), :'grp'::uuid, 'joining twice is harmless');
select tests.act_as(:'admin');
select isnt(public.regenerate_invite_code(:'grp'), :'old_code', 'new invite code is generated');
select tests.act_as(:'second');
select throws_ok(format($$ select public.join_group(%L) $$, :'old_code'), 'P0001', 'INVALID_INVITE_CODE', 'old code stops working');
select tests.join(:'grp', :'second');

-- Roles and the last admin
select tests.act_as(:'admin');
select throws_ok(
  format($$ select public.set_member_role(%L, %L, 'member') $$, :'grp', :'admin'),
  'P0001', 'LAST_ADMIN', 'the last admin cannot be demoted'
);
select throws_ok(
  format($$ select public.remove_member(%L, %L) $$, :'grp', :'admin'),
  'P0001', 'LAST_ADMIN', 'the last admin cannot be removed'
);
select public.set_member_role(:'grp', :'second', 'admin');
select lives_ok(
  format($$ select public.set_member_role(%L, %L, 'member') $$, :'grp', :'admin'),
  'with two admins one can step down'
);
select tests.act_as(:'second');

-- Removing members: balance must be zero, future registrations are cancelled.
select public.record_cash_payment(:'grp', :'member', 1000);
select throws_ok(
  format($$ select public.remove_member(%L, %L) $$, :'grp', :'member'),
  'P0001', 'MEMBER_HAS_BALANCE', 'member with a balance cannot be removed'
);
select public.add_adjustment(:'grp', :'member', -1000, 'Vrátené v hotovosti');
select tests.create_session(:'second', :'grp', '2030-01-10 19:00+00') as sess \gset
select tests.register(:'member', :'sess') as mreg \gset
select tests.act_as(:'second');
select public.remove_member(:'grp', :'member');
select is(private.member_role(:'grp', :'member'), null, 'member is removed');
select is(tests.status_of(:'mreg'), 'cancelled', 'their registrations are cancelled');

-- Profile / onboarding
select tests.act_as(:'newbie');
select throws_ok($$ select public.update_my_profile('A') $$, 'P0001', 'FULL_NAME_REQUIRED', 'name is required');
select throws_ok($$ select public.update_my_profile('Nový Hráč', null, 100) $$, 'P0001', 'INVALID_JERSEY_NUMBER', 'jersey 0-99');
select throws_ok($$ select public.update_my_profile('Nový Hráč', null, 9, 'skater', '0905123456') $$, 'P0001', 'INVALID_PHONE', 'phone must be E.164');
select throws_ok($$ select public.update_my_profile('Nový Hráč', null, 9, 'skater', null, 'SK00') $$, 'P0001', 'INVALID_IBAN', 'profile IBAN is validated');
select isnt(
  (public.update_my_profile('Nový Hráč', 'Novy', 9, 'goalie', '+421905123456', 'sk31 1200 0000 1987 4263 7541')).onboarded_at,
  null, 'valid profile completes onboarding'
);

select * from finish();
rollback;
