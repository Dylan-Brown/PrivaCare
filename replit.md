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
**PrivaCare** — privacy-first iOS-first personal health tracking app (previously named "Vital")

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
- First add of day: usage disclaimer alert (stored date in `@privacre_disclaimer_date`)
- Second item ever (combined med+skincare): drug interaction disclosure alert (one-time, `@privacre_interaction_disclosure_shown`)

#### Low Stock Alerts
- Configurable refill threshold; refill banner on Today screen

#### Compound Medications
- Multiple ingredients; compound badge on card

#### Push Notifications
- `utils/pushNotifications.ts` — schedules daily notifications per time slot using `expo-notifications`
- Identifier prefix `privacre_sch_` — ONE notification per unique scheduled time, listing all items due
- Auto-reschedules (debounced 1.5s) whenever medications or skincare products change (AppContext effect)
- `requestNotificationPermissions()` called on app launch in `_layout.tsx`
- Notification tap navigates to Today tab

#### Adherence View ("How Am I Doing?")
- `/adherence` modal screen — accessible via "How Am I Doing?" button at bottom of Today tab
- Medications / Skincare tab switcher
- Swipeable monthly calendar: green = all done, amber = partial, red = missed, grey = future
- Per-item adherence breakdown: adherence %, expected/completed/missed days, current & longest streak
- Overall adherence badge (e.g. "Outstanding!" / "Well done!" / "Keep going")
- `utils/adherence.ts` — `computeItemAdherence()`, `buildMedAdherence()`, `buildSkincareAdherence()`, `computeMonthDayAdherence()`

#### Skincare Feature Parity with Medications
- `SkincareProduct` now has `notes?: string` and `status?: "active" | "storage" | "history"`
- `migrateSkincareProduct()` defaults `status: "active"` for existing data
- `archiveSkincareProduct(id, "storage"|"history")` and `unarchiveSkincareProduct(id)` in AppContext
- Long-press on a skincare product shows: Edit, Move to Storage, Archive (History), Delete
- Storage and History products shown in collapsible sections below the active list
- Long-press on archived product: Restore to Active, (move between storage/history), Delete
- Notes field in Add/Edit Skincare Product modal (labeled "NOTES (OPTIONAL)")

#### Appearance / Theme
- `context/ThemeContext.tsx` — provides `ThemeProvider`, `useThemeContext()`, `SchemeOverride` type
- Stored in AsyncStorage under key `@privacre_theme` ("light" | "dark" | "system")
- Wraps the entire app in `_layout.tsx` (outermost, around SafeAreaProvider)
- Settings screen has an APPEARANCE section with Light / Auto / Dark three-way toggle
- `hooks/useTheme.ts` now re-exports `useThemeContext()` for backward compatibility

#### Welcome Onboarding Modal
- `components/onboarding/WelcomeModal.tsx` — shown on first launch only (key `@privacre_welcome_shown`)
- 6 swipeable cards: Welcome to PrivaCare, Today Timeline, Medications, Skincare, Reminders, 100% Private
- Dot navigation, Next/Get Started button, Skip shortcut
- Privacy-focused last card

#### PDF Health Report Export
- `utils/pdfExport.ts` — generates and shares a PDF using `expo-print` + `expo-sharing`
- Report includes: medication adherence stats, skincare adherence stats, medication details, skincare details, medical disclaimer
- Button in Settings under "REPORTS" section ("Export Health Report (PDF)")
- Uses the same `buildMedAdherence()` / `buildSkincareAdherence()` utilities as the adherence screen

#### NIH API Offline Retry Dialog
- `InteractionsBanner` now accepts `networkError?: boolean` prop
- When network error detected: shows a red "Couldn't reach NIH — offline?" banner with Retry button
- Error detection in `medications.tsx`: catches `TypeError` and messages containing "network"/"fetch"

### Data Types (AppContext)
- `ItemSchedule`, `DayLogEntry`, `DayLog`, `SkincareReactionNote`, `AppNotification`
- `DayLog` keyed by `"YYYY-MM-DD"`: `{ date, entries: DayLogEntry[], reactionNotes: SkincareReactionNote[] }`
- `DayLogEntry`: `{ id, itemId, itemName, itemType, scheduledTime, isComplete, completedAt? }`
- `SkincareProductStatus`: `"active" | "storage" | "history"`
- Storage keys: `@privacre_day_logs`, `@privacre_notifications`, `@privacre_disclaimer_date`, `@privacre_interaction_disclosure_shown`, `@privacre_insights_last_weekly`, `@privacre_insights_last_monthly`, `@privacre_welcome_shown`, `@privacre_healthkit_prompted`, `@privacre_theme`

### Utilities
- `utils/scheduleCompute.ts` — `shouldAppearOnDate()`, `formatTime()`, `formatNavDate()`, `todayString()`, `toDateString()`, `isDateExpired()`, `isDateExpiringSoon()`
- `utils/adherence.ts` — adherence computation and monthly calendar data
- `utils/pdfExport.ts` — HTML→PDF generation and sharing
- `utils/pushNotifications.ts` — Expo notifications scheduling

### Tests (`artifacts/healthtrack/__tests__/`)
- `scheduleCompute.test.ts` — 10 unit tests for schedule logic (run with `pnpm --filter @workspace/healthtrack test:unit`)
- `adherence.test.ts` — 11 unit tests for adherence calculation (streaks, pct, edge cases)
- E2E tests cover: Welcome modal, "How Am I Doing?" button, adherence screen, skincare notes field, settings PDF button

### Components
- `components/ui/TimePicker.tsx` — hour/minute/AM-PM chip picker modal
- `components/today/GroupDetailModal.tsx` — bottom sheet for group item detail
- `components/medications/AddMedicationModal.tsx` — full schedule + notes + disclaimers
- `components/skincare/AddSkincareProductModal.tsx` — full schedule + expiry + notes + disclaimers
- `components/onboarding/WelcomeModal.tsx` — first-launch onboarding carousel
- `components/medications/InteractionsBanner.tsx` — drug interaction display + offline retry UI

### Screens
- `app/(tabs)/index.tsx` — Today Timeline Dashboard + "How Am I Doing?" CTA
- `app/adherence.tsx` — Adherence modal screen with calendar and per-item stats
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
