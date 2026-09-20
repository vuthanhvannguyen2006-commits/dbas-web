begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();
insert into auth.users(id,email) values
 ('81000000-0000-0000-0000-000000000001','layout-admin@example.invalid'),
 ('81000000-0000-0000-0000-000000000002','layout-editor@example.invalid'),
 ('81000000-0000-0000-0000-000000000003','layout-unassigned@example.invalid');
insert into public.profiles(id,role) values
 ('81000000-0000-0000-0000-000000000001','admin'),
 ('81000000-0000-0000-0000-000000000002','editor')
on conflict(id) do update set role=excluded.role;
delete from public.profiles where id='81000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000002',true);
insert into public.memory_albums(id,title) values ('82000000-0000-0000-0000-000000000001','Layout fixture');
select results_eq($$select layout_format,layout_template from public.memory_albums where id='82000000-0000-0000-0000-000000000001'$$,$$values ('grid'::text,'regular'::text)$$,'old clients get regular grid by default');
select lives_ok(format('update public.memory_albums set layout_format=%L,layout_template=%L where id=%L',f,t,'82000000-0000-0000-0000-000000000001'),'editor can save '||f||'/'||t)
from (values ('grid','regular'),('gallery-wall','salon'),('gallery-wall','symmetry'),('mosaic','tiles'),('mosaic','bands'),('story','chapters'),('story','filmstrip')) pairs(f,t);
select throws_ok($$update public.memory_albums set layout_format='story',layout_template='salon' where id='82000000-0000-0000-0000-000000000001'$$,'23514',null,'cross-format template rejected');
select throws_ok($$update public.memory_albums set layout_template='arbitrary' where id='82000000-0000-0000-0000-000000000001'$$,'23514',null,'unknown template rejected');
select throws_ok($$update public.memory_albums set layout_format=null where id='82000000-0000-0000-0000-000000000001'$$,'23502',null,'null format rejected');
with changed as (update public.memory_albums set layout_format='grid',layout_template='regular' where id='82000000-0000-0000-0000-000000000001' and updated_at='2000-01-01'::timestamptz returning id)
select is(count(*)::int,0,'stale layout save changes no rows') from changed;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::int from public.memory_albums where id='82000000-0000-0000-0000-000000000001'),0,'draft layout hidden from visitors');
select throws_ok($$update public.memory_albums set layout_format='grid',layout_template='regular' where id='82000000-0000-0000-0000-000000000001'$$,'42501',null,'visitor cannot change layout');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000003',true);
with changed as (update public.memory_albums set layout_format='grid',layout_template='regular' where id='82000000-0000-0000-0000-000000000001' returning id)
select is(count(*)::int,0,'unassigned account cannot change layout') from changed;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000001',true);
select lives_ok($$update public.memory_albums set layout_format='gallery-wall',layout_template='symmetry' where id='82000000-0000-0000-0000-000000000001'$$,'admin can save layout');
insert into public.memory_photos(album_id,image_url,thumbnail_url,alt_text) values ('82000000-0000-0000-0000-000000000001','fixture.jpg','fixture.webp','Fixture');
update public.memory_albums set is_published=true where id='82000000-0000-0000-0000-000000000001';
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select results_eq($$select layout_format,layout_template from public.memory_albums where id='82000000-0000-0000-0000-000000000001'$$,$$values ('gallery-wall'::text,'symmetry'::text)$$,'visitor reads saved published layout');
reset role;
select * from finish();
rollback;
