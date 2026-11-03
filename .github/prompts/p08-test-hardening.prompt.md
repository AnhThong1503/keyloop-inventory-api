---
name: p08-test-hardening
description: "Test hardening, isolation and test documentation"
agent: agent
---

Prompt 8 — Test hardening and documentation of the tests (Phase 9)
TASK
Harden the test suite: show that it is deterministic, isolated and
meaningful, document what it verifies, and close any gaps. Do not add product
features.
CONTEXT
Read AGENTS.md and docs/design-brief.md first. All endpoints exist with unit
and integration tests. Goals: no flakiness; no dependence on real time, on
the development database or on the machine's time zone; tests that fail when
a business rule is broken.
TASKS
1. Audit the existing tests against this requirement list and add what is
missing: F1 list; F2 make, model and age filters; F3 strictly more than 90
days (89, 90, 91, UTC rollover); F4 age is derived (the schema has no aging
column and the DTO is computed on read); F5 to F7 an update persists and is
returned on later reads; validation errors for every invalid input class; 404
behaviour; one consistent error envelope; health 200 and 503.
2. Failure-path tests: (a) /health returns 503 when the database is
unreachable, using an app whose Prisma client points at a closed port, with
no mocking of Prisma internals; (b) list, detail and PATCH return the
standard envelope with the status your error mapping defines (503 or 500),
with no stack trace and no driver text, when the repository throws; (c) the
body of any 500 never contains the original error message.
3. Time-zone independence: apply TEST_TZ (default UTC) to the unit project as
well as the integration project. Run the whole suite under
TEST_TZ=Pacific/Kiritimati (UTC+14) and under TEST_TZ=Pacific/Pago_Pago (UTC11) and report both. If a test fails in one zone, fix the product or test
code that used local time.
4. Isolation: show that tests never touch inventory_dev: the row count in the
development database is identical before and after a full test run.
5. Flakiness: run the full suite three times in a row and report. There must
be no sleeps, no real timers and no shared mutable state between tests.
6. Coverage: add npm run test:coverage (Vitest 4, v8 provider). You may add
@vitest/coverage-v8 at the same major version as Vitest. Thresholds: 90
percent lines and branches for src/modules/vehicles/domain and for
src/modules/vehicles/vehicle.service.ts. Do not add trivial tests just to
reach the numbers; report any untested branch you chose to leave.

7. Create docs/testing.md: how to run unit, integration and coverage
(macOS/Linux and Windows PowerShell variants, including the TEST_TZ commands
for both); how the isolated test database works; how time is made
deterministic; and a traceability table (requirement, test file, test name).
Describe only what the tests actually do.
8. Mutation experiments (temporary; revert each and report): change > to >=
in isAgingStock; reverse the sort order in the repository; remove mode
insensitive from the make filter; make PATCH keep the old note when the new
one is omitted; change lte to lt in the onOrBefore filter. For each, say
which tests failed. If a mutation leaves the suite green, add or strengthen a
test and repeat.
CHECKS (run each and report the real result)
docker compose exec db psql -U inventory -d inventory_dev -c "select count(*)
from vehicles;"
(before and after the runs below)
npm run test:unit
npm run test:integration
npm test
(three times in a row)
npm run test:coverage
TEST_TZ=Pacific/Kiritimati npm test
(macOS and Linux; run it again with
Pacific/Pago_Pago)
Windows PowerShell: $env:TEST_TZ="Pacific/Kiritimati"; npm test
with Pacific/Pago_Pago, then Remove-Item Env:TEST_TZ)
npm run typecheck
npm run lint
npm run format:check

(repeat

EXPECTED RESULTS
Green in every time zone and across three consecutive runs. The development
database count is unchanged. Coverage thresholds are met. Each mutation turns
at least one test red (after any strengthening).
ACCEPTANCE CRITERIA
- docs/testing.md exists and every statement in it is true of the suite.
- Failure-path tests exist for database-down and for repository-throws.
- No test depends on real time, the development database or the local time
zone.
- Every mutation experiment is reported together with the tests that failed.
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

Checkpoint 8 — verify before moving on
Run R13 and R14 yourself, then the two time-zone runs. macOS or Linux:
TEST_TZ=Pacific/Kiritimati npm test and TEST_TZ=Pacific/Pago_Pago npm
test . Windows PowerShell: $env:TEST_TZ="Pacific/Kiritimati"; npm test;
$env:TEST_TZ="Pacific/Pago_Pago"; npm test; Remove-Item Env:TEST_TZ .

Run the suite three times in a row ( for i in 1 2 3; do npm test || break; done in
bash, or 1..3 | ForEach-Object { npm test } in PowerShell). All runs must be
green.
Confirm select count(*) from vehicles; in the development database is still what
it was before the tests.
Read docs/testing.md critically: is every claim true? Delete or fix any that is not.
Perform one mutation yourself (for example > to >= ) and watch the tests fail. It is a
strong moment for the video.
Commit: git add -A && git commit -m "test: harden suite, time-zone
independence, coverage and testing docs" .
