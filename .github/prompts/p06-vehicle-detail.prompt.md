---
name: p06-vehicle-detail
description: "Vehicle detail endpoint"
agent: agent
---

Prompt 6 — Vehicle detail (Phase 6)
TASK
Implement GET /api/vehicles/:id.
CONTEXT
Read AGENTS.md and docs/design-brief.md first (business rule 7 and the API
section). The list endpoint, repository, service, mapper, controller, router,
error envelope and the integration-test harness already exist. Follow their
patterns; do not refactor them.
TASKS
1. Repository: findVehicleById(id) including dealership { id, name }; extend
the VehicleRepository interface and the fake used by the unit tests.
2. Service: getVehicle(id) returns the DTO, or throws NotFoundError with code
VEHICLE_NOT_FOUND and the message Vehicle <id> was not found.
3. Controller and route: GET /api/vehicles/:id; validate the id with
vehicleIdParamSchema through the validate helper; respond 200 { data: vehicle
}.
4. Tests.
Unit: the service returns the DTO with the right ageInDays and
isAgingStock for ages 89, 90 and 91; it throws NotFoundError when the
repository returns null.
Integration: 200 for an existing vehicle with every field in the brief
(dealership { id, name }; actionNote and actionUpdatedAt null by default);
the 90-day vehicle shows isAgingStock false and the 91-day vehicle true; 404
VEHICLE_NOT_FOUND with a requestId for a well-formed unknown UUID; 400
VALIDATION_ERROR for the id abc; no response contains a stack trace or Prisma
text; the object returned by the detail endpoint equals the matching item
returned by the list endpoint.
CHECKS (run each and report the real result)
docker compose up -d --wait
npm run test:unit
npm run test:integration
npm run typecheck
npm run lint
npm run format:check
EXPECTED RESULTS
All pass.
ACCEPTANCE CRITERIA
- 200, 404 and 400 behave exactly as specified, with the standard error
envelope.
- Earlier code was extended, not refactored.

- Nothing outside this task changed.
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

Checkpoint 6 — verify before moving on
Run R13. Then, with npm run dev running, make three calls: a seeded id such as
b0000000-0000-4000-8000-000000000008 (200, and on seed day ageInDays 90 with
isAgingStock false), the unknown id 9f1c2b7e-3d4a-4b6c-8e5f-1a2b3c4d5e6f (404

with VEHICLE_NOT_FOUND ), and the text abc (400 VALIDATION_ERROR ).
Skim the diff: the earlier list code must be unchanged apart from the shared interface.
Commit: git add -A && git commit -m "feat(api): get vehicle by id" .
