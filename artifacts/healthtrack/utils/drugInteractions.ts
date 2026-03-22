import AsyncStorage from "@react-native-async-storage/async-storage";

const RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST";
const RXCUI_CACHE_KEY = "@vital_rxcui_cache";

const SUBSTANCE_RXCUIS: Record<string, { rxcui: string; label: string }> = {
  alcohol: { rxcui: "3498", label: "Alcohol" },
  tobacco: { rxcui: "36567", label: "Tobacco/Nicotine" },
};

export type DrugInteraction = {
  drug1: string;
  drug2: string;
  description: string;
  severity: string;
};

export type InteractionCheckResult = {
  interactions: DrugInteraction[];
  checkedAt: string;
  warnings: string[];
};

async function getRxCUICache(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(RXCUI_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveRxCUICache(cache: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(RXCUI_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export async function lookupRxCUI(name: string): Promise<string | null> {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return null;

  const cache = await getRxCUICache();
  if (cache[normalizedName]) return cache[normalizedName];

  try {
    const encoded = encodeURIComponent(name.trim());
    const res = await fetch(
      `${RXNORM_BASE}/rxcui.json?name=${encoded}&search=1`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const ids: string[] | undefined = json?.idGroup?.rxnormId;
    if (ids && ids.length > 0) {
      const rxcui = ids[0];
      const updated = { ...cache, [normalizedName]: rxcui };
      await saveRxCUICache(updated);
      return rxcui;
    }
  } catch {}
  return null;
}

async function fetchInteractionList(rxcuis: string[]): Promise<DrugInteraction[]> {
  if (rxcuis.length < 2) return [];
  try {
    const cuiList = rxcuis.join("+");
    const res = await fetch(
      `${RXNORM_BASE}/interaction/list.json?rxcuis=${cuiList}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const json = await res.json();

    const interactions: DrugInteraction[] = [];
    const groups = json?.fullInteractionTypeGroup ?? [];

    for (const group of groups) {
      const types = group?.fullInteractionType ?? [];
      for (const type of types) {
        const pairs = type?.interactionPair ?? [];
        for (const pair of pairs) {
          const concepts = pair?.interactionConcept ?? [];
          const drug1 = concepts[0]?.minConceptItem?.name ?? "Unknown";
          const drug2 = concepts[1]?.minConceptItem?.name ?? "Unknown";
          const description = pair?.description ?? "";
          const severity = pair?.severity ?? "unknown";
          if (description) {
            interactions.push({ drug1, drug2, description, severity });
          }
        }
      }
    }
    return interactions;
  } catch {
    return [];
  }
}

export type UserProfile = {
  drinksAlcohol: boolean;
  smokesTobacco: boolean;
  otherDrugs: string;
};

export async function checkAllInteractions(
  medicationNames: string[],
  userProfile: UserProfile
): Promise<InteractionCheckResult> {
  const warnings: string[] = [];
  const allRxcuis: { rxcui: string; label: string }[] = [];

  const lookups = await Promise.all(
    medicationNames.map(async name => {
      const rxcui = await lookupRxCUI(name);
      return { name, rxcui };
    })
  );

  for (const { name, rxcui } of lookups) {
    if (rxcui) {
      allRxcuis.push({ rxcui, label: name });
    } else {
      warnings.push(`Could not find drug database entry for "${name}"`);
    }
  }

  if (userProfile.drinksAlcohol) {
    allRxcuis.push(SUBSTANCE_RXCUIS.alcohol);
  }
  if (userProfile.smokesTobacco) {
    allRxcuis.push(SUBSTANCE_RXCUIS.tobacco);
  }

  if (allRxcuis.length < 2) {
    return { interactions: [], checkedAt: new Date().toISOString(), warnings };
  }

  const rxcuiIds = allRxcuis.map(r => r.rxcui);
  const interactions = await fetchInteractionList(rxcuiIds);

  const labelMap: Record<string, string> = {};
  for (const { rxcui, label } of allRxcuis) {
    labelMap[rxcui] = label;
  }

  const enriched: DrugInteraction[] = interactions.map(i => ({
    ...i,
    drug1: i.drug1,
    drug2: i.drug2,
  }));

  return {
    interactions: enriched,
    checkedAt: new Date().toISOString(),
    warnings,
  };
}
