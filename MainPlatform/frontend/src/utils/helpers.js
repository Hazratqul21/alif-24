/**
 * Utility functions for the Alif24 frontend
 */

/**
 * Format date to localized string
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale code
 * @returns {string} Formatted date
 */
export const formatDate = (date, locale = 'uz-UZ') => {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format time duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (mm:ss)
 */
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/**
 * Calculate age from date of birth
 * @param {string|Date} dateOfBirth - Date of birth
 * @returns {number} Age in years
 */
export const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Get initials from name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Initials
 */
export const getInitials = (firstName, lastName) => {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  return `${first}${last}`;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncate = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Generate random color for avatars
 * @param {string} seed - Seed string (e.g., user ID)
 * @returns {string} Hex color
 */
export const generateColor = (seed) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181',
    '#AA96DA', '#FCBAD3', '#FFFFD2', '#A8D8EA',
    '#FFB6B9', '#FAF3DD', '#B8E0D2', '#D6E6F2'
  ];
  
  if (!seed) return colors[0];
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Check if user is within allowed time slot
 * @param {Object} timeSlots - Allowed time slots
 * @returns {boolean} Whether current time is allowed
 */
export const isWithinAllowedTime = (timeSlots) => {
  if (!timeSlots) return true;
  
  const now = new Date();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  
  const slot = isWeekend ? timeSlots.weekends : timeSlots.weekdays;
  if (!slot) return true;
  
  const [startHour, startMin] = slot.start.split(':').map(Number);
  const [endHour, endMin] = slot.end.split(':').map(Number);
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

/**
 * Calculate progress percentage
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
export const calculateProgress = (current, total) => {
  if (!total || total === 0) return 0;
  return Math.round((current / total) * 100);
};

/**
 * Get level color
 * @param {number} level - Level (1-10)
 * @returns {string} Hex color
 */
export const getLevelColor = (level) => {
  const colors = {
    1: '#A8E6CE', // Light green
    2: '#DCEDC2',
    3: '#FFD3B5',
    4: '#FFAAA5',
    5: '#FF8B94',
    6: '#DDA0DD',
    7: '#87CEEB',
    8: '#4A90A4',
    9: '#7FC7D9',
    10: '#FFD700' // Gold
  };
  
  return colors[level] || colors[1];
};

export default {
  formatDate,
  formatDuration,
  formatNumber,
  calculateAge,
  getInitials,
  truncate,
  debounce,
  generateColor,
  isWithinAllowedTime,
  calculateProgress,
  getLevelColor
};
