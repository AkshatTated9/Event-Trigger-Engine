<h1 align="center"> Event Trigger Engine</h1>

<p align="center">
  NestJS backend that ingests product events and schedules AI interview dispatches.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/BullMQ-queue-orange" alt="BullMQ" />
</p>

---

## Run from scratch

### 1. Prerequisites

Install these before starting:

| Tool | Version | Check |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | 18+ (22 recommended) | `node -v` |
| [Docker](https://www.docker.com/) | any recent | `docker -v` |

You need **PostgreSQL** and **Redis**. The steps below start both with Docker — no local installs required.

---

### 2. Clone and install

```bash
git clone <your-repo-url>
cd backend
npm install
```

---

### 3. Start Postgres and Redis

Run these once (skip if you already have containers running):

```bash
docker run -d \
  --name listenery-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=listenery \
  -p 5432:5432 \
  postgres:16

docker run -d \
  --name listenery-redis \
  -p 6379:6379 \
  redis:7
```

Verify they are up:

```bash
docker ps
```

> **Using your own Postgres/Redis?** Point `DATABASE_URL` and `REDIS_URL` in `.env` at your instances instead.

---

### 4. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/listenery
REDIS_URL=redis://localhost:6379
PORT=3000
secret=long-random-string
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string (used by BullMQ) |
| `PORT` | HTTP port (default `3000`) |
| `secret` | JWT signing secret |

Tables are created automatically on first startup (`TypeORM synchronize: true`). No migrations needed.

---

### 5. Start the server

```bash
npm run start:dev
```

You should see:

```
Server is running on port 3000
```

Confirm the app is alive:

```bash
curl http://localhost:3000
# → Hello World!
```

Swagger UI: **http://localhost:3000/api**

---

### 6. End-to-end walkthrough

The easiest way to try the full flow is through **Swagger** — every endpoint has a pre-filled
example body, so there's nothing to type by hand.

1. Open **http://localhost:3000/api**
2. Run `POST /auth/register/client` → copy the `token` from the response.
3. Click **Authorize** (top right) → enter `Bearer <token>` → this authorizes all subsequent calls.
4. Run the remaining endpoints in order, using each one's example body as a starting point:
   - `POST /interviews/create` — creates the interview a matched event will dispatch.
   - `POST /rules/create` — links an event name to that interview, with `delay`, `sample_percentage`, and `dedup_window`. Use a short `delay` (seconds) so you see a dispatch quickly, and `sample_percentage: 100` so nothing gets sampled out while testing.
   - `POST /event/created` — ingests a product event. The response returns immediately; everything else happens in the background.

> The interview-create response doesn't return an ID. On a fresh database the first interview is `interview_id: 1` — check the `interviews` table if you're unsure which ID to reference in your rule.

Prefer curl? Every route above also works directly; just add `-H "Authorization: Bearer $TOKEN"` and the JSON body shown in Swagger for that endpoint.

---

### 7. Verify it worked

Watch the **server terminal**. After your rule's delay elapses, you should see logs like:

```
Event 1 created for client ...
Processing event 1 for client ...
Found 1 rule(s) ...
Created dispatch 1 for user user_456 ...
Adding dispatch 1 to queue with delay 10000ms ...
Processing job dispatch-1 of type send-dispatch
===== DISPATCH SENDER STUB =====
{
  "client_id": "...",
  "user_id": "user_456",
  "interview_id": 1,
  ...
}
================================
Dispatch 1 sent successfully
```

That stub log is the simulated interview invite send.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ECONNREFUSED` on Postgres | Ensure the Postgres container is running: `docker start listenery-postgres` |
| `ECONNREFUSED` on Redis | Ensure the Redis container is running: `docker start listenery-redis` |
| `Token missing` / `401` | Add header `Authorization: Bearer <token>` |
| `ClientEntity already exists` | Use a different email or drop the DB and restart |
| No dispatch logs | Check `event_name` matches the rule, `sample_percentage` is 100, and `client_id` in the rule matches your JWT |
| Dispatch takes too long | Lower `delay` in the rule (value is in **seconds**) |
| DB SSL connection error | The app expects SSL (`rejectUnauthorized: false`). Use a cloud Postgres URL, or disable SSL in `src/app.module.ts` for local non-SSL Postgres |

---

## NPM scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with hot reload |
| `npm run start:prod` | Production (`node dist/main` — run `npm run build` first) |
| `npm run build` | Compile TypeScript |
| `npm run test` | Run tests |

---

## API reference

All protected routes need: `Authorization: Bearer <token>`

Full request/response schemas and example bodies live in Swagger at **`/api`** — this table is
just a map of what exists.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Public | Health check |
| `POST` | `/auth/register/client` | Public | Register client, returns JWT |
| `POST` | `/interviews/create` | JWT | Create interview config |
| `POST` | `/rules/create` | JWT | Create event → interview rule |
| `POST` | `/event/created` | JWT | Ingest a product event |

---

## How it works (short)

1. `POST /event/created` saves the event and returns immediately.
2. An in-process listener matches rules, applies sampling + dedup, and creates a dispatch row.
3. Dispatches due within 6 hours are queued in BullMQ (Redis).
4. A worker sends the stub (logs the payload) and marks the dispatch `sent`.
5. A cron job every 6 hours picks up any far-out or missed dispatches.

---

## Project structure

```
src/
├── controllers/     # HTTP routes
├── services/        # Business logic, cron, event listener
├── processors/      # BullMQ worker
├── entities/        # TypeORM models
├── dtos/            # Request validation
├── guards/          # JWT auth
└── swagger/         # Swagger example bodies
```
