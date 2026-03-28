export type ItemSchedule =
  | { asNeeded: true }
  | {
      asNeeded: false;
      frequency: "daily" | "every-other-day" | "weekly" | "custom";
      intervalDays: number;
      times: string[];   // ["08:00", "20:00"] — 24-hour
      startDate: string; // "YYYY-MM-DD"
    };

export function shouldAppearOnDate(schedule: ItemSchedule, dateStr: string): boolean {
  if (schedule.asNeeded) return false;
  const start = new Date(schedule.startDate + "T12:00:00");
  const target = new Date(dateStr + "T12:00:00");
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86400000);
  if (diffDays < 0) return false;
  return diffDays % schedule.intervalDays === 0;
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function sortTimesAsc(times: string[]): string[] {
  return [...times].sort();
}

export function formatFrequencyLabel(schedule: ItemSchedule): string {
  if (schedule.asNeeded) return "As Needed";
  switch (schedule.frequency) {
    case "daily": return "Daily";
    case "every-other-day": return "Every Other Day";
    case "weekly": return "Weekly";
    case "custom": return `Every ${schedule.intervalDays} Days`;
  }
}

export function formatNavDate(dateStr: string): string {
  const today = todayString();
  const d = new Date(dateStr + "T12:00:00");
  const diff = Math.round(
    (new Date(today + "T12:00:00").getTime() - d.getTime()) / 86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function isDateExpired(expiryDate: string): boolean {
  const today = todayString();
  return expiryDate < today;
}

export function isDateExpiringSoon(expiryDate: string, daysThreshold = 14): boolean {
  const today = todayString();
  const future = toDateString(new Date(Date.now() + daysThreshold * 86400000));
  return expiryDate >= today && expiryDate <= future;
}
