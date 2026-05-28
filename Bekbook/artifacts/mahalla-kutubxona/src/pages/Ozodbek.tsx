import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Shield, Users, BookOpen, ShoppingBag, Loader2, Search,
  AlertTriangle, CheckCircle2, ChevronDown, DollarSign, Key,
  Lock, ArrowLeft, Ban, UserCheck, Eye, Trash2, Calendar
} from "lucide-react";
import { cn, formatDateShort } from "@/lib/utils";

type TabId = "sales" | "users" | "stores" | "books" | "settings";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Ozodbek() {
  const [, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Settings states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  // Data states
  const [activeTab, setActiveTab] = useState<TabId>("sales");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Filters & Searches
  const [userSearch, setUserSearch] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [deletingBook, setDeletingBook] = useState<number | null>(null);

  // Authentication check on mount
  useEffect(() => {
    const session = sessionStorage.getItem("ozodbek_session");
    if (session === "unlocked") {
      setIsAuthenticated(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/stats/comprehensive");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load owner data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/owner/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem("ozodbek_session", "unlocked");
        setIsAuthenticated(true);
      } else {
        const err = await res.json();
        setAuthError(err.message || "Noto'g'ri parol!");
      }
    } catch {
      setAuthError("Server ulanishida xatolik!");
    } finally {
      setVerifying(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");
    setSettingsSuccess("");
    setChangingPass(true);
    try {
      const res = await fetch("/api/owner/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setSettingsSuccess("Parol muvaffaqiyatli o'zgartirildi!");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const err = await res.json();
        setSettingsError(err.message || "Parolni o'zgartirishda xatolik!");
      }
    } catch {
      setSettingsError("Server ulanishida xatolik!");
    } finally {
      setChangingPass(false);
    }
  };

  const handleUpdateUser = async (userId: number, changes: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/users/${userId}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (res.ok) {
        fetchData();
        setEditingUser(null);
      }
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    setDeletingBook(bookId);
    try {
      const res = await fetch(`/api/admin/books/${bookId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete book:", err);
    } finally {
      setDeletingBook(null);
    }
  };

  // Lock screen view
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[85vh] bg-background px-4">
        <div className="w-full max-w-md bg-card border border-card-border p-8 rounded-3xl shadow-xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-1 text-foreground">Ozodbek Owner Panel</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Tizimni to'liq boshqarish uchun parolni kiriting</p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Kirish paroli</label>
              <div className="relative">
                <Key className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolingiz..."
                  required
                  className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirish"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "sales", label: "Sotuvlar & Obunalar", icon: DollarSign },
    { id: "users", label: "Foydalanuvchilar", icon: Users },
    { id: "stores", label: "Do'kon & Kutubxonalar", icon: BookOpen },
    { id: "books", label: "Kitoblar", icon: ShoppingBag },
    { id: "settings", label: "Sozlamalar", icon: Shield },
  ];

  const filteredUsers = data?.users?.filter((u: any) => {
    const s = userSearch.toLowerCase();
    return (u.name ?? "").toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s) || (u.phone ?? "").includes(s);
  }) ?? [];

  const filteredBooks = data?.books?.filter((b: any) => {
    const s = bookSearch.toLowerCase();
    return (b.title ?? "").toLowerCase().includes(s) || (b.author ?? "").toLowerCase().includes(s);
  }) ?? [];

  const filteredStores = data?.stores?.filter((s: any) => {
    const term = storeSearch.toLowerCase();
    return (s.name ?? "").toLowerCase().includes(term) || (s.address ?? "").toLowerCase().includes(term);
  }) ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Ozodbek Owner Panel
            </h1>
            <p className="text-sm text-muted-foreground">Bekbook platformasini to'liq boshqarish va sotuvlar monitoringi</p>
          </div>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem("ozodbek_session");
            setIsAuthenticated(false);
          }}
          className="text-xs font-semibold px-4 py-2 border border-border rounded-xl text-rose-600 hover:bg-rose-50 transition-colors self-start sm:self-center"
        >
          Chiqish
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : data ? (
        <>
          {/* Counters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard icon={Users} label="Jami Foydalanuvchilar" value={data.stats.totalUsers} sub={`${data.stats.blacklistedUsers} ta bloklangan`} color="bg-blue-50 text-blue-600" />
            <StatCard icon={BookOpen} label="Do'kon & Kutubxonalar" value={data.stats.totalStores} sub={`${data.stats.libraryCount} kutubxona, ${data.stats.bookstoreCount} do'kon`} color="bg-amber-50 text-amber-600" />
            <StatCard icon={ShoppingBag} label="Jami Kitoblar" value={data.stats.totalBooks} color="bg-teal-50 text-teal-600" />
            <StatCard icon={DollarSign} label="Jami Tushum" value={`${data.stats.totalRevenue.toLocaleString()} so'm`} sub={`${data.stats.activeSubscriptions} faol oylik obunalar`} color="bg-rose-50 text-rose-600" />
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-muted p-1 rounded-2xl mb-8 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabId)}
                className={cn(
                  "px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap",
                  activeTab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* Tab Views */}

          {/* 1. SALES & SUBSCRIPTIONS */}
          {activeTab === "sales" && (
            <div className="space-y-6">
              <div className="bg-card border border-card-border p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-1.5"><Calendar className="w-5 h-5 text-primary" />Oxirgi 30 kunlik tushumlar hisoboti</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Sana</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Sotilgan Kitoblar</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Faol Obunalar</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Kunlik Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailySales?.map((s: any) => (
                        <tr key={s.date} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{s.date}</td>
                          <td className="px-4 py-3">{s.orders} ta</td>
                          <td className="px-4 py-3">{s.subs} ta</td>
                          <td className="px-4 py-3 text-right font-bold text-primary">{(s.amount).toLocaleString()} so'm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. USERS */}
          {activeTab === "users" && (
            <div>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Foydalanuvchi ismi, emaili yoki telefoni bo'yicha qidirish..."
                    className="w-full pl-9 pr-4 py-3 bg-background border border-input rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredUsers.map((u: any) => (
                  <div key={u.id} className="bg-card border border-card-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                        {u.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{u.name}</p>
                          {u.isBlacklisted && <span className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Ban className="w-3 h-3" />Bloklangan</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Rol: <span className="font-medium">{u.role}</span> · Tel: <span className="font-medium">{u.phone ?? "Kiritilmagan"}</span> · Qo'shilgan: {formatDateShort(u.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => setEditingUser(editingUser === u.id ? null : u.id)}
                        className="text-xs px-3 py-1.5 border border-border rounded-xl font-medium hover:bg-muted"
                      >
                        Boshqarish
                      </button>
                      <button
                        onClick={() => handleUpdateUser(u.id, { isBlacklisted: !u.isBlacklisted })}
                        className={cn("p-1.5 rounded-xl border transition-colors", u.isBlacklisted ? "text-teal-600 hover:bg-teal-50 border-teal-200" : "text-rose-600 hover:bg-rose-50 border-rose-200")}
                      >
                        {u.isBlacklisted ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                    </div>

                    {editingUser === u.id && (
                      <div className="w-full border-t border-border mt-3 pt-3 flex flex-wrap gap-4 items-center bg-muted/20 p-3 rounded-xl">
                        <div>
                          <label className="text-xs text-muted-foreground font-semibold uppercase block mb-1">Roli</label>
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                            className="bg-background border border-border rounded-xl text-xs px-2.5 py-1.5"
                          >
                            <option value="user">User</option>
                            <option value="seller">Seller</option>
                            <option value="librarian">Librarian</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground font-semibold uppercase block mb-1">Kategoriyasi</label>
                          <select
                            value={u.category}
                            onChange={(e) => handleUpdateUser(u.id, { category: e.target.value })}
                            className="bg-background border border-border rounded-xl text-xs px-2.5 py-1.5"
                          >
                            <option value="regular">Oddiy</option>
                            <option value="student">Talaba</option>
                            <option value="teacher">O'qituvchi</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. STORES & LIBRARIES */}
          {activeTab === "stores" && (
            <div>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="Kutubxona yoki Do'kon nomi/manzili bo'yicha qidirish..."
                    className="w-full pl-9 pr-4 py-3 bg-background border border-input rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Kutubxona / Do'kon</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Turi</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Telefon</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Manzil</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Yaratilgan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStores.map((s: any) => (
                        <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{s.name}</p>
                            {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", s.type === "library" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-orange-50 text-orange-700 border-orange-200")}>
                              {s.type === "library" ? "Kutubxona" : "Do'kon"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{s.phone ?? "—"}</td>
                          <td className="px-4 py-3 text-xs max-w-xs truncate">{s.address ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-right text-muted-foreground">{formatDateShort(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. BOOKS */}
          {activeTab === "books" && (
            <div>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    placeholder="Kitob nomi yoki muallif bo'yicha qidirish..."
                    className="w-full pl-9 pr-4 py-3 bg-background border border-input rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Kitob</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Turi</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Holat</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Narxi</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Amal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBooks.map((b: any) => (
                        <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{b.title}</p>
                            <p className="text-xs text-muted-foreground">{b.author ?? "Muallif kiritilmagan"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                              {b.type === "rent" ? "Ijara" : b.type === "sell" ? "Sotiladi" : "Tekin"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{b.status}</td>
                          <td className="px-4 py-3 text-xs font-bold">{b.price ? `${Number(b.price).toLocaleString()} so'm` : "Bepul"}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => { if (confirm(`"${b.title}" kitobini butunlay o'chirishni xohlaysizmi?`)) handleDeleteBook(b.id); }}
                              disabled={deletingBook === b.id}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {deletingBook === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. SETTINGS */}
          {activeTab === "settings" && (
            <div className="max-w-md mx-auto">
              <div className="bg-card border border-card-border p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-1 flex items-center gap-1.5 text-foreground"><Key className="w-5 h-5 text-primary" />Kirish parolini o'zgartirish</h3>
                <p className="text-xs text-muted-foreground mb-4">/ozodbek paneliga kirish uchun parolni yangilang</p>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Amaldagi parol</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Hozirgi parol..."
                      required
                      className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Yangi parol</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Yangi parol kiriting..."
                      required
                      className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                    />
                  </div>

                  {settingsError && (
                    <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{settingsError}</span>
                    </div>
                  )}

                  {settingsSuccess && (
                    <div className="p-3 bg-teal-50 text-teal-700 border border-teal-100 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{settingsSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={changingPass}
                    className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    {changingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : "Parolni yangilash"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground bg-card border border-card-border rounded-3xl">
          Ma'lumot topilmadi
        </div>
      )}
    </div>
  );
}
