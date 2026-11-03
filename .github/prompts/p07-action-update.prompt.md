---
name: p07-action-update
description: "Action update endpoint and persistence"
agent: agent
---

Prompt 7 — Update the proposed action and persist it (Phase 7)
TASK
Implement PATCH /api/vehicles/:id/action and prove that the change is
persisted in PostgreSQL.
CONTEXT
Read AGENTS.md and docs/design-brief.md first (business rules 6 and 7 and the
API section). updateActionBodySchema and vehicleIdParamSchema already exist.

The list and detail endpoints, the integration harness and the error handling
exist; follow their patterns and do not refactor them.
TASKS
1. Repository: updateVehicleAction(id, { proposedAction, actionNote,
actionUpdatedAt }) using prisma update; return the updated record including
dealership { id, name }. A Prisma P2025 (record not found) must surface so
that the error handler turns it into 404 VEHICLE_NOT_FOUND.
2. Service: updateVehicleAction(id, body) checks existence first
(NotFoundError with code VEHICLE_NOT_FOUND), then updates with
actionUpdatedAt = clock.now(). The stored note is null when the body note is
omitted, null or blank. Returns the DTO. There is NO restriction to aging
vehicles.
3. Controller and route: PATCH /api/vehicles/:id/action; validate the id and
the body (strict: unknown fields give 400; an undefined body gives 400)
through the validate helper; respond 200 { data: vehicle }.
4. Tests.
Unit (fake repository and fixed clock): note normalisation;
actionUpdatedAt equals the clock; the NotFoundError path; no aging
restriction.
Integration (real test database):
- PATCH, then GET /api/vehicles/:id returns the saved action, note and
actionUpdatedAt (equal to the fixed clock time)
- a test reads the row straight from the database through the Prisma
client and checks proposedAction, actionNote and actionUpdatedAt
- the list endpoint shows the updated action too
- replace semantics: a second PATCH without a note clears the earlier
note; action NONE clears the plan
- each of the six action values is accepted
- it works for a 45-day (non-aging) vehicle and for a 91-day vehicle
- repeating the same PATCH returns the same result (idempotent)
- 400 VALIDATION_ERROR for: an invalid action value, a missing action, an
empty object, no body at all, a note longer than 500 characters, an unknown
field, a non-string note
- 404 VEHICLE_NOT_FOUND for a well-formed unknown UUID; 400 for a
malformed id
- 400 INVALID_JSON for a malformed JSON body
- a rejected PATCH changes nothing in the database
CHECKS (run each and report the real result)
docker compose up -d --wait
npm run test:unit
npm run test:integration
npm run typecheck
npm run lint
npm run format:check

npm run build
EXPECTED RESULTS
All pass.
ACCEPTANCE CRITERIA
- Replace semantics exactly as in brief rule 6.
- Persistence is verified by reading the database directly, not only through
the API.
- No restriction to aging vehicles; unknown fields rejected.
- Every error uses the standard envelope.
- Earlier code was extended, not refactored.
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

Checkpoint 7 — verify before moving on
Run R13 and R12 (the PATCH call, then the GET). Stop and restart npm run dev and
GET the same vehicle again: the saved action must still be there.
Confirm it in the database itself: docker compose exec db psql -U inventory -d
inventory_dev -c "select vin, proposed_action, action_note,
action_updated_at from vehicles where id = 'b0000000-0000-4000-8000000000000009';" must show your PATCH.

Try bad requests by hand: an invalid action value, an unknown field, an unknown id.
Each must return the standard envelope.
Re-run npm run db:seed to reset the demo data. Commit: git add -A && git
commit -m "feat(api): update proposed action with persistence tests" .
