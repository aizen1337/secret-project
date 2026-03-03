# Load / Race Harness

This folder contains k6 workloads and consistency validators for local self-hosted Convex stress tests.

## Scenarios

- `k6/mixedTraffic.js`: mixed realistic traffic (reads/writes/support paths)
- `k6/scenarios/overlapBookingRace.js`: overlapping booking contention race

## Outputs

Each run writes to `artifacts/loadtest/<run-id>/`:

- `*-summary.json` (k6 summary)
- `checks.json` (consistency checks)
- `timeline.log` (run timeline)
- `snapshot-before.json` / `snapshot-after.json`

## Run sequence

1. Start self-hosted backend:
   - `npm run local:convex:up`
2. Switch env profile:
   - `npm run local:env:selfhost`
3. Seed deterministic synthetic dataset:
   - `npm run local:loadtest:seed`
4. Run tests:
   - `npm run local:loadtest:smoke`
   - `npm run local:loadtest:race`
   - `npm run local:loadtest:full`
5. Optional cleanup:
   - `npm run local:loadtest:reset`
