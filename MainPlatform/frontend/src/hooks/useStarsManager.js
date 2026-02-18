import { useState, useEffect, useCallback } from 'react';

const STARS_STORAGE_KEY = 'alif24_stars';

export const useStarsManager = () => {
  const [starsData, setStarsData] = useState({
    totalStars: 0,
    breakdown: { harf: 0, rharf: 0, eharf: 0, math: 0, ertak: 0, memory: 0, lesson: 0 },
    history: []
  });

  useEffect(() => {
    const stored = localStorage.getItem(STARS_STORAGE_KEY);
    if (stored) {
      try {
        setStarsData(JSON.parse(stored));
      } catch {
        // corrupted data, reset
      }
    }
  }, []);

  const persist = useCallback((data) => {
    localStorage.setItem(STARS_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const updateStars = useCallback((game, earned) => {
    setStarsData(prev => {
      const newBreakdown = {
        ...prev.breakdown,
        [game]: (prev.breakdown[game] || 0) + earned
      };
      const newTotal = Object.values(newBreakdown).reduce((a, b) => a + b, 0);
      const entry = {
        game,
        earned,
        timestamp: new Date().toISOString()
      };
      const newData = {
        totalStars: newTotal,
        breakdown: newBreakdown,
        history: [...prev.history.slice(-99), entry]
      };
      persist(newData);
      return newData;
    });
  }, [persist]);

  const getStarsHistory = useCallback(() => {
    return starsData.history;
  }, [starsData.history]);

  const resetStars = useCallback(() => {
    const empty = {
      totalStars: 0,
      breakdown: { harf: 0, rharf: 0, eharf: 0, math: 0, ertak: 0, memory: 0, lesson: 0 },
      history: []
    };
    setStarsData(empty);
    persist(empty);
  }, [persist]);

  return {
    totalStars: starsData.totalStars,
    starsBreakdown: starsData.breakdown,
    updateStars,
    getStarsHistory,
    resetStars
  };
};

export default useStarsManager;
