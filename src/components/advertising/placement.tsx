import "server-only";
import { advertisingConfiguration, type AdPlacement } from "@/lib/advertising";
import { AdsensePlacement } from "./adsense";
import { site } from "@/lib/config/site";

export function AdvertisingPlacement({ placement, path, eligible }: { placement: AdPlacement; path: string; eligible: boolean }) {
  const config = advertisingConfiguration();
  if (!eligible || !config.ready || (config.mode === "manual" && !config.slots[placement])) return null;
  return <AdsensePlacement path={path} origin={site.origin} publisher={config.publisher!} cmpId={config.cmpId!}
    cmpScript={config.cmpScript!} mode={config.mode} slot={config.slots[placement]} />;
}
