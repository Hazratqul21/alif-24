// Keling asabga tegmasligi uchun va 404 xatosi chiqmasligi uchun ovozlarni o'chirib turamiz
// Google Actions sound URL lari endi ishlamayapti (404 Not Found qaytaradi).
// Production'da public/sounds/ papkasiga o'zimizning .mp3 fayllarimizni qo'ysak bo'ladi.

export function useSoundFx() {
    const playSuccess = () => { /* console.log('playSuccess'); */ };
    const playLevelUp = () => { /* console.log('playLevelUp'); */ };
    const playClick = () => { /* console.log('playClick'); */ };
    const playError = () => { /* console.log('playError'); */ };

    return {
        playSuccess,
        playLevelUp,
        playClick,
        playError
    };
}

