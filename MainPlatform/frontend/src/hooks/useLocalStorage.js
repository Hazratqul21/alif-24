import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing local storage
 * @param {string} key - Storage key
 * @param {*} initialValue - Initial value if none exists
 * @returns {Array} [storedValue, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // Get initial value from storage or use provided value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Update storage when value changes
  useEffect(() => {
    try {
      if (storedValue === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch {
      // Handle storage errors silently
    }
  }, [key, storedValue]);

  // Custom setter
  const setValue = useCallback((value) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      return newValue;
    });
  }, []);

  // Remove from storage
  const removeValue = useCallback(() => {
    setStoredValue(undefined);
    localStorage.removeItem(key);
  }, [key]);

  return [storedValue, setValue, removeValue];
};

export default useLocalStorage;
