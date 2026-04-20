-- V6.5: Optional teacher credentials line on the certificate
--
-- Stores the teacher's academic title / specialisation shown between
-- the printed name and the "Professor(a) Responsável" role on the
-- signature line, e.g. "Especialista em Letras Português-Inglês pela
-- UFRJ". Per-certificate so the teacher can tailor it to the course
-- being issued.

alter table public.certificates
  add column if not exists teacher_title text;
