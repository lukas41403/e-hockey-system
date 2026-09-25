-- Marketplace of open spots and guests (section 4.9).
begin;
select plan(24);

select tests.set_now('2030-01-01 12:00+00');
select tests.create_user('admin@mkt.test', 'Adam Admin') as admin \gset
select tests.create_user('member@mkt.test', 'Miro Člen') as member \gset
select tests.create_user('guest@mkt.test', 'Gabo Hosť') as guest \gset
select tests.create_user('guest2@mkt.test', 'Hugo Hosť') as guest2 \gset
select tests.create_user('guest3@mkt.test', 'Ivo Hosť') as guest3 \gset
select tests.create_group(:'admin', 'Štvrtková partička') as grp \gset
select tests.join(:'grp', :'member');

select tests.create_session(:'admin', :'grp', '2030-01-10 19:00+00', 20, 2) as sess \gset
select tests.create_session(:'admin', :'grp', '2030-01-17 19:00+00', 20, 1) as other_sess \gset

-- The admin looks for a goalie, guests need approval.
select tests.act_as(:'member');
select throws_ok(
  format($$ select public.publish_open_spots(%L, false, true) $$, :'sess'),
  'P0001', 'NOT_GROUP_ADMIN', 'only admins publish'
);
select tests.act_as(:'admin');
select (public.publish_open_spots(:'sess', false, true, true, 'Hľadáme brankára')).id as post \gset
select throws_ok(
  format($$ select public.publish_open_spots(%L, false, false) $$, :'sess'),
  'P0001', 'NOTHING_OFFERED', 'a post must offer something'
);

select tests.act_as(:'guest');
select is((select count(*)::int from public.list_open_spots() where post_id = :'post'), 1, 'post is listed for other users');
select is((select free_goalie_spots from public.list_open_spots() where post_id = :'post'), 2, 'free goalie spots are computed');
select is((select free_skater_spots from public.list_open_spots() where post_id = :'post'), null::int, 'skater spots are not offered');
select is((select goalie_fee_cents from public.list_open_spots() where post_id = :'post'), 1500::bigint, 'goalie fee is shown');
select is((select count(*)::int from public.list_open_spots(p_role => 'skater') where post_id = :'post'), 0, 'role filter: not listed for skaters');
select is((select count(*)::int from public.list_open_spots(p_city => 'nitra') where post_id = :'post'), 1, 'city filter is case-insensitive');
select is((select count(*)::int from public.list_open_spots(p_city => 'Brno') where post_id = :'post'), 0, 'city filter excludes other cities');

select throws_ok(
  format($$ select tests.register(%L, %L, 'skater') $$, :'guest', :'sess'),
  'P0001', 'SPOT_NOT_OFFERED', 'guest cannot take a position that is not offered'
);
select tests.register(:'guest', :'sess', 'goalie') as greg \gset
select is(tests.status_of(:'greg'), 'pending', 'guest waits for approval');
select is(private.member_role(:'grp', :'guest'), null, 'no membership before approval');
select throws_ok(
  format($$ select tests.register(%L, %L, 'goalie') $$, :'guest', :'other_sess'),
  'P0001', 'SPOT_NOT_OFFERED', 'guest cannot register for sessions without a post'
);

-- Approval creates the guest membership.
select tests.act_as(:'admin');
select is((public.approve_registration(:'greg')).status::text, 'confirmed', 'approved guest is confirmed');
select is(private.member_role(:'grp', :'guest')::text, 'guest', 'approval creates guest membership');
select is((select is_guest from public.registrations where id = :'greg'), true, 'registration is marked as guest');

-- Rejection.
select tests.register(:'guest2', :'sess', 'goalie') as greg2 \gset
select tests.act_as(:'admin');
select is((public.reject_registration(:'greg2')).cancel_reason::text, 'rejected', 'admin can reject a guest');

-- Without approval: confirmed at once, membership created.
select public.publish_open_spots(:'sess', true, true, false, null);
select tests.register(:'guest3', :'sess', 'goalie') as greg3 \gset
select is(tests.status_of(:'greg3'), 'confirmed', 'without approval the guest is confirmed at once');
select is(private.member_role(:'grp', :'guest3')::text, 'guest', 'membership is created immediately');

-- Goalie spots are full now; the post stays because skater spots are free.
select tests.act_as(:'guest2');
select is(
  (select free_goalie_spots from public.list_open_spots() where session_id = :'sess'), 0,
  'full goalie spots show 0'
);
-- Offer only goalies again: the post disappears once goalie spots are full.
select tests.act_as(:'admin');
select (public.publish_open_spots(:'sess', false, true, true, null)).id as post2 \gset
select tests.act_as(:'guest2');
select is((select count(*)::int from public.list_open_spots() where session_id = :'sess'), 0, 'full post disappears from the marketplace');
select is((select is_available from public.get_public_post(:'post2')), false, 'public post says it is no longer available');

-- A guest who joins through the invite code becomes a regular member.
select tests.join(:'grp', :'guest');
select is(private.member_role(:'grp', :'guest')::text, 'member', 'invite code upgrades a guest to member');

-- Posts vanish when the session starts.
select tests.act_as(:'admin');
select (public.publish_open_spots(:'other_sess', true, false, true, null)).id as post3 \gset
select tests.set_now('2030-01-17 19:00+00');
select is((select is_available from public.get_public_post(:'post3')), false, 'started session is not available');

select * from finish();
rollback;
