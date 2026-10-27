begin;
alter table public.events add column reminder_offsets integer[] not null default array[1440,60,15];
alter table public.events add constraint event_reminder_offsets_valid check (reminder_offsets <@ array[10080,2880,1440,720,180,60,30,15,5,0]);

create or replace function public.refresh_event_reminders()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_member uuid; v_offset integer;
begin
  update public.event_reminders set cancelled_at=now() where event_id=new.id and sent_at is null and cancelled_at is null;
  if new.deleted_at is not null or new.all_day or new.starts_at is null or new.couple_id is null then return new; end if;
  foreach v_offset in array new.reminder_offsets loop
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
drop trigger event_reminders_refresh on public.events;
create trigger event_reminders_refresh after insert or update of starts_at,all_day,deleted_at,reminder_offsets on public.events for each row execute function public.refresh_event_reminders();
commit;
