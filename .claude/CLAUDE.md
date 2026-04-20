# Amazing School App

## Project Overview

Open-source English teaching platform for Brazilian Portuguese speakers. Teachers create classrooms, invite students, assign structured lessons, schedule live classes (Zoom/Meet), and track progress. Students practice with AI-powered English tutor and earn XP through gamification.

## Architecture

```
┌─────────────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js 16 + React 19  │     │  Supabase     │     │  Claude API  │
│  (Vercel)               │     │  Auth + DB    │     │  (Haiku 4.5) │
│  App Router + SSR       │────▶│  + Realtime   │     │  AI Tutor    │
│  shadcn/ui + Tailwind   │     │  + Storage    │     │              │
└─────────────────────────┘     └──────────────┘     └──────────────┘
```

V2 adds: dual design tokens (`.theme-student` / `.theme-teacher`), per-student lesson
assignment, Supabase Storage avatars, DB-backed rate limiting (`ai_usage` table),
CEFR-partitioned lesson library (A1.1 → B1.2), offline content pipeline (`scripts/content/`),
and a Vitest + Playwright test harness.

**The Ledger (Supabase Postgres):** Users, classrooms, progress, gamification
**The Tutor (Claude API):** AI-powered English conversation practice

## Tech Stack

| Layer | Technology | Free Tier |
|-------|-----------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript | Unlimited (OSS) |
| UI | Tailwind v4 + shadcn/ui (dual token scopes) | Unlimited (OSS) |
| Auth | Supabase Auth | 50K MAU |
| Database | Supabase Postgres | 500MB |
| Storage | Supabase Storage (avatars, private) | 1GB |
| Realtime | Supabase Realtime | 200 concurrent |
| AI Tutor | Claude API (Haiku 4.5) | Pay-per-use |
| Content gen | Claude Sonnet 4.6 (offline, batched) | Pay-per-use, capped |
| Testing | Vitest + Playwright | Free |
| Hosting | Vercel | 100GB BW/mo |

## Directory Structure

```
app/
  (auth)/                      # Login, signup pages
  (dashboard)/
    student/layout.tsx         # applies .theme-student scope
    student/                   # Student pages (lessons, chat, leaderboard, profile)
    teacher/layout.tsx         # applies .theme-teacher scope
    teacher/classroom/[id]/students/[studentId]/  # per-student manager (v2)
  api/chat/                    # AI tutor streaming endpoint
  globals.css                  # base theme + .theme-student / .theme-teacher tokens
components/
  ui/                          # shadcn/ui components
  layout/                      # Navbar, sidebar
  shared/                      # AvatarDisplay, AvatarUploader (v2)
  teacher/                     # StudentGrid, RealtimeGrid, AssignmentManager,
                               # NotesPanel, LessonPicker, BulkAssignButton (v2)
  gamification/                # XP bar, streak, badges, leaderboard
  lessons/                     # Exercise components (multiple choice, fill blank, matching)
  chat/                        # AI chat interface
lib/
  supabase/                    # Client, server, middleware, types, signed-urls (v2)
  actions/                     # Server Actions — now includes assignments, notes,
                               # avatars, teacher-dashboard (v2)
  ai/                          # System prompt, DB-backed rate limiter (v2)
  gamification/                # Config, engine
  content/                     # Lesson loader + shared Zod schema (v2)
  design/                      # student-tokens.ts + teacher-tokens.ts (v2)
content/
  lessons/
    index.json                 # flat meta index (v1 shape preserved)
    by-cefr.json               # v2: cefr_level → ordered slugs
    a1-1/ a1-2/ a2-1/ a2-2/    # v2: CEFR-partitioned tree
    b1-1/ b1-2/
scripts/
  content/                     # v2: offline pipeline (fetch → chunk → generate → validate → publish)
    prompts/                   # versioned Sonnet + Haiku prompts
    lib/                       # cost-tracker, manifest, claude, rebuild-index
    data/                      # gitignored working dir
supabase/
  migrations/                  # 001 + 002 assignments + 003 notes + 004 ai_usage + 005 avatars
tests/
  unit/                        # v2: Vitest unit tests
  integration/                 # v2: Vitest integration tests (service-role)
  e2e/                         # v2: Playwright e2e
  fixtures/
.claude/
  sdd/features/                # Brainstorm, Define, Design docs (V1 + V2)
  agents/                      # SubAgents
  kb/                          # Knowledge Base domains
  commands/                    # Custom commands
```

## Conventions

- TypeScript strict mode
- Server Actions for mutations, API Routes only for streaming (AI chat)
- Supabase RLS for all data access control
- Lesson content as static JSON files (not in DB)
- XP is the single source of truth for gamification (levels derived, streaks computed)
- shadcn/ui components — don't build custom UI when a shadcn component exists
- Environment variables: NEXT_PUBLIC_ prefix for client-safe, plain for server-only

## Reports — hard rules

**Every report generated under `/print/*` (curriculum, cohort, finance,
receipt, receipts-list, certificate, sysadmin) MUST prominently display
the Amazing School logo (`/branding/school-logo.png` — the purple
wordmark).** No exception.

- Shell-based reports render it through `<ReportHeader>` (top-left
  card). `<ReportShell>` already wires this up — just pass `teacher={...}`
  and the header appears.
- The certificate print page does NOT use `<ReportShell>` (it's a
  landscape A4 with its own chrome) — the logo is rendered manually
  in the header `<div className="report-logo-box">`.
- Every report also carries `<BrandWatermark />` at the bottom — a
  subtle pill with the logo + `amazing-school-app.vercel.app` tagline.

If you touch a `/print/*` route, confirm BOTH the header logo AND
the `<BrandWatermark />` are present before finishing. Reports that
print without the Amazing School mark are a bug.

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
V1 (shipped):
Phase 0: /brainstorm → BRAINSTORM_ENGLISH_TEACHING_PLATFORM.md ✅
Phase 1: /define     → DEFINE_ENGLISH_TEACHING_PLATFORM.md ✅
Phase 2: /design     → DESIGN_ENGLISH_TEACHING_PLATFORM.md ✅
Phase 3: /build      → v1.0 shipped (commit 92541cb)
Phase 4: /ship       → (done)

V2 (in progress):
Phase 0: /brainstorm → BRAINSTORM_ENGLISH_TEACHING_PLATFORM_V2.md ✅
Phase 1: /define     → DEFINE_ENGLISH_TEACHING_PLATFORM_V2.md ✅
Phase 2: /design     → DESIGN_ENGLISH_TEACHING_PLATFORM_V2.md ✅
Phase 3: /build      → BUILD_REPORT_ENGLISH_TEACHING_PLATFORM_V2.md ✅
Phase 4: /ship       → (next — once tests pass + human review of generated lessons)
```

## Local Dev

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
npm install
npm run dev
```
