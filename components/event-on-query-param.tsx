"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Fires `onFire` once when `?param=value` is present in the URL, then strips
 * that param via router.replace so a refresh or back-nav doesn't re-fire it.
 * Needs a Suspense boundary at the call site (useSearchParams requirement).
 */
export function EventOnQueryParam({
  param,
  value,
  onFire,
}: {
  param: string;
  value: string;
  onFire: () => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get(param) !== value) return;
    fired.current = true;
    onFire();

    const next = new URLSearchParams(searchParams);
    next.delete(param);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, param, value]);

  return null;
}
