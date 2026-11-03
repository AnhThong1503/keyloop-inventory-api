# Command reference R1–R16 (Windows PowerShell)

The source plan refers to these commands by IDs throughout the checkpoints. Run from the repository root. Use a separate terminal for long-running `npm run dev` / `npm start` processes.

| Ref | After | Command | Expected evidence |
|---|---|---|---|
| R1 | P01 | `npm run typecheck`; `npm run lint`; `npm run format:check`; `npm test` | All exit 0; placeholder test passes. |
| R2 | P01 | `npm ls typescript prisma @prisma/client @prisma/adapter-pg express zod vitest eslint` | TS 6, Prisma/client/adapter 7, Express 5, Zod 4, Vitest 4, ESLint 10. |
| R3 | P02 | `Copy-Item .env.example .env` | `.env` exists locally and is ignored by Git. |
| R4 | P02 | `docker compose up -d --wait`; `docker compose ps` | `inventory-db` and `inventory-db-test` healthy. |
| R5 | P02 | `docker compose exec db pg_isready -U inventory -d inventory_dev` | Accepting connections. |
| R6 | P02 | `npm run db:deploy`; `npx prisma migrate status` | Migrations applied; schema up to date. |
| R7 | P02 | `npm run db:seed` (run twice) | 14 vehicles seeded both times; 2 dealerships. |
| R8 | P02 | `docker compose exec db psql -U inventory -d inventory_dev -c "select count(*) from vehicles;"` | Count is 14. |
| R9 | P04 | `npm run dev` | Server listens on port 3000 with a JSON startup log. |
| R10 | P04 | `curl.exe http://127.0.0.1:3000/health` | HTTP 200; database up. |
| R11 | P05 | `curl.exe -s "http://127.0.0.1:3000/api/vehicles?aging=true"` | On seed day, 6 aging vehicles. Relative dates mean reseed and inspect `asOfDate` if the seed was run on another day. |
| R12 | P07 | PATCH the seeded vehicle, then GET `/api/vehicles/b0000000-0000-4000-8000-000000000009` | GET returns the saved action. Use the PowerShell request below. |
| R13 | P03 onward | `npm run test:unit`; from P05 onward also `npm run test:integration`; `npm test` | All green; integration tests require R4. |
| R14 | P08 | `npm run test:coverage` | Coverage thresholds met. |
| R15 | P04 onward | `npm run build`; then `npm start` | `dist/server.js` starts. Run start in its own terminal. |
| R16 | P11 | `npm run check` | Format, lint, typecheck, tests and build pass. |

## PowerShell PATCH example (R12)

```powershell
$body = @{ action = "PRICE_REDUCTION_PLANNED"; note = "Reduce asking price by 5% from Monday" } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "http://127.0.0.1:3000/api/vehicles/b0000000-0000-4000-8000-000000000009/action" -ContentType "application/json" -Body $body
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/vehicles/b0000000-0000-4000-8000-000000000009"
```

## Useful checks

```powershell
# Inspect ignored local environment file
git check-ignore .env

# Confirm .env is not tracked
git ls-files .env

# Confirm development database still has its 14 seed rows after integration tests
docker compose exec db psql -U inventory -d inventory_dev -c "select count(*) from vehicles;"
```
