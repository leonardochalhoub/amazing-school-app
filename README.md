# Amazing School

> **Version 1.0** — Free, open-source English teaching platform for Brazilian Portuguese speakers.

Your English, Your Teacher, with AI. Real teachers deliver live, personalized classes. AI is the tool that keeps students practicing between sessions — correcting grammar, expanding vocabulary, and maintaining momentum.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What's in Version 1

### Core Features
- **Classroom management** — Teachers create classrooms, students join via 8-character invite codes
- **Structured lessons** — Grammar, vocabulary, and reading exercises (multiple choice, fill-in-the-blank, matching pairs)
- **AI English tutor** — Claude-powered conversation practice with automatic correction, explanations, and PT-BR hints
- **Live class scheduling** — Teachers post Zoom/Meet links; students join with one click
- **Gamification** — XP, levels, daily streaks, 8 badges, realtime in-classroom leaderboard
- **Progress tracking** — Teachers see every student's XP, lessons completed, streak, and last activity in real time

### UX
- **Dark mode by default** with light mode toggle (persisted)
- **Bilingual** — English 🇺🇸 / Português Brasil 🇧🇷 with flag-based locale toggle
- **Forgot password** flow via Supabase Auth
- **Responsive design** — works on desktop and mobile browsers
- **Premium landing page** with gradient hero, feature grid, and smooth animations

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth |
| Database | Supabase Postgres with Row Level Security |
| Realtime | Supabase Realtime (leaderboard updates) |
| AI Tutor | Claude Haiku 4.5 via Vercel AI SDK |
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
2. Run the migration SQL in the SQL Editor:
   ```
   supabase/migrations/001_initial_schema.sql
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

Version 1 ships with 3 sample lessons:

| Category | Lesson | Level | Exercises |
|----------|--------|-------|-----------|
| Grammar | Present Simple Tense | A1 | 5 |
| Grammar | Past Simple Tense | A1 | 5 |
| Vocabulary | Greetings & Introductions | A1 | 5 |

All lessons include Portuguese hints (🇧🇷 Dica) to help learners.

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

## Roadmap

Version 1 is focused on the MVP. Future versions may include:

- Voice-based AI conversation (Whisper + TTS)
- Teacher content authoring tools
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
