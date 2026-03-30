import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

const STORAGE_KEYS = {
  MEDICATIONS: "@healthtrack_medications",
  MED_GROUPS: "@healthtrack_med_groups",
  MED_LOGS: "@healthtrack_med_logs",
  SKINCARE_PRODUCTS: "@healthtrack_skincare_products",
  SKINCARE_ROUTINES: "@healthtrack_skincare_routines",
  SKINCARE_LOGS: "@healthtrack_skincare_logs",
  DAY_LOGS: "@vital_day_logs",
  USER_PROFILE: "@vital_user_profile",
  NOTIFICATIONS: "@vital_notifications",
};

const APP_NAME = "PrivaCare";

export type BackupData = {
  version: number;
  exportedAt: string;
  appName: string;
  medications: unknown;
  medicationGroups: unknown;
  medicationLogs: unknown;
  skincareProducts: unknown;
  skincareRoutines: unknown;
  skincareLogs: unknown;
  dayLogs: unknown;
  userProfile: unknown;
  notifications: unknown;
};

async function gatherBackupData(): Promise<BackupData> {
  const [meds, groups, medLogs, products, routines, skinLogs, dayLogs, userProfile, notifications] =
    await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS),
      AsyncStorage.getItem(STORAGE_KEYS.MED_GROUPS),
      AsyncStorage.getItem(STORAGE_KEYS.MED_LOGS),
      AsyncStorage.getItem(STORAGE_KEYS.SKINCARE_PRODUCTS),
      AsyncStorage.getItem(STORAGE_KEYS.SKINCARE_ROUTINES),
      AsyncStorage.getItem(STORAGE_KEYS.SKINCARE_LOGS),
      AsyncStorage.getItem(STORAGE_KEYS.DAY_LOGS),
      AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
      AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
    ]);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: APP_NAME,
    medications: meds ? JSON.parse(meds) : [],
    medicationGroups: groups ? JSON.parse(groups) : [],
    medicationLogs: medLogs ? JSON.parse(medLogs) : [],
    skincareProducts: products ? JSON.parse(products) : [],
    skincareRoutines: routines ? JSON.parse(routines) : [],
    skincareLogs: skinLogs ? JSON.parse(skinLogs) : [],
    dayLogs: dayLogs ? JSON.parse(dayLogs) : {},
    userProfile: userProfile ? JSON.parse(userProfile) : null,
    notifications: notifications ? JSON.parse(notifications) : [],
  };
}

export async function exportBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const backup = await gatherBackupData();
    const json = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `privacre-backup-${dateStr}.json`;

    if (Platform.OS === "web") {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, message: "Backup downloaded" };
    }

    const docDir = FileSystem.documentDirectory;
    if (!docDir) return { success: false, message: "Cannot access device storage" };

    const filePath = `${docDir}${filename}`;
    await FileSystem.writeAsStringAsync(filePath, json, { encoding: FileSystem.EncodingType.UTF8 });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: "application/json",
        dialogTitle: "Save Backup",
        UTI: "public.json",
      });
    }

    return { success: true, message: `Backup saved as ${filename}` };
  } catch (err) {
    console.error("Export error:", err);
    return { success: false, message: "Export failed. Please try again." };
  }
}

export async function saveBackupToDocuments(): Promise<{ success: boolean; path?: string; message: string }> {
  try {
    const backup = await gatherBackupData();
    const json = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `privacre-backup-${dateStr}.json`;
    const docDir = FileSystem.documentDirectory;

    if (!docDir) return { success: false, message: "Cannot access device storage" };

    const filePath = `${docDir}${filename}`;
    await FileSystem.writeAsStringAsync(filePath, json, { encoding: FileSystem.EncodingType.UTF8 });

    return { success: true, path: filePath, message: filename };
  } catch (err) {
    console.error("Save backup error:", err);
    return { success: false, message: "Failed to save backup" };
  }
}

export async function listBackups(): Promise<string[]> {
  try {
    const docDir = FileSystem.documentDirectory;
    if (!docDir) return [];
    const files = await FileSystem.readDirectoryAsync(docDir);
    return files
      .filter(f => (f.startsWith("privacre-backup-") || f.startsWith("vital-backup-")) && f.endsWith(".json"))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function importBackup(): Promise<{
  success: boolean;
  message: string;
  data?: BackupData;
}> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) {
      return { success: false, message: "No file selected" };
    }

    const file = result.assets[0];
    const content = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const data: BackupData = JSON.parse(content);

    if (!data.version || !data.appName || (data.appName !== "PrivaCare" && data.appName !== "Vital")) {
      return { success: false, message: "This file is not a valid PrivaCare backup" };
    }

    return { success: true, message: "Backup file loaded", data };
  } catch (err) {
    console.error("Import error:", err);
    return { success: false, message: "Could not read backup file" };
  }
}

export async function restoreBackup(data: BackupData): Promise<{ success: boolean; message: string }> {
  try {
    const writes: Promise<void>[] = [
      AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(data.medications || [])),
      AsyncStorage.setItem(STORAGE_KEYS.MED_GROUPS, JSON.stringify(data.medicationGroups || [])),
      AsyncStorage.setItem(STORAGE_KEYS.MED_LOGS, JSON.stringify(data.medicationLogs || [])),
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_PRODUCTS, JSON.stringify(data.skincareProducts || [])),
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_ROUTINES, JSON.stringify(data.skincareRoutines || [])),
      AsyncStorage.setItem(STORAGE_KEYS.SKINCARE_LOGS, JSON.stringify(data.skincareLogs || [])),
    ];
    if (data.dayLogs !== undefined) {
      writes.push(AsyncStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(data.dayLogs)));
    }
    if (data.userProfile !== undefined && data.userProfile !== null) {
      writes.push(AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.userProfile)));
    }
    if (data.notifications !== undefined) {
      writes.push(AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(data.notifications)));
    }
    await Promise.all(writes);
    return { success: true, message: "Backup restored successfully" };
  } catch (err) {
    console.error("Restore error:", err);
    return { success: false, message: "Restore failed. Please try again." };
  }
}

export function formatBackupDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch {
    return isoDate;
  }
}
