import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Users, Loader2, Phone, QrCode, AlertTriangle, GraduationCap, BookOpen, CheckCircle2, Search, X } from "lucide-react";
import { useGetStore } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, getToken } from "@/lib/auth";
import { cn, formatDateShort } from "@/lib/utils";
import { exportCsv } from "@/lib/exportCsv";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  regular: { label: "Oddiy", color: "bg-muted text-muted-foreground border-border", icon: Users },
  student: { label: "Talaba", color: "bg-blue-100 text-blue-700 border-blue-200", icon: GraduationCap },
  teacher: { label: "O'qituvchi", color: "bg-violet-100 text-violet-700 border-violet-200", icon: BookOpen },
};

type Reader = {
  userId: number;
  name: string;
  readerId?: string;
  phone?: string;
  avatar?: string;
  category: string;
  isBlacklisted: string;
  lastBorrowedAt?: string;
  activeLoanCount: number;
};

async function fetchReaders(storeId: number, token: string | null): Promise<{ readers: Reader[]; total: number }> {
  const res = await fetch(`/api/stores/${storeId}/readers`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Xatolik");
  return res.json();
}

async function updateUserCategory(userId: number, data: { category?: string; isBlacklisted?: boolean }, token: string | null) {
  const res = await fetch(`/api/users/${userId}/category`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Xatolik");
  return res.json();
}

export default function StoreReaders() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const storeId = parseInt(id);
  const token = typeof window !== "undefined" ? localStorage.getItem("mahalla_token") : null;
  const { data: store } = useGetStore(storeId);
  const { data, isLoading } = useQuery({
    queryKey: ["storeReaders", storeId],
    queryFn: () => fetchReaders(storeId, token),
    enabled: !!token,
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [blacklistFilter, setBlacklistFilter] = useState<"all" | "blacklisted" | "active">("all");

  const updateMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: number; updates: { category?: string; isBlacklisted?: boolean } }) =>
      updateUserCategory(userId, updates, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storeReaders", storeId] });
    },
  });

  if (store && user?.id !== store.ownerId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold">Ruxsat yo'q</h2>
      </div>
    );
  }

  const allReaders = data?.readers ?? [];
  const filtered = allReaders.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || (r.readerId ?? "").includes(q) || (r.phone ?? "").includes(q);
    const matchCat = categoryFilter === "all" || r.category === categoryFilter;
    const blk = (r.isBlacklisted as any) === true || (r.isBlacklisted as any) === "true";
    const matchBlacklist = blacklistFilter === "all"
      || (blacklistFilter === "blacklisted" && blk)
      || (blacklistFilter === "active" && !blk);
    return matchSearch && matchCat && matchBlacklist;
  });

  function handleExport() {
    exportCsv(
      `o-quvchilar-${storeId}.csv`,
      filtered.map(r => ({
        "Ism": r.name,
        "Reader ID": r.readerId ?? "",
        "Telefon": r.phone ?? "",
        "Kategoriya": CATEGORY_CONFIG[r.category]?.label ?? r.category,
        "Qora ro'yxat": (r.isBlacklisted as any) === true || (r.isBlacklisted as any) === "true" ? "Ha" : "Yo'q",
        "Aktiv ijaralar": r.activeLoanCount,
        "Oxirgi ijara": r.lastBorrowedAt ? formatDateShort(r.lastBorrowedAt) : "",
      }))
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(`/stores/${storeId}`)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">O'quvchilar ro'yxati</h1>
            {store && <p className="text-sm text-muted-foreground">{store.name}</p>}
          </div>
        </div>
        {filtered.length > 0 && (
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Ism, Reader ID yoki telefon..." />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        {/* Category filter */}
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "all", label: "Barchasi" },
            { key: "regular", label: "Oddiy" },
            { key: "student", label: "Talaba" },
            { key: "teacher", label: "O'qituvchi" },
          ].map(f => (
            <button key={f.key} onClick={() => setCategoryFilter(f.key)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                categoryFilter === f.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              {f.label}
            </button>
          ))}
          <span className="w-px bg-border mx-1" />
          {[
            { key: "all", label: "Hammasi" },
            { key: "active", label: "Faol" },
            { key: "blacklisted", label: "Qora ro'yxat" },
          ].map(f => (
            <button key={f.key} onClick={() => setBlacklistFilter(f.key as any)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                blacklistFilter === f.key
                  ? f.key === "blacklisted" ? "bg-rose-600 text-white border-rose-600" : "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl">
          <Users className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {allReaders.length === 0 ? "Hali hech kim kitob olmagan" : "Qidiruv natijasi topilmadi"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">{filtered.length} ta o'quvchi</p>
          {filtered.map(reader => {
            const cat = CATEGORY_CONFIG[reader.category] ?? CATEGORY_CONFIG.regular;
            const isBlacklisted = (reader.isBlacklisted as any) === true || (reader.isBlacklisted as any) === "true";
            const CatIcon = cat.icon;
            return (
              <div key={reader.userId}
                className={cn("bg-card border rounded-2xl p-4 shadow-sm flex items-start gap-3 transition-colors",
                  isBlacklisted ? "border-rose-200 bg-rose-50/30" : "border-card-border")}>
                {/* Avatar */}
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold",
                  isBlacklisted ? "bg-rose-100 text-rose-600" : "bg-primary/10 text-primary")}>
                  {reader.avatar
                    ? <img src={reader.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
                    : reader.name.charAt(0).toUpperCase()
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{reader.name}</p>
                      {reader.readerId && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                          <QrCode className="w-3 h-3" /> {reader.readerId}
                        </p>
                      )}
                    </div>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border flex items-center gap-1", cat.color)}>
                        <CatIcon className="w-3 h-3" />{cat.label}
                      </span>
                      {isBlacklisted && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Qora ro'yxat
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    {reader.phone && (
                      <a href={`tel:${reader.phone}`} className="flex items-center gap-1 hover:text-primary">
                        <Phone className="w-3 h-3" />{reader.phone}
                      </a>
                    )}
                    {reader.activeLoanCount > 0 && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <BookOpen className="w-3 h-3" />{reader.activeLoanCount} aktiv ijara
                      </span>
                    )}
                    {reader.lastBorrowedAt && (
                      <span>Oxirgi: {formatDateShort(reader.lastBorrowedAt)}</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {/* Category selector */}
                    <select
                      value={reader.category}
                      onChange={e => updateMutation.mutate({ userId: reader.userId, updates: { category: e.target.value } })}
                      className="text-xs px-2 py-1 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
                    >
                      <option value="regular">Oddiy</option>
                      <option value="student">Talaba</option>
                      <option value="teacher">O'qituvchi</option>
                    </select>
                    {/* Blacklist toggle */}
                    <button
                      onClick={() => updateMutation.mutate({ userId: reader.userId, updates: { isBlacklisted: !isBlacklisted } })}
                      disabled={updateMutation.isPending}
                      className={cn("text-xs px-3 py-1 rounded-lg border font-medium transition-all disabled:opacity-60 flex items-center gap-1",
                        isBlacklisted
                          ? "border-teal-300 text-teal-700 hover:bg-teal-50"
                          : "border-rose-300 text-rose-700 hover:bg-rose-50"
                      )}>
                      {isBlacklisted ? <><CheckCircle2 className="w-3 h-3" /> Ro'yxatdan chiqarish</> : <><AlertTriangle className="w-3 h-3" /> Qora ro'yxatga qo'shish</>}
                    </button>
                    {reader.phone && (
                      <a href={`tel:${reader.phone}`}
                        className="text-xs px-3 py-1 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Qo'ngiroq
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
