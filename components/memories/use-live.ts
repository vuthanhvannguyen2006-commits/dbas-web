"use client";
import { useEffect, useState } from "react";
export function useLive<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setState({ data: null, error: null, loading: true });
      try {
        const data = await loader();
        if (active) setState({ data, error: null, loading: false });
      } catch (e) {
        if (active)
          setState({
            data: null,
            error: e instanceof Error ? e.message : "Unable to load memories.",
            loading: false,
          });
      }
    });
    return () => {
      active = false;
    };
  }, [loader, version]);
  return { ...state, retry: () => setVersion((v) => v + 1) };
}
