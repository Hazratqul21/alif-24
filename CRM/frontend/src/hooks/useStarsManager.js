/**
 * useStarsManager hook
 * Manages star counts from localStorage for achievements display
 */
import { useState, useEffect, useCallback } from 'react';

export function useStarsManager() {
    const [totalStars, setTotalStars] = useState(0);
    const [starsData, setStarsData] = useState({});

    const calculateStars = useCallback(() => {
        try {
            let total = 0;
            const data = {};

            // Harf stars
            const harfHistory = JSON.parse(localStorage.getItem('harfModal_starsHistory') || '[]');
            const harfStars = harfHistory.reduce((sum, entry) => sum + (entry.stars || 0), 0);
            data.uzbekLetters = harfStars;
            total += harfStars;

            // Russian harf stars
            const harfrHistory = JSON.parse(localStorage.getItem('harfrModal_starsHistory') || '[]');
            const harfrStars = harfrHistory.reduce((sum, entry) => sum + (entry.stars || 0), 0);
            data.russianLetters = harfrStars;
            total += harfrStars;

            // English harf stars
            const eharfHistory = JSON.parse(localStorage.getItem('eharfModal_starsHistory') || '[]');
            const eharfStars = eharfHistory.reduce((sum, entry) => sum + (entry.stars || 0), 0);
            data.englishLetters = eharfStars;
            total += eharfStars;

            // Math game stars
            let mathStars = 0;
            [1, 2, 3].forEach(diff => {
                const levelStars = JSON.parse(localStorage.getItem(`levelStars_${diff}`) || '{}');
                mathStars += Object.values(levelStars).reduce((sum, s) => sum + s, 0);
            });
            data.mathGame = mathStars;
            total += mathStars;

            setTotalStars(total);
            setStarsData(data);
        } catch (e) {
            console.warn('Error calculating stars:', e);
        }
    }, []);

    useEffect(() => {
        calculateStars();
        const interval = setInterval(calculateStars, 5000);
        window.addEventListener('storage', calculateStars);
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', calculateStars);
        };
    }, [calculateStars]);

    return { totalStars, starsData, refreshStars: calculateStars };
}

export default useStarsManager;
