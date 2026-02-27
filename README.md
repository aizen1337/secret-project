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

## Conventions

- Keep route files minimal and logic-free.
- Prefer feature-local modules over global component sprawl.
- Keep Convex root files as wrappers; business logic belongs in `convex/features/**`.
- Avoid `any`/`as any` in new code; use typed DTOs/contracts.
