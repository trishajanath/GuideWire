import { useState, useEffect, useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

export function useRainMode(weatherRiskScore: number | null): boolean {
  return (weatherRiskScore ?? 0) > 40;
}

export function useOfflineCache<T>(key: string, fetcher: () => Promise<T>): {
  data: T | null;
  loading: boolean;
  isStale: boolean;
  error: string | null;
} {
  const [data, setData] = useState<T | null>(() => {
    try {
      const cached = localStorage.getItem(`fairroute_cache_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useOnlineStatus();

  useEffect(() => {
    if (!online) {
      setLoading(false);
      setIsStale(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setIsStale(false);
        setError(null);
        try {
          localStorage.setItem(`fairroute_cache_${key}`, JSON.stringify(result));
        } catch { /* quota exceeded */ }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to fetch");
        if (data) setIsStale(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, online]);

  return { data, loading, isStale, error };
}
