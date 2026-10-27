"use client";

import Script from "next/script";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  advertisingConsent, advertisingDenied, advertisingOptOutCookie, advertisingOptOutVersion,
  advertisingPath, type TcfData,
} from "@/lib/advertising";

type TcfApi = (command: string, version: number, callback: (data: TcfData, success: boolean) => void, parameter?: number) => void;
declare global {
  interface Window {
    __tcfapi?: TcfApi;
    googlefc?: { showRevocationMessage?: () => void };
    adsbygoogle?: { push: (request: Record<string, never>) => unknown };
    __atlasAdvertisingDocument?: string;
  }
}
export function privacySignals() {
  return {
    dnt: navigator.doNotTrack,
    gpc: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
    optedOut: document.cookie.split(";").some(c => c.trim() === `${advertisingOptOutCookie}=${advertisingOptOutVersion}`),
  };
}
export function setAdvertisingOptOut(off: boolean) {
  document.cookie = `${advertisingOptOutCookie}=${off ? advertisingOptOutVersion : ""}; Path=/; Max-Age=${off ? 31536000 : 0}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event("atlas:advertising-preference"));
}
export function subscribeAdvertisingPreferences(listener: () => void) {
  window.addEventListener("atlas:advertising-preference", listener); window.addEventListener("focus", listener);
  return () => { window.removeEventListener("atlas:advertising-preference", listener); window.removeEventListener("focus", listener); };
}

export function AdsensePlacement({ path, origin, publisher, cmpId, cmpScript, mode, slot }: {
  path: string; origin: string; publisher: string; cmpId: number; cmpScript: string; mode: "manual" | "auto"; slot?: string;
}) {
  const [allowed, setAllowed] = useState(false);
  const cmpAllowed = useSyncExternalStore(subscribeAdvertisingPreferences,
    () => advertisingPath(path) && location.pathname === path && location.origin === origin && location.protocol === "https:"
      && !advertisingDenied({ ...privacySignals(), optedOut: false }), () => false);
  const [loaded, setLoaded] = useState(false), [failed, setFailed] = useState(false);
  const unit = useRef<HTMLModElement>(null), requested = useRef(false), scriptRequested = useRef(false);

  useLayoutEffect(() => {
    if (allowed) {
      scriptRequested.current = true;
      window.__atlasAdvertisingDocument = location.pathname + location.search;
    }
  }, [allowed]);

  useEffect(() => {
    if (!advertisingPath(path) || location.pathname !== path || location.origin !== origin || location.protocol !== "https:") return;
    let listener: number | undefined, attached: TcfApi | undefined, stopped = false;
    const callback = (data: TcfData | undefined, success: boolean) => {
      if (stopped) return;
      if (Number.isSafeInteger(data?.listenerId)) listener = data?.listenerId;
      const accepted = success && advertisingConsent(data, cmpId, privacySignals());
      setAllowed(accepted);
      // Removing a script tag does not unload third-party JavaScript. A new
      // document is required once an already requested ad loses consent.
      if (!accepted && scriptRequested.current) {
        scriptRequested.current = false;
        setAdvertisingOptOut(true);
        location.reload();
      }
    };
    const connect = () => {
      if (attached || !window.__tcfapi) return;
      attached = window.__tcfapi;
      try { attached("addEventListener", 2, callback); } catch { setFailed(true); }
    };
    connect();
    const privacyChanged = () => { if (advertisingDenied(privacySignals())) callback(undefined, false); };
    window.addEventListener("focus", privacyChanged);
    document.addEventListener("visibilitychange", privacyChanged);
    const timer = window.setInterval(connect, 250);
    const timeout = window.setTimeout(() => window.clearInterval(timer), 15000);
    return () => {
      stopped = true; window.clearInterval(timer); window.clearTimeout(timeout);
      window.removeEventListener("focus", privacyChanged); document.removeEventListener("visibilitychange", privacyChanged);
      if (attached && listener !== undefined) { try { attached("removeEventListener", 2, () => {}, listener); } catch { /* No raw vendor errors in logs. */ } }
    };
  }, [path, origin, cmpId]);

  useEffect(() => {
    if (!allowed || failed || !loaded || mode !== "manual" || requested.current || !unit.current) return;
    const frame = requestAnimationFrame(() => {
      if (!unit.current || unit.current.getBoundingClientRect().width === 0) return;
      requested.current = true;
      try { (window.adsbygoogle ??= [] as Record<string, never>[]).push({}); } catch { setFailed(true); }
    });
    return () => cancelAnimationFrame(frame);
  }, [allowed, failed, loaded, mode]);

  return <>
    {cmpAllowed && !failed && <Script id="atlas-google-cmp" src={cmpScript} async strategy="afterInteractive" onError={() => setFailed(true)} onReady={() => {
        if (!document.querySelector('iframe[name="googlefcPresent"]')) {
        const frame = document.createElement("iframe"); frame.name = "googlefcPresent";
        frame.title = "Privacy message status"; frame.hidden = true; frame.setAttribute("aria-hidden", "true"); document.body.appendChild(frame);
      }
    }} />}
    {allowed && cmpAllowed && !failed && <Script id="atlas-adsense" crossOrigin="anonymous" async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisher}`}
        strategy="afterInteractive" onReady={() => setLoaded(true)} onError={() => setFailed(true)} onLoad={() => {
          scriptRequested.current = true;
          window.__atlasAdvertisingDocument = location.pathname + location.search;
        }} />}
      {mode === "manual" && slot && <aside className="advertising-placement" aria-label="Advertisement">
        <span className="advertising-label">Advertisement</span>
        <ins ref={unit} className="adsbygoogle" style={{ display: "block" }} data-ad-client={publisher}
          data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
      </aside>}
  </>;
}
