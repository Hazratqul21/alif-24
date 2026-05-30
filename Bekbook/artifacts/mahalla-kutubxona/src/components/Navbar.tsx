import { Link, useLocation } from "wouter";
import { BookOpen, Map, Store, User, LogOut, Plus, Menu, X, AlertTriangle, BarChart2, ShoppingCart, Bell, MessageSquare, Shield, Search, Heart, ChevronDown, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useGetMyTransactions, useGetMyFavorites } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart";
import { useQuery } from "@tanstack/react-query";

const GENRES = [
  { id: "badiiy", label: "Badiiy adabiyot" },
  { id: "jahon", label: "Jahon adabiyoti" },
  { id: "diniy", label: "Diniy adabiyot" },
  { id: "biznes", label: "Biznes va psixologiya" },
  { id: "bolalar", label: "Bolalar adabiyoti" },
  { id: "ilmiy", label: "Ilmiy-ommabop" },
];

export default function Navbar() {
  const { isAuthenticated, user, logout, token } = useAuth();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const { count: cartCount } = useCart();

  // Keep search input in sync with URL search params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get("search") || "");
  }, [window.location.search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation("/?search=" + encodeURIComponent(searchQuery.trim()));
    } else {
      setLocation("/");
    }
  };

  const handleGenreClick = (genreLabel: string) => {
    setCatalogOpen(false);
    setLocation("/?genre=" + encodeURIComponent(genreLabel));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: txData } = useGetMyTransactions({ query: { enabled: isAuthenticated && !!token } } as any);
  const overdueTxCount = txData?.transactions?.filter(t => t.status === "overdue").length ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: favsData } = useGetMyFavorites({ query: { enabled: isAuthenticated && !!token } } as any);
  const favCount = favsData?.books?.length ?? 0;

  const { data: notifData } = useQuery({
    queryKey: ["notif-badge"],
    enabled: isAuthenticated && !!token,
    refetchInterval: 30000,
    queryFn: async () => {
      const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { unreadCount: 0 };
      return res.json() as Promise<{ unreadCount: number }>;
    },
  });
  const unreadNotif = notifData?.unreadCount ?? 0;

  const { data: msgData } = useQuery({
    queryKey: ["msg-badge"],
    enabled: isAuthenticated && !!token,
    refetchInterval: 15000,
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-count", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { count: 0 };
      return res.json() as Promise<{ count: number }>;
    },
  });
  const unreadMsg = msgData?.count ?? 0;

  const role = (user as any)?.role as string | undefined;
  const isStaff = role === "admin" || role === "librarian" || role === "moderator";

  const sublinks = [
    { href: "/", label: "Asosiy do'konlar", icon: BookOpen },
    { href: "/?tab=user", label: "Ikkinchi qo'l", icon: BookOpen },
    { href: "/map", label: "Xarita", icon: Map },
    { href: "/stores", label: "Kutubxonalar", icon: Store },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-200">
      {/* Upper Navigation: Brand, Search, User Quick Actions */}
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 font-black text-xl text-amber-600 tracking-tight shrink-0 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <BookOpen className="w-5 h-5 fill-white" />
          </div>
          <span className="hidden sm:inline bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent uppercase font-black">
            Kutubxona
          </span>
        </Link>

        {/* Categories / Catalog Trigger */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setCatalogOpen(!catalogOpen)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-amber-500/10 active:scale-95"
          >
            <span>Katalog</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", catalogOpen && "rotate-180")} />
          </button>

          {catalogOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCatalogOpen(false)} />
              <div className="absolute top-full mt-2 left-0 w-64 bg-card border border-border rounded-2xl shadow-xl z-20 p-2 py-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="text-[11px] font-bold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Janrlar bo'yicha</p>
                <button
                  onClick={() => { setCatalogOpen(false); setLocation("/"); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors"
                >
                  Barcha kitoblar
                </button>
                {GENRES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleGenreClick(g.label)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors"
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Global Search Bar (Asaxiy styled) */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg relative">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Kitob nomi, muallif yoki janr..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-medium"
            />
            <button
              type="submit"
              className="absolute right-1 w-9 h-9 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white rounded-lg flex items-center justify-center shadow-md shadow-amber-500/15"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Actions Menu */}
        <div className="hidden md:flex items-center gap-3">
          {/* Favorites */}
          {isAuthenticated && (
            <Link href="/profile">
              <button className="relative w-10 h-10 rounded-xl hover:bg-amber-50 border border-gray-100 flex items-center justify-center text-slate-600 hover:text-amber-600 transition-all group">
                <Heart className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                {favCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 border-2 border-white animate-in scale-in">
                    {favCount}
                  </span>
                )}
              </button>
            </Link>
          )}

          {/* Cart */}
          <Link href="/cart">
            <button className="relative w-10 h-10 rounded-xl hover:bg-amber-50 border border-gray-100 flex items-center justify-center text-slate-600 hover:text-amber-600 transition-all group">
              <ShoppingCart className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 bg-amber-500 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 border-2 border-white animate-in scale-in">
                  {cartCount}
                </span>
              )}
            </button>
          </Link>

          {isAuthenticated ? (
            <>
              {/* Messages */}
              <Link href="/messages">
                <button className="relative w-10 h-10 rounded-xl hover:bg-amber-50 border border-gray-100 flex items-center justify-center text-slate-600 hover:text-amber-600 transition-all group">
                  <MessageSquare className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                  {unreadMsg > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 bg-blue-500 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 border-2 border-white animate-in scale-in">
                      {unreadMsg}
                    </span>
                  )}
                </button>
              </Link>

              {/* Notifications */}
              <Link href="/notifications">
                <button className="relative w-10 h-10 rounded-xl hover:bg-amber-50 border border-gray-100 flex items-center justify-center text-slate-600 hover:text-amber-600 transition-all group">
                  <Bell className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                  {unreadNotif > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 bg-orange-500 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 border-2 border-white animate-in scale-in">
                      {unreadNotif}
                    </span>
                  )}
                </button>
              </Link>

              {/* User Account */}
              <Link href="/profile">
                <button className={cn("relative h-10 px-3.5 border border-gray-100 rounded-xl text-slate-700 hover:text-amber-600 hover:bg-amber-50 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer",
                  location === "/profile" && "bg-amber-50 text-amber-600 border-amber-200")}>
                  {overdueTxCount > 0 ? (
                    <div className="relative">
                      <User className="w-4 h-4" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white flex items-center justify-center animate-ping" />
                    </div>
                  ) : (
                    <User className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="truncate max-w-[80px]">{user?.name?.split(" ")[0]}</span>
                  {overdueTxCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-black animate-pulse">{overdueTxCount}</span>
                  )}
                </button>
              </Link>

              {/* Staff Reporting */}
              {isStaff && (
                <Link href="/analytics">
                  <button className="w-10 h-10 rounded-xl hover:bg-amber-50 border border-gray-100 flex items-center justify-center text-slate-600 hover:text-amber-600 transition-all">
                    <BarChart2 className="w-4.5 h-4.5" />
                  </button>
                </Link>
              )}

              {/* Admin Panel */}
              {role === "admin" && (
                <Link href="/admin">
                  <button className="w-10 h-10 rounded-xl hover:bg-amber-50 border border-gray-100 flex items-center justify-center text-slate-600 hover:text-amber-600 transition-all">
                    <Shield className="w-4.5 h-4.5" />
                  </button>
                </Link>
              )}

              {/* Logout */}
              <button onClick={logout}
                className="w-10 h-10 rounded-xl border border-rose-100 hover:bg-rose-50 flex items-center justify-center text-rose-500 hover:text-rose-600 transition-all cursor-pointer">
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <button className="px-4 py-2 border border-gray-200 rounded-xl text-slate-600 hover:text-amber-600 hover:bg-amber-50 text-xs font-semibold transition-all cursor-pointer">
                  Kirish
                </button>
              </Link>
              <Link href="/register">
                <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer">
                  A'zo bo'lish
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-2">
          {cartCount > 0 && (
            <Link href="/cart">
              <span className="relative flex items-center justify-center w-9 h-9 border border-gray-100 rounded-lg hover:bg-muted text-slate-600">
                <ShoppingCart className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">{cartCount}</span>
              </span>
            </Link>
          )}
          <button className="w-9 h-9 border border-gray-100 rounded-lg hover:bg-muted flex items-center justify-center text-slate-600" onClick={() => setOpen(!open)}>
            {open ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Sub Navigation (Categories list & Book lending toggle button) */}
      <div className="border-t border-slate-50 bg-slate-50/50 hidden md:block">
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {sublinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all tracking-wide",
                  (location === href || (href !== "/" && location.startsWith(href)))
                    ? "bg-amber-500/10 text-amber-700"
                    : "text-slate-600 hover:text-amber-600 hover:bg-white")}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
            <a href="https://alif24.uz" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-amber-600 hover:bg-amber-50/50 transition-all tracking-wide border border-transparent hover:border-amber-100">
              <img src="https://alif24.uz/images/logo.png" className="h-4 w-auto object-contain rounded-sm" />
              <span>Alif24.uz</span>
            </a>
          </div>

          <Link href="/books/new">
            <button className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer">
              <Plus className="w-3.5 h-3.5 stroke-[3px]" />
              E'lon berish (Sotish / Ijara)
            </button>
          </Link>
        </div>
      </div>

      {/* Mobile menu container */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top duration-200" onClick={() => setOpen(false)}>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 tracking-wider">Katalog janrlari</p>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 rounded-xl">
              {GENRES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGenreClick(g.label)}
                  className="text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white hover:text-amber-600 transition-all border border-transparent hover:border-slate-100"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {sublinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
              location === href ? "bg-amber-500/10 text-amber-700 font-bold" : "text-slate-600 hover:text-amber-600 hover:bg-muted")}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
          <a href="https://alif24.uz" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-amber-600 hover:bg-amber-50/50 transition-colors">
            <img src="https://alif24.uz/images/logo.png" className="h-4 w-auto object-contain rounded-sm" /> Alif24.uz
          </a>

          {isAuthenticated ? (
            <>
              <div className="h-px bg-slate-100" />
              <Link href="/books/new" className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10">
                <Plus className="w-4 h-4 stroke-[3px]" />Kitob e'lon berish
              </Link>
              <Link href="/cart" className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-muted">
                <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Savat</span>
                {cartCount > 0 && <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black">{cartCount}</span>}
              </Link>
              <Link href="/messages" className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-muted">
                <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Xabarlar</span>
                {unreadMsg > 0 && <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-[10px] font-black">{unreadMsg}</span>}
              </Link>
              <Link href="/notifications" className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-muted">
                <span className="flex items-center gap-2"><Bell className="w-4 h-4" />Bildirishnomalar</span>
                {unreadNotif > 0 && <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-[10px] font-black">{unreadNotif}</span>}
              </Link>
              <Link href="/profile" className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-muted">
                <span className="flex items-center gap-2"><User className="w-4 h-4" />Mening profilim</span>
                {overdueTxCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-black">
                    {overdueTxCount} muddati o'tgan
                  </span>
                )}
              </Link>
              <button onClick={logout} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 w-full border border-rose-100 mt-2">
                <LogOut className="w-4.5 h-4.5" />Chiqish
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link href="/login" className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600">Kirish</Link>
              <Link href="/register" className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white">Ro'yxatdan o'tish</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
