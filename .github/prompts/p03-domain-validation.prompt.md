---
name: p03-domain-validation
description: "Inventory age domain rules, Zod schemas and unit tests"
agent: agent
---

Prompt 3 — Domain rules, request schemas and unit tests (Phase 4)
TASK
Implement the inventory-age business rules and all request schemas as pure,
fully unit-tested code. No Express and no database in this task.
CONTEXT
Read AGENTS.md and docs/design-brief.md first (business rules 1 to 6 are the
specification). Prisma enums are generated in src/generated/prisma
(enums.ts). The 90-day rule is the heart of the assessment: age 90 is NOT
aging; age 91 IS aging.
TASKS
1. src/shared/clock.ts: interface Clock { now(): Date } and export const
systemClock: Clock.
2. src/modules/vehicles/domain/inventory-age.ts: pure functions, no I/O, no
Date.now(), no argument-less new Date().
AGING_THRESHOLD_DAYS = 90
toUtcDayNumber(date: Date): number
// Math.floor(date.getTime() /
86400000)
dateFromUtcDayNumber(day: number): Date
// the UTC-midnight Date for
that day number
calculateAgeInDays(inventoryDate: Date, now: Date): number
// max(0,
toUtcDayNumber(now) - toUtcDayNumber(inventoryDate))
isAgingStock(ageInDays: number): boolean
// ageInDays >
AGING_THRESHOLD_DAYS
resolveAgeRange(filters: { aging?: boolean; minAgeDays?: number;
maxAgeDays?: number }): { min: number; max: number | null } | null
// aging true raises min to at least 91; aging false caps max at 90;
returns null when the resulting range is empty (min > max)
inventoryDateBounds(range: { min: number; max: number | null }, now:
Date): { onOrBefore: Date | null; onOrAfter: Date | null }
// today = toUtcDayNumber(now)
// onOrBefore = min > 0 ? dateFromUtcDayNumber(today - min) : null
// onOrAfter = max !== null ? dateFromUtcDayNumber(today - max) :
null
3. src/modules/vehicles/vehicle.schemas.ts with Zod 4:
- listVehiclesQuerySchema: z.strictObject. make and model: trimmed strings
of 1 to 50 characters. dealershipId: z.uuid(). aging: exactly the strings
true or false (z.enum, then transform to a boolean; NOT z.coerce.boolean).
minAgeDays and maxAgeDays: strings matching /^\d+$/, transformed to numbers
and checked to be within 0 to 36500 (do NOT use z.coerce.number: it accepts
the empty string and 1e2). page: integer >= 1, default 1. pageSize: integer 1
to 100, default 20 (same strict digit parsing). A refinement: minAgeDays <=
maxAgeDays when both are present.
- vehicleIdParamSchema: { id: z.uuid() }.

- updateActionBodySchema: z.strictObject { action: z.enum over the
generated ProposedAction values (single source of truth), note: optional
string, trimmed, at most 500 characters, null allowed; a blank note becomes
null }.
- Export the inferred input types.
- Write error messages a client can act on, for example: must be a whole
number between 0 and 36500.
4. Delete tests/unit/tooling.test.ts.
5. Unit tests in tests/unit, table-driven where it helps. Use a fixed now of
2026-10-29T12:00:00.000Z and never the real clock.
- calculateAgeInDays and isAgingStock: inventoryDate 2026-10-29 gives 0;
2026-08-01 gives 89 (not aging); 2026-07-31 gives 90 (NOT aging); 2026-07-30
gives 91 (aging); 2026-07-01 gives 120; a date after now gives 0.
- UTC rollover: with inventoryDate 2026-07-31, now 2026-10-29T23:59:59.999Z gives 90 and now 2026-10-30T00:00:00.000Z gives 91.
- Calendar edges: across a month end, across a year end, and a leap day
(now 2028-03-01 with inventoryDate 2028-02-29 gives 1).
- resolveAgeRange: no filters; aging true; aging false; aging true with
minAgeDays 100; aging true with maxAgeDays 50 (null); min 10 with max 5
(null); explicit ranges.
- inventoryDateBounds: min 0 gives onOrBefore null; min 91 gives 2026-0730; max 90 gives onOrAfter 2026-07-31; both present.
- Schemas: defaults; trimming; each of the six action values accepted;
invalid action; missing action; a note of 501 characters; blank note becomes
null; unknown body key; unknown query key; page 0; pageSize 101; minAgeDays
as the empty string, abc, -1, 1e2 and 36501; aging=yes; min greater than max;
invalid UUID; a repeated query parameter (array value) rejected.
Aim for at least 40 test cases. Test observable behaviour, not that
functions exist.
6. Mutation check, and report it: temporarily change the comparison in
isAgingStock from > to >=, run npm run test:unit, show which tests fail, then
restore it and show the suite green again.
CHECKS (run each and report the real result)
npm run test:unit
npm run typecheck
npm run lint
npm run format:check
EXPECTED RESULTS
All four pass. The mutation step shows failing boundary tests (the 90-day
cases) before you restore the code.
ACCEPTANCE CRITERIA
- No I/O and no real time in domain code or tests.
- The 89/90/91 boundary and the UTC rollover are asserted directly.

- Each query-parameter rule in brief rules 3 to 5 has a passing case and a
failing case.
- The mutation check was run and reported honestly.
- Nothing outside this task changed.
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

Checkpoint 3 — verify before moving on
Run npm run test:unit : at least 40 tests pass.
Commit first: git add -A && git commit -m "feat(domain): inventory age
rules, request schemas and unit tests" .
Then do the mutation check yourself. In src/modules/vehicles/domain/inventoryage.ts change > to >= inside isAgingStock , run npm run test:unit , and confirm
at least two tests fail and one names the 90-day case. Revert with git restore
src/modules/vehicles/domain/inventory-age.ts and confirm the suite is green

again.
Read the domain file once. It should be short, import nothing but types, and never call
Date.now() .

Log entry: record the mutation result. It is excellent video material.
