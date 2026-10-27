begin;

create extension if not exists pgcrypto with schema extensions;

create type public.membership_status as enum ('active', 'left');
create type public.invitation_status as enum ('active', 'accepted', 'revoked', 'expired');
create type public.notification_category as enum ('invites', 'partner', 'events', 'tasks', 'reminders');
create type public.outbox_status as enum ('queued', 'sending', 'sent', 'failed');

create or replace function public.set_updated_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.version := old.version + 1; end if;
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_path text,
  timezone text not null default 'UTC',
  theme text not null default 'system' check (theme in ('system','light','dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  invites boolean not null default true,
  partner boolean not null default true,
  events boolean not null default true,
  tasks boolean not null default true,
  reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active','closed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique(couple_id, user_id)
);
create unique index one_active_couple_per_user on public.couple_members(user_id) where status = 'active';
create index couple_members_couple_active on public.couple_members(couple_id) where status = 'active';

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  token_hash bytea not null unique,
  code_hash bytea not null,
  status public.invitation_status not null default 'active',
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_code_hash_active on public.invitations(code_hash) where status = 'active';

create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  fingerprint_hash bytea,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index invite_attempts_rate on public.invite_attempts(user_id, attempted_at desc);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_token text not null unique,
  platform text not null check (platform in ('ios','android')),
  device_name text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.wishlist_lists (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references public.couples(id),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_by uuid not null references auth.users(id),
  client_request_id uuid not null unique default gen_random_uuid(),
  version integer not null default 1,
  archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(), list_id uuid references public.wishlist_lists(id) on delete set null,
  couple_id uuid references public.couples(id), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 120), description text, image_path text, product_url text, price numeric(14,2) check (price is null or price >= 0), currency char(3),
  priority text not null default 'normal' check (priority in ('low','normal','high')), status text not null default 'wanted' check (status in ('wanted','fulfilled')),
  client_request_id uuid not null unique default gen_random_uuid(), version integer not null default 1, archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.date_ideas (
  id uuid primary key default gen_random_uuid(), couple_id uuid references public.couples(id), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 120), description text, image_path text, place text, budget numeric(14,2), currency char(3),
  category text not null default 'surprise' check (category in ('home','walk','dinner','cinema','concert','active','trip','surprise')),
  status text not null default 'idea' check (status in ('idea','want','visited')), favorite boolean not null default false,
  client_request_id uuid not null unique default gen_random_uuid(), version integer not null default 1, archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.media_items (
  id uuid primary key default gen_random_uuid(), couple_id uuid references public.couples(id), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 120), media_type text not null default 'movie' check (media_type in ('movie','series')), genre text, link text, note text,
  status text not null default 'want' check (status in ('want','watching','watched')),
  client_request_id uuid not null unique default gen_random_uuid(), version integer not null default 1, archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.task_lists (
  id uuid primary key default gen_random_uuid(), couple_id uuid references public.couples(id), owner_id uuid not null references auth.users(id) on delete cascade, title text not null,
  created_by uuid not null references auth.users(id), client_request_id uuid not null unique default gen_random_uuid(), version integer not null default 1, archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), list_id uuid references public.task_lists(id) on delete set null, couple_id uuid references public.couples(id), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
  title text not null, description text, due_at timestamptz, priority text not null default 'normal' check (priority in ('low','normal','high')), assignee text not null default 'both' check (assignee in ('me','partner','both')), completed boolean not null default false,
  client_request_id uuid not null unique default gen_random_uuid(), version integer not null default 1, archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(), couple_id uuid references public.couples(id), owner_id uuid not null references auth.users(id) on delete cascade, title text not null,
  created_by uuid not null references auth.users(id), client_request_id uuid not null unique default gen_random_uuid(), version integer not null default 1, archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(), list_id uuid references public.shopping_lists(id) on delete set null, couple_id uuid references public.couples(id), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
  title text not null, quantity numeric(10,2) not null default 1 check (quantity > 0), unit text, note text, purchased boolean not null default false,
  client_request_id uuid not null unique default gen_random_uuid(), version integer not null default 1, archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.places (
  id uuid primary key default gen_random_uuid(), couple_id uuid references public.couples(id), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
  title text not null, address text, map_url text, category text not null default 'other' check (category in ('restaurant','cafe','bar','other')), budget numeric(14,2), currency char(3), note text, status text not null default 'want' check (status in ('want','visited')),
  client_request_id uuid not null unique default gen_random_uuid(), version integer not null default 1, archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.place_ratings (
  id uuid primary key default gen_random_uuid(), place_id uuid not null references public.places(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5), note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(place_id,user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(), couple_id uuid references public.couples(id), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
  title text not null, description text, category text not null default 'other' check (category in ('date','concert','trip','holiday','other')),
  starts_at timestamptz, ends_at timestamptz, all_day boolean not null default false, local_start_date date, local_end_date date, timezone text not null, place text, link text,
  client_request_id uuid not null unique default gen_random_uuid(), version integer not null default 1, archived_from_couple_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check ((all_day and local_start_date is not null) or (not all_day and starts_at is not null)),
  check (ends_at is null or starts_at is null or ends_at >= starts_at), check (local_end_date is null or local_start_date is null or local_end_date >= local_start_date)
);
create table public.event_reminders (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  offset_minutes integer not null check (offset_minutes between 0 and 10080), due_at timestamptz not null, sent_at timestamptz, cancelled_at timestamptz, created_at timestamptz not null default now(), unique(event_id,user_id,offset_minutes)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(), storage_path text not null unique, owner_id uuid not null references auth.users(id) on delete cascade, mime_type text not null, size_bytes bigint not null check (size_bytes > 0), created_at timestamptz not null default now()
);
create table public.asset_access (
  asset_id uuid not null references public.assets(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key(asset_id,user_id)
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, category public.notification_category not null,
  title text not null default 'Мы вдвоём', body text not null default 'У вас обновление в «Мы вдвоём»', route text, entity_id uuid,
  scheduled_for timestamptz not null default now(), status public.outbox_status not null default 'queued', attempts integer not null default 0, last_error text, sent_at timestamptz, created_at timestamptz not null default now()
);
create index outbox_dispatch on public.notification_outbox(status, scheduled_for) where status in ('queued','failed');

create table public.pending_account_deletions (
  user_id uuid primary key references auth.users(id) on delete cascade, requested_at timestamptz not null default now(), delete_after timestamptz not null, cancelled_at timestamptz
);
create table public.audit_events (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null, action text not null, target_type text, target_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

-- Authentication bootstrap. Email content never enters application logs.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, timezone) values(new.id, coalesce(nullif(split_part(new.email,'@',1),''),'Новый пользователь'), coalesce(new.raw_user_meta_data->>'timezone','UTC'));
  insert into public.notification_preferences(user_id) values(new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_active_couple_member(p_couple_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.couple_members where couple_id = p_couple_id and user_id = auth.uid() and status = 'active');
$$;
create or replace function public.can_read_record(p_owner_id uuid, p_couple_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() = p_owner_id or (p_couple_id is not null and public.is_active_couple_member(p_couple_id));
$$;
create or replace function public.can_write_record(p_owner_id uuid, p_couple_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (p_couple_id is null and auth.uid() = p_owner_id) or (p_couple_id is not null and public.is_active_couple_member(p_couple_id));
$$;

-- Invitation RPCs are the only way to change membership.
create or replace function public.create_couple()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.couple_members where user_id=auth.uid() and status='active') then raise exception 'ALREADY_IN_COUPLE'; end if;
  insert into public.couples(created_by) values(auth.uid()) returning id into v_id;
  insert into public.couple_members(couple_id,user_id) values(v_id,auth.uid());
  insert into public.audit_events(actor_id,action,target_type,target_id) values(auth.uid(),'couple.created','couple',v_id);
  return jsonb_build_object('couple_id',v_id);
end;
$$;

create or replace function public.short_code_from_token(p_token text)
returns text language sql immutable set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + get_byte(extensions.digest(p_token,'sha256'), i) % 32, 1),'') from generate_series(0,5) i;
$$;

create or replace function public.create_invitation()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_couple uuid; v_id uuid; v_token text; v_code text; v_expires timestamptz := now() + interval '72 hours';
begin
  select couple_id into v_couple from public.couple_members where user_id=auth.uid() and status='active';
  if v_couple is null then raise exception 'NO_ACTIVE_COUPLE'; end if;
  if (select count(*) from public.couple_members where couple_id=v_couple and status='active') >= 2 then raise exception 'COUPLE_FULL'; end if;
  update public.invitations set status='revoked', revoked_at=now() where couple_id=v_couple and status='active';
  v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''); v_code := public.short_code_from_token(v_token);
  insert into public.invitations(couple_id,created_by,token_hash,code_hash,expires_at) values(v_couple,auth.uid(),extensions.digest(v_token,'sha256'),extensions.digest(v_code,'sha256'),v_expires) returning id into v_id;
  return jsonb_build_object('id',v_id,'token',v_token,'code',v_code,'expires_at',v_expires);
end;
$$;

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.invitations set status='revoked', revoked_at=now() where id=p_invitation_id and created_by=auth.uid() and status='active';
  if not found then raise exception 'INVITATION_NOT_ACTIVE'; end if;
end;
$$;

create or replace function public.preview_invitation(p_token text)
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce((select jsonb_build_object('valid', status='active' and expires_at>now(), 'code', public.short_code_from_token(p_token), 'expires_at',expires_at,
    'reason', case when status<>'active' then 'Приглашение уже использовано или отозвано' when expires_at<=now() then 'Срок приглашения истёк' end)
    from public.invitations where token_hash=extensions.digest(p_token,'sha256') limit 1), jsonb_build_object('valid',false,'reason','Приглашение не найдено'));
$$;

create or replace function public.accept_invitation(p_token_or_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations%rowtype; v_existing uuid; v_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select count(*) into v_count from public.invite_attempts where user_id=auth.uid() and attempted_at>now()-interval '10 minutes' and not succeeded;
  if v_count>=8 then raise exception 'TOO_MANY_ATTEMPTS'; end if;
  select * into v_inv from public.invitations where (case when char_length(trim(p_token_or_code))=6 then code_hash=extensions.digest(upper(trim(p_token_or_code)),'sha256') else token_hash=extensions.digest(trim(p_token_or_code),'sha256') end) for update;
  if not found then insert into public.invite_attempts(user_id) values(auth.uid()); raise exception 'INVITATION_NOT_FOUND'; end if;
  select couple_id into v_existing from public.couple_members where user_id=auth.uid() and status='active';
  if v_existing=v_inv.couple_id then return jsonb_build_object('couple_id',v_existing,'already_member',true); end if;
  if v_existing is not null then raise exception 'ALREADY_IN_OTHER_COUPLE'; end if;
  if v_inv.status='accepted' and v_inv.accepted_by=auth.uid() then return jsonb_build_object('couple_id',v_inv.couple_id,'already_member',true); end if;
  if v_inv.status<>'active' then raise exception 'INVITATION_ALREADY_USED'; end if;
  if v_inv.expires_at<=now() then update public.invitations set status='expired' where id=v_inv.id; raise exception 'INVITATION_EXPIRED'; end if;
  if (select count(*) from public.couple_members where couple_id=v_inv.couple_id and status='active')>=2 then raise exception 'COUPLE_FULL'; end if;
  insert into public.couple_members(couple_id,user_id) values(v_inv.couple_id,auth.uid());
  update public.invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=v_inv.id;
  insert into public.invite_attempts(user_id,succeeded) values(auth.uid(),true);
  update public.wishlist_lists set couple_id=v_inv.couple_id where owner_id=auth.uid() and couple_id is null and archived_from_couple_id is null;
  update public.wishlist_items set couple_id=v_inv.couple_id where owner_id=auth.uid() and couple_id is null and archived_from_couple_id is null;
  perform public.grant_joined_partner_asset_access(v_inv.couple_id,auth.uid());
  perform public.grant_joined_partner_asset_access(v_inv.couple_id,v_inv.created_by);
  insert into public.notification_outbox(user_id,category,route) values(v_inv.created_by,'partner','/(tabs)/us');
  return jsonb_build_object('couple_id',v_inv.couple_id,'already_member',false);
end;
$$;

create or replace function public.register_push_device(p_expo_token text,p_platform text,p_device_name text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_platform not in ('ios','android') then raise exception 'INVALID_PLATFORM'; end if;
  insert into public.devices(user_id,expo_token,platform,device_name) values(auth.uid(),p_expo_token,p_platform,p_device_name)
    on conflict(expo_token) do update set user_id=auth.uid(),enabled=true,platform=excluded.platform,device_name=excluded.device_name,last_seen_at=now();
  return jsonb_build_object('ok',true);
end;
$$;

-- Idempotent offline mutation endpoint with optimistic version checks.
create or replace function public.apply_versioned_mutation(p_entity_kind text,p_entity_id uuid,p_operation text,p_expected_version integer,p_payload jsonb,p_client_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_table text; v_server jsonb; v_version integer; v_payload jsonb;
begin
  v_table := case p_entity_kind when 'wishlist' then 'wishlist_items' when 'date_idea' then 'date_ideas' when 'media' then 'media_items' when 'task' then 'tasks' when 'shopping' then 'shopping_items' when 'place' then 'places' when 'event' then 'events' else null end;
  if v_table is null then raise exception 'UNKNOWN_ENTITY_KIND'; end if;
  execute format('select to_jsonb(t),t.version from public.%I t where id=$1 and deleted_at is null',v_table) into v_server,v_version using p_entity_id;
  if p_operation='insert' then
    if v_server is not null then
      if v_server->>'client_request_id'=p_client_request_id::text then return jsonb_build_object('ok',true,'record',v_server,'idempotent',true); end if;
      return jsonb_build_object('ok',false,'conflict',true,'server',v_server);
    end if;
    v_payload := p_payload || jsonb_build_object('id',p_entity_id,'client_request_id',p_client_request_id,'created_at',now(),'updated_at',now(),'version',1);
    if (v_payload->>'owner_id')::uuid<>auth.uid() or not public.can_write_record((v_payload->>'owner_id')::uuid,(v_payload->>'couple_id')::uuid) then raise exception 'ACCESS_DENIED'; end if;
    execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I,$1) returning to_jsonb(%I.*)',v_table,v_table,v_table) into v_server using v_payload;
    return jsonb_build_object('ok',true,'record',v_server);
  end if;
  if v_server is null or not public.can_write_record((v_server->>'owner_id')::uuid,(v_server->>'couple_id')::uuid) then raise exception 'NOT_FOUND_OR_ACCESS_DENIED'; end if;
  if p_expected_version is distinct from v_version then return jsonb_build_object('ok',false,'conflict',true,'server',v_server); end if;
  if p_operation='delete' then execute format('update public.%I set deleted_at=now(),updated_at=now(),version=version+1 where id=$1',v_table) using p_entity_id;
  elsif p_operation='update' then
    if p_entity_kind='wishlist' then update public.wishlist_items set status=coalesce(p_payload->>'status',status),priority=coalesce(p_payload->>'priority',priority),title=coalesce(p_payload->>'title',title),description=case when p_payload?'description' then p_payload->>'description' else description end where id=p_entity_id;
    elsif p_entity_kind='date_idea' then update public.date_ideas set favorite=coalesce((p_payload->>'favorite')::boolean,favorite),status=coalesce(p_payload->>'status',status),title=coalesce(p_payload->>'title',title),description=case when p_payload?'description' then p_payload->>'description' else description end where id=p_entity_id;
    elsif p_entity_kind='media' then update public.media_items set status=coalesce(p_payload->>'status',status),title=coalesce(p_payload->>'title',title),note=case when p_payload?'note' then p_payload->>'note' else note end where id=p_entity_id;
    elsif p_entity_kind='task' then update public.tasks set completed=coalesce((p_payload->>'completed')::boolean,completed),title=coalesce(p_payload->>'title',title),description=case when p_payload?'description' then p_payload->>'description' else description end where id=p_entity_id;
    elsif p_entity_kind='shopping' then update public.shopping_items set purchased=coalesce((p_payload->>'purchased')::boolean,purchased),title=coalesce(p_payload->>'title',title),note=case when p_payload?'note' then p_payload->>'note' else note end where id=p_entity_id;
    elsif p_entity_kind='place' then update public.places set status=coalesce(p_payload->>'status',status),title=coalesce(p_payload->>'title',title),note=case when p_payload?'note' then p_payload->>'note' else note end where id=p_entity_id;
    elsif p_entity_kind='event' then update public.events set title=coalesce(p_payload->>'title',title),description=case when p_payload?'description' then p_payload->>'description' else description end where id=p_entity_id;
    end if;
  else raise exception 'UNKNOWN_OPERATION'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1',v_table) into v_server using p_entity_id;
  return jsonb_build_object('ok',true,'record',v_server);
end;
$$;

create or replace function public.leave_couple()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_couple uuid; v_member uuid; v_table text; v_list record; v_new_list uuid;
begin
  select couple_id into v_couple from public.couple_members where user_id=auth.uid() and status='active' for update;
  if v_couple is null then raise exception 'NO_ACTIVE_COUPLE'; end if;
  -- Top-level shared records become independent private copies for both participants.
  foreach v_table in array array['date_ideas','media_items','places','events'] loop
    for v_member in select user_id from public.couple_members where couple_id=v_couple and status='active' loop
      execute format('insert into public.%I select (jsonb_populate_record(null::public.%I, to_jsonb(t) || jsonb_build_object(''id'',gen_random_uuid(),''couple_id'',null,''owner_id'',$1,''created_by'',$1,''client_request_id'',gen_random_uuid(),''archived_from_couple_id'',$2,''created_at'',now(),''updated_at'',now(),''version'',1,''deleted_at'',null))).* from public.%I t where couple_id=$2 and deleted_at is null',v_table,v_table,v_table) using v_member,v_couple;
    end loop;
    execute format('update public.%I set deleted_at=now(),updated_at=now(),version=version+1 where couple_id=$1 and deleted_at is null',v_table) using v_couple;
  end loop;
  -- Preserve the multiple-list hierarchy while splitting tasks and purchases.
  for v_member in select user_id from public.couple_members where couple_id=v_couple and status='active' loop
    for v_list in select id,title from public.task_lists where couple_id=v_couple and deleted_at is null loop
      insert into public.task_lists(id,couple_id,owner_id,title,created_by,client_request_id,archived_from_couple_id)
        values(gen_random_uuid(),null,v_member,v_list.title,v_member,gen_random_uuid(),v_couple) returning id into v_new_list;
      insert into public.tasks(id,list_id,couple_id,owner_id,created_by,title,description,due_at,priority,assignee,completed,client_request_id,archived_from_couple_id)
        select gen_random_uuid(),v_new_list,null,v_member,v_member,title,description,due_at,priority,'me',completed,gen_random_uuid(),v_couple from public.tasks where list_id=v_list.id and deleted_at is null;
    end loop;
    insert into public.tasks(id,list_id,couple_id,owner_id,created_by,title,description,due_at,priority,assignee,completed,client_request_id,archived_from_couple_id)
      select gen_random_uuid(),null,null,v_member,v_member,title,description,due_at,priority,'me',completed,gen_random_uuid(),v_couple from public.tasks where couple_id=v_couple and list_id is null and deleted_at is null;
    for v_list in select id,title from public.shopping_lists where couple_id=v_couple and deleted_at is null loop
      insert into public.shopping_lists(id,couple_id,owner_id,title,created_by,client_request_id,archived_from_couple_id)
        values(gen_random_uuid(),null,v_member,v_list.title,v_member,gen_random_uuid(),v_couple) returning id into v_new_list;
      insert into public.shopping_items(id,list_id,couple_id,owner_id,created_by,title,quantity,unit,note,purchased,client_request_id,archived_from_couple_id)
        select gen_random_uuid(),v_new_list,null,v_member,v_member,title,quantity,unit,note,purchased,gen_random_uuid(),v_couple from public.shopping_items where list_id=v_list.id and deleted_at is null;
    end loop;
    insert into public.shopping_items(id,list_id,couple_id,owner_id,created_by,title,quantity,unit,note,purchased,client_request_id,archived_from_couple_id)
      select gen_random_uuid(),null,null,v_member,v_member,title,quantity,unit,note,purchased,gen_random_uuid(),v_couple from public.shopping_items where couple_id=v_couple and list_id is null and deleted_at is null;
  end loop;
  update public.tasks set deleted_at=now(),updated_at=now(),version=version+1 where couple_id=v_couple and deleted_at is null;
  update public.task_lists set deleted_at=now(),updated_at=now(),version=version+1 where couple_id=v_couple and deleted_at is null;
  update public.shopping_items set deleted_at=now(),updated_at=now(),version=version+1 where couple_id=v_couple and deleted_at is null;
  update public.shopping_lists set deleted_at=now(),updated_at=now(),version=version+1 where couple_id=v_couple and deleted_at is null;
  update public.wishlist_items set couple_id=null where couple_id=v_couple;
  update public.wishlist_lists set couple_id=null where couple_id=v_couple;
  update public.couple_members set status='left',left_at=now() where couple_id=v_couple and status='active';
  update public.couples set status='closed',closed_at=now() where id=v_couple;
  update public.invitations set status='revoked',revoked_at=now() where couple_id=v_couple and status='active';
  update public.devices set enabled=false where user_id in (select user_id from public.couple_members where couple_id=v_couple);
  return jsonb_build_object('ok',true,'closed_couple_id',v_couple);
end;
$$;

create or replace function public.request_account_deletion()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_after timestamptz := now()+interval '7 days';
begin
  insert into public.pending_account_deletions(user_id,delete_after) values(auth.uid(),v_after) on conflict(user_id) do update set requested_at=now(),delete_after=v_after,cancelled_at=null;
  update public.devices set enabled=false where user_id=auth.uid();
  return jsonb_build_object('delete_after',v_after);
end;
$$;
create or replace function public.cancel_account_deletion()
returns void language sql security definer set search_path = '' as $$ update public.pending_account_deletions set cancelled_at=now() where user_id=auth.uid() and cancelled_at is null; $$;

-- Version triggers.
do $$ declare t text; begin
  foreach t in array array['wishlist_lists','wishlist_items','date_ideas','media_items','task_lists','tasks','shopping_lists','shopping_items','places','events'] loop
    execute format('create trigger set_%I_version before update on public.%I for each row execute function public.set_updated_version()',t,t);
  end loop;
end $$;

-- RLS: private by default, access granted only through ownership or active membership.
alter table public.profiles enable row level security; alter table public.notification_preferences enable row level security; alter table public.couples enable row level security; alter table public.couple_members enable row level security;
alter table public.invitations enable row level security; alter table public.invite_attempts enable row level security; alter table public.devices enable row level security;
alter table public.wishlist_lists enable row level security; alter table public.wishlist_items enable row level security; alter table public.date_ideas enable row level security; alter table public.media_items enable row level security;
alter table public.task_lists enable row level security; alter table public.tasks enable row level security; alter table public.shopping_lists enable row level security; alter table public.shopping_items enable row level security;
alter table public.places enable row level security; alter table public.place_ratings enable row level security; alter table public.events enable row level security; alter table public.event_reminders enable row level security;
alter table public.assets enable row level security; alter table public.asset_access enable row level security; alter table public.notification_outbox enable row level security; alter table public.pending_account_deletions enable row level security; alter table public.audit_events enable row level security;

create policy profiles_self_or_partner_read on public.profiles for select using(id=auth.uid() or exists(select 1 from public.couple_members mine join public.couple_members theirs on theirs.couple_id=mine.couple_id where mine.user_id=auth.uid() and mine.status='active' and theirs.user_id=profiles.id and theirs.status='active'));
create policy profiles_self_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy preferences_self on public.notification_preferences for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy couples_members_read on public.couples for select using(public.is_active_couple_member(id));
create policy members_pair_read on public.couple_members for select using(public.is_active_couple_member(couple_id));
create policy invitations_creator_read on public.invitations for select using(created_by=auth.uid());
create policy devices_self on public.devices for select using(user_id=auth.uid());
create policy reminders_self on public.event_reminders for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy ratings_pair_read on public.place_ratings for select using(exists(select 1 from public.places p where p.id=place_id and public.can_read_record(p.owner_id,p.couple_id)));
create policy ratings_self_write on public.place_ratings for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy assets_access_read on public.assets for select using(owner_id=auth.uid() or exists(select 1 from public.asset_access aa where aa.asset_id=id and aa.user_id=auth.uid()));
create policy asset_access_self_read on public.asset_access for select using(user_id=auth.uid());
create policy deletion_self on public.pending_account_deletions for select using(user_id=auth.uid());

do $$ declare t text; begin
  foreach t in array array['wishlist_lists','wishlist_items','date_ideas','media_items','task_lists','tasks','shopping_lists','shopping_items','places','events'] loop
    execute format('create policy %I_read on public.%I for select using(public.can_read_record(owner_id,couple_id))',t,t);
    execute format('create policy %I_insert on public.%I for insert with check(owner_id=auth.uid() and created_by=auth.uid() and public.can_write_record(owner_id,couple_id))',t,t);
    execute format('create policy %I_update on public.%I for update using(public.can_write_record(owner_id,couple_id)) with check(public.can_write_record(owner_id,couple_id))',t,t);
    execute format('create policy %I_delete on public.%I for delete using(public.can_write_record(owner_id,couple_id))',t,t);
  end loop;
end $$;

-- Private storage: object paths begin with the owner's UUID. Shared access is explicit in asset_access.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pair-assets','pair-assets',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy pair_assets_upload on storage.objects for insert to authenticated with check(bucket_id='pair-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy pair_assets_read on storage.objects for select to authenticated using(bucket_id='pair-assets' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.assets a join public.asset_access aa on aa.asset_id=a.id where a.storage_path=name and aa.user_id=auth.uid())));
create policy pair_assets_owner_delete on storage.objects for delete to authenticated using(bucket_id='pair-assets' and (storage.foldername(name))[1]=auth.uid()::text);

grant execute on function public.create_couple() to authenticated;
grant execute on function public.create_invitation() to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.preview_invitation(text) to anon,authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.register_push_device(text,text,text) to authenticated;
grant execute on function public.apply_versioned_mutation(text,uuid,text,integer,jsonb,uuid) to authenticated;
grant execute on function public.leave_couple() to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

commit;
