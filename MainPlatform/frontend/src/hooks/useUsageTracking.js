import { useState, useEffect } from 'react';

const USAGE_STORAGE_KEY = 'alif24_usage_tracking';

export const useUsageTracking = () => {
  const [usageData, setUsageData] = useState({
    courseViews: 0,
    materialDownloads: 0,
    quizAttempts: 0,
    lessonStarts: 0,
    videoWatches: 0,
    totalActions: 0,
    lastAction: null,
    firstVisit: null
  });

  useEffect(() => {
    // Load usage data from localStorage
    const stored = localStorage.getItem(USAGE_STORAGE_KEY);
    if (stored) {
      setUsageData(JSON.parse(stored));
    } else {
      // Initialize with first visit
      const initialData = {
        ...usageData,
        firstVisit: new Date().toISOString()
      };
      setUsageData(initialData);
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(initialData));
    }
  }, []);

  const trackAction = (actionType) => {
    const updatedData = {
      ...usageData,
      [actionType]: usageData[actionType] + 1,
      totalActions: usageData.totalActions + 1,
      lastAction: {
        type: actionType,
        timestamp: new Date().toISOString()
      }
    };
    
    setUsageData(updatedData);
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updatedData));
    
    return updatedData;
  };

  const shouldShowRegistrationPrompt = () => {
    // Show prompt after 2 or more significant actions
    return usageData.totalActions >= 2;
  };

  const getUsageStats = () => {
    return {
      ...usageData,
      shouldPrompt: shouldShowRegistrationPrompt()
    };
  };

  const resetUsage = () => {
    const clearedData = {
      courseViews: 0,
      materialDownloads: 0,
      quizAttempts: 0,
      lessonStarts: 0,
      videoWatches: 0,
      totalActions: 0,
      lastAction: null,
      firstVisit: new Date().toISOString()
    };
    setUsageData(clearedData);
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(clearedData));
  };

  return {
    usageData,
    trackAction,
    shouldShowRegistrationPrompt,
    getUsageStats,
    resetUsage
  };
};

// Action types
export const USAGE_ACTIONS = {
  COURSE_VIEW: 'courseViews',
  MATERIAL_DOWNLOAD: 'materialDownloads',
  QUIZ_ATTEMPT: 'quizAttempts',
  LESSON_START: 'lessonStarts',
  VIDEO_WATCH: 'videoWatches'
};
