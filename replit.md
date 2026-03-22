# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── healthtrack/        # Expo React Native mobile app (iOS/Android/Web)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## HealthTrack App (`artifacts/healthtrack`)

An iOS-first personal health tracking app built with Expo React Native.

### Features
- **Medications**: Add/edit/delete medications with dosage, unit, pill count tracking
- **Compound Medications**: Mark a medication as compound (multiple ingredients), enter per-ingredient name + amount + unit; unlimited ingredients via + button; defaults to 2 fields; compound badge shown on card
- **Low Stock Alerts**: Configurable thresholds (e.g., alert when < 10 pills remain)
- **Medication Groups**: Group medications by time (morning, evening, etc.) for one-tap logging
- **Medication Reordering**: "Reorder" mode with up/down arrows; default sort = color order then name; `sortOrder` field persisted per medication; `reorderMedications()` in context
- **Skincare Products**: Add/edit/delete products with type (cleanser, serum, etc.) and brand
- **Skincare Routines**: Group products into AM/PM routines for one-tap logging
- **Today Dashboard**: Overview of today's stats, recent logs, and low-stock warnings
- **Haptic Feedback**: Tactile responses on key interactions
- **Data Persistence**: AsyncStorage for all data
- **PWA**: manifest.json at `/manifest.json`, custom SVG icon at `/icons/icon.svg`, `app/+html.tsx` with PWA meta tags; theme color #34C78B; standalone display mode

### Architecture
- **Routing**: Expo Router (file-based, tabs)
- **State**: React Context + useState with AsyncStorage persistence
- **UI**: React Native StyleSheet, Animated/Reanimated
- **Icons**: @expo/vector-icons (Ionicons, Feather)
- **Fonts**: Inter (400, 500, 600, 700 weights)
- **Theme**: Light/dark mode support via useColorScheme

### Tabs
1. **Today** (`app/(tabs)/index.tsx`) — Dashboard with stats and recent activity
2. **Medications** (`app/(tabs)/medications.tsx`) — Individual meds + groups
3. **Skincare** (`app/(tabs)/skincare.tsx`) — Individual products + routines

### Context
- `context/AppContext.tsx` — All app state and CRUD operations

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server.

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)
Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config.
Run codegen: `pnpm --filter @workspace/api-spec run codegen`
