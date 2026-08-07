import { useEffect, useState } from 'react';

/**
 * Valeur débouncée — pour les recherches : aucun appel API à chaque frappe.
 * Défaut 300 ms.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default useDebouncedValue;
