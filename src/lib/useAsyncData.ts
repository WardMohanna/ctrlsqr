import { useState, useEffect, startTransition } from "react";

/**
 * Custom hook to fetch data without blocking user interactions
 * Uses startTransition to mark updates as non-urgent
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Mark loading state as non-urgent
    startTransition(() => {
      setLoading(true);
    });

    fetcher()
      .then((result) => {
        if (!cancelled) {
          startTransition(() => {
            setData(result);
            setLoading(false);
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          startTransition(() => {
            setError(err);
            setLoading(false);
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
