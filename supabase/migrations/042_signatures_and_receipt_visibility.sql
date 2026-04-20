-- V6: Teacher signatures + per-student receipt visibility
--
-- Three related additions:
--
--  (1) Per-student toggle `receipts_visible_to_student`: when true,
--      the student sees their own paid-month receipts and can
--      download them. Default OFF — teachers opt in per student
--      from the Management / per-student page.
--
--  (2) Per-teacher signature image stored in a new PRIVATE `signatures`
--      bucket. Unlike school logos (public), signatures are legally
--      sensitive — we gate reads through signed URLs so a teacher's
--      signature never leaks through a public URL.
--
--  (3) Per-teacher `signature_enabled` flag. When off (default), docs
--      still carry the teacher's printed name but no signature image.
--      Teachers can toggle this at will without re-uploading.

alter table public.roster_students
  add column if not exists receipts_visible_to_student boolean not null default false;

alter table public.profiles
  add column if not exists signature_url text,
  add column if not exists signature_enabled boolean not null default false;

-- Private bucket — no public read. Reports that need the signature
-- fetch it via a short-lived signed URL at render time.
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do nothing;

-- Only the owner of the signature (matched by filename = auth uid)
-- can read, write, update, or delete. The admin / service-role
-- client used by server actions bypasses these policies — that's
-- how signed-URL generation for report rendering works.
drop policy if exists "Owner reads own signature" on storage.objects;
create policy "Owner reads own signature" on storage.objects
  for select using (
    bucket_id = 'signatures'
    and name = ((auth.uid())::text || '.webp')
  );

drop policy if exists "Owner writes own signature" on storage.objects;
create policy "Owner writes own signature" on storage.objects
  for insert with check (
    bucket_id = 'signatures'
    and name = ((auth.uid())::text || '.webp')
  );

drop policy if exists "Owner updates own signature" on storage.objects;
create policy "Owner updates own signature" on storage.objects
  for update using (
    bucket_id = 'signatures'
    and name = ((auth.uid())::text || '.webp')
  );

drop policy if exists "Owner deletes own signature" on storage.objects;
create policy "Owner deletes own signature" on storage.objects
  for delete using (
    bucket_id = 'signatures'
    and name = ((auth.uid())::text || '.webp')
  );
