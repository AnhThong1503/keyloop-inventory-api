# Master orchestration prompt — run the Keyloop backend plan

Paste this entire prompt into **GitHub Copilot Chat in Agent mode** after the starter pack has been copied into the repository, the remote is configured, and the current branch is `feature/copilot-build`.


You are the implementation orchestrator for this repository.

Read the root AGENTS.md, .github/copilot-instructions.md, docs/design-brief.md, docs/command-reference.md, docs/testing-strategy.md and docs/final-assessment-checklist.md first. Then inspect git status, the current branch and origin remote.

Your job is to execute the source plan sequentially using these prompt files, in this exact order:
1. .github/prompts/p01-scaffold.prompt.md
2. .github/prompts/p02-database.prompt.md
3. .github/prompts/p03-domain-validation.prompt.md
4. .github/prompts/p04-app-foundation.prompt.md
5. .github/prompts/p05-vehicle-list.prompt.md
6. .github/prompts/p06-vehicle-detail.prompt.md
7. .github/prompts/p07-action-update.prompt.md
8. .github/prompts/p08-test-hardening.prompt.md
9. .github/prompts/p09-openapi.prompt.md
10. .github/prompts/p10-readme-sdd.prompt.md
11. .github/prompts/p11-final-audit.prompt.md

For each prompt:
- Read that prompt file completely. Do not load or execute later prompts early.
- Follow the task, checks, expected results, acceptance criteria and checkpoint in that file.
- The root AGENTS.md overrides the old source-plan sentence “Do not commit; I will”: after the checkpoint succeeds, create exactly one checkpoint commit and push only to origin/feature/copilot-build.
- Do not advance if a mandatory check fails. Diagnose, fix within scope, rerun the failed checks, then proceed only when the gate passes.
- Record factual evidence in docs/ai-collaboration-log.md after each prompt. Never invent what the human did or decided.
- Report the checkpoint result, commit SHA and push result before beginning the next prompt.

Human prerequisites are hard stops, not assumptions:
- Before P02, verify that .env exists and Docker Desktop is running. If .env is missing, stop and tell me to copy it from .env.example using PowerShell: Copy-Item .env.example .env. Never create or commit .env yourself.
- If Windows requests a reboot, GitHub sign-in, a permission approval, or a choice that only I can make, stop and state the exact action needed.
- If Git push is denied, do not change permissions or credentials; report the exact error and pause.

Baseline decisions: use the A1–A15 assumptions exactly as supplied in the plan unless I explicitly change them. Do not invent additional scope. The Node, TypeScript, Express, Prisma, PostgreSQL, Zod, Vitest and ESLint major pins are mandatory.

Git safety: only feature/copilot-build may be pushed. Never push or merge main, never force-push, never amend published commits, never stage .env or generated/build artifacts, and never run destructive commands prohibited by AGENTS.md. Inspect staged changes before committing. Use one commit per completed checkpoint and no empty commits.

Prompt P11 is the final audit. Follow its clean-clone test, but delete only the temporary clone directory you created and never delete Docker volumes. Create and push the v1.0.0 annotated tag only after all final checks pass. Do not merge the pull request; leave that to me.

If you reach the VS Code agent request limit or lose session context, stop cleanly with the last completed prompt, its evidence, branch, commit SHA and next required action. Do not restart from P01. I will resume you with RESUME-PROMPT.md.

At the end, give me: overall PASS/FAIL/NOT VERIFIED table, repository branch and URL, commit history, tag status, all test/build/audit results, unresolved TODO(user) items, and the exact steps I still must do for the AI narrative, pull request merge and video.
