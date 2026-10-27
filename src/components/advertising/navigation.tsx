"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// An ad script can outlive a React component. After loading it, internal page
// transitions use fresh documents, including transitions to private routes.
export function AdvertisingNavigation() {
  const pathname = usePathname(), query = useSearchParams().toString();
  useLayoutEffect(() => {
    if (window.__atlasAdvertisingDocument && window.__atlasAdvertisingDocument !== location.pathname + location.search) location.reload();
  }, [pathname, query]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (!window.__atlasAdvertisingDocument || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname + url.search === location.pathname + location.search) return;
      event.preventDefault(); event.stopImmediatePropagation(); location.assign(url.href);
    };
    const restore = (event: PageTransitionEvent) => { if (event.persisted && window.__atlasAdvertisingDocument) location.reload(); };
    document.addEventListener("click", click, true); window.addEventListener("pageshow", restore);
    return () => { document.removeEventListener("click", click, true); window.removeEventListener("pageshow", restore); };
  }, []);
  return null;
}
