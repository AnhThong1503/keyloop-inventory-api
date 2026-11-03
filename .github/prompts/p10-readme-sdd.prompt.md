---
name: p10-readme-sdd
description: "README, System Design Document and AI collaboration scaffolding"
agent: agent
---

Prompt 10 — README, System Design Document and AI-collaboration
scaffolding (Phase 10, part 2)
TASK
Write README.md and docs/system-design.md, plus the AI-collaboration
scaffolding. Documentation only: do not change product code.
CONTEXT
Read AGENTS.md, docs/design-brief.md, docs/openapi.yaml, docs/testing.md,
docs/api-examples.md, package.json and the source tree first. The documents
must describe the project as it actually is. Run every command you put in the
README and report the result; mark any command you could not run as NOT
VERIFIED.
CRITICAL RULE
Do NOT invent my AI-collaboration history. Wherever a section needs facts
about how I used AI, write the structure and a TODO(user) marker containing a
question for me. You may describe only design decisions that are visible in
the repository.
TASKS
1. README.md with these sections: overview and features; prerequisites (Node
24 LTS, Docker, Git); quick start in numbered steps, with macOS/Linux and
Windows PowerShell variants where they differ (clone, npm ci, create .env
from .env.example, docker compose up -d --wait, npm run db:deploy, npm run
db:seed, npm run dev, check /health); environment variables table; database
and migrations; seeding (relative dates, re-run to reset); running the API
and example calls (link to docs/api-examples.md); tests (unit, integration,
coverage, TEST_TZ; link to docs/testing.md); lint, format, build and start;
npm run check; architecture overview with the Mermaid diagram; the aging rule
in three lines; API summary table (link to docs/openapi.yaml); project
structure; version pins and why (Prisma 7 not 8, TypeScript 6 not 7, Node 24,
the PostgreSQL 18 volume path); known limitations (no authentication, UTConly day boundary, offset pagination, case-insensitive filters not indexed,
no audit history, last write wins); troubleshooting (top 6); and a section
titled AI Collaboration Narrative containing only the template structure from
task 4, with TODO(user) markers.
2. docs/system-design.md with these sections: problem statement; scope and
assumptions (A1 to A15 if they appear in the brief, otherwise the decisions
visible in the code); functional and non-functional requirements;
architecture diagram (Mermaid flowchart); component responsibilities; data
model (Mermaid erDiagram plus constraints and indexes); API design (tables,
link to openapi.yaml); data flow (a Mermaid sequence diagram for GET
/api/vehicles and one for PATCH /api/vehicles/:id/action); business rules
(age calculation, strictly more than 90, filters, pagination, error handling,
UTC and the clock); technology choices and justifications (including the

version-pin traps); error handling and observability; security and
maintainability; testing strategy; trade-offs and future improvements
(authentication, audit history, cursor pagination, functional indexes for
make and model, dealership time zones, containerising the API, CI); and a
section AI assistance during the design phase (structure and TODO(user)
markers only).
3. docs/ai-collaboration-log.md: a log with this table header: Date | Prompt
number | What I asked | What the agent produced | How I verified (commands
and results) | What I corrected or rejected | Decisions I made myself. Add
two lines explaining how to fill it in.
4. AI Collaboration Narrative template (inside the README): How AI was used
(planning, implementation, testing, debugging, refinement); How I verified
generated code; Meaningful decisions and corrections (at least three, each
linked to a log row); How I retained ownership of the final implementation;
What I would do differently. Give each section one or two guiding questions
and a TODO(user) marker.
5. Validate every Mermaid block by rendering it (VS Code Markdown preview or
a Mermaid CLI if available). If you cannot render, say so.
CHECKS (run each and report the real result)
npm run format:check
every command in the README quick start, run in order in a fresh shell
npm run openapi:lint
EXPECTED RESULTS
Everything passes; README commands succeed or are marked NOT VERIFIED.
ACCEPTANCE CRITERIA
- Every README command is verified or marked NOT VERIFIED.
- The documents match the code: endpoints, parameters, status codes, error
codes, seed table, scripts and version pins.
- The AI sections contain structure and TODO(user) markers only, with no
invented history.
- Known limitations are stated honestly.
DEFINITION OF DONE
All acceptance criteria met; results reported honestly; a list of every
TODO(user) you left.
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

Checkpoint 10 — verify before moving on
Follow the README yourself from a new terminal and fix anything unclear.
Read the SDD critically: is every claim true, and does each diagram match the code?
Rewrite the AI narrative yourself from your log (Part 11). The agent's TODO(user)
markers are your checklist. Delete none of them until you have written the real
content.
Commit: git add -A && git commit -m "docs: README, system design and AI
collaboration scaffolding" .
