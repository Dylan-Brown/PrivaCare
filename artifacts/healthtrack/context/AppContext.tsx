import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { logMedicationDoseToHealthKit } from "@/utils/healthKit";
import { scheduleAllVitalNotifications } from "@/utils/pushNotifications";
import { UserProfile } from "@/utils/drugInteractions";
import {
  ItemSchedule,
  shouldAppearOnDate,
  todayString,
  toDateString,
} from "@/utils/scheduleCompute";

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

  getTodayMedLogs: () => MedicationLog[];
  getTodaySkincareLogs: () => SkincareLog[];
  getMedicationsNeedingRefill: () => Medication[];

  // Day logs (schedule-based timeline)
  dayLogs: Record<string, DayLog>;
  buildDayLog: (date: string) => void;
  getDayLog: (date: string) => DayLog;
  completeDayEntry: (date: string, entryId: string) => Promise<void>;
  uncompleteDayEntry: (date: string, entryId: string) => Promise<void>;
  completeAllInGroup: (date: string, itemType: string, scheduledTime: string) => Promise<void>;
  logSkincareReaction: (date: string, reaction: Omit<SkincareReactionNote, "id">) => Promise<void>;

  // Notifications
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, "id">) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  userProfile: UserProfile;
  setUserProfile: (updates: Partial<UserProfile>) => Promise<void>;

  vitalReadings: VitalReading[];
  addVitalReading: (r: Omit<VitalReading, "id">) => Promise<void>;
  deleteVitalReading: (id: string) => Promise<void>;
  tempUnit: "F" | "C";
  setTempUnit: (u: "F" | "C") => Promise<void>;
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
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

export type VitalType = "SpO2" | "BloodPressure" | "TempOral" | "TempForehead";

export type VitalReading = {
  id: string;
  type: VitalType;
  value: number | { systolic: number; diastolic: number };
  unit: string;
  timestamp: string;
  note?: string;
};

const STORAGE_KEYS = {
  MEDICATIONS: "@healthtrack_medications",
  MED_GROUPS: "@healthtrack_med_groups",
  MED_LOGS: "@healthtrack_med_logs",
  SKINCARE_PRODUCTS: "@healthtrack_skincare_products",
  SKINCARE_ROUTINES: "@healthtrack_skincare_routines",
  SKINCARE_LOGS: "@healthtrack_skincare_logs",
  USER_PROFILE: "@vital_user_profile",
  DAY_LOGS: "@vital_day_logs",
  NOTIFICATIONS: "@vital_notifications",
  INSIGHTS_WEEKLY: "@vital_insights_last_weekly",
  INSIGHTS_MONTHLY: "@vital_insights_last_monthly",
  VITAL_READINGS: "@privacre_vital_readings",
  TEMP_UNIT: "@privacre_temp_unit",
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

  // ─── Load all data ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [meds, groups, medLogs, products, routines, skinLogs,
               profileRaw, dayLogsRaw, notifsRaw, vitalsRaw, tempUnitRaw] = await Promise.all([
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
        ]);
        if (meds) setMedications((JSON.parse(meds) as any[]).map((m, i) => migrateMedication(m, i)));
        if (groups) setMedicationGroups(JSON.parse(groups));
        if (medLogs) setMedicationLogs(JSON.parse(medLogs));
        if (products) setSkincareProducts((JSON.parse(products) as any[]).map((p, i) => migrateSkincareProduct(p, i)));
        if (routines) setSkincareRoutines(JSON.parse(routines));
        if (skinLogs) setSkincareLogs(JSON.parse(skinLogs));
        if (profileRaw) setUserProfileState({ ...DEFAULT_USER_PROFILE, ...JSON.parse(profileRaw) });
        if (dayLogsRaw) setDayLogs(JSON.parse(dayLogsRaw));
        if (notifsRaw) setNotifications(JSON.parse(notifsRaw));
        if (vitalsRaw) setVitalReadings(JSON.parse(vitalsRaw));
        if (tempUnitRaw === "F" || tempUnitRaw === "C") setTempUnitState(tempUnitRaw);
      } catch (e) {
        console.error("Error loading data", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ─── Build today's log once data is ready ─────────────────────────────────
  useEffect(() => {
    if (!isLoading) {
      buildDayLog(todayString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ─── Reschedule notifications when items change ────────────────────────────
  const notifDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isLoading) return;
    if (notifDebounce.current) clearTimeout(notifDebounce.current);
    notifDebounce.current = setTimeout(() => {
      scheduleAllVitalNotifications(medications, skincareProducts).catch(() => {});
    }, 1500);
    return () => {
      if (notifDebounce.current) clearTimeout(notifDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications, skincareProducts, isLoading]);

  // ─── User profile ─────────────────────────────────────────────────────────
  const setUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setUserProfileState(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(next));
      return next;
    });
  }, []);

  // ─── Vital readings ────────────────────────────────────────────────────────
  const addVitalReading = useCallback(async (r: Omit<VitalReading, "id">) => {
    const newReading: VitalReading = { ...r, id: generateId() };
    setVitalReadings(prev => {
      const updated = [newReading, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.VITAL_READINGS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteVitalReading = useCallback(async (id: string) => {
    setVitalReadings(prev => {
      const updated = prev.filter(r => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.VITAL_READINGS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setTempUnit = useCallback(async (u: "F" | "C") => {
    setTempUnitState(u);
    await AsyncStorage.setItem(STORAGE_KEYS.TEMP_UNIT, u);
  }, []);

  // ─── Medications ──────────────────────────────────────────────────────────
  const addMedication = useCallback(async (med: Omit<Medication, "id">) => {
    const newMed: Medication = { ...med, id: generateId() };
    setMedications(prev => {
      const updated = [...prev, { ...newMed, sortOrder: prev.length }];
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateMedication = useCallback(async (id: string, updates: Partial<Medication>) => {
    setMedications(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    setMedications(prev => {
      const updated = prev.filter(m => m.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logMedication = useCallback(async (
    medicationId: string,
    groupId?: string,
    groupName?: string
  ): Promise<void> => {
    const now = new Date();
    setMedications(prevMeds => {
      const med = prevMeds.find(m => m.id === medicationId);
      if (!med) return prevMeds;
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
      setMedicationLogs(prevLogs => {
        const updatedLogs = [...prevLogs, log];
        AsyncStorage.setItem(STORAGE_KEYS.MED_LOGS, JSON.stringify(updatedLogs));
        return updatedLogs;
      });
      logMedicationDoseToHealthKit(med.name, now);
      const newCount = Math.max(0, med.remainingCount - 1);
      const updatedMeds = prevMeds.map(m =>
        m.id === medicationId ? { ...m, remainingCount: newCount } : m
      );
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updatedMeds));
      return updatedMeds;
    });
  }, []);

  const logMedicationGroup = useCallback(async (groupId: string) => {
    const now = new Date();
    setMedicationGroups(prevGroups => {
      const group = prevGroups.find(g => g.id === groupId);
      if (!group) return prevGroups;
      group.medicationIds.forEach(medId => {
        setMedications(prevMeds => {
          const med = prevMeds.find(m => m.id === medId);
          if (!med) return prevMeds;
          const log: MedicationLog = {
            id: generateId(),
            medicationId: medId,
            medicationName: med.name,
            dosage: med.dosage,
            unit: med.unit,
            takenAt: now.toISOString(),
            groupId,
            groupName: group.name,
          };
          setMedicationLogs(prev => {
            const updated = [...prev, log];
            AsyncStorage.setItem(STORAGE_KEYS.MED_LOGS, JSON.stringify(updated));
            return updated;
          });
          logMedicationDoseToHealthKit(med.name, now);
          const updatedMeds = prevMeds.map(m =>
            m.id === medId ? { ...m, remainingCount: Math.max(0, m.remainingCount - 1) } : m
          );
          AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updatedMeds));
          return updatedMeds;
        });
      });
      return prevGroups;
    });
  }, []);

  const refillMedication = useCallback(async (medicationId: string, amount: number) => {
    setMedications(prev => {
      const updated = prev.map(m =>
        m.id === medicationId
          ? { ...m, remainingCount: m.remainingCount + amount, bottleCount: amount, totalCount: amount, awaitingRefill: false }
          : m
      );
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setRemainingCount = useCallback(async (id: string, count: number) => {
    setMedications(prev => {
      const updated = prev.map(m =>
        m.id === id
          ? { ...m, remainingCount: Math.max(0, count), awaitingRefill: count === 0 ? m.awaitingRefill : false }
          : m
      );
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const archiveMedication = useCallback(async (id: string, mode: "storage" | "history") => {
    setMedications(prev => {
      const updated = prev.map(m =>
        m.id === id
          ? { ...m, status: mode as MedicationStatus, remainingCount: mode === "history" ? 0 : m.remainingCount, awaitingRefill: false }
          : m
      );
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const unarchiveMedication = useCallback(async (id: string) => {
    setMedications(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, status: "active" as MedicationStatus } : m);
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setAwaitingRefill = useCallback(async (id: string, value: boolean) => {
    setMedications(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, awaitingRefill: value } : m);
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const reorderMedications = useCallback(async (orderedIds: string[]) => {
    setMedications(prev => {
      const map = new Map(prev.map(m => [m.id, m]));
      const reordered = orderedIds
        .map((id, idx) => { const m = map.get(id); return m ? { ...m, sortOrder: idx } : null; })
        .filter(Boolean) as Medication[];
      const rest = prev.filter(m => !orderedIds.includes(m.id));
      const updated = [...reordered, ...rest];
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const reorderSkincareProducts = useCallback(async (orderedIds: string[]) => {
    setSkincareProducts(prev => {
      const map = new Map(prev.map(p => [p.id, p]));
      const reordered = orderedIds
        .map((id, idx) => { const p = map.get(id); return p ? { ...p, sortOrder: idx } : null; })
        .filter(Boolean) as SkincareProduct[];
      const rest = prev.filter(p => !orderedIds.includes(p.id));
      const updated = [...reordered, ...rest];
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ─── Medication groups ────────────────────────────────────────────────────
  const addMedicationGroup = useCallback(async (group: Omit<MedicationGroup, "id">) => {
    const newGroup: MedicationGroup = { ...group, id: generateId() };
    setMedicationGroups(prev => {
      const updated = [...prev, newGroup];
      AsyncStorage.setItem(STORAGE_KEYS.MED_GROUPS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateMedicationGroup = useCallback(async (id: string, updates: Partial<MedicationGroup>) => {
    setMedicationGroups(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, ...updates } : g);
      AsyncStorage.setItem(STORAGE_KEYS.MED_GROUPS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteMedicationGroup = useCallback(async (id: string) => {
    setMedicationGroups(prev => {
      const updated = prev.filter(g => g.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.MED_GROUPS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ─── Skincare products ────────────────────────────────────────────────────
  const addSkincareProduct = useCallback(async (product: Omit<SkincareProduct, "id">) => {
    const newProduct: SkincareProduct = { ...product, id: generateId() };
    setSkincareProducts(prev => {
      const updated = [...prev, newProduct];
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateSkincareProduct = useCallback(async (id: string, updates: Partial<SkincareProduct>) => {
    setSkincareProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteSkincareProduct = useCallback(async (id: string) => {
    setSkincareProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logSkincareProduct = useCallback(async (productId: string, routineId?: string, routineName?: string) => {
    setSkincareProducts(prevProducts => {
      const product = prevProducts.find(p => p.id === productId);
      if (!product) return prevProducts;
      const log: SkincareLog = {
        id: generateId(),
        productId,
        productName: product.name,
        productType: product.type,
        loggedAt: new Date().toISOString(),
        routineId,
        routineName,
      };
      setSkincareLogs(prev => {
        const updated = [...prev, log];
        AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_LOGS, JSON.stringify(updated));
        return updated;
      });
      return prevProducts;
    });
  }, []);

  const archiveSkincareProduct = useCallback(async (id: string, mode: "storage" | "history") => {
    setSkincareProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status: mode } : p);
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const unarchiveSkincareProduct = useCallback(async (id: string) => {
    setSkincareProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status: "active" as const } : p);
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logSkincareRoutine = useCallback(async (routineId: string) => {
    setSkincareRoutines(prevRoutines => {
      const routine = prevRoutines.find(r => r.id === routineId);
      if (!routine) return prevRoutines;
      setSkincareProducts(prevProducts => {
        routine.productIds.forEach(productId => {
          const product = prevProducts.find(p => p.id === productId);
          if (!product) return;
          const log: SkincareLog = {
            id: generateId(),
            productId,
            productName: product.name,
            productType: product.type,
            loggedAt: new Date().toISOString(),
            routineId,
            routineName: routine.name,
          };
          setSkincareLogs(prev => {
            const updated = [...prev, log];
            AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_LOGS, JSON.stringify(updated));
            return updated;
          });
        });
        return prevProducts;
      });
      return prevRoutines;
    });
  }, []);

  const addSkincareRoutine = useCallback(async (routine: Omit<SkincareRoutine, "id">) => {
    const newRoutine: SkincareRoutine = { ...routine, id: generateId() };
    setSkincareRoutines(prev => {
      const updated = [...prev, newRoutine];
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_ROUTINES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateSkincareRoutine = useCallback(async (id: string, updates: Partial<SkincareRoutine>) => {
    setSkincareRoutines(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_ROUTINES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteSkincareRoutine = useCallback(async (id: string) => {
    setSkincareRoutines(prev => {
      const updated = prev.filter(r => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_ROUTINES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ─── Existing log helpers ──────────────────────────────────────────────────
  const getTodayMedLogs = useCallback((): MedicationLog[] => {
    return medicationLogs.filter(l => isToday(l.takenAt));
  }, [medicationLogs]);

  const getTodaySkincareLogs = useCallback((): SkincareLog[] => {
    return skincareLogs.filter(l => isToday(l.loggedAt));
  }, [skincareLogs]);

  const getMedicationsNeedingRefill = useCallback((): Medication[] => {
    return medications.filter(
      m => m.status === "active" && m.notifyLowStock && m.remainingCount <= m.lowStockThreshold
    );
  }, [medications]);

  // ─── Day Logs ──────────────────────────────────────────────────────────────
  const buildDayLog = useCallback((date: string) => {
    setDayLogs(prevLogs => {
      const existing: DayLog = prevLogs[date] ?? { date, entries: [], reactionNotes: [] };
      let entries = [...existing.entries];

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
              const exists = entries.some(
                e => e.itemId === item.id && e.itemType === type && e.scheduledTime === time
              );
              if (!exists) {
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

      if (entries.length === existing.entries.length) return prevLogs;

      const updated = { ...prevLogs, [date]: { ...existing, entries } };
      AsyncStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(updated));
      return updated;
    });
  }, [medications, skincareProducts]);

  const getDayLog = useCallback((date: string): DayLog => {
    return dayLogs[date] ?? { date, entries: [], reactionNotes: [] };
  }, [dayLogs]);

  const saveDayLogs = (updated: Record<string, DayLog>) => {
    AsyncStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(updated));
  };

  const completeDayEntry = useCallback(async (date: string, entryId: string) => {
    setDayLogs(prev => {
      const log = prev[date];
      if (!log) return prev;
      const entry = log.entries.find(e => e.id === entryId);
      const entries = log.entries.map(e =>
        e.id === entryId ? { ...e, isComplete: true, completedAt: new Date().toISOString() } : e
      );
      const updated = { ...prev, [date]: { ...log, entries } };
      saveDayLogs(updated);
      // Write to HealthKit if medication
      if (entry?.itemType === "medication") {
        const med = medications.find(m => m.id === entry.itemId);
        if (med) {
          logMedicationDoseToHealthKit(med.name, new Date());
          // Also decrement pill count
          setMedications(prevMeds => {
            const u = prevMeds.map(m =>
              m.id === med.id ? { ...m, remainingCount: Math.max(0, m.remainingCount - 1) } : m
            );
            AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(u));
            return u;
          });
        }
      }
      return updated;
    });
  }, [medications]);

  const uncompleteDayEntry = useCallback(async (date: string, entryId: string) => {
    setDayLogs(prev => {
      const log = prev[date];
      if (!log) return prev;
      const entry = log.entries.find(e => e.id === entryId);
      const entries = log.entries.map(e =>
        e.id === entryId ? { ...e, isComplete: false, completedAt: undefined } : e
      );
      const updated = { ...prev, [date]: { ...log, entries } };
      saveDayLogs(updated);
      // Restore pill count if medication
      if (entry?.isComplete && entry?.itemType === "medication") {
        const med = medications.find(m => m.id === entry.itemId);
        if (med) {
          setMedications(prevMeds => {
            const u = prevMeds.map(m =>
              m.id === med.id ? { ...m, remainingCount: m.remainingCount + 1 } : m
            );
            AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(u));
            return u;
          });
        }
      }
      return updated;
    });
  }, [medications]);

  const completeAllInGroup = useCallback(async (date: string, itemType: string, scheduledTime: string) => {
    const now = new Date().toISOString();
    setDayLogs(prev => {
      const log = prev[date];
      if (!log) return prev;
      const entries = log.entries.map(e => {
        if (e.itemType === itemType && e.scheduledTime === scheduledTime && !e.isComplete) {
          // Side effects
          if (e.itemType === "medication") {
            const med = medications.find(m => m.id === e.itemId);
            if (med) {
              logMedicationDoseToHealthKit(med.name, new Date());
              setMedications(prevMeds => {
                const u = prevMeds.map(m =>
                  m.id === med.id ? { ...m, remainingCount: Math.max(0, m.remainingCount - 1) } : m
                );
                AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(u));
                return u;
              });
            }
          }
          return { ...e, isComplete: true, completedAt: now };
        }
        return e;
      });
      const updated = { ...prev, [date]: { ...log, entries } };
      saveDayLogs(updated);
      return updated;
    });
  }, [medications]);

  const logSkincareReaction = useCallback(async (
    date: string,
    reaction: Omit<SkincareReactionNote, "id">
  ) => {
    const newReaction: SkincareReactionNote = { ...reaction, id: generateId() };
    setDayLogs(prev => {
      const log: DayLog = prev[date] ?? { date, entries: [], reactionNotes: [] };
      const updated = {
        ...prev,
        [date]: { ...log, reactionNotes: [...log.reactionNotes, newReaction] },
      };
      saveDayLogs(updated);
      return updated;
    });
  }, []);

  // ─── Notifications ─────────────────────────────────────────────────────────
  const addNotification = useCallback(async (notif: Omit<AppNotification, "id">) => {
    const newNotif: AppNotification = { ...notif, id: generateId() };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ─── Insights ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    (async () => {
      const today = new Date();
      const todayStr = todayString();

      // Weekly insights: run on Sundays
      if (today.getDay() === 0) {
        const lastWeekly = await AsyncStorage.getItem(STORAGE_KEYS.INSIGHTS_WEEKLY);
        if (lastWeekly !== todayStr) {
          await AsyncStorage.setItem(STORAGE_KEYS.INSIGHTS_WEEKLY, todayStr);
          runWeeklyInsights(todayStr);
        }
      }

      // Monthly insights: run on the 1st
      if (today.getDate() === 1) {
        const lastMonthly = await AsyncStorage.getItem(STORAGE_KEYS.INSIGHTS_MONTHLY);
        if (lastMonthly !== todayStr) {
          await AsyncStorage.setItem(STORAGE_KEYS.INSIGHTS_MONTHLY, todayStr);
          runMonthlyInsights(todayStr);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const runWeeklyInsights = useCallback((todayStr: string) => {
    const past7: string[] = [];
    for (let i = 1; i <= 7; i++) {
      past7.push(toDateString(new Date(Date.now() - i * 86400000)));
    }
    setDayLogs(prevLogs => {
      // Count missed (isComplete===false) per item per scheduledTime
      const missedCount: Record<string, { name: string; time: string; count: number }> = {};
      past7.forEach(dateStr => {
        const log = prevLogs[dateStr];
        if (!log) return;
        const hasAnyComplete = log.entries.some(e => e.isComplete);
        if (!hasAnyComplete) return; // skip days with no completions (user was away)
        log.entries
          .filter(e => !e.isComplete)
          .forEach(e => {
            const key = `${e.itemId}-${e.scheduledTime}`;
            if (!missedCount[key]) {
              missedCount[key] = { name: e.itemName, time: e.scheduledTime, count: 0 };
            }
            missedCount[key].count++;
          });
      });

      // Generate insights for items missed 2+ times
      Object.values(missedCount)
        .filter(v => v.count >= 2)
        .forEach(v => {
          const [h, m] = v.time.split(":").map(Number);
          const period = h >= 12 ? "PM" : "AM";
          const hour = h % 12 === 0 ? 12 : h % 12;
          const timeLabel = `${hour}:${String(m).padStart(2, "0")} ${period}`;
          addNotification({
            type: "insight",
            message: `You've been missing ${v.name} at ${timeLabel} this week.`,
            detail: `It was missed ${v.count} times in the past 7 days. Try adjusting the scheduled time to one that works better for your routine.`,
            createdAt: new Date().toISOString(),
            read: false,
          });
        });

      return prevLogs;
    });
  }, [addNotification]);

  const runMonthlyInsights = useCallback((todayStr: string) => {
    const past30: string[] = [];
    for (let i = 1; i <= 30; i++) {
      past30.push(toDateString(new Date(Date.now() - i * 86400000)));
    }
    setDayLogs(prevLogs => {
      const missedByItem: Record<string, { name: string; total: number; byDow: number[] }> = {};
      past30.forEach(dateStr => {
        const log = prevLogs[dateStr];
        if (!log) return;
        const hasAnyComplete = log.entries.some(e => e.isComplete);
        if (!hasAnyComplete) return;
        const dow = new Date(dateStr + "T12:00:00").getDay();
        log.entries
          .filter(e => !e.isComplete)
          .forEach(e => {
            if (!missedByItem[e.itemId]) {
              missedByItem[e.itemId] = { name: e.itemName, total: 0, byDow: new Array(7).fill(0) };
            }
            missedByItem[e.itemId].total++;
            missedByItem[e.itemId].byDow[dow]++;
          });
      });

      const dayNames = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
      Object.values(missedByItem)
        .filter(v => v.total >= 4)
        .forEach(v => {
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

      return prevLogs;
    });
  }, [addNotification]);

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
    getTodayMedLogs,
    getTodaySkincareLogs,
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
