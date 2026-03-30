/**
 * Unit tests for utils/adherence.ts
 * Run: pnpm --filter @workspace/api-server exec tsx --tsconfig artifacts/healthtrack/__tests__/tsconfig.json artifacts/healthtrack/__tests__/adherence.test.ts
 */

import assert from "node:assert/strict";

// ─── Inline the types we need (avoids pulling in React Native context) ─────
type ItemSchedule =
  | { asNeeded: true }
  | { asNeeded: false; frequency: string; intervalDays: number; times: string[]; startDate: string };

type DayLogEntry = { itemId: string; itemName: string; isComplete: boolean; [k: string]: any };
type DayLog = { date: string; entries: DayLogEntry[] };

// ─── Inline shouldAppearOnDate (same logic as scheduleCompute.ts) ──────────
function shouldAppearOnDate(schedule: ItemSchedule, dateStr: string): boolean {
  if (schedule.asNeeded) return false;
  const start = new Date((schedule as any).startDate + "T12:00:00");
  const target = new Date(dateStr + "T12:00:00");
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (diffDays < 0) return false;
  return diffDays % (schedule as any).intervalDays === 0;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Inline computeItemAdherence (same logic as adherence.ts) ─────────────
function iterDatesFromTo(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(startStr + "T12:00:00");
  const end = new Date(endStr + "T12:00:00");
  while (current <= end) {
    dates.push(toDateString(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

type AdherenceItem = {
  itemId: string; itemName: string; color: string; startDate: string;
  expectedDays: number; completedDays: number; missedDays: number;
  adherencePct: number; longestStreak: number; currentStreak: number;
};

function computeItemAdherence(
  itemId: string, itemName: string, color: string,
  schedule: ItemSchedule, dayLogs: Record<string, DayLog>, todayStr: string,
): AdherenceItem | null {
  if (schedule.asNeeded || !(schedule as any).startDate) return null;
  const startDate: string = (schedule as any).startDate;
  if (startDate > todayStr) return null;
  const allDates = iterDatesFromTo(startDate, todayStr);
  const expectedDates: string[] = [];
  const completedSet = new Set<string>();
  for (const dateStr of allDates) {
    if (shouldAppearOnDate(schedule, dateStr)) {
      expectedDates.push(dateStr);
      const log = dayLogs[dateStr];
      if (log) {
        const entry = log.entries.find(e => e.itemId === itemId && e.isComplete);
        if (entry) completedSet.add(dateStr);
      }
    }
  }
  const expectedDays = expectedDates.length;
  const completedDays = completedSet.size;
  const missedDays = expectedDays - completedDays;
  const adherencePct = expectedDays > 0 ? Math.round((completedDays / expectedDays) * 100) : 0;
  let longestStreak = 0, tempStreak = 0;
  for (const d of expectedDates) {
    if (completedSet.has(d)) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak); }
    else tempStreak = 0;
  }
  let currentStreak = 0;
  for (let i = expectedDates.length - 1; i >= 0; i--) {
    if (completedSet.has(expectedDates[i])) currentStreak++;
    else break;
  }
  return { itemId, itemName, color, startDate, expectedDays, completedDays, missedDays, adherencePct, longestStreak, currentStreak };
}

// ─── Test runner ──────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const results: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    results.push(`  ✗ ${name}\n      ${e.message}`);
    failed++;
  }
}

// ─── Helper factories ──────────────────────────────────────────────────────
function dailySchedule(startDate: string): ItemSchedule {
  return { asNeeded: false, frequency: "daily", intervalDays: 1, times: ["08:00"], startDate };
}

function makeDayLogs(doneOnDates: string[], itemId: string): Record<string, DayLog> {
  const logs: Record<string, DayLog> = {};
  for (const date of doneOnDates) {
    logs[date] = { date, entries: [{ itemId, itemName: "Test Item", isComplete: true }] };
  }
  return logs;
}

// ─── Tests ────────────────────────────────────────────────────────────────

test("returns null for asNeeded schedule", () => {
  const result = computeItemAdherence("id1", "Med", "#f00", { asNeeded: true }, {}, "2025-03-10");
  assert.equal(result, null);
});

test("returns null when startDate is in the future", () => {
  const result = computeItemAdherence("id1", "Med", "#f00", dailySchedule("2030-01-01"), {}, "2025-03-10");
  assert.equal(result, null);
});

test("100% adherence when all days completed", () => {
  const logs = makeDayLogs(["2025-03-01", "2025-03-02", "2025-03-03"], "id1");
  const result = computeItemAdherence("id1", "Med", "#f00", dailySchedule("2025-03-01"), logs, "2025-03-03");
  assert.ok(result, "should not be null");
  assert.equal(result!.expectedDays, 3);
  assert.equal(result!.completedDays, 3);
  assert.equal(result!.missedDays, 0);
  assert.equal(result!.adherencePct, 100);
  assert.equal(result!.longestStreak, 3);
  assert.equal(result!.currentStreak, 3);
});

test("0% adherence when nothing completed", () => {
  const result = computeItemAdherence("id1", "Med", "#f00", dailySchedule("2025-03-01"), {}, "2025-03-05");
  assert.ok(result);
  assert.equal(result!.expectedDays, 5);
  assert.equal(result!.completedDays, 0);
  assert.equal(result!.adherencePct, 0);
  assert.equal(result!.longestStreak, 0);
  assert.equal(result!.currentStreak, 0);
});

test("50% adherence with partial completion", () => {
  // 10 days, done on days 1,2,3,4,5 (first half)
  const doneDates = ["2025-01-01","2025-01-02","2025-01-03","2025-01-04","2025-01-05"];
  const logs = makeDayLogs(doneDates, "id1");
  const result = computeItemAdherence("id1", "Med", "#f00", dailySchedule("2025-01-01"), logs, "2025-01-10");
  assert.ok(result);
  assert.equal(result!.expectedDays, 10);
  assert.equal(result!.completedDays, 5);
  assert.equal(result!.adherencePct, 50);
});

test("longestStreak is computed correctly with gaps", () => {
  // Completed on days 1,2,3, then missed 4, then completed 5,6
  const doneDates = ["2025-01-01","2025-01-02","2025-01-03","2025-01-05","2025-01-06"];
  const logs = makeDayLogs(doneDates, "id1");
  const result = computeItemAdherence("id1", "Med", "#f00", dailySchedule("2025-01-01"), logs, "2025-01-06");
  assert.ok(result);
  assert.equal(result!.longestStreak, 3, "longest streak should be 3 (days 1-3)");
  assert.equal(result!.currentStreak, 2, "current streak should be 2 (days 5-6)");
});

test("currentStreak is 0 when most recent day missed", () => {
  const doneDates = ["2025-01-01","2025-01-02","2025-01-03"];
  const logs = makeDayLogs(doneDates, "id1");
  // today is 2025-01-05, missed day 4 and 5
  const result = computeItemAdherence("id1", "Med", "#f00", dailySchedule("2025-01-01"), logs, "2025-01-05");
  assert.ok(result);
  assert.equal(result!.currentStreak, 0, "current streak should be 0 since recent days are missed");
  assert.equal(result!.longestStreak, 3);
});

test("every-other-day: only expected dates count in adherence", () => {
  // Start Jan 1, every other day: Jan 1, 3, 5, 7 are expected (4 days)
  const schedule: ItemSchedule = { asNeeded: false, frequency: "every-other-day", intervalDays: 2, times: ["08:00"], startDate: "2025-01-01" };
  // Completed Jan 1 and Jan 3 (2 of 4)
  const logs = makeDayLogs(["2025-01-01", "2025-01-03"], "id1");
  const result = computeItemAdherence("id1", "Med", "#f00", schedule, logs, "2025-01-07");
  assert.ok(result);
  assert.equal(result!.expectedDays, 4, "should have 4 expected days (Jan 1,3,5,7)");
  assert.equal(result!.completedDays, 2);
  assert.equal(result!.adherencePct, 50);
  assert.equal(result!.longestStreak, 2, "longest streak of 2 consecutive expected days");
});

test("single-day schedule (startDate === today): 1 expected day", () => {
  const logs = makeDayLogs(["2025-06-15"], "id1");
  const result = computeItemAdherence("id1", "Med", "#f00", dailySchedule("2025-06-15"), logs, "2025-06-15");
  assert.ok(result);
  assert.equal(result!.expectedDays, 1);
  assert.equal(result!.completedDays, 1);
  assert.equal(result!.adherencePct, 100);
  assert.equal(result!.longestStreak, 1);
  assert.equal(result!.currentStreak, 1);
});

test("adherencePct rounds correctly (not floor)", () => {
  // 2 of 3 = 66.67 → rounds to 67
  const logs = makeDayLogs(["2025-03-01", "2025-03-02"], "id1");
  const result = computeItemAdherence("id1", "Med", "#f00", dailySchedule("2025-03-01"), logs, "2025-03-03");
  assert.ok(result);
  assert.equal(result!.adherencePct, 67);
});

test("weekly schedule: 3 weeks, 2 completed", () => {
  const schedule: ItemSchedule = { asNeeded: false, frequency: "weekly", intervalDays: 7, times: ["08:00"], startDate: "2025-01-06" };
  // Expected: Jan 6, Jan 13, Jan 20; completed Jan 6 and Jan 20
  const logs = makeDayLogs(["2025-01-06", "2025-01-20"], "id1");
  const result = computeItemAdherence("id1", "Med", "#f00", schedule, logs, "2025-01-20");
  assert.ok(result);
  assert.equal(result!.expectedDays, 3);
  assert.equal(result!.completedDays, 2);
  assert.equal(result!.adherencePct, 67);
  assert.equal(result!.longestStreak, 1, "no consecutive weekly completions (missed Jan 13)");
  assert.equal(result!.currentStreak, 1);
});

// ─── Summary ────────────────────────────────────────────────────────────

console.log("\nadherence.ts tests:");
results.forEach(r => console.log(r));
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
