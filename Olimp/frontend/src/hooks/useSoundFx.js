import { Howl } from 'howler';

// Asosiy ovozlar uchun oldindan tayyorlangan howler instansiyalari
// production'da bu fayllarni public/sounds/ papkasiga qo'yish kerak
const sounds = {
    success: new Howl({
        src: ['https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg'],
        volume: 0.5
    }),
    levelUp: new Howl({
        src: ['https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg'],
        volume: 0.6
    }),
    click: new Howl({
        src: ['https://actions.google.com/sounds/v1/interfaces/button_click.ogg'],
        volume: 0.3
    }),
    wrong: new Howl({
        src: ['https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg'],
        volume: 0.4
    })
};

export function useSoundFx() {
    const playSuccess = () => sounds.success.play();
    const playLevelUp = () => sounds.levelUp.play();
    const playClick = () => sounds.click.play();
    const playError = () => sounds.wrong.play();

    return {
        playSuccess,
        playLevelUp,
        playClick,
        playError
    };
}
