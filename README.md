# ⚡ Flash Sale Backend Architecture

A highly concurrent, distributed, and event-driven backend system designed specifically for Flash Sales. It ensures absolute data consistency, prevents overselling (race conditions), and handles massive bursts of traffic gracefully by heavily deferring database writes through a Message Broker and leveraging In-Memory Caching.

## 🏗️ Architecture & Tech Stack

*   **API Framework:** Node.js + Express.js (Monorepo Workspaces)
*   **In-Memory Store (Atomicity & Caching):** Redis (via `ioredis`)
*   **Message Broker (Event Streaming):** Apache Kafka (KRaft mode via `kafkajs`)
*   **Relational Database:** PostgreSQL (via Prisma ORM)
*   **Load Testing:** Autocannon
*   **Orchestration:** Docker Compose

---

## 🚀 Core Features

1.  **Atomic Inventory Management:** Uses Redis Lua scripts to evaluate and decrement stock in a single, atomic operation. Completely eliminates application-level race conditions.
2.  **Idempotency Layer:** Prevents duplicate orders from network retries. Identical requests with the same `Idempotency-Key` return a cached `202 Accepted` response instantly without re-decrementing stock or firing duplicate Kafka events.
3.  **High-Speed Read-Cache Polling:** Clients short-poll a Redis cache to get order status and payment links, completely protecting the PostgreSQL database from read-heavy traffic spikes during the checkout window.
4.  **Event-Driven Database Writes:** API nodes simply accept requests and push events to Kafka. Dedicated worker nodes (`order-consumer`) process these events asynchronously to write to PostgreSQL and interface with 3rd-party Payment Gateways.
5.  **Automated Reconciliation:** A dedicated `expiry-server` cron worker sweeps the database for abandoned `PENDING` orders, automatically reverting stock back into Redis to maximize sales.

---

## 📈 Performance & Load Test Metrics

The system was load-tested using `autocannon`, simulating **500 concurrent users** hammering the API over **10 seconds** for a product with exactly **100 units** in stock.

### Load Test Results

```text
--- Starting Autocannon Load Test ---
Target: http://localhost:3000/api/orders
Connections: 500
Duration: 10 seconds

┌─────────┬───────┬────────┬────────┬────────┬───────────┬──────────┬─────────┐
│ Stat    │ 2.5%  │ 50%    │ 97.5%  │ 99%    │ Avg       │ Stdev    │ Max     │
├─────────┼───────┼────────┼────────┼────────┼───────────┼──────────┼─────────┤
│ Latency │ 57 ms │ 103 ms │ 173 ms │ 473 ms │ 138.66 ms │ 476.5 ms │ 9944 ms │
└─────────┴───────┴────────┴────────┴────────┴───────────┴──────────┴─────────┘
┌───────────┬────────┬────────┬────────┬────────┬─────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg     │ Stdev  │ Min    │
├───────────┼────────┼────────┼────────┼────────┼─────────┼────────┼────────┤
│ Req/Sec   │ 989    │ 989    │ 2,711  │ 3,055  │ 2,609.4 │ 571.24 │ 989    │
└───────────┴────────┴────────┴────────┴────────┴─────────┴────────┴────────┘

Total Requests: 26,088 (in 10.26s)
2xx Responses (Accepted): 100
4xx Responses (Rejected/Out of Stock): 25,988
5xx Responses (Server Errors): 0
```

### Integrity Verification
Despite processing **~2,600 requests per second** concurrently against the same product:
*   **Final Redis Stock:** `0` (Expected: 0) - **✅ No negative stock / race conditions.**
*   **Total Orders in Database:** `100` (Expected: 100) - **✅ Perfect consistency (Zero overselling).**

---

## 🛣️ System Flow

1.  **Client Request:** User hits `POST /api/orders` with `productId` and an `Idempotency-Key`.
2.  **Idempotency & Stock Check:** `order-service` checks Redis for previous successful requests. If none, it executes the Atomic Lua script. If stock > 0, it decrements stock.
3.  **Queue Event:** `order-service` pushes `{orderId, userId, productId}` to the `order-events` Kafka topic and returns `202 Accepted` to the client.
4.  **Client Polling:** Client begins short-polling `GET /api/orders/status/:orderId`.
5.  **Consumer Processing:** `order-consumer` reads from Kafka, creates a `PENDING` record in Postgres, generates a Payment Gateway Link, and caches that link in Redis (`payment:link:${orderId}`).
6.  **Polling Success:** The client's polling request hits the Redis cache, gets the payment link, and redirects the user.
7.  **Webhook Success:** Payment gateway fires `POST /api/orders/webhook`, which updates the Postgres record to `PAID` and cleans up the Redis cache.

---

## 🛠️ Getting Started

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/)
*   [Node.js](https://nodejs.org/) (v20+)

### 1. Spin up the Infrastructure
Start the orchestrated containers (Postgres, Redis, Kafka, and Node.js microservices).
```bash
docker-compose up --build -d
```

### 2. Install Local Dependencies & Migrate DB
Install the monorepo workspace dependencies and run Prisma migrations.
```bash
npm install

# Map local DB connection to the exposed Docker port
# (Windows PowerShell):
$env:DATABASE_URL="postgresql://user:password@localhost:5433/flashsale"
# (Mac/Linux):
# export DATABASE_URL="postgresql://user:password@localhost:5433/flashsale"

npm run db:migrate
```

### 3. Run E2E Test Flow
Simulates a single user placing an order, polling the cache, clicking the payment link, and verifying the Webhook state transition.
```bash
node test-flow.js
```

### 4. Run Load Test
Fires up 500 concurrent connections to attempt to drain 100 units of stock as fast as possible, verifying strict database consistency afterward.
```bash
node load-test.js
```
