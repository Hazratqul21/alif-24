import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, TrendingUp, Gift, Clock, AlertTriangle, ArrowLeftRight, ChevronLeft, ChevronRight, ArrowUpDown, Filter, RefreshCw, X } from "lucide-react";
import { useListBooks, useGetBooksStats, useGetMyTransactions } from "@workspace/api-client-react";
import BookCard from "@/components/BookCard";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const GENRES = [
  "Badiiy adabiyot",
  "Jahon adabiyoti",
  "Diniy adabiyot",
  "Biznes va psixologiya",
  "Bolalar adabiyoti",
  "Ilmiy-ommabop",
];

const SLIDES = [
  {
    title: "Kitob ulashish va sotish endi osonroq!",
    desc: "Mahallangizdagi kitobxonlar bilan bog'laning, kitoblar xarid qiling yoki vaqtincha ijaraga berib daromad toping.",
    bg: "from-amber-600 via-amber-500 to-orange-500",
    buttonText: "E'lon berish",
    link: "/books/new"
  },
  {
    title: "Kutubxonalar faoliyati va xarita integratsiyasi",
    desc: "Mahallangiz atrofidagi faol kutubxonalarni xarita orqali qidiring va o'zingizga yaqin joydan kitob oling.",
    bg: "from-blue-600 via-indigo-600 to-indigo-700",
    buttonText: "Xaritaga o'tish",
    link: "/map"
  },
  {
    title: "Top 10 - Biznes va Shaxsiy Rivojlanish",
    desc: "Eng ko'p sotiladigan va o'qiladigan biznes, psixologiya kitoblarni kashf eting.",
    bg: "from-emerald-600 via-teal-600 to-teal-700",
    buttonText: "Ommaboplar",
    link: "/?sort=popular"
  }
];

export default function Home() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, token } = useAuth();

  // ========== reactive url search query parameter ==========
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") || "");
  }, [location, window.location.search]);

  // ========== LOCAL STATE FILTERS (instant, no URL roundtrip) ==========
  const [type, setType] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState<string>("newest");
  const [localMinPrice, setLocalMinPrice] = useState("");
  const [localMaxPrice, setLocalMaxPrice] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");

  // Pagination page state
  const [page, setPage] = useState(1);
  const LIMIT = 40;

  // Reset pagination page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [type, genre, appliedMinPrice, appliedMaxPrice, search, sort]);

  // Mobile filter sheet state
  const [filterOpen, setFilterOpen] = useState(false);

  // Hero Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Stats & Book listings
  const { data: stats } = useGetBooksStats();
  const { data: booksData, isLoading } = useListBooks({
    search: search || undefined,
    type: (type as "sell" | "free" | "rent") || undefined,
    genre: genre || undefined,
    sort: (sort as "newest" | "oldest" | "popular" | "price_asc" | "price_desc") || undefined,
    limit: LIMIT,
    offset: (page - 1) * LIMIT
  });

  // Overdue and active loans
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: txData } = useGetMyTransactions({}, { query: { enabled: isAuthenticated && !!token } as any });
  const overdueTxs = txData?.transactions?.filter(t => t.status === "overdue") ?? [];
  const activeTxs = txData?.transactions?.filter(t => t.status === "active") ?? [];

  // Auto-cycling slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ========== FILTER HANDLERS (instant state updates) ==========
  const handleGenre = useCallback((g: string) => {
    setGenre(g);
    setFilterOpen(false);
  }, []);

  const handleType = useCallback((t: string) => {
    setType(t);
    setFilterOpen(false);
  }, []);

  const handlePriceApply = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setAppliedMinPrice(localMinPrice);
    setAppliedMaxPrice(localMaxPrice);
    setFilterOpen(false);
  }, [localMinPrice, localMaxPrice]);

  const handleResetFilters = useCallback(() => {
    setType("");
    setGenre("");
    setSort("newest");
    setLocalMinPrice("");
    setLocalMaxPrice("");
    setAppliedMinPrice("");
    setAppliedMaxPrice("");
    setFilterOpen(false);
    // Clear URL query parameters completely
    setLocation("/");
  }, [setLocation]);

  // Client-side price filtering (avoids network refetches for minor price adjust)
  const booksToRender = useMemo(() => {
    let books = booksData?.books ?? [];
    if (appliedMinPrice) {
      books = books.filter(b => b.price != null && b.price >= parseFloat(appliedMinPrice));
    }
    if (appliedMaxPrice) {
      books = books.filter(b => b.price != null && b.price <= parseFloat(appliedMaxPrice));
    }
    return books;
  }, [booksData, appliedMinPrice, appliedMaxPrice]);

  // popular shelves (mock bestseller filter)
  const bestsellerBooks = useMemo(() => {
    return (booksData?.books ?? [])
      .filter(b => (b as any).avgRating >= 4.5 || (b as any).viewCount > 10)
      .slice(0, 6);
  }, [booksData]);

  // Pagination total pages and page range calculation
  const totalPages = useMemo(() => {
    return Math.ceil((booksData?.total ?? 0) / LIMIT);
  }, [booksData]);

  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const range: (number | string)[] = [];
    if (page <= 4) {
      range.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (page >= totalPages - 3) {
      range.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      range.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return range;
  }, [page, totalPages]);

  const hasActiveFilters = type || genre || appliedMinPrice || appliedMaxPrice || search;

  // ========== FILTER SIDEBAR CONTENT (shared between desktop & mobile) ==========
  const filterContent = (
    <div className="space-y-4">
      {/* Genre category */}
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Kitob janri</p>
        <div className="space-y-1">
          <button
            onClick={() => handleGenre("")}
            className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
              !genre ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 active:bg-slate-100"
            )}
          >
            Barcha janrlar
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => handleGenre(g)}
              className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors truncate",
                genre === g ? "bg-amber-500 text-white shadow-sm font-bold" : "text-slate-600 hover:bg-slate-50 active:bg-slate-100"
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Type category */}
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Xizmat turi</p>
        <div className="space-y-1">
          {[
            { value: "", label: "Barchasi" },
            { value: "sell", label: "Sotiladiganlar" },
            { value: "rent", label: "Ijara beriladiganlar" },
            { value: "free", label: "Tekin / Sovg'a" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => handleType(t.value)}
              className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                type === t.value ? "bg-amber-500/10 text-amber-700 font-bold" : "text-slate-600 hover:bg-slate-50 active:bg-slate-100"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Price category */}
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Narxi (so'm)</p>
        <form onSubmit={handlePriceApply} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={localMinPrice}
              onChange={(e) => setLocalMinPrice(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-center font-bold focus:outline-none focus:bg-white focus:border-amber-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={localMaxPrice}
              onChange={(e) => setLocalMaxPrice(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-center font-bold focus:outline-none focus:bg-white focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            Narxni qo'llash
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

      {/* Overdue alert banner */}
      {isAuthenticated && overdueTxs.length > 0 && (
        <Link href="/profile">
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-rose-100/70 transition-colors group shadow-sm">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-rose-800 uppercase tracking-wide">
                {overdueTxs.length} ta kitob muddati o'tgan!
              </p>
              <p className="text-[11px] text-rose-600 mt-0.5 font-semibold truncate">
                {overdueTxs.map(t => t.bookTitle ?? "Kitob").join(", ")} — tezroq qaytarish uchun bosing
              </p>
            </div>
            <span className="text-xs font-bold text-rose-500 group-hover:underline shrink-0 hidden sm:block">Boshqarish →</span>
          </div>
        </Link>
      )}

      {/* Active lending reminder */}
      {isAuthenticated && overdueTxs.length === 0 && activeTxs.length > 0 && (
        <Link href="/profile">
          <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-amber-100/70 transition-colors group shadow-sm">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
                {activeTxs.length} ta kitob hozir sizda bor
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5 font-semibold truncate">
                {activeTxs.map(t => t.bookTitle ?? "Kitob").join(", ")}
              </p>
            </div>
            <span className="text-xs font-bold text-amber-500 group-hover:underline shrink-0 hidden sm:block">Ko'rish →</span>
          </div>
        </Link>
      )}

      {/* Hero Stats — responsive 2x2 on mobile, 4-col on desktop */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-6 sm:mb-8">
          {[
            { icon: BookOpen, label: "Jami", value: stats.total, color: "text-amber-500 bg-amber-50 border-amber-100" },
            { icon: TrendingUp, label: "Sotiladi", value: stats.sellCount, color: "text-amber-500 bg-amber-50 border-amber-100" },
            { icon: Gift, label: "Bepul", value: stats.freeCount, color: "text-emerald-500 bg-emerald-50 border-emerald-100" },
            { icon: Clock, label: "Ijara", value: stats.rentCount, color: "text-blue-500 bg-blue-50 border-blue-100" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white border rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 shadow-sm">
              <div className={cn("p-2 sm:p-2.5 rounded-xl border shrink-0", color)}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-black text-slate-800 leading-none mb-0.5">{value}</p>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== MOBILE FILTER BAR (visible only on mobile) ========== */}
      <div className="flex lg:hidden items-center gap-2 mb-4 overflow-x-auto pb-1.5 scrollbar-none">
        <button
          onClick={() => setFilterOpen(true)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors border",
            hasActiveFilters
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-white text-slate-600 border-slate-200 active:bg-slate-50"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtrlar
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-white text-amber-600 text-[10px] font-black flex items-center justify-center ml-0.5">
              {[type, genre, appliedMinPrice, appliedMaxPrice, search].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Quick genre chips */}
        <button
          onClick={() => handleGenre("")}
          className={cn("px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors border",
            !genre ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-slate-500 border-slate-200 active:bg-slate-50"
          )}
        >
          Barchasi
        </button>
        {GENRES.map(g => (
          <button
            key={g}
            onClick={() => handleGenre(g)}
            className={cn("px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors border whitespace-nowrap",
              genre === g ? "bg-amber-50 text-amber-700 border-amber-200 font-bold" : "bg-white text-slate-500 border-slate-200 active:bg-slate-50"
            )}
          >
            {g}
          </button>
        ))}
      </div>

      {/* ========== MOBILE FILTER SHEET (bottom sheet overlay) ========== */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 pt-3 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 font-black text-xs text-slate-800 uppercase tracking-wider">
                <Filter className="w-4 h-4 text-amber-500" />
                Filtrlar
              </span>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button onClick={handleResetFilters} className="text-[11px] font-bold text-rose-500 flex items-center gap-0.5">
                    <RefreshCw className="w-3 h-3" />
                    Tozalash
                  </button>
                )}
                <button onClick={() => setFilterOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            {/* Drag indicator */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-200" />
            {filterContent}
          </div>
        </div>
      )}

      {/* ========== TWO-PANE LAYOUT ========== */}
      <div className="flex gap-6 items-start">

        {/* Desktop Filter Sidebar (hidden on mobile) */}
        <aside className="hidden lg:block w-64 bg-white border border-slate-100 rounded-2xl p-5 shrink-0 shadow-sm sticky top-20">
          <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-3">
            <span className="flex items-center gap-2 font-black text-xs text-slate-800 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-amber-500" />
              Filtrlar
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Tozalash
              </button>
            )}
          </div>
          {filterContent}
        </aside>

        {/* Main Panel */}
        <main className="flex-1 min-w-0 space-y-6 sm:space-y-8">

          {/* Hero Slideshow — shorter on mobile */}
          <div className="relative h-40 sm:h-56 md:h-64 rounded-2xl sm:rounded-3xl overflow-hidden shadow-md group">
            {SLIDES.map((slide, index) => (
              <div
                key={index}
                className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-700 ease-in-out p-5 sm:p-8 md:p-12 flex flex-col justify-center text-white",
                  slide.bg,
                  index === currentSlide ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0 pointer-events-none"
                )}
              >
                <div className="max-w-md space-y-2 sm:space-y-3">
                  <span className="text-[9px] sm:text-[10px] font-black bg-white/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md uppercase tracking-wider block w-fit">
                    Platforma yangiligi
                  </span>
                  <h2 className="text-sm sm:text-xl md:text-2xl font-black leading-tight tracking-tight uppercase line-clamp-1">
                    {slide.title}
                  </h2>
                  <p className="text-[11px] sm:text-xs md:text-sm text-white/90 font-medium leading-relaxed line-clamp-2">
                    {slide.desc}
                  </p>
                  <Link href={slide.link}>
                    <button className="mt-1 sm:mt-2 bg-white hover:bg-slate-50 text-slate-900 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-colors shadow-md active:scale-95 cursor-pointer">
                      {slide.buttonText}
                    </button>
                  </Link>
                </div>
              </div>
            ))}

            {/* Slider Dots */}
            <div className="absolute bottom-3 sm:bottom-5 right-3 sm:right-5 z-20 flex gap-1.5">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={cn("w-2 h-2 rounded-full transition-all duration-300",
                    index === currentSlide ? "bg-white w-5 sm:w-6" : "bg-white/40"
                  )}
                />
              ))}
            </div>

            {/* Desktop arrows only */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex items-center justify-center z-20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % SLIDES.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white hidden sm:flex items-center justify-center z-20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Bestsellers Shelf (Horizontal native snap-scroll shelf) */}
          {bestsellerBooks.length > 0 && !search && !genre && (
            <section className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">Hafta Xiti / Tavsiya Etamiz</h2>
              </div>
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
                {bestsellerBooks.map((book) => (
                  <div key={book.id} className="w-48 sm:w-56 shrink-0 snap-start">
                    <BookCard book={book} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Catalog Header / Toolbar */}
          <section className="space-y-4">
            <div className="bg-white border border-slate-50 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-sm">
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                  <span>{genre ? `Janr: ${genre}` : "Kitoblar katalogi"}</span>
                  {search && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[10px] font-black rounded-lg uppercase tracking-wide">
                      Qidiruv: "{search}"
                      <button
                        onClick={() => setLocation("/")}
                        className="w-3.5 h-3.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 flex items-center justify-center transition-colors shrink-0"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </span>
                  )}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold mt-0.5">
                  {isLoading ? "Yuklanmoqda..." : `${booksToRender.length} ta natija`}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-slate-400 text-[11px] sm:text-xs font-semibold flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Saralash:</span>
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold py-1.5 px-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="newest">Yangilar</option>
                  <option value="popular">Ommabop</option>
                  <option value="price_asc">Arzon → Qimmat</option>
                  <option value="price_desc">Qimmat → Arzon</option>
                  <option value="oldest">Eski</option>
                </select>
              </div>
            </div>

            {/* Books Grid — 2 col mobile, 3 col tablet, 4 col desktop */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse flex flex-col h-full">
                    <div className="aspect-[2/3] bg-slate-100" />
                    <div className="p-3 sm:p-4 space-y-2 flex-1">
                      <div className="h-3 sm:h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-2.5 sm:h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : booksToRender.length > 0 ? (
              <div className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {booksToRender.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-4 pb-8 animate-in fade-in duration-300">
                    {/* Previous Button */}
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-amber-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-md scrollbar-none px-1 py-0.5">
                      {paginationRange.map((p, idx) => {
                        if (p === "...") {
                          return (
                            <span
                              key={`ellipsis-${idx}`}
                              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-slate-400 select-none"
                            >
                              ...
                            </span>
                          );
                        }

                        const pageNum = Number(p);
                        const isCurrent = pageNum === page;
                        return (
                          <button
                            key={`page-${pageNum}`}
                            onClick={() => setPage(pageNum)}
                            className={cn(
                              "w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-black transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center shrink-0 border",
                              isCurrent
                                ? "bg-amber-500 border-amber-500 text-white shadow-sm font-black scale-105"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-amber-500 hover:border-amber-200"
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-amber-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center bg-white border border-slate-100 rounded-2xl">
                <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-slate-200 mb-3 sm:mb-4 stroke-[1.5]" />
                <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wider">Kitob topilmadi</h3>
                <p className="text-slate-400 text-[11px] sm:text-xs mt-1 font-semibold px-4">Ushbu filtrlar bo'yicha natija topilmadi.</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-3 sm:mt-4 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  Filtrlarni tozalash
                </button>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}
