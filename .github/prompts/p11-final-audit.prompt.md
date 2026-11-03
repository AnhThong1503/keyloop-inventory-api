---
name: p11-final-audit
description: "Final audit, clean-clone verification and submission tag"
agent: agent
---

Prompt 11 — Final audit and clean-room verification (Phase 11)
TASK
Perform a final audit and a clean-room verification of the project, then
report. Fix only trivial mismatches between the docs and the code (typos,
wrong command names). For anything else, report it and wait for my decision.
CONTEXT
Read AGENTS.md, README.md, docs/design-brief.md, docs/system-design.md,
docs/openapi.yaml and docs/testing.md. The project is believed complete and I
will submit the repository, so correctness, reproducibility and honesty
matter more than polish.
TASKS
1. Clean-room run. Outside this repository, clone it into a temporary folder
(First read the configured origin URL with `git remote get-url origin`, then run `git clone --branch feature/copilot-build <that-origin-url> ../keyloop-clean-check`.). Follow ONLY the
README in the clone: npm ci, create .env from .env.example, start the
databases, npm run db:deploy, npm run db:seed, npm run build, npm start, then
call /health, GET /api/vehicles?aging=true, a PATCH and the follow-up GET;
finally run npm run check. The working copy's containers and ports may clash

with the clone's: in the clone's .env set POSTGRES_PORT=5442 and
POSTGRES_TEST_PORT=5443 and update DATABASE_URL and TEST_DATABASE_URL to
match (this also proves the ports are configurable). If container names still
clash, run docker compose down (WITHOUT -v) in the working copy first, and
docker compose up -d --wait there afterwards. Record every command and its
result. When finished, run docker compose down (WITHOUT -v) inside the clone. Delete only the exact temporary clone folder that this task created; do not delete any Docker volume. Report the folder path and the Docker volume name so I can decide whether to remove the volume myself.
2. Requirement audit: give PASS, FAIL or NOT VERIFIED, with evidence (file
and line, or command and output), for each item:
- F1 to F7 and the strict 90-day rule (89 not aging, 90 not aging, 91
aging) in code, tests and docs
- aging is derived: no is_aging column or stored boolean anywhere
- validation on every input; one error envelope; no stack traces or driver
text in any response
- persistence of actions in PostgreSQL; migrations committed; seed
idempotent
- unit and integration tests pass; time-zone independence (run with
TEST_TZ=Pacific/Kiritimati); the test-database safety guard
- build and start from dist
- docs: README steps verified; OpenAPI lints; the SDD has every section;
the AI narrative contains no invented content (list every TODO(user) still
open)
3. Hygiene scan: git ls-files must not include .env, node_modules, dist or
src/generated; search the tracked files for secrets (password, secret, token,
key) and list anything other than the documented local dummy values; run npm
audit and summarise; list the direct dependencies and their majors, flag any
that look unused, and confirm that eslint-config-prettier and pino-http are
not installed.
4. Report discrepancies between code and docs (endpoints, parameters, status
codes, error codes, seed table, commands, version pins) and propose fixes.
Apply only trivial ones.
CHECKS (run each and report the real result)
npm run check
the clean-room commands from task 1
EXPECTED RESULTS
Everything passes, or every failure is listed together with its cause.
ACCEPTANCE CRITERIA
- The audit table is complete and every FAIL has a proposed fix.
- The clean-room run is documented command by command.
- No product code was changed without my approval.
DEFINITION OF DONE

All acceptance criteria met; results reported honestly.
WORKING AGREEMENT
- Inspect before editing: look at the file tree and git status, read
AGENTS.md, README.md and docs/design-brief.md when they exist, and read every
file before you change it.
- Make small, focused changes. Keep working code unless you explain why it
must change. Build nothing outside this task. Tests ship with the logic they
cover.
- Run the CHECKS above. Report each command exactly as you ran it, with its
real result (pass or fail, counts). Never say something passed unless you saw
it pass, and list anything you could not run or verify.
- Briefly explain notable design choices. If a decision would change the
architecture, or this prompt conflicts with the repository or the tooling,
stop and ask instead of guessing.
- No destructive commands (prisma migrate reset, docker compose down -v, git
reset or clean, rm -rf) and no extra dependencies unless this task names them
or I approve. Do not stop for a manual commit. After every required checkpoint passes, follow the automated Git workflow in the root AGENTS.md: create exactly one checkpoint commit and push only to origin/feature/copilot-build.
REPORT BACK
1) Files created or changed. 2) Every command you ran, with its result. 3)
Design decisions and any deviation from this prompt. 4) What you could NOT
verify, and any blockers. 5) A suggested commit message.

Checkpoint 11 — verify before moving on
Read the audit table. Reproduce at least three of the PASS claims yourself with the
commands the agent cites.
Decide each FAIL: fix it, or document it as a known limitation.
Run R16 ( npm run check ) yourself.
Make the final commit, then tag it: git tag -a v1.0.0 -m "Assessment
submission" .
Package it: push to your Git host, or create an archive of tracked files only with git
archive --format=zip -o keyloop-inventory-api.zip HEAD .
Work through the Part 12 checklist.


## Copilot-specific Git handoff
The final tag must be created only after all final checks pass. Push the tag to origin, but never push to main. Do not merge the pull request; report the compare URL or give the exact GitHub command for creating it.
