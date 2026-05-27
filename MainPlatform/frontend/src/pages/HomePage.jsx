import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu as MenuIcon, BookOpen, Gamepad2, Star, Search, Trophy, Sparkles, Lock, ChevronRight, Play, Award, GraduationCap, Brain, Activity } from 'lucide-react';
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
   HomePage (cosmic theme) - Redesigned to Row-Based Premium Layout
   Fully satisfying all user requests:
   1. Ertaklar cards styled exactly like the screenshot with O'qish, Savollar, Testlar
      buttons and 🧠 X savol badges, launching direct Lessions routes with query params.
   2. Book covers render real book.image_url if present.
   3. Horizontal scrolls enabled on mobile for Olimpiadalar, O'yinlar, and Harflar rows.
   4. O'yinlar styled exactly like Ertaklar cards in a horizontal scroll.
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

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  let cleaned = url;
  if (cleaned.startsWith('/')) cleaned = cleaned.slice(1);
  if (!cleaned.startsWith('api/')) {
    if (cleaned.startsWith('uploads/')) {
      cleaned = 'api/' + cleaned;
    }
  }
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const base = isLocal ? 'http://localhost:8000' : 'https://alif24.uz';
  return `${base}/${cleaned}`;
};

const resolveGameImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  let cleaned = url;
  if (cleaned.startsWith('/')) cleaned = cleaned.slice(1);
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const base = isLocal ? 'http://localhost:5177' : 'https://games.alif24.uz';
  return `${base}/${cleaned}`;
};

const RowHeader = ({ title, link, onLinkClick }) => (
  <div className="flex items-center justify-between mb-5 select-none px-1">
    <h2 className="text-lg sm:text-xl font-extrabold tracking-wider text-white flex items-center gap-2 drop-shadow-[0_0_12px_rgba(255,255,255,0.12)]">
      <span className="text-cosmic-gold animate-pulse">✨</span> {title}
    </h2>
    {link && (
      <button 
        onClick={onLinkClick} 
        className="flex items-center gap-1 text-[11px] sm:text-xs font-black text-sky-400 hover:text-sky-300 transition-all bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-sky-500/10 hover:border-sky-500/30 hover:scale-102 active:scale-98 duration-200 uppercase tracking-widest"
      >
        {link} <ChevronRight size={14} />
      </button>
    )}
  </div>
);

export default function HomePage() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [authTrigger, setAuthTrigger] = useState(null);
  const [dynamicDict, setDynamicDict] = useState({});
  const { trackAction, shouldShowRegistrationPrompt } = useUsageTracking();

  const [storiesList, setStoriesList] = useState([]);
  const [booksList, setBooksList] = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);

  const baseT = translations[language] || translations.uz;
  const t = { ...baseT, ...(dynamicDict[language] || {}) };

  // Fetch popular items from backend APIs
  useEffect(() => {
    const fetchContent = async () => {
      setLoadingContent(true);
      try {
        const [storiesRes, booksRes] = await Promise.all([
          apiService.get('/stories').catch(() => ({ data: [] })),
          apiService.get('/books').catch(() => ({ data: [] }))
        ]);
        
        const stList = storiesRes?.data || storiesRes || [];
        const bkList = booksRes?.data || booksRes || [];
        
        setStoriesList(stList);
        setBooksList(bkList);
      } catch (err) {
        console.error("Failed to load popular items:", err);
      } finally {
        setLoadingContent(false);
      }
    };
    fetchContent();
  }, []);

  // Filter 5 most popular stories
  const popularStories = useMemo(() => {
    if (storiesList.length > 0) {
      return [...storiesList].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);
    }
    // Mockups if empty
    return [
      { id: 'st1', title: 'Ayiq va ikki do\'st', language: 'uz', age_group: '7-8', view_count: 320, image_url: CARD_ART[1], questions: [{}, {}, {}], word_count: 189 },
      { id: 'st2', title: 'Zumrad va Qimmat', language: 'uz', age_group: '5-7', view_count: 245, image_url: CARD_ART[2], questions: [{}, {}, {}], word_count: 850 },
      { id: 'st3', title: 'Dushmanning do\'stga aylanishi', language: 'uz', age_group: '8-9', view_count: 198, image_url: CARD_ART[4], questions: [{}, {}, {}, {}], word_count: 293 },
      { id: 'st4', title: 'Aqlli bo\'rivoy', language: 'uz', age_group: '9-10', view_count: 154, image_url: CARD_ART[5], questions: [{}, {}, {}], word_count: 112 },
      { id: 'st5', title: 'Sehrli olma siri', language: 'uz', age_group: '6-8', view_count: 112, image_url: CARD_ART[3], questions: [{}, {}], word_count: 340 }
    ];
  }, [storiesList]);

  // Filter 5 most popular books
  const popularBooks = useMemo(() => {
    if (booksList.length > 0) {
      return [...booksList].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);
    }
    // Mockups if empty
    return [
      { id: 'bk1', title: 'QADAM 1: Prezident maktabi', language: 'uz', view_count: 512, is_premium: true, color: 'from-[#6366f1] to-[#4338ca]', tag: 'QADAM 1', questions: [{}, {}, {}], image_url: CARD_ART[1] },
      { id: 'bk2', title: 'QADAM 2: Prezident maktabi', language: 'uz', view_count: 420, is_premium: true, color: 'from-[#f97316] to-[#c2410c]', tag: 'QADAM 2', questions: [{}, {}, {}], image_url: CARD_ART[2] },
      { id: 'bk3', title: 'PM Qo\'llanma: INGLIZ TILI', language: 'uz', view_count: 367, is_premium: true, color: 'from-[#ec4899] to-[#be185d]', tag: 'PM INGLIZ TILI', questions: [{}, {}, {}], image_url: CARD_ART[4] },
      { id: 'bk4', title: 'PM Qo\'llanma: MATEMATIKA', language: 'uz', view_count: 295, is_premium: true, color: 'from-[#3b82f6] to-[#1d4ed8]', tag: 'PM MATEMATIKA', questions: [{}, {}, {}], image_url: CARD_ART[5] },
      { id: 'bk5', title: 'O\'tgan kunlar - A. Qodiriy', language: 'uz', view_count: 180, is_premium: false, color: 'from-[#0f172a] to-[#1e293b]', tag: 'BEPUL ROMAN', questions: [{}, {}], image_url: CARD_ART[3] }
    ];
  }, [booksList]);

  // Popular Brain Games (matching Ertak cards style as requested)
  const popularGames = useMemo(() => {
    return [
      { id: 'g1', title: 'Matematika Monstr', tag: 'MATEMATIKA', info: 'Miyani charxlovchi aqliy arifmetika', image: '/math.jpg', rating: 94, path: '/math-monster' },
      { id: 'g2', title: 'Xotira Mashqi', tag: 'XOTIRA', info: 'Kosmik ob\'ektlar yordamida xotirani charxlash', image: '/xotr.jpg', rating: 91, path: '/memory' },
      { id: 'g3', title: 'Matematik Gugurt', tag: 'MANTIQ', info: 'Gugurt donalari bilan geometrik jumboqlar', image: '/spichki.jpg', rating: 88, path: '/math-stich' },
      { id: 'g4', title: 'Yashirin So\'z (Crypto)', tag: 'SAVODXONLIK', info: 'Harflar orasidan berkitilgan so\'zni topish', image: '/crypto.jpg', rating: 93, path: '/crypto' },
      { id: 'g5', title: 'Kosmik Bo\'g\'in Pazl', tag: 'SO\'Z BOYLIGI', info: 'Bo\'g\'inlarni biriktirib yangi so\'zlar yasash', image: '/bugiin.jpg', rating: 95, path: '/bugiin' }
    ];
  }, []);

  const redirectToPlatform = (baseUrl, path = '') => {
    let target = `${baseUrl}${path}`;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      if (baseUrl.includes('lessions.alif24.uz')) {
        target = `http://localhost:5179${path}`;
      } else if (baseUrl.includes('harf.alif24.uz')) {
        target = `http://localhost:5174${path}`;
      } else if (baseUrl.includes('games.alif24.uz')) {
        target = `http://localhost:5177${path}`;
      } else if (baseUrl.includes('olimp.alif24.uz')) {
        target = `http://localhost:5178${path}`;
      }
    }
    window.location.href = target;
  };

  return (
    <div className="relative min-h-screen text-white bg-[#060613]">
      <SEO
        title="Bosh sahifa"
        description="Alif24 — bolalar uchun adaptiv ta'lim platformasi. Darslar, o'yinlar, olimpiadalar, AI testlar va harflar dunyosi bir joyda."
        keywords="alif24, bolalar ta'limi, onlayn darslar, o'quv o'yinlari, olimpiada"
        path="/"
      />

      {/* ── Cosmic Backdrop ──────── */}
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,6,19,0.15)_0%,rgba(6,6,19,0.65)_60%,rgba(6,6,19,0.95)_100%)]" />
      </div>

      {/* ── Twinkling Stars overlay ──────── */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden mix-blend-screen" aria-hidden="true">
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

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        {/* ── Main content rows ─────────────────────────────────────────────── */}
        <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-8 lg:px-12 pt-8 pb-40 flex-1">

          {/* ==========================================
              ROW 1: Popular Stories (Ommabop ertaklar)
              ========================================== */}
          <section className="mb-12 animate-[fadeInUp_0.5s_ease-out_both]">
            <RowHeader 
              title={language === 'ru' ? 'Популярные сказки' : language === 'en' ? 'Popular Stories' : 'Ommabop ertaklar'} 
              link={language === 'ru' ? 'Все' : language === 'en' ? 'See all' : 'Barchasi'}
              onLinkClick={() => redirectToPlatform('https://lessions.alif24.uz', '/ertaklar')}
            />
            
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth">
              {popularStories.map((story, i) => {
                const wordCount = story.word_count || (story.content ? story.content.trim().split(/\s+/).length : 180);
                const qCount = (story.questions || []).length;
                const testCount = (story.test || []).length;
                const displayImg = story.image_url ? resolveImageUrl(story.image_url) : null;
                const langPath = story.language && story.language !== 'uz' ? `/${story.language}` : '';
                return (
                  <div 
                    key={story.id || i}
                    onClick={() => redirectToPlatform('https://lessions.alif24.uz', `/ertaklar${langPath}?read=${story.id}`)}
                    className="snap-start shrink-0 w-[250px] sm:w-[280px] bg-cosmic-card border-4 border-cosmic-surface hover:border-cosmic-glow/60 rounded-[35px] p-4 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cosmic-glow group cursor-pointer"
                  >
                    <div className="w-full aspect-[4/3] rounded-[24px] overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900 relative">
                      {displayImg ? (
                        <img 
                          src={displayImg} 
                          alt={story.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/25 bg-gradient-to-br from-[#4b30fb]/40 to-[#764ba2]/40">
                          <BookOpen className="w-10 h-10 stroke-[1.2] mb-1" />
                          <span className="text-[9px] font-mono tracking-widest uppercase">Ertak</span>
                        </div>
                      )}
                      {qCount > 0 && (
                        <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-[9px] px-2.5 py-1 rounded-full font-bold text-white uppercase tracking-wider border border-white/10 flex items-center gap-1 shadow-md">
                          🧠 {qCount} savol
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 justify-between gap-3 text-left">
                      <div>
                        <h3 className="text-white font-extrabold text-sm leading-snug line-clamp-2 uppercase tracking-wide group-hover:text-cosmic-gold transition-colors">
                          {story.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-white/40 text-[9px] uppercase font-black tracking-widest mt-2">
                          <span>📖 {wordCount} so'z</span>
                          <span>•</span>
                          <span>{story.language === 'ru' ? '🇷🇺 Ruscha' : story.language === 'en' ? '🇬🇧 English' : "🇺🇿 O'zbek"}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-2 w-full">
                        <button 
                          onClick={(e) => { e.stopPropagation(); redirectToPlatform('https://lessions.alif24.uz', `/ertaklar${langPath}?read=${story.id}`); }}
                          className="w-full py-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-1 shadow-md shadow-purple-500/10"
                        >
                          O'qish 📖
                        </button>
                        
                        {qCount > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); redirectToPlatform('https://lessions.alif24.uz', `/ertaklar${langPath}?quiz=${story.id}`); }}
                            className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase tracking-widest rounded-xl border border-emerald-500/20 hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-1"
                          >
                            Savollar 🧠
                          </button>
                        )}

                        {testCount > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); redirectToPlatform('https://lessions.alif24.uz', `/ertaklar${langPath}?test=${story.id}`); }}
                            className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-black text-[10px] uppercase tracking-widest rounded-xl border border-blue-500/20 hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-1"
                          >
                            Testlar 📝
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ==========================================
              ROW 2: Popular Books (Ommabop kitoblar)
              ========================================== */}
          <section className="mb-12 animate-[fadeInUp_0.5s_ease-out_both]" style={{ animationDelay: '0.1s' }}>
            <RowHeader 
              title={language === 'ru' ? 'Популярные книги' : language === 'en' ? 'Popular Books' : 'Kitoblar'} 
              link={language === 'ru' ? 'Все' : language === 'en' ? 'See all' : 'Barchasi'}
              onLinkClick={() => redirectToPlatform('https://lessions.alif24.uz', '/kitoblar')}
            />
            
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth">
              {popularBooks.map((book, i) => {
                const qCount = (book.questions || []).length;
                const testCount = (book.test || []).length;
                const displayImg = book.image_url ? resolveImageUrl(book.image_url) : null;
                const langPath = book.language && book.language !== 'uz' ? `/${book.language}` : '';
                return (
                  <div 
                    key={book.id || i}
                    onClick={() => redirectToPlatform('https://lessions.alif24.uz', `/kitoblar${langPath}?read=${book.id}`)}
                    className="snap-start shrink-0 w-[220px] sm:w-[250px] bg-cosmic-card border-4 border-cosmic-surface hover:border-cosmic-glow/60 rounded-[35px] p-4 flex flex-col gap-3.5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cosmic-glow group cursor-pointer"
                  >
                    {/* Render cover image dynamically if present */}
                    <div className="w-full aspect-[3/4] rounded-[24px] overflow-hidden relative shadow-xl bg-gradient-to-br from-indigo-950 to-slate-950">
                      {displayImg ? (
                        <img 
                          src={displayImg} 
                          alt={book.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${book.color || 'from-indigo-950 to-slate-950'} p-4 flex flex-col justify-between`}>
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[7px] font-black text-white/50 tracking-widest uppercase">ALIF24 PM</span>
                          </div>
                          <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/15 mb-2 group-hover:scale-105 transition-transform duration-300">
                              <BookOpen className="w-5 h-5 text-white" strokeWidth={1.8} />
                            </div>
                            <h4 className="text-white font-extrabold text-[10px] uppercase tracking-wider leading-tight px-1 drop-shadow-md">
                              {book.tag || book.title}
                            </h4>
                          </div>
                          <div className="w-full bg-white/10 border border-white/15 rounded-xl py-1 text-center">
                            <p className="text-white font-black text-[8px] uppercase tracking-widest">
                              {book.tag ? 'QADAM' : 'O\'QISH'}
                            </p>
                          </div>
                          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/40 via-white/10 to-transparent border-r border-white/5" />
                        </div>
                      )}

                      {/* Lock / Paid badges */}
                      <div className="absolute top-3 left-3">
                        {book.is_premium ? (
                          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5 border border-amber-400/20">
                            <Lock size={9} strokeWidth={3} /> Premium
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg">
                            Bepul
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 justify-between gap-2 text-left">
                      <div>
                        <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 uppercase tracking-wide group-hover:text-cosmic-gold transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-white/40 text-[9px] uppercase font-black tracking-widest mt-1.5">
                          {book.language === 'ru' ? '🇷🇺 Ruscha' : book.language === 'en' ? '🇬🇧 English' : "🇺🇿 O'zbek"} • {book.view_count || 0} o'qildi
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5 mt-2 w-full">
                        <button 
                          onClick={(e) => { e.stopPropagation(); redirectToPlatform('https://lessions.alif24.uz', `/kitoblar${langPath}?read=${book.id}`); }}
                          className="w-full py-2 bg-gradient-to-r from-violet-650 to-purple-650 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-1 shadow-md shadow-indigo-500/10"
                        >
                          O'qish 📖
                        </button>
                        
                        {qCount > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); redirectToPlatform('https://lessions.alif24.uz', `/kitoblar${langPath}?quiz=${book.id}`); }}
                            className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-black text-[9px] uppercase tracking-widest rounded-xl border border-emerald-500/20 hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-1"
                          >
                            Savollar 🧠
                          </button>
                        )}

                        {testCount > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); redirectToPlatform('https://lessions.alif24.uz', `/kitoblar${langPath}?test=${book.id}`); }}
                            className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-black text-[9px] uppercase tracking-widest rounded-xl border border-blue-500/20 hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-1"
                          >
                            Testlar 📝
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ==========================================
              ROW 3: Olympiads (Olimpiadalar Banners)
              - Horizontal mobile scroll enabled
              ========================================== */}
          <section className="mb-12 animate-[fadeInUp_0.5s_ease-out_both]" style={{ animationDelay: '0.2s' }}>
            <RowHeader 
              title={language === 'ru' ? 'Олимпиады' : language === 'en' ? 'Olympiads' : 'Olimpiadalar'} 
              link={language === 'ru' ? 'Все' : language === 'en' ? 'See all' : 'Barchasi'}
              onLinkClick={() => redirectToPlatform('https://olimp.alif24.uz')}
            />
            
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth">
              {/* Main Illustration Banner (double size on desktop) */}
              <div 
                onClick={() => redirectToPlatform('https://olimp.alif24.uz')}
                className="snap-start shrink-0 w-[290px] sm:w-[480px] lg:col-span-2 lg:w-auto relative rounded-[40px] overflow-hidden bg-gradient-to-br from-[#120f26] via-[#1c1543] to-[#0d091e] border-6 border-cosmic-surface hover:border-cosmic-glow/65 p-6 flex flex-col md:flex-row items-center justify-between cursor-pointer hover:shadow-cosmic-glow hover:-translate-y-1 transition-all duration-300 group min-h-[220px]"
              >
                <div className="space-y-4 max-w-xs sm:max-w-md z-10 text-left">
                  <p className="text-emerald-400 font-extrabold text-xs sm:text-base leading-snug tracking-wide">
                    Yangi olimpiadalar tez orada platformaga joylanadi
                  </p>
                  <div className="border-t border-white/5 pt-3">
                    <h3 className="text-amber-400 font-black text-lg tracking-widest uppercase mb-1">
                      OLIMPIADA
                    </h3>
                    <p className="text-white/60 text-[10px] sm:text-xs font-semibold">
                      Hozirda faol olimpiadalar mavjud emas
                    </p>
                  </div>
                </div>
                
                {/* Floating cap and diploma */}
                <div className="relative w-36 h-28 sm:w-44 sm:h-36 shrink-0 mt-4 md:mt-0 z-10 flex items-center justify-center animate-pulse">
                  <img 
                    src="/designs/cosmic/graduation-cap.png" 
                    alt="Academic graduation cap & diploma" 
                    className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none" />
              </div>

              {/* Green Cup Results Card */}
              <div 
                onClick={() => redirectToPlatform('https://olimp.alif24.uz')}
                className="snap-start shrink-0 w-[240px] sm:w-[280px] lg:w-auto relative rounded-[40px] overflow-hidden bg-gradient-to-br from-[#0c1f13] via-[#0d2719] to-[#05140b] border-6 border-cosmic-surface hover:border-emerald-500/50 p-6 flex flex-col justify-between cursor-pointer hover:shadow-[0_0_30px_rgba(16,185,129,0.18)] hover:-translate-y-1 transition-all duration-300 group min-h-[220px] text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg mb-4">
                  <Trophy className="w-6 h-6 text-emerald-400 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <div>
                  <h3 className="text-white font-black text-base uppercase tracking-wider leading-tight mb-2 group-hover:text-emerald-400 transition-colors">
                    Olimpiada natijalari
                  </h3>
                  <p className="text-white/50 text-[10px] sm:text-xs font-semibold leading-relaxed">
                    O'tgan bellashuvlar, natijalar va g'oliblar reytingini ko'rish
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest group-hover:translate-x-1.5 transition-transform duration-300">
                  Ochish <ChevronRight size={12} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </section>

          {/* ==========================================
              ROW 4: Brain Games (Aqliy o'yinlar)
              - Styled exactly like Ertak cards in horizontal scroll
              ========================================== */}
          <section className="mb-12 animate-[fadeInUp_0.5s_ease-out_both]" style={{ animationDelay: '0.3s' }}>
            <RowHeader 
              title={language === 'ru' ? 'Развивающие игры' : language === 'en' ? 'Brain Games' : 'Aqliy o\'yinlar'} 
              link={language === 'ru' ? 'Все' : language === 'en' ? 'See all' : 'Barchasi'}
              onLinkClick={() => redirectToPlatform('https://games.alif24.uz')}
            />
            
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth">
              {popularGames.map((game, i) => (
                <div 
                  key={game.id || i}
                  onClick={() => redirectToPlatform('https://games.alif24.uz', game.path)}
                  className="snap-start shrink-0 w-[250px] sm:w-[280px] bg-cosmic-card border-4 border-cosmic-surface hover:border-cosmic-glow/60 rounded-[35px] p-4 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cosmic-glow group cursor-pointer"
                >
                  <div className="w-full aspect-[4/3] rounded-[24px] overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900 relative">
                    <img 
                      src={resolveGameImageUrl(game.image)} 
                      alt={game.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-[9px] px-2.5 py-1 rounded-full font-bold text-white uppercase tracking-wider border border-white/10 flex items-center gap-1 shadow-md">
                      🧠 {game.rating}% rating
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 justify-between gap-3 text-left">
                    <div>
                      <h3 className="text-white font-extrabold text-sm leading-snug line-clamp-2 uppercase tracking-wide group-hover:text-cosmic-gold transition-colors">
                        {game.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-white/40 text-[9px] uppercase font-black tracking-widest mt-2">
                        <span>🏷️ {game.tag}</span>
                        <span>•</span>
                        <span>{game.info}</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); redirectToPlatform('https://games.alif24.uz', game.path); }}
                      className="w-full py-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-1 shadow-md shadow-purple-500/10"
                    >
                      O'ynash 🎮
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ==========================================
              ROW 5: Alphabets (Harflar dunyosi)
              - Horizontal mobile scroll enabled
              ========================================== */}
          <section className="mb-12 animate-[fadeInUp_0.5s_ease-out_both]" style={{ animationDelay: '0.4s' }}>
            <RowHeader 
              title={language === 'ru' ? 'Мир букв' : language === 'en' ? 'World of Letters' : 'Harflar dunyosi'} 
              link={null}
            />
            
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth sm:grid sm:grid-cols-3 sm:overflow-x-visible sm:pb-0">
              {/* Uzbek */}
              <div 
                onClick={() => redirectToPlatform('https://harf.alif24.uz')}
                className="snap-start shrink-0 w-[240px] sm:w-auto relative rounded-[40px] overflow-hidden bg-cosmic-card border-6 border-cosmic-surface hover:border-cosmic-glow/60 p-5 cursor-pointer hover:shadow-cosmic-glow hover:-translate-y-1.5 transition-all duration-300 group"
              >
                <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden mb-3 relative bg-gradient-to-br from-[#4b30fb]/30 to-[#764ba2]/30">
                  <img src={CARD_ART[3]} alt="Uzbek" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104" />
                </div>
                <h3 className="text-white font-extrabold text-xs uppercase tracking-widest text-center group-hover:text-cosmic-gold transition-colors">
                  So'zlovchi Alifbe (UZB) 🇺🇿
                </h3>
              </div>

              {/* English */}
              <div 
                onClick={() => redirectToPlatform('https://harf.alif24.uz', '/eharf')}
                className="snap-start shrink-0 w-[240px] sm:w-auto relative rounded-[40px] overflow-hidden bg-cosmic-card border-6 border-cosmic-surface hover:border-cosmic-glow/60 p-5 cursor-pointer hover:shadow-cosmic-glow hover:-translate-y-1.5 transition-all duration-300 group"
              >
                <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden mb-3 relative bg-gradient-to-br from-blue-900/30 to-indigo-900/30">
                  <img src={CARD_ART[4]} alt="English" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104" />
                </div>
                <h3 className="text-white font-extrabold text-xs uppercase tracking-widest text-center group-hover:text-cosmic-gold transition-colors">
                  Ingliz Alifbesi (ENG) 🇬🇧
                </h3>
              </div>

              {/* Russian */}
              <div 
                onClick={() => redirectToPlatform('https://harf.alif24.uz', '/rharf')}
                className="snap-start shrink-0 w-[240px] sm:w-auto relative rounded-[40px] overflow-hidden bg-cosmic-card border-6 border-cosmic-surface hover:border-cosmic-glow/60 p-5 cursor-pointer hover:shadow-cosmic-glow hover:-translate-y-1.5 transition-all duration-300 group"
              >
                <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden mb-3 relative bg-gradient-to-br from-purple-900/30 to-violet-900/30">
                  <img src={CARD_ART[5]} alt="Russian" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104" />
                </div>
                <h3 className="text-white font-extrabold text-xs uppercase tracking-widest text-center group-hover:text-cosmic-gold transition-colors">
                  Rus Alifbesi (RUS) 🇷🇺
                </h3>
              </div>
            </div>
          </section>

          {/* ==========================================
              ROW 6: Mathematics (Matematika Kids)
              ========================================== */}
          <section className="animate-[fadeInUp_0.5s_ease-out_both]" style={{ animationDelay: '0.5s' }}>
            <RowHeader 
              title={language === 'ru' ? 'Математика' : language === 'en' ? 'Mathematics' : 'Qiziqarli Matematika'} 
              link={null}
            />
            
            <div 
              onClick={() => navigate('/mathkids')}
              className="relative rounded-[40px] overflow-hidden bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#120f26] border-6 border-cosmic-surface hover:border-cosmic-glow/60 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8 cursor-pointer hover:shadow-cosmic-glow hover:-translate-y-1 transition-all duration-300 group select-none text-left"
            >
              <div className="w-32 h-32 rounded-3xl overflow-hidden shrink-0 border border-white/5 bg-gradient-to-br from-[#4b30fb] to-[#764ba2]">
                <img 
                  src={CARD_ART[2]} 
                  alt="MathKids" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="space-y-3 flex-1">
                <span className="inline-block bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  MATEMATIKA DUNYOSI
                </span>
                <h3 className="text-white font-black text-xl uppercase tracking-wider group-hover:text-cosmic-gold transition-colors leading-tight">
                  MathKids: Qiziqarli Matematika Uyga Vazifalar
                </h3>
                <p className="text-white/60 text-xs sm:text-sm font-semibold leading-relaxed">
                  Boshlang'ich sinf bolalari uchun qo'shish, ayirish, ko'paytirish va bo'lish amallarini qiziqarli o'yin shaklida o'rganish va uy vazifalarini bajarish maydonchasi.
                </p>
              </div>
              <div className="shrink-0 flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-full text-white/50 group-hover:text-white group-hover:bg-white/10 group-hover:translate-x-1 transition-all duration-300">
                <ChevronRight size={24} />
              </div>
            </div>
          </section>

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
        .border-6 { border-width: 6px; }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
}

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
];
