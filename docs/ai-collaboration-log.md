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
