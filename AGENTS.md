<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing

- 100% test coverage is the goal — tests make vibe coding safe, not just aspirational polish.
- Run tests: `npm test` (Vitest, see `TESTING.md`). E2E: `npm run test:e2e` (Playwright).
- When writing new pure logic (especially in `lib/`), write a corresponding test.
- When fixing a bug, write a regression test that encodes the exact broken condition — not just the correct output.
- When adding error handling, write a test that triggers the error.
- When adding a conditional (if/else, switch), write tests for both paths.
- Never commit code that makes existing tests fail.
