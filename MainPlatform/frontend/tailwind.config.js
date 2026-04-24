/** @type {import('tailwindcss').Config} */
// Design tokens below are lifted straight from the Figma cosmic theme
// (file key lrYo031V8gEpGEuSDIlItB, node 85:40). Keep them in sync with
// the design system — if a color drifts, fix it here first, not inline.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          // Page background (deepest void, behind the space image).
          bg:        '#081820',
          // Pill / card inner surface — same tone slightly lifted.
          surface:   '#0e2937',
          // Card body vignette top color (paired with black for depth).
          cardTop:   '#1c3745',
          // Progress-bar track (dark navy, reads as empty on cosmic bg).
          track:     '#141732',
          // Accent gold — progress fill, star icons, score text accents.
          gold:      '#ffd700',
          // Active-glow orange — used for border + outer halo shadow.
          glow:      '#ffa91f',
          // Glow shadow tint (slightly hotter than the border itself).
          glowHot:   '#ff7b1d',
          // "DARSLAR" tag pill — success green.
          lessonTag: '#219b48',
          // "O'YINLAR" tag pill — energetic orange.
          gameTag:   '#c96a33',
          // Red dot notification on the chatbot avatar / bubble.
          notify:    '#e83f5b',
          // Chatbot bubble text (very dark navy, sits on white).
          bubbleInk: '#0a0e2a',
        },
      },
      fontFamily: {
        // Inter is the default UI font — nav links, card meta, bubble text.
        sans:  ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Montserrat is reserved for the uppercase category tags that
        // sit on top of each card ("DARSLAR", "O'YINLAR").
        heading: ['Montserrat', 'Inter', 'sans-serif'],
        // IBM Plex Mono is used for card titles and the score string
        // (46/100). Monospace reads as "gaming HUD" which matches the
        // cosmic theme.
        mono:  ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        // Outer halo around active cards / chatbot — layered so Safari
        // doesn't flatten the glow into a single blurry disc.
        'cosmic-glow': '0 0 5px #ff7b1d, 0 0 50px rgba(255,123,29,0.5)',
        // Subtle floating card lift — for the chatbot bubble.
        'cosmic-pop': '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1)',
      },
      backgroundImage: {
        // Gradient from the Figma spec — used on every lesson card body
        // so illustrations blend into the panel instead of hard-edging.
        'cosmic-card': 'linear-gradient(122.67deg, rgba(28,55,69,0.55) 39.25%, rgba(0,0,0,0.55) 113.27%)',
      },
      animation: {
        'cosmic-pulse': 'cosmic-pulse 2.4s ease-in-out infinite',
      },
      keyframes: {
        'cosmic-pulse': {
          '0%,100%': { boxShadow: '0 0 5px #ff7b1d, 0 0 30px rgba(255,123,29,0.4)' },
          '50%':     { boxShadow: '0 0 10px #ff7b1d, 0 0 60px rgba(255,123,29,0.7)' },
        },
      },
    },
  },
  plugins: [],
}
