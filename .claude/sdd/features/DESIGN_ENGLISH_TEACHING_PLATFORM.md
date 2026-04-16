# DESIGN: English Teaching Platform

> Technical architecture for an open-source English teaching platform with AI tutoring, gamification, and classroom management — built on Next.js + Supabase + Vercel.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ENGLISH_TEACHING_PLATFORM |
| **Date** | 2026-04-15 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_ENGLISH_TEACHING_PLATFORM.md](./DEFINE_ENGLISH_TEACHING_PLATFORM.md) |
| **Status** | Ready for Build |

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Free Tier)                               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                    Next.js 14 App Router                        │     │
│  │                                                                  │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │     │
│  │  │  Auth     │  │ Lessons  │  │ AI Tutor │  │ Gamification │   │     │
│  │  │  Pages    │  │  Engine  │  │   Chat   │  │   Engine     │   │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │     │
│  │       │              │              │               │           │     │
│  │  ┌────┴──────────────┴──────────────┴───────────────┴───────┐  │     │
│  │  │              Server Actions + API Routes                  │  │     │
│  │  └────┬──────────────┬──────────────┬───────────────────────┘  │     │
│  └───────┼──────────────┼──────────────┼──────────────────────────┘     │
│          │              │              │                                  │
└──────────┼──────────────┼──────────────┼─────────────────────────────────┘
           │              │              │
           ▼              ▼              ▼
┌──────────────────┐  ┌──────────┐  ┌──────────────┐
│  SUPABASE        │  │ CLAUDE   │  │ STATIC       │
│  (Free Tier)     │  │ API      │  │ CONTENT      │
│                  │  │ (Haiku)  │  │              │
│  ┌────────────┐  │  │          │  │  /content/   │
│  │ Auth       │  │  │ English  │  │  lessons/    │
│  │ (50K MAU)  │  │  │ Tutor    │  │  *.json      │
│  ├────────────┤  │  │ System   │  │              │
│  │ Postgres   │  │  │ Prompt   │  └──────────────┘
│  │ (500MB)    │  │  │          │
│  │            │  │  └──────────┘
│  │ - profiles │  │
│  │ - rooms    │  │
│  │ - lessons  │  │
│  │ - progress │  │
│  │ - gamify   │  │
│  │ - schedule │  │
│  ├────────────┤  │
│  │ Realtime   │  │
│  │ (200 conn) │  │
│  │            │  │
│  │ Leaderboard│  │
│  │ updates    │  │
│  └────────────┘  │
└──────────────────┘
```

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Auth Module** | Teacher/student signup, login, role management | Supabase Auth + RLS policies |
| **Classroom Manager** | Create rooms, invite codes, student roster | Server Actions + Supabase |
| **Lesson Engine** | Render exercises, track completion, award XP | RSC + JSON content files |
| **AI Tutor** | English conversation practice with corrections | Claude API (Haiku) + streaming |
| **Gamification Engine** | XP, levels, streaks, badges, leaderboard | Supabase + Realtime subscriptions |
| **Schedule Board** | Post/view live class links (Zoom/Meet) | Server Actions + Supabase |
| **Progress Dashboard** | Student self-view + teacher overview | RSC + Supabase queries |
| **UI Shell** | Layout, navigation, responsive design | shadcn/ui + Tailwind CSS |

---

## Key Decisions

### Decision 1: Lesson Content as Static JSON Files (Not Database)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-15 |

**Context:** Lessons are pre-built content that doesn't change per-user. Storing in the DB wastes the 500MB free tier on static data.

**Choice:** Store lesson content as JSON files in `/content/lessons/` within the repo. Only progress/completion goes in the DB.

**Rationale:** 
- Zero DB storage for content (saves Supabase quota for user data)
- Lessons are versioned with git
- Can be statically imported by Next.js for instant rendering
- Easy for contributors to add lessons via PR

**Alternatives Rejected:**
1. Store in Supabase — wastes DB quota, adds latency for static content
2. CMS (Strapi, Contentful) — adds complexity and another service to manage

**Consequences:**
- Lesson updates require a deploy (acceptable for this scale)
- No teacher content authoring in-app (already out of scope)

---

### Decision 2: Server Actions Over API Routes

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-15 |

**Context:** Next.js 14 supports both API Routes and Server Actions. Need to choose a pattern for mutations (create classroom, complete lesson, award XP).

**Choice:** Use Server Actions for all mutations. Use API Routes only for the AI chat streaming endpoint.

**Rationale:**
- Server Actions colocate with components — less boilerplate
- Type-safe end-to-end with TypeScript
- Automatic revalidation of server components
- API Route only for streaming (AI chat) since Server Actions don't support streaming responses

**Alternatives Rejected:**
1. All API Routes — more boilerplate, separate files, manual type alignment
2. tRPC — adds dependency, overkill for this project size

**Consequences:**
- Mutations are tightly coupled to components (acceptable for solo dev)
- AI chat is the only API route to maintain

---

### Decision 3: XP as Single Source of Truth for Gamification

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-15 |

**Context:** Gamification has multiple systems (XP, levels, streaks, badges). Need a clean data model that avoids sync issues.

**Choice:** XP is the atomic unit. Levels are derived from XP thresholds. Streaks are computed from daily activity log. Badges are triggered by events (DB triggers or application logic).

**Rationale:**
- Single `xp_events` table is the source of truth
- Levels = simple math (`Math.floor(totalXP / 100)`)
- No denormalized level field that could go out of sync
- Streaks computed from `daily_activity` table on read

**Alternatives Rejected:**
1. Separate XP + Level + Streak tables with sync logic — complex, prone to inconsistency
2. Redis for real-time counters — adds another service, overkill for scale

**Consequences:**
- Leaderboard queries aggregate XP on read (fine at <1500 users, can materialize later if needed)
- Badge checks happen in application logic after XP events

---

### Decision 4: Supabase Row Level Security for Multi-Tenancy

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-15 |

**Context:** Teachers should only see their classroom's students. Students should only see their own progress and their classroom's leaderboard.

**Choice:** Use Supabase RLS policies on all tables. The `auth.uid()` function combined with classroom membership drives all access control.

**Rationale:**
- Security at the database level — can't accidentally leak data in application code
- Supabase Auth integrates natively with RLS
- No middleware or application-level auth checks needed for reads

**Alternatives Rejected:**
1. Application-level auth middleware — error-prone, must remember on every query
2. Separate databases per classroom — overkill, wastes Supabase project quota

**Consequences:**
- RLS policies add complexity to DB schema
- Must test policies carefully (a misconfigured policy = data leak or lockout)

---

### Decision 5: AI Chat with Streaming via Route Handler

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-04-15 |

**Context:** The AI tutor needs to feel responsive. Users expect to see tokens appear as they're generated, not wait for a full response.

**Choice:** Use Next.js Route Handler (`/api/chat/route.ts`) with the Vercel AI SDK (`ai` package) for streaming Claude responses.

**Rationale:**
- Vercel AI SDK handles streaming, message history, and React hooks (`useChat`)
- Built-in support for Claude/Anthropic provider
- `useChat` hook manages client-side state (messages, loading, error)
- Streaming gives perceived instant response

**Alternatives Rejected:**
1. Server Action with polling — poor UX, unnecessary complexity
2. Direct Anthropic SDK without Vercel AI SDK — must handle streaming manually

**Consequences:**
- Dependency on `ai` and `@ai-sdk/anthropic` packages
- API route needs rate limiting to control costs

---

## Database Schema

```sql
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
```

### Key RLS Policies

```sql
-- Students can only see classrooms they belong to
CREATE POLICY "Students see own classrooms" ON classrooms
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    id IN (SELECT classroom_id FROM classroom_members WHERE student_id = auth.uid())
  );

-- Students can only see their own progress
CREATE POLICY "Students see own progress" ON lesson_progress
  FOR SELECT USING (student_id = auth.uid());

-- Teachers see all progress in their classrooms
CREATE POLICY "Teachers see classroom progress" ON lesson_progress
  FOR SELECT USING (
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  );

-- XP events visible to student (own) and teacher (classroom)
CREATE POLICY "XP visible to owner and teacher" ON xp_events
  FOR SELECT USING (
    student_id = auth.uid() OR
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  );

-- Leaderboard: students see XP of classmates
CREATE POLICY "Classmates see each other XP" ON xp_events
  FOR SELECT USING (
    classroom_id IN (SELECT classroom_id FROM classroom_members WHERE student_id = auth.uid())
  );
```

---

## Data Flow

### Flow 1: Student Completes a Lesson Exercise

```text
1. Student submits answer on lesson page
   │
   ▼
2. Server Action: validateAnswer(lessonSlug, exerciseId, answer)
   │
   ├─→ Check answer against JSON content file
   │
   ▼
3. If correct: UPDATE lesson_progress SET completed_exercises + 1
   │
   ▼
4. If all exercises done:
   │  ├─→ INSERT INTO xp_events (student_id, xp=25, source='lesson')
   │  ├─→ UPSERT daily_activity (lesson_count + 1)
   │  ├─→ Check badge eligibility → INSERT badges if earned
   │  └─→ revalidatePath('/dashboard')
   │
   ▼
5. Supabase Realtime broadcasts XP change → leaderboard updates live
```

### Flow 2: AI Tutor Conversation

```text
1. Student types message in chat UI
   │
   ▼
2. useChat hook → POST /api/chat
   │
   ▼
3. Route Handler:
   │  ├─→ Verify auth (Supabase session)
   │  ├─→ Rate limit check (20 messages/day)
   │  ├─→ Load conversation history from DB
   │  ├─→ Build messages array with system prompt
   │  └─→ Call Claude Haiku (streaming)
   │
   ▼
4. Stream tokens to client via ReadableStream
   │
   ▼
5. On stream complete:
   │  ├─→ Save user message + assistant response to messages table
   │  ├─→ UPSERT daily_activity (chat_messages + 1)
   │  └─→ If milestone reached → award XP
```

### Flow 3: Teacher Creates Classroom

```text
1. Teacher fills form (name, description)
   │
   ▼
2. Server Action: createClassroom(name, description)
   │  ├─→ INSERT INTO classrooms (teacher_id = auth.uid())
   │  └─→ Auto-generates invite_code (8 chars)
   │
   ▼
3. Redirect to classroom page showing invite code
   │
   ▼
4. Teacher shares code with students (WhatsApp, email, etc.)
```

---

## Lesson Content Structure

```text
/content/
  /lessons/
    /grammar/
      /present-simple.json
      /past-simple.json
      /irregular-verbs.json
    /vocabulary/
      /greetings.json
      /food-and-drinks.json
      /travel.json
    /reading/
      /short-stories-a1.json
      /news-articles-a2.json
    index.json              ← lesson catalog (title, category, level, slug)
```

### Lesson JSON Schema

```json
{
  "slug": "present-simple",
  "title": "Present Simple Tense",
  "description": "Learn when and how to use the present simple tense",
  "category": "grammar",
  "level": "A1",
  "xp_reward": 25,
  "estimated_minutes": 10,
  "exercises": [
    {
      "id": "ex-001",
      "type": "multiple_choice",
      "question": "She ___ to school every day.",
      "options": ["go", "goes", "going", "gone"],
      "correct": 1,
      "explanation": "We use 'goes' for he/she/it in present simple.",
      "hint_pt_br": "Para he/she/it, adicionamos -s ou -es ao verbo."
    },
    {
      "id": "ex-002",
      "type": "fill_blank",
      "question": "They ___ (not/like) coffee.",
      "correct": "don't like",
      "explanation": "Use 'don't' + base verb for negatives with I/you/we/they.",
      "hint_pt_br": "Use 'don't' + verbo base para frases negativas."
    },
    {
      "id": "ex-003",
      "type": "matching",
      "pairs": [
        ["I wake up", "Eu acordo"],
        ["She eats breakfast", "Ela toma café da manhã"],
        ["We go to work", "Nós vamos ao trabalho"]
      ]
    }
  ]
}
```

---

## AI Tutor System Prompt

```text
You are a friendly, patient English tutor for Brazilian Portuguese speakers.

RULES:
- Always respond in English
- When the student makes a grammar or vocabulary mistake, gently correct it
- Provide the correction, then explain WHY in simple English
- If the student seems stuck, offer a hint in Portuguese (marked with 🇧🇷)
- Keep responses concise (2-4 sentences max)
- Adjust complexity to the student's level (if they use simple words, keep yours simple)
- Encourage the student frequently
- Suggest conversation topics if the student doesn't know what to say

CORRECTION FORMAT:
When correcting, use this pattern:
"Great effort! Just a small fix: '[corrected sentence]'. We use '[rule]' because [reason]."

EXAMPLE:
Student: "I goed to the store yesterday"
You: "Nice try! Just a small fix: 'I went to the store yesterday.' 'Go' is an irregular verb — its past form is 'went', not 'goed'. Can you try another sentence using 'went'?"
```

---

## Gamification Configuration

```typescript
// lib/gamification/config.ts

export const XP_REWARDS = {
  LESSON_COMPLETE: 25,
  AI_CHAT_5_MESSAGES: 10,
  AI_CHAT_20_MESSAGES: 25,
  STREAK_BONUS_7_DAYS: 50,
  STREAK_BONUS_30_DAYS: 200,
} as const;

export const LEVEL_THRESHOLDS = {
  // Level = Math.floor(totalXP / 100) + 1
  XP_PER_LEVEL: 100,
  MAX_LEVEL: 50,
} as const;

export const BADGE_DEFINITIONS = [
  { type: 'first_lesson', name: 'First Steps', description: 'Complete your first lesson', icon: '🎯', condition: 'lessons_completed >= 1' },
  { type: 'five_lessons', name: 'Getting Serious', description: 'Complete 5 lessons', icon: '📚', condition: 'lessons_completed >= 5' },
  { type: 'first_chat', name: 'Conversation Starter', description: 'Have your first AI conversation', icon: '💬', condition: 'chat_sessions >= 1' },
  { type: 'streak_7', name: 'On Fire', description: '7-day streak', icon: '🔥', condition: 'current_streak >= 7' },
  { type: 'streak_30', name: 'Unstoppable', description: '30-day streak', icon: '⚡', condition: 'current_streak >= 30' },
  { type: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐', condition: 'level >= 5' },
  { type: 'level_10', name: 'English Explorer', description: 'Reach level 10', icon: '🌟', condition: 'level >= 10' },
  { type: 'perfect_lesson', name: 'Perfectionist', description: 'Complete a lesson with no mistakes', icon: '💎', condition: 'perfect_lessons >= 1' },
] as const;

export const STREAK_CONFIG = {
  RESET_HOUR_UTC: 6, // midnight BRT = 03:00 UTC, give buffer
  MIN_ACTIVITY: 1, // 1 lesson OR 1 chat message
} as const;
```

---

## Integration Points

| External System | Integration Type | Authentication | Rate Limit |
|-----------------|-----------------|----------------|------------|
| Supabase Auth | SDK (`@supabase/ssr`) | JWT via cookies | 50K MAU |
| Supabase Postgres | SDK (`@supabase/supabase-js`) | Service role key (server) / anon key (client) | 500MB storage |
| Supabase Realtime | SDK (channels) | Anon key + RLS | 200 concurrent |
| Claude API | Vercel AI SDK (`@ai-sdk/anthropic`) | API key (server-side only) | 20 msg/student/day (app-enforced) |
| Zoom/Google Meet | URL only (no API) | None | N/A |

---

## File Manifest

| # | File | Action | Purpose | Dependencies |
|---|------|--------|---------|--------------|
| **Infrastructure** | | | | |
| 1 | `package.json` | Create | Dependencies and scripts | None |
| 2 | `tsconfig.json` | Create | TypeScript config | None |
| 3 | `tailwind.config.ts` | Create | Tailwind + shadcn/ui theme | None |
| 4 | `next.config.ts` | Create | Next.js configuration | None |
| 5 | `.env.example` | Create | Environment variables template | None |
| 6 | `.env.local` | Create (gitignored) | Local env vars | None |
| 7 | `.gitignore` | Create | Git ignore rules | None |
| **Supabase** | | | | |
| 8 | `supabase/migrations/001_initial_schema.sql` | Create | Full DB schema + RLS policies | None |
| 9 | `lib/supabase/client.ts` | Create | Browser Supabase client | 1 |
| 10 | `lib/supabase/server.ts` | Create | Server Supabase client | 1 |
| 11 | `lib/supabase/middleware.ts` | Create | Auth session refresh | 10 |
| 12 | `middleware.ts` | Create | Next.js middleware for auth | 11 |
| 13 | `lib/supabase/types.ts` | Create | Generated DB types | 8 |
| **UI Foundation** | | | | |
| 14 | `app/layout.tsx` | Create | Root layout (fonts, theme, providers) | 3 |
| 15 | `app/globals.css` | Create | Global styles + shadcn/ui CSS vars | 3 |
| 16 | `components/ui/` | Create | shadcn/ui components (button, card, input, etc.) | 3 |
| 17 | `components/layout/navbar.tsx` | Create | Navigation bar (role-aware) | 16 |
| 18 | `components/layout/sidebar.tsx` | Create | Sidebar navigation | 16 |
| **Auth Pages** | | | | |
| 19 | `app/(auth)/login/page.tsx` | Create | Login page | 9, 16 |
| 20 | `app/(auth)/signup/page.tsx` | Create | Signup page (role selection) | 9, 16 |
| 21 | `app/(auth)/layout.tsx` | Create | Auth layout (centered card) | 16 |
| **Teacher Pages** | | | | |
| 22 | `app/(dashboard)/teacher/page.tsx` | Create | Teacher home — list classrooms | 10, 16 |
| 23 | `app/(dashboard)/teacher/classroom/new/page.tsx` | Create | Create classroom form | 10, 16 |
| 24 | `app/(dashboard)/teacher/classroom/[id]/page.tsx` | Create | Classroom detail — students, progress, schedule | 10, 16 |
| 25 | `app/(dashboard)/teacher/classroom/[id]/assign/page.tsx` | Create | Assign lessons to classroom | 10, 16 |
| 26 | `app/(dashboard)/teacher/classroom/[id]/schedule/page.tsx` | Create | Post live class link | 10, 16 |
| **Student Pages** | | | | |
| 27 | `app/(dashboard)/student/page.tsx` | Create | Student home — dashboard (XP, streak, lessons) | 10, 16 |
| 28 | `app/(dashboard)/student/join/page.tsx` | Create | Join classroom via invite code | 10, 16 |
| 29 | `app/(dashboard)/student/lessons/page.tsx` | Create | Assigned lessons list | 10 |
| 30 | `app/(dashboard)/student/lessons/[slug]/page.tsx` | Create | Lesson player (exercises) | 10, content files |
| 31 | `app/(dashboard)/student/chat/page.tsx` | Create | AI tutor chat interface | 10, 16 |
| 32 | `app/(dashboard)/student/leaderboard/page.tsx` | Create | Classroom leaderboard | 10, 16 |
| 33 | `app/(dashboard)/layout.tsx` | Create | Dashboard layout (sidebar + navbar) | 17, 18 |
| **Server Actions** | | | | |
| 34 | `lib/actions/auth.ts` | Create | Signup, login, logout actions | 10 |
| 35 | `lib/actions/classroom.ts` | Create | Create, join, list classrooms | 10 |
| 36 | `lib/actions/lessons.ts` | Create | Assign lessons, submit answers, track progress | 10 |
| 37 | `lib/actions/gamification.ts` | Create | Award XP, check badges, compute streak | 10 |
| 38 | `lib/actions/schedule.ts` | Create | Create/list scheduled classes | 10 |
| **AI Chat** | | | | |
| 39 | `app/api/chat/route.ts` | Create | Claude streaming endpoint | 10 |
| 40 | `lib/ai/system-prompt.ts` | Create | AI tutor system prompt | None |
| 41 | `lib/ai/rate-limit.ts` | Create | Per-student daily message limit | 10 |
| **Gamification** | | | | |
| 42 | `lib/gamification/config.ts` | Create | XP, levels, badges, streaks config | None |
| 43 | `lib/gamification/engine.ts` | Create | XP award, level calc, streak check, badge eval | 42 |
| 44 | `components/gamification/xp-bar.tsx` | Create | XP progress bar component | 16, 42 |
| 45 | `components/gamification/streak-counter.tsx` | Create | Streak flame counter | 16 |
| 46 | `components/gamification/badge-grid.tsx` | Create | Badge display grid | 16, 42 |
| 47 | `components/gamification/leaderboard-table.tsx` | Create | Ranked student table (realtime) | 16 |
| 48 | `components/gamification/level-up-modal.tsx` | Create | Celebration animation on level up | 16 |
| **Lesson Components** | | | | |
| 49 | `components/lessons/multiple-choice.tsx` | Create | Multiple choice exercise | 16 |
| 50 | `components/lessons/fill-blank.tsx` | Create | Fill in the blank exercise | 16 |
| 51 | `components/lessons/matching.tsx` | Create | Matching pairs exercise | 16 |
| 52 | `components/lessons/lesson-player.tsx` | Create | Exercise orchestrator (renders exercises in sequence) | 49, 50, 51 |
| **Content** | | | | |
| 53 | `content/lessons/index.json` | Create | Lesson catalog | None |
| 54 | `content/lessons/grammar/present-simple.json` | Create | Sample lesson | None |
| 55 | `content/lessons/grammar/past-simple.json` | Create | Sample lesson | None |
| 56 | `content/lessons/vocabulary/greetings.json` | Create | Sample lesson | None |
| 57 | `lib/content/loader.ts` | Create | Lesson content loader utility | 53 |
| **Chat Components** | | | | |
| 58 | `components/chat/chat-interface.tsx` | Create | Full chat UI with useChat hook | 16 |
| 59 | `components/chat/message-bubble.tsx` | Create | Individual message display | 16 |
| 60 | `components/chat/suggested-topics.tsx` | Create | Conversation starter chips | 16 |

**Total Files:** 60

---

## Code Patterns

### Pattern 1: Server Action with XP Award

```typescript
// lib/actions/lessons.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { awardXP } from "@/lib/gamification/engine";
import { revalidatePath } from "next/cache";

export async function submitAnswer(
  lessonSlug: string,
  exerciseId: string,
  answer: string | number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Load lesson content and validate
  const lesson = await import(`@/content/lessons/${lessonSlug}.json`);
  const exercise = lesson.exercises.find((e: any) => e.id === exerciseId);
  const isCorrect = exercise.correct === answer;

  // Update progress
  await supabase.rpc("increment_exercise_progress", {
    p_student_id: user.id,
    p_lesson_slug: lessonSlug,
  });

  // Check if lesson complete → award XP
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("completed_exercises, total_exercises")
    .eq("student_id", user.id)
    .eq("lesson_slug", lessonSlug)
    .single();

  if (progress?.completed_exercises === progress?.total_exercises) {
    await awardXP(user.id, "lesson", lesson.xp_reward, lessonSlug);
  }

  revalidatePath("/student");
  return { isCorrect, explanation: exercise.explanation };
}
```

### Pattern 2: Supabase Server Client (Next.js App Router)

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### Pattern 3: AI Chat Route with Streaming

```typescript
// app/api/chat/route.ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { checkRateLimit } from "@/lib/ai/rate-limit";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const allowed = await checkRateLimit(user.id);
  if (!allowed) return new Response("Daily limit reached", { status: 429 });

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toDataStreamResponse();
}
```

### Pattern 4: Realtime Leaderboard Subscription

```typescript
// components/gamification/leaderboard-table.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LeaderboardTable({ classroomId, initialData }) {
  const [rankings, setRankings] = useState(initialData);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`xp-${classroomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "xp_events",
        filter: `classroom_id=eq.${classroomId}`,
      }, () => {
        // Refetch leaderboard on any XP change
        fetchLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [classroomId]);

  // ...
}
```

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal |
|-----------|-------|-------|-------|---------------|
| Unit | Gamification logic (XP, levels, streaks, badges) | `__tests__/gamification/` | Vitest | 90% |
| Unit | Lesson content validation | `__tests__/content/` | Vitest | 100% of JSON schema |
| Integration | Server Actions (classroom, lessons, progress) | `__tests__/actions/` | Vitest + Supabase local | Key paths |
| Component | Exercise components, chat UI | `__tests__/components/` | Vitest + Testing Library | Interactive elements |
| E2E | Full flows (signup → join → learn → earn XP) | `__tests__/e2e/` | Playwright | Happy path |
| Manual | AI tutor quality, responsive design | N/A | Browser | UX validation |

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|-------------------|--------|
| Supabase Auth failure | Redirect to login, clear session | No |
| Claude API timeout | Show "Tutor is thinking..." + retry button | Yes (1x) |
| Claude API rate limit (Anthropic) | Queue message, show wait indicator | Yes (after delay) |
| App rate limit (20 msg/day) | Show friendly message with count remaining | No |
| Invalid lesson answer | Show explanation, allow retry | Yes (unlimited) |
| Network offline | Show offline banner, disable mutations | Auto-retry on reconnect |
| Supabase DB error | Toast notification, log error | No |

---

## Configuration

| Config Key | Type | Default | Description |
|------------|------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | string | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | — | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | string | — | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | string | — | Claude API key |
| `AI_DAILY_MESSAGE_LIMIT` | int | `20` | Max AI messages per student per day |
| `AI_MODEL` | string | `claude-haiku-4-5-20251001` | Claude model to use |

---

## Security Considerations

- **API keys server-side only:** `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` never exposed to client
- **RLS on all tables:** No data accessible without proper auth context
- **Input sanitization:** All user inputs validated before DB insertion (Zod schemas)
- **Rate limiting on AI:** Per-student daily cap prevents cost abuse
- **Invite codes:** 8-char random codes (not guessable), can be regenerated by teacher
- **No PII in AI prompts:** Student messages go to Claude but no personal data in system prompt
- **CSRF protection:** Server Actions have built-in CSRF tokens in Next.js

---

## Observability

| Aspect | Implementation |
|--------|----------------|
| Logging | Vercel function logs (built-in) — no additional setup needed for MVP |
| Error Tracking | Console errors + Vercel deployment logs |
| AI Cost Monitoring | Query `messages` table count per day to track API usage |
| User Metrics | Query `daily_activity` table for engagement metrics |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-15 | design-agent | Initial version |

---

## Next Step

**Ready for:** `/build .claude/sdd/features/DESIGN_ENGLISH_TEACHING_PLATFORM.md`
