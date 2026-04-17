# Tests

Two harnesses:

- **Vitest** — unit + integration tests. Run with `npm test`.
- **Playwright** — e2e tests that drive a real browser against a local `next dev`. Run with `npm run test:e2e`.

## Unit tests

Location: `tests/unit/**`. No external services required.

```bash
npm test
```

## Integration tests

Location: `tests/integration/**`. These tests hit a real Supabase instance using the service-role key to seed and tear down fixtures. They auto-skip if `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing.

To run locally:

1. Start a local Supabase stack (`supabase start`) or point at a dev project.
2. Apply all migrations (`supabase db push`).
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` or the shell.
4. `npm test`.

## E2E tests

Location: `tests/e2e/**`. Run against a live `next dev` at `E2E_BASE_URL` (default `http://localhost:3000`). Require existing test accounts — set:

```bash
E2E_TEACHER_EMAIL=
E2E_TEACHER_PASSWORD=
E2E_STUDENT_EMAIL=
E2E_STUDENT_PASSWORD=
```

Playwright's `webServer` config auto-starts `npm run dev` unless `CI` is set.

Tests auto-skip when credentials are missing, so the Vitest + Playwright suite is safe to run in a fresh checkout.

## Avatar fixture

The avatar upload e2e expects a small PNG at `tests/e2e/.fixtures/avatar.png`. Create one with any 100×100 image (kept out of git to avoid bloating the repo).
