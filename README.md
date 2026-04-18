# Amazing School

> **Version 0.4.0 — Early Access / Testing Preview.** Free, open-source English teaching
> platform for Brazilian Portuguese speakers. APIs, data shapes, and UI copy may
> change without notice until we reach 1.0.

Your English, Your Teacher, with AI. Real teachers deliver live, personalized classes with a **sober, data-dense admin console**. AI is the tool that keeps students practicing between sessions — correcting grammar, expanding vocabulary, and maintaining momentum.

[![Version](https://img.shields.io/badge/Version-0.4.0--alpha-orange)](CHANGELOG.md)
[![Status](https://img.shields.io/badge/Status-Testing%20Preview-yellow)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 🚧 **This is a testing release.** The music + lesson modules work end-to-end
> but rate limits, content volume, and email delivery are dev-tier. Production
> deployment instructions below — use for evaluation, not yet for a paid classroom.

---

## What's in Version 2

### Core Features
- **Classroom management** — Teachers create classrooms, students join via 8-character invite codes
- **Sober teacher admin console** — distinct slate/zinc design system with a dense grid of student cards (photo, level, streak, % completion, last activity) and a per-student lesson manager
- **Per-student + classroom-wide lesson assignment** — assign, unassign, reorder, skip, add private notes; bulk-assign to a whole class in ≤ 3 clicks
- **CEFR-graded lesson library** — lessons bucketed into A1.1 → B1.2, sourced via an offline hybrid LLM + open-curation pipeline
- **Student profile photos** — Supabase Storage, auto-compressed to 512×512 WebP, RLS-gated to the classroom
- **Structured lessons** — Grammar, vocabulary, and reading exercises (multiple choice, fill-in-the-blank, matching pairs)
- **AI English tutor** — Claude-powered conversation practice with automatic correction, explanations, and PT-BR hints — now with **DB-backed rate limiting** that survives serverless cold starts
- **Live class scheduling** — Teachers post Zoom/Meet links; students join with one click
- **Gamification** — XP, levels, daily streaks, 8 badges, realtime in-classroom leaderboard
- **Realtime teacher dashboard** — student progress updates push live via Supabase Postgres Changes

### UX
- **Dark mode by default** with light mode toggle (persisted)
- **Bilingual** — English 🇺🇸 / Português Brasil 🇧🇷 with flag-based locale toggle
- **Forgot password** flow via Supabase Auth
- **Responsive design** — works on desktop and mobile browsers
- **Premium landing page** with gradient hero, feature grid, and smooth animations

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS + shadcn/ui + dual design tokens (`.theme-student` / `.theme-teacher`) |
| Auth | Supabase Auth |
| Database | Supabase Postgres with Row Level Security |
| Storage | Supabase Storage (avatars bucket, private, RLS-gated) |
| Realtime | Supabase Realtime (teacher dashboard live updates) |
| AI Tutor | Claude Haiku 4.5 via Vercel AI SDK, DB-backed rate limit |
| Content pipeline | Offline: Claude Sonnet 4.6 (generate) + Haiku (validate) via `scripts/content/` |
| Testing | Vitest (unit + integration) + Playwright (e2e) |
| Hosting | Vercel (free tier) |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/leonardochalhoub/amazing-school-app.git
cd amazing-school-app
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run each migration in order in the SQL Editor (or `supabase db push`):
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_assignments_v2.sql
   supabase/migrations/003_student_notes.sql
   supabase/migrations/004_ai_usage.sql
   supabase/migrations/005_lesson_metadata_and_avatars.sql
   ```
3. Copy your **Project URL** and API keys from Settings → API

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
AI_DAILY_MESSAGE_LIMIT=20
AI_MODEL=claude-haiku-4-5-20251001
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
amazing-school-app/
├── app/
│   ├── (auth)/              # Login, signup, forgot-password
│   ├── (dashboard)/
│   │   ├── teacher/         # Teacher pages (classrooms, assign, schedule)
│   │   └── student/         # Student pages (lessons, chat, leaderboard)
│   ├── api/chat/            # AI tutor streaming endpoint
│   ├── layout.tsx           # Root layout (theme + i18n providers)
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Navbar, sidebar
│   ├── gamification/        # XP bar, streak, badges, leaderboard, level-up modal
│   ├── lessons/             # Exercise components + lesson player
│   ├── chat/                # AI chat interface
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   └── locale-toggle.tsx
├── lib/
│   ├── supabase/            # Client, server, middleware, admin, types
│   ├── actions/             # Server Actions (auth, classroom, lessons, schedule, gamification)
│   ├── ai/                  # System prompt, rate limiting
│   ├── gamification/        # XP/level/streak/badge engine
│   ├── content/             # Lesson loader
│   └── i18n/                # Translations + context
├── content/
│   └── lessons/             # Static JSON lesson files (grammar, vocabulary, reading)
├── supabase/
│   └── migrations/          # SQL schema + RLS policies
└── .claude/
    ├── sdd/                 # Spec-Driven Development docs (brainstorm, define, design, build)
    ├── agents/              # Claude Code subagents
    └── kb/                  # Knowledge base domains
```

---

## User Flows

### Teacher
1. Sign up → choose **Teacher** role
2. Create a classroom → share the invite code
3. Assign lessons from the library
4. Schedule live classes with Zoom/Meet links
5. Monitor student progress in real time

### Student
1. Sign up → choose **Student** role
2. Join classroom via invite code
3. Complete assigned lessons → earn XP
4. Practice with AI tutor between classes (20 messages/day)
5. Attend live classes via the scheduled links
6. Climb the classroom leaderboard

---

## Included Content

Version 2 seeds lessons across all six CEFR sub-levels and wires up an offline pipeline to generate the remaining ~400 hours of content:

| CEFR | Skill | Slug |
|------|-------|------|
| A1.1 | grammar | `present-simple`, `past-simple` |
| A1.1 | vocabulary | `greetings` |
| A1.2 | grammar | `present-continuous` |
| A2.1 | grammar | `past-continuous` |
| A2.2 | grammar | `present-perfect` |
| B1.1 | grammar | `conditionals-first` |
| B1.2 | grammar | `conditionals-second` |

All lessons include Portuguese hints (🇧🇷 Dica) and an attribution `sources[]` array recording licensed source passages.

### Generating more lessons

See [`scripts/content/README.md`](scripts/content/README.md). Pipeline stages: **fetch → chunk → generate → validate → publish**, with budget caps and per-lesson idempotency so one run can be interrupted and resumed.

```bash
npm run content:run -- --cefr a2.1 --skill grammar --budget 5.00 --resume
```

---

## Gamification

| System | Description |
|--------|-------------|
| **XP** | 25 XP per completed lesson, bonuses for AI chat milestones and streaks |
| **Levels** | Level = floor(totalXP / 100) + 1, max level 50 |
| **Streaks** | Daily activity counter (1+ lesson or chat) with flame indicator |
| **Badges** | 8 achievements — First Steps, On Fire (7-day streak), Rising Star (Lv.5), etc. |
| **Leaderboard** | Realtime within-classroom ranking by XP |

---

## AI Tutor

The AI tutor uses Claude Haiku 4.5 with a system prompt optimized for Brazilian English learners:

- Always responds in English
- Gently corrects grammar/vocabulary mistakes with explanations
- Offers PT-BR hints when students are stuck
- Suggests conversation topics (ordering food, job interviews, directions, etc.)
- Rate limited to 20 messages/student/day (configurable)

---

## Deployment

### Vercel (recommended)

```bash
vercel deploy
```

Set all environment variables from `.env.local` in the Vercel dashboard.

---

## Testing

```bash
npm test            # Vitest unit + integration
npm run test:e2e    # Playwright e2e (requires test accounts)
npm run test:all
```

Integration and e2e suites auto-skip when their required credentials are missing. See [`tests/README.md`](tests/README.md).

## Roadmap

Version 2 focuses on the teacher admin surface and the content library. Future versions may include:

- Teacher content authoring tools (v3)
- Voice-based AI conversation (Whisper + TTS)
- Cross-classroom leaderboards
- Mobile native apps (iOS/Android)
- Google Calendar integration
- Advanced analytics dashboards
- Multi-language support (Spanish, French, etc.)

---

## Contributing

Pull requests welcome! This project follows Spec-Driven Development — see `.claude/sdd/` for the design documents.

---

## License

MIT — Free forever.
