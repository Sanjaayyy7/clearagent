import { useMemo } from "react";

/**
 * Returns true when the URL contains ?demo=true.
 * Used to switch the dashboard to static demo data.
 */
export function useDemoMode(): boolean {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("demo") === "true";
  }, []);
}
