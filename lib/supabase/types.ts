export type Role = "teacher" | "student";
export type XpSource = "lesson" | "ai_chat" | "streak_bonus" | "badge";
export type MessageRole = "user" | "assistant";
export type AssignmentStatus = "assigned" | "skipped" | "completed";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
}

export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: string;
}

export interface ClassroomMember {
  classroom_id: string;
  student_id: string;
  joined_at: string;
}

export interface LessonAssignment {
  id: string;
  classroom_id: string;
  lesson_slug: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string | null;
  student_id: string | null;
  order_index: number;
  status: AssignmentStatus;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_slug: string;
  classroom_id: string;
  completed_exercises: number;
  total_exercises: number;
  completed_at: string | null;
  started_at: string;
}

export interface XpEvent {
  id: string;
  student_id: string;
  classroom_id: string;
  xp_amount: number;
  source: XpSource;
  source_id: string | null;
  created_at: string;
}

export interface DailyActivity {
  student_id: string;
  activity_date: string;
  lesson_count: number;
  chat_messages: number;
}

export interface Badge {
  id: string;
  student_id: string;
  badge_type: string;
  earned_at: string;
}

export interface Conversation {
  id: string;
  student_id: string;
  classroom_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface ScheduledClass {
  id: string;
  classroom_id: string;
  title: string;
  meeting_url: string;
  scheduled_at: string;
  created_by: string;
  created_at: string;
}

export interface StudentNote {
  id: string;
  classroom_id: string;
  student_id: string;
  teacher_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface AiUsage {
  user_id: string;
  window_date: string;
  count: number;
  updated_at: string;
}

export interface RosterStudent {
  id: string;
  teacher_id: string;
  classroom_id: string | null;
  full_name: string;
  preferred_name: string | null;
  email: string | null;
  notes: string | null;
  has_avatar: boolean;
  age_group: "kid" | "teen" | "adult" | null;
  gender: "female" | "male" | null;
  birthday: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at">; Update: Partial<Profile> };
      classrooms: { Row: Classroom; Insert: Omit<Classroom, "id" | "invite_code" | "created_at">; Update: Partial<Classroom> };
      classroom_members: { Row: ClassroomMember; Insert: Omit<ClassroomMember, "joined_at">; Update: Partial<ClassroomMember> };
      lesson_assignments: {
        Row: LessonAssignment;
        Insert: Omit<LessonAssignment, "id" | "assigned_at" | "order_index" | "status"> & {
          order_index?: number;
          status?: AssignmentStatus;
        };
        Update: Partial<LessonAssignment>;
      };
      lesson_progress: {
        Row: LessonProgress;
        Insert: Omit<LessonProgress, "id" | "started_at" | "completed_at" | "completed_exercises">;
        Update: Partial<LessonProgress>;
      };
      xp_events: { Row: XpEvent; Insert: Omit<XpEvent, "id" | "created_at">; Update: Partial<XpEvent> };
      daily_activity: { Row: DailyActivity; Insert: DailyActivity; Update: Partial<DailyActivity> };
      badges: { Row: Badge; Insert: Omit<Badge, "id" | "earned_at">; Update: Partial<Badge> };
      conversations: { Row: Conversation; Insert: Omit<Conversation, "id" | "created_at">; Update: Partial<Conversation> };
      messages: { Row: Message; Insert: Omit<Message, "id" | "created_at">; Update: Partial<Message> };
      scheduled_classes: { Row: ScheduledClass; Insert: Omit<ScheduledClass, "id" | "created_at">; Update: Partial<ScheduledClass> };
      student_notes: {
        Row: StudentNote;
        Insert: Omit<StudentNote, "id" | "created_at" | "updated_at">;
        Update: Partial<StudentNote>;
      };
      ai_usage: { Row: AiUsage; Insert: AiUsage; Update: Partial<AiUsage> };
      roster_students: {
        Row: RosterStudent;
        Insert: Omit<RosterStudent, "id" | "created_at" | "updated_at" | "has_avatar"> & {
          has_avatar?: boolean;
        };
        Update: Partial<RosterStudent>;
      };
    };
    Functions: {
      increment_ai_usage: {
        Args: { p_user_id: string; p_window_date: string; p_limit: number };
        Returns: { allowed: boolean; remaining: number; count: number };
      };
    };
  };
}
