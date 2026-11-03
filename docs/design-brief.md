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
