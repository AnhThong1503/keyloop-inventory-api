# Testing

## Run the suites

From the repository root:

| Purpose           | macOS/Linux                | Windows PowerShell         |
| ----------------- | -------------------------- | -------------------------- |
| Unit tests        | `npm run test:unit`        | `npm run test:unit`        |
| Integration tests | `npm run test:integration` | `npm run test:integration` |
| Both projects     | `npm test`                 | `npm test`                 |
| Targeted coverage | `npm run test:coverage`    | `npm run test:coverage`    |

The coverage command uses Vitest's V8 provider and enforces at least 90% line
and branch coverage for every included file in
`src/modules/vehicles/domain/` and `src/modules/vehicles/vehicle.service.ts`.
The coverage report is written to `coverage/`, which is generated output and
is not committed.

## Time-zone runs

The unit and integration Vitest projects use `TEST_TZ`, defaulting to UTC.
Run the complete suite in both requested zones:

macOS/Linux:

```sh
TEST_TZ=Pacific/Kiritimati npm test
TEST_TZ=Pacific/Pago_Pago npm test
```

Windows PowerShell:

```powershell
$env:TEST_TZ = "Pacific/Kiritimati"
npm test
$env:TEST_TZ = "Pacific/Pago_Pago"
npm test
Remove-Item Env:TEST_TZ
```

## Integration database isolation

Integration tests run against the `db-test` Compose service at
`127.0.0.1:5433`, using `inventory_test` by default. Set `TEST_DATABASE_URL` to
override that URL; the global setup rejects URLs unless their PostgreSQL
database name ends in `_test`. It applies committed migrations to the selected
test database, and the integration Vitest project sets `DATABASE_URL` to that
same test URL. Integration files run serially and each test resets vehicle
and dealership rows before exercising the vehicle API. The health failure
test does not access test-database rows. Unit tests use fake repositories and
do not connect to a database.

The development database is `inventory_dev` on port 5432 and is not used by
either project. The integration database guard is covered by
`tests/unit/assert-test-database.test.ts` (`rejects a development database URL`,
`accepts a test database URL`, and `rejects garbage without including the URL
in the error`).

## Deterministic time and state

Unit tests pass explicit UTC dates to the domain functions and use an injected
fixed clock for service and app behavior. Integration helpers use
`2026-10-29T12:00:00.000Z` and derive fixture inventory dates from that clock.
Test code contains no sleeps or explicit real-time timers. The production
health route retains its own timeout; the health failure test uses a real
Prisma client aimed at the closed local port `127.0.0.1:1`. Vehicle API
integration data is reset before each test, while unit test repositories and
loggers are created per test.

## Traceability

| Requirement                                                   | Test file                                                                                                                  | Test name(s)                                                                                                                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1: list response, DTO fields, default order, metadata        | `tests/integration/vehicle-list.test.ts`                                                                                   | `returns the default shape ordered oldest first, then by id`                                                                                                                                                                               |
| F2: make/model/dealership filters and inclusive age filters   | `tests/integration/vehicle-list.test.ts`                                                                                   | `filters by case-insensitive make and model and dealership`; `applies inclusive minimum and maximum age filters`; `applies aging true and false with a strict 90-day boundary`                                                             |
| F3: 89/90/91 boundaries and UTC rollover                      | `tests/unit/inventory-age.test.ts`                                                                                         | `calculates %s as %i days and aging=%s`; `uses the UTC date at rollover %s`; `treats 90 days as not aging and 91 days as aging`                                                                                                            |
| F4: aging is derived, not stored                              | `tests/unit/vehicle.service.test.ts`; `prisma/schema.prisma`                                                               | `derives age and aging status from the inventory date on each read`; the Prisma `Vehicle` model has no aging field                                                                                                                         |
| F5-F7: action persistence and later reads                     | `tests/integration/vehicle-action.test.ts`                                                                                 | `persists the action and returns it from PATCH, GET, list, and Prisma`; `replaces the action and clears the note when omitted; NONE clears the plan`                                                                                       |
| List and action validation failures                           | `tests/integration/vehicle-list.test.ts`; `tests/integration/vehicle-action.test.ts`; `tests/unit/vehicle-schemas.test.ts` | `returns the standard validation envelope when %s`; `returns VALIDATION_ERROR for %s`; `returns VALIDATION_ERROR when no body is sent`; schema tests `rejects ...` cover field-level invalid values and unknown/repeated fields            |
| Detail ID validation and 404                                  | `tests/integration/vehicle-detail.test.ts`; `tests/integration/vehicle-action.test.ts`                                     | `returns VEHICLE_NOT_FOUND with a request id for an unknown UUID`; `returns VALIDATION_ERROR with a request id for an invalid id`; `returns VEHICLE_NOT_FOUND for a well-formed unknown id`; `returns VALIDATION_ERROR for a malformed id` |
| Common error envelope and non-disclosure                      | `tests/unit/error-handler.test.ts`; `tests/unit/app.test.ts`                                                               | `maps %s`; `uses a generic 500 message and logs only server-side stack data`; `returns a generic error envelope for repository failures on list, detail, and PATCH`                                                                        |
| Health success and unavailable database                       | `tests/unit/app.test.ts`; `tests/integration/health-failure.test.ts`                                                       | `returns a healthy database status using the injected clock`; `returns degraded status when the database query rejects`; `returns 503 when Prisma cannot connect to the closed port`                                                       |
| Repository/service failure does not expose the original error | `tests/unit/app.test.ts`                                                                                                   | `returns a generic error envelope for repository failures on list, detail, and PATCH`                                                                                                                                                      |

## P08 mutation experiments

Each listed mutation was applied temporarily, the targeted test was run, and
the production code was restored before the next experiment. All five
mutations caused the expected test failure:

| Temporary mutation                                              | Test(s) that failed                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Change `isAgingStock` from `>` to `>=`                          | `tests/unit/inventory-age.test.ts`: `calculates 2026-07-31 as 90 days and aging=false`; `treats 90 days as not aging and 91 days as aging`                                                                                                                                                    |
| Reverse the repository sort order                               | `tests/integration/vehicle-list.test.ts`: `returns the default shape ordered oldest first, then by id`; `applies aging true and false with a strict 90-day boundary`; `applies inclusive minimum and maximum age filters`; `paginates without overlap and returns an empty page past the end` |
| Remove case-insensitive matching from the make filter           | `tests/integration/vehicle-list.test.ts`: `filters by case-insensitive make and model and dealership`                                                                                                                                                                                         |
| Preserve the old PATCH note when the new note is omitted        | `tests/integration/vehicle-action.test.ts`: `replaces the action and clears the note when omitted; NONE clears the plan`                                                                                                                                                                      |
| Change the inclusive `onOrBefore` comparison from `lte` to `lt` | `tests/integration/vehicle-list.test.ts`: `applies inclusive minimum and maximum age filters`                                                                                                                                                                                                 |
