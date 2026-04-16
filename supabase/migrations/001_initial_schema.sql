-- Profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Classrooms
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Classroom membership
CREATE TABLE classroom_members (
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (classroom_id, student_id)
);

-- Lesson assignments
CREATE TABLE lesson_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  lesson_slug TEXT NOT NULL,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ
);

-- Lesson progress
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_slug TEXT NOT NULL,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  completed_exercises INT DEFAULT 0,
  total_exercises INT NOT NULL,
  completed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, lesson_slug, classroom_id)
);

-- XP events (gamification source of truth)
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  xp_amount INT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('lesson', 'ai_chat', 'streak_bonus', 'badge')),
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily activity (for streak calculation)
CREATE TABLE daily_activity (
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  lesson_count INT DEFAULT 0,
  chat_messages INT DEFAULT 0,
  PRIMARY KEY (student_id, activity_date)
);

-- Badges earned
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, badge_type)
);

-- AI chat conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled classes
CREATE TABLE scheduled_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_url TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;

-- Profiles: users see their own + classmates
CREATE POLICY "Users see own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Teachers see classroom members" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT cm.student_id FROM classroom_members cm
      JOIN classrooms c ON c.id = cm.classroom_id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Classrooms: teacher owns, students see joined
CREATE POLICY "Teachers see own classrooms" ON classrooms
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Students see joined classrooms" ON classrooms
  FOR SELECT USING (
    id IN (SELECT classroom_id FROM classroom_members WHERE student_id = auth.uid())
  );

CREATE POLICY "Teachers create classrooms" ON classrooms
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers update own classrooms" ON classrooms
  FOR UPDATE USING (teacher_id = auth.uid());

-- Classroom members
CREATE POLICY "Teachers see members of own classrooms" ON classroom_members
  FOR SELECT USING (
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  );

CREATE POLICY "Students see own membership" ON classroom_members
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can join classrooms" ON classroom_members
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Lesson assignments: teacher assigns, students see own classroom
CREATE POLICY "Teachers manage assignments" ON lesson_assignments
  FOR ALL USING (assigned_by = auth.uid());

CREATE POLICY "Students see classroom assignments" ON lesson_assignments
  FOR SELECT USING (
    classroom_id IN (SELECT classroom_id FROM classroom_members WHERE student_id = auth.uid())
  );

-- Lesson progress
CREATE POLICY "Students see own progress" ON lesson_progress
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students insert own progress" ON lesson_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students update own progress" ON lesson_progress
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Teachers see classroom progress" ON lesson_progress
  FOR SELECT USING (
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  );

-- XP events
CREATE POLICY "Students see own XP" ON xp_events
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students insert own XP" ON xp_events
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers see classroom XP" ON xp_events
  FOR SELECT USING (
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  );

CREATE POLICY "Classmates see each other XP" ON xp_events
  FOR SELECT USING (
    classroom_id IN (SELECT classroom_id FROM classroom_members WHERE student_id = auth.uid())
  );

-- Daily activity
CREATE POLICY "Students manage own activity" ON daily_activity
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers see classroom activity" ON daily_activity
  FOR SELECT USING (
    student_id IN (
      SELECT cm.student_id FROM classroom_members cm
      JOIN classrooms c ON c.id = cm.classroom_id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Badges
CREATE POLICY "Students see own badges" ON badges
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students earn badges" ON badges
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Classmates see badges" ON badges
  FOR SELECT USING (
    student_id IN (
      SELECT cm.student_id FROM classroom_members cm
      WHERE cm.classroom_id IN (
        SELECT classroom_id FROM classroom_members WHERE student_id = auth.uid()
      )
    )
  );

-- Conversations
CREATE POLICY "Students manage own conversations" ON conversations
  FOR ALL USING (student_id = auth.uid());

-- Messages
CREATE POLICY "Students see own messages" ON messages
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM conversations WHERE student_id = auth.uid())
  );

CREATE POLICY "Students insert own messages" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM conversations WHERE student_id = auth.uid())
  );

-- Scheduled classes
CREATE POLICY "Teachers manage schedule" ON scheduled_classes
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Students see classroom schedule" ON scheduled_classes
  FOR SELECT USING (
    classroom_id IN (SELECT classroom_id FROM classroom_members WHERE student_id = auth.uid())
  );
