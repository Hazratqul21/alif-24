/**
 * Format date string to human readable format
 * @param {string|Date|null} dateString - ISO date string or Date object
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date (e.g. '10 Feb 2024, 14:30') or '-'
 */
export const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);

        // Check for invalid date
        if (isNaN(date.getTime())) return '-';

        const options = {
            day: 'numeric',
            month: 'short', // Jan, Feb
            year: 'numeric'
        };

        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.hour12 = false; // 24h format
        }

        // 'en-GB' -> 10 Feb 2024
        // 'uz-UZ' usually formats as DD.MM.YYYY
        // Using en-GB for clean '10 Feb 2024' look per user preference
        return new Intl.DateTimeFormat('en-GB', options).format(date);
    } catch (e) {
        console.error('Date formatting error:', e);
        return '-';
    }
};

export default formatDate;
