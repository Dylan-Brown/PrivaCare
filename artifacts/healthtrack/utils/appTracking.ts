import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  FIRST_OPEN_DATE:      "@vital_first_open_date",
  OPEN_COUNT:           "@vital_open_count",
  LAST_DONATION_SHOWN:  "@vital_last_donation_shown",
  DONATION_SHOWN_COUNT: "@vital_donation_shown_count",
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export type OpenTrackingResult = {
  openCount: number;
  firstOpenDate: string;
  shouldShowDonation: boolean;
  donationPromptCount: number;
};

export async function trackAppOpen(): Promise<OpenTrackingResult> {
  const now = new Date();

  const [rawFirst, rawCount, rawLastShown, rawPromptCount] = await Promise.all([
    AsyncStorage.getItem(KEYS.FIRST_OPEN_DATE),
    AsyncStorage.getItem(KEYS.OPEN_COUNT),
    AsyncStorage.getItem(KEYS.LAST_DONATION_SHOWN),
    AsyncStorage.getItem(KEYS.DONATION_SHOWN_COUNT),
  ]);

  const firstOpenDate: string = rawFirst ?? now.toISOString();
  const openCount: number = (parseInt(rawCount ?? "0") || 0) + 1;
  const donationPromptCount: number = parseInt(rawPromptCount ?? "0") || 0;

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

  if (donationPromptCount === 0) {
    // First prompt: after 5+ opens and at least 5 days since install
    if (openCount >= 5 && daysSinceFirst >= 5) {
      shouldShowDonation = true;
    }
  } else if (donationPromptCount === 1) {
    // Second prompt: 30 days after first prompt
    if (daysSinceShown >= 30) {
      shouldShowDonation = true;
    }
  } else {
    // Subsequent prompts: every 60 days
    if (daysSinceShown >= 60) {
      shouldShowDonation = true;
    }
  }

  return { openCount, firstOpenDate, shouldShowDonation, donationPromptCount };
}

export async function recordDonationShown(): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.DONATION_SHOWN_COUNT);
  const count = (parseInt(raw ?? "0") || 0) + 1;
  await Promise.all([
    AsyncStorage.setItem(KEYS.LAST_DONATION_SHOWN, new Date().toISOString()),
    AsyncStorage.setItem(KEYS.DONATION_SHOWN_COUNT, count.toString()),
  ]);
}
