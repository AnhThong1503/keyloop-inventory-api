---
name: p04-app-foundation
description: "Configuration, logging, errors, health and shutdown"
agent: agent
---

Prompt 4 — Application foundation: config, logging, errors, health, shutdown
(Phase 8)
TASK
Build the application foundation: validated configuration, structured
logging, request ids, the error envelope, a validation helper, the health
endpoint, the Express app factory and the server with graceful shutdown. No
vehicle endpoints yet.
CONTEXT
Read AGENTS.md and docs/design-brief.md first (the API section defines the
error envelope and codes). Express 5 is installed: req.query is read-only,
req.body is undefined when no JSON body was sent, and rejected promises from
async handlers reach the error middleware automatically. createPrismaClient
lives in src/db/prisma.ts and Clock in src/shared/clock.ts.
TASKS
1. src/config/env.ts: import dotenv/config, then parse process.env with a Zod
schema: NODE_ENV (development, test or production; default development), PORT
(integer 1 to 65535, default 3000), DATABASE_URL (required; must start with
postgresql:// or postgres://), LOG_LEVEL (fatal, error, warn, info, debug,
trace or silent; default info). Export loadEnv(source = process.env), which
returns a typed object or throws ONE readable error that lists every invalid
variable name WITHOUT printing values.
2. src/shared/logger.ts: createLogger(level, nodeEnv) using pino. JSON
output; human-readable output through pino-pretty only when NODE_ENV is
development. Redact req.headers.authorization and req.headers.cookie.
3. src/shared/request-id.ts: middleware that reuses an incoming x-request-id
header only if it matches /^[A-Za-z0-9._-]{1,64}$/, otherwise generates
crypto.randomUUID(); store it on res.locals.requestId and echo it in the xrequest-id response header.
4. src/shared/request-logger.ts: a small middleware of your own (do NOT add
pino-http). When the response finishes, log requestId, method, path without
the query string, statusCode and durationMs. Level: 5xx error, 4xx warn,
otherwise info; GET /health at debug. Never log bodies or headers.
5. src/shared/errors.ts: AppError base class (status, code, message,
details?) with ValidationError, NotFoundError (code supplied by the caller)
and ServiceUnavailableError.
6. src/shared/validate.ts: a helper that parses params, query and body with
Zod schemas and returns the typed results, or throws ValidationError with
details [{ location, path, message }] listing ALL issues. It must NOT assign
to req.query; return the parsed values instead. Handle req.body being
undefined.
7. src/shared/error-handler.ts: notFoundHandler (404 ROUTE_NOT_FOUND) and
errorHandler producing the envelope { error: { code, message, details?,
requestId } }. Mapping: AppError subclasses as defined; ZodError to 400

VALIDATION_ERROR; body-parser errors by their type property
(entity.parse.failed gives 400 INVALID_JSON; entity.too.large gives 413
PAYLOAD_TOO_LARGE); Prisma known error P2025 gives 404 VEHICLE_NOT_FOUND;
database connectivity failures give 503 SERVICE_UNAVAILABLE; everything else
gives 500 INTERNAL_ERROR with the generic message Internal server error.
Never put stack traces, SQL or driver messages in a response. Log 5xx with
the stack (server side only) and 4xx at warn without the stack.
IMPORTANT: do not guess the shape of connectivity errors raised through
the Prisma 7 pg adapter. Write a small experiment (a client pointed at a
closed port such as 127.0.0.1:1), observe what is actually thrown, then
implement and unit-test the mapping for what you saw. Report your findings.
8. src/modules/health/health.routes.ts: GET /health runs a constant SELECT 1
through prisma.$queryRaw with a 2-second timeout. Respond 200 { status: ok,
checks: { database: up }, uptimeSeconds, timestamp } or 503 { status:
degraded, checks: { database: down }, uptimeSeconds, timestamp }. Use the
injected clock for timestamp.
9. src/app.ts: export createApp({ prisma, clock, logger }) which builds and
returns the Express app WITHOUT listening: disable x-powered-by; helmet;
request-id; express.json with a 10kb limit; request-logger; the health
router; notFoundHandler; errorHandler. Leave a clearly marked place where the
vehicle router will be mounted under /api later.
10. src/server.ts: the composition root. loadEnv, createLogger,
createPrismaClient, createApp with systemClock, listen on PORT and log a
startup summary (environment, port, database host, port and name; NEVER
credentials). Graceful shutdown on SIGINT and SIGTERM: stop accepting
connections, close the HTTP server, await prisma.$disconnect(), exit 0; force
exit with code 1 after 10 seconds. Log and exit 1 on unhandledRejection and
uncaughtException.
11. Tests (no real database needed; stub the Prisma object, for example {
$queryRaw: vi.fn() }):
- env: valid input, defaults, each invalid variable, and that the error
message never contains the values.
- error handler: every mapping in task 7, including that a 500 response
never contains the original error message or a stack.
- app (Supertest on createApp with fakes): GET /health 200, and 503 for
both a rejecting and a slow stub; an unknown route gives the 404 envelope;
malformed JSON gives 400 INVALID_JSON; an oversized body gives 413; xrequest-id is echoed when valid, replaced when invalid and generated when
absent; the same requestId appears in the header and in an error body.
- validate helper: reports all issues; handles an undefined body.
CHECKS (run each and report the real result)
npm run test:unit
npm run typecheck
npm run lint
npm run format:check

npm run build
docker compose up -d --wait
npm run dev
(in the background if you can)
curl http://127.0.0.1:3000/health
(on Windows use curl.exe)
stop the server with SIGINT or SIGTERM and show the shutdown log lines
If you cannot run a background server, give me the exact commands and mark
those steps NOT VERIFIED.
EXPECTED RESULTS
Tests pass. The build creates dist/server.js. /health returns 200 with
database up. The shutdown logs show the server closing and the database
disconnecting.
ACCEPTANCE CRITERIA
- One error envelope for every error path, with the same requestId in the
header, the body and the logs.
- No environment value, credential or request body is ever logged; pino-http
is not a dependency.
- createApp never listens; only server.ts reads the environment and opens the
connection.
- The connectivity-error mapping is based on an error you observed, not a
guess.
- npm run build succeeds.
DEFINITION OF DONE
All acceptance criteria met; results reported honestly; your experiment
findings included in the report.
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

Checkpoint 4 — verify before moving on
Run R9, R10 and R15 yourself (dev server, health, build and start).
Error paths: curl -s http://127.0.0.1:3000/nope returns the 404 envelope with
ROUTE_NOT_FOUND and a requestId . On macOS or Linux also run curl -s -X POST
http://127.0.0.1:3000/health -H 'Content-Type: application/json' -d '{bad' ,

which must return 400 INVALID_JSON (on Windows the tests cover it).
Database failure: docker compose stop db , then curl
http://127.0.0.1:3000/health must return 503 within about two seconds. docker
compose start db , and it returns 200 again.

Press Ctrl+C in the dev terminal and read the shutdown log lines.
Leak check: git grep -n DATABASE_URL -- src should show only
src/config/env.ts .

Read the agent's report on what a connectivity error really looks like. Commit: git add
-A && git commit -m "feat(app): config, logging, error envelope, health and
graceful shutdown" .

Log entry: note anything the agent guessed and you corrected.
