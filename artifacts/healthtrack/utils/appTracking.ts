import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  FIRST_OPEN_DATE:      "@vital_first_open_date",
  OPEN_COUNT:           "@vital_open_count",
  LAST_DONATION_SHOWN:  "@vital_last_donation_shown",
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export type OpenTrackingResult = {
  openCount: number;
  firstOpenDate: string;
  shouldShowDonation: boolean;
};

export async function trackAppOpen(): Promise<OpenTrackingResult> {
  const now = new Date();

  const [rawFirst, rawCount, rawLastShown] = await Promise.all([
    AsyncStorage.getItem(KEYS.FIRST_OPEN_DATE),
    AsyncStorage.getItem(KEYS.OPEN_COUNT),
    AsyncStorage.getItem(KEYS.LAST_DONATION_SHOWN),
  ]);

  const firstOpenDate: string = rawFirst ?? now.toISOString();
  const openCount: number = (parseInt(rawCount ?? "0") || 0) + 1;

  const saves: Promise<void>[] = [
    AsyncStorage.setItem(KEYS.OPEN_COUNT, openCount.toString()),
  ];
  if (!rawFirst) {
    saves.push(AsyncStorage.setItem(KEYS.FIRST_OPEN_DATE, firstOpenDate));
  }
  await Promise.all(saves);

  const firstDate = new Date(firstOpenDate);
  const daysSinceFirst = daysBetween(firstDate, now);
  const lastShown = rawLastShown ? new Date(rawLastShown) : null;
  const daysSinceShown = lastShown ? daysBetween(lastShown, now) : Infinity;

  let shouldShowDonation = false;

  if (openCount === 3 || openCount === 30) {
    shouldShowDonation = true;
  } else if (daysSinceFirst >= 365 && daysSinceShown >= 365) {
    shouldShowDonation = true;
  }

  return { openCount, firstOpenDate, shouldShowDonation };
}

export async function recordDonationShown(): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_DONATION_SHOWN, new Date().toISOString());
}
