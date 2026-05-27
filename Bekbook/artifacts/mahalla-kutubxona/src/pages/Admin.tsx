import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useAuth, getToken } from "@/lib/auth";
import {
  Shield, Users, Clock, ArrowLeft, Search, AlertTriangle, CheckCircle2,
  Loader2, ChevronDown, BookOpen, ShoppingBag, BarChart2, Trash2,
  TrendingUp, Crown, Ban, UserCheck, Eye, DollarSign,
} from "lucide-react";
import { cn, formatDateShort } from "@/lib/utils";

type TabId = "stats" | "users" | "books" | "orders" | "transactions" | "audit";

const CATEGORY_OPTIONS = [
  { value: "regular", label: "Oddiy (5 ta kitob)" },
  { value: "student", label: "Talaba (3 ta, 15 kun)" },
  { value: "teacher", label: "O'qituvchi (10 ta, 30 kun)" },
];

const ROLE_OPTIONS = [
  { value: "user", label: "Foydalanuvchi" },
  { value: "seller", label: "Sotuvchi" },
  { value: "librarian", label: "Kutubxonachi" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
];

const CATEGORY_LABELS: Record<string, string> = {
  regular: "Oddiy", student: "Talaba", teacher: "O'qituvchi",
};
const ROLE_LABELS: Record<string, string> = {
  user: "Foydalanuvchi", seller: "Sotuvchi", librarian: "Kutubxonachi",
  moderator: "Moderator", admin: "Admin",
};
const TX_STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border-blue-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
  returned: "bg-teal-50 text-teal-700 border-teal-200",
};
const TX_STATUS_LABELS: Record<string, string> = {
  active: "Aktiv", overdue: "Muddati o'tgan", returned: "Qaytarilgan",
};
const ORDER_STATUS_COLORS: Record<string, string> = {
  paid: "bg-teal-50 text-teal-700 border-teal-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};
const BOOK_TYPE_LABELS: Record<string, string> = {
  sell: "Sotiladi", free: "Bepul", rent: "Ijaraga",
};
const BOOK_TYPE_COLORS: Record<string, string> = {
  sell: "bg-amber-50 text-amber-700 border-amber-200",
  free: "bg-teal-50 text-teal-700 border-teal-200",
  rent: "bg-blue-50 text-blue-700 border-blue-200",
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof BarChart2; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
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

function UserRow({ user, isEditing, onEdit, onUpdate }: {
  user: any; isEditing: boolean; onEdit: () => void;
  onUpdate: (changes: Record<string, unknown>) => Promise<void>;
}) {
  const [role, setRole] = useState(user.role);
  const [category, setCategory] = useState(user.category);
  const [isBlacklisted, setIsBlacklisted] = useState(user.isBlacklisted);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRole(user.role); setCategory(user.category); setIsBlacklisted(user.isBlacklisted);
  }, [user]);

  async function handleSave() {
    setSaving(true);
    try { await onUpdate({ role, category, isBlacklisted }); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
          {user.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{user.name}</p>
            {user.readerId && <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">ID:{user.readerId}</span>}
            {user.isBlacklisted && <span className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Ban className="w-3 h-3" />Bloklangan</span>}
            {user.role === "admin" && <span className="text-xs text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Shield className="w-3 h-3" />Admin</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <div className="flex gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
            <span>{ROLE_LABELS[user.role] ?? user.role}</span>
            <span>·</span>
            <span>{CATEGORY_LABELS[user.category] ?? user.category}</span>
            {user.phone && <><span>·</span><span>{user.phone}</span></>}
            <span>·</span>
            <span>{formatDateShort(user.createdAt)}</span>
          </div>
        </div>
        <button onClick={onEdit} className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
          {isEditing ? "Yopish" : "Tahrirlash"}
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isEditing && "rotate-180")} />
        </button>
      </div>
      {isEditing && (
        <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Rol</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategoriya</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Blok holati</label>
              <button type="button" onClick={() => setIsBlacklisted(!isBlacklisted)}
                className={cn("w-full px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                  isBlacklisted ? "bg-rose-50 text-rose-700 border-rose-300" : "bg-background border-border text-muted-foreground hover:border-rose-300")}>
                {isBlacklisted ? "Bloklangan ✓" : "Bloklanmagan"}
              </button>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Saqlash
          </button>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("stats");

  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<number | null>(null);

  const [books, setBooks] = useState<any[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [bookStatusFilter, setBookStatusFilter] = useState("");
  const [deletingBook, setDeletingBook] = useState<number | null>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const token = getToken();

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      setStats(await res.json());
    } finally { setStatsLoading(false); }
  }, [token]);

  const fetchUsers = useCallback(async (q?: string) => {
    setUsersLoading(true);
    try {
      const s = q !== undefined ? q : search;
      const url = `/api/admin/users${s ? `?search=${encodeURIComponent(s)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(data.users ?? []);
    } finally { setUsersLoading(false); }
  }, [token, search]);

  const fetchBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const params = new URLSearchParams();
      if (bookSearch) params.set("search", bookSearch);
      if (bookStatusFilter) params.set("status", bookStatusFilter);
      const res = await fetch(`/api/admin/books?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBooks(data.books ?? []);
    } finally { setBooksLoading(false); }
  }, [token, bookSearch, bookStatusFilter]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=100", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOrders(data.orders ?? []);
    } finally { setOrdersLoading(false); }
  }, [token]);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await fetch("/api/admin/transactions?limit=50", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTransactions(data.transactions ?? []);
    } finally { setTxLoading(false); }
  }, [token]);

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/admin/audit-log?limit=50", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAuditLogs(data.logs ?? []);
    } finally { setAuditLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    if (activeTab === "stats") fetchStats();
    else if (activeTab === "users") fetchUsers();
    else if (activeTab === "books") fetchBooks();
    else if (activeTab === "orders") fetchOrders();
    else if (activeTab === "transactions") fetchTransactions();
    else if (activeTab === "audit") fetchAuditLog();
  }, [activeTab, user?.id]);

  async function updateUser(userId: number, changes: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (res.ok) { await fetchUsers(); setEditingUser(null); }
  }

  async function deleteBook(bookId: number) {
    setDeletingBook(bookId);
    try {
      await fetch(`/api/admin/books/${bookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setBooks(b => b.filter(x => x.id !== bookId));
    } finally { setDeletingBook(null); }
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
        <Shield className="w-14 h-14 text-muted" />
        <h2 className="text-xl font-bold">Ruxsat yo'q</h2>
        <p className="text-sm text-muted-foreground">Bu sahifa faqat adminlar uchun</p>
        <button onClick={() => navigate("/")} className="mt-2 text-sm text-primary hover:underline">
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  const TABS: { id: TabId; label: string; icon: typeof BarChart2 }[] = [
    { id: "stats", label: "Statistika", icon: BarChart2 },
    { id: "users", label: "Foydalanuvchilar", icon: Users },
    { id: "books", label: "Kitoblar", icon: BookOpen },
    { id: "orders", label: "Buyurtmalar", icon: ShoppingBag },
    { id: "transactions", label: "Tranzaksiyalar", icon: Clock },
    { id: "audit", label: "Audit", icon: Shield },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Admin panel</h1>
          <p className="text-sm text-muted-foreground">Tizim boshqaruvi</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn("px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all whitespace-nowrap",
              activeTab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ─── STATS TAB ─── */}
      {activeTab === "stats" && (
        <div>
          {statsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Users} label="Foydalanuvchilar" value={stats.users}
                  sub={`${stats.blacklistedUsers} ta bloklangan`} color="bg-blue-50 text-blue-600" />
                <StatCard icon={BookOpen} label="Jami kitoblar" value={stats.books}
                  color="bg-amber-50 text-amber-600" />
                <StatCard icon={Clock} label="Tranzaksiyalar" value={stats.transactions}
                  sub={`${stats.overdueTransactions} ta muddati o'tgan`} color="bg-violet-50 text-violet-600" />
                <StatCard icon={Crown} label="Aktiv obunalar" value={stats.activeSubscriptions}
                  color="bg-teal-50 text-teal-600" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon={ShoppingBag} label="To'langan buyurtmalar" value={stats.paidOrders}
                  color="bg-green-50 text-green-600" />
                <StatCard icon={DollarSign} label="Jami daromad" value={`${stats.revenue.toLocaleString()} so'm`}
                  color="bg-rose-50 text-rose-600" />
              </div>

              {/* Quick actions */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Foydalanuvchilar", tab: "users" as TabId, icon: Users, color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
                  { label: "Kitoblar", tab: "books" as TabId, icon: BookOpen, color: "bg-amber-50 text-amber-600 hover:bg-amber-100" },
                  { label: "Buyurtmalar", tab: "orders" as TabId, icon: ShoppingBag, color: "bg-teal-50 text-teal-600 hover:bg-teal-100" },
                  { label: "Audit jurnal", tab: "audit" as TabId, icon: Shield, color: "bg-violet-50 text-violet-600 hover:bg-violet-100" },
                ].map(({ label, tab, icon: Icon, color }) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border border-transparent transition-colors", color)}>
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">Statistika yuklanmadi</div>
          )}
        </div>
      )}

      {/* ─── USERS TAB ─── */}
      {activeTab === "users" && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchUsers()}
                className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ism, email yoki o'quvchi ID..." />
            </div>
            <button onClick={() => fetchUsers()}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
              Qidirish
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Jami: {users.length} ta</p>
          {usersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <UserRow key={u.id} user={u} isEditing={editingUser === u.id}
                  onEdit={() => setEditingUser(editingUser === u.id ? null : u.id)}
                  onUpdate={(changes) => updateUser(u.id, changes)} />
              ))}
              {users.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-card border border-card-border rounded-2xl">
                  Foydalanuvchilar topilmadi
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── BOOKS TAB ─── */}
      {activeTab === "books" && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchBooks()}
                className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Kitob nomi, muallif, email..." />
            </div>
            <select value={bookStatusFilter} onChange={e => setBookStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none">
              <option value="">Barcha holat</option>
              <option value="available">Mavjud</option>
              <option value="rented">Berilgan</option>
              <option value="reserved">Rezerv</option>
              <option value="sold">Sotilgan</option>
            </select>
            <button onClick={() => fetchBooks()}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
              Qidirish
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Jami: {books.length} ta</p>
          {booksLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kitob</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Turi</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Egasi</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Ko'rishlar</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Sana</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map(b => (
                      <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <Link href={`/books/${b.id}`}>
                            <p className="font-medium hover:text-primary transition-colors line-clamp-1">{b.title}</p>
                          </Link>
                          {b.author && <p className="text-xs text-muted-foreground">{b.author}</p>}
                          {b.price && <p className="text-xs text-primary font-medium">{Number(b.price).toLocaleString()} so'm</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium",
                            BOOK_TYPE_COLORS[b.type] ?? "bg-muted text-muted-foreground border-border")}>
                            {BOOK_TYPE_LABELS[b.type] ?? b.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium">{b.userName ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{b.userEmail ?? ""}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{b.viewCount ?? 0}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                          {formatDateShort(b.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => { if (confirm(`"${b.title}" kitobini o'chirishni tasdiqlaysizmi?`)) deleteBook(b.id); }}
                            disabled={deletingBook === b.id}
                            className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50">
                            {deletingBook === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {books.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">Kitoblar topilmadi</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── ORDERS TAB ─── */}
      {activeTab === "orders" && (
        <div>
          {ordersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Jami", value: orders.length, color: "bg-muted text-muted-foreground" },
                  { label: "To'langan", value: orders.filter(o => o.status === "paid").length, color: "bg-teal-50 text-teal-700" },
                  { label: "Bekor qilingan", value: orders.filter(o => o.status === "cancelled").length, color: "bg-rose-50 text-rose-700" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={cn("rounded-2xl p-4 border border-transparent", color)}>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Xaridor</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kitob</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Yetkazish</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Holat</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-medium text-xs">{o.buyerName ?? "Mehmon"}</p>
                            <p className="text-xs text-muted-foreground">{o.buyerEmail ?? ""}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs line-clamp-1">{o.bookTitle ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{formatDateShort(o.createdAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs px-1.5 py-0.5 rounded-full",
                              o.deliveryType === "delivery" ? "bg-blue-50 text-blue-700" : "bg-muted text-muted-foreground")}>
                              {o.deliveryType === "delivery" ? "Yetkazish" : "O'zim olaman"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium",
                              ORDER_STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground border-border")}>
                              {o.status === "paid" ? "To'langan" : o.status === "cancelled" ? "Bekor" : "Kutilmoqda"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-primary text-xs">
                            {Number(o.amount / 100).toLocaleString()} so'm
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {orders.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">Hali buyurtmalar yo'q</div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TRANSACTIONS TAB ─── */}
      {activeTab === "transactions" && (
        <div>
          {txLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">O'quvchi</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Berilgan</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Muddat</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Holat</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Jarima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium">{tx.borrowerName}</p>
                          {tx.borrowerPhone && <p className="text-xs text-muted-foreground">{tx.borrowerPhone}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateShort(tx.issuedAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateShort(tx.dueDate)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border w-fit",
                            TX_STATUS_COLORS[tx.status] ?? "bg-muted text-muted-foreground border-border")}>
                            {tx.status === "overdue" && <AlertTriangle className="w-3 h-3" />}
                            {tx.status === "returned" && <CheckCircle2 className="w-3 h-3" />}
                            {tx.status === "active" && <Clock className="w-3 h-3" />}
                            {TX_STATUS_LABELS[tx.status] ?? tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tx.fineAmount > 0 ? (
                            <span className="text-rose-600 font-semibold text-xs">{tx.fineAmount.toLocaleString()} so'm</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">Tranzaksiyalar topilmadi</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── AUDIT TAB ─── */}
      {activeTab === "audit" && (
        <div>
          {auditLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map(log => (
                <div key={log.id} className="bg-card border border-card-border rounded-xl p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{log.action}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDateShort(log.createdAt)}</span>
                    </div>
                    {log.entityType && <p className="text-xs text-muted-foreground">{log.entityType} #{log.entityId}</p>}
                    {log.userName && <p className="text-xs text-muted-foreground">Kim: {log.userName}</p>}
                    {log.details && (
                      <p className="text-xs text-muted-foreground font-mono mt-1 bg-muted px-2 py-1 rounded break-all">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-card border border-card-border rounded-2xl">
                  Hali audit yozuvlari yo'q
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
