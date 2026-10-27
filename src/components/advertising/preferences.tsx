"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { privacySignals, setAdvertisingOptOut, subscribeAdvertisingPreferences } from "./adsense";

export function AdvertisingPreferences() {
  const off = useSyncExternalStore(subscribeAdvertisingPreferences, () => privacySignals().optedOut, () => false);
  return <section className="privacy-controls" aria-label="Advertising privacy">
    <p>Advertising choices are separate from optional analytics. Ads require the configured certified consent provider.</p>
    <div className="privacy-actions">
      <button className="text-link" onClick={() => {
        setAdvertisingOptOut(!off); location.reload();
      }}>{off ? "Use my CMP advertising choice" : "Turn off ads in this browser"}</button>
      <button className="text-link" onClick={() => {
        if (window.googlefc?.showRevocationMessage) window.googlefc.showRevocationMessage();
        else location.assign(new URL("/cookies#advertising-choices", location.origin).href);
      }}>Review advertising consent</button>
      <Link href="/advertising">Advertising disclosure</Link>
    </div>
  </section>;
}
