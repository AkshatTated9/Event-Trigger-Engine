<h1 align="center">Listenery Event Trigger Engine</h1>

<p align="center">
  A backend service between incoming product events and outgoing AI interview invites.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/BullMQ-queue-orange" alt="BullMQ" />
</p>

---

This service ingests product events, matches them against client-configured rules, applies
deterministic sampling, schedules a delayed dispatch, deduplicates repeat sends, and hands
off to a stubbed sender that logs the payload.

---

## Table of contents

- [Architecture](#architecture)
- [Event lifecycle](#event-lifecycle)
- [Core logic](#core-logic)
  - [Matching](#matching)
  - [Sampling](#sampling)
  - [Scheduling](#scheduling)
  - [Deduplication](#deduplication)
  - [Dispatch](#dispatch)
- [Cron sweeper](#cron-sweeper)
- [Dispatch lifecycle](#dispatch-lifecycle)
- [Data model](#data-model)
- [API](#api)
- [Swagger](#swagger)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Trade-offs and next steps](#trade-offs-and-next-steps)

---

## Architecture

```
Client product
      │  POST /event/created  (JWT)
      ▼
EventsController  ──────────────────────►  { success: true }  (event persisted, processing async)
      │
      │  emit "event-created"
      ▼
Node.js EventEmitter (in-process, async)
      │
      ▼
EventListener → EventService.processEvent()
      │  match rules for (client_id, event_name)
      ▼
Sampling check (MD5 hash) ──► excluded ──► skip, log
      │ included
      ▼
Dedup check (user, interview, window) ──► duplicate ──► skip, log
      │ clear
      ▼
Create dispatch row (status = scheduled, scheduled_at)
      │
      ├── delay ≤ 6 hours ──► enqueue delayed BullMQ job (Redis)
      │                              │
      │                              ▼
      │                        BullMQ Worker → sender stub (logs payload) → mark sent
      │
      └── delay > 6 hours ──► stays in Postgres only

Cron Sweeper (every 6 hours)
      │  finds dispatches that are scheduled, unsent, and due within next 6 hours
      ▼
      enqueues into BullMQ
```

The API, BullMQ worker, and cron sweeper all run in a single NestJS process.

---

## Event lifecycle

1. **Register a client** via `POST /auth/register/client` and save the returned JWT.
2. **Create an interview** via `POST /interviews/create`.
3. **Create a rule** via `POST /rules/create` linking an `event_name` to an `interview_id`.
4. **Ingest an event** via `POST /event/created` with `{ event_name, user_id, email, phone, properties, timestamp }`.
5. **EventsController** saves the raw event to Postgres and returns `{ success: true }` immediately. No matching or scheduling happens on the request path.
6. The controller emits an in-process `event-created` event.
7. **EventListener** picks it up asynchronously and:
   - looks up rules for `(client_id, event_name)` — if none match, returns;
   - runs the deterministic sample check — if excluded, logs and returns;
   - checks the dedup window for `(user_id, interview_id)` — if already sent inside the window, logs and returns;
   - otherwise inserts a `dispatches` row with `status = scheduled` and a computed `scheduled_at`.
8. If the dispatch is due within the next 6 hours (`rule.delay` in seconds), it is enqueued as a delayed BullMQ job immediately. Otherwise it stays in Postgres for the cron sweeper.
9. The **cron sweeper** runs every 6 hours, finds due dispatches, and enqueues them into BullMQ.
10. When a **BullMQ job** fires, the **worker** loads the dispatch, calls the sender stub, and marks the row `sent` (or `failed` on error).

---

## Core logic

### Matching

Rules are configured per client and keyed on `event_name`:

```
Rule { client_id, event_name, interview_id, delay, sample_percentage, dedup_window }
```

- `delay` — seconds until the dispatch should run
- `sample_percentage` — integer 0–100
- `dedup_window` — seconds

Matching is a lookup on `(client_id, event_name)`. Multiple rules can match; each is evaluated independently.

### Sampling

Deterministic per `(user_id, rule_id)` using an MD5 hash mapped to 0–99:

```ts
// src/utils/sampling.util.ts
hash(`${userId}:${ruleId}`) % 100 < sample_percentage
```

The same user always gets the same in/out decision for a given rule.

### Scheduling

`scheduled_at = now + rule.delay` (seconds). The dispatch row is the durable source of truth.

- **Near-term** (delay ≤ 6 hours): enqueued into BullMQ immediately as a delayed job.
- **Far-out** (delay > 6 hours): stored in Postgres only until the cron sweeper picks it up.

### Deduplication

Before creating a dispatch, the service checks whether the same `(client_id, user_id, interview_id)` already has a `sent_at` within the rule's `dedup_window`. If so, the dispatch is skipped.

Dedup is checked at schedule time only (not re-checked in the worker before sending).

### Dispatch

The BullMQ worker loads the dispatch row and calls the sender stub, which logs:

```json
{
  "client_id": "...",
  "user_id": "...",
  "interview_id": 1,
  "scheduled_at": "...",
  "timestamp": "..."
}
```

No real email/SMS is sent.

---

## Cron sweeper

Runs on schedule `0 */6 * * *` (every 6 hours).

Queries `dispatches` where:
- `status = 'scheduled'`
- `sent_at IS NULL`
- `scheduled_at <= now + 6 hours`

For each match, enqueues a BullMQ job with the remaining delay. Job IDs use the pattern `dispatch-{id}` to reduce duplicate enqueues.

---

## Dispatch lifecycle

| Status | Meaning |
|--------|---------|
| `scheduled` | Created after rule match + sampling + dedup passed |
| `sent` | Worker successfully called the sender stub |
| `failed` | Sender returned failure |

---

## Data model

| Table | Purpose |
|-------|---------|
| `client_entity` | Tenant record (`id`, `name`, `email`, `api_key`) |
| `interviews` | Interview configs (`id`, `name`, `created_by`) |
| `events` | Raw ingested events |
| `rule` | Maps `(client_id, event_name)` → `interview_id` with delay/sampling/dedup settings |
| `dispatch` | Scheduled send per matched rule; tracks `status`, `scheduled_at`, `sent_at`, `email`, `phone` |

TypeORM `synchronize: true` is enabled — tables are auto-created from entities on startup. There are no migration scripts.

---

## API

All protected routes require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Obtain a token from `POST /auth/register/client`.

### `GET /`

Public health check. Returns `"Hello World!"`.

### `POST /auth/register/client`

Public. Register a new client.

**Request body:**
```json
{
  "name": "Gokhana",
  "email": "abc@gmail.gokhana.com"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `POST /interviews/create`

Create an interview configuration for the authenticated client.

**Request body:**
```json
{
  "name": "test1",
  "link": "https://www.listenery.ai/"
}
```

**Response:**
```json
{
  "message": "Interview Created"
}
```

### `POST /rules/create`

Create a rule linking an event name to an interview.

**Request body:**
```json
{
  "client_id": "7e60703a-411a-4560-b9e5-9735e3ad59cd",
  "event_name": "interview_scheduled",
  "interview_id": 1,
  "delay": 30,
  "sample_percentage": 90,
  "dedup_window": 3600
}
```

**Response:**
```json
{
  "message": "Rule created successfully"
}
```

### `POST /event/created`

Ingest a product event. Persists the event and returns immediately; processing is async.

**Request body:**
```json
{
  "event_name": "interview_scheduled",
  "user_id": "user_456",
  "email": "rahul.sharma@example.com",
  "phone": "9876543210",
  "properties": {
    "position": "Backend Developer",
    "interview_type": "Technical",
    "location": "Online"
  },
  "timestamp": "2026-08-13T17:10:00.000Z"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Swagger

Interactive API docs are available at:

```
http://localhost:3000/api
```

Use **Authorize** with the JWT from `/auth/register/client` to test protected endpoints.

---

## Getting started

### Prerequisites

- Node.js 22+
- PostgreSQL
- Redis

### Environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/listenery
REDIS_URL=redis://localhost:6379
PORT=3000
secret=your-jwt-secret
```

### Run locally

```bash
# Install dependencies
npm install

# Start in watch mode (API + BullMQ worker + cron)
npm run start:dev
```

The server starts on `PORT` (default `3000`).

### Typical setup flow

1. `POST /auth/register/client` → save the JWT
2. `POST /interviews/create` → note the interview `id`
3. `POST /rules/create` → link your `event_name` to that interview
4. `POST /event/created` → ingest events and watch server logs for dispatch output

---

## Testing

```bash
npm run test
```

Currently includes the default NestJS scaffold test for `AppController`. Sampling and deduplication logic are not yet covered by dedicated unit tests.

---

## Trade-offs and next steps

**What is implemented:**
- JWT-based client auth
- Async event processing via in-process EventEmitter
- Rule matching, deterministic MD5 sampling, dedup, and delayed dispatch
- Postgres as durable schedule + BullMQ for near-term execution
- 6-hour cron sweeper as a backstop for far-out or missed dispatches
- Logging-only sender stub
- Swagger docs at `/api`

**Known limitations:**
- Single-process deployment (API, worker, cron together)
- No dedup re-check at send time
- No `QUEUED` / `CANCELLED` dispatch states
- No retry/backoff on sender failures
- TypeORM auto-sync instead of migrations
- Minimal test coverage

**Possible improvements:**
- Return `event_id` from `POST /event/created`
- Add GET endpoints for event/dispatch status
- Split API, worker, and cron into separate processes
- Add unit tests for sampling and deduplication
- Re-check dedup in the worker before sending
- Replace `synchronize: true` with proper migrations
