# Start here — Keyloop Scenario B + GitHub Copilot

This starter pack turns the supplied Claude plan into a sequential Copilot workflow. It does not build the application by itself: you first prepare Windows, GitHub and Docker, then run the master prompt in Copilot Agent.

## What you will build

A backend-only modular monolith: Node.js 24, TypeScript 6, Express 5, PostgreSQL 18, Prisma 7, Zod 4, Vitest 4 + Supertest, Docker Compose and an OpenAPI 3.1 contract. No frontend is in the assessment scope. Vehicle aging is derived using the strict `ageInDays > 90` rule; exactly 90 days is not aging.

## Time estimate

The source PDF estimates 11 prompts at 30–60 minutes each, or 5.5–11 hours for prompt work and verification. For a completely clean Windows machine, allow approximately **2–4 hours for installation and GitHub setup**, **6–11 hours for implementation/checkpoints**, and **2–4 hours for final review, documentation and video**. A practical estimate is **12–18 focused hours (roughly 2–3 working days)**. This is a planning estimate, not a measured Copilot completion time. Docker/WSL problems, Copilot usage limits or failed tests can extend it.

## Your steps

1. Follow `WINDOWS-SETUP.md` from top to bottom. It installs WSL 2, VS Code, Git, GitHub CLI, Docker Desktop and Node 24, then authenticates GitHub.
2. Create an empty **private** GitHub repository named `keyloop-inventory-api` (no README, license or `.gitignore`).
3. Initialize the local folder on `main`, copy this starter pack into the root (including hidden `.github` files), make one baseline commit for the starter files, and push `main`. Then create `feature/copilot-build`, exactly as shown in `WINDOWS-SETUP.md`. This makes a valid PR target while keeping all agent implementation commits off `main`.
4. Open the repository in VS Code and sign in to GitHub Copilot. Select **Agent**. Paste the complete contents of `MASTER-PROMPT.md` into Copilot Chat.
5. Let Copilot complete P01. It will create `package.json` and `.env.example`, run checks, create the first checkpoint commit and push it to `feature/copilot-build`. Read the report and inspect the changes.
6. Before P02, create your local environment file with `Copy-Item .env.example .env`. Make sure Docker Desktop says the engine is running. Tell Copilot to resume the master workflow.
7. Let Copilot proceed through P02–P11. It must stop on failed quality gates and on human-only prerequisites. At every checkpoint, look at the test results, changed files, commit SHA and push result.
8. At the end, use `docs/final-assessment-checklist.md` to review the audit report, fill the personal `TODO(user)` sections in the AI Collaboration Narrative using your real experience, create/review the Pull Request, merge it yourself, and record the 5–10 minute demo video.

## What you must do yourself

| When | Your responsibility |
|---|---|
| Before P01 | Install software, enable WSL/virtualization, sign in to GitHub/Copilot, set Git identity, create empty remote, copy starter pack, push one baseline commit to `main`, and create `feature/copilot-build` |
| Before P02 | Create `.env` from `.env.example`; start Docker Desktop and verify its engine is running |
| During execution | Approve commands only when you understand them; read checkpoint reports; resolve sign-in/reboot prompts; never paste real secrets into chat |
| After P08/P10 | Personally review the test claims and documentation; complete your AI log/narrative with facts and decisions only you know |
| P11 / submission | Review clean-clone audit; merge PR yourself; make sure tag/repo are visible as required; record and upload the video |

## Automated Git behavior

The agent is instructed to create one Conventional Commit after each successful checkpoint and push it only to `origin/feature/copilot-build`. It must never push `main`, force-push, amend published commits or merge the PR. It must never commit `.env`, credentials, `node_modules`, `dist`, coverage or generated Prisma client. The workflow pauses if a check fails or GitHub denies the push.

## Do not switch on global full auto-approval

Keep VS Code's approval controls enabled at first. Autopilot/Allow All can approve destructive terminal commands and external tool calls, so they are not necessary for this workflow. The prompt and Git policy provide automation, while you retain control over system-level, destructive and network operations.

## Resume after an agent limit

Paste `RESUME-PROMPT.md` into the same Copilot workspace/session. The agent must inspect the log and Git history, find the last completed checkpoint and continue without repeating it.

## Acceptance criteria that matter most

- The 89/90/91-day boundary is correct and tested; aging is never stored in PostgreSQL.
- List filters are AND-combined; pagination is deterministic; invalid inputs use the common error envelope.
- PATCH action persists in PostgreSQL and survives a server restart.
- Unit and integration tests use a separate test database; the safety guard rejects any database not ending in `_test`.
- `npm run check` passes; clean clone follows README; OpenAPI and SDD match the implementation.
- `git status` is clean; every checkpoint has one commit; `.env` and generated/build output are not tracked.

