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

### App Name
**Vital** — personal iOS-first health tracking app

### Features

#### Scheduling
- **ItemSchedule type**: `{ asNeeded: true }` or `{ asNeeded: false, frequency, intervalDays, times: string[], startDate: string }`
- Medications and skincare products both have a required `schedule` field
- Frequency options: Daily / Every Other Day / Weekly / Custom (N days)
- Multiple timed slots per day (up to 4) via TimePicker component

#### Today Timeline Dashboard
- **Date navigation**: left/right arrow nav, max date = today
- **Incomplete timeline**: Groups of scheduled items not yet done, sorted by time
- **Complete timeline**: Groups that have been completed, with green checkmark
- **Group cards**: Show time slot, type label, item count badge, item names; circle-check button completes all items in the group in one tap (950ms animation then data update)
- **GroupDetailModal**: Bottom sheet with individual complete/undo per item; notes display for medications; expiry warnings for skincare products; "All done!" banner when group fully complete
- **Reactions section**: Reaction notes logged today appear below the Complete timeline
- **Log Reactions CTA**: Button linking to skincare-reactions screen

#### Notifications Bell
- Bell icon in Today header with unread count badge (red dot)
- Links to `/notifications` modal screen
- Weekly insights (Sundays) and monthly summaries (1st of month) generated in AppContext
- Notifications: `{ id, message, detail?, type: "insight"|"general", createdAt: string (ISO), read }`

#### Skincare Expiry Tracking
- Optional expiry date on products (month + year chip pickers)
- `isDateExpired()` and `isDateExpiringSoon()` helpers in scheduleCompute
- Expiry warning strips shown in group cards and GroupDetailModal
- Colors: expired = `colors.danger`, expiring soon = `colors.amber`

#### Skincare Reaction Logging
- `/skincare-reactions` modal screen
- Product picker (horizontal scroll chips), sentiment (positive/neutral/negative), free-text note
- Stored in `dayLogs[date].reactionNotes` array via `logSkincareReaction()`
- Today's reactions shown on the reactions screen and in Today timeline

#### Medication Notes
- Free-text notes field on each medication
- Toggle-expand notes in GroupDetailModal

#### Medical Disclaimers
- First add of day: usage disclaimer alert (stored date in `@vital_disclaimer_date`)
- Second item ever (combined med+skincare): drug interaction disclosure alert (one-time, `@vital_interaction_disclosure_shown`)

#### Low Stock Alerts
- Configurable refill threshold; refill banner on Today screen

#### Compound Medications
- Multiple ingredients; compound badge on card

### Data Types (AppContext)
- `ItemSchedule`, `DayLogEntry`, `DayLog`, `SkincareReactionNote`, `AppNotification`
- `DayLog` keyed by `"YYYY-MM-DD"`: `{ date, entries: DayLogEntry[], reactionNotes: SkincareReactionNote[] }`
- `DayLogEntry`: `{ id, itemId, itemName, itemType, scheduledTime, isComplete, completedAt? }`
- Storage keys: `@vital_day_logs`, `@vital_notifications`, `@vital_disclaimer_date`, `@vital_interaction_disclosure_shown`, `@vital_insights_last_weekly`, `@vital_insights_last_monthly`

### Utility: `utils/scheduleCompute.ts`
- `shouldAppearOnDate(schedule, date)` — checks if an item should appear on a given date
- `formatTime(hhmm)` → "8:00 AM"
- `formatNavDate(date)` → "Today" / "Yesterday" / "March 28"
- `todayString()`, `toDateString(date)`
- `isDateExpired(date)`, `isDateExpiringSoon(date, daysThreshold=30)`

### Components
- `components/ui/TimePicker.tsx` — hour/minute/AM-PM chip picker modal
- `components/today/GroupDetailModal.tsx` — bottom sheet for group item detail
- `components/medications/AddMedicationModal.tsx` — full schedule + notes + disclaimers
- `components/skincare/AddSkincareProductModal.tsx` — full schedule + expiry + disclaimers

### Screens
- `app/(tabs)/index.tsx` — Today Timeline Dashboard
- `app/notifications.tsx` — Notifications modal (push from bell icon)
- `app/skincare-reactions.tsx` — Skincare reaction logger modal

### Architecture
- **Routing**: Expo Router (file-based, tabs + modal stack)
- **State**: React Context + useState with AsyncStorage persistence
- **UI**: React Native StyleSheet, Animated/Reanimated
- **Icons**: @expo/vector-icons (Ionicons, Feather) + MaterialCommunityIcons via AppIcon
- **Fonts**: Inter (400, 500, 600, 700 weights)
- **Theme**: Light/dark mode; `useTheme()` → `colors.*`; use `colors.danger` (not `colors.coral`) for red

### Tabs
1. **Today** (`app/(tabs)/index.tsx`) — Timeline dashboard
2. **Medications** (`app/(tabs)/medications.tsx`) — Individual meds + groups
3. **Skincare** (`app/(tabs)/skincare.tsx`) — Individual products + routines
4. **Settings** (`app/(tabs)/settings.tsx`)

### Context
- `context/AppContext.tsx` — All app state, CRUD, day log building, insights runner, notification store

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
