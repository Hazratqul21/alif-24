/**
 * Format date utility
 * Formats ISO date strings to user-friendly format
 */

export function formatDate(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        // Relative time for recent dates
        if (seconds < 60) return 'Hozirgina';
        if (minutes < 60) return `${minutes} daqiqa oldin`;
        if (hours < 24) return `${hours} soat oldin`;
        if (days < 7) return `${days} kun oldin`;

        // Absolute format for older dates
        return date.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

export default formatDate;
