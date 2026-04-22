-- ═════════════════════════════════════════════════════════════════════════════
-- Lesson Bank + Sysadmin Messages + Audit Trail
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Teachers can share their personalized lessons to a public "Lesson Bank"
-- where every teacher can:
--   (1) assign the author's lesson directly to students (no migration);
--   (2) migrate it into their own environment (deep copy linked to origin,
--       auto-updated whenever the author publishes a new version);
--   (3) browse version history.
--
-- Only the author can edit or delete a shared lesson. Every save creates
-- an immutable version snapshot so any prior state is recoverable by
-- teachers who migrated earlier and by sysadmin.
--
-- Sysadmin (role='owner' / leochalhoub@hotmail.com) gets three extra powers:
--   (a) suggest modifications to a shared lesson via a message thread that
--       pops up for the teacher and lives in their profile → Messages;
--   (b) spread N personalized lessons in one click into every teacher's
--       bank at once (idempotent — can't spread the same lesson twice);
--   (c) soft-delete any bank entry — the row is hidden from teachers but
--       kept in the sysadmin audit log.
--
-- Tables:
--   lesson_bank_entries         — one row per shared lesson (current snapshot)
--   lesson_bank_versions        — immutable history of every published version
--   lesson_bank_migrations      — teacher ↔ bank-entry link (auto-sync copies)
--   sysadmin_messages           — threaded messages; check/X review workflow
--   sysadmin_audit_log          — record of sysadmin destructive actions
--   lesson_bank_spreads         — dedupe table for sysadmin "spread" feature
--
-- ═════════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────────
-- 1. lesson_bank_entries — the shared lessons catalog
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_bank_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_lesson_id UUID REFERENCES teacher_lessons(id) ON DELETE SET NULL,
  -- Snapshot of owner + metadata. We denormalize so the entry survives even
  -- if the source teacher_lesson gets renamed or the author changes email.
  author_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  cefr_level        TEXT,
  category          TEXT,
  estimated_minutes INT,
  -- Current published snapshot of the exercises. Every edit also writes a
  -- row to lesson_bank_versions for history.
  exercises         JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_version   INT NOT NULL DEFAULT 1,
  import_count      INT NOT NULL DEFAULT 0,
  assign_count      INT NOT NULL DEFAULT 0,
  -- Spread origin: null = author self-shared; non-null = sysadmin spread.
  spread_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  spread_source_id  UUID REFERENCES lesson_bank_entries(id) ON DELETE SET NULL,
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_reason    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (author_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_lesson_bank_entries_recent
  ON lesson_bank_entries (updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_bank_entries_popular
  ON lesson_bank_entries (import_count DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_bank_entries_author
  ON lesson_bank_entries (author_id);
CREATE INDEX IF NOT EXISTS idx_lesson_bank_entries_cefr
  ON lesson_bank_entries (cefr_level) WHERE deleted_at IS NULL;

ALTER TABLE lesson_bank_entries ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can SELECT non-deleted entries.
-- (Teachers need to browse; the app also gates /teacher/bank to teacher role.)
DROP POLICY IF EXISTS "read non-deleted bank entries" ON lesson_bank_entries;
CREATE POLICY "read non-deleted bank entries"
  ON lesson_bank_entries FOR SELECT
  USING (deleted_at IS NULL);

-- Soft-deleted rows are visible only to the sysadmin/owner role — enforced
-- in the app layer via createAdminClient for those queries.
-- (Client-visible reads already filtered by the policy above.)

DROP POLICY IF EXISTS "author writes bank entry" ON lesson_bank_entries;
CREATE POLICY "author writes bank entry"
  ON lesson_bank_entries FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "author updates bank entry" ON lesson_bank_entries;
CREATE POLICY "author updates bank entry"
  ON lesson_bank_entries FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Only the author can delete via RLS; sysadmin uses the service-role client
-- and soft-delete via deleted_at.
DROP POLICY IF EXISTS "author deletes bank entry" ON lesson_bank_entries;
CREATE POLICY "author deletes bank entry"
  ON lesson_bank_entries FOR DELETE
  USING (author_id = auth.uid());


-- ────────────────────────────────────────────────────────────────────────────
-- 2. lesson_bank_versions — immutable version history
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_bank_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_entry_id  UUID NOT NULL REFERENCES lesson_bank_entries(id) ON DELETE CASCADE,
  version_no     INT  NOT NULL,
  -- Full snapshot — so we can restore exactly what a teacher saw at migration time.
  title          TEXT NOT NULL,
  description    TEXT,
  cefr_level     TEXT,
  category       TEXT,
  estimated_minutes INT,
  exercises      JSONB NOT NULL,
  change_note    TEXT,        -- author-supplied "what changed in this version"
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_entry_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_lesson_bank_versions_entry
  ON lesson_bank_versions (bank_entry_id, version_no DESC);

ALTER TABLE lesson_bank_versions ENABLE ROW LEVEL SECURITY;

-- Anyone with read access to the parent entry can read its versions.
DROP POLICY IF EXISTS "read bank versions for visible entries" ON lesson_bank_versions;
CREATE POLICY "read bank versions for visible entries"
  ON lesson_bank_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lesson_bank_entries e
      WHERE e.id = bank_entry_id AND e.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "author writes bank versions" ON lesson_bank_versions;
CREATE POLICY "author writes bank versions"
  ON lesson_bank_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lesson_bank_entries e
      WHERE e.id = bank_entry_id AND e.author_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────────────────────
-- 3. lesson_bank_migrations — a teacher "brought this lesson into their env"
-- ────────────────────────────────────────────────────────────────────────────
-- When a teacher migrates a bank entry we INSERT a row here and ALSO write a
-- copy into teacher_lessons (slug = "bank-{entry_slug}" to avoid collision).
-- On any subsequent owner update we rewrite the migrated teacher_lesson rows
-- automatically (server-side — see saveBankEntry action).
CREATE TABLE IF NOT EXISTS lesson_bank_migrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_entry_id    UUID NOT NULL REFERENCES lesson_bank_entries(id) ON DELETE CASCADE,
  teacher_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_lesson_id  UUID REFERENCES teacher_lessons(id) ON DELETE SET NULL,
  -- Version the teacher's local copy is currently synced to. Helps us detect
  -- "update available" states in the UI.
  synced_version   INT NOT NULL DEFAULT 1,
  auto_sync        BOOLEAN NOT NULL DEFAULT true,
  migrated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_entry_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_migrations_teacher
  ON lesson_bank_migrations (teacher_id);

ALTER TABLE lesson_bank_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher reads own migrations" ON lesson_bank_migrations;
CREATE POLICY "teacher reads own migrations"
  ON lesson_bank_migrations FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher writes own migrations" ON lesson_bank_migrations;
CREATE POLICY "teacher writes own migrations"
  ON lesson_bank_migrations FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher updates own migrations" ON lesson_bank_migrations;
CREATE POLICY "teacher updates own migrations"
  ON lesson_bank_migrations FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "teacher deletes own migrations" ON lesson_bank_migrations;
CREATE POLICY "teacher deletes own migrations"
  ON lesson_bank_migrations FOR DELETE
  USING (teacher_id = auth.uid());


-- ────────────────────────────────────────────────────────────────────────────
-- 4. sysadmin_messages — review threads between sysadmin and teachers
-- ────────────────────────────────────────────────────────────────────────────
-- Each thread starts from a sysadmin review on a specific bank entry and
-- can grow into a back-and-forth. Status on the head message reflects the
-- resolution of the whole thread.
--
--   pending      — sysadmin sent; teacher hasn't acted
--   approved     — teacher clicked the green check (modifications done)
--   rejected     — teacher clicked the red X (and replied back)
--
-- Replies (is_reply=true) keep the same thread_id and accumulate in order.
CREATE TABLE IF NOT EXISTS sysadmin_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role     TEXT NOT NULL CHECK (sender_role IN ('owner', 'teacher', 'student')),
  recipient_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject         TEXT,
  body            TEXT NOT NULL,
  bank_entry_id   UUID REFERENCES lesson_bank_entries(id) ON DELETE SET NULL,
  is_reply        BOOLEAN NOT NULL DEFAULT false,
  -- Status lives on the thread-head row and is updated when a reply
  -- resolves it. UIs should read the most recent row's status OR aggregate.
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'closed')),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sysadmin_messages_recipient
  ON sysadmin_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sysadmin_messages_thread
  ON sysadmin_messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sysadmin_messages_entry
  ON sysadmin_messages (bank_entry_id);

ALTER TABLE sysadmin_messages ENABLE ROW LEVEL SECURITY;

-- Sender + recipient can both read a message.
DROP POLICY IF EXISTS "read my messages" ON sysadmin_messages;
CREATE POLICY "read my messages"
  ON sysadmin_messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Any authenticated user can send — app layer gates sysadmin-only flows.
DROP POLICY IF EXISTS "send message" ON sysadmin_messages;
CREATE POLICY "send message"
  ON sysadmin_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Only the recipient can update read_at; app layer handles status flips via
-- admin client so the audit trail stays tamper-evident.
DROP POLICY IF EXISTS "recipient marks read" ON sysadmin_messages;
CREATE POLICY "recipient marks read"
  ON sysadmin_messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());


-- ────────────────────────────────────────────────────────────────────────────
-- 5. sysadmin_audit_log — durable trace of destructive sysadmin actions
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sysadmin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,           -- 'soft_delete_bank_entry' | 'spread_lesson' | ...
  target_type  TEXT NOT NULL,           -- 'lesson_bank_entry' | ...
  target_id    UUID,
  details      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sysadmin_audit_log_target
  ON sysadmin_audit_log (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sysadmin_audit_log_recent
  ON sysadmin_audit_log (created_at DESC);

ALTER TABLE sysadmin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only writable/readable by service-role in practice; leaving no policies
-- means RLS blocks client access, which is what we want.


-- ────────────────────────────────────────────────────────────────────────────
-- 6. lesson_bank_spreads — sysadmin's "spread to all teachers" dedupe record
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_bank_spreads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lesson_id     UUID NOT NULL REFERENCES teacher_lessons(id) ON DELETE CASCADE,
  source_teacher_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_entry_id        UUID REFERENCES lesson_bank_entries(id) ON DELETE SET NULL,
  spread_by            UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_lesson_id)   -- sysadmin can't spread the same lesson twice
);

ALTER TABLE lesson_bank_spreads ENABLE ROW LEVEL SECURITY;
-- Client-blocked by default; sysadmin uses service-role client.


-- ────────────────────────────────────────────────────────────────────────────
-- 7. Trigger: keep updated_at fresh on lesson_bank_entries
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_lesson_bank_entries() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_lesson_bank_entries ON lesson_bank_entries;
CREATE TRIGGER trg_touch_lesson_bank_entries
  BEFORE UPDATE ON lesson_bank_entries
  FOR EACH ROW EXECUTE FUNCTION touch_lesson_bank_entries();
