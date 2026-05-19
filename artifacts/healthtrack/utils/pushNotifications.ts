import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Medication, SkincareProduct } from "@/context/AppContext";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowList: true,
    }),
  });
}

const PREFIX = "privacre_sch_";

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("privacre_reminders", {
      name: "Health Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#34C78B",
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function fmt12(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${minute.toString().padStart(2, "0")} ${period}`;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]}`;
  return `${names[0]}, ${names[1]} & ${names.length - 2} more`;
}

export async function scheduleAllPrivaCareNotifications(
  medications: Medication[],
  skincareProducts: SkincareProduct[],
): Promise<void> {
  if (Platform.OS === "web") return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const timeGroups = new Map<string, string[]>();

  const activeMeds = medications.filter(
    m => m.status === "active" && !m.schedule.asNeeded,
  );
  const activeProducts = skincareProducts.filter(
    p => (!("status" in p) || (p as any).status === "active") && !p.schedule.asNeeded,
  );

  for (const item of [...activeMeds, ...activeProducts]) {
    if (item.schedule.asNeeded) continue;
    const times = (item.schedule as any).times as string[] | undefined;
    if (!times) continue;
    for (const t of times) {
      if (!timeGroups.has(t)) timeGroups.set(t, []);
      timeGroups.get(t)!.push(item.name);
    }
  }

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter(n => n.identifier.startsWith(PREFIX))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  for (const [time, names] of timeGroups) {
    const parts = time.split(":");
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    if (isNaN(hour) || isNaN(minute)) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${time.replace(":", "_")}`,
      content: {
        title: `PrivaCare — ${fmt12(hour, minute)}`,
        body: joinNames(names),
        data: { screen: "today" },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

export async function cancelAllPrivaCareNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter(n => n.identifier.startsWith(PREFIX))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
