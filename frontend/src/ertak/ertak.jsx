import React, { useEffect, useRef, useState } from "react";
import translations from "../language/translations";
import {
  BookOpen,
  Upload,
  Mic,
  Play,
  Pause,
  SkipForward,
  Volume2,
  ImageIcon,
  FileText,
  Sparkles,
  Star,
  Heart,
  Home,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  VolumeX,
  Settings,
  SunMoon,
  Plus,
  Minus
} from "lucide-react";
import "./KidsReadingPlatform.css";

/**
 * Responsive Kids Reading Platform
 * - Mobile-first, expands to a 3-column layout on desktop
 * - Reader supports font size controls and SpeechSynthesis
 * - Accessible buttons, keyboard-friendly interactions
 *
 * Usage: drop this component into your React app. Requires lucide-react icons.
 */

const sampleStories = [
  {
    id: 1,
    title: "Колобок",
    type: "Сказка",
    author: "Русская народная",
    category: "Народные сказки",
    difficulty: "Легкая",
    ageGroup: "3-5 лет",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=1200&q=80&auto=format&fit=crop",
    duration: "8 мин",
    color: "yellow-to-orange",
    content: `Жили-были старик со старухой.
Вот и говорит старик старухе:
— Поди-ка, старуха, по коробу поскреби, по сусеку помети, не наскребешь ли муки на колобок.

Взяла старуха крылышко, по коробу поскребла, по сусеку помела и наскребла муки горсти две.
Колобок полежал-полежал, да вдруг и покатился...`
  },
  {
    id: 2,
    title: "Репка",
    type: "Сказка",
    author: "Русская народная",
    category: "Народные сказки",
    difficulty: "Легкая",
    ageGroup: "3-5 лет",
    image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80&auto=format&fit=crop",
    duration: "5 мин",
    color: "green-to-emerald",
    content: `Посадил дед репку. Выросла репка большая-пребольшая.
Стал дед репку из земли тащить: тянет-потянет, вытащить не может...`
  },
  {
    id: 3,
    title: "Три медведя",
    type: "Сказка",
    author: "Л.Н. Толстой",
    category: "Авторские сказки",
    difficulty: "Средняя",
    ageGroup: "5-7 лет",
    image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=1200&q=80&auto=format&fit=crop",
    duration: "10 мин",
    color: "brown-to-amber",
    content: `Одна девочка ушла из дома в лес...`
  }
];

const KidsReadingPlatform = () => {
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'uz';
  const t = (key) => (translations[lang] && translations[lang][key]) || translations.uz[key] || key;
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [view, setView] = useState("home"); // home | reader
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [query, setQuery] = useState("");
  const readerRef = useRef(null);
  const speechRef = useRef(null);

  useEffect(() => {
    // Simulate initial load (or replace with API call)
    setStories(sampleStories);
  }, []);

  // Search/filter results
  const filteredStories = stories.filter((s) =>
    `${s.title} ${s.author} ${s.category}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  // File upload helpers
  const readFileContent = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;

      if (file.type.includes("text") || /\.(txt|md)$/i.test(file.name)) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const content = await readFileContent(file);
      const data = { file, type, content };
      setUploadedFile(data);
      setActiveStory({
        id: "uploaded",
        title: file.name,
        image: "",
        content: typeof content === "string" ? content : "",
        duration: "—",
        type: type === "image" ? "Изображение" : type === "audio" ? "Аудио" : "Загруженный текст",
        ageGroup: "-"
      });
      setView("reader");
    } catch (err) {
      console.error("Upload error", err);
      window.appAlert(t('reading_errorUpload'));
    } finally {
      setIsUploading(false);
    }
  };

  // Reader controls
  useEffect(() => {
    return () => {
      // cleanup speech on unmount
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakText = (text) => {
    if (!("speechSynthesis" in window)) {
      window.appAlert(t('reading_ttsNotSupported'));
      return;
    }
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    // нежный голос настройки для детской истории
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.lang = "ru-RU";
    speechRef.current = utter;
    window.speechSynthesis.speak(utter);
    setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    speechRef.current = null;
    setIsSpeaking(false);
  };

  const toggleSpeak = () => {
    if (!activeStory) return;
    const content = activeStory?.content || uploadedFile?.content || "";
    // show only a trimmed content if it's too long
    const text = content.length > 4000 ? content.slice(0, 4000) : content;
    if (isSpeaking) stopSpeaking();
    else speakText(text);
  };

  // Progress (based on scroll)
  const getScrollProgress = () => {
    if (!readerRef.current) return 0;
    const el = readerRef.current;
    const total = el.scrollHeight - el.clientHeight;
    if (total <= 0) return 100;
    return Math.min(100, Math.round((el.scrollTop / total) * 100));
  };

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!readerRef.current) return;
    const el = readerRef.current;
    const onScroll = () => setProgress(getScrollProgress());
    el.addEventListener("scroll", onScroll);
    // set initial
    setProgress(getScrollProgress());
    return () => el.removeEventListener("scroll", onScroll);
  }, [view, activeStory]);

  // Layout helpers
  const openReader = (story) => {
    setActiveStory(story);
    setView("reader");
    // close menu on mobile
    setIsMenuOpen(false);
    // reset font size
    setFontSize(16);
  };

  const closeReader = () => {
    setView("home");
    setActiveStory(null);
    stopSpeaking();
  };

  // Font size controls
  const changeFont = (delta) => {
    setFontSize((f) => Math.max(14, Math.min(28, f + delta)));
  };

  return (
    <div className="krp-root">
      {/* Top bar */}
      <header className="krp-topbar">
        <div className="krp-left">
          <button
            className="krp-icon-btn"
            aria-label="menu"
            onClick={() => setIsMenuOpen((s) => !s)}
          >
            <Menu size={20} />
          </button>

          <div className="krp-brand" role="heading" aria-level={1}>
            <BookOpen size={22} />
            <span className="krp-title">{t('reading_brand')}</span>
          </div>
        </div>

        <div className="krp-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('reading_searchPlaceholder')}
            aria-label={t('search')}
          />
        </div>

        <div className="krp-right">
          <button
            className="krp-icon-btn"
            title={t('reading_settings')}
            aria-label={t('reading_settings')}
            onClick={() => window.appAlert(t('reading_settingsStub'))}
          >
            <Settings size={18} />
          </button>

          <label className="krp-upload-btn" title={t('reading_upload')}>
            <input
              type="file"
              aria-hidden
              style={{ display: "none" }}
              onChange={(e) => handleFileUpload(e, "document")}
            />
            <Upload size={18} /> <span className="krp-upload-text">{t('reading_upload')}</span>
          </label>
        </div>
      </header>

      <div className={`krp-body ${isMenuOpen ? "krp-menu-open" : ""}`}>
        {/* Sidebar (collapsible on mobile) */}
        <aside className={`krp-sidebar ${isMenuOpen ? "open" : ""}`} aria-hidden={!isMenuOpen && window.innerWidth < 900}>
          <nav className="krp-nav">
            <button className="krp-nav-item active" onClick={() => { setView("home"); setIsMenuOpen(false); }}>
              <Home size={16} /> {t('reading_main')}
            </button>
            <button className="krp-nav-item" onClick={() => window.appAlert(t('reading_myBooks'))}> 
              <BookOpen size={16} /> {t('reading_myBooksBtn')}
            </button>
            <button className="krp-nav-item" onClick={() => window.appAlert(t('reading_favorites'))}> 
              <Star size={16} /> {t('reading_favoritesBtn')}
            </button>
            <button className="krp-nav-item" onClick={() => window.appAlert(t('reading_audioRecords'))}> 
              <Volume2 size={16} /> {t('reading_audiobooksBtn')}
            </button>
            <button className="krp-nav-item" onClick={() => window.appAlert(t('reading_themes'))}> 
              <Sparkles size={16} /> {t('reading_themesBtn')}
            </button>
          </nav>

          <div className="krp-quick-upload">
            <label className="krp-quick-btn" title={t('reading_quick_photo')}>
              <input type="file" accept="image/*" hidden onChange={(e) => handleFileUpload(e, "image")} />
              <ImageIcon size={18} /> {t('reading_quick_photo')}
            </label>

            <label className="krp-quick-btn" title={t('reading_quick_text')}>
              <input type="file" accept=".pdf,.txt,.doc,.docx" hidden onChange={(e) => handleFileUpload(e, "document")} />
              <FileText size={18} /> {t('reading_quick_text')}
            </label>

            <label className="krp-quick-btn" title={t('reading_quick_audio')}>
              <input type="file" accept="audio/*" hidden onChange={(e) => handleFileUpload(e, "audio")} />
              <Mic size={18} /> {t('reading_quick_audio')}
            </label>
          </div>
        </aside>

        {/* Main content */}
        <main className="krp-main">
          {view === "home" && (
            <>
              <section className="krp-categories" aria-label={t('reading_categoriesLabel')}>
                <button className="krp-chip active">{t('reading_all')}</button>
                <button className="krp-chip">{t('reading_fairytales')}</button>
                <button className="krp-chip">{t('reading_poems')}</button>
                <button className="krp-chip">{t('reading_stories')}</button>
                <button className="krp-chip">{t('reading_audio')}</button>
              </section>

              <section className="krp-grid" aria-live="polite">
                {isUploading ? (
                  <div className="krp-loading">{t('reading_loading')}</div>
                ) : filteredStories.length ? (
                  filteredStories.map((s) => (
                    <article
                      key={s.id}
                      className="krp-card"
                      onClick={() => openReader(s)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && openReader(s)}
                      role="button"
                      aria-label={`Открыть ${s.title}`}
                    >
                      <div className="krp-card-media">
                        {s.image ? <img src={s.image} alt={s.title} /> : <div className="krp-card-placeholder" />}
                        <div className="krp-card-duration">{s.duration}</div>
                      </div>
                      <div className="krp-card-body">
                        <h3 className="krp-card-title">{s.title}</h3>
                        <div className="krp-card-meta">
                          <span className="krp-badge">{s.type}</span>
                          <span className="krp-age">{s.ageGroup}</span>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="krp-empty">{t('reading_nothingFound')}</div>
                )}
              </section>
            </>
          )}

          {view === "reader" && activeStory && (
            <section className="krp-reader">
              <div className="krp-reader-header">
                <button className="krp-back" onClick={closeReader} aria-label={t('reading_back')}>
                  <ChevronLeft /> {t('reading_back')}
                </button>

                <div className="krp-reader-title">{activeStory.title}</div>

                <div className="krp-reader-actions">
                  <button className="krp-icon-btn" onClick={toggleSpeak} aria-pressed={isSpeaking} aria-label={t('reading_voiceMode')}>
                    {isSpeaking ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button className="krp-icon-btn" onClick={() => window.appAlert(t('reading_optionsStub'))}> 
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              <div className="krp-reader-content">
                {activeStory.image && (
                  <div className="krp-reader-image">
                    <img src={activeStory.image} alt={activeStory.title} />
                  </div>
                )}

                <div
                  className="krp-reader-text"
                  ref={readerRef}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                >
                  {(activeStory.content || uploadedFile?.content || "")
                    .split("\n")
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                </div>
              </div>

              <div className="krp-reader-footer">
                <div className="krp-progress">
                  <div
                    className="krp-progress-bar"
                    style={{ width: `${progress}%` }}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    role="progressbar"
                  />
                </div>

                <div className="krp-controls">
                  <div className="krp-font-controls" role="group" aria-label="Размер шрифта">
                    <button className="krp-icon-btn" onClick={() => changeFont(-2)} aria-label={t('reading_prev')}>
                      <Minus size={16} />
                    </button>
                    <div className="krp-font-size">{fontSize}px</div>
                    <button className="krp-icon-btn" onClick={() => changeFont(2)} aria-label={t('reading_next')}>
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="krp-play-controls">
                    <button className="krp-icon-btn" onClick={() => window.appAlert(t('reading_prev'))}> 
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      className="krp-main-play"
                      onClick={toggleSpeak}
                      aria-pressed={isSpeaking}
                    >
                      {isSpeaking ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button className="krp-icon-btn" onClick={() => window.appAlert(t('reading_next'))}> 
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <button
                    className={`krp-voice-btn ${isSpeaking ? "active" : ""}`}
                    onClick={() => {
                      // toggle listening mode placeholder
                      window.appAlert(t('reading_voiceMode'));
                    }}
                  >
                    <Mic size={16} /> {t('reading_ask')}
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* Desktop preview or right panel: shows selected story summary on wide screens */}
        <aside className="krp-preview" aria-hidden={view !== "home" && !activeStory}>
          {activeStory ? (
            <div className="krp-preview-card">
              <div className="krp-preview-media">
                {activeStory.image ? <img src={activeStory.image} alt={activeStory.title} /> : <div className="krp-card-placeholder" />}
              </div>
              <div className="krp-preview-body">
                <h4>{activeStory.title}</h4>
                <p className="muted">{activeStory.author} • {activeStory.type}</p>
                <p className="krp-preview-text">
                  {(activeStory.content || "").slice(0, 240)}{(activeStory.content || "").length > 240 ? "…" : ""}
                </p>
                <div className="krp-preview-actions">
                  <button onClick={() => openReader(activeStory)} className="primary">{t('reading_read')}</button>
                  <button onClick={() => { navigator.clipboard?.writeText(window.location.href); window.appAlert(t('reading_linkCopied')); }}>{t('reading_share')}</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="krp-preview-empty">
              <Sparkles size={28} /> <p>{t('reading_pickToStart')}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default KidsReadingPlatform;