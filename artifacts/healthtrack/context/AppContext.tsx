import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { logMedicationDoseToHealthKit } from "@/utils/healthKit";
import { UserProfile } from "@/utils/drugInteractions";

export type MedicationStatus = "active" | "storage" | "history";
export type MedicationCategory = "prescription" | "generic" | "supplement";

export type { UserProfile };

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

export type SkincareProduct = {
  id: string;
  name: string;
  type: string;
  brand: string;
  color: string;
  routineId?: string;
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

  addMedicationGroup: (group: Omit<MedicationGroup, "id">) => Promise<void>;
  updateMedicationGroup: (id: string, updates: Partial<MedicationGroup>) => Promise<void>;
  deleteMedicationGroup: (id: string) => Promise<void>;

  addSkincareProduct: (product: Omit<SkincareProduct, "id">) => Promise<void>;
  updateSkincareProduct: (id: string, updates: Partial<SkincareProduct>) => Promise<void>;
  deleteSkincareProduct: (id: string) => Promise<void>;
  logSkincareProduct: (productId: string, routineId?: string, routineName?: string) => Promise<void>;
  logSkincareRoutine: (routineId: string) => Promise<void>;

  addSkincareRoutine: (routine: Omit<SkincareRoutine, "id">) => Promise<void>;
  updateSkincareRoutine: (id: string, updates: Partial<SkincareRoutine>) => Promise<void>;
  deleteSkincareRoutine: (id: string) => Promise<void>;

  getTodayMedLogs: () => MedicationLog[];
  getTodaySkincareLogs: () => SkincareLog[];
  getMedicationsNeedingRefill: () => Medication[];

  userProfile: UserProfile;
  setUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
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
  };
}

const DEFAULT_USER_PROFILE: UserProfile = {
  drinksAlcohol: false,
  smokesTobacco: false,
  otherDrugs: "",
};

const STORAGE_KEYS = {
  MEDICATIONS: "@healthtrack_medications",
  MED_GROUPS: "@healthtrack_med_groups",
  MED_LOGS: "@healthtrack_med_logs",
  SKINCARE_PRODUCTS: "@healthtrack_skincare_products",
  SKINCARE_ROUTINES: "@healthtrack_skincare_routines",
  SKINCARE_LOGS: "@healthtrack_skincare_logs",
  USER_PROFILE: "@vital_user_profile",
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

  useEffect(() => {
    (async () => {
      try {
        const [meds, groups, medLogs, products, routines, skinLogs, profileRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.MED_GROUPS),
          AsyncStorage.getItem(STORAGE_KEYS.MED_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.SKINCARE_PRODUCTS),
          AsyncStorage.getItem(STORAGE_KEYS.SKINCARE_ROUTINES),
          AsyncStorage.getItem(STORAGE_KEYS.SKINCARE_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        ]);
        if (meds) setMedications((JSON.parse(meds) as any[]).map((m, i) => migrateMedication(m, i)));
        if (groups) setMedicationGroups(JSON.parse(groups));
        if (medLogs) setMedicationLogs(JSON.parse(medLogs));
        if (products) setSkincareProducts(JSON.parse(products));
        if (routines) setSkincareRoutines(JSON.parse(routines));
        if (skinLogs) setSkincareLogs(JSON.parse(skinLogs));
        if (profileRaw) setUserProfileState({ ...DEFAULT_USER_PROFILE, ...JSON.parse(profileRaw) });
      } catch (e) {
        console.error("Error loading data", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setUserProfileState(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(next));
      return next;
    });
  }, []);

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
          ? {
              ...m,
              remainingCount: m.remainingCount + amount,
              bottleCount: amount,
              totalCount: amount,
              awaitingRefill: false,
            }
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
          ? {
              ...m,
              status: mode as MedicationStatus,
              remainingCount: mode === "history" ? 0 : m.remainingCount,
              awaitingRefill: false,
            }
          : m
      );
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const unarchiveMedication = useCallback(async (id: string) => {
    setMedications(prev => {
      const updated = prev.map(m =>
        m.id === id ? { ...m, status: "active" as MedicationStatus } : m
      );
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setAwaitingRefill = useCallback(async (id: string, value: boolean) => {
    setMedications(prev => {
      const updated = prev.map(m =>
        m.id === id ? { ...m, awaitingRefill: value } : m
      );
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const reorderMedications = useCallback(async (orderedIds: string[]) => {
    setMedications(prev => {
      const map = new Map(prev.map(m => [m.id, m]));
      const reordered = orderedIds
        .map((id, idx) => {
          const m = map.get(id);
          return m ? { ...m, sortOrder: idx } : null;
        })
        .filter(Boolean) as Medication[];
      const rest = prev.filter(m => !orderedIds.includes(m.id));
      const updated = [...reordered, ...rest];
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

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

  const logSkincareProduct = useCallback(async (
    productId: string,
    routineId?: string,
    routineName?: string
  ) => {
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
    addMedicationGroup,
    updateMedicationGroup,
    deleteMedicationGroup,
    addSkincareProduct,
    updateSkincareProduct,
    deleteSkincareProduct,
    logSkincareProduct,
    logSkincareRoutine,
    addSkincareRoutine,
    updateSkincareRoutine,
    deleteSkincareRoutine,
    getTodayMedLogs,
    getTodaySkincareLogs,
    getMedicationsNeedingRefill,
    userProfile,
    setUserProfile,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
