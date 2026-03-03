# Secret Project

Cross-platform Expo + Convex marketplace app with strict feature-slice frontend and thin-wrapper Convex entrypoints.

## Architecture

### Frontend
- `app/**`: route shells only (delegates to feature screens).
- `features/<feature>/{screens,hooks,ui,helpers,types,api}`: feature implementation.
- Global shared only:
  - `components/ui/*`
  - `components/feedback/*`
  - `lib/*` core utilities (theme, i18n, errors)
  - `hooks/useAppLanguage.ts`

### Backend (Convex)
- `convex/*.ts`: thin API wrappers exporting from feature entrypoints.
- `convex/features/*/{application,domain,infrastructure,contracts}`:
  - `application`: orchestration/use-cases
  - `domain`: pure rules
  - `infrastructure`: adapters/repositories
  - `contracts`: DTO/contracts
- `convex/core/*`: cross-cutting backend primitives.

## Quality Gates

- `npm run lint`: ESLint + internal handler rule + architecture rules.
- `npm run lint:arch`: route shells, convex thin wrappers, no `@ts-nocheck`.
- `npm run typecheck`: TypeScript no-emit check.
- `npm run test:unit`: Vitest unit tests for extracted pure logic.

## Scripts

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run stripe:webhook:setup`
- `npm run stripe:reconcile-stale-checkout`
- `npm run local:convex:up`
- `npm run local:convex:down`
- `npm run local:convex:logs`
- `npm run local:convex:health`
- `npm run local:convex:codegen`
- `npm run local:convex:push`
- `npm run local:env:selfhost`
- `npm run local:env:cloud`
- `npm run local:loadtest:seed`
- `npm run local:loadtest:smoke`
- `npm run local:loadtest:race`
- `npm run local:loadtest:full`
- `npm run local:loadtest:reset`
- `npm run local:seed:marketplace`
- `npm run local:seed:absurd-listings`
- `npm run local:seed:reset`

## Self-Hosted Convex (Local)

- Stack config: `infra/convex-selfhost/`
- Bring-up guide: `infra/convex-selfhost/README.md`
- Load/race harness: `tests/load/README.md`

### Quick start

1. `Copy-Item infra/convex-selfhost/.env.example infra/convex-selfhost/.env`
2. `npm run local:convex:up`
3. Generate admin key:
   - `docker compose -f infra/convex-selfhost/docker-compose.yml --env-file infra/convex-selfhost/.env exec backend ./generate_admin_key.sh`
4. Put key in `.env.local.selfhost.example`, then `npm run local:env:selfhost`
5. `npm run local:convex:health`
6. `npm run local:loadtest:seed`
7. `npm run local:loadtest:full`

### Local dataset seeding (script-based)

- `npm run local:seed:marketplace` seeds users/hosts/cars/bookings/payments/chats/messages/reviews/deposit cases.
- `npm run local:seed:absurd-listings` seeds a large car-heavy dataset for listing/search tests.
- `npm run local:seed:reset` deletes `[LT]`-tagged seeded data from related tables.

## Conventions

- Keep route files minimal and logic-free.
- Prefer feature-local modules over global component sprawl.
- Keep Convex root files as wrappers; business logic belongs in `convex/features/**`.
- Avoid `any`/`as any` in new code; use typed DTOs/contracts.
