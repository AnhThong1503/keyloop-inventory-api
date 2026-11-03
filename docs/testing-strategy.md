# Testing strategy — assessment reference

This file preserves Part 10 of the supplied plan as a reference. P03–P08 implement and verify the detailed cases; P08 generates the project-facing `docs/testing.md`.

## Unit tests versus integration tests

| | Unit tests | Integration tests |
|---|---|---|
| Scope | Pure function, schema, service with fake repository, error mapper | Express + Supertest + validation + service + repository + real PostgreSQL test database |
| I/O | No database, network or real clock | Real database and HTTP stack with a fixed clock |
| Proves | Rules and boundaries | SQL, migrations, persistence, status codes and error contract |
| Location | `tests/unit/` | `tests/integration/` |

Both are required: unit tests prove the 90-day rule; integration tests prove database date bounds and PATCH persistence.

## Required unit coverage

- Ages 0, 45, 89, 90, 91, 92, 120, 365 and 400 days. Exactly 90 is not aging; 91 is aging.
- UTC rollover: same vehicle is 90 days at `23:59:59.999Z` and 91 at `00:00:00.000Z` the next UTC day.
- Month-end, year-end and leap-day cases.
- All action values accepted; wrong case, empty, number, null, missing and unknown action rejected.
- Age filter combinations, contradictory ranges, and inclusive date bounds.
- Fake repository argument assertions; empty ranges should not reach repository.
- Every error mapping row.

Boundary table (fixed `now = 2026-10-29T12:00:00Z`):

| inventoryDate | ageInDays | isAgingStock |
|---|---:|---|
| 2026-10-29 | 0 | false |
| 2026-08-01 | 89 | false |
| 2026-07-31 | 90 | false |
| 2026-07-30 | 91 | true |
| 2026-07-01 | 120 | true |

## Required API integration coverage

- List returns `{ data, meta }`, all vehicle fields typed correctly, and `asOfDate` equals the fixed clock.
- Make/model filters are trimmed, case-insensitive and combined.
- `minAgeDays` / `maxAgeDays` are inclusive at 90 and 91.
- `aging=true` returns only 91+ day vehicles; `aging=false` returns 0–90 day vehicles.
- Pagination: 25 vehicles with page size 10 produce 10, 10 and 5 without overlap; page 4 is empty.
- Detail returns 200 for existing ID, 404 for valid unknown UUID and 400 for malformed ID.
- PATCH is read back directly from PostgreSQL and via later GET; PATCH survives server restart.
- Invalid requests return the common envelope and request ID.
- Database connectivity failures return 503; errors do not leak driver text.

## Isolation and deterministic time

- Use separate Docker `db-test` container at `127.0.0.1:5433`, database `inventory_test`.
- Integration setup must refuse any `TEST_DATABASE_URL` whose database name does not end in `_test`.
- Global setup applies committed migrations to the test database only. Never use development DB for integration tests.
- Reset rows before each test; use factories; run integration test files serially. The test container uses tmpfs.
- Unit tests do no I/O. Tests use fixed clock `2026-10-29T12:00:00.000Z`; do not use real time, sleeps or fake timers. SQL must not use `NOW()` or `CURRENT_DATE`.
- Run the full suite under `TEST_TZ=Pacific/Kiritimati` and `TEST_TZ=Pacific/Pago_Pago`; also run it three times consecutively.
- Check development vehicle count before and after integration tests; it must remain unchanged (14 after seed).

## Mutation experiments

| Mutation | Tests that must fail |
|---|---|
| `>` becomes `>=` in `isAgingStock` | Unit 90-day cases and integration `aging=true` case |
| Reverse default sort order | Default-order and pagination integration tests |
| Remove case-insensitive matching from make filter | Case-insensitive make integration test |
| PATCH preserves old note when note omitted | Replace-semantics integration test |
| Change inclusive minimum bound from `lte` to `lt` | `minAgeDays=90` integration test |

## What not to test

Do not test Express, Prisma or Zod themselves. Avoid whole-response snapshots, assertions on log text and tests that only prove a function exists. Assert observable behavior: status, response fields and database state.

## Quality gates

`npm run check` runs format check, lint, typecheck, tests and build. Coverage thresholds of 90% lines and branches apply to domain code and vehicle service; coverage is a smoke alarm, not a goal. The suite must be green three consecutive times and in both extreme time zones.
