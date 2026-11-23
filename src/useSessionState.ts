import { useState } from 'react';

/** Like useState, but kept for the browser tab so filters survive opening a card and going back. */
export function useSessionState<T extends string>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return (sessionStorage.getItem(key) as T | null) ?? initial;
    } catch {
      return initial;
    }
  });
  const update = (next: T) => {
    setValue(next);
    try {
      sessionStorage.setItem(key, next);
    } catch {
      // storage unavailable (private mode): the filter just won't persist
    }
  };
  return [value, update];
}
