---
name: p05-vehicle-list
description: "Vehicle listing, filters, pagination and integration harness"
agent: agent
---

Prompt 5 — List vehicles, filtering, aging, pagination, integration harness (Phase 5)
Before you paste: the databases must be up ( docker compose up -d --wait ).
TASK
Implement GET /api/vehicles (filters, age filters, the aging filter,
pagination) end to end, and create the integration-test harness that runs
against the isolated test database.
CONTEXT
Read AGENTS.md and docs/design-brief.md first (business rules 1 to 5 and the
API section are the specification). Existing code you must reuse: createApp,
the error envelope, the validate helper, Clock, createPrismaClient, the
domain functions in inventory-age.ts and the schemas in vehicle.schemas.ts.
The test database runs as the db-test service on 127.0.0.1:5433 (database
inventory_test); TEST_DATABASE_URL is in .env.example.
TASKS
1. src/modules/vehicles/vehicle.repository.ts (Prisma only, parameterised
queries only, no business rules): findVehicles({ make?, model?,

dealershipId?, onOrBefore?, onOrAfter?, skip, take }) returns { items, total
}, using prisma.$transaction with findMany and count over the SAME where
clause. make and model use equals with mode insensitive. inventoryDate: lte
onOrBefore, gte onOrAfter. Include dealership { id, name }. orderBy
inventoryDate asc, then id asc. Define a small VehicleRepository interface so
the service can be unit-tested with a fake.
2. src/modules/vehicles/vehicle.mapper.ts: toVehicleDto(record, now)
returning exactly the Vehicle shape in the brief: inventoryDate as YYYY-MM-DD
(UTC), ageInDays and isAgingStock from the domain functions, actionUpdatedAt
as an ISO string or null, and no extra fields (no createdAt, updatedAt or
top-level dealershipId).
3. src/modules/vehicles/vehicle.service.ts: listVehicles(query) uses the
clock, resolveAgeRange and inventoryDateBounds. When resolveAgeRange returns
null it returns an empty page WITHOUT calling the repository. totalPages =
ceil(total / pageSize), and 0 when total is 0. Returns { data, meta } with
meta { page, pageSize, totalItems, totalPages, asOfDate, agingThresholdDays
}.
4. vehicle.controller.ts and vehicle.routes.ts: validate the query with
listVehiclesQuerySchema through the validate helper (never assign to
req.query), call the service, respond 200. Mount the router under /api in
createApp.
5. Integration-test harness:
- vitest.config.ts, integration project: env NODE_ENV test, LOG_LEVEL
silent, TZ from process.env.TEST_TZ (default UTC), DATABASE_URL from
TEST_DATABASE_URL (default
postgresql://inventory:inventory_dev_password@127.0.0.1:5433/inventory_test);
globalSetup tests/setup/global-setup.ts; files run serially.
- tests/helpers/assert-test-database.ts exporting assertTestDatabase(url),
which throws a clear error unless the database name in the URL ends with
_test. Unit-test it (dev URL rejected, test URL accepted, garbage rejected).
- tests/setup/global-setup.ts: call assertTestDatabase, then apply
migrations to that database by running npx prisma migrate deploy through
child_process.execSync with env DATABASE_URL set to the test URL (execSync,
not execFileSync: it must work on Windows).
- tests/helpers: fixedClock(iso); buildTestApp({ nowIso }) returning {
app, prisma, clock } with a silent logger; resetDatabase(prisma) (delete
vehicles, then dealerships); factories createDealership() and createVehicle({
ageInDays, make?, model?, dealershipId?, ... }, now) which compute
inventoryDate from the FIXED clock, never from the real date.
- Fixed test clock: 2026-10-29T12:00:00.000Z. beforeEach resets the
database; afterAll disconnects.
6. Tests.
Unit (fake repository): the bounds passed to the repository for aging
true, aging false, min only, max only and both; a null range returns an empty
page and never calls the repository; totalPages maths; DTO mapping for ages
0, 89, 90 and 91.

Integration (Supertest, real test database). Create vehicles aged 0, 45,
89, 90, 91, 92 and 400 days, then assert:
- default list: 200, { data, meta } shape, oldest first then id, asOfDate
2026-10-29, agingThresholdDays 90
- aging=true returns exactly the 91, 92 and 400 day vehicles; aging=false
returns the others; the 90-day vehicle has isAgingStock false
- minAgeDays=90 includes the 90-day vehicle; maxAgeDays=90 includes it;
minAgeDays=91 excludes it; minAgeDays=50 with maxAgeDays=100
- aging=true with maxAgeDays=50 returns 200, empty data and totalItems 0
- make=toyota (case-insensitive), model, make plus model, surrounding
spaces trimmed, dealershipId
- pagination with 25 vehicles and pageSize=10: pages 1 to 3 hold 10, 10
and 5 items with no overlap and stable order; page 4 is 200 with empty data;
totalItems and totalPages are right
- 400 VALIDATION_ERROR with details and a requestId for each of:
minAgeDays=abc, minAgeDays= (empty), minAgeDays=-1,
minAgeDays=10&maxAgeDays=5, page=0, pageSize=101, aging=yes, an unknown
parameter, a repeated parameter make=a&make=b, dealershipId=not-a-uuid
7. Keep every test independent and deterministic: no real time, no dependence
on the seed or on the development database.
CHECKS (run each and report the real result)
docker compose up -d --wait
npm run test:unit
npm run test:integration
npm run typecheck
npm run lint
npm run format:check
npm run build
Then, if you can run a background server: npm run db:seed, npm run dev, and
curl "http://127.0.0.1:3000/api/vehicles?aging=true" (Windows: curl.exe).
Otherwise give me the commands and mark them NOT VERIFIED.
EXPECTED RESULTS
All suites are green. Integration tests start from an empty migrated test
database. A database name that does not end in _test makes the global setup
throw before anything is touched. The manual call returns 6 aging vehicles on
the day the seed ran.
ACCEPTANCE CRITERIA
- Every list rule in brief rules 1 to 5 is covered by at least one test.
- SQL contains no NOW() or CURRENT_DATE; age filters are computed in
TypeScript from the injected clock.
- Integration tests never touch the development database.
- Every 400 uses the standard envelope.

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

Checkpoint 5 — verify before moving on
Run R4, then R13 (unit and integration), then R11.
Prove the development database was not touched by the tests: docker compose exec
db psql -U inventory -d inventory_dev -c "select count(*) from vehicles;"

must still say 14 after a full test run.
Prove the safety guard. macOS or Linux:
TEST_DATABASE_URL=postgresql://inventory:inventory_dev_password@127.0.0.1:
5432/inventory_dev npm run test:integration must refuse to run. Windows

PowerShell:
$env:TEST_DATABASE_URL="postgresql://inventory:inventory_dev_password@127.
0.0.1:5432/inventory_dev"; npm run test:integration; Remove-Item
Env:TEST_DATABASE_URL .

Search the repository for NOW() and CURRENT_DATE : there must be none in product
code.
Commit: git add -A && git commit -m "feat(api): list vehicles with
filters, aging and pagination; integration test harness" .

Log entry: which tests did you add or strengthen after reading the agent's work?
