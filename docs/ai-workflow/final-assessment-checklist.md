# Final assessment checklist and video outline

Tick an item only after personally seeing its evidence. This checklist follows Part 12 of the supplied plan.

## Functional correctness

- [ ] F1–F7 work end to end: list, filters, aging, derived age, PATCH, persistence and saved action on later retrieval. Evidence: R11, R12 and green integration suite.
- [ ] Every assumption A1–A15 is documented in the SDD, including any changes.
- [ ] 89 days is not aging, 90 days is not aging, 91 days is aging in both unit and integration tests.
- [ ] UTC-midnight rollover test exists.
- [ ] Seed contains 89-, 90- and 91-day vehicles on the day it is run.
- [ ] You performed the mutation check: changing `>` to `>=` makes tests fail.

## API validation and errors

- [ ] Every endpoint uses the common error envelope and `requestId`. Try six bad requests manually.
- [ ] No stack trace, SQL or driver text appears in responses.
- [ ] Unknown query parameters, bad types, min above max, bad UUID, invalid action and unknown body field return 400.

## Database and persistence

- [ ] `npx prisma migrate status` reports schema up to date; migrations are committed.
- [ ] `\d vehicles` shows no aging column.
- [ ] PATCHed action survives API restart and is visible in PostgreSQL.
- [ ] Seed is idempotent (run twice).

## Tests, build and clean install

- [ ] Unit and integration suites pass; three consecutive runs pass; both time zones pass.
- [ ] Coverage thresholds met and `docs/testing.md` traceability table is accurate.
- [ ] Integration suite rejects a non-test database; development row count is unchanged.
- [ ] Fresh clone follows README to a running API.
- [ ] `npm run build`, `npm start` and `npm run check` pass.

## Code quality and security

- [ ] Vehicle controllers do not import Prisma.
- [ ] No leftover TODOs, dead files or commented-out code except explicitly personal TODOs awaiting completion.
- [ ] Domain code has no I/O and never calls `Date.now()`.
- [ ] `.env` is not tracked; `.env.example` contains dummy values only.
- [ ] Git history contains no real secrets.
- [ ] Dependencies are minimal, pinned as planned, `package-lock.json` is committed and `npm audit` output has been reviewed.
- [ ] Docker ports are bound to `127.0.0.1`.

## Documentation and AI collaboration

- [ ] SDD has all 15 sections; diagrams render; text matches code.
- [x] AI design-phase section is truthful to the supplied source-plan history and the user's answers; it does not claim unreported personal actions.
- [ ] No unanswered personal reflection remains in the submitted AI Collaboration Narrative.
- [x] At least three repository-recorded corrections/adaptations are linked to evidence; they are not presented as corrections I personally noticed.
- [x] Narrative distinguishes checkpoint/current check evidence from the user's own verification and states the user's ownership responsibility.

## Video readiness and Git submission

- [ ] Video is 5–10 minutes (target about 9), rehearsed once, script ready.
- [ ] Demo data has just been reseeded. Screen is readable and no secrets/tokens/account pages are visible.
- [ ] Video link/file can be opened by someone else.
- [ ] Git history shows one commit per checkpoint, working tree is clean and tag `v1.0.0` exists.
- [x] `.github/prompts/` and [the AI log](../ai-collaboration-log.md) are committed; README is at repository root.
- [ ] Repository is accessible to the reviewer; PR merged as appropriate.

## Suggested 9-minute video

| Time | Segment | Show | Explain |
|---|---|---|---|
| 0:00–0:40 | Introduction and scope | README title and stack | Scenario B, dealership manager, what is/is not in scope |
| 0:40–2:00 | Architecture | SDD Mermaid diagram and folder tree | Modular monolith; derived aging; UTC/injected clock; common error envelope |
| 2:00–3:00 | Data model and aging | `prisma/schema.prisma`, `src/modules/vehicles/domain/inventory-age.ts`, `prisma/seed.ts` | No stored aging flag; strict >90 rule; 89/90/91 examples |
| 3:00–5:30 | Live API demo | Terminal and Bruno/Postman or curl | Start DB/API; list, aging filter, make filter, 90 vs 91, PATCH then GET, 404, 400, health |
| 5:30–6:45 | Tests | `npm test`, boundary test and mutation | Unit vs integration; isolated DB; demonstrate `>` to `>=` makes tests fail, then restore |
| 6:45–8:15 | AI collaboration | AI log, `.github/prompts/` and one real correction | How prompts were used, what you verified, what AI got wrong and your decision |
| 8:15–9:00 | Trade-offs | Known limitations | Future auth, audit history, cursor pagination and CI; why out of scope |

## Recording checklist

- Write a short script and rehearse once with a timer.
- Run `docker compose up -d --wait` and `npm run db:seed` just before recording.
- Use a large terminal font, close notifications and hide `.env`, tokens and account pages.
- State expected behavior before each API call, then confirm the result.
- Record in segments if useful; check audio; upload; open the video link from another account to verify access.

## Keep scope honest

Do not add authentication, caching, queues, Kubernetes, frontend UI, GraphQL, event sourcing or extra endpoints. Only after every checklist item passes, consider a small CI workflow and functional `lower(make)` / `lower(model)` indexes as optional follow-up work.
