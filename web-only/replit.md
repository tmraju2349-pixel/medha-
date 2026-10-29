# Medha AI Cognitive Care

An elderly-friendly mobile companion for daily routines, voice diary capture, cognitive care, and caregiver safety support.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/medha-ai/app/(tabs)/index.tsx` — Home module
- `artifacts/medha-ai/app/(tabs)/games.tsx` — Games module placeholder
- `artifacts/medha-ai/app/(tabs)/voice.tsx` — Voice Diary module foundation
- `artifacts/medha-ai/app/(tabs)/memory.tsx` — Memory Assistant placeholder
- `artifacts/medha-ai/app/(tabs)/more.tsx` — safety and settings surface
- `artifacts/medha-ai/context/AppContext.tsx` — local persisted app state
- `artifacts/medha-ai/components/` — reusable screen, task, and microphone controls
- `artifacts/medha-ai/constants/colors.ts` — product color tokens
- `lib/api-spec/openapi.yaml` — shared API contract for future caregiver/server features

## Architecture decisions

- The first mobile build is offline-first and persists routine state with AsyncStorage.
- Module routes are kept as separate Expo Router screens so each user-facing module can evolve independently.
- The persistent microphone is shared across screens and its position is a user preference.
- Safety messaging uses a calm interaction model; future SOS escalation will be separate from routine reminders.
- Keep the project within free-tier services and avoid paid infrastructure unless the user explicitly approves a change.

## Product

The current build includes a Home routine with time-aware greeting, daily streak, care tasks, local completion/snooze state, notifications indicator, gentle note, and SOS entry point. Games and Memory Assistant have clear empty states, Voice Diary has its storage-ready foundation, and More includes microphone placement plus safety/settings entry points.

## User preferences

- Save completed source by clearly named module and shared component areas.
- Build the patient-facing mobile application first; the caregiver web portal follows later.

## Gotchas

- The Expo preview starts through the managed `artifacts/medha-ai: expo` workflow.
- Background location, native alarms, audio recording, and push/SMS escalation should be added in dedicated follow-up modules with native permission handling.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
