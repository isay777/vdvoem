begin;

-- Records copied to the former partner survive account deletion without retaining identity.
alter table public.couples alter column created_by drop not null;
alter table public.couples drop constraint couples_created_by_fkey;
alter table public.couples add constraint couples_created_by_fkey foreign key(created_by) references auth.users(id) on delete set null;

do $$ declare t text; c text; begin
  foreach t in array array['wishlist_lists','wishlist_items','date_ideas','media_items','task_lists','tasks','shopping_lists','shopping_items','places','events'] loop
    execute format('alter table public.%I alter column created_by drop not null',t);
    c := t || '_created_by_fkey';
    execute format('alter table public.%I drop constraint %I',t,c);
    execute format('alter table public.%I add constraint %I foreign key(created_by) references auth.users(id) on delete set null',t,c);
  end loop;
end $$;

create or replace function public.queue_partner_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_member uuid; v_category public.notification_category; v_route text;
begin
  if new.couple_id is null or new.deleted_at is not null then return new; end if;
  v_category := case when tg_table_name='tasks' then 'tasks'::public.notification_category else 'events'::public.notification_category end;
  v_route := case when tg_table_name='tasks' then '/list/task' else '/(tabs)/calendar' end;
  for v_member in select user_id from public.couple_members where couple_id=new.couple_id and status='active' and user_id<>auth.uid() loop
    if coalesce((select case v_category when 'tasks' then tasks when 'events' then events else true end from public.notification_preferences where user_id=v_member),true) then
      insert into public.notification_outbox(user_id,category,route,entity_id) values(v_member,v_category,v_route,new.id);
    end if;
  end loop;
  return new;
end;
$$;
create trigger tasks_partner_notification after insert or update on public.tasks for each row execute function public.queue_partner_update();
create trigger events_partner_notification after insert or update on public.events for each row execute function public.queue_partner_update();

create or replace function public.refresh_event_reminders()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_member uuid; v_offset integer;
begin
  update public.event_reminders set cancelled_at=now() where event_id=new.id and sent_at is null and cancelled_at is null;
  if new.deleted_at is not null or new.all_day or new.starts_at is null or new.couple_id is null then return new; end if;
  foreach v_offset in array array[1440,60,15] loop
    for v_member in select user_id from public.couple_members where couple_id=new.couple_id and status='active' loop
      if coalesce((select reminders from public.notification_preferences where user_id=v_member),true) then
        insert into public.event_reminders(event_id,user_id,offset_minutes,due_at) values(new.id,v_member,v_offset,new.starts_at-make_interval(mins=>v_offset))
          on conflict(event_id,user_id,offset_minutes) do update set due_at=excluded.due_at,sent_at=null,cancelled_at=null;
      end if;
    end loop;
  end loop;
  return new;
end;
$$;
create trigger event_reminders_refresh after insert or update of starts_at,all_day,deleted_at on public.events for each row execute function public.refresh_event_reminders();

create or replace function public.enqueue_due_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  with due as (
    update public.event_reminders r set sent_at=now()
    where r.sent_at is null and r.cancelled_at is null and r.due_at<=now()
    returning r.*
  ), queued as (
    insert into public.notification_outbox(user_id,category,route,entity_id)
    select d.user_id,'reminders','/(tabs)/calendar',d.event_id from due d returning 1
  ) select count(*) into v_count from queued;
  return v_count;
end;
$$;

create or replace function public.disable_my_devices()
returns void language sql security definer set search_path = '' as $$ update public.devices set enabled=false where user_id=auth.uid(); $$;
grant execute on function public.disable_my_devices() to authenticated;

commit;
