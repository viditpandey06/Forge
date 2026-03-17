# Forge
## Distributed Task Queue Engine with Priority Scheduling, Retries, DLQ Handling, and Live Observability

Forge is a backend infrastructure project built to demonstrate practical distributed systems engineering in Node.js.

It models the core pieces of a production-style async job platform:

- a producer API for job submission
- a Redis-backed broker with priority and delay semantics
- a clustered worker pool for concurrent execution
- MongoDB-backed lifecycle persistence
- retry and dead-letter handling for failure recovery
- a live React dashboard for operational visibility

This project was designed as a portfolio artifact for recruiters and interviewers evaluating backend, systems, and infrastructure engineering ability.

---

## Copyright and Usage Warning

**Copyright 2026 Vidit Pandey. All Rights Reserved.**

This repository is provided strictly for **portfolio review and technical evaluation**.

- **DO NOT** copy this project and present it as your own work.
- **DO NOT** reuse this codebase for assignments, portfolio submissions, freelance work, or commercial use.
- **DO NOT** redistribute, re-license, or republish this repository in whole or in part.
- No license is granted to any individual or organization obtaining access to this source code.

If you are a recruiter, interviewer, or hiring manager, you are welcome to inspect the repository to evaluate implementation quality and technical depth. Any other use is explicitly prohibited.

---

## Project Snapshot

Forge demonstrates:

- asynchronous job processing
- Redis queue design
- delayed execution with sorted sets
- exponential backoff retry logic with jitter
- dead-letter queue handling
- MongoDB lifecycle persistence
- worker concurrency and orchestration
- live metrics streaming through Socket.io
- dashboard-driven system observability

This is the kind of project that helps answer interview questions such as:

- How would you design a background job processing system?
- How do you handle retries and poison messages?
- How do you prioritize urgent work?
- How do you recover from worker crashes?
- How do you observe queue throughput and latency in real time?

---

## Architecture

Forge follows a producer-broker-consumer model with dedicated persistence and observability layers.

### Producer Layer

- `Express API`
- validates job requests
- applies rate limiting
- stores jobs in MongoDB
- enqueues job ids into Redis

### Broker Layer

- `Redis`
- high-priority queue
- default-priority queue
- delay queue using sorted sets
- dead-letter queue
- sliding-window rate limiter
- pub/sub channel for metrics events

### Worker Layer

- `Node.js clustered workers`
- claims pending jobs atomically
- executes handlers with timeout protection
- retries transient failures
- moves permanent failures into DLQ

### Persistence Layer

- `MongoDB Atlas`
- durable system of record for job state
- stores payload, attempts, timestamps, result, and error context

### Observability Layer

- `Socket.io + React`
- queue depth
- throughput
- latency percentiles
- recent activity feed
- worker utilization

---

## Key Design Decisions

### MongoDB Is the Source of Truth

Forge writes each job to MongoDB before pushing the job id into Redis. Redis acts as the fast broker; MongoDB stores the authoritative lifecycle state.

### Redis Stores Job IDs, Not Payloads

Only job ids are placed into Redis queues. This keeps the broker lightweight and centralizes full state, result data, and auditing in MongoDB.

### Priority Scheduling

Workers consume from the high-priority queue before the default queue so urgent jobs drain first.

### Delayed Jobs

Delayed jobs are placed into a Redis sorted set and moved back into active queues once their scheduled time arrives.

### Retry with Jitter

Failed jobs use exponential backoff with jitter to prevent synchronized retry storms.

### At-Least-Once Delivery

Forge favors durability and recoverability over exactly-once semantics. Handlers should ideally be idempotent.

### Safe Shared Redis Usage

Forge supports a configurable `REDIS_PREFIX`, allowing multiple applications or environments to share one Redis instance without key collisions.

---

## End-to-End Flow

1. A client submits `POST /jobs`.
2. The API validates the request and applies Redis-based rate limiting.
3. The API persists the job to MongoDB as `PENDING`.
4. The API pushes the job id into Redis or schedules it into the delay queue.
5. A worker pops the job id from Redis.
6. The worker atomically claims the job in MongoDB by moving it to `PROCESSING`.
7. The handler executes with timeout protection.
8. On success, the job becomes `COMPLETED`.
9. On transient failure, the job is scheduled for retry with backoff.
10. On permanent failure, the job moves to the dead-letter queue.
11. Workers publish metrics events through Redis pub/sub.
12. The API emits live dashboard updates through Socket.io.

---

## Repository Structure

```text
forge/
├── packages/
│   ├── api/          # Express producer API
│   ├── broker/       # Redis queue, delay queue, DLQ, rate limiter
│   ├── dashboard/    # React observability UI
│   ├── metrics/      # Metrics collector and Socket.io emitter
│   ├── persistence/  # MongoDB models and repositories
│   └── worker/       # Worker pool, handlers, retries
├── benchmark/        # Load generation CLI
├── docker-compose.yml
├── package.json
└── README.md
```

---

## API Surface

### `POST /jobs`

Create a new background job.

### `GET /jobs/:id`

Fetch a job's status, result, and metadata.

### `GET /jobs`

List jobs with filter support.

### `POST /jobs/:id/retry`

Manually retry a failed or DLQ job.

### `DELETE /jobs/:id`

Cancel a pending job.

### `GET /health`

Check MongoDB and Redis connectivity.

### `GET /metrics`

Return the live metrics snapshot used by the dashboard.

---

## Current Stack

- `Node.js`
- `Express`
- `Redis`
- `MongoDB Atlas`
- `Socket.io`
- `React + Vite`
- `ioredis`
- `Mongoose`

---

## Running the Project

From the project root:

```powershell
npm run dev
```

This starts:

- API server
- worker pool
- dashboard

Typical endpoints:

- API health: `http://localhost:3000/health`
- dashboard: `http://localhost:5173`

If Vite detects a port conflict, it may start on another nearby port such as `5174`.

---

## Benchmark

Forge includes a load-generation CLI for queue stress testing.

Example:

```powershell
npm run benchmark -- --jobs 1000 --concurrency 20
```

---

## Security and Portfolio Notes

- runtime secrets are intentionally excluded from version control
- hosted infrastructure credentials should be rotated if ever exposed
- this repository is published for review, not reuse
- the codebase should be treated as read-only portfolio material

---

## Author

Vidit Pandey

Backend and distributed systems portfolio project built for technical evaluation.
