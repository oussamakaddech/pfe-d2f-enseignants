import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number = 300,
): T {
  const timeoutRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = (...args: Parameters<T>) => {
    if (timeoutRef[0]) {
      clearTimeout(timeoutRef[0]);
    }
    timeoutRef[1](setTimeout(() => {
      callback(...args);
    }, delay));
  };

  return debouncedCallback as T;
}