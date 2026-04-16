# Amazing School App

## Project Overview

Open-source English teaching platform for Brazilian Portuguese speakers. Teachers create classrooms, invite students, assign structured lessons, schedule live classes (Zoom/Meet), and track progress. Students practice with AI-powered English tutor and earn XP through gamification.

## Architecture

```
┌─────────────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js 14 (Vercel)    │     │  Supabase     │     │  Claude API  │
│  App Router + SSR       │────▶│  Auth + DB    │     │  (Haiku)     │
│  shadcn/ui + Tailwind   │     │  + Realtime   │     │  AI Tutor    │
└─────────────────────────┘     └──────────────┘     └──────────────┘
```

**The Ledger (Supabase Postgres):** Users, classrooms, progress, gamification
**The Tutor (Claude API):** AI-powered English conversation practice

## Tech Stack

| Layer | Technology | Free Tier |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript | Unlimited (OSS) |
| UI | Tailwind CSS + shadcn/ui | Unlimited (OSS) |
| Auth | Supabase Auth | 50K MAU |
| Database | Supabase Postgres | 500MB |
| Realtime | Supabase Realtime | 200 concurrent |
| AI Tutor | Claude API (Haiku 4.5) | Pay-per-use |
| Hosting | Vercel | 100GB BW/mo |

## Directory Structure

```
app/
  (auth)/                   # Login, signup pages
  (dashboard)/
    teacher/                # Teacher pages (classrooms, progress, schedule)
    student/                # Student pages (lessons, AI chat, leaderboard)
  api/chat/                 # AI tutor streaming endpoint
  layout.tsx                # Root layout
components/
  ui/                       # shadcn/ui components
  layout/                   # Navbar, sidebar
  gamification/             # XP bar, streak, badges, leaderboard
  lessons/                  # Exercise components (multiple choice, fill blank, matching)
  chat/                     # AI chat interface
lib/
  supabase/                 # Client, server, middleware, types
  actions/                  # Server Actions (auth, classroom, lessons, gamification)
  ai/                       # System prompt, rate limiting
  gamification/             # Config, engine
  content/                  # Lesson loader
content/
  lessons/                  # Static JSON lesson files
    grammar/
    vocabulary/
    reading/
supabase/
  migrations/               # SQL schema + RLS policies
.claude/
  sdd/features/             # Brainstorm, Define, Design docs
  agents/                   # SubAgents
  kb/                       # Knowledge Base domains
  commands/                 # Custom commands
```

## Conventions

- TypeScript strict mode
- Server Actions for mutations, API Routes only for streaming (AI chat)
- Supabase RLS for all data access control
- Lesson content as static JSON files (not in DB)
- XP is the single source of truth for gamification (levels derived, streaks computed)
- shadcn/ui components — don't build custom UI when a shadcn component exists
- Environment variables: NEXT_PUBLIC_ prefix for client-safe, plain for server-only

## Knowledge Base Domains

| Domain | Purpose |
|--------|---------|
| supabase | Auth, RLS, Realtime, Postgres patterns |
| genai | AI architecture, tool calling, guardrails |
| prompt-engineering | System prompts, structured extraction |
| architecture | System design, scalability, trade-offs |
| testing | Test patterns, fixtures, integration |
| exploration | Codebase analysis |
| communication | Stakeholder communication |

## SubAgents

| Agent | Category | Purpose |
|-------|----------|---------|
| genai-architect | ai-ml/ | AI system design |
| ai-prompt-specialist | ai-ml/ | Prompt optimization |
| ai-data-engineer | ai-ml/ | Pipeline design |
| llm-specialist | ai-ml/ | LLM selection |
| code-reviewer | code-quality/ | Code review |
| code-cleaner | code-quality/ | Code cleanup |
| code-documenter | code-quality/ | Documentation |
| python-developer | code-quality/ | Python patterns |
| shell-script-specialist | code-quality/ | Shell scripts |
| the-planner | communication/ | Project planning |
| meeting-analyst | communication/ | Meeting notes |
| kb-architect | exploration/ | KB design |
| codebase-explorer | exploration/ | Code analysis |

## SDD Workflow

```
Phase 0: /brainstorm → BRAINSTORM_ENGLISH_TEACHING_PLATFORM.md ✅
Phase 1: /define     → DEFINE_ENGLISH_TEACHING_PLATFORM.md ✅
Phase 2: /design     → DESIGN_ENGLISH_TEACHING_PLATFORM.md ✅
Phase 3: /build      → (next)
Phase 4: /ship       → (after build)
```

## Local Dev

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
npm install
npm run dev
```
