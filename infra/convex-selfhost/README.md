# Convex Self-Hosted Local Stack

This folder contains a Docker Compose setup for local self-hosted Convex with a pinned release tag.

## Prerequisites

- Docker Desktop (or compatible Docker engine + Compose plugin)
- Node.js + npm

## First-time setup

1. Copy `.env.example` to `.env`:

```powershell
Copy-Item infra/convex-selfhost/.env.example infra/convex-selfhost/.env
```

2. Start stack:

```powershell
npm run local:convex:up
```

3. Generate admin key:

```powershell
docker compose -f infra/convex-selfhost/docker-compose.yml --env-file infra/convex-selfhost/.env exec backend ./generate_admin_key.sh
```

4. Put key into `.env.local.selfhost.example` as `CONVEX_SELF_HOSTED_ADMIN_KEY`, then switch profile:

```powershell
node scripts/switch-env.mjs selfhost
```

5. Verify:

```powershell
npm run local:convex:health
npm run local:convex:codegen
npm run local:convex:push
```

Important: `.env.local` must contain active (not commented) values for:
- `CONVEX_SELF_HOSTED_URL`
- `CONVEX_SELF_HOSTED_ADMIN_KEY`

If the Convex CLI asks you to connect/select a cloud project, you are not targeting self-host. Re-run:

```powershell
npm run local:env:selfhost
```

then verify the two keys above exist in `.env.local`, and run `npm run local:convex:push`.

## Useful commands

- `npm run local:convex:up`
- `npm run local:convex:down`
- `npm run local:convex:logs`
- `npm run local:convex:health`
- `npm run local:convex:push`
- `npm run local:loadtest:smoke`
- `npm run local:loadtest:race`
- `npm run local:loadtest:full`

## k6 via Docker (out of the box)

Load tests run through Docker Compose by default (service `k6`), so no local `k6` install is required.

- default runner: `LOADTEST_K6_RUNNER=docker`
- optional local binary mode: `LOADTEST_K6_RUNNER=local`

Examples:

```powershell
npm run local:loadtest:smoke
npm run local:loadtest:race
npm run local:loadtest:full
```

## Troubleshooting

- If health check fails, inspect logs: `npm run local:convex:logs`.
- If port conflicts occur, change `PORT`, `SITE_PROXY_PORT`, `DASHBOARD_PORT` in `infra/convex-selfhost/.env`.
- If `manifest unknown` appears, `REV` tag does not exist for one or both images; use `REV=latest` or a valid shared tag.
- If backend logs show `Couldn't hexdecode key`, `INSTANCE_SECRET` is not valid hex (must be 64 hex chars).
- If backend logs show `missing _tables.by_id global`, reset local data volume:
  - `docker compose -f infra/convex-selfhost/docker-compose.yml --env-file infra/convex-selfhost/.env down -v --remove-orphans`
  - then run `npm run local:convex:up` again.
