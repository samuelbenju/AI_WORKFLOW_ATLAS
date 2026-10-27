import { indexingEnabled } from "./seo-policy";

export const advertisingOptOutCookie = "atlas_ads_off";
export const advertisingOptOutVersion = "v1";
export const googleAdvertisingVendor = 755;
export const advertisingPurposes = [1, 2, 3, 4, 7, 9, 10] as const;
export const adPlacements = ["home", "tools", "guides", "article"] as const;
export type AdPlacement = typeof adPlacements[number];
export type AdvertisingConfiguration = {
  ready: boolean;
  publisher: string | null;
  mode: "manual" | "auto";
  cmpId: number | null;
  cmpScript: string | null;
  slots: Partial<Record<AdPlacement, string>>;
  gates: { id: string; passed: boolean }[];
};

export function advertisingConfiguration(env: Record<string, string | undefined> = process.env): AdvertisingConfiguration {
  const publisher = /^ca-pub-\d{16}$/.test(env.ADSENSE_PUBLISHER_ID ?? "") ? env.ADSENSE_PUBLISHER_ID! : null;
  const cmpId = /^[1-9]\d{0,5}$/.test(env.ADSENSE_CMP_ID ?? "") ? Number(env.ADSENSE_CMP_ID) : null;
  let cmpScript: string | null = null;
  try {
    const u = new URL(env.ADSENSE_CMP_SCRIPT_URL ?? "");
    // This adapter supports Google's generated Privacy & messaging tag only.
    // A public publisher ID is not an API credential. Never accept arbitrary JS.
    if (publisher && u.origin === "https://fundingchoicesmessages.google.com" && !u.username && !u.password && !u.hash
      && u.pathname === `/i/${publisher.slice(3)}` && u.search === "?ers=1") cmpScript = u.href;
  } catch { /* Missing or invalid configuration keeps advertising disabled. */ }
  const mode = env.ADSENSE_MODE === "auto" ? "auto" : "manual";
  const slots: Partial<Record<AdPlacement, string>> = {};
  for (const placement of adPlacements) {
    const value = env[`ADSENSE_SLOT_${placement.toUpperCase()}`];
    if (/^[1-9]\d{4,19}$/.test(value ?? "")) slots[placement] = value!;
  }
  const gates = [
    { id: "enabled", passed: env.ADSENSE_ENABLED === "true" },
    { id: "publisher", passed: !!publisher },
    { id: "site_approved", passed: env.ADSENSE_SITE_APPROVED === "true" },
    { id: "placements_reviewed", passed: env.ADSENSE_PLACEMENTS_REVIEWED === "true" },
    { id: "public_launch", passed: indexingEnabled(env) },
    { id: "certified_cmp_reviewed", passed: env.ADSENSE_CONSENT_READY === "true" && !!cmpId && !!cmpScript },
    { id: "mode", passed: env.ADSENSE_MODE === undefined || ["manual", "auto"].includes(env.ADSENSE_MODE) },
    { id: "not_automated_test", passed: env.ATLAS_ISOLATED_E2E !== "true" && env.NODE_ENV !== "test" },
  ];
  return { ready: gates.every(g => g.passed), publisher, mode, cmpId, cmpScript, slots, gates };
}

export function advertisingPath(path: string) {
  return /^(?:\/|\/tools|\/use-cases|\/(?:blog|use-cases)\/[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(path);
}

export type TcfData = {
  cmpId?: number; cmpStatus?: string; eventStatus?: string; listenerId?: number;
  gdprApplies?: boolean; tcString?: string; isServiceSpecific?: boolean;
  purpose?: { consents?: Record<string, boolean> };
  vendor?: { consents?: Record<string, boolean> };
  publisher?: { restrictions?: Record<string, Record<string, number>> };
};
export type PrivacySignals = { dnt?: string | null; gpc?: boolean; optedOut?: boolean };
export function advertisingDenied(signals: PrivacySignals) {
  return signals.dnt === "1" || signals.gpc === true || signals.optedOut === true;
}
export function advertisingConsent(data: TcfData | undefined, cmpId: number | null, signals: PrivacySignals = {}) {
  if (advertisingDenied(signals) || !data || !cmpId || data.cmpId !== cmpId || data.cmpStatus !== "loaded"
    || !["tcloaded", "useractioncomplete"].includes(data.eventStatus ?? "") || data.gdprApplies !== true
    || data.isServiceSpecific !== true || !/^[A-Za-z0-9_.-]{20,8192}$/.test(data.tcString ?? "")) return false;
  // Conservative initial policy worldwide: no legitimate-interest fallback,
  // limited ads or non-personalized fallback inferred from absence of consent.
  return data.vendor?.consents?.[googleAdvertisingVendor] === true && advertisingPurposes.every(purpose =>
    data.purpose?.consents?.[purpose] === true
    && ![0, 2].includes(data.publisher?.restrictions?.[purpose]?.[googleAdvertisingVendor] ?? -1));
}

export function adsTxt(env: Record<string, string | undefined> = process.env) {
  const config = advertisingConfiguration(env);
  // ads.txt authorizes a seller; it does not prove Google approval or revenue.
  return config.publisher && env.ADSENSE_SITE_APPROVED === "true" && indexingEnabled(env)
    ? `google.com, ${config.publisher.slice(3)}, DIRECT, f08c47fec0942fa0\n` : null;
}
