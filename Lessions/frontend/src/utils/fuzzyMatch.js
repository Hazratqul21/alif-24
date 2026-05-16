/**
 * Levenshtein masofasini hisoblash (Fuzzy string matching uchun)
 * @param {string} a - Birinchi so'z
 * @param {string} b - Ikkinchi so'z
 * @returns {number} Masofa
 */
export function levenshteinDistance(a, b) {
    const normalize = (s) => (s || "").toLowerCase()
        .replace(/[‘’`‘]/g, "'"); // Barcha turdagi tutuq belgilarini bitta standartga keltiramiz

    const s1 = normalize(a);
    const s2 = normalize(b);

    const matrix = [];

    let i;
    for (i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }

    let j;
    for (j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }

    for (i = 1; i <= s2.length; i++) {
        for (j = 1; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1)); // deletion
            }
        }
    }

    return matrix[s2.length][s1.length];
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
    // O'zbekcha o', g' harflari uchun tutuq belgilarini saqlab qolamiz
    // Punktuatsiyani olib tashlash (tutuq belgilaridan tashqari)
    return text.replace(/[.,/#!$%^&*;:{}=\-_`~()?"«»]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim().split(" ");
}

/**
 * Matnni ekranga chiqarish uchun tokenlarga ajratish (tinish belgilari saqlanadi)
 * @param {string} text 
 * @returns {Array<{text: string, isWord: boolean, wordIndex: number}>}
 */
export function getDisplayTokens(text) {
    if (!text) return [];
    
    // Split into whitespace sequences and non-whitespace blocks
    const parts = text.split(/(\s+)/);
    const tokens = [];
    let wIndex = 0;
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === '') continue;
        
        if (/\s+/.test(part)) {
            // This is a sequence of whitespace (spaces, newlines, etc.)
            tokens.push({ text: part, isWord: false, wordIndex: -1 });
        } else {
            // This is a word or a block of punctuation
            const cleanText = part.replace(/[.,/#!$%^&*;:{}=\-_`~()?"«»]/g, "");
            if (cleanText.length > 0) {
                // It's a valid word
                tokens.push({ text: part, isWord: true, wordIndex: wIndex });
                wIndex++;
            } else {
                // It's just punctuation symbols
                tokens.push({ text: part, isWord: false, wordIndex: -1 });
            }
        }
    }
    return tokens;
}
