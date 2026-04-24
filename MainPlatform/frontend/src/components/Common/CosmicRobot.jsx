import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   CosmicRobot

   The friendly companion that sits in the bottom-right corner of the
   dashboard. It has two jobs today:

     1. Act as a visual anchor for the cosmic theme — the glowing halo and
        "hello, what shall we learn today?" bubble reinforce the kid-focused
        tone of the page.
     2. Be the mount point for the real AI assistant later. Clicking the
        robot fires a `cosmic-robot:open` DOM event which the future
        assistant component (e.g. a chat drawer) will subscribe to.

   The tooltip is dismissable via ×. We persist the dismissal in
   sessionStorage so it doesn't keep popping back up on every page nav
   in the same visit — but it DOES return on the next session, which is
   deliberate: first-time-of-the-day greeting > no greeting at all.
───────────────────────────────────────────────────────────────────────────── */

const BUBBLE_DISMISSED_KEY = 'cosmic-robot.bubble-dismissed';

const CosmicRobot = ({
  greeting  = "Salom! Bugun nima o'rganamiz?",
  avatarSrc = '/designs/cosmic/robot-avatar.png',
}) => {
  const [showBubble, setShowBubble] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(BUBBLE_DISMISSED_KEY) === '1') setShowBubble(false);
    } catch { /* private mode / disabled storage → keep default */ }
  }, []);

  const dismissBubble = () => {
    setShowBubble(false);
    try { sessionStorage.setItem(BUBBLE_DISMISSED_KEY, '1'); } catch { /* ignore */ }
  };

  // Open handler is exposed via a DOM custom event so future chat UI can
  // subscribe without needing a direct import. The bubble comes back as a
  // side-effect of the real assistant taking over.
  const handleOpen = () => {
    try { sessionStorage.removeItem(BUBBLE_DISMISSED_KEY); } catch { /* ignore */ }
    setShowBubble(true);
    window.dispatchEvent(new CustomEvent('cosmic-robot:open'));
  };

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-8 sm:right-10 z-40 flex items-end gap-3 pointer-events-none">

      {/* Speech bubble. Hidden on very small screens to save vertical
          space — the robot itself is enough to invite the interaction. */}
      {showBubble && (
        <div className="hidden sm:flex items-center bg-white rounded-2xl pl-5 pr-9 py-3 shadow-cosmic-pop relative pointer-events-auto animate-[bubbleIn_0.35s_ease-out_both]">
          <p className="font-sans font-bold text-cosmic-bubbleInk text-[15px] whitespace-nowrap">
            {greeting}
          </p>
          <button
            onClick={dismissBubble}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cosmic-notify text-white grid place-items-center shadow-md hover:scale-110 transition-transform cursor-pointer border-none"
            aria-label="Yopish"
          >
            <X size={12} />
          </button>
          {/* Tail — a rotated square pressed into the right edge so the
              bubble appears to point at the robot avatar. */}
          <span
            className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Avatar ring — uses the keyframed cosmic-pulse animation so the
          halo breathes without relying on GPU-expensive filters. */}
      <button
        type="button"
        onClick={handleOpen}
        className="pointer-events-auto relative w-[90px] h-[90px] sm:w-[140px] sm:h-[140px] rounded-full bg-[#000406] border-6 border-cosmic-glow overflow-hidden shadow-cosmic-glow animate-cosmic-pulse cursor-pointer transition-transform hover:scale-[1.04] active:scale-95 border-solid"
        aria-label="AI yordamchi"
      >
        <img
          src={avatarSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        {/* Red notification dot — shown until the user has "opened" the
            assistant at least once in this session. We hide it once the
            bubble gets dismissed too, treating that as acknowledgment. */}
        {showBubble && (
          <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-cosmic-notify ring-2 ring-white shadow-[0_0_6px_rgba(232,63,91,0.9)]" />
        )}
      </button>

      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateX(8px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)   scale(1); }
        }
        .border-6 { border-width: 6px; }
      `}</style>
    </div>
  );
};

export default CosmicRobot;
