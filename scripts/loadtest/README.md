# Synthetic Loadtest Spec

This harness generates infrastructure load without real users, Clerk, or Stripe.  
It targets Convex HTTP query/mutation throughput and contention behavior.

## Scope

1. Read pressure: indexed bucket reads.
2. Write pressure: append-heavy sample writes.
3. Contention race: high concurrency increments on shared counter key.
4. System impact signals: latency, HTTP error rate, domain error rate, consistency checks.

## Prerequisites

1. `LOADTEST_MODE=true` in backend environment.
2. Self-hosted stack up: `npm run local:convex:up`.
3. Active self-host env profile in `.env.local`.

## Test Data Model

Convex test namespace: `loadtestSynthetic:*`

1. `loadtest_synthetic_samples`
2. `loadtest_synthetic_counters`

Seed command creates deterministic synthetic buckets and initial counter keys.

## Scenarios

### 1) Smoke

Command: `npm run local:loadtest:smoke`

Goal:
1. Fast health/perf sanity check.
2. Validate no immediate functional failures under moderate load.

Defaults:
1. Ramping arrival-rate traffic.
2. Lower VU envelope than full.

### 2) Race

Command: `npm run local:loadtest:race`

Goal:
1. Stress shared-write contention path.
2. Observe mutation latency under concurrent counter increments.

### 3) Full

Command: `npm run local:loadtest:full`

Goal:
1. Sustained mixed traffic at high concurrency.
2. Surface bottlenecks in CPU, I/O, DB read/write paths, and queue pressure.

## Workload Composition

Mixed traffic (`tests/load/k6/mixedTraffic.js`) default split:
1. `reads`: 50%
2. `writes`: 30%
3. `support/stats`: 20%

Endpoints:
1. `loadtestSynthetic:readSyntheticBucket` (query)
2. `loadtestSynthetic:writeSyntheticSample` (mutation)
3. `loadtestSynthetic:getSyntheticStats` (query)

Race traffic (`tests/load/k6/scenarios/overlapBookingRace.js`):
1. `loadtestSynthetic:incrementSyntheticCounter` (mutation)

## Runtime Controls

Common:
1. `LOADTEST_K6_RUNNER=docker|local` (default: `docker`)

Seed:
1. `LOADTEST_BUCKET_COUNT` (default `256`)
2. `LOADTEST_SAMPLES_PER_BUCKET` (default `32`)
3. `LOADTEST_PAYLOAD_SIZE` (default `256`)
4. `LOADTEST_RACE_KEY` (default `global`)

Mixed scenario:
1. `MIX_READ_PCT` / `MIX_WRITE_PCT` / `MIX_SUPPORT_PCT`
2. `MIX_START_RATE`, `MIX_TARGET_RATE`
3. `MIX_RAMP`, `MIX_STEADY`, `MIX_COOLDOWN`
4. `MIX_PREALLOCATED_VUS`, `MIX_MAX_VUS`
5. `MIX_READ_LIMIT`, `MIX_WRITE_PAYLOAD_SIZE`

Race scenario:
1. `RACE_VUS`
2. `RACE_DURATION`
3. `RACE_DELTA`
4. `RACE_KEY`

## Concurrent Users (Human-Readable)

These runners use k6 virtual users (VUs).  
Think of **1 VU as 1 simulated active user session**.

### Mixed traffic (`smoke` / `full`)

The mixed scenario uses `ramping-arrival-rate`, so k6 targets a request rate and scales active VUs as needed.

1. `MIX_PREALLOCATED_VUS`:
   - number of simulated users prepared up front.
   - this is your immediate concurrency pool at test start.
2. `MIX_MAX_VUS`:
   - hard cap for how many simulated users k6 can run at once.
   - real concurrency will never exceed this number.
3. `MIX_TARGET_RATE`:
   - target requests per second.
   - if request latency rises, k6 needs more VUs to maintain this rate, up to `MIX_MAX_VUS`.

Default practical interpretation:
1. `smoke`: about `200-300` concurrent simulated users (preallocated 200, cap 300).
2. `full`: up to `5000` concurrent simulated users (preallocated 500, cap 5000).

### Race scenario (`race`)

The race scenario uses fixed `vus` executor.

1. `RACE_VUS` directly equals concurrent simulated users.
2. All those users execute the same hot mutation path in parallel.

Default practical interpretation:
1. standard race: `1500` concurrent simulated users.
2. full pipeline race: up to `5000` concurrent simulated users.

### Important note

“Concurrent users” here means **load-generator sessions**, not unique logged-in accounts.  
Since this synthetic harness is auth-free, concurrency reflects infrastructure pressure, not human identity count.

## Execution Flow

1. `npm run local:loadtest:seed`
2. `npm run local:loadtest:smoke` (baseline sanity)
3. `npm run local:loadtest:race` (contention profile)
4. `npm run local:loadtest:full` (capacity profile)
5. `npm run local:loadtest:reset`

## Artifacts and Metrics

Output directory: `artifacts/loadtest/<run-id>/`

1. `run-meta.json`: mode, host, start time.
2. `snapshot-before.json`: pre-run synthetic stats.
3. `*-summary.json`: k6 latency/error stats.
4. `checks.json`: post-run consistency checks.
5. `snapshot-after.json`: post-run synthetic stats.
6. `timeline.log`: scenario start/end timestamps.

Primary KPIs:
1. `http_req_duration` p50/p95/p99.
2. `http_req_failed` rate.
3. `convex_http_errors` and `convex_domain_errors`.
4. Consistency violation count from validator.

## Pass/Fail Baseline (Initial)

Use as initial threshold, then tune per machine/profile:
1. `http_req_failed < 2%` (mixed)
2. `http_req_failed < 5%` (race)
3. Zero consistency violations.
4. Stable p95 trend run-to-run for same config.

## Slowdown Debug Guide

If app/website slows heavily under load:
1. Lower `MIX_TARGET_RATE` and retest to find knee point.
2. Compare `smoke` vs `full` p95/p99; large divergence indicates saturation.
3. Check backend container CPU/memory and Convex logs during run.
4. Run isolated `race` to separate contention from broad throughput bottlenecks.
5. Increase/decrease payload size to determine bandwidth vs compute sensitivity.
6. Correlate timeline spikes in `timeline.log` with container/resource graphs.
