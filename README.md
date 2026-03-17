# Forge
## Distributed Task Queue Engine with Priority Scheduling, Retries, and Live Observability

Forge is a portfolio project that demonstrates how to build a production-style asynchronous job processing system using Node.js, Redis, MongoDB, clustered workers, and a React dashboard.

It was built to show practical distributed systems thinking, not just theory. The codebase covers queueing, retries, delayed execution, dead-letter handling, persistence, worker orchestration, and real-time metrics.

---

## Copyright and Usage Warning

**© 2026 Vidit Pandey. All Rights Reserved.**

This repository and its contents are provided strictly for **portfolio viewing and evaluation purposes only**.

- **DO NOT** copy, clone, fork, or reuse this code for your own project submissions.
- **DO NOT** claim this project, architecture, or implementation as your own work.
- **DO NOT** redistribute, re-license, or modify this codebase for public or private use.
- No license is granted to any person or organization obtaining access to this repository.

If you are a recruiter, interviewer, or hiring manager, you are welcome to review the source code to evaluate my engineering ability. Any other use is explicitly prohibited.

---

## What Forge Does

Forge allows applications to offload expensive or time-consuming work into a distributed background processing system.

Core capabilities:

- enqueue jobs through an HTTP API
- persist the full job lifecycle in MongoDB
- queue jobs in Redis using strict priority ordering
- process jobs through a clustered worker pool
- retry transient failures with exponential backoff and jitter
- move permanent failures into a dead-letter queue
- stream live queue and execution metrics to a React dashboard
- benchmark the system with a load-generation CLI

---

## Technical Architecture

Forge is organized as a producer-broker-consumer system with explicit persistence and observability layers.

### Producer Layer

- `Express API`
- accepts job requests
- validates payloads
- applies rate limiting
- stores jobs in MongoDB
- pushes job ids into Redis

### Broker Layer

- `Redis`
- high-priority queue
- default-priority queue
- delay queue via sorted set
- dead-letter queue
- sliding-window rate limiter
- metrics pub/sub channel

### Worker Layer

- `Node.js clustered worker pool`
- claims pending jobs atomically
- executes typed handlers with timeout enforcement
- publishes completion and failure metrics
- performs retry scheduling and DLQ routing

### Persistence Layer

- `MongoDB Atlas`
- stores job payload, state, result, timestamps, attempts, and errors
- acts as the durable source of truth

### Observability Layer

- `Socket.io + React dashboard`
- queue depth
- latency percentiles
- throughput chart
- recent activity feed

---

## Why This Project Matters

Forge demonstrates:

- distributed systems fundamentals
- async reliability patterns
- Redis-based broker design
- MongoDB-backed lifecycle persistence
- worker concurrency and orchestration
- retry and DLQ strategy
- real-time observability
- full-stack operational thinking

This is the kind of project that helps answer interview questions like:

- How would you design a background job processing system?
- How do you retry failed distributed jobs safely?
- How do you prioritize urgent work?
- How do you prevent job loss on worker failure?
- How do you observe a queueing system in real time?

---

## Repository Structure

```text
forge/
├── packages/
│   ├── api/          # Express producer API
│   ├── broker/       # Redis queue, delay queue, DLQ, rate limiter
│   ├── dashboard/    # React dashboard
│   ├── metrics/      # Metrics collector and Socket.io emitter
│   ├── persistence/  # MongoDB models and repository layer
│   └── worker/       # Worker pool, handlers, retries
├── benchmark/        # Load generation CLI
└── README.md
```

---

## Key Design Decisions

### MongoDB Is the Source of Truth

Forge writes jobs to MongoDB before enqueueing them in Redis. Redis stores only job ids, not full payloads. This keeps the broker lightweight and makes lifecycle tracking, querying, and retries cleaner.

### Priority Scheduling

Workers consume from the high-priority queue before the default queue so urgent work drains first.

### At-Least-Once Delivery

Forge favors reliability and recoverability over exactly-once semantics. Jobs can be retried or recovered, so handlers should ideally be idempotent.

### Retry with Jitter

Retryable failures are delayed using exponential backoff with jitter to avoid synchronized retry storms.

### Shared Redis Safety

Forge supports `REDIS_PREFIX`, so multiple apps can safely share one Redis instance without key collisions.

---

## Example Flow

1. Client sends `POST /jobs`
2. API validates input and rate-limits the request
3. API writes the job to MongoDB as `PENDING`
4. API pushes the job id into Redis
5. Worker pops the job id and atomically claims it
6. Handler executes with timeout protection
7. Job becomes `COMPLETED`, retried, or moved to `DLQ`
8. Metrics are published to Redis pub/sub
9. Dashboard receives live updates through Socket.io

---

## API Overview

### `POST /jobs`

Create a new background job.

### `GET /jobs/:id`

Fetch job status, result, and metadata.

### `GET /jobs`

List jobs with filters.

### `POST /jobs/:id/retry`

Manually retry a failed or DLQ job.

### `DELETE /jobs/:id`

Cancel a pending job.

### `GET /health`

Check API, Redis, and MongoDB connectivity.

### `GET /metrics`

Read the current metrics snapshot.

---

## Local and Hosted Setup Notes

Forge supports hosted infrastructure.

Current deployment style:

- `MongoDB Atlas`
- `Redis Cloud`

Secrets and runtime credentials are intentionally excluded from version control. Environment variables should be supplied through a local `.env` file and must never be committed.

---

## Run Commands

From the project root:

```powershell
npm run dev
```

This starts:

- API
- worker pool
- dashboard

Health endpoint:

```text
http://localhost:3000/health
```

Dashboard:

```text
http://localhost:5173
```

If Vite detects the port is already in use, it may choose another local port such as `5174`.

---

## Benchmarking

Forge includes a benchmark CLI for stress testing enqueue throughput.

Run:

```powershell
npm run benchmark -- --jobs 1000 --concurrency 20
```

---

## Security and Portfolio Notes

- environment variables are intentionally excluded
- hosted database and Redis credentials must be rotated if ever exposed
- this codebase is published for review, not reuse
- this repository should be treated as read-only portfolio material

---

## Author

Vidit Pandey

Portfolio project for backend, distributed systems, and infrastructure engineering evaluation.
