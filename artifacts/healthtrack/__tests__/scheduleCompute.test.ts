/**
 * Unit tests for utils/scheduleCompute.ts
 * Run: pnpm --filter @workspace/api-server exec tsx --tsconfig artifacts/healthtrack/__tests__/tsconfig.json artifacts/healthtrack/__tests__/scheduleCompute.test.ts
 */

import assert from "node:assert/strict";
import { shouldAppearOnDate, toDateString, formatTime, formatFrequencyLabel } from "../utils/scheduleCompute";

let passed = 0;
let failed = 0;
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

// ─── shouldAppearOnDate ─────────────────────────────────────────────────────

test("asNeeded schedule never appears", () => {
  assert.equal(shouldAppearOnDate({ asNeeded: true }, "2025-03-01"), false);
});

test("daily schedule appears on start date", () => {
  const sched = { asNeeded: false as const, frequency: "daily" as const, intervalDays: 1, times: ["08:00"], startDate: "2025-03-01" };
  assert.equal(shouldAppearOnDate(sched, "2025-03-01"), true);
});

test("daily schedule appears every day after start", () => {
  const sched = { asNeeded: false as const, frequency: "daily" as const, intervalDays: 1, times: ["08:00"], startDate: "2025-01-01" };
  assert.equal(shouldAppearOnDate(sched, "2025-01-02"), true);
  assert.equal(shouldAppearOnDate(sched, "2025-06-15"), true);
});

test("daily schedule does NOT appear before start date", () => {
  const sched = { asNeeded: false as const, frequency: "daily" as const, intervalDays: 1, times: ["08:00"], startDate: "2025-03-15" };
  assert.equal(shouldAppearOnDate(sched, "2025-03-14"), false);
});

test("every-other-day schedule appears on day 0 and day 2, not day 1", () => {
  const sched = { asNeeded: false as const, frequency: "every-other-day" as const, intervalDays: 2, times: ["08:00"], startDate: "2025-01-01" };
  assert.equal(shouldAppearOnDate(sched, "2025-01-01"), true);  // day 0 ✓
  assert.equal(shouldAppearOnDate(sched, "2025-01-02"), false); // day 1 ✗
  assert.equal(shouldAppearOnDate(sched, "2025-01-03"), true);  // day 2 ✓
  assert.equal(shouldAppearOnDate(sched, "2025-01-04"), false); // day 3 ✗
});

test("weekly schedule appears exactly every 7 days", () => {
  const sched = { asNeeded: false as const, frequency: "weekly" as const, intervalDays: 7, times: ["08:00"], startDate: "2025-01-06" };
  assert.equal(shouldAppearOnDate(sched, "2025-01-06"), true);   // day 0
  assert.equal(shouldAppearOnDate(sched, "2025-01-07"), false);  // day 1
  assert.equal(shouldAppearOnDate(sched, "2025-01-13"), true);   // day 7
  assert.equal(shouldAppearOnDate(sched, "2025-01-20"), true);   // day 14
  assert.equal(shouldAppearOnDate(sched, "2025-01-19"), false);  // day 13
});

test("custom 5-day schedule appears correctly", () => {
  const sched = { asNeeded: false as const, frequency: "custom" as const, intervalDays: 5, times: ["08:00"], startDate: "2025-01-01" };
  assert.equal(shouldAppearOnDate(sched, "2025-01-01"), true);   // day 0
  assert.equal(shouldAppearOnDate(sched, "2025-01-06"), true);   // day 5
  assert.equal(shouldAppearOnDate(sched, "2025-01-04"), false);  // day 3
  assert.equal(shouldAppearOnDate(sched, "2025-01-11"), true);   // day 10
});

// ─── toDateString ──────────────────────────────────────────────────────────

test("toDateString formats date correctly", () => {
  assert.equal(toDateString(new Date("2025-03-01T12:00:00")), "2025-03-01");
  assert.equal(toDateString(new Date("2025-12-31T12:00:00")), "2025-12-31");
  assert.equal(toDateString(new Date("2025-01-01T12:00:00")), "2025-01-01");
});

// ─── formatTime ────────────────────────────────────────────────────────────

test("formatTime converts 24h to 12h AM/PM", () => {
  assert.equal(formatTime("08:00"), "8:00 AM");
  assert.equal(formatTime("12:00"), "12:00 PM");
  assert.equal(formatTime("13:30"), "1:30 PM");
  assert.equal(formatTime("00:00"), "12:00 AM");
  assert.equal(formatTime("23:59"), "11:59 PM");
});

// ─── formatFrequencyLabel ─────────────────────────────────────────────────

test("formatFrequencyLabel returns correct labels", () => {
  assert.equal(formatFrequencyLabel({ asNeeded: true }), "As Needed");
  assert.equal(formatFrequencyLabel({ asNeeded: false, frequency: "daily", intervalDays: 1, times: [], startDate: "" }), "Daily");
  assert.equal(formatFrequencyLabel({ asNeeded: false, frequency: "every-other-day", intervalDays: 2, times: [], startDate: "" }), "Every Other Day");
  assert.equal(formatFrequencyLabel({ asNeeded: false, frequency: "weekly", intervalDays: 7, times: [], startDate: "" }), "Weekly");
  assert.equal(formatFrequencyLabel({ asNeeded: false, frequency: "custom", intervalDays: 10, times: [], startDate: "" }), "Every 10 Days");
});

// ─── Summary ──────────────────────────────────────────────────────────────

console.log("\nscheduleCompute.ts tests:");
results.forEach(r => console.log(r));
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
