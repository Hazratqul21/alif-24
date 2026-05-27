import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, BookOpen, TrendingUp, Gift, Clock, Plus, AlertTriangle, ArrowLeftRight, ChevronLeft, ChevronRight, SlidersHorizontal, ArrowUpDown, DollarSign, Filter, RefreshCw } from "lucide-react";
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
    desc: "Eng ko'p sotiladigan va o'qiladigan biznes, psixologiya va motivatsion tarjimalarni kashf eting.",
    bg: "from-emerald-600 via-teal-600 to-teal-700",
    buttonText: "Ommaboplar",
    link: "/?sort=popular"
  }
];

export default function Home() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, token } = useAuth();
  
  // Parse filters directly from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const genre = searchParams.get("genre") || "";
  const sort = searchParams.get("sort") || "newest";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  // Temporary local state for price inputs in the sidebar
  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);

  // Sync inputs with URL changes (e.g. if filters are reset)
  useEffect(() => {
    setLocalMinPrice(minPrice);
    setLocalMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  // Hero Slider index hook
  const [currentSlide, setCurrentSlide] = useState(0);

  // Stats & Book listings hooks
  const { data: stats } = useGetBooksStats();
  const { data: booksData, isLoading } = useListBooks({ 
    search: search || undefined, 
    type: (type as "sell" | "free" | "rent") || undefined,
    genre: genre || undefined,
    sort: (sort as "newest" | "oldest" | "popular" | "price_asc" | "price_desc") || undefined
  });

  // Overdue and active loans hooks
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

  const updateFilters = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val);
      }
    });
    nextParams.delete("offset"); // Reset pagination on filter change
    const nextSearch = nextParams.toString();
    setLocation("/" + (nextSearch ? "?" + nextSearch : ""));
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({
      minPrice: localMinPrice || null,
      maxPrice: localMaxPrice || null
    });
  };

  const handleResetFilters = () => {
    setLocalMinPrice("");
    setLocalMaxPrice("");
    setLocation("/");
  };

  // Perform client-side price filtering (API gives raw list, we can filter prices in-memory)
  let booksToRender = booksData?.books ?? [];
  if (minPrice) {
    booksToRender = booksToRender.filter(b => b.price !== undefined && b.price !== null && b.price >= parseFloat(minPrice));
  }
  if (maxPrice) {
    booksToRender = booksToRender.filter(b => b.price !== undefined && b.price !== null && b.price <= parseFloat(maxPrice));
  }

  // popular shelves (mock bestseller filter)
  const bestsellerBooks = (booksData?.books ?? [])
    .filter(b => (b as any).avgRating >= 4.5 || (b as any).viewCount > 10)
    .slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      
      {/* Overdue alert banner */}
      {isAuthenticated && overdueTxs.length > 0 && (
        <Link href="/profile">
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-rose-100/70 transition-all group shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-rose-800 uppercase tracking-wide">
                {overdueTxs.length} ta kitob muddati o'tgan!
              </p>
              <p className="text-xs text-rose-600 mt-0.5 font-semibold">
                {overdueTxs.map(t => t.bookTitle ?? "Kitob").join(", ")} — tezroq qaytarish uchun bosing
              </p>
            </div>
            <span className="text-xs font-bold text-rose-500 group-hover:underline shrink-0">Boshqarish →</span>
          </div>
        </Link>
      )}

      {/* Active lending reminder */}
      {isAuthenticated && overdueTxs.length === 0 && activeTxs.length > 0 && (
        <Link href="/profile">
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-amber-100/70 transition-all group shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
                {activeTxs.length} ta kitob hozir sizda bor
              </p>
              <p className="text-xs text-amber-600 mt-0.5 font-semibold">
                Faol mutolaa qilayotgan kitoblaringiz: {activeTxs.map(t => t.bookTitle ?? "Kitob").join(", ")}
              </p>
            </div>
            <span className="text-xs font-bold text-amber-500 group-hover:underline shrink-0">Ko'rish →</span>
          </div>
        </Link>
      )}

      {/* Hero Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-8">
          {[
            { icon: BookOpen, label: "Jami kitoblar", value: stats.total, color: "text-amber-600 bg-amber-50 border-amber-100" },
            { icon: TrendingUp, label: "Sotiladiganlar", value: stats.sellCount, color: "text-amber-600 bg-amber-50 border-amber-100" },
            { icon: Gift, label: "Bepul kitoblar", value: stats.freeCount, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
            { icon: Clock, label: "Ijaradagilar", value: stats.rentCount, color: "text-blue-600 bg-blue-50 border-blue-100" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className={cn("bg-white border rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow")}>
              <div className={cn("p-2.5 rounded-xl border shrink-0", color.split(" ")[0] === "text-amber-600" ? "bg-amber-50 text-amber-500 border-amber-100" : color.split(" ")[0] === "text-emerald-600" ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-blue-50 text-blue-500 border-blue-100")}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{value}</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Two-Pane Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Filter Sidebar (Asaxiy style) */}
        <aside className="w-full lg:w-64 bg-white border border-slate-100 rounded-2xl p-5 shrink-0 shadow-sm sticky top-20">
          <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-3">
            <span className="flex items-center gap-2 font-black text-xs text-slate-800 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-amber-500" />
              Filtrlar
            </span>
            {(search || type || genre || minPrice || maxPrice) && (
              <button 
                onClick={handleResetFilters}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Tozalash
              </button>
            )}
          </div>

          {/* Genres Category Tree */}
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Kitob janri</p>
              <div className="space-y-1">
                <button
                  onClick={() => updateFilters({ genre: null })}
                  className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                    !genre ? "bg-amber-500 text-white shadow-sm shadow-amber-500/10" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Barcha janrlar
                </button>
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => updateFilters({ genre: g })}
                    className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all truncate",
                      genre === g ? "bg-amber-500 text-white shadow-sm shadow-amber-500/10 font-bold" : "text-slate-600 hover:bg-slate-50"
                    )}
                    title={g}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Service Type Selection */}
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
                    onClick={() => updateFilters({ type: t.value || null })}
                    className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all",
                      type === t.value ? "bg-amber-500/10 text-amber-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Price Filter (Min/Max inputs) */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Narxi (so'm)</p>
              <form onSubmit={handlePriceApply} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Min"
                      value={localMinPrice}
                      onChange={(e) => setLocalMinPrice(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-center font-bold focus:outline-none focus:bg-white focus:border-amber-500"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Max"
                      value={localMaxPrice}
                      onChange={(e) => setLocalMaxPrice(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-center font-bold focus:outline-none focus:bg-white focus:border-amber-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Narxni qo'llash
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Right Main Panel */}
        <main className="flex-1 w-full space-y-8">
          
          {/* Interactive Hero Slideshow Banner (Wow factor!) */}
          <div className="relative h-64 rounded-3xl overflow-hidden shadow-md group">
            {SLIDES.map((slide, index) => (
              <div
                key={index}
                className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-700 ease-in-out p-8 md:p-12 flex flex-col justify-center text-white",
                  slide.bg,
                  index === currentSlide ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0 pointer-events-none"
                )}
              >
                <div className="max-w-md space-y-3">
                  <span className="text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-md uppercase tracking-wider block w-fit">
                    Platforma yangiligi
                  </span>
                  <h2 className="text-xl md:text-2xl font-black leading-tight tracking-tight uppercase">
                    {slide.title}
                  </h2>
                  <p className="text-xs md:text-sm text-white/90 font-medium leading-relaxed">
                    {slide.desc}
                  </p>
                  <Link href={slide.link}>
                    <button className="mt-2 bg-white hover:bg-slate-50 text-slate-900 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer">
                      {slide.buttonText}
                    </button>
                  </Link>
                </div>
              </div>
            ))}

            {/* Slider Dots */}
            <div className="absolute bottom-5 right-5 z-20 flex gap-1.5">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={cn("w-2 h-2 rounded-full transition-all duration-300",
                    index === currentSlide ? "bg-white w-6" : "bg-white/40 hover:bg-white/70"
                  )}
                />
              ))}
            </div>

            {/* Manual Arrows */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % SLIDES.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Bestsellers Shelf (Horizontal scroll widget) */}
          {bestsellerBooks.length > 0 && !search && !genre && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hafta Xiti / Tavsiya Etamiz</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-100">
                {bestsellerBooks.map((book) => (
                  <div key={book.id} className="w-56 shrink-0">
                    <BookCard book={book} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Main Catalog Header / Toolbar */}
          <section className="space-y-4">
            <div className="bg-white border border-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  {genre ? `Janr: ${genre}` : search ? `Qidiruv: "${search}"` : "Kitoblar katalogi"}
                </h2>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                  {isLoading ? "Kitoblar yuklanmoqda..." : `${booksToRender.length} ta natija topildi`}
                </p>
              </div>

              {/* Sorting toolbar Dropdown (Asaxiy style) */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-500" />
                  Saralash:
                </span>
                <select
                  value={sort}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="newest">Yangi qo'shilganlar</option>
                  <option value="popular">Eng ko'p o'qilganlar</option>
                  <option value="price_asc">Arzonroq birinchi</option>
                  <option value="price_desc">Qimmatroq birinchi</option>
                  <option value="oldest">Eskiroq birinchi</option>
                </select>
              </div>
            </div>

            {/* Main Books Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse flex flex-col h-full">
                    <div className="aspect-[2/3] bg-slate-100" />
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                      <div className="h-8 bg-slate-100 rounded w-full mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : booksToRender.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {booksToRender.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-100 rounded-2xl">
                <BookOpen className="w-16 h-16 text-slate-200 mb-4 stroke-[1.5]" />
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Kitob topilmadi</h3>
                <p className="text-slate-400 text-xs mt-1 font-semibold">Ushbu filtrlar bo'yicha hech qanday natija topilmadi.</p>
                <button 
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-amber-500 hover:bg-amber-50 transition-all cursor-pointer"
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
