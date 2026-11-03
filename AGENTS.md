# Keyloop Inventory API — Agent Instructions

You are implementing the Keyloop Scenario B backend. Follow the source plan in `docs/design-brief.md` and run prompts P01–P11 in order from `.github/prompts/`.

## Source of truth
- Preserve the scope, A1–A15 assumptions, API contract, data model and acceptance criteria in the supplied plan.
- Human setup and workflow references live in `docs/ai-workflow/`; implementation prompts remain in `.github/prompts/`.
- Stack majors are fixed: Node 24, TypeScript 6, Express 5, Prisma 7, PostgreSQL 18, Zod 4, Vitest 4, ESLint 10, Prettier 3.
- Read `docs/design-brief.md` before implementation. Do not add a frontend, authentication, queues, caching, Kubernetes or out-of-scope features.
- Use UTC calendar-day arithmetic and an injected clock. Aging is `ageInDays > 90`, never persisted.

## Execution and quality gates
- Execute one numbered prompt at a time and in order. Read the entire prompt and inspect the repo before editing.
- A checkpoint is complete only when every required check has actually run and passed, or every unavailable check is explicitly `NOT VERIFIED` with a reason.
- Never invent test output, command results, AI collaboration history or user decisions.
- Add a factual row to `docs/ai-collaboration-log.md` after each prompt when that file exists. Mark human-only decisions as `TODO(user)`.
- If a required prerequisite is missing (Windows reboot, GitHub sign-in, `.env`, Docker Desktop running), stop and give the exact human action. Do not pretend it happened.

## Automated Git policy
- Work only on `feature/copilot-build`; verify the current branch and `origin` before every push.
- After each successful checkpoint, make exactly one Conventional Commit using the message specified by that checkpoint, then push only `HEAD` to `origin/feature/copilot-build`.
- Never push to `main`, force-push, amend a published commit, delete a branch or rewrite published history. Never merge a PR.
- Before committing: run `git status`, `git diff --check`, inspect the full staged diff, and verify no secret or forbidden path is staged. Commit only project files relevant to the completed checkpoint.
- Never commit `.env`, `.env.*.local`, credentials, tokens, private keys, `node_modules/`, `dist/`, `coverage/` or `src/generated/`. `package-lock.json`, migrations and documentation must be committed.
- Do not put real credentials into `.env.example`, prompts, logs or terminal output. Never print or log `DATABASE_URL`, passwords, authorization headers or request bodies.
- Do not use `--force`, `--legacy-peer-deps`, force-push, or destructive Git commands.

## Destructive-action boundary
- Never run `prisma migrate reset`, `docker compose down -v`, `git reset --hard`, `git clean`, or broad recursive deletion.
- The P02 clean-install check may remove only this repository's `node_modules` directory, and only when the current directory is verified as the repository root.
- P11 may remove only the exact temporary clone directory it created after its clean-room checks; never remove Docker volumes. Use `docker compose down` without `-v`.
- Ask before any other destructive action, production operation, secret handling, architecture change or extra dependency.

## Completion report
For every prompt, report files changed, exact checks and results, unresolved issues, commit SHA and push result. Stop if a quality gate fails; fix it before continuing.
