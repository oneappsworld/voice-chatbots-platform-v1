"use client";

import Script from "next/script";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GA_MEASUREMENT_ID,
  PLAUSIBLE_DOMAIN,
  isGaConfigured,
  isPlausibleConfigured,
  trackPageview,
} from "@/lib/analytics";

/** Fires a pageview on every client-side route change (initial load is covered by GA4's own gtag.js + Plausible's script both firing once on inject). Needs a Suspense boundary because useSearchParams opts the tree out of static rendering. */
function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    trackPageview(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsScripts() {
  return (
    <>
      {isGaConfigured() && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
              window.gtag = gtag;`}
          </Script>
        </>
      )}
      {isPlausibleConfigured() && (
        <>
          {/* Queues calls made before script.js finishes loading — Plausible's own recommended snippet. Rendered before the script tag below so it always defines the queue first. */}
          <Script id="plausible-stub" strategy="afterInteractive">
            {`window.plausible = window.plausible || function(){(window.plausible.q = window.plausible.q || []).push(arguments)}`}
          </Script>
          <Script
            src="https://plausible.io/js/script.tagged-events.js"
            data-domain={PLAUSIBLE_DOMAIN}
            strategy="afterInteractive"
          />
        </>
      )}
      {(isGaConfigured() || isPlausibleConfigured()) && (
        <Suspense fallback={null}>
          <RouteChangeTracker />
        </Suspense>
      )}
    </>
  );
}
