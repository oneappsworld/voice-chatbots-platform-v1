# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

- **Vitest** (`vitest.config.mts`) — unit/integration tests for pure logic, primarily the `lib/` layer (NLU, escalation, lead qualification, appointment slots, dashboard metrics).
- **Testing Library** (`@testing-library/react`) — component tests when needed; not yet used, but configured and ready.
- **Playwright** (`playwright.config.ts`) — end-to-end browser tests against a real running app.

## Running tests

```bash
npm test          # run the Vitest suite once
npm run test:watch # Vitest in watch mode
npm run test:e2e  # Playwright e2e tests (starts the dev server automatically)
```

CI runs `npm run lint`, `npx tsc --noEmit`, and `npm test` on every push/PR to `main` (`.github/workflows/test.yml`).

## Test layers

- **Unit tests** (`lib/*.test.ts`) — pure functions with no I/O: NLU intent classification, escalation trigger detection, lead scoring, appointment slot generation, dashboard metric aggregation. These are the cheapest, fastest tests and where business-logic bugs actually live in this codebase (see history: word-boundary matching bugs, budget-bucket substring bugs).
- **Integration tests** — not yet written; would cover Server Actions (`app/*/actions.ts`) against a real or mocked Supabase client.
- **E2E tests** (`e2e/*.spec.ts`) — real browser flows against a running dev server via Playwright.
- **Smoke tests** — the `/qa` and `/design-review` gstack skills cover this today via live browser verification (`browse`) against real Supabase data; not yet codified as automated tests.

## Conventions

- Test files live next to the code they test: `lib/foo.ts` → `lib/foo.test.ts`.
- Use `describe`/`it`, not `test()`.
- Assert real behavior and values, never `expect(x).toBeDefined()`.
- When a bug is found (by hand or by `/qa`), add a regression test with a comment explaining what broke and why, not just what the correct value is.
