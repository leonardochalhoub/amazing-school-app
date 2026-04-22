-- ═════════════════════════════════════════════════════════════════════════════
-- Teacher community wall.
--
-- A lightweight social feed where every teacher can post a short message
-- and like others' posts. Facebook/Instagram/Orkut-style stream: newest
-- first, last 10 visible with a "+" to reveal older posts.
--
-- Each post carries the author's profile name + location at render time
-- (joined live, not denormalized, so a later name/location edit is
-- reflected everywhere).
--
-- A post may reference a specific lesson_bank_entry so "look at this
-- lesson I just shared" posts deep-link back to the bank.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS teacher_community_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body             TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  linked_entry_id  UUID REFERENCES lesson_bank_entries(id) ON DELETE SET NULL,
  deleted_at       TIMESTAMPTZ,
  deleted_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_recent
  ON teacher_community_posts (created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_author
  ON teacher_community_posts (author_id, created_at DESC);

ALTER TABLE teacher_community_posts ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read non-deleted posts (the /teacher/community
-- page also gates non-teacher roles at the app level).
DROP POLICY IF EXISTS "read non-deleted posts" ON teacher_community_posts;
CREATE POLICY "read non-deleted posts"
  ON teacher_community_posts FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "write own post" ON teacher_community_posts;
CREATE POLICY "write own post"
  ON teacher_community_posts FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "update own post" ON teacher_community_posts;
CREATE POLICY "update own post"
  ON teacher_community_posts FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "delete own post" ON teacher_community_posts;
CREATE POLICY "delete own post"
  ON teacher_community_posts FOR DELETE
  USING (author_id = auth.uid());


-- One like per (post, user). No separate unlike table — deleting the row
-- is the unlike.
CREATE TABLE IF NOT EXISTS teacher_community_likes (
  post_id     UUID NOT NULL REFERENCES teacher_community_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_likes_post
  ON teacher_community_likes (post_id);

ALTER TABLE teacher_community_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read likes" ON teacher_community_likes;
CREATE POLICY "read likes"
  ON teacher_community_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "like own" ON teacher_community_likes;
CREATE POLICY "like own"
  ON teacher_community_likes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "unlike own" ON teacher_community_likes;
CREATE POLICY "unlike own"
  ON teacher_community_likes FOR DELETE USING (user_id = auth.uid());


-- Inline replies — flat single-depth thread under each post. Good enough
-- for v1 and keeps reads cheap.
CREATE TABLE IF NOT EXISTS teacher_community_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES teacher_community_posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post
  ON teacher_community_comments (post_id, created_at);

ALTER TABLE teacher_community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read comments" ON teacher_community_comments;
CREATE POLICY "read comments"
  ON teacher_community_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "write own comment" ON teacher_community_comments;
CREATE POLICY "write own comment"
  ON teacher_community_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "delete own comment" ON teacher_community_comments;
CREATE POLICY "delete own comment"
  ON teacher_community_comments FOR DELETE
  USING (author_id = auth.uid());
