# DEFINE: English Teaching Platform

> A free, open-source web platform where English teachers manage classrooms, assign structured lessons, schedule live classes, and provide AI-powered conversation practice with full gamification — built for Brazilian Portuguese speakers.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ENGLISH_TEACHING_PLATFORM |
| **Date** | 2026-04-15 |
| **Author** | define-agent |
| **Status** | Ready for Design |
| **Clarity Score** | 14/15 |
| **Source** | BRAINSTORM_ENGLISH_TEACHING_PLATFORM.md |

---

## Problem Statement

English teachers in Brazil who teach remotely have no free, unified tool to manage their students. They juggle WhatsApp for scheduling, Google Docs for materials, Zoom for classes, and have zero visibility into student practice between sessions. Students lose motivation without gamification, and existing platforms are either expensive (English Live ~R$200/mo) or lack real conversation practice (Duolingo). Teachers need a single hub that ties live classes, structured practice, AI tutoring, and progress tracking together — at zero cost.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| **English Teacher** | Creates classrooms, assigns lessons, schedules live classes, monitors progress | No unified free platform — uses 4+ tools (WhatsApp, Zoom, Google Docs, spreadsheets) to manage remote students |
| **Brazilian Student** | Joins a classroom, completes lessons, practices with AI, attends live classes | Loses motivation between classes; existing tools are expensive or lack real English conversation practice |

### User Limits (MVP)

| Metric | Limit | Rationale |
|--------|-------|-----------|
| Max teachers | ~50 | Supabase free tier constraints |
| Max students per teacher | ~30 | Classroom management scope |
| Max concurrent AI chats | ~10 | Claude API cost control |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | Teacher can create a classroom and invite students via code/link |
| **MUST** | Students can complete structured English lessons (grammar, vocabulary, reading) and earn XP |
| **MUST** | Students can practice English via text conversation with AI tutor (Claude) |
| **MUST** | Full gamification: XP points, levels, streaks, badges, in-classroom leaderboard |
| **MUST** | Teacher can post Zoom/Meet links for upcoming live classes |
| **MUST** | Teacher can view each student's progress (lessons completed, XP, streak, badges) |
| **SHOULD** | Pre-built lesson library sourced from open educational resources |
| **SHOULD** | Responsive design that works well on mobile browsers |
| **SHOULD** | PT-BR interface with English learning content |
| **COULD** | Dark mode |
| **COULD** | Export student progress as CSV |

---

## Success Criteria

Measurable outcomes:

- [ ] Teacher creates a classroom and invites a student in under 2 minutes
- [ ] Student completes a full lesson (5+ exercises) and receives XP within 5 minutes
- [ ] AI tutor responds in English, corrects mistakes, and stays in character as a patient English teacher
- [ ] Leaderboard updates in real-time when a student earns XP
- [ ] Streak counter increments daily when student completes at least 1 lesson or 1 AI conversation
- [ ] Teacher dashboard shows all students' XP, level, streak, and lessons completed
- [ ] Lighthouse Performance score > 90 on desktop, > 80 on mobile
- [ ] First Contentful Paint < 1.5s on broadband, < 3s on 3G
- [ ] Zero hosting cost at target scale (free tier services only)

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Teacher creates classroom | Teacher is logged in | Teacher clicks "New Classroom", enters name and description | Classroom is created with a unique invite code displayed |
| AT-002 | Student joins classroom | Student has an invite code | Student enters code on join page | Student is added to the classroom and sees the dashboard |
| AT-003 | Student completes lesson | Student opens an assigned grammar lesson | Student answers all exercises correctly | XP is awarded, progress bar updates, badge earned if milestone |
| AT-004 | Student chats with AI | Student opens AI Tutor | Student types "How do I say 'obrigado' in a formal way?" | AI responds in English with explanation and example sentences |
| AT-005 | AI corrects mistake | Student is in AI chat | Student types "I goed to the store yesterday" | AI gently corrects to "went" with explanation of irregular verbs |
| AT-006 | Streak maintained | Student completed a lesson yesterday | Student completes a lesson today | Streak counter shows 2 days, flame icon visible |
| AT-007 | Streak broken | Student last activity was 2 days ago | Student logs in today | Streak resets to 0, "Start a new streak!" message shown |
| AT-008 | Teacher views progress | Teacher has 5 students in classroom | Teacher opens classroom dashboard | Table shows each student's XP, level, streak, lessons completed, last active |
| AT-009 | Teacher posts class link | Teacher is on classroom page | Teacher adds a Zoom link with date/time | Students see upcoming class card with join button |
| AT-010 | Leaderboard ranking | 3 students have different XP totals | Any student opens the leaderboard | Students are ranked by XP, top student highlighted |
| AT-011 | Level up | Student has 95 XP (level threshold at 100) | Student earns 10 XP from a lesson | Level increases, celebration animation shown, new badge unlocked |
| AT-012 | Mobile responsive | Student opens platform on phone | Student navigates lessons and AI chat | All features are usable, no horizontal scroll, touch-friendly |

---

## Out of Scope

Explicitly NOT included in MVP:

- Voice-based AI conversation (STT/TTS)
- Native mobile apps (iOS/Android)
- Payment/subscription system
- Teacher content authoring tools (teachers assign from pre-built library)
- Cross-classroom features (leaderboards, shared lessons)
- Google Calendar / iCal integration
- Detailed analytics dashboard (charts, trends, export)
- Multi-language support (English-only lessons, PT-BR-only interface)
- Admin panel for platform management
- Email notifications / push notifications
- Social features (student-to-student chat, forums)

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| **Developer** | Solo developer | Must maximize leverage from frameworks (Next.js, Supabase, shadcn/ui); no custom infrastructure |
| **Cost** | Zero hosting/maintenance cost | Limited to free tiers: Vercel (100GB BW), Supabase (500MB DB, 50K MAU), Claude API (pay-per-use, minimal) |
| **License** | Open source (public GitHub repo) | No proprietary dependencies; all lesson content must be freely licensable |
| **Content** | No budget for licensed curriculum | Lessons sourced from OER (Open Educational Resources), public domain, Creative Commons |
| **Scale** | ~50 teachers, ~1500 students max | No need for CDN, caching layers, or horizontal scaling |
| **AI Cost** | Claude API is pay-per-use | Use Haiku model for cost efficiency; limit conversation length; cache system prompts |

---

## Technical Context

| Aspect | Value | Notes |
|--------|-------|-------|
| **Project** | `/home/leochalhoub/amazing-school-app` | Greenfield Next.js app |
| **Deployment** | Vercel (free tier) | Auto-deploy from GitHub main branch |
| **Database** | Supabase Postgres (free tier) | Auth + DB + Realtime + Row Level Security |
| **AI** | Claude API (Haiku 4.5) | Text-based English tutor |
| **UI Framework** | Next.js 14 App Router + TypeScript | SSR + RSC for performance |
| **Component Library** | shadcn/ui + Tailwind CSS | Premium design with minimal effort |
| **KB Domains** | None yet (new project) | Will create as needed during build |
| **IaC Impact** | None | Fully managed services, no infrastructure to provision |

### Tech Stack Summary

| Layer | Technology | Free Tier Limit |
|-------|-----------|-----------------|
| Frontend + SSR | Next.js 14 (App Router) | Unlimited (OSS) |
| UI Components | shadcn/ui + Tailwind CSS | Unlimited (OSS) |
| Auth | Supabase Auth | 50K MAU |
| Database | Supabase Postgres | 500MB, 2 projects |
| Realtime | Supabase Realtime | 200 concurrent connections |
| AI Tutor | Claude API (Haiku) | Pay-per-use (~$0.25/1M input tokens) |
| Hosting | Vercel | 100GB bandwidth/mo |
| Repository | GitHub (public) | Unlimited |

---

## Feature Breakdown

### F1: Authentication & Classroom Management

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| F1.1 | Teacher signup/login (email + password via Supabase Auth) | MUST |
| F1.2 | Student signup/login (email + password) | MUST |
| F1.3 | Teacher creates classroom (name, description) | MUST |
| F1.4 | Generate unique invite code per classroom | MUST |
| F1.5 | Student joins classroom via invite code | MUST |
| F1.6 | Teacher views list of students in classroom | MUST |
| F1.7 | Role-based access (teacher vs student views) | MUST |

### F2: Structured Lessons

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| F2.1 | Lesson library with categories (Grammar, Vocabulary, Reading) | MUST |
| F2.2 | Lesson detail page with exercises (multiple choice, fill-in-the-blank, matching) | MUST |
| F2.3 | Lesson completion tracking (per student) | MUST |
| F2.4 | Teacher assigns lessons to classroom | MUST |
| F2.5 | XP awarded on lesson completion | MUST |
| F2.6 | Lesson content stored as JSON/MDX in repo (not DB) | SHOULD |

### F3: AI English Tutor

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| F3.1 | Chat interface for English conversation practice | MUST |
| F3.2 | AI responds in English, understands PT-BR context | MUST |
| F3.3 | AI corrects grammar/vocabulary mistakes with explanations | MUST |
| F3.4 | Conversation history persisted per student | MUST |
| F3.5 | XP awarded for AI conversation milestones (5 min, 10 messages, etc.) | SHOULD |
| F3.6 | Conversation starters / suggested topics | SHOULD |

### F4: Gamification

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| F4.1 | XP system — earn points from lessons and AI conversations | MUST |
| F4.2 | Level system — level up at XP thresholds | MUST |
| F4.3 | Streak system — daily activity counter with visual indicator | MUST |
| F4.4 | Badges — unlock for milestones (first lesson, 7-day streak, level 5, etc.) | MUST |
| F4.5 | In-classroom leaderboard — ranked by XP | MUST |
| F4.6 | Celebration animations on level-up and badge earn | SHOULD |

### F5: Live Class Scheduling

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| F5.1 | Teacher posts a class (title, date/time, Zoom/Meet link) | MUST |
| F5.2 | Students see upcoming classes on dashboard | MUST |
| F5.3 | "Join Class" button that opens the link | MUST |
| F5.4 | Past classes section (archive) | SHOULD |

### F6: Progress Tracking

| Sub-feature | Description | Priority |
|-------------|-------------|----------|
| F6.1 | Student dashboard — own XP, level, streak, badges, assigned lessons | MUST |
| F6.2 | Teacher dashboard — table of all students with XP, level, streak, last active | MUST |
| F6.3 | Progress bar per lesson (% complete) | SHOULD |

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | Supabase free tier (500MB DB) is sufficient for ~1500 students | Would need paid plan or alternative DB | [ ] |
| A-002 | Claude Haiku is good enough for English tutoring quality | Would need Sonnet (4x cost) | [ ] |
| A-003 | Open educational resources provide enough lesson content | Would need to create original content | [ ] |
| A-004 | Students have reliable internet (at least 3G) | Would need offline mode | [ ] |
| A-005 | Teachers are comfortable with a web-based tool (vs WhatsApp) | Would need simpler onboarding or WhatsApp integration | [ ] |
| A-006 | Vercel free tier (100GB BW/mo) covers ~1500 users | Would need Cloudflare Pages as alternative | [ ] |

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Clear pain point, specific audience, competitive landscape understood |
| Users | 3 | Two personas with distinct roles and pain points |
| Goals | 3 | MoSCoW prioritized, specific and actionable |
| Success | 3 | Measurable with numbers (time, scores, costs) |
| Scope | 2 | Clear out-of-scope list; lesson content sourcing strategy needs validation |
| **Total** | **14/15** | |

---

## Open Questions

1. **Lesson content sourcing:** Which specific OER sources will provide the lesson content? (Can be resolved during Build phase — does not block Design)
2. **AI conversation limits:** Should there be a daily limit on AI conversations per student to control costs? (Recommend yes — e.g., 20 messages/day)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-15 | define-agent | Initial version from BRAINSTORM document |

---

## Next Step

**Ready for:** `/design .claude/sdd/features/DEFINE_ENGLISH_TEACHING_PLATFORM.md`
