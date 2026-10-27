begin;

revoke all on function public.create_couple() from public;
revoke all on function public.create_invitation() from public;
revoke all on function public.revoke_invitation(uuid) from public;
revoke all on function public.register_push_device(text,text,text) from public;
revoke all on function public.apply_versioned_mutation(text,uuid,text,integer,jsonb,uuid) from public;
revoke all on function public.leave_couple() from public;
revoke all on function public.request_account_deletion() from public;
revoke all on function public.cancel_account_deletion() from public;
revoke all on function public.disable_my_devices() from public;
revoke all on function public.register_asset(text,text,bigint) from public;
revoke all on function public.grant_joined_partner_asset_access(uuid,uuid) from public;
revoke all on function public.enqueue_due_reminders() from public;

grant execute on function public.create_couple() to authenticated;
grant execute on function public.create_invitation() to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.register_push_device(text,text,text) to authenticated;
grant execute on function public.apply_versioned_mutation(text,uuid,text,integer,jsonb,uuid) to authenticated;
grant execute on function public.leave_couple() to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.disable_my_devices() to authenticated;
grant execute on function public.register_asset(text,text,bigint) to authenticated;
grant execute on function public.enqueue_due_reminders() to service_role;

-- Preview intentionally discloses only validity, derived short code and expiry to a holder of a 256-bit token.
revoke all on function public.preview_invitation(text) from public;
grant execute on function public.preview_invitation(text) to anon, authenticated, service_role;

commit;
