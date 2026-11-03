---
name: p01-scaffold
description: "Scaffold TypeScript project, dependencies and tooling"
agent: agent
---

Prompt 1 — Scaffold, tooling and context files (Phase 2)

> **PDF extraction note:** Some terminal commands and identifiers in the original PDF were line-wrapped by page layout. Treat a line broken mid-command, URL, path or identifier as a soft wrap and reconstruct the complete command/value before running it. This package explicitly reflows the important P01 install commands and P02 Prisma schema. Prefer PowerShell syntax for Windows-only operations.

Before you paste: open Copilot Agent in the repository root after the starter pack and Git remote are configured.
You are a senior TypeScript backend engineer working in my Git repository.
TASK
Bootstrap the project for a technical assessment: the backend for Scenario B,
The Intelligent Inventory Dashboard. Create tooling and structure only. Write
NO application logic and NO database code in this task.
CONTEXT

The repository contains only the supplied starter pack, including .nvmrc (24), AGENTS.md, .github/copilot-instructions.md, .github/prompts/, docs/design-brief.md and .gitignore. There is no application code or database code yet. Node 24 and npm are installed. The project brief below is the source of truth for this task and
every later one. Save it verbatim as docs/design-brief.md.
=== PROJECT BRIEF (save verbatim as docs/design-brief.md) ===
# Design brief: keyloop-inventory-api
Backend for Scenario B, The Intelligent Inventory Dashboard (technical
assessment). A REST API over PostgreSQL for a dealership group's vehicle
inventory: list and filter vehicles, identify aging stock (strictly MORE than
90 days in inventory), and let a manager record a proposed action per
vehicle.
## Stack (pinned; do not change major versions)
- Node.js 24 LTS, ESM (package.json type: module), TypeScript 6
(typescript@6; NOT 7, because typescript-eslint cannot use TypeScript 7 yet).
- Express 5, Zod 4, Prisma ORM 7 (prisma@7, @prisma/client@7,
@prisma/adapter-pg@7, pg). NOT Prisma 8: it is a release candidate and a
plain npm install of prisma now fetches it.
- PostgreSQL 18 via Docker Compose. Vitest 4 + Supertest. pino, helmet,
dotenv, tsx.
- ESLint 10 (flat config) + typescript-eslint 8. Prettier 3, run separately
(do NOT add eslint-config-prettier).
## Architecture
Modular monolith: routes -> Zod validation -> controllers -> service ->
repository (Prisma) -> PostgreSQL. Pure domain functions hold the age rules.
Time comes from an injectable Clock. src/app.ts exports createApp(deps) and
never listens; src/server.ts is the composition root with graceful shutdown.
No microservices, queues, caching or authentication.
## Conventions
- Relative imports include the .ts extension. tsconfig: module and
moduleResolution NodeNext, rewriteRelativeImportExtensions true (so tsc emits
.js), strict true, target ES2023, types: ["node"] (TypeScript 6 defaults
types to empty).
- Prisma 7: prisma.config.ts imports dotenv/config and sets datasource.url
from process.env.DATABASE_URL. Do NOT use the env() helper: it throws when
the variable is missing, which breaks prisma generate on a clean clone.
Generator prisma-client, output ../src/generated/prisma, importFileExtension
ts. The client is created with new PrismaPg({ connectionString }).
src/generated is git-ignored; prisma generate runs in postinstall and in
build. Prisma 7 does not run generate or the seed automatically after a
migration.
- Express 5: req.query is read-only (never assign to it); req.body is
undefined when no JSON body was sent; async handlers may throw and the error

middleware handles it.
- Never log secrets, request bodies, Authorization or Cookie headers, or
DATABASE_URL. Never put stack traces in HTTP responses.
## Business rules
1. ageInDays = whole UTC calendar days from inventoryDate (SQL DATE) to
today's UTC date taken from the injected Clock. A negative result becomes 0.
2. isAgingStock = ageInDays > 90 (constant AGING_THRESHOLD_DAYS = 90). 90 is
false; 91 is true. It is derived, never stored.
3. List filters, combined with AND: make and model (trimmed, case-insensitive
exact match), dealershipId (UUID), aging (exactly true or false), minAgeDays
and maxAgeDays (inclusive integers 0 to 36500; min must be <= max, else 400).
aging=true means age >= 91; aging=false means age <= 90. The service turns
age filters into inventoryDate bounds computed from the Clock (no NOW() or
CURRENT_DATE in SQL): age >= N means inventoryDate <= today - N (skip when N
is 0); age <= M means inventoryDate >= today - M. Contradictory filters give
200 with empty data.
4. Pagination: page >= 1 (default 1); pageSize 1 to 100 (default 20). Order:
inventoryDate ascending, then id ascending. totalItems counts the filtered
set. A page past the end gives 200 with empty data.
5. Unknown query parameters give 400. Integer parameters must match /^\d+$/
(reject the empty string, spaces, 1e2). Do not use z.coerce.boolean (it turns
the string false into true).
6. Actions (enum ProposedAction): NONE, UNDER_REVIEW,
PRICE_REDUCTION_PLANNED, PROMOTION_PLANNED, TRANSFER_PLANNED,
WHOLESALE_PLANNED. Allowed on ANY vehicle. PATCH replaces the action state {
action, note? }: note is at most 500 characters; an omitted, null or blank
note clears it; actionUpdatedAt = Clock.now(). Unknown body fields give 400.
7. Unknown vehicle id gives 404 VEHICLE_NOT_FOUND. A malformed UUID gives
400.
## API
Endpoints: GET /api/vehicles, GET /api/vehicles/:id, PATCH
/api/vehicles/:id/action, GET /health.
Success body: { data, meta } (meta on the list only).
Vehicle fields: id, vin, make, model, year, colour, inventoryDate (YYYY-MMDD), ageInDays, isAgingStock, proposedAction, actionNote (string or null),
actionUpdatedAt (ISO string or null), dealership { id, name }.
List meta: page, pageSize, totalItems, totalPages, asOfDate (YYYY-MM-DD),
agingThresholdDays.
Health: 200 { status: ok, checks: { database: up }, uptimeSeconds, timestamp
} or 503 with status degraded and database down.
Error envelope: { error: { code, message, details?: [{ location:
query|params|body, path, message }], requestId } }.
Codes: VALIDATION_ERROR 400, INVALID_JSON 400, VEHICLE_NOT_FOUND 404,
ROUTE_NOT_FOUND 404, PAYLOAD_TOO_LARGE 413, SERVICE_UNAVAILABLE 503,

INTERNAL_ERROR 500.
## Data model
dealerships(id uuid PK, name varchar(100) unique, created_at timestamptz).
vehicles(id uuid PK, vin varchar(17) unique, make varchar(50), model
varchar(50), year smallint, colour varchar(30), inventory_date date,
proposed_action enum default NONE, action_note varchar(500) null,
action_updated_at timestamptz null, dealership_id uuid FK restrict,
created_at, updated_at). Indexes: inventory_date, dealership_id. There is no
is_aging column.
## Databases and tests
Dev database inventory_dev on 127.0.0.1:5432. Test database inventory_test on
127.0.0.1:5433 (separate container). Tests must refuse to run against any
database whose name does not end in _test. Use 127.0.0.1, not localhost, in
URLs. Unit tests do no I/O. Integration tests use Supertest, the real test
database and a fixed Clock (2026-10-29T12:00:00Z), and run serially (Vitest
4: fileParallelism false).
## npm scripts
dev, build, start, typecheck, lint, lint:fix, format, format:check, test,
test:unit, test:integration, test:coverage, db:generate, db:migrate,
db:deploy, db:seed, db:studio, openapi:lint, check (= format:check + lint +
typecheck + test + build).
=== END BRIEF ===
TASKS
1. Save the brief above verbatim as docs/design-brief.md.
2. Review the supplied root AGENTS.md. Keep it at 60 lines or fewer and merge in any missing project facts from this prompt. Do not remove or weaken its automated Git safety rules. Do not create CLAUDE.md because this workflow uses GitHub Copilot.
3. Create package.json: name keyloop-inventory-api, private true, type
module, engines.node >=22.13.0, and the scripts listed in the brief. Scripts
that need later work (db:*, openapi:lint, start) may point at files that do
not exist yet. Do NOT add a postinstall script yet (there is no Prisma schema
until the next task). For now the build script is tsc -p tsconfig.build.json.
4. Install dependencies with exactly these two commands, without substituting
versions:
```powershell
npm install express@5 zod@4 @prisma/client@7 @prisma/adapter-pg@7 pg pino helmet dotenv
npm install -D typescript@6 tsx vitest@4 supertest prisma@7 eslint@10 @eslint/js typescript-eslint@8 prettier@3 pino-pretty @redocly/cli @types/node@24 @types/express@5 @types/supertest @types/pg
npm ls typescript prisma @prisma/client @prisma/adapter-pg express zod vitest eslint
```


Confirm one TypeScript 6.x, Prisma and client 7.x, Express 5.x, Zod 4.x,
Vitest 4.x and ESLint 10.x. If anything resolves differently, or npm reports
ERESOLVE peer-dependency errors, STOP and report. Never use --force or -legacy-peer-deps.
5. tsconfig.json (editor and typecheck: include src, tests, prisma and the
root *.config.ts files; noEmit) and tsconfig.build.json (extends it; include
src only; outDir dist; rootDir src; exclude tests; sourceMap true; noEmit
false), following the Conventions in the brief.
6. eslint.config.mjs (flat config: @eslint/js recommended plus typescripteslint recommended; ignore dist, coverage, node_modules, src/generated).
.prettierrc.json with printWidth 100, trailingComma all, endOfLine lf.
.prettierignore listing dist, coverage, src/generated, prisma/migrations and
package-lock.json.
7. vitest.config.ts using Vitest 4 projects: a project named unit runs
tests/unit/**/*.test.ts; a project named integration runs
tests/integration/**/*.test.ts serially (fileParallelism false) and must not
fail while it has no tests. npm test runs both; test:unit and
test:integration run one each. Check the Vitest 4 documentation for the exact
option names (poolOptions no longer exists).
8. .gitignore (node_modules, dist, coverage, .env, .env.*.local, *.pem, *.key, *.log, .DS_Store,
src/generated); preserve all secret-protection patterns from the supplied starter .gitignore. .gitattributes containing: * text=auto eol=lf ;
.vscode/settings.json (format on save with Prettier, ESLint enabled) and
.vscode/extensions.json (recommend ESLint, Prettier, Prisma, Docker).
9. .env.example with exactly this content:
# Local development values only. Never reuse them anywhere else.
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
POSTGRES_USER=inventory
POSTGRES_PASSWORD=inventory_dev_password
POSTGRES_DB=inventory_dev
POSTGRES_PORT=5432
POSTGRES_TEST_PORT=5433
DATABASE_URL=postgresql://inventory:inventory_dev_password@127.0.0.1:5432/inventory_dev
TEST_DATABASE_URL=postgresql://inventory:inventory_dev_password@127.0.0.1:5433/inventory_test
10. Create src/, tests/unit/, tests/integration/ and docs/. Create README.md
containing a title and the words Work in progress. Add ONE temporary
placeholder test, tests/unit/tooling.test.ts, so the runner has something to
run; a later task deletes it.
Do not create any application code, Docker files or Prisma files.
CHECKS (run each and report the real result)

npm run typecheck
npm run lint
npm run format:check
npm test
npm ls typescript prisma @prisma/client @prisma/adapter-pg express zod vitest
eslint
npm audit

(report the summary only; do NOT run npm audit fix)

EXPECTED RESULTS
The first four commands exit with code 0 and the test run shows the
placeholder test passing. npm ls shows the pinned majors. npm audit output is
reported as it is.
ACCEPTANCE CRITERIA
- Pinned majors installed; no ERESOLVE overrides and no --force.
- Typecheck, lint, format check and test all pass.
- docs/design-brief.md matches the brief above word for word.
- AGENTS.md is 60 lines or fewer and contains the working agreement.
- .env is ignored by Git; .env.example holds only local dummy values.
- No application, Docker or Prisma code exists yet.
DEFINITION OF DONE
All acceptance criteria are met, results are reported honestly, and you have
listed every file you created.
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

Checkpoint 1 — verify before moving on
Run R1 and R2 yourself (Part 7.3), in your own terminal. Both must match the success
column.
Open AGENTS.md and docs/design-brief.md . Compare the pins and rules with Parts
3 and 5.4. If you changed an assumption in Phase 0, edit the brief now, because every
later prompt reads it.
git status must not list .env . Then commit: git add -A && git commit -m
"chore: scaffold TypeScript project and tooling" .

Log entry: note any version or peer-dependency problem the agent hit and how it was
resolved.
