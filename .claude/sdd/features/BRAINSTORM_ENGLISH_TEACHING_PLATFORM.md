# BRAINSTORM: English Teaching Platform

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ENGLISH_TEACHING_PLATFORM |
| **Date** | 2026-04-15 |
| **Author** | brainstorm-agent |
| **Status** | Ready for Define |

---

## Initial Idea

**Raw Input:** Build a high-performance, beautifully designed web platform for teaching English. The platform should serve as an interactive learning environment where students can practice and improve their English skills. Key considerations: modern UI/UX with premium feel, fast load times and smooth interactions, engaging learning experience that keeps students coming back. Target audience: Brazilian Portuguese speakers learning English. Explore tech stack, MVP features, and differentiation from Duolingo/English Live.

**Context Gathered:**
- Target audience: Brazilian Portuguese speakers learning English
- Teacher-student model: teachers create classrooms, invite students, assign work, give live classes
- AI tutor supplements the teacher's work between live sessions
- Must be 100% free to host and maintain (free tier services)
- Open source project
- Solo developer
- Content sourced from freely available internet resources
- Gamification is a core requirement, not a nice-to-have

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | New standalone project: amazing-school-app | Greenfield Next.js app |
| Relevant KB Domains | N/A (new project) | Will need its own KB |
| IaC Patterns | Vercel + Supabase (managed, free tier) | No IaC needed for MVP |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | Core learning modality for MVP? | Combination of AI conversation practice + structured lessons | Dual-mode architecture: lesson engine + chat interface |
| 2 | Monetization model? | 100% free, open source, limited users (teachers + remote students) | No payment system, no content gating, simpler auth |
| 3 | User model — classroom structure? | Teacher creates classroom, invites students by code/link, assigns lessons, tracks progress | Closed classroom model (like Google Classroom + AI) |
| 4 | Gamification scope? | Full suite: XP, levels, streaks, leaderboards, badges | Needs real-time updates, progress tracking tables, achievement system |
| 5 | Live class integration? | Simple link management — teacher pastes Zoom/Meet link, students click to join | Minimal integration, just a scheduling board with links |
| 6 | Tech stack preference? | Open to recommendations, performance and design quality matter most | Freedom to choose optimal stack |
| 7 | Existing materials/samples? | None — starting from scratch, use freely available internet content | Need content sourcing strategy for lessons |

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Input files | N/A | 0 | No existing lesson content |
| Output examples | N/A | 0 | No reference designs provided |
| Ground truth | N/A | 0 | No verified content |
| Related code | N/A | 0 | Greenfield project |

**How samples will be used:**
- Lesson content will be sourced from open educational resources (OER)
- Grammar rules and vocabulary from public domain sources
- AI tutor uses Claude API with PT-BR context awareness

---

## Approaches Explored

### Approach A: Next.js + Supabase + Vercel ⭐ Recommended

**Description:** Next.js 14 (App Router) with TypeScript + Tailwind CSS + shadcn/ui for premium UI. Supabase for auth, Postgres database, and realtime subscriptions. Vercel free tier for hosting. Claude API for AI tutor.

**Pros:**
- Zero hosting cost (Vercel free tier + Supabase free tier)
- Supabase gives auth, database, row-level security, and realtime out of the box
- Next.js + shadcn/ui = premium design with minimal custom CSS
- SSR for performance, edge functions for speed
- Huge ecosystem, ideal for solo developer productivity
- Supabase free tier: 50K MAU, 500MB DB — more than enough for limited users

**Cons:**
- Vercel free tier has bandwidth limits (100GB/mo)
- AI conversation costs money per API call (minimal at limited scale)
- Vendor lock-in to Vercel/Supabase (mitigated by open source alternatives)

**Why Recommended:** Maximum features for minimum effort as a solo dev. Free tier comfortably covers the target scale. Best design output with least CSS work. Largest community for troubleshooting.

---

### Approach B: Astro + Firebase + Cloudflare Pages

**Description:** Astro for content-heavy pages (lessons render as static HTML). Firebase for auth + Firestore. Cloudflare Pages for hosting with unlimited bandwidth.

**Pros:**
- Fastest possible page loads (static HTML for lessons)
- Cloudflare = unlimited bandwidth, truly free
- Firebase auth is battle-tested

**Cons:**
- Astro is less mature for highly interactive apps (gamification, real-time leaderboards)
- Firestore's NoSQL model is awkward for relational data (teacher-student-classroom-progress)
- Smaller component ecosystem than Next.js

---

### Approach C: SvelteKit + PocketBase + Fly.io

**Description:** SvelteKit for reactive UI with tiny bundle sizes. PocketBase (single Go binary) as self-hosted backend. Fly.io free tier for hosting.

**Pros:**
- Smallest bundle size = fastest client performance
- PocketBase is truly free (self-hosted, no vendor limits)
- SvelteKit has excellent developer experience

**Cons:**
- Smallest ecosystem — harder to find components and tutorials
- PocketBase is a single-developer OSS project (long-term risk)
- Fly.io free tier is more limited than Vercel/Supabase

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A: Next.js + Supabase + Vercel |
| **User Confirmation** | 2026-04-15 |
| **Reasoning** | Best productivity for solo dev, zero cost at target scale, premium UI with shadcn/ui, built-in auth/DB/realtime from Supabase |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | AI tutor is text-only for MVP | Voice adds STT/TTS complexity and cost | Voice-based conversation |
| 2 | Closed classroom model (invite by code) | Simpler than marketplace, matches teacher-student relationship | Open enrollment / marketplace |
| 3 | Simple Zoom/Meet link board (no calendar integration) | Platform value is between-class practice, not live class management | Calendar sync, embedded video |
| 4 | Content from open internet resources | No budget for licensed content, solo dev can't create curriculum | Custom content authoring tools |
| 5 | Full gamification in MVP | Core to engagement and differentiation — not optional | Deferred gamification |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Cross-classroom leaderboards | Only need within-classroom for MVP | Yes |
| Voice-based AI conversation | Text chat is simpler, voice adds STT/TTS cost | Yes |
| Google Calendar integration | Simple schedule board is sufficient | Yes |
| Multiple language support | English-only, PT-BR interface only for MVP | Yes |
| Native mobile app | Responsive web covers mobile | Yes |
| Teacher content authoring tools | Teachers assign from pre-built lessons first | Yes |
| Detailed analytics dashboard | Simple progress view (% complete, XP) is enough | Yes |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| Core concept + user model | ✅ | Confirmed classroom model, added live class requirement | Yes — added Zoom/Meet link scheduling |
| MVP scope + YAGNI | ✅ | Approved cuts and kept features | No |

---

## Suggested Requirements for /define

### Problem Statement (Draft)
English teachers in Brazil need a free, modern platform to manage their remote students — combining live class scheduling, structured lesson assignments, AI-powered conversation practice, and gamification to keep students engaged between sessions.

### Target Users (Draft)
| User | Pain Point |
|------|------------|
| English Teacher | No unified free tool to schedule classes, assign practice, and track student progress |
| Brazilian Student | Existing platforms are expensive (English Live) or lack real conversation practice (Duolingo) |

### Success Criteria (Draft)
- [ ] Teacher can create a classroom and invite students in under 2 minutes
- [ ] Student can complete a structured lesson and earn XP
- [ ] Student can have a text conversation with AI tutor in English
- [ ] Teacher can see each student's progress (lessons, XP, streak)
- [ ] Teacher can post a Zoom/Meet link for upcoming classes
- [ ] Page load under 2 seconds on 3G connection
- [ ] Lighthouse performance score > 90

### Constraints Identified
- Solo developer — must maximize leverage from frameworks and managed services
- Zero hosting/maintenance cost — free tier services only
- Open source — all code public on GitHub
- Content from freely available sources only
- Limited user scale (not designed for thousands of concurrent users)

### Out of Scope (Confirmed)
- Voice-based AI conversation
- Native mobile apps
- Payment/subscription system
- Teacher content authoring tools
- Cross-classroom features
- Calendar integrations
- Detailed analytics beyond basic progress

---

## Tech Stack Summary

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | Next.js 14 (App Router) + TypeScript | Free |
| UI | Tailwind CSS + shadcn/ui | Free |
| Auth | Supabase Auth | Free tier |
| Database | Supabase Postgres | Free tier (500MB) |
| Realtime | Supabase Realtime | Free tier |
| AI Tutor | Claude API (Haiku for cost efficiency) | ~$0.001/conversation |
| Hosting | Vercel | Free tier |
| Repo | GitHub (public) | Free |

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 7 |
| Approaches Explored | 3 |
| Features Removed (YAGNI) | 7 |
| Validations Completed | 2 |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_ENGLISH_TEACHING_PLATFORM.md`
