import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for timer/stopwatch functionality
 * @param {number} initialTime - Initial time in seconds
 * @param {boolean} countDown - Whether to count down (true) or up (false)
 * @param {Function} onComplete - Callback when countdown reaches 0
 * @returns {Object} { time, isRunning, start, pause, reset, formatTime }
 */
export const useTimer = (initialTime = 0, countDown = false, onComplete = null) => {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => {
          if (countDown) {
            if (prev <= 1) {
              setIsRunning(false);
              if (onComplete) onComplete();
              return 0;
            }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, countDown, onComplete]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newTime = initialTime) => {
    setIsRunning(false);
    setTime(newTime);
  }, [initialTime]);

  const formatTime = useCallback((seconds = time) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [time]);

  return { time, isRunning, start, pause, reset, formatTime };
};

export default useTimer;
