import type { DayLog, Medication, SkincareProduct } from "@/context/AppContext";
import { shouldAppearOnDate, toDateString } from "@/utils/scheduleCompute";

export type AdherenceItem = {
  itemId: string;
  itemName: string;
  color: string;
  startDate: string;
  expectedDays: number;
  completedDays: number;
  missedDays: number;
  adherencePct: number;
  longestStreak: number;
  currentStreak: number;
};

export type DayAdherence = {
  date: string;
  expected: number;
  completed: number;
  isFuture: boolean;
};

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

export function computeItemAdherence(
  itemId: string,
  itemName: string,
  color: string,
  schedule: any,
  dayLogs: Record<string, DayLog>,
  todayStr: string,
): AdherenceItem | null {
  if (schedule.asNeeded || !schedule.startDate) return null;

  const startDate: string = schedule.startDate;
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
  const adherencePct = expectedDays > 0
    ? Math.round((completedDays / expectedDays) * 100)
    : 0;

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  for (const d of expectedDates) {
    if (completedSet.has(d)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Current streak (counting from the end backwards)
  let currentStreak = 0;
  for (let i = expectedDates.length - 1; i >= 0; i--) {
    if (completedSet.has(expectedDates[i])) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    itemId,
    itemName,
    color,
    startDate,
    expectedDays,
    completedDays,
    missedDays,
    adherencePct,
    longestStreak,
    currentStreak,
  };
}

export function computeMonthDayAdherence(
  items: Array<{ id: string; schedule: any }>,
  dayLogs: Record<string, DayLog>,
  year: number,
  month: number,
  todayStr: string,
): DayAdherence[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: DayAdherence[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = toDateString(d);
    const isFuture = dateStr > todayStr;

    if (isFuture) {
      result.push({ date: dateStr, expected: 0, completed: 0, isFuture: true });
      continue;
    }

    let expected = 0;
    let completed = 0;

    for (const item of items) {
      if (item.schedule.asNeeded) continue;
      if (shouldAppearOnDate(item.schedule, dateStr)) {
        expected++;
        const log = dayLogs[dateStr];
        if (log) {
          const entry = log.entries.find(e => e.itemId === item.id && e.isComplete);
          if (entry) completed++;
        }
      }
    }

    result.push({ date: dateStr, expected, completed, isFuture: false });
  }

  return result;
}

export function buildMedAdherence(
  medications: Medication[],
  dayLogs: Record<string, DayLog>,
  todayStr: string,
): AdherenceItem[] {
  return medications
    .filter(m => m.status === "active" && !m.schedule.asNeeded)
    .map(m => computeItemAdherence(m.id, m.name, m.color, m.schedule, dayLogs, todayStr))
    .filter((x): x is AdherenceItem => x !== null);
}

export function buildSkincareAdherence(
  products: SkincareProduct[],
  dayLogs: Record<string, DayLog>,
  todayStr: string,
): AdherenceItem[] {
  return products
    .filter(p => (!("status" in p) || (p as any).status !== "history") && !p.schedule.asNeeded)
    .map(p => computeItemAdherence(p.id, p.name, p.color, p.schedule, dayLogs, todayStr))
    .filter((x): x is AdherenceItem => x !== null);
}
