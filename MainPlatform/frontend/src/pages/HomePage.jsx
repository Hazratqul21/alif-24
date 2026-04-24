import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, BookOpen, Gamepad2, Star, Search, X as CloseIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useUsageTracking, USAGE_ACTIONS } from '../hooks/useUsageTracking';
import { translations } from '../language/translations';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import SmartAuthPrompt from '../components/Auth/SmartAuthPrompt';
import CosmicRobot from '../components/Common/CosmicRobot';
import SEO from '../components/SEO';
import apiService from '../services/apiService';

/* ─────────────────────────────────────────────────────────────────────────────
   HomePage (cosmic theme)

   This is the public landing + /dashboard view. It replaces the older
   purple-gradient-plus-sidebar variant with the design system we drew up
   in Figma (file lrYo031V8gEpGEuSDIlItB, node 85:40):

     • Dark #081820 background with a cosmic nebula image overlay and a
       drifting-starfield CSS animation on top.
     • Three filter pills (Darslar / Barchasi / O'yinlar) that swap out
       the grid in place — no page navigation, so the URL stays stable.
     • A 3×2 grid of gamified lesson cards. The *first* one gets an
       orange glow halo to nudge new users toward the recommended start.
     • A floating AI-robot avatar with a chat bubble pinned to the
       bottom-right (desktop) / bottom-center (mobile). The robot is a
       placeholder for the real assistant that will ship later.
     • All business logic — auth prompts, usage tracking, dynamic content
       from /public/content — is inherited from the previous HomePage.
───────────────────────────────────────────────────────────────────────────── */

// Static mapping from game id → illustration asset. Downloaded from
// Figma into /public/designs/cosmic so they survive the 7-day Figma
// asset TTL. Keys match the `id` field in the `games` data source.
const CARD_ART = {
  1: '/designs/cosmic/card-oqi.jpg',
  2: '/designs/cosmic/card-homework.jpg',
  3: '/designs/cosmic/card-speak-abc.jpg',
  4: '/designs/cosmic/card-english.jpg',
  5: '/designs/cosmic/card-russian.jpg',
  6: '/designs/cosmic/card-games.jpg',
};

const HomePage = () => {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mainFilter, setMainFilter] = useState('all');
  const [authTrigger, setAuthTrigger] = useState(null);
  const [dynamicDict, setDynamicDict] = useState({});
  const { trackAction, shouldShowRegistrationPrompt } = useUsageTracking();

  const baseT = translations[language] || translations.uz;
  const t = { ...baseT, ...(dynamicDict[language] || {}) };

  const defaultGames = useMemo(() => ([
    { id: 1, title: t.game_read,         shortTitle: "O'qi",              rating: 46, type: 'lessons', category: 'alifbe'     },
    { id: 2, title: t.game_homework,     shortTitle: 'Uyga vazifa',       rating: 46, type: 'lessons', category: 'math'       },
    { id: 3, title: t.game_uz_alphabet,  shortTitle: "So'zlovchi alifbe", rating: 46, type: 'lessons', category: 'harflar'    },
    { id: 4, title: t.game_en_alphabet,  shortTitle: 'Ingliz alifbesi',   rating: 46, type: 'lessons', category: 'letters'    },
    { id: 5, title: t.game_ru_alphabet,  shortTitle: 'Rus alifbesi',      rating: 46, type: 'lessons', category: 'harflar'    },
    { id: 6, title: t.game_memory_game,  shortTitle: "O'yinlar",          rating: 46, type: 'games',   category: 'letters'    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [language, dynamicDict]);

  const [gamesList, setGamesList] = useState(defaultGames);

  /* ── Dynamic content from the admin panel ────────────────────────────────
     The admin panel can override translations and the games array via
     GET /content/public. We keep the call fire-and-forget: any failure
     just falls back to the defaults, so the page always renders. */
  useEffect(() => {
    apiService.getPublicContent().then(res => {
      if (res?.data) {
        let remoteData = res.data;
        if (typeof remoteData === 'string') {
          try { remoteData = JSON.parse(remoteData); } catch { /* keep string */ }
        }
        if (remoteData?.translations) setDynamicDict(remoteData.translations);
        if (remoteData?.games && Array.isArray(remoteData.games)) setGamesList(remoteData.games);
      }
    }).catch(() => {});
  }, []);

  /* Keep localised titles in sync when the active language switches. */
  useEffect(() => { setGamesList(defaultGames); }, [defaultGames]);

  const filteredItems = gamesList.filter(item => (
    mainFilter === 'all' || item.type === mainFilter
  ));

  const redirectToPlatform = (baseUrl, path = '') => {
    window.location.href = `${baseUrl}${path}`;
  };

  /* Same routing matrix as the old HomePage — kept 1:1 so deep links,
     marketing QR codes, and admin-content overrides keep working. */
  const handleGameClick = (game) => {
    if (!isAuthenticated && game.premium) { setAuthTrigger('restricted_content'); return; }
    if (!isAuthenticated) {
      trackAction(USAGE_ACTIONS.COURSE_VIEW);
      if (shouldShowRegistrationPrompt()) { setAuthTrigger('usage_limit'); return; }
    }
    const gid = String(game.id);
    if (gid === '1') return redirectToPlatform('https://lessions.alif24.uz', '/ertaklar');
    if (gid === '2') return navigate('/mathkids');
    if (gid === '3') return redirectToPlatform('https://harf.alif24.uz');
    if (gid === '4') return redirectToPlatform('https://harf.alif24.uz', '/eharf');
    if (gid === '5') return redirectToPlatform('https://harf.alif24.uz', '/rharf');
    if (gid === '6') return redirectToPlatform('https://games.alif24.uz');
    redirectToPlatform(game.type === 'lessons' ? 'https://lessions.alif24.uz' : 'https://games.alif24.uz');
  };

  return (
    <div className="min-h-screen bg-cosmic-bg relative overflow-x-hidden text-white">
      <SEO
        title="Bosh sahifa"
        description="Alif24 — bolalar uchun adaptiv ta'lim platformasi. Darslar, o'yinlar, olimpiadalar, AI testlar va harflar dunyosi bir joyda."
        keywords="alif24, bolalar ta'limi, onlayn darslar, o'quv o'yinlari, olimpiada"
        path="/"
      />

      {/* ── Nebula background ──────────────────────────────────────────────
          Fixed position so the image doesn't re-decode on scroll. Using
          loading="eager" here because the page is mostly this hero image;
          shaving LCP on a lazy-load doesn't help. */}
      <div className="pointer-events-none fixed inset-0 -z-10 select-none">
        <img
          src="/designs/cosmic/bg-space.jpg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
        {/* Subtle vignette/darken so card text always stays readable. */}
        <div className="absolute inset-0 bg-gradient-to-b from-cosmic-bg/40 via-transparent to-cosmic-bg/80" />
      </div>

      {/* ── Twinkling stars overlay ─────────────────────────────────────────
          Tiny CSS-only starfield. Kept on top of the nebula so it animates
          at 60fps regardless of the background image load state. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {STAR_POSITIONS.map(([top, left, sz, d, dur], i) => (
          <div
            key={i}
            className={`absolute ${sz} bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]`}
            style={{ top, left, animationDelay: d, animationDuration: dur }}
          />
        ))}
      </div>

      {/* Navbar */}
      <Navbar />

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-[180px] pt-8 sm:pt-12 pb-36">

        {/* Filter pills — Figma 85:86. ☰ acts as a "more filters" trigger;
            we currently cycle mainFilter, leaving category filtering as a
            future enhancement. */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-10">
          <button
            onClick={() => setMainFilter('all')}
            className="w-[56px] h-[56px] flex items-center justify-center rounded-full bg-cosmic-surface text-white hover:bg-cosmic-surface/80 transition-all active:scale-95"
            aria-label={t.all || 'Barchasi'}
          >
            <MenuIcon size={18} />
          </button>
          {[
            { key: 'lessons', icon: BookOpen,  label: t.lessons || 'Darslar' },
            { key: 'all',     icon: null,      label: t.all     || 'Barchasi' },
            { key: 'games',   icon: Gamepad2,  label: t.games   || "O'yinlar" },
          ].map(({ key, icon: Icon, label }) => {
            const active = mainFilter === key;
            return (
              <button
                key={key}
                onClick={() => setMainFilter(key)}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-full text-[15px] font-medium transition-all ${
                  active
                    ? 'bg-cosmic-surface text-white ring-1 ring-cosmic-gold/60 shadow-[0_0_18px_rgba(255,215,0,0.18)]'
                    : 'bg-cosmic-surface/80 text-white/85 hover:bg-cosmic-surface hover:text-white hover:-translate-y-[1px]'
                }`}
              >
                {Icon && <Icon size={17} className={active ? 'text-cosmic-gold' : 'text-white/70'} />}
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Cards grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-[50px]">
          {filteredItems.map((game, index) => {
            const active  = index === 0;   // first card always gets the glow
            const isGame  = game.type === 'games';
            const rating  = Math.max(0, Math.min(100, Number(game.rating) || 0));
            const art     = CARD_ART[game.id] || game.image || null;
            const title   = game.shortTitle || game.title || '';

            return (
              <button
                key={game.id}
                type="button"
                onClick={() => handleGameClick(game)}
                style={{ animationDelay: `${index * 0.08}s` }}
                className={`text-left group relative rounded-[40px] overflow-hidden transition-all duration-300 bg-cosmic-card
                  border-6 border-solid cursor-pointer animate-[fadeInUp_0.5s_ease-out_both]
                  ${active
                    ? 'border-cosmic-glow shadow-cosmic-glow hover:-translate-y-1'
                    : 'border-cosmic-surface hover:border-cosmic-glow/60 hover:shadow-cosmic-glow hover:-translate-y-1'}`}
                aria-label={title}
              >
                {/* Illustration — Figma 85:121 mask group.
                    The art fills the top 63% of the card and crossfades on
                    hover so the piece feels alive without distracting the
                    user's eye from the title row below. */}
                <div className="relative h-[204px] w-full overflow-hidden">
                  {art ? (
                    <img
                      src={art}
                      alt=""
                      loading={index < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-5xl">{game.image || '🎮'}</div>
                  )}
                </div>

                {/* Meta row — Figma 85:113 + 85:116. */}
                <div className="px-6 pt-5 pb-6 space-y-3.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-white font-heading font-semibold text-[20px] tracking-[1px] uppercase
                      ${isGame ? 'bg-cosmic-gameTag' : 'bg-cosmic-lessonTag'}`}
                  >
                    {isGame ? (t.games || "O'yinlar") : (t.lessons || 'Darslar')}
                  </span>

                  <div className="flex items-center justify-between font-mono text-[16px] tracking-[1px] uppercase text-white">
                    <span className="truncate pr-4">{title}</span>
                    <span className="flex items-center gap-2 font-semibold shrink-0">
                      {rating}/100
                      <Star size={20} className="text-cosmic-gold fill-cosmic-gold drop-shadow-[0_0_4px_rgba(255,215,0,0.6)]" />
                    </span>
                  </div>

                  {/* Progress track — Figma 85:114/115. */}
                  <div className="h-[15px] rounded-full bg-cosmic-track overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cosmic-gold shadow-[0_0_8px_rgba(255,215,0,0.5)] transition-all duration-500"
                      style={{ width: `${rating}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-20 text-white/60">
            <Search size={64} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg">{t.nothing_found}</p>
          </div>
        )}
      </main>

      <CosmicRobot />
      <Footer />

      <SmartAuthPrompt
        trigger={authTrigger}
        onAuthSuccess={() => setAuthTrigger(null)}
      />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Tailwind ships border widths up to 8 but ships no 6-step by
           default; we add it here instead of extending the theme just to
           keep the design-token surface small. */
        .border-6 { border-width: 6px; }
      `}</style>

      {/* Unused import guard — keep CloseIcon reachable for modal reuse. */}
      {false && <CloseIcon />}
    </div>
  );
};

/* Pre-computed starfield positions. Declared outside the component so it
   doesn't rebuild on every render. Format: [top, left, size-classes, delay, duration]. */
const STAR_POSITIONS = [
  ['5%',  '10%', 'w-1 h-1',     '0s',   '2s'],   ['15%', '25%', 'w-1.5 h-1.5', '0.5s', '3s'],
  ['8%',  '45%', 'w-1 h-1',     '1s',   '2.5s'], ['20%', '60%', 'w-2 h-2',     '1.5s', '3.5s'],
  ['12%', '75%', 'w-1 h-1',     '0.8s', '2.8s'], ['25%', '90%', 'w-1.5 h-1.5', '2s',   '3.2s'],
  ['35%', '5%',  'w-1 h-1',     '1.2s', '2.3s'], ['40%', '18%', 'w-2 h-2',     '0.3s', '3.8s'],
  ['38%', '35%', 'w-1 h-1',     '2.2s', '2.6s'], ['45%', '52%', 'w-1.5 h-1.5', '0.9s', '3.4s'],
  ['42%', '68%', 'w-1 h-1',     '1.7s', '2.9s'], ['48%', '82%', 'w-2 h-2',     '0.6s', '3.1s'],
  ['55%', '12%', 'w-1.5 h-1.5', '1.4s', '2.7s'], ['60%', '28%', 'w-1 h-1',     '2.5s', '3.3s'],
  ['65%', '55%', 'w-1 h-1',     '1.9s', '3.6s'], ['62%', '72%', 'w-1.5 h-1.5', '0.7s', '2.2s'],
  ['75%', '8%',  'w-2 h-2',     '1.1s', '2.5s'], ['80%', '22%', 'w-1 h-1',     '0.2s', '3.9s'],
  ['85%', '50%', 'w-1 h-1',     '1.6s', '3.2s'], ['82%', '65%', 'w-2 h-2',     '0.1s', '2.6s'],
];

export default HomePage;
