-- Grants. Single source of truth for what clients may do: read tables through RLS and call
-- the listed functions. Everything is revoked first, so objects added by earlier migrations
-- are never reachable by accident.

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- authenticated: read through RLS
-- ---------------------------------------------------------------------------

grant select on
  public.profiles,
  public.profile_private,
  public.groups,
  public.group_members,
  public.sessions,
  public.registrations,
  public.ledger_entries,
  public.payments,
  public.open_spot_posts,
  public.member_balances,
  public.ledger_entries_classified,
  public.member_finance,
  public.session_summaries,
  public.group_finance_summary
to authenticated;

-- RLS policies and security_invoker views call these predicates as the querying role.
grant usage on schema private to authenticated;
grant execute on function
  private.is_group_member(uuid),
  private.is_group_full_member(uuid),
  private.is_group_admin(uuid),
  private.has_registration_on_session(uuid),
  private.has_registration_in_group(uuid),
  private.can_view_profile(uuid),
  private.is_admin_of_user(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- authenticated: write through functions
-- ---------------------------------------------------------------------------

grant execute on function
  public.update_my_profile(text, text, integer, public.player_role, text, text),
  public.create_group(text, text, public.country_code, text, text, text, integer, integer, integer, bigint, bigint, public.pricing_mode, bigint, integer, integer, text),
  public.update_group_settings(uuid, text, text, public.country_code, text, text, text, integer, integer, integer, bigint, bigint, public.pricing_mode, bigint, integer, integer, text),
  public.get_invite_preview(text),
  public.join_group(text),
  public.regenerate_invite_code(uuid),
  public.set_member_role(uuid, uuid, public.member_role),
  public.remove_member(uuid, uuid),
  public.get_group_admin_contacts(uuid),
  public.admin_list_groups(),
  public.create_sessions(uuid, timestamptz, integer, text, integer, integer, bigint, bigint, public.pricing_mode, bigint, integer, integer, text, integer),
  public.update_session(uuid, timestamptz, integer, text, integer, integer, bigint, bigint, public.pricing_mode, bigint, integer, integer, text),
  public.cancel_session(uuid),
  public.register_for_session(uuid, public.player_role, uuid),
  public.cancel_registration(uuid),
  public.remove_registration(uuid),
  public.approve_registration(uuid),
  public.reject_registration(uuid),
  public.mark_promotion_seen(uuid),
  public.finalize_session(uuid, jsonb),
  public.reopen_session(uuid),
  public.create_payment_request(uuid, bigint),
  public.report_payment(uuid),
  public.cancel_payment(uuid),
  public.confirm_payment(uuid),
  public.reject_payment(uuid),
  public.record_cash_payment(uuid, uuid, bigint, text),
  public.create_goalie_payout(uuid, uuid, bigint, public.payment_method),
  public.confirm_goalie_payout(uuid),
  public.add_adjustment(uuid, uuid, bigint, text),
  public.publish_open_spots(uuid, boolean, boolean, boolean, text),
  public.unpublish_open_spots(uuid),
  public.list_open_spots(text, date, date, public.player_role),
  public.list_open_spot_cities(),
  public.get_public_post(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- anon: only the public marketplace post
-- ---------------------------------------------------------------------------

grant execute on function public.get_public_post(uuid) to anon;

-- ---------------------------------------------------------------------------
-- service_role (server scripts, integration tests): read everything. The ledger trigger
-- still blocks updates and deletes.
-- ---------------------------------------------------------------------------

grant usage on schema private to service_role;
grant select on all tables in schema public to service_role;
