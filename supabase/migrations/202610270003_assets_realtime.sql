begin;

alter table public.assets add column couple_id uuid references public.couples(id) on delete set null;
alter table public.assets alter column owner_id drop not null;
alter table public.assets drop constraint assets_owner_id_fkey;
alter table public.assets add constraint assets_owner_id_fkey foreign key(owner_id) references auth.users(id) on delete set null;

create or replace function public.register_asset(p_storage_path text,p_mime_type text,p_size_bytes bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_asset uuid; v_couple uuid; v_member uuid;
begin
  if split_part(p_storage_path,'/',1)<>auth.uid()::text then raise exception 'INVALID_ASSET_PATH'; end if;
  if p_size_bytes<=0 or p_size_bytes>10485760 then raise exception 'INVALID_ASSET_SIZE'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp') then raise exception 'INVALID_ASSET_TYPE'; end if;
  select couple_id into v_couple from public.couple_members where user_id=auth.uid() and status='active';
  insert into public.assets(storage_path,owner_id,couple_id,mime_type,size_bytes) values(p_storage_path,auth.uid(),v_couple,p_mime_type,p_size_bytes) returning id into v_asset;
  insert into public.asset_access(asset_id,user_id) values(v_asset,auth.uid()) on conflict do nothing;
  if v_couple is not null then
    for v_member in select user_id from public.couple_members where couple_id=v_couple and status='active' loop
      insert into public.asset_access(asset_id,user_id) values(v_asset,v_member) on conflict do nothing;
    end loop;
  end if;
  return jsonb_build_object('id',v_asset,'storage_path',p_storage_path);
end;
$$;
grant execute on function public.register_asset(text,text,bigint) to authenticated;

-- When a partner joins, expose only assets attached to records entering this pair.
create or replace function public.grant_joined_partner_asset_access(p_couple_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.assets a set couple_id=p_couple_id
    where a.owner_id=p_user_id and a.couple_id is null and (
      exists(select 1 from public.wishlist_items w where w.owner_id=p_user_id and w.image_path=a.storage_path and w.couple_id=p_couple_id and w.archived_from_couple_id is null)
      or exists(select 1 from public.date_ideas d where d.owner_id=p_user_id and d.image_path=a.storage_path and d.couple_id=p_couple_id and d.archived_from_couple_id is null)
    );
  insert into public.asset_access(asset_id,user_id)
    select a.id,m.user_id from public.assets a join public.couple_members m on m.couple_id=p_couple_id and m.status='active'
    where a.couple_id=p_couple_id on conflict do nothing;
end;
$$;

-- Add realtime only after tables and RLS are ready.
do $$ declare t text; begin
  foreach t in array array['wishlist_items','date_ideas','media_items','tasks','shopping_items','places','events','couple_members'] loop
    begin execute format('alter publication supabase_realtime add table public.%I',t); exception when duplicate_object then null; end;
  end loop;
end $$;

commit;
