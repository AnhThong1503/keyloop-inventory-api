---
name: p09-openapi
description: "OpenAPI contract and runnable API examples"
agent: agent
---

Prompt 9 — OpenAPI contract and runnable examples (Phase 10, part 1)
TASK
Write the API contract and runnable examples so that a reviewer can try the
API without a frontend. Documentation only: do not change product code. If
you find a real bug, stop and report it first.
CONTEXT

Read AGENTS.md and docs/design-brief.md first. All endpoints are implemented.
The contract must describe the behaviour the code and tests actually have:
read src/modules/vehicles/vehicle.schemas.ts, the controllers, the mapper and
the integration tests to confirm, and do not invent behaviour.
TASKS
1. docs/openapi.yaml, OpenAPI 3.1.0. info: title, version 1.0.0 and a
description that states the aging rule (strictly more than 90 days). servers:
http://127.0.0.1:3000. tags: Vehicles and Health. Paths: GET /api/vehicles
(every query parameter with type, default, minimum and maximum, and the age
semantics), GET /api/vehicles/{id}, PATCH /api/vehicles/{id}/action, GET
/health. Components: Vehicle, VehicleListResponse, VehicleResponse,
UpdateActionRequest, ProposedAction (6 values), ListMeta, ErrorEnvelope (with
the error codes), HealthResponse and reusable parameters. Document every
status from the brief (200, 400, 404, 413, 500, 503) with realistic examples.
Use the seeded vehicles and fixed ids for the examples, with dates consistent
with asOfDate 2026-10-29.
2. Make npm run openapi:lint run the Redocly CLI lint on docs/openapi.yaml.
Run it, fix every error and explain any warning you leave.
3. docs/api-examples.md. For each of the 4 endpoints, and for two error cases
(a validation 400 and a not-found 404), give (a) a cURL example for macOS and
Linux (bash), (b) the Windows PowerShell equivalent using curl.exe or InvokeRestMethod, and (c) the real response captured from the running server after
npm run db:seed. Add a demo script of 8 to 10 calls (list; aging only; make
filter; the 89, 90 and 91 day boundary vehicles; PATCH; GET again to show
persistence; 404; 400; health), saying what to point out in each response.
Where you could not run a call, write NOT VERIFIED instead of inventing
output.
4. State in the document that dates and ages in responses depend on the day
the seed was run.
CHECKS (run each and report the real result)
npm run openapi:lint
docker compose up -d --wait
npm run db:seed
npm run dev
call
npm run format:check

(in the background if you can) and run each documented

EXPECTED RESULTS
The lint exits 0. Every captured response is real output from the running
server.
ACCEPTANCE CRITERIA
- The ProposedAction values in the YAML equal the Prisma enum.
- No endpoint, parameter, status code or error code appears in the YAML that

the code lacks, and none is missing.
- Every example in the YAML validates against the schemas you wrote.
- No product code changed.
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

Checkpoint 9 — verify before moving on
Run npm run openapi:lint yourself.
Import docs/openapi.yaml into Bruno or Postman (or paste it into
https://editor.swagger.io) and send the list call. This is your "mocked frontend" for the
video.
Spot-check three real responses against the schemas. Compare the ProposedAction
enum in the YAML with prisma/schema.prisma .
Run two documented calls in your own terminal (R11 and R12).
Commit: git add -A && git commit -m "docs: OpenAPI contract and API
examples" .
