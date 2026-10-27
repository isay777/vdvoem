begin;

revoke all on function public.accept_invitation(text) from public, authenticated, anon;

create or replace function public.accept_invitation_internal(p_token_or_code text,p_user_id uuid,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations%rowtype; v_existing uuid; v_count integer; v_fingerprint bytea := extensions.digest(p_fingerprint,'sha256');
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select count(*) into v_count from public.invite_attempts
    where attempted_at>now()-interval '10 minutes' and not succeeded and (user_id=p_user_id or fingerprint_hash=v_fingerprint);
  if v_count>=8 then raise exception 'TOO_MANY_ATTEMPTS'; end if;
  select * into v_inv from public.invitations where (
    case when char_length(trim(p_token_or_code))=6
      then code_hash=extensions.digest(upper(trim(p_token_or_code)),'sha256')
      else token_hash=extensions.digest(trim(p_token_or_code),'sha256') end
  ) for update;
  if not found then insert into public.invite_attempts(user_id,fingerprint_hash) values(p_user_id,v_fingerprint); raise exception 'INVITATION_NOT_FOUND'; end if;
  select couple_id into v_existing from public.couple_members where user_id=p_user_id and status='active';
  if v_existing=v_inv.couple_id then return jsonb_build_object('couple_id',v_existing,'already_member',true); end if;
  if v_existing is not null then raise exception 'ALREADY_IN_OTHER_COUPLE'; end if;
  if v_inv.status='accepted' and v_inv.accepted_by=p_user_id then return jsonb_build_object('couple_id',v_inv.couple_id,'already_member',true); end if;
  if v_inv.status<>'active' then insert into public.invite_attempts(user_id,fingerprint_hash) values(p_user_id,v_fingerprint); raise exception 'INVITATION_ALREADY_USED'; end if;
  if v_inv.expires_at<=now() then update public.invitations set status='expired' where id=v_inv.id; insert into public.invite_attempts(user_id,fingerprint_hash) values(p_user_id,v_fingerprint); raise exception 'INVITATION_EXPIRED'; end if;
  if (select count(*) from public.couple_members where couple_id=v_inv.couple_id and status='active')>=2 then raise exception 'COUPLE_FULL'; end if;
  insert into public.couple_members(couple_id,user_id) values(v_inv.couple_id,p_user_id);
  update public.invitations set status='accepted',accepted_by=p_user_id,accepted_at=now() where id=v_inv.id;
  insert into public.invite_attempts(user_id,fingerprint_hash,succeeded) values(p_user_id,v_fingerprint,true);
  update public.wishlist_lists set couple_id=v_inv.couple_id where owner_id=p_user_id and couple_id is null and archived_from_couple_id is null;
  update public.wishlist_items set couple_id=v_inv.couple_id where owner_id=p_user_id and couple_id is null and archived_from_couple_id is null;
  perform public.grant_joined_partner_asset_access(v_inv.couple_id,p_user_id);
  perform public.grant_joined_partner_asset_access(v_inv.couple_id,v_inv.created_by);
  insert into public.notification_outbox(user_id,category,route) values(v_inv.created_by,'partner','/(tabs)/us');
  return jsonb_build_object('couple_id',v_inv.couple_id,'already_member',false);
end;
$$;

revoke all on function public.accept_invitation_internal(text,uuid,text) from public, anon, authenticated;
grant execute on function public.accept_invitation_internal(text,uuid,text) to service_role;

commit;
