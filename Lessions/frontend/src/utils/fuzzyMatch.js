/**
 * Levenshtein masofasini hisoblash (Fuzzy string matching uchun)
 * @param {string} a - Birinchi so'z
 * @param {string} b - Ikkinchi so'z
 * @returns {number} Masofa
 */
export function levenshteinDistance(a, b) {
    const matrix = [];

    let i;
    for (i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    let j;
    for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1)); // deletion
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Ikki so'z o'rtasidagi o'xshashlik foizini qaytaradi (0 dan 1 gacha)
 * @param {string} s1 
 * @param {string} s2 
 * @returns {number} (0.0 - 1.0)
 */
export function getSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) {
        return 1.0;
    }

    const dist = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - dist) / parseFloat(longer.length);
}

/**
 * Matnni tozalash va massivga o'girish (probellar, vergul va h.k olib tashlanadi)
 * @param {string} text 
 * @returns {string[]}
 */
export function extractWords(text) {
    if (!text) return [];
    // Punktuatsiyani olib tashlash va faqat so'zlarni ajratish
    return text.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "")
        .replace(/\s{2,}/g, " ")
        .trim().split(" ");
}
