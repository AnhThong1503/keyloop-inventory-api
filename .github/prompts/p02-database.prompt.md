---
name: p02-database
description: "PostgreSQL 18, Prisma 7 migration and seed data"
agent: agent
---

Prompt 2 — PostgreSQL, Prisma, migration and seed (Phase 3)
Before you paste: copy .env.example to .env (R3) and make sure Docker is running.
TASK
Add the database layer: Docker Compose (development and test databases), the
Prisma 7 schema and first migration, a Prisma client factory, and idempotent
seed data. No HTTP code in this task.
CONTEXT
Read AGENTS.md and docs/design-brief.md first. PostgreSQL 18 runs in Docker.
Prisma ORM 7 with the pg driver adapter (NOT Prisma 8). The tooling from the
previous task works (typecheck, lint and test pass). I have copied
.env.example to .env and Docker is running.
TASKS
1. docker-compose.yml (no top-level version key) with two services using the
image postgres:18:
- db: container_name inventory-db; POSTGRES_USER, POSTGRES_PASSWORD and
POSTGRES_DB taken from .env with the defaults inventory,
inventory_dev_password and inventory_dev; ports
127.0.0.1:${POSTGRES_PORT:-5432}:5432; a named volume mounted at
/var/lib/postgresql (NOT /var/lib/postgresql/data: PostgreSQL 18 images keep
data in a versioned subfolder, so the volume must be mounted at the parent);
a pg_isready healthcheck (escape variables as $${VAR} so the container
evaluates them); restart unless-stopped.
- db-test: container_name inventory-db-test; same user and password;
POSTGRES_DB inventory_test; ports 127.0.0.1:${POSTGRES_TEST_PORT:-5433}:5432;
tmpfs at /var/lib/postgresql (ephemeral data); the same healthcheck.
2. prisma/schema.prisma exactly as given in the SCHEMA section below.
3. prisma.config.ts in the repository root: import dotenv/config;
defineConfig from prisma/config; schema prisma/schema.prisma; migrations path
prisma/migrations with seed command tsx prisma/seed.ts; datasource url from

process.env.DATABASE_URL (NOT the env() helper). If the Prisma 7 init command
in this version names the file prisma7.config.ts, that name is acceptable;
choose one and tell me which.
4. package.json scripts: db:generate = prisma generate; db:migrate = prisma
migrate dev; db:deploy = prisma migrate deploy; db:seed = prisma db seed;
db:studio = prisma studio. Add postinstall = prisma generate, and make build
run prisma generate before tsc.
5. First migration: run docker compose up -d --wait, then npx prisma migrate
dev --name init --create-only. Edit the generated SQL BEFORE applying it,
appending two constraints on vehicles: CHECK (year BETWEEN 1980 AND 2100) and
CHECK (char_length(vin) = 17). Then apply it with npx prisma migrate dev, and
run npm run db:generate. If Prisma offers to reset the database at any point,
STOP and ask me.
6. src/db/prisma.ts: export function createPrismaClient(databaseUrl: string)
returning new PrismaClient({ adapter: new PrismaPg({ connectionString:
databaseUrl }) }). No module-level client; no reading of process.env in this
file.
7. prisma/seed.ts, idempotent and safe to run twice: load .env through
dotenv/config, build the client with
createPrismaClient(process.env.DATABASE_URL), upsert the 2 dealerships by
name and the 14 vehicles by VIN using the fixed ids below. The update branch
must overwrite every seed-controlled field so a re-run resets the demo state.
inventoryDate = today's UTC date minus the listed number of days, as a UTCmidnight Date. VINs: exactly 17 characters, letters A-Z excluding I, O and Q,
plus digits, clearly synthetic. Set actionUpdatedAt to now for every row
whose action is not NONE. At the end print a table (vin, make and model,
inventoryDate, days in inventory, proposedAction) and the line Seeded 2
dealerships and 14 vehicles. Then disconnect the client.
Dealership ids: a0000000-0000-4000-8000-000000000001 is Downtown Motors
(1); a0000000-0000-4000-8000-000000000002 is Riverside Auto Group (2).
Vehicle ids: b0000000-0000-4000-8000-0000000000NN where NN is the row
number.
Row | make model | year | colour | dealership | days | proposedAction
01 | Kia Sportage | 2021 | Green | 2 | 0 | NONE
02 | Toyota Corolla | 2024 | Pearl White | 1 | 12 | NONE
03 | Mazda CX-5 | 2023 | Soul Red | 2 | 30 | NONE
04 | Toyota Corolla | 2023 | Graphite Grey | 1 | 45 | NONE
05 | BMW 3 Series | 2022 | Black | 1 | 60 | NONE
06 | Ford Kuga | 2022 | Black | 2 | 75 | NONE
07 | Toyota RAV4 | 2023 | Midnight Blue | 1 | 89 | NONE
08 | Honda Civic | 2022 | Rallye Red | 1 | 90 | NONE
09 | Honda CR-V | 2022 | Silver | 1 | 91 | UNDER_REVIEW
10 | Hyundai Tucson | 2022 | White | 1 | 92 | NONE
11 | Ford Focus | 2021 | Blue | 2 | 120 | PRICE_REDUCTION_PLANNED with
note: Reduce asking price by 5% from Monday
12 | Volkswagen Golf | 2021 | White | 2 | 150 | PROMOTION_PLANNED

13 | Volkswagen Tiguan | 2020 | Grey | 2 | 210 | WHOLESALE_PLANNED
14 | BMW X1 | 2021 | Blue | 1 | 365 | TRANSFER_PLANNED
SCHEMA (copy exactly into prisma/schema.prisma)
```prisma
generator client {
  provider             = "prisma-client"
  output               = "../src/generated/prisma"
  importFileExtension  = "ts"
}

datasource db {
  provider = "postgresql"
}

enum ProposedAction {
  NONE
  UNDER_REVIEW
  PRICE_REDUCTION_PLANNED
  PROMOTION_PLANNED
  TRANSFER_PLANNED
  WHOLESALE_PLANNED

  @@map("proposed_action")
}

model Dealership {
  id        String    @id @default(uuid()) @db.Uuid
  name      String    @unique @db.VarChar(100)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  vehicles  Vehicle[]

  @@map("dealerships")
}

model Vehicle {
  id              String         @id @default(uuid()) @db.Uuid
  vin             String         @unique @db.VarChar(17)
  make            String         @db.VarChar(50)
  model           String         @db.VarChar(50)
  year            Int            @db.SmallInt
  colour          String         @db.VarChar(30)
  inventoryDate   DateTime       @map("inventory_date") @db.Date
  proposedAction  ProposedAction @default(NONE) @map("proposed_action")
  actionNote      String?        @map("action_note") @db.VarChar(500)
  actionUpdatedAt DateTime?      @map("action_updated_at") @db.Timestamptz(3)
  dealershipId    String         @map("dealership_id") @db.Uuid
  dealership      Dealership     @relation(fields: [dealershipId], references: [id], onDelete: Restrict)
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt       DateTime       @updatedAt @map("updated_at") @db.Timestamptz(3)

  @@index([inventoryDate])
  @@index([dealershipId])
  @@map("vehicles")
}
```

CHECKS (run each and report the real result; if you cannot run Docker, say so
and tell me exactly what to run)
docker compose config
docker compose up -d --wait
docker compose ps
npx prisma validate
npx prisma migrate status
npm run db:generate
npm run db:seed
(run it twice and show both outputs)
docker compose exec db psql -U inventory -d inventory_dev -c "select count(*)
from vehicles;"
docker compose exec db psql -U inventory -d inventory_dev -c "\d vehicles"
npm run typecheck
npm run lint
npm run format:check
npm test
EXPECTED RESULTS
Both services are healthy. migrate status reports the schema is up to date.
The seed prints 14 rows each time. The count is 14. \d vehicles shows both
CHECK constraints, the foreign key and both indexes. The last four commands
pass.
ACCEPTANCE CRITERIA
- The compose volume for db is mounted at /var/lib/postgresql; db-test uses
tmpfs.
- No is_aging column or any stored aging flag exists anywhere.
- prisma.config.ts reads process.env.DATABASE_URL directly and loads dotenv;
npm ci works on a clean checkout without a .env file (postinstall runs prisma
generate).
- The seed is idempotent and uses relative dates and the fixed ids above.
- Nothing outside this task was changed.
DEFINITION OF DONE

All acceptance criteria met; results reported honestly; the migration SQL
shown in your report.
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

Checkpoint 2 — verify before moving on
Run R4 to R8 yourself. Both containers must be healthy , the seed must print 14 rows
twice, and count must be 14.
Open the generated migration under prisma/migrations/ and read the SQL: the
enum, both tables, the unique VIN index, the foreign key, the two CHECK lines.
Prove a clean clone installs: delete node_modules (Windows: Remove-Item -Recurse
-Force node_modules ; macOS/Linux: rm -rf node_modules ), then run npm ci . It

must succeed without any database, because postinstall only generates the client.
git status : src/generated and .env must not appear. Commit: git add -A &&
git commit -m "feat(db): compose, prisma schema, migration and seed" .

Log entry: note the volume-path and env() decisions and whether the agent got them
right without prompting.
