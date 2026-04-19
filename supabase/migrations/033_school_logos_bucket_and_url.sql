-- V5.3: Per-teacher uploadable school logo. Stored in a public bucket
-- because logos are inherently meant to be seen (teacher sees their
-- own, students of that teacher see the same logo). Owner-only writes.

insert into storage.buckets (id, name, public)
values ('school-logos', 'school-logos', true)
on conflict (id) do nothing;

drop policy if exists "Public read school logos" on storage.objects;
create policy "Public read school logos" on storage.objects
  for select using (bucket_id = 'school-logos');

drop policy if exists "Owner writes own school logo" on storage.objects;
create policy "Owner writes own school logo" on storage.objects
  for insert with check (
    bucket_id = 'school-logos'
    and name = ((auth.uid())::text || '.webp')
  );

drop policy if exists "Owner updates own school logo" on storage.objects;
create policy "Owner updates own school logo" on storage.objects
  for update using (
    bucket_id = 'school-logos'
    and name = ((auth.uid())::text || '.webp')
  );

drop policy if exists "Owner deletes own school logo" on storage.objects;
create policy "Owner deletes own school logo" on storage.objects
  for delete using (
    bucket_id = 'school-logos'
    and name = ((auth.uid())::text || '.webp')
  );

-- Teacher's uploaded logo path. Format: "{teacherId}.webp" inside the
-- school-logos bucket, or null when they haven't uploaded one yet.
alter table public.profiles
  add column if not exists school_logo_url text;
