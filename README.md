# ⚡ Forge: Distributed Task Queue Engine

[![Live Demo](https://img.shields.io/badge/Live_Dashboard-forge.viditpandey.in-00E676?style=for-the-badge)](https://forge.viditpandey.in)
[![Developer](https://img.shields.io/badge/Developer-Vidit_Pandey-007EC6?style=for-the-badge)](https://viditpandey.in)

> **A high-performance, distributed background task queue engine modeled after enterprise execution systems.**

Forge is a scalable, resilient async job platform built rigorously on **Node.js, Redis, and MongoDB**. It solves the hardest parts of distributed background processing—concurrency orchestration, network fallacies, and recovery—giving developers a drop-in execution layer complete with beautiful real-time operational observability.

This project was intentionally architected as a **portfolio artifact** for engineering leaders, technical recruiters, and interviewers evaluating backend, systems, and infrastructure engineering ability.

---

## 🛑 Copyright and Usage Warning

**Copyright © 2026 Vidit Pandey. All Rights Reserved.**

This repository is provided strictly for **portfolio review and technical evaluation**.
- **DO NOT** copy this project and present it as your own work.
- **DO NOT** reuse this codebase for assignments, portfolio submissions, freelance work, or commercial use.
- **DO NOT** redistribute, re-license, or republish this repository in whole or in part.
- No license is granted to any individual or organization obtaining access to this source code.

If you are a recruiter, interviewer, or hiring manager, you are welcome to inspect the repository to evaluate implementation quality and technical depth. Any other use is explicitly prohibited.

---

## 🚀 Key Enterprise Capabilities

Forge doesn't just execute code; it guarantees execution predictability under heavy volatility.

*   **Priority Routing:** Urgent jobs dynamically jump the queue and bypass standard traffic.
*   **Delayed & Scheduled Execution:** Time-lock jobs in Redis Sorted Sets until exact execution timestamps.
*   **Self-Healing Fault Tolerance:** Transient failures trigger isolated exponential backoff retries with jitter to prevent network retry storms.
*   **Dead-Letter Queue (DLQ) Quarantining:** Poison messages and permanently failed jobs are safely surgically isolated for manual inspection.
*   **Live Observability Telemetry:** Every Node.js worker streams millisecond-perfect telemetry (throughput, latency percentiles, queue depths) down to a React dashboard via Socket.io.

> **Interview Context:** *This architecture provides concrete answers to complex distributed systems interview questions like: "How do you recover from worker crashes during a transaction?", "How do you handle poison messages without blocking a queue?", and "How do you observe horizontal cluster throughput in real-time?"*

---

## 🏗️ Architecture Stack

Forge follows a strict producer-broker-consumer monorepo model with dedicated persistence and observability layers.

### 1. Producer Layer (`@forge/api`)
The Express API gatekeeper. Validates incoming HTTP payloads, enforces generic sliding-window rate limits, safely persists the initial payload lifecycle to MongoDB, and strips heavy data to push purely lightweight Job IDs into Redis.

### 2. Broker Layer (`@forge/broker`)
The Redis routing engine. Orchestrates high/default priority lists, Sorted Set delay queues, and sliding-window limits. It also acts as the ultra-fast Pub/Sub nervous system for broadcasting cluster metrics.

### 3. Execution Layer (`@forge/worker`)
The clustered Node.js execution engine. Workers run controlled sequential Redis pulling loops to safely max out asynchronous concurrency without tripping PaaS connection limits. They atomically claim jobs, execute isolated handler logic, and calculate programmatic delays automatically upon failure.

### 4. Persistence Layer (`@forge/persistence`)
MongoDB Atlas acts as the durable system of record. Every payload, attempt counter, execution timestamp, and final result/error stack trace is durably stored here so State is never lost in transit.

### 5. Observability UI (`packages/dashboard`)
A stunning Vite + React telemetry dashboard. Subscribes securely directly to the API's WebSocket tunnel to graph live queue depths and P50/P99 latency without querying the database.

---

## ⚙️ Running Locally

The entire distributed cluster can be launched seamlessly via a custom monorepo orchestration script.

```bash
# Clone and install dependencies
git clone https://github.com/viditpandey06/Forge.git
npm install

# Start the API, Worker Pool, and Dashboard concurrently
npm run dev
```
*   **API Health:** `http://localhost:3000/health`
*   **Dashboard:** `http://localhost:5173`

---

## 🧪 Load Testing & Benchmarking

Forge includes a highly efficient, bypass-API load-generation CLI used for aggressive stress testing the Redis ingestion speeds and Worker execution tracking logic.

```bash
npm run benchmark -- --jobs 5000 --concurrency 50
```

---

*Designed and engineered by [Vidit Pandey](https://viditpandey.in).*
