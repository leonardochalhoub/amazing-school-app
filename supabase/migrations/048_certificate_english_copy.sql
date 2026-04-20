-- V6.6: English-language cache for certificate free-text fields
--
-- Teachers always type remarks + teacher_title in Portuguese; the
-- English version of the certificate needs them translated. We
-- cache the English copy on the row itself so render time is
-- free of AI calls and consistent across downloads — the
-- translation only runs once, at certificate creation.

alter table public.certificates
  add column if not exists remarks_en text,
  add column if not exists teacher_title_en text,
  -- Optional teacher CPF printed below the signature name. Stored
  -- as text to preserve leading zeros and let the UI format dots
  -- + dashes freely (123.456.789-00). Null when the teacher
  -- doesn't want to disclose it on a specific certificate.
  add column if not exists teacher_cpf text;
