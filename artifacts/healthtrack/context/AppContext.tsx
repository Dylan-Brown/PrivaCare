import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { logMedicationDoseToHealthKit, saveVitalToHealthKit } from "@/utils/healthKit";
import { scheduleAllPrivaCareNotifications } from "@/utils/pushNotifications";
import { UserProfile } from "@/utils/drugInteractions";
import {
  ItemSchedule,
  formatTime,
  shouldAppearOnDate,
  todayString,
  toDateString,
} from "@/utils/scheduleCompute";
import { STORAGE_KEYS } from "@/utils/storageKeys";

export type { UserProfile, ItemSchedule, SkincareProductStatus };

export type MedicationStatus = "active" | "storage" | "history";
export type MedicationCategory = "prescription" | "generic" | "supplement";

export type CompoundIngredient = {
  name: string;
  amount: string;
  unit: string;
};

export type Medication = {
  id: string;
  name: string;
  brandName?: string;
  dosage: string;
  unit: string;
  color: string;
  icon?: string;
  bottleCount: number;
  totalCount: number;
  remainingCount: number;
  lowStockThreshold: number;
  notifyLowStock: boolean;
  groupId?: string;
  status: MedicationStatus;
  awaitingRefill?: boolean;
  category?: MedicationCategory;
  isCompound?: boolean;
  ingredients?: CompoundIngredient[];
  sortOrder?: number;
  schedule: ItemSchedule;
  notes?: string;
};

export type MedicationGroup = {
  id: string;
  name: string;
  timeLabel: string;
  medicationIds: string[];
  color: string;
};

export type MedicationLog = {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  unit: string;
  takenAt: string;
  groupId?: string;
  groupName?: string;
};

export type SkincareProductStatus = "active" | "storage" | "history";

export type SkincareProduct = {
  id: string;
  name: string;
  type: string;
  brand: string;
  color: string;
  icon?: string;
  routineId?: string;
  sortOrder?: number;
  schedule: ItemSchedule;
  expiryDate?: string;
  notes?: string;
  status?: SkincareProductStatus;
};

export type SkincareRoutine = {
  id: string;
  name: string;
  timeLabel: string;
  productIds: string[];
  color: string;
};

export type SkincareLog = {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  loggedAt: string;
  routineId?: string;
  routineName?: string;
};

export type DayLogEntry = {
  id: string;
  itemId: string;
  itemType: "medication" | "skincare";
  itemName: string;
  scheduledTime: string;   // "HH:MM" 24-hr
  completedAt?: string;
  isComplete: boolean;
};

export type SkincareReactionNote = {
  id: string;
  productId: string;
  productName: string;
  note: string;
  sentiment: "positive" | "negative" | "neutral";
  loggedAt: string;
};

export type DayLog = {
  date: string;                        // "YYYY-MM-DD"
  entries: DayLogEntry[];
  reactionNotes: SkincareReactionNote[];
};

export type AppNotification = {
  id: string;
  message: string;
  detail?: string;
  type: "insight" | "general";
  createdAt: string;
  read: boolean;
};

export type VitalType = "SpO2" | "BloodPressure" | "TempOral" | "TempForehead";

// ─── Streak ────────────────────────────────────────────────────────────────

export type StreakData = {
  count: number;
  lastCompletedDate: string;       // "YYYY-MM-DD" of the last day counted into the streak
  celebratedMilestones: number[];  // streak counts whose popup has already been shown
};

const DEFAULT_STREAK: StreakData = { count: 0, lastCompletedDate: "", celebratedMilestones: [] };

/** Returns true when every scheduled entry for that day has been logged. */
function isDayComplete(log: DayLog | undefined): boolean {
  if (!log || log.entries.length === 0) return false;
  return log.entries.every(e => e.isComplete);
}

/** Returns the "YYYY-MM-DD" string for N days before a given date string. */
function offsetDateString(dateStr: string, offsetDays: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Returns the total number of days in the past N calendar months ending on refDate. */
function daysInLastNMonths(refDate: Date, n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    const y = refDate.getFullYear();
    const m = refDate.getMonth() - i;     // may be negative — Date handles it
    total += new Date(y, m, 0).getDate(); // day 0 of month = last day of prev month
  }
  return total;
}

/** Returns whether a given year is a leap year. */
function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Computes the milestone streak counts to celebrate, ordered ascending.
 * Fixed: 1, 7, 14.
 * Calendar-relative (calculated from today): 1 month, 2 months, 6 months, 1 year.
 * Then every additional year from year 1.
 */
export function computeStreakMilestones(refDate: Date): number[] {
  const milestones = new Set<number>([1, 7, 14]);

  const oneMonth = daysInLastNMonths(refDate, 1);
  const twoMonths = daysInLastNMonths(refDate, 2);
  const sixMonths = daysInLastNMonths(refDate, 6);
  milestones.add(oneMonth);
  milestones.add(twoMonths);
  milestones.add(sixMonths);

  const oneYear = isLeapYear(refDate.getFullYear()) ? 366 : 365;
  milestones.add(oneYear);

  // Additional years: accumulate actual days per calendar year
  let accumDays = oneYear;
  for (let y = 1; y <= 9; y++) {
    accumDays += isLeapYear(refDate.getFullYear() + y) ? 366 : 365;
    milestones.add(accumDays);
  }

  return Array.from(milestones).sort((a, b) => a - b);
}

export type VitalReading = {
  id: string;
  type: VitalType;
  value: number | { systolic: number; diastolic: number };
  unit: string;
  timestamp: string;
  note?: string;
};

type AppContextType = {
  medications: Medication[];
  medicationGroups: MedicationGroup[];
  medicationLogs: MedicationLog[];
  skincareProducts: SkincareProduct[];
  skincareRoutines: SkincareRoutine[];
  skincareLogs: SkincareLog[];
  isLoading: boolean;

  addMedication: (med: Omit<Medication, "id">) => Promise<void>;
  updateMedication: (id: string, updates: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  logMedication: (medicationId: string, groupId?: string, groupName?: string) => Promise<void>;
  logMedicationGroup: (groupId: string) => Promise<void>;
  refillMedication: (medicationId: string, amount: number) => Promise<void>;
  setRemainingCount: (id: string, count: number) => Promise<void>;
  archiveMedication: (id: string, mode: "storage" | "history") => Promise<void>;
  unarchiveMedication: (id: string) => Promise<void>;
  setAwaitingRefill: (id: string, value: boolean) => Promise<void>;
  reorderMedications: (orderedIds: string[]) => Promise<void>;
  reorderSkincareProducts: (orderedIds: string[]) => Promise<void>;

  addMedicationGroup: (group: Omit<MedicationGroup, "id">) => Promise<void>;
  updateMedicationGroup: (id: string, updates: Partial<MedicationGroup>) => Promise<void>;
  deleteMedicationGroup: (id: string) => Promise<void>;

  addSkincareProduct: (product: Omit<SkincareProduct, "id">) => Promise<void>;
  updateSkincareProduct: (id: string, updates: Partial<SkincareProduct>) => Promise<void>;
  deleteSkincareProduct: (id: string) => Promise<void>;
  logSkincareProduct: (productId: string, routineId?: string, routineName?: string) => Promise<void>;
  archiveSkincareProduct: (id: string, mode: "storage" | "history") => Promise<void>;
  unarchiveSkincareProduct: (id: string) => Promise<void>;
  logSkincareRoutine: (routineId: string) => Promise<void>;

  addSkincareRoutine: (routine: Omit<SkincareRoutine, "id">) => Promise<void>;
  updateSkincareRoutine: (id: string, updates: Partial<SkincareRoutine>) => Promise<void>;
  deleteSkincareRoutine: (id: string) => Promise<void>;

  getMedicationsNeedingRefill: () => Medication[];

  dayLogs: Record<string, DayLog>;
  buildDayLog: (date: string) => void;
  getDayLog: (date: string) => DayLog;
  completeDayEntry: (date: string, entryId: string) => Promise<void>;
  uncompleteDayEntry: (date: string, entryId: string) => Promise<void>;
  completeAllInGroup: (date: string, itemType: string, scheduledTime: string) => Promise<void>;
  logSkincareReaction: (date: string, reaction: Omit<SkincareReactionNote, "id">) => Promise<void>;

  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, "id">) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  userProfile: UserProfile;
  setUserProfile: (updates: Partial<UserProfile>) => Promise<void>;

  streak: StreakData;
  /**
   * Re-evaluates the streak against the current dayLogs.
   * Returns the milestone count to celebrate (if any), or null.
   * Call this on app focus / after completing a group.
   */
  checkAndUpdateStreak: () => Promise<number | null>;

  vitalReadings: VitalReading[];
  addVitalReading: (r: Omit<VitalReading, "id">) => Promise<void>;
  deleteVitalReading: (id: string) => Promise<void>;
  tempUnit: "F" | "C";
  setTempUnit: (u: "F" | "C") => Promise<void>;
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}

function migrateMedication(m: any, index: number): Medication {
  return {
    ...m,
    status: m.status ?? "active",
    bottleCount: m.bottleCount ?? m.totalCount ?? 30,
    totalCount: m.totalCount ?? m.bottleCount ?? 30,
    awaitingRefill: m.awaitingRefill ?? false,
    brandName: m.brandName ?? undefined,
    category: m.category ?? undefined,
    isCompound: m.isCompound ?? false,
    ingredients: m.ingredients ?? [],
    sortOrder: m.sortOrder ?? index,
    icon: m.icon ?? "mci:pill",
    schedule: m.schedule ?? { asNeeded: true },
    notes: m.notes ?? undefined,
  };
}

function migrateSkincareProduct(p: any, index: number): SkincareProduct {
  return {
    ...p,
    icon: p.icon ?? "mci:bottle-tonic",
    sortOrder: p.sortOrder ?? index,
    schedule: p.schedule ?? { asNeeded: true },
    expiryDate: p.expiryDate ?? undefined,
    notes: p.notes ?? undefined,
    status: p.status ?? "active",
  };
}

const DEFAULT_USER_PROFILE: UserProfile = {
  drinksAlcohol: false,
  smokesTobacco: false,
  otherDrugs: "",
  compoundMedicationsEnabled: false,
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationGroups, setMedicationGroups] = useState<MedicationGroup[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [skincareProducts, setSkincareProducts] = useState<SkincareProduct[]>([]);
  const [skincareRoutines, setSkincareRoutines] = useState<SkincareRoutine[]>([]);
  const [skincareLogs, setSkincareLogs] = useState<SkincareLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfileState] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [vitalReadings, setVitalReadings] = useState<VitalReading[]>([]);
  const [tempUnit, setTempUnitState] = useState<"F" | "C">("F");
  const [streak, setStreak] = useState<StreakData>(DEFAULT_STREAK);

  // ─── Load all data on mount ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [meds, groups, medLogs, products, routines, skinLogs,
               profileRaw, dayLogsRaw, notifsRaw, vitalsRaw, tempUnitRaw, streakRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.MED_GROUPS),
          AsyncStorage.getItem(STORAGE_KEYS.MED_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.SKINCARE_PRODUCTS),
          AsyncStorage.getItem(STORAGE_KEYS.SKINCARE_ROUTINES),
          AsyncStorage.getItem(STORAGE_KEYS.SKINCARE_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
          AsyncStorage.getItem(STORAGE_KEYS.DAY_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.VITAL_READINGS),
          AsyncStorage.getItem(STORAGE_KEYS.TEMP_UNIT),
          AsyncStorage.getItem(STORAGE_KEYS.STREAK),
        ]);
        if (meds) setMedications((JSON.parse(meds) as any[]).map(migrateMedication));
        if (groups) setMedicationGroups(JSON.parse(groups));
        if (medLogs) setMedicationLogs(JSON.parse(medLogs));
        if (products) setSkincareProducts((JSON.parse(products) as any[]).map(migrateSkincareProduct));
        if (routines) setSkincareRoutines(JSON.parse(routines));
        if (skinLogs) setSkincareLogs(JSON.parse(skinLogs));
        if (profileRaw) setUserProfileState({ ...DEFAULT_USER_PROFILE, ...JSON.parse(profileRaw) });
        if (dayLogsRaw) setDayLogs(JSON.parse(dayLogsRaw));
        if (notifsRaw) setNotifications(JSON.parse(notifsRaw));
        if (vitalsRaw) setVitalReadings(JSON.parse(vitalsRaw));
        if (tempUnitRaw === "F" || tempUnitRaw === "C") setTempUnitState(tempUnitRaw);
        if (streakRaw) setStreak({ ...DEFAULT_STREAK, ...JSON.parse(streakRaw) });
      } catch (e) {
        console.error("Error loading data", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ─── Build today's schedule once data is ready ────────────────────────────
  useEffect(() => {
    if (!isLoading) buildDayLog(todayString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ─── Reschedule push notifications (debounced) ────────────────────────────
  const notifDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isLoading) return;
    if (notifDebounce.current) clearTimeout(notifDebounce.current);
    notifDebounce.current = setTimeout(() => {
      scheduleAllPrivaCareNotifications(medications, skincareProducts).catch(() => {});
    }, 1500);
    return () => { if (notifDebounce.current) clearTimeout(notifDebounce.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications, skincareProducts, isLoading]);

  // ─── Weekly / monthly insights ────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    (async () => {
      const today = new Date();
      const todayStr = todayString();
      if (today.getDay() === 0) {
        const lastWeekly = await AsyncStorage.getItem(STORAGE_KEYS.INSIGHTS_WEEKLY);
        if (lastWeekly !== todayStr) {
          await AsyncStorage.setItem(STORAGE_KEYS.INSIGHTS_WEEKLY, todayStr);
          runWeeklyInsights();
        }
      }
      if (today.getDate() === 1) {
        const lastMonthly = await AsyncStorage.getItem(STORAGE_KEYS.INSIGHTS_MONTHLY);
        if (lastMonthly !== todayStr) {
          await AsyncStorage.setItem(STORAGE_KEYS.INSIGHTS_MONTHLY, todayStr);
          runMonthlyInsights();
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ─── User profile ──────────────────────────────────────────────────────────
  async function setUserProfile(updates: Partial<UserProfile>) {
    const next = { ...userProfile, ...updates };
    setUserProfileState(next);
    AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(next));
  }

  // ─── Vital readings ────────────────────────────────────────────────────────
  async function addVitalReading(r: Omit<VitalReading, "id">) {
    const newReading: VitalReading = { ...r, id: generateId() };
    const updated = [newReading, ...vitalReadings];
    setVitalReadings(updated);
    AsyncStorage.setItem(STORAGE_KEYS.VITAL_READINGS, JSON.stringify(updated));
    saveVitalToHealthKit(r).catch(() => {});
  }

  async function deleteVitalReading(id: string) {
    const updated = vitalReadings.filter(r => r.id !== id);
    setVitalReadings(updated);
    AsyncStorage.setItem(STORAGE_KEYS.VITAL_READINGS, JSON.stringify(updated));
  }

  async function setTempUnit(u: "F" | "C") {
    setTempUnitState(u);
    await AsyncStorage.setItem(STORAGE_KEYS.TEMP_UNIT, u);
  }

  // ─── Streak ────────────────────────────────────────────────────────────────

  /**
   * Reads the latest streak data from storage (to avoid stale closure), re-evaluates
   * the streak based on dayLogs, persists the result, and returns the milestone value
   * to celebrate if a new milestone was just crossed, otherwise null.
   */
  async function checkAndUpdateStreak(): Promise<number | null> {
    const today = todayString();
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
    const current: StreakData = raw ? { ...DEFAULT_STREAK, ...JSON.parse(raw) } : DEFAULT_STREAK;

    // Walk backwards from today through dayLogs to compute the current streak.
    // Days with no entries are transparent (neither count nor break the streak).
    // We stop when we hit a day with entries that are not all complete,
    // or after MAX_CONSECUTIVE_EMPTY consecutive empty days while streak is still 0
    // (prevents an O(400) scan on fresh installs with no data).
    let newCount = 0;
    let newLastCompleted = "";
    let offset = 0;
    let consecutiveEmpty = 0;
    const MAX_DAYS_BACK = 400;
    const MAX_EMPTY_WITHOUT_STREAK = 14; // give up after 14 empty days when streak=0

    while (offset <= MAX_DAYS_BACK) {
      const dateStr = offsetDateString(today, offset);
      const log = dayLogs[dateStr];

      if (!log || log.entries.length === 0) {
        // No scheduled items — transparent day.
        if (newCount > 0) break; // already past the streak, stop
        consecutiveEmpty++;
        if (consecutiveEmpty > MAX_EMPTY_WITHOUT_STREAK) break; // no streak found, stop early
        offset++;
        continue;
      }

      consecutiveEmpty = 0;

      if (isDayComplete(log)) {
        newCount++;
        if (newLastCompleted === "") newLastCompleted = dateStr;
        offset++;
      } else {
        // This day had entries but wasn't complete — streak breaks here.
        // Exception: if this is today and it's still in progress, skip it.
        if (offset === 0) {
          offset++;
          continue;
        }
        break;
      }
    }

    // Detect if a new milestone should be celebrated.
    const milestones = computeStreakMilestones(new Date());
    const uncelebrated = milestones.filter(
      m => m <= newCount && !current.celebratedMilestones.includes(m)
    );
    // Show only the highest uncelebrated milestone this check (the most impressive one).
    const pendingMilestone = uncelebrated.length > 0 ? Math.max(...uncelebrated) : null;

    const updated: StreakData = {
      count: newCount,
      lastCompletedDate: newLastCompleted,
      celebratedMilestones: pendingMilestone
        ? [...current.celebratedMilestones, ...uncelebrated]
        : current.celebratedMilestones,
    };

    setStreak(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(updated));

    return pendingMilestone;
  }

  // ─── Medications ──────────────────────────────────────────────────────────
  async function addMedication(med: Omit<Medication, "id">) {
    const newMed: Medication = { ...med, id: generateId(), sortOrder: medications.length };
    const updated = [...medications, newMed];
    setMedications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
  }

  async function updateMedication(id: string, updates: Partial<Medication>) {
    const updated = medications.map(m => m.id === id ? { ...m, ...updates } : m);
    setMedications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
  }

  async function deleteMedication(id: string) {
    const updated = medications.filter(m => m.id !== id);
    setMedications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
  }

  async function logMedication(medicationId: string, groupId?: string, groupName?: string) {
    const now = new Date();
    const med = medications.find(m => m.id === medicationId);
    if (!med) return;

    const log: MedicationLog = {
      id: generateId(),
      medicationId,
      medicationName: med.name,
      dosage: med.dosage,
      unit: med.unit,
      takenAt: now.toISOString(),
      groupId,
      groupName,
    };
    const updatedLogs = [...medicationLogs, log];
    setMedicationLogs(updatedLogs);
    AsyncStorage.setItem(STORAGE_KEYS.MED_LOGS, JSON.stringify(updatedLogs));

    logMedicationDoseToHealthKit(med.name, now);

    const updatedMeds = medications.map(m =>
      m.id === medicationId ? { ...m, remainingCount: Math.max(0, m.remainingCount - 1) } : m
    );
    setMedications(updatedMeds);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updatedMeds));
  }

  async function logMedicationGroup(groupId: string) {
    const now = new Date();
    const group = medicationGroups.find(g => g.id === groupId);
    if (!group) return;

    const newLogs: MedicationLog[] = [];
    const updatedMeds = medications.map(m => {
      if (!group.medicationIds.includes(m.id)) return m;
      newLogs.push({
        id: generateId(),
        medicationId: m.id,
        medicationName: m.name,
        dosage: m.dosage,
        unit: m.unit,
        takenAt: now.toISOString(),
        groupId,
        groupName: group.name,
      });
      logMedicationDoseToHealthKit(m.name, now);
      return { ...m, remainingCount: Math.max(0, m.remainingCount - 1) };
    });

    setMedications(updatedMeds);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updatedMeds));

    const updatedLogs = [...medicationLogs, ...newLogs];
    setMedicationLogs(updatedLogs);
    AsyncStorage.setItem(STORAGE_KEYS.MED_LOGS, JSON.stringify(updatedLogs));
  }

  async function refillMedication(medicationId: string, amount: number) {
    const updated = medications.map(m =>
      m.id === medicationId
        ? { ...m, remainingCount: m.remainingCount + amount, bottleCount: amount, totalCount: amount, awaitingRefill: false }
        : m
    );
    setMedications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
  }

  async function setRemainingCount(id: string, count: number) {
    const updated = medications.map(m =>
      m.id === id
        ? { ...m, remainingCount: Math.max(0, count), awaitingRefill: count === 0 ? m.awaitingRefill : false }
        : m
    );
    setMedications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
  }

  async function archiveMedication(id: string, mode: "storage" | "history") {
    const updated = medications.map(m =>
      m.id === id
        ? { ...m, status: mode as MedicationStatus, remainingCount: mode === "history" ? 0 : m.remainingCount, awaitingRefill: false }
        : m
    );
    setMedications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
  }

  async function unarchiveMedication(id: string) {
    const updated = medications.map(m => m.id === id ? { ...m, status: "active" as MedicationStatus } : m);
    setMedications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
  }

  async function setAwaitingRefill(id: string, value: boolean) {
    const updated = medications.map(m => m.id === id ? { ...m, awaitingRefill: value } : m);
    setMedications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
  }

  async function reorderMedications(orderedIds: string[]) {
    const map = new Map(medications.map(m => [m.id, m]));
    const reordered = orderedIds
      .map((id, idx) => { const m = map.get(id); return m ? { ...m, sortOrder: idx } : null; })
      .filter(Boolean) as Medication[];
    const rest = medications.filter(m => !orderedIds.includes(m.id));
    const updated = [...reordered, ...rest];
    setMedications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
  }

  async function reorderSkincareProducts(orderedIds: string[]) {
    const map = new Map(skincareProducts.map(p => [p.id, p]));
    const reordered = orderedIds
      .map((id, idx) => { const p = map.get(id); return p ? { ...p, sortOrder: idx } : null; })
      .filter(Boolean) as SkincareProduct[];
    const rest = skincareProducts.filter(p => !orderedIds.includes(p.id));
    const updated = [...reordered, ...rest];
    setSkincareProducts(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
  }

  // ─── Medication groups ────────────────────────────────────────────────────
  async function addMedicationGroup(group: Omit<MedicationGroup, "id">) {
    const updated = [...medicationGroups, { ...group, id: generateId() }];
    setMedicationGroups(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MED_GROUPS, JSON.stringify(updated));
  }

  async function updateMedicationGroup(id: string, updates: Partial<MedicationGroup>) {
    const updated = medicationGroups.map(g => g.id === id ? { ...g, ...updates } : g);
    setMedicationGroups(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MED_GROUPS, JSON.stringify(updated));
  }

  async function deleteMedicationGroup(id: string) {
    const updated = medicationGroups.filter(g => g.id !== id);
    setMedicationGroups(updated);
    AsyncStorage.setItem(STORAGE_KEYS.MED_GROUPS, JSON.stringify(updated));
  }

  // ─── Skincare products ────────────────────────────────────────────────────
  async function addSkincareProduct(product: Omit<SkincareProduct, "id">) {
    const updated = [...skincareProducts, { ...product, id: generateId() }];
    setSkincareProducts(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
  }

  async function updateSkincareProduct(id: string, updates: Partial<SkincareProduct>) {
    const updated = skincareProducts.map(p => p.id === id ? { ...p, ...updates } : p);
    setSkincareProducts(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
  }

  async function deleteSkincareProduct(id: string) {
    const updated = skincareProducts.filter(p => p.id !== id);
    setSkincareProducts(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
  }

  async function logSkincareProduct(productId: string, routineId?: string, routineName?: string) {
    const product = skincareProducts.find(p => p.id === productId);
    if (!product) return;
    const log: SkincareLog = {
      id: generateId(),
      productId,
      productName: product.name,
      productType: product.type,
      loggedAt: new Date().toISOString(),
      routineId,
      routineName,
    };
    const updated = [...skincareLogs, log];
    setSkincareLogs(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_LOGS, JSON.stringify(updated));
  }

  async function archiveSkincareProduct(id: string, mode: "storage" | "history") {
    const updated = skincareProducts.map(p => p.id === id ? { ...p, status: mode } : p);
    setSkincareProducts(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
  }

  async function unarchiveSkincareProduct(id: string) {
    const updated = skincareProducts.map(p => p.id === id ? { ...p, status: "active" as const } : p);
    setSkincareProducts(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
  }

  async function logSkincareRoutine(routineId: string) {
    const routine = skincareRoutines.find(r => r.id === routineId);
    if (!routine) return;
    const newLogs: SkincareLog[] = routine.productIds
      .map(productId => skincareProducts.find(p => p.id === productId))
      .filter(Boolean)
      .map(product => ({
        id: generateId(),
        productId: product!.id,
        productName: product!.name,
        productType: product!.type,
        loggedAt: new Date().toISOString(),
        routineId,
        routineName: routine.name,
      }));
    const updated = [...skincareLogs, ...newLogs];
    setSkincareLogs(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_LOGS, JSON.stringify(updated));
  }

  // ─── Skincare routines ────────────────────────────────────────────────────
  async function addSkincareRoutine(routine: Omit<SkincareRoutine, "id">) {
    const updated = [...skincareRoutines, { ...routine, id: generateId() }];
    setSkincareRoutines(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_ROUTINES, JSON.stringify(updated));
  }

  async function updateSkincareRoutine(id: string, updates: Partial<SkincareRoutine>) {
    const updated = skincareRoutines.map(r => r.id === id ? { ...r, ...updates } : r);
    setSkincareRoutines(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_ROUTINES, JSON.stringify(updated));
  }

  async function deleteSkincareRoutine(id: string) {
    const updated = skincareRoutines.filter(r => r.id !== id);
    setSkincareRoutines(updated);
    AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_ROUTINES, JSON.stringify(updated));
  }

  // ─── Derived helpers ──────────────────────────────────────────────────────
  function getMedicationsNeedingRefill(): Medication[] {
    return medications.filter(
      m => m.status === "active" && m.notifyLowStock && m.remainingCount <= m.lowStockThreshold
    );
  }

  // ─── Day logs ─────────────────────────────────────────────────────────────
  function buildDayLog(date: string) {
    const existing: DayLog = dayLogs[date] ?? { date, entries: [], reactionNotes: [] };
    const entries = [...existing.entries];

    const addEntries = (
      items: Array<{ id: string; name: string; schedule: ItemSchedule; status?: string }>,
      type: "medication" | "skincare"
    ) => {
      items
        .filter(item => {
          if (type === "medication" && (item as any).status !== "active") return false;
          if (!item.schedule || item.schedule.asNeeded) return false;
          return shouldAppearOnDate(item.schedule, date);
        })
        .forEach(item => {
          const sched = item.schedule as Extract<ItemSchedule, { asNeeded: false }>;
          sched.times.forEach(time => {
            if (!entries.some(e => e.itemId === item.id && e.itemType === type && e.scheduledTime === time)) {
              entries.push({
                id: generateId(),
                itemId: item.id,
                itemType: type,
                itemName: item.name,
                scheduledTime: time,
                isComplete: false,
              });
            }
          });
        });
    };

    addEntries(medications as any, "medication");
    addEntries(skincareProducts as any, "skincare");

    if (entries.length === existing.entries.length) return;

    const updated = { ...dayLogs, [date]: { ...existing, entries } };
    setDayLogs(updated);
    AsyncStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(updated));
  }

  function getDayLog(date: string): DayLog {
    return dayLogs[date] ?? { date, entries: [], reactionNotes: [] };
  }

  async function completeDayEntry(date: string, entryId: string) {
    const log = dayLogs[date];
    if (!log) return;

    const entry = log.entries.find(e => e.id === entryId);
    const entries = log.entries.map(e =>
      e.id === entryId ? { ...e, isComplete: true, completedAt: new Date().toISOString() } : e
    );
    const updatedLogs = { ...dayLogs, [date]: { ...log, entries } };
    setDayLogs(updatedLogs);
    AsyncStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(updatedLogs));

    if (entry?.itemType === "medication") {
      const med = medications.find(m => m.id === entry.itemId);
      if (med) {
        logMedicationDoseToHealthKit(med.name, new Date());
        const updatedMeds = medications.map(m =>
          m.id === med.id ? { ...m, remainingCount: Math.max(0, m.remainingCount - 1) } : m
        );
        setMedications(updatedMeds);
        AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updatedMeds));
      }
    }
  }

  async function uncompleteDayEntry(date: string, entryId: string) {
    const log = dayLogs[date];
    if (!log) return;

    const entry = log.entries.find(e => e.id === entryId);
    const entries = log.entries.map(e =>
      e.id === entryId ? { ...e, isComplete: false, completedAt: undefined } : e
    );
    const updatedLogs = { ...dayLogs, [date]: { ...log, entries } };
    setDayLogs(updatedLogs);
    AsyncStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(updatedLogs));

    if (entry?.isComplete && entry?.itemType === "medication") {
      const med = medications.find(m => m.id === entry.itemId);
      if (med) {
        const updatedMeds = medications.map(m =>
          m.id === med.id ? { ...m, remainingCount: m.remainingCount + 1 } : m
        );
        setMedications(updatedMeds);
        AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updatedMeds));
      }
    }
  }

  async function completeAllInGroup(date: string, itemType: string, scheduledTime: string) {
    const log = dayLogs[date];
    if (!log) return;

    const now = new Date().toISOString();
    const medCountChanges: Record<string, number> = {};

    const entries = log.entries.map(e => {
      if (e.itemType !== itemType || e.scheduledTime !== scheduledTime || e.isComplete) return e;
      if (e.itemType === "medication") {
        medCountChanges[e.itemId] = (medCountChanges[e.itemId] ?? 0) + 1;
        logMedicationDoseToHealthKit(e.itemName, new Date());
      }
      return { ...e, isComplete: true, completedAt: now };
    });

    const updatedLogs = { ...dayLogs, [date]: { ...log, entries } };
    setDayLogs(updatedLogs);
    AsyncStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(updatedLogs));

    if (Object.keys(medCountChanges).length > 0) {
      const updatedMeds = medications.map(m =>
        medCountChanges[m.id]
          ? { ...m, remainingCount: Math.max(0, m.remainingCount - medCountChanges[m.id]) }
          : m
      );
      setMedications(updatedMeds);
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updatedMeds));
    }
  }

  async function logSkincareReaction(date: string, reaction: Omit<SkincareReactionNote, "id">) {
    const existing: DayLog = dayLogs[date] ?? { date, entries: [], reactionNotes: [] };
    const updated = {
      ...dayLogs,
      [date]: { ...existing, reactionNotes: [...existing.reactionNotes, { ...reaction, id: generateId() }] },
    };
    setDayLogs(updated);
    AsyncStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(updated));
  }

  // ─── Notifications ─────────────────────────────────────────────────────────
  async function addNotification(notif: Omit<AppNotification, "id">) {
    const updated = [{ ...notif, id: generateId() }, ...notifications];
    setNotifications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  async function markNotificationRead(id: string) {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  async function markAllNotificationsRead() {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  async function deleteNotification(id: string) {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  // ─── Insights ─────────────────────────────────────────────────────────────
  function runWeeklyInsights() {
    const past7 = Array.from({ length: 7 }, (_, i) =>
      toDateString(new Date(Date.now() - (i + 1) * 86400000))
    );

    const missedCount: Record<string, { name: string; time: string; count: number }> = {};
    past7.forEach(dateStr => {
      const log = dayLogs[dateStr];
      if (!log || !log.entries.some(e => e.isComplete)) return;
      log.entries.filter(e => !e.isComplete).forEach(e => {
        const key = `${e.itemId}-${e.scheduledTime}`;
        if (!missedCount[key]) missedCount[key] = { name: e.itemName, time: e.scheduledTime, count: 0 };
        missedCount[key].count++;
      });
    });

    Object.values(missedCount).filter(v => v.count >= 2).forEach(v => {
      addNotification({
        type: "insight",
        message: `You've been missing ${v.name} at ${formatTime(v.time)} this week.`,
        detail: `It was missed ${v.count} times in the past 7 days. Try adjusting the scheduled time to one that works better for your routine.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });
  }

  function runMonthlyInsights() {
    const past30 = Array.from({ length: 30 }, (_, i) =>
      toDateString(new Date(Date.now() - (i + 1) * 86400000))
    );

    const missedByItem: Record<string, { name: string; total: number; byDow: number[] }> = {};
    past30.forEach(dateStr => {
      const log = dayLogs[dateStr];
      if (!log || !log.entries.some(e => e.isComplete)) return;
      const dow = new Date(dateStr + "T12:00:00").getDay();
      log.entries.filter(e => !e.isComplete).forEach(e => {
        if (!missedByItem[e.itemId]) missedByItem[e.itemId] = { name: e.itemName, total: 0, byDow: new Array(7).fill(0) };
        missedByItem[e.itemId].total++;
        missedByItem[e.itemId].byDow[dow]++;
      });
    });

    const dayNames = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
    Object.values(missedByItem).filter(v => v.total >= 4).forEach(v => {
      const maxDow = v.byDow.indexOf(Math.max(...v.byDow));
      const dowMsg = v.byDow[maxDow] >= 3 ? ` — especially on ${dayNames[maxDow]}` : "";
      addNotification({
        type: "insight",
        message: `Monthly check-in: ${v.name} was missed ${v.total} times last month${dowMsg}.`,
        detail: `That's roughly ${Math.round((v.total / 30) * 7)} missed doses per week. Consider adjusting the schedule or setting a reminder.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });
  }

  // ─── Context value ─────────────────────────────────────────────────────────
  const value: AppContextType = {
    medications,
    medicationGroups,
    medicationLogs,
    skincareProducts,
    skincareRoutines,
    skincareLogs,
    isLoading,
    addMedication,
    updateMedication,
    deleteMedication,
    logMedication,
    logMedicationGroup,
    refillMedication,
    setRemainingCount,
    archiveMedication,
    unarchiveMedication,
    setAwaitingRefill,
    reorderMedications,
    reorderSkincareProducts,
    addMedicationGroup,
    updateMedicationGroup,
    deleteMedicationGroup,
    addSkincareProduct,
    updateSkincareProduct,
    deleteSkincareProduct,
    logSkincareProduct,
    archiveSkincareProduct,
    unarchiveSkincareProduct,
    logSkincareRoutine,
    addSkincareRoutine,
    updateSkincareRoutine,
    deleteSkincareRoutine,
    getMedicationsNeedingRefill,
    dayLogs,
    buildDayLog,
    getDayLog,
    completeDayEntry,
    uncompleteDayEntry,
    completeAllInGroup,
    logSkincareReaction,
    notifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    userProfile,
    setUserProfile,
    streak,
    checkAndUpdateStreak,
    vitalReadings,
    addVitalReading,
    deleteVitalReading,
    tempUnit,
    setTempUnit,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
