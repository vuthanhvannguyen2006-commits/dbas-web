-- ============================================================================
-- Import the existing website content into the database
-- ============================================================================
-- Generated from public/data/events.json and public/data/team.json, which are
-- still the live source of truth for the public pages. This copies them into
-- the tables so the admin dashboard has something to manage.
--
-- Safe to run more than once: both statements match on slug and update rather
-- than insert a second copy.
--
-- Dates: the JSON stored "21 July 2026" and "6:00 PM" as separate strings with
-- no timezone. These were read as Melbourne local time and converted to
-- absolute instants, with the offset taken per-date — so Meet & Mingle on
-- 25 March is +11 (daylight saving) while the winter events are +10.
--
-- The "Connect & Catch Up" event appeared twice in events.json, once under
-- "current" and once under "upcoming". It is imported once, marked featured.
-- ============================================================================

insert into public.events
  (slug, title, tag, description, starts_at, location, image_url, cta, link, is_featured, is_published)
values
  ('connect-catch-up-2026-07-21', 'Connect & Catch Up', 'Social', 'Connect face-to-face with business and analytics enthusiasts. Get ready to make new friends, play fun games, and enjoy FREE food and drinks!',
   '2026-07-21T08:00:00.000Z'::timestamptz, 'Building LC, Deakin Burwood', '/social.jpeg', 'Register Now', 'https://campus.hellorubric.com/?eid=67413&utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPOTM2NjE5NzQzMzkyNDU5AAGnTEsDQBxjmZXjFDbP7ZyvgAdSRl049RJhOykrpwzNNmW6C39rdk_7Pkf_e0c_aem_Ty5Jr-0vaa8z0h4wGnoUGQ',
   true, true),
  ('t1-2026-end-of-trimester-party-2026-06-12', 'T1 2026 End-of-Trimester Party', 'Social', null,
   '2026-06-12T09:00:00.000Z'::timestamptz, 'Burwood Campus', 'events/party.png', null, 'https://www.instagram.com/p/DYT6AMGxX4j/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
   false, true),
  ('finance-and-investment-essentials-seminar-2026-05-05', 'Finance and Investment Essentials Seminar', 'Workshop', null,
   '2026-05-05T08:00:00.000Z'::timestamptz, 'Room LC5.107, Deakin Burwood', 'events/finance-seminar.png', null, 'https://www.instagram.com/p/DXRQjR2jFzb/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
   false, true),
  ('meet-mingle-2026-03-25', 'Meet & Mingle', 'Social', null,
   '2026-03-25T07:00:00.000Z'::timestamptz, 'Deakin Burwood', 'events/meet-and-mingle.png', null, 'https://www.instagram.com/p/DVvPNfNkuTL/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==',
   false, true)
on conflict (slug) do update set
  title        = excluded.title,
  tag          = excluded.tag,
  description  = excluded.description,
  starts_at    = excluded.starts_at,
  location     = excluded.location,
  image_url    = excluded.image_url,
  cta          = excluded.cta,
  link         = excluded.link,
  is_featured  = excluded.is_featured,
  is_published = excluded.is_published;


-- sort_order preserves the order the members appear in team.json today —
-- President first, then Vice President, and so on. Spaced by 10 so a member
-- can be slotted between two others without renumbering everyone.
insert into public.team_members
  (slug, name, role, image_url, bio, tags, sort_order, is_published)
values
  ('livroop-gill', 'Livroop Gill', 'President', '/member-images/livroop-gill.png',
   'Liv leads DBAS with a vision to help build a safe, supportive space where students can bridge the gap between university and professional life while having fun. ', array['Project Management', 'Marketing', 'Community Building']::text[], 0, true),
  ('saamarth-nagpal', 'Saamarth Nagpal', 'Vice President', '/member-images/saamarth-nagpal.png',
   'As Vice President of DBAS, Saamarth aims to create a welcoming space where students can network, ask questions freely, and ease into the technical side of analytics. ', array['Marketing', 'Design', 'Content Creation']::text[], 10, true),
  ('quynh-hoang', 'Quynh Hoang', 'Secretary', '/member-images/ngoc-truc-quynh-hoang.png',
   'As the Secretary, Quynh aims to create a small discussion group where members can explore how Business Analytics is applied across different cultures, highlighting how local markets and cultural differences shape data‑driven decisions within DBAS.', array['Analytics', 'Beauty & Cosmetic Industry']::text[], 20, true),
  ('senuri-shenara-fernando', 'Senuri Shenara Fernando', 'Treasurer', '/member-images/senuri-shenara-fernando.png',
   'Through her role with DBAS, Sheni aims to strengthen her analytical skills, gain practical experience, and understand how data-driven insights are applied in real-world decision-making.', array['Data & Business Analytics', 'Data-Driven Decisions']::text[], 30, true),
  ('norint-ek', 'Norint Ek', 'Director of Marketing', '/member-images/norint-ek.png',
   'In the role of Director of Marketing for DBAS, Norint focuses on strengthening the society’s brand and engagement through data‑informed strategy.', array['Marketing', 'Data Interpretation', 'Videography']::text[], 40, true),
  ('rishita-sharma', 'Rishita Sharma', 'Director of Business & Consulting', '/member-images/rishita-sharma.png',
   'In DBAS, Rishita aims to expand the Business & Consulting division by building industry‑focused initiatives, strengthening partnerships, and creating hands‑on consulting and analytics opportunities for members.', array['Supply Chain Management', 'Business Procurement', 'Data-Driven Decisions']::text[], 50, true),
  ('rudransh-sharma', 'Rudransh Sharma', 'Director of Events & Planning', '/member-images/rudransh-sharma.png',
   'As the Director of Planning and Events at DBAS, Rudransh focuses on delivering well‑structured, efficient, and sustainable events.', array['Supply Chain Management', 'Business Procurement', 'Data-Driven Decisions']::text[], 60, true),
  ('van-nguyen', 'Van Nguyen', 'AI Officer', '/member-images/van-nguyen.jpeg',
   'As a part of the AI Committee, Van seeks to harness AI and digital innovation to redefine how DBAS operates, turning manual processes into more efficient workflows for different committees.', array['AI', 'Web Development', 'Decision Support Systems']::text[], 70, true),
  ('nahal', 'Nahal', 'AI Committee Member', null,
   'Nahal is passionate about building a connected and supportive student community. Through developing the DBAS website and contributing to initiatives, she aims to make it easier for students to engage, connect, and stay informed.', array['Community Building', 'AI', 'Data Science']::text[], 80, true)
on conflict (slug) do update set
  name         = excluded.name,
  role         = excluded.role,
  image_url    = excluded.image_url,
  bio          = excluded.bio,
  tags         = excluded.tags,
  sort_order   = excluded.sort_order,
  is_published = excluded.is_published;


-- Confirm: expect 4 events (1 featured) and 9 team members.
select
  (select count(*) from public.events)                      as events,
  (select count(*) from public.events where is_featured)     as featured,
  (select count(*) from public.team_members)                 as team_members;
