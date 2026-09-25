-- Row level security, grants and admin-only functions (section 6).
begin;
select plan(44);

select tests.set_now('2030-01-01 12:00+00');
select tests.create_user('adminA@rls.test', 'Adam Admin A') as admin_a \gset
select tests.create_user('memberA@rls.test', 'Miro Člen A') as member_a \gset
select tests.create_user('member2A@rls.test', 'Mišo Člen A2') as member2_a \gset
select tests.create_user('adminB@rls.test', 'Boris Admin B') as admin_b \gset
select tests.create_user('memberB@rls.test', 'Braňo Člen B') as member_b \gset
select tests.create_user('guest@rls.test', 'Hugo Hosť') as guest \gset

select tests.create_group(:'admin_a', 'Partička A') as grp_a \gset
select tests.create_group(:'admin_b', 'Partička B') as grp_b \gset
select tests.join(:'grp_a', :'member_a');
select tests.join(:'grp_a', :'member2_a');
select tests.join(:'grp_b', :'member_b');

-- Private data
select tests.act_as(:'member_a');
select public.update_my_profile('Miro Člen A', null, 7, 'skater', '+421905111222', 'SK3112000000198742637541');
select tests.act_as(:'member2_a');
select public.update_my_profile('Mišo Člen A2', null, 8, 'skater', '+421905333444', 'SK0809000000000123123123');
select tests.act_as(:'member_b');
select public.update_my_profile('Braňo Člen B', null, 9, 'skater', '+421905555666', 'SK2411000000002612345678');
select tests.act_as(:'admin_a');
select public.update_my_profile('Adam Admin A', null, 1, 'skater', '+421905777888', null);

-- Data in both groups
select tests.create_session(:'admin_a', :'grp_a', '2030-01-10 19:00+00') as sess_a \gset
select tests.create_session(:'admin_a', :'grp_a', '2030-01-17 19:00+00') as sess_a2 \gset
select tests.create_session(:'admin_b', :'grp_b', '2030-01-10 19:00+00') as sess_b \gset
select tests.register(:'member_a', :'sess_a');
select tests.register(:'member2_a', :'sess_a');
select tests.register(:'member_b', :'sess_b');
select tests.act_as(:'admin_a');
select public.record_cash_payment(:'grp_a', :'member_a', 1000);
select public.record_cash_payment(:'grp_a', :'member2_a', 2000);
select tests.act_as(:'admin_b');
select public.record_cash_payment(:'grp_b', :'member_b', 3000);
-- Guest of group A registered for one session only (via a post without approval).
select tests.act_as(:'admin_a');
select public.publish_open_spots(:'sess_a', true, false, false, null);
select tests.register(:'guest', :'sess_a');

-- ---- member of A ----
select tests.act_as(:'member_a');
set local role authenticated;
select is((select count(*)::int from public.groups), 1, 'member sees only their group');
select is((select count(*)::int from public.groups where id = :'grp_b'), 0, 'member of A does not see group B');
select is((select count(*)::int from public.sessions where group_id = :'grp_b'), 0, 'no sessions of B');
select is((select count(*)::int from public.registrations where group_id = :'grp_b'), 0, 'no registrations of B');
select is((select count(*)::int from public.group_members where group_id = :'grp_b'), 0, 'no members of B');
select is((select count(*)::int from public.payments where group_id = :'grp_b'), 0, 'no payments of B');
select is((select count(*)::int from public.profiles where id = :'member_b'), 0, 'no profiles of B');
select is((select count(*)::int from public.sessions), 2, 'member sees all sessions of A');
select is((select count(*)::int from public.registrations where session_id = :'sess_a'), 3, 'member sees the roster of A');
select is((select count(*)::int from public.ledger_entries), 1, 'member sees only their own ledger');
select is((select count(*)::int from public.ledger_entries where user_id = :'member2_a'), 0, 'no ledger of another member');
select is((select count(*)::int from public.payments where user_id = :'member2_a'), 0, 'no payments of another member');
select is((select count(*)::int from public.profile_private), 1, 'member sees only their own private data');
select is((select count(*)::int from public.profile_private where user_id = :'member2_a'), 0, 'no foreign IBAN or phone');
select is((select count(*)::int from public.profile_private where user_id = :'admin_a'), 0, 'not even the admin''s phone directly');
select is((select count(*)::int from public.member_balances), 1, 'balances view shows only own balance');
select is((select count(*)::int from public.group_finance_summary), 0, 'finance summary is admin-only');
select is((select count(*)::int from public.member_finance), 0, 'member finance table is admin-only');
select is((select phone_e164 from public.get_group_admin_contacts(:'grp_a')), '+421905777888', 'admin contact comes through the function');
select throws_ok(
  format($$ select * from public.get_group_admin_contacts(%L) $$, :'grp_b'),
  'P0001', 'NOT_GROUP_MEMBER', 'no admin contact of a foreign group'
);

-- Direct writes are not granted.
select throws_ok(
  format($$ insert into public.ledger_entries (group_id, user_id, type, amount_cents, note) values (%L, %L, 'adjustment', 100000, 'x') $$, :'grp_a', :'member_a'),
  '42501', null, 'no direct insert into the ledger'
);
select throws_ok(
  $$ update public.registrations set status = 'confirmed' $$,
  '42501', null, 'no direct update of registrations'
);
select throws_ok(
  $$ update public.profiles set is_superadmin = true $$,
  '42501', null, 'no direct update of profiles'
);

-- Admin functions are refused for members and outsiders.
select throws_ok(
  format($$ select public.create_sessions(p_group_id => %L, p_starts_at => '2030-02-01 19:00+00') $$, :'grp_a'),
  'P0001', 'NOT_GROUP_ADMIN', 'member cannot create sessions'
);
select throws_ok(
  format($$ select public.record_cash_payment(%L, %L, 1000) $$, :'grp_a', :'member_a'),
  'P0001', 'NOT_GROUP_ADMIN', 'member cannot record cash'
);
select throws_ok(
  format($$ select public.set_member_role(%L, %L, 'admin') $$, :'grp_a', :'member_a'),
  'P0001', 'NOT_GROUP_ADMIN', 'member cannot promote themselves'
);
select throws_ok(
  format($$ select public.regenerate_invite_code(%L) $$, :'grp_a'),
  'P0001', 'NOT_GROUP_ADMIN', 'member cannot regenerate the invite code'
);
select throws_ok(
  format($$ select public.cancel_session(%L) $$, :'sess_b'),
  'P0001', 'NOT_GROUP_ADMIN', 'outsider cannot cancel a session of B'
);
select throws_ok(
  format($$ select public.add_adjustment(%L, %L, 1000, 'x') $$, :'grp_b', :'member_b'),
  'P0001', 'NOT_GROUP_ADMIN', 'outsider cannot adjust balances of B'
);
reset role;

-- ---- admin of A ----
select tests.act_as(:'admin_a');
set local role authenticated;
select is((select count(*)::int from public.ledger_entries), 2, 'admin sees the whole ledger of A');
select is((select count(*)::int from public.ledger_entries where group_id = :'grp_b'), 0, 'admin of A sees nothing of B');
select is((select count(*)::int from public.profile_private where user_id in (:'member_a', :'member2_a')), 2, 'admin reads private data of members');
select is((select count(*)::int from public.profile_private where user_id = :'member_b'), 0, 'admin of A cannot read private data of B');
select is((select count(*)::int from public.group_finance_summary), 1, 'admin sees the finance summary of their group');
reset role;

-- ---- guest of A ----
select tests.act_as(:'guest');
set local role authenticated;
select is((select count(*)::int from public.sessions), 1, 'guest sees only the session they registered for');
reset role;

-- ---- anon ----
select (select id from public.open_spot_posts where session_id = :'sess_a' and is_active) as post_a \gset
select tests.act_as(null);
set local role anon;
select throws_ok($$ select * from public.groups $$, '42501', null, 'anon cannot read groups');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select * from public.ledger_entries $$, '42501', null, 'anon cannot read the ledger');
select throws_ok($$ select * from public.open_spot_posts $$, '42501', null, 'anon cannot read posts directly');
select throws_ok($$ select * from public.list_open_spots() $$, '42501', null, 'anon cannot list the marketplace');
select is(
  (select array_agg(k order by k) from public.get_public_post(:'post_a') p,
     lateral jsonb_object_keys(to_jsonb(p)) k),
  array['city', 'currency', 'ends_at', 'estimated_full_price_cents', 'estimated_price_cents', 'free_goalie_spots',
        'free_skater_spots', 'goalie_fee_cents', 'group_name', 'is_available', 'note', 'offer_goalies', 'offer_skaters',
        'post_id', 'price_per_skater_cents', 'pricing_mode', 'require_approval', 'session_id', 'starts_at', 'venue'],
  'public post exposes only the allowed fields'
);
reset role;

-- Catalogue-wide: anon has no table privilege and exactly one executable public function.
select is(
  (select count(*)::int from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm', 'p')
     and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert')
       or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete'))),
  0, 'anon has no privilege on any table or view'
);
select is(
  (select array_agg(p.proname::text) from pg_proc p
   where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute')),
  array['get_public_post'], 'anon can execute only get_public_post'
);
select is(
  (select count(*)::int from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'p')
     and (has_table_privilege('authenticated', c.oid, 'insert') or has_table_privilege('authenticated', c.oid, 'update')
       or has_table_privilege('authenticated', c.oid, 'delete') or has_table_privilege('authenticated', c.oid, 'truncate'))),
  0, 'authenticated cannot write any table directly'
);

select * from finish();
rollback;
