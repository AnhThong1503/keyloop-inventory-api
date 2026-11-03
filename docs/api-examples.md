# API examples

Start the local databases, reseed the development database, and run the API
from the repository root:

```powershell
docker compose up -d --wait
npm run db:seed
npm run dev
```

The captured responses below came from a live server after seeding on
`2026-11-03` (UTC). The seed uses the current UTC day as its reference, so
`inventoryDate`, `ageInDays`, `asOfDate`, and seeded action timestamps depend on
the day and time the seed was run. The OpenAPI examples use the fixed reference
date `2026-10-29`; they are contract examples, not the live captures below.

All commands use the local server at `http://127.0.0.1:3000`. The valid seeded
boundary IDs are `b0000000-0000-4000-8000-000000000007` (89 days),
`b0000000-0000-4000-8000-000000000008` (90 days), and
`b0000000-0000-4000-8000-000000000009` (91 days).

## GET /api/vehicles

### macOS/Linux (bash)

```sh
curl -sS -H 'x-request-id: docs-list' \
  'http://127.0.0.1:3000/api/vehicles?pageSize=2' \
  -w '\nHTTP %{http_code}\n'
```

### Windows PowerShell

```powershell
curl.exe -sS -H "x-request-id: docs-list" `
  "http://127.0.0.1:3000/api/vehicles?pageSize=2" `
  -w "`nHTTP %{http_code}`n"
```

### Captured response

```text
{"data":[{"id":"b0000000-0000-4000-8000-000000000014","vin":"KLP2026A000000014","make":"BMW","model":"X1","year":2021,"colour":"Blue","inventoryDate":"2025-11-03","ageInDays":365,"isAgingStock":true,"proposedAction":"TRANSFER_PLANNED","actionNote":null,"actionUpdatedAt":"2026-11-03T07:27:14.246Z","dealership":{"id":"a0000000-0000-4000-8000-000000000001","name":"Downtown Motors"}},{"id":"b0000000-0000-4000-8000-000000000013","vin":"KLP2026A000000013","make":"Volkswagen","model":"Tiguan","year":2020,"colour":"Grey","inventoryDate":"2026-04-07","ageInDays":210,"isAgingStock":true,"proposedAction":"WHOLESALE_PLANNED","actionNote":null,"actionUpdatedAt":"2026-11-03T07:27:14.246Z","dealership":{"id":"a0000000-0000-4000-8000-000000000002","name":"Riverside Auto Group"}}],"meta":{"page":1,"pageSize":2,"totalItems":14,"totalPages":7,"asOfDate":"2026-11-03","agingThresholdDays":90}}
HTTP 200
```

For the seed-only aging request (R11), run:

```sh
curl -sS 'http://127.0.0.1:3000/api/vehicles?aging=true'
```

```powershell
curl.exe -sS "http://127.0.0.1:3000/api/vehicles?aging=true"
```

The captured response returned `HTTP 200`, `totalItems: 6`, and
`asOfDate: "2026-11-03"`. Its ages were 365, 210, 150, 120, 92, and 91 days;
the 90-day vehicle was not included. A separate live `make=Toyota` request
returned three Toyota vehicles with `totalItems: 3` and `HTTP 200`.

## GET /api/vehicles/{id}

### macOS/Linux (bash)

```sh
curl -sS -H 'x-request-id: docs-detail' \
  'http://127.0.0.1:3000/api/vehicles/b0000000-0000-4000-8000-000000000009' \
  -w '\nHTTP %{http_code}\n'
```

### Windows PowerShell

```powershell
curl.exe -sS -H "x-request-id: docs-detail" `
  "http://127.0.0.1:3000/api/vehicles/b0000000-0000-4000-8000-000000000009" `
  -w "`nHTTP %{http_code}`n"
```

### Captured response

```text
{"data":{"id":"b0000000-0000-4000-8000-000000000009","vin":"KLP2026A000000009","make":"Honda","model":"CR-V","year":2022,"colour":"Silver","inventoryDate":"2026-08-04","ageInDays":91,"isAgingStock":true,"proposedAction":"PRICE_REDUCTION_PLANNED","actionNote":"Reduce asking price by 5% from Monday","actionUpdatedAt":"2026-11-03T07:31:15.342Z","dealership":{"id":"a0000000-0000-4000-8000-000000000001","name":"Downtown Motors"}}}
HTTP 200
```

## PATCH /api/vehicles/{id}/action

### macOS/Linux (bash)

```sh
curl -sS -X PATCH \
  'http://127.0.0.1:3000/api/vehicles/b0000000-0000-4000-8000-000000000009/action' \
  -H 'content-type: application/json' \
  -H 'x-request-id: docs-patch' \
  --data-raw '{"action":"PRICE_REDUCTION_PLANNED","note":"Reduce asking price by 5% from Monday"}' \
  -w '\nHTTP %{http_code}\n'
```

### Windows PowerShell

```powershell
$body = @{
  action = "PRICE_REDUCTION_PLANNED"
  note = "Reduce asking price by 5% from Monday"
} | ConvertTo-Json
$response = Invoke-WebRequest -Method Patch `
  -Uri "http://127.0.0.1:3000/api/vehicles/b0000000-0000-4000-8000-000000000009/action" `
  -ContentType "application/json" `
  -Headers @{ "x-request-id" = "docs-patch-capture" } `
  -Body $body
"HTTP $($response.StatusCode)"
$response.Content
```

### Captured response

```text
HTTP 200
{"data":{"id":"b0000000-0000-4000-8000-000000000009","vin":"KLP2026A000000009","make":"Honda","model":"CR-V","year":2022,"colour":"Silver","inventoryDate":"2026-08-04","ageInDays":91,"isAgingStock":true,"proposedAction":"PRICE_REDUCTION_PLANNED","actionNote":"Reduce asking price by 5% from Monday","actionUpdatedAt":"2026-11-03T07:31:15.342Z","dealership":{"id":"a0000000-0000-4000-8000-000000000001","name":"Downtown Motors"}}}
```

## GET /health

### macOS/Linux (bash)

```sh
curl -sS -H 'x-request-id: docs-health' \
  'http://127.0.0.1:3000/health' \
  -w '\nHTTP %{http_code}\n'
```

### Windows PowerShell

```powershell
curl.exe -sS -H "x-request-id: docs-health" `
  "http://127.0.0.1:3000/health" `
  -w "`nHTTP %{http_code}`n"
```

### Captured response

```text
{"status":"ok","checks":{"database":"up"},"uptimeSeconds":72.765567,"timestamp":"2026-11-03T07:28:36.643Z"}
HTTP 200
```

## Error examples

### Validation error (400)

#### macOS/Linux (bash)

```sh
curl -sS -H 'x-request-id: docs-validation' \
  'http://127.0.0.1:3000/api/vehicles?minAgeDays=abc' \
  -w '\nHTTP %{http_code}\n'
```

#### Windows PowerShell

```powershell
curl.exe -sS -H "x-request-id: docs-validation" `
  "http://127.0.0.1:3000/api/vehicles?minAgeDays=abc" `
  -w "`nHTTP %{http_code}`n"
```

#### Captured response

```text
{"error":{"code":"VALIDATION_ERROR","message":"Request validation failed","details":[{"location":"query","path":"minAgeDays","message":"must be a whole number between 0 and 36500"}],"requestId":"docs-validation"}}
HTTP 400
```

### Vehicle not found (404)

#### macOS/Linux (bash)

```sh
curl -sS -H 'x-request-id: docs-not-found' \
  'http://127.0.0.1:3000/api/vehicles/9f1c2b7e-3d4a-4b6c-8e5f-1a2b3c4d5e6f' \
  -w '\nHTTP %{http_code}\n'
```

#### Windows PowerShell

```powershell
curl.exe -sS -H "x-request-id: docs-not-found" `
  "http://127.0.0.1:3000/api/vehicles/9f1c2b7e-3d4a-4b6c-8e5f-1a2b3c4d5e6f" `
  -w "`nHTTP %{http_code}`n"
```

#### Captured response

```text
{"error":{"code":"VEHICLE_NOT_FOUND","message":"Vehicle 9f1c2b7e-3d4a-4b6c-8e5f-1a2b3c4d5e6f was not found.","requestId":"docs-not-found"}}
HTTP 404
```

## Nine-call demo sequence

Run the calls in order. The age-bound query returns the 89-, 90-, and 91-day
vehicles in one response, keeping the sequence to nine calls while showing
each boundary. Point out the listed behavior after each call:

1. `GET /api/vehicles?pageSize=2` — show oldest-first order, page metadata,
   total item count, and the `asOfDate`.
2. `GET /api/vehicles?aging=true` — show six results and that 90 days is not
   aging while 91 days is.
3. `GET /api/vehicles?make=Toyota` — show the exact make filter and three
   matching vehicles.
4. `GET /api/vehicles?minAgeDays=89&maxAgeDays=91&pageSize=10` — show ages
   91, 90, and 89 together and the strict aging flag.
5. `PATCH /api/vehicles/b0000000-0000-4000-8000-000000000009/action` — show
   the replacement action, note, and server-generated timestamp.
6. `GET /api/vehicles/b0000000-0000-4000-8000-000000000009` — show the same
   action and note persisted on a later read.
7. `GET /api/vehicles/9f1c2b7e-3d4a-4b6c-8e5f-1a2b3c4d5e6f` — show the 404
   error envelope and request ID.
8. `GET /api/vehicles?minAgeDays=abc` — show the 400 validation details and
   request ID.
9. `GET /health` — show `status: ok` and `database: up`.

The endpoint and error sections above provide bash and PowerShell commands for
the list, detail, PATCH, health, validation, and 404 requests. For calls 2–4,
replace the URL in the list command with the query shown in the sequence.
