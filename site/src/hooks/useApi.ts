import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://api.rotifer.xyz" : "");

interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(path: string, intervalMs?: number): UseFetchReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json as T);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchData();
    if (intervalMs && intervalMs > 0) {
      const timer = setInterval(fetchData, intervalMs);
      return () => clearInterval(timer);
    }
  }, [fetchData, intervalMs]);

  return { data, loading, error, refetch: fetchData };
}
