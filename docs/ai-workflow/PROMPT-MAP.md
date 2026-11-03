# Prompt map

| Prompt | Work | Primary gate |
|---|---|---|
| P01 | Scaffold, versions, tooling, instructions | typecheck, lint, format, tests, dependency majors |
| P02 | Docker PostgreSQL 18, Prisma 7, migration, seed | both DBs healthy; migration status; seed twice; 14 rows |
| P03 | UTC inventory-age domain, Zod schemas | 40+ unit tests; mutation test proves 90-day boundary |
| P04 | Env, logger, errors, request IDs, health, shutdown | unit tests, build, `/health`, 400/404/413/503 paths |
| P05 | Vehicle list/filter/pagination and integration harness | integration suite; six aging rows on seed day; DB guard |
| P06 | Vehicle detail | 200 known ID, 404 unknown UUID, 400 malformed ID |
| P07 | PATCH proposed action and persistence | PATCH then GET; inspect database row and restart server |
| P08 | Test isolation, time zones, coverage and docs | repeat suites; two non-UTC TZ runs; mutation experiment |
| P09 | OpenAPI 3.1 and runnable cURL examples | OpenAPI lint and real response spot checks |
| P10 | README, SDD, AI-collaboration scaffolding | README commands and Mermaid docs verified; personal TODOs retained |
| P11 | Final audit and clean clone | clean clone, `npm run check`, audit table and v1.0.0 tag |

The deliberately non-numeric phase order in the source plan is preserved: P04 (cross-cutting app foundation) comes before P05–P07 (features).
