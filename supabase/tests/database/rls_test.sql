begin;
select plan(9);

insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-000000000001','one@example.test'),
  ('00000000-0000-0000-0000-000000000002','two@example.test'),
  ('00000000-0000-0000-0000-000000000003','three@example.test');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select lives_ok($$ select public.create_couple() $$,'first user creates a couple');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select lives_ok($$ select public.create_invitation() $$,'creator makes an invitation');
select is((select count(*)::int from public.invitations where created_by=auth.uid()),1,'creator sees invitation');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select is((select count(*)::int from public.invitations),0,'third user cannot read invitation');

reset role;
insert into public.date_ideas(id,couple_id,owner_id,created_by,title,client_request_id)
select '10000000-0000-0000-0000-000000000001',c.id,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Тайная идея','20000000-0000-0000-0000-000000000001' from public.couples c limit 1;
set local role authenticated;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select is((select count(*)::int from public.date_ideas where id='10000000-0000-0000-0000-000000000001'),1,'member reads pair record');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select is((select count(*)::int from public.date_ideas where id='10000000-0000-0000-0000-000000000001'),0,'third user cannot read known UUID');

reset role;
set local role service_role;
select throws_ok($$ select public.accept_invitation_internal('WRONG2','00000000-0000-0000-0000-000000000003','test-fingerprint') $$,'INVITATION_NOT_FOUND','unknown invite rejected');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select throws_ok($$ select public.create_invitation() $$,'NO_ACTIVE_COUPLE','non-member cannot invite');
select is((select count(*)::int from public.devices where user_id<>'00000000-0000-0000-0000-000000000003'),0,'devices are private');

select * from finish();
rollback;
