import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for fetching data
 * @param {Function} fetchFunction - Function that returns a promise
 * @param {Array} dependencies - Dependencies for refetching
 * @param {boolean} immediate - Whether to fetch immediately
 * @returns {Object} { data, loading, error, refetch }
 */
export const useFetch = (fetchFunction, dependencies = [], immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    if (immediate) {
      fetch();
    }
  }, [...dependencies, immediate]);

  return { data, loading, error, refetch: fetch };
};

export default useFetch;
