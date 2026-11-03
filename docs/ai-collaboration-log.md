# AI Collaboration Log

## 2026-11-03 — P01

- The user selected literal asterisk placeholders for the database URLs in `.env.example` after I noted that they differ from the PostgreSQL URL format in the design brief.
- Both dependency installation commands completed without ERESOLVE errors.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (1 test passed), and `npm run test:integration` (empty project exited 0) passed. The initial typecheck exposed that Vitest only permits `passWithNoTests` at the root config; moving it fixed typecheck. The initial formatting check also included supplied reference files, so they were excluded from Prettier rather than reformatted.
- `npm ls` confirmed TypeScript 6.0.3, Prisma/client/adapter 7.10.1, Express 5.3.0, Zod 4.6.7, Vitest 4.1.12, and ESLint 10.14.0.
- `npm audit` exited 1 and reported 11 moderate `minimatch`-related findings. No audit fix was run.

## 2026-11-03 — P02

- Verified `.env` and `.env.example` in memory without displaying their values. Both database URLs target the required local development/test databases; `.env` is ignored and untracked. Docker Desktop responded as Docker Desktop 29.9.2.
- Added PostgreSQL 18 Compose services; the development volume is mounted at `/var/lib/postgresql`, and the test service uses tmpfs. Prisma 7 loads `dotenv/config` and reads `process.env.DATABASE_URL` directly, without `env()`. These choices matched the brief without prompting.
- `docker compose config`, both-service startup and health checks, development `pg_isready`, Prisma validation, migration deployment/status, and client generation passed. The initial migration contains the mapped enum, both tables, unique VIN index, dealership foreign key, inventory-date and dealership indexes, and year/VIN-length CHECK constraints; no aging flag is stored.
- Two `npm run db:seed` runs each printed all 14 vehicles and `Seeded 2 dealerships and 14 vehicles.` The database count is 14; `\\d vehicles` confirmed the two CHECK constraints, foreign key and indexes.
- `npm ci` passed with Prisma client generation after removing only repository-root `node_modules`. A second clean install passed with Docker services stopped and dotenv pointed at a nonexistent file, proving install/generation does not require `.env` or database connectivity; both services were then restored healthy.
- Final `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm test` passed (1 placeholder test). npm reported 11 moderate dependency audit findings during clean install; no audit fix was run.

## 2026-11-03 — P03

- Added the injectable `Clock`, pure UTC calendar-day and aging-range functions, and strict Zod query, UUID parameter, and action-body schemas. Unit tests use fixed dates and cover age boundaries, UTC rollover, calendar edges, filter ranges, schema rejection cases, and all generated `ProposedAction` values.
- `npm run test:unit` passed with 78 tests; `npm run typecheck`, `npm run lint`, and `npm run format:check` passed.
- Mutation check: changing `isAgingStock` from `>` to `>=` caused 2 failures and 76 passes. The failing tests were the table-driven 90-day inventory case and the explicit 90/91 boundary case. After restoring `>`, all 78 unit tests passed again.
- Ran the mutation before the checkpoint commit so the required gate was verified before recording the checkpoint.

## 2026-11-03 — P04

- Implemented validated configuration, Pino logging, request IDs and request logging, shared errors and validation, health checks, the Express app factory, and the server composition root. The closed-port Prisma experiment against `127.0.0.1:1` produced a `PrismaClientKnownRequestError` with code `P2010`, `meta.driverAdapterError`, and `cause.kind === "DatabaseNotReachable"`; the error handler maps that observed shape to 503 and leaves other P2010 errors as 500.
- `npm run test:unit` passed with 115 tests; `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build` passed. The build created `dist/server.js`; `git grep -n DATABASE_URL -- src` found no matches.
- Earlier runtime checks served `/health` with database-up status, returned the not-found envelope for an unknown route and `INVALID_JSON` for malformed JSON, returned 503 within 96 ms after stopping only the development database, and returned 200 after database recovery.
- A production `npm start` run returned 200 from `/health` with database up. A synthetic in-process `process.emit("SIGINT")` exercised the shutdown handler and logged `shutdown started`, `http server closed`, and `database disconnected`, exiting 0.
- The user then ran `npm start` in an interactive PowerShell terminal and confirmed the real Ctrl+C path logged `shutdown started` with `SIGINT`, `http server closed`, and `database disconnected`. This completes the required shutdown verification.

## 2026-11-03 — P05

- Added the Prisma vehicle-list repository, DTO mapper, clock-based service, controller and routes mounted at `/api/vehicles`. Unit tests cover age-bound conversion, contradictory ranges without repository calls, pagination totals, and DTO ages 0, 89, 90 and 91. Added integration coverage for list ordering and shape, filters, aging boundaries, inclusive age bounds, pagination, and all required query-validation failures.
- Added an integration test database URL guard, serial Vitest integration project, test-only migration setup, fixed-clock app/database helpers, and deterministic dealership/vehicle factories. Ran the guard with `TEST_DATABASE_URL` pointed at `inventory_dev`; integration setup rejected it before invoking migrations. The normal integration setup applied migrations only to `inventory_test` on `127.0.0.1:5433`.
- `docker compose up -d --wait` and subsequent `docker compose ps` showed both databases healthy. `npm run test:unit` passed (131 tests), `npm run test:integration` passed (16 tests), and `npm test` passed (147 tests). `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build` passed; `dist/server.js` exists.
- After the full test run, `docker compose exec db psql -U inventory -d inventory_dev -c "select count(*) from vehicles;"` returned 14. `rg` found no `NOW()` or `CURRENT_DATE` in `src`.
- For R11, `npm run db:seed` completed with 14 vehicles; `npm run dev` served `curl.exe -sS -i "http://127.0.0.1:3000/api/vehicles?aging=true"` with HTTP 200, `totalItems: 6`, and `asOfDate: "2026-11-03"`. The test server was stopped and port 3000 is no longer listening.

## 2026-11-03 — P06

- Extended the repository with `findVehicleById` including dealership id and name, added `getVehicle` with the `VEHICLE_NOT_FOUND` error, and added the validated detail controller and route. The existing list logic remains unchanged.
- Unit tests cover DTOs for ages 89, 90 and 91 and a missing repository record. Integration tests cover the complete detail shape, the strict aging boundary, list/detail DTO equality, 404/400 envelopes and request IDs, and absence of Prisma/stack text.
- `docker compose up -d --wait` passed. `npm run test:unit` passed (135 tests), `npm run test:integration` passed (21 tests), and `npm test` passed (156 tests). `npm run typecheck`, `npm run lint`, and `npm run format:check` passed.
- With `npm run dev`, the seeded ID `b0000000-0000-4000-8000-000000000008` returned 200 with age 90 and `isAgingStock: false`; the specified unknown UUID returned 404 `VEHICLE_NOT_FOUND`; `abc` returned 400 `VALIDATION_ERROR`. The server was stopped after the checks.

## 2026-11-03 — P07

- Extended the repository, service, controller, and router for action updates. Unit tests cover omitted/null/blank note normalization, the injected action timestamp, non-aging vehicles, and the not-found path. Integration tests cover all six actions, replacement and clear semantics, PATCH/GET/list and direct Prisma persistence, fixed timestamps, non-aging and aging vehicles, idempotency, every requested validation failure, unknown/malformed IDs, malformed JSON, and unchanged database state after rejection.
- The first unit run had 4 failures because the fake update returned a default-age fixture. I corrected the fake to preserve the existing record; the final unit run passed (141 tests). `npm run test:integration` passed (43 tests), `npm test` passed (184 tests), and `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build` passed.
- For the live persistence check, the checkpoint's example UUID has malformed grouping; `prisma/seed.ts` establishes the correct seeded ID as `b0000000-0000-4000-8000-000000000009`, which was used. The first hand-written `curl.exe` command was quoted incorrectly by PowerShell and returned `INVALID_JSON`; the PATCH was retried using `Invoke-RestMethod` and returned 200. GET returned the saved action; direct `psql` showed the saved enum, note, and timestamp. After stopping and restarting `npm run dev`, GET still returned the saved action. Invalid action and unknown-field requests returned 400 `VALIDATION_ERROR`; an unknown UUID returned 404 `VEHICLE_NOT_FOUND`.
- `npm run db:seed` restored the development demo data after manual verification; it reported 14 vehicles.
