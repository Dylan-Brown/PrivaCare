import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HEALTHKIT_ENABLED_KEY = "@healthtrack_healthkit_enabled";

export type HealthKitStatus =
  | "unavailable"
  | "disabled"
  | "not_determined"
  | "authorized"
  | "denied";

let _HK: any = null;

async function getHK(): Promise<any | null> {
  if (Platform.OS !== "ios") return null;
  if (_HK) return _HK;
  try {
    _HK = await import("@kingstinct/react-native-healthkit");
    return _HK;
  } catch {
    return null;
  }
}

export async function isHealthKitAvailable(): Promise<boolean> {
  const HK = await getHK();
  if (!HK) return false;
  try {
    return await HK.isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function getHealthKitSyncEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(HEALTHKIT_ENABLED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function setHealthKitSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(HEALTHKIT_ENABLED_KEY, enabled ? "true" : "false");
}

export async function requestHealthKitPermissions(): Promise<{
  success: boolean;
  message: string;
}> {
  const HK = await getHK();
  if (!HK) {
    return {
      success: false,
      message:
        "Apple Health is only available on a native iOS build. It does not work in the Expo preview.",
    };
  }
  try {
    const available = await HK.isHealthDataAvailable();
    if (!available) {
      return {
        success: false,
        message: "Apple Health is not available on this device.",
      };
    }

    await HK.requestAuthorization({
      toShare: ["HKCategoryTypeIdentifierMedicationDoseEvent"],
      toRead: [],
    });

    return {
      success: true,
      message: "Apple Health access granted",
    };
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    if (msg.includes("not determined") || msg.includes("denied")) {
      return {
        success: false,
        message:
          "Apple Health permission was denied. You can enable it in Settings → Health → Data Access & Devices.",
      };
    }
    return {
      success: false,
      message:
        "Could not connect to Apple Health. This feature requires a native iOS build — it is not available in the Expo preview.",
    };
  }
}

export async function requestVitalsHealthKitPermissions(): Promise<{
  success: boolean;
  message: string;
}> {
  const HK = await getHK();
  if (!HK) {
    return {
      success: false,
      message:
        "Apple Health is only available on a native iOS build.",
    };
  }
  try {
    const available = await HK.isHealthDataAvailable();
    if (!available) {
      return { success: false, message: "Apple Health is not available on this device." };
    }
    await HK.requestAuthorization({
      toShare: [
        "HKQuantityTypeIdentifierOxygenSaturation",
        "HKQuantityTypeIdentifierBodyTemperature",
        "HKCorrelationTypeIdentifierBloodPressure",
        "HKQuantityTypeIdentifierBloodPressureSystolic",
        "HKQuantityTypeIdentifierBloodPressureDiastolic",
      ],
      toRead: [],
    });
    return { success: true, message: "Vitals access granted" };
  } catch (err: any) {
    return {
      success: false,
      message: "Could not connect to Apple Health for vitals. This requires a native iOS build.",
    };
  }
}

export async function saveVitalToHealthKit(reading: {
  type: "SpO2" | "BloodPressure" | "TempOral" | "TempForehead";
  value: number | { systolic: number; diastolic: number };
  timestamp: string;
}): Promise<void> {
  const enabled = await getHealthKitSyncEnabled();
  if (!enabled) return;

  const HK = await getHK();
  if (!HK) return;

  try {
    const at = new Date(reading.timestamp);

    if (reading.type === "SpO2" && typeof reading.value === "number") {
      await HK.saveQuantitySample(
        "HKQuantityTypeIdentifierOxygenSaturation",
        "HKUnit.percent",
        reading.value / 100,
        at,
        at
      );
    } else if (
      (reading.type === "TempOral" || reading.type === "TempForehead") &&
      typeof reading.value === "number"
    ) {
      await HK.saveQuantitySample(
        "HKQuantityTypeIdentifierBodyTemperature",
        "HKUnit.degreeFahrenheit",
        reading.value,
        at,
        at,
        {
          HKMetadataKeyBodyTemperatureSensorLocation:
            reading.type === "TempOral" ? 1 : 0,
        }
      );
    } else if (
      reading.type === "BloodPressure" &&
      typeof reading.value === "object" &&
      reading.value !== null
    ) {
      const bp = reading.value as { systolic: number; diastolic: number };
      await HK.saveCorrelationSample(
        "HKCorrelationTypeIdentifierBloodPressure",
        [
          {
            quantityType: "HKQuantityTypeIdentifierBloodPressureSystolic",
            unit: "HKUnit.millimeterOfMercury",
            value: bp.systolic,
            startDate: at,
            endDate: at,
          },
          {
            quantityType: "HKQuantityTypeIdentifierBloodPressureDiastolic",
            unit: "HKUnit.millimeterOfMercury",
            value: bp.diastolic,
            startDate: at,
            endDate: at,
          },
        ],
        at,
        at
      );
    }
  } catch (err) {
    console.warn("[HealthKit] Failed to save vital reading:", err);
  }
}

export async function logMedicationDoseToHealthKit(
  medicationName: string,
  takenAt: Date
): Promise<void> {
  const enabled = await getHealthKitSyncEnabled();
  if (!enabled) return;

  const HK = await getHK();
  if (!HK) return;

  try {
    await HK.saveCategorySample(
      "HKCategoryTypeIdentifierMedicationDoseEvent",
      0,
      takenAt,
      takenAt,
      { HKMetadataKeyExternalUUID: medicationName }
    );
  } catch (err) {
    console.warn("[HealthKit] Failed to log dose event:", err);
  }
}
