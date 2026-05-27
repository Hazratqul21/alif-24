import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, BookOpen, Gamepad2, Star, Search } from 'lucide-react';
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

   Matches Figma file lrYo031V8gEpGEuSDIlItB, node 85:40.

   Layering (critical — a previous pass hid the nebula behind an opaque
   wrapper). Stacking is:

     1. Body gets the fallback `#081820` via index.css so we're never on
        a white page while the JPEG is decoding.
     2. `.nebula-bg` is position:fixed at z-0 — it owns the whole viewport
        and re-paints on resize without being re-decoded on scroll.
     3. `.starfield` sits at z-1 with `mix-blend-screen` so the CSS stars
        add twinkle without fighting the nebula's built-in star specks.
     4. All real content is z-10+, which means the nebula is always visible.

   No outer wrapper adds a solid `bg-*` colour anymore — that was the
   reason the previous version looked flat-dark on production.
───────────────────────────────────────────────────────────────────────────── */

const CARD_ART = {
  1: '/designs/cosmic/card-oqi.jpg',
  2: '/designs/cosmic/card-homework.jpg',
  3: '/designs/cosmic/card-speak-abc.jpg',
  4: '/designs/cosmic/card-english.jpg',
  5: '/designs/cosmic/card-russian.jpg',
  6: '/designs/cosmic/card-games.jpg',
  7: '/designs/cosmic/card-oqi.jpg',
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
    { id: 1, title: t.game_read,        shortTitle: "ERTAK VA HIKOYALAR",              rating: 46, type: 'lessons' },
     {
      id: 2,
      title: language === 'ru' ? 'Книжный мир' : language === 'en' ? 'World of Books' : 'Kitoblar olami',
      shortTitle: language === 'ru' ? 'КНИГИ' : language === 'en' ? 'BOOKS' : 'KITOBLAR',
      rating: 50,
      type: 'lessons'
    },
    { id: 3, title: t.game_homework,    shortTitle: 'MATEMATIKA',       rating: 46, type: 'lessons' },
    { id: 4, title: t.game_uz_alphabet, shortTitle: "SO'ZLOVCHI ALIFBE", rating: 46, type: 'lessons' },
    { id: 5, title: t.game_en_alphabet, shortTitle: 'INGLIZ ALIFBESI',   rating: 46, type: 'lessons' },
    { id: 6, title: t.game_ru_alphabet, shortTitle: 'RUS ALIFBESI',      rating: 46, type: 'lessons' },
    { id: 7, title: t.game_memory_game, shortTitle: "O'YINLAR",          rating: 46, type: 'games'   },
   
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [language, dynamicDict]);

  const [gamesList, setGamesList] = useState(defaultGames);

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

  useEffect(() => { setGamesList(defaultGames); }, [defaultGames]);

  const filteredItems = gamesList.filter(item => (
    mainFilter === 'all' || item.type === mainFilter
  ));

  const redirectToPlatform = (baseUrl, path = '') => {
    window.location.href = `${baseUrl}${path}`;
  };

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
    if (gid === '7') return redirectToPlatform('https://lessions.alif24.uz', '/kitoblar');
    redirectToPlatform(game.type === 'lessons' ? 'https://lessions.alif24.uz' : 'https://games.alif24.uz');
  };

  return (
    <div className="relative min-h-screen text-white">
      <SEO
        title="Bosh sahifa"
        description="Alif24 — bolalar uchun adaptiv ta'lim platformasi. Darslar, o'yinlar, olimpiadalar, AI testlar va harflar dunyosi bir joyda."
        keywords="alif24, bolalar ta'limi, onlayn darslar, o'quv o'yinlari, olimpiada"
        path="/"
      />

      {/* ── Nebula backdrop — fixed so scrolling never re-decodes it ──────── */}
      <div className="pointer-events-none fixed inset-0 z-0 select-none">
        <img
          src="/designs/cosmic/bg-space.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          fetchpriority="high"
          loading="eager"
          decoding="async"
        />
        {/* Darken-edges vignette so card text, progress bars and the navbar
            always sit on a sufficiently dark patch. Transparent in the
            middle so the nebula's brightness survives. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,24,32,0)_0%,rgba(8,24,32,0.55)_60%,rgba(8,24,32,0.92)_100%)]" />
      </div>

      {/* ── Twinkling stars overlay ───────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] overflow-hidden mix-blend-screen"
        aria-hidden="true"
      >
        {STAR_POSITIONS.map(([top, left, sz, d, dur], i) => (
          <div
            key={i}
            className={`absolute ${sz} bg-white rounded-full animate-pulse`}
            style={{
              top, left,
              animationDelay: d,
              animationDuration: dur,
              boxShadow: '0 0 6px rgba(255,255,255,0.9)',
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main className="max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-[120px] pt-6 sm:pt-10 pb-40">

          {/* Filter pills — Figma 85:86 */}
          {/*<div className="flex items-center justify-center gap-3 flex-wrap mb-8 sm:mb-12">
            <button
              onClick={() => setMainFilter('all')}
              className="w-[56px] h-[56px] flex items-center justify-center rounded-full bg-cosmic-surface text-white hover:bg-cosmic-surface/80 transition-all active:scale-95 shrink-0"
              aria-label={t.all || 'Barchasi'}
            >
              <MenuIcon size={18} />
            </button>
            {[
              { key: 'lessons', icon: BookOpen,  label: t.lessons || 'Darslar'   },
              { key: 'all',     icon: null,      label: t.all     || 'Barchasi'  },
              { key: 'games',   icon: Gamepad2,  label: t.games   || "O'yinlar"  },
            ].map(({ key, icon: Icon, label }) => {
              const active = mainFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setMainFilter(key)}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-full text-[15px] font-medium transition-all whitespace-nowrap ${
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
          </div>*/}

          {/* ── Cards grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10 xl:gap-[50px]">
            {filteredItems.map((game, index) => {
              const active  = index === 0;
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
                  className={`group relative text-left rounded-[40px] overflow-hidden transition-all duration-300 bg-cosmic-card
                    border-6 border-solid cursor-pointer animate-[fadeInUp_0.5s_ease-out_both]
                    ${active
                      ? 'border-cosmic-glow shadow-cosmic-glow hover:-translate-y-1'
                      : 'border-cosmic-surface hover:border-cosmic-glow/60 hover:shadow-cosmic-glow hover:-translate-y-1'}`}
                  aria-label={title}
                >
                  {/* Illustration */}
                  <div className="relative aspect-[474/204] w-full overflow-hidden">
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

                  {/* Meta — three rows: badge / title-score / progress */}
                  <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-5 sm:pb-6 space-y-3 sm:space-y-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-[3px] rounded-full text-white font-heading font-semibold text-[16px] sm:text-[18px] tracking-[1px] uppercase leading-none
                        ${isGame ? 'bg-cosmic-gameTag' : 'bg-cosmic-lessonTag'}`}
                    >
                      {isGame ? (t.games || "O'yinlar") : (t.lessons || 'Darslar')}
                    </span>

                    <div className="flex items-end justify-between gap-3 font-mono uppercase text-white">
                      {/* Title. min-w-0 lets truncate kick in; clamp at 2
                          lines on very narrow cards so nothing falls off. */}
                      <span className="min-w-0 flex-1 text-[13px] sm:text-[15px] leading-[1.1] tracking-[0.5px] line-clamp-2 break-words">
                        {title}
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold shrink-0 text-[13px] sm:text-[15px]">
                        {rating}/100
                        <Star size={16} className="text-cosmic-gold fill-cosmic-gold drop-shadow-[0_0_4px_rgba(255,215,0,0.6)]" />
                      </span>
                    </div>

                    {/* Progress bar — Figma 85:114/115 */}
                    <div className="h-[12px] sm:h-[15px] rounded-full bg-cosmic-track overflow-hidden">
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

          {filteredItems.length === 0 && (
            <div className="text-center py-20 text-white/60">
              <Search size={64} className="mx-auto mb-4 opacity-40" />
              <p className="text-lg">{t.nothing_found}</p>
            </div>
          )}
        </main>

        <Footer />
      </div>

      <CosmicRobot />

      <SmartAuthPrompt
        trigger={authTrigger}
        onAuthSuccess={() => setAuthTrigger(null)}
      />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Tailwind's border preset stops at 8 but skips 6. Inline custom
           utility keeps the token surface minimal. */
        .border-6 { border-width: 6px; }
      `}</style>
    </div>
  );
};

/* Dense starfield. Roughly tripled vs. the first cut so once the nebula
   JPEG decodes you get a clear twinkle layer over it instead of a few
   scattered dots. Format: [top, left, size-classes, delay, duration]. */
const STAR_POSITIONS = [
  ['3%',  '7%',  'w-1 h-1',     '0s',   '2s'  ], ['6%',  '18%', 'w-1.5 h-1.5', '0.5s', '3s'  ],
  ['4%',  '32%', 'w-1 h-1',     '1s',   '2.5s'], ['9%',  '46%', 'w-2 h-2',     '1.5s', '3.5s'],
  ['5%',  '61%', 'w-1 h-1',     '0.8s', '2.8s'], ['8%',  '74%', 'w-1.5 h-1.5', '2s',   '3.2s'],
  ['3%',  '88%', 'w-1 h-1',     '1.2s', '2.3s'], ['14%', '4%',  'w-1 h-1',     '0.3s', '2.1s'],
  ['18%', '23%', 'w-2 h-2',     '0.3s', '3.8s'], ['16%', '38%', 'w-1 h-1',     '2.2s', '2.6s'],
  ['22%', '52%', 'w-1.5 h-1.5', '0.9s', '3.4s'], ['19%', '66%', 'w-1 h-1',     '1.7s', '2.9s'],
  ['24%', '81%', 'w-2 h-2',     '0.6s', '3.1s'], ['21%', '93%', 'w-1 h-1',     '1.4s', '2.4s'],
  ['30%', '10%', 'w-1.5 h-1.5', '1.4s', '2.7s'], ['34%', '28%', 'w-1 h-1',     '2.5s', '3.3s'],
  ['32%', '44%', 'w-1 h-1',     '0.7s', '2.6s'], ['36%', '59%', 'w-2 h-2',     '1.1s', '3s'  ],
  ['31%', '72%', 'w-1 h-1',     '0.4s', '2.2s'], ['35%', '87%', 'w-1.5 h-1.5', '1.6s', '2.8s'],
  ['42%', '3%',  'w-1 h-1',     '1.8s', '3.1s'], ['44%', '17%', 'w-1.5 h-1.5', '0.2s', '2.4s'],
  ['48%', '34%', 'w-1 h-1',     '1.3s', '2.9s'], ['46%', '50%', 'w-2 h-2',     '0.5s', '3.6s'],
  ['49%', '64%', 'w-1 h-1',     '2.1s', '2.5s'], ['45%', '78%', 'w-1.5 h-1.5', '0.9s', '3.3s'],
  ['52%', '13%', 'w-1 h-1',     '1.5s', '2.7s'], ['56%', '27%', 'w-1.5 h-1.5', '0.6s', '3s'  ],
  ['58%', '42%', 'w-1 h-1',     '2s',   '2.3s'], ['55%', '55%', 'w-1 h-1',     '0.8s', '3.4s'],
  ['60%', '69%', 'w-2 h-2',     '1.2s', '2.8s'], ['57%', '84%', 'w-1 h-1',     '1.9s', '3.2s'],
  ['66%', '6%',  'w-1.5 h-1.5', '0.3s', '2.6s'], ['70%', '22%', 'w-1 h-1',     '2.2s', '3.5s'],
  ['68%', '37%', 'w-1 h-1',     '1.1s', '2.4s'], ['72%', '50%', 'w-2 h-2',     '0.4s', '3.1s'],
  ['69%', '63%', 'w-1 h-1',     '1.7s', '2.7s'], ['74%', '79%', 'w-1.5 h-1.5', '0.9s', '3s'  ],
  ['71%', '92%', 'w-1 h-1',     '2.3s', '2.5s'], ['80%', '9%',  'w-2 h-2',     '1.1s', '2.5s'],
  ['83%', '25%', 'w-1 h-1',     '0.2s', '3.9s'], ['85%', '40%', 'w-1.5 h-1.5', '1.4s', '2.8s'],
  ['88%', '54%', 'w-1 h-1',     '1.6s', '3.2s'], ['82%', '68%', 'w-2 h-2',     '0.1s', '2.6s'],
  ['86%', '82%', 'w-1 h-1',     '1.8s', '3.3s'], ['91%', '15%', 'w-1.5 h-1.5', '0.6s', '2.9s'],
  ['94%', '31%', 'w-1 h-1',     '2.4s', '2.4s'], ['92%', '48%', 'w-1 h-1',     '1s',   '3.1s'],
  ['95%', '62%', 'w-1.5 h-1.5', '1.3s', '2.7s'], ['93%', '76%', 'w-1 h-1',     '0.5s', '3.5s'],
  ['96%', '90%', 'w-2 h-2',     '2.1s', '2.6s'],
];

export default HomePage;
