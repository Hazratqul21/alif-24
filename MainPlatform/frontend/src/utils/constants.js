/**
 * Application constants
 */

// API URL
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// User roles
export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  PARENT: 'parent',
  ADMIN: 'admin'
};

// Languages
export const LANGUAGES = {
  UZ: 'uz',
  RU: 'ru'
};

// Lesson types
export const LESSON_TYPES = {
  VIDEO: 'video',
  INTERACTIVE: 'interactive',
  READING: 'reading',
  QUIZ: 'quiz',
  ACTIVITY: 'activity'
};

// Game types
export const GAME_TYPES = {
  PUZZLE: 'puzzle',
  MEMORY: 'memory',
  MATCHING: 'matching',
  QUIZ: 'quiz',
  ADVENTURE: 'adventure',
  COUNTING: 'counting',
  SPELLING: 'spelling'
};

// Progress status
export const PROGRESS_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

// Achievement types
export const ACHIEVEMENT_TYPES = {
  BADGE: 'badge',
  TROPHY: 'trophy',
  CERTIFICATE: 'certificate',
  MILESTONE: 'milestone'
};

// Achievement categories
export const ACHIEVEMENT_CATEGORIES = {
  LEARNING: 'learning',
  STREAK: 'streak',
  SOCIAL: 'social',
  GAME: 'game',
  SPECIAL: 'special'
};

// Age range for the platform
export const AGE_RANGE = {
  MIN: 4,
  MAX: 7
};

// Level range
export const LEVEL_RANGE = {
  MIN: 1,
  MAX: 10
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  LANGUAGE: 'language',
  THEME: 'theme'
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  
  // Student routes
  LESSONS: '/lessons',
  GAMES: '/games',
  ACHIEVEMENTS: '/achievements',
  
  // Teacher routes
  MY_STUDENTS: '/my-students',
  CREATE_LESSON: '/lessons/create',
  CREATE_GAME: '/games/create',
  
  // Parent routes
  MY_CHILDREN: '/children',
  CHILD_PROGRESS: '/progress',
  
  // Admin routes
  ADMIN_USERS: '/admin/users',
  ADMIN_CONTENT: '/admin/content'
};

// Notification types
export const NOTIFICATION_TYPES = {
  ACHIEVEMENT: 'achievement',
  REMINDER: 'reminder',
  UPDATE: 'update',
  ALERT: 'alert',
  MESSAGE: 'message'
};

// Colors
export const COLORS = {
  PRIMARY: '#4A90A4',
  PRIMARY_LIGHT: '#7FC7D9',
  SUCCESS: '#48BB78',
  WARNING: '#ECC94B',
  DANGER: '#F56565',
  INFO: '#4299E1'
};

// Animation durations (ms)
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
};

export default {
  API_URL,
  ROLES,
  LANGUAGES,
  LESSON_TYPES,
  GAME_TYPES,
  PROGRESS_STATUS,
  ACHIEVEMENT_TYPES,
  ACHIEVEMENT_CATEGORIES,
  AGE_RANGE,
  LEVEL_RANGE,
  PAGINATION,
  STORAGE_KEYS,
  ROUTES,
  NOTIFICATION_TYPES,
  COLORS,
  ANIMATION
};
