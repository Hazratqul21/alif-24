import { Link, useLocation } from "wouter";
import { Bell, BellOff, Loader2, CheckCheck, ArrowLeft, Send, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatDateShort } from "@/lib/utils";
import { useState } from "react";

const TYPE_ICON: Record<string, string> = {
  bulk: "📢", reservation: "📚", transaction: "📖", info: "ℹ️", system: "⚙️",
};

export default function NotificationsPage() {
  const { token, isAuthenticated, user } = useAuth();
  const qc = useQueryClient();
  const role = (user as any)?.role as string;
  const isStaff = role === "admin" || role === "moderator";
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkLink, setBulkLink] = useState("");
  const [bulkSent, setBulkSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    enabled: isAuthenticated && !!token,
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("error");
      return res.json() as Promise<{ notifications: any[]; unreadCount: number }>;
    },
  });

  const readAll = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readOne = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const bulkSend = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ title: bulkTitle, body: bulkBody || undefined, link: bulkLink || undefined }),
      });
      if (!res.ok) throw new Error("error");
      return res.json();
    },
    onSuccess: () => { setBulkSent(true); setBulkTitle(""); setBulkBody(""); setBulkLink(""); },
  });

  const notifications: any[] = data?.notifications ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-muted"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-xl font-bold flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />Bildirishnomalar</h1>
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="px-2 py-0.5 bg-primary text-white rounded-full text-xs font-bold">{data?.unreadCount}</span>
          )}
        </div>
        {(data?.unreadCount ?? 0) > 0 && (
          <button onClick={() => readAll.mutate()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted">
            <CheckCheck className="w-3.5 h-3.5" />Barchasini o'qildi
          </button>
        )}
      </div>

      {/* Bulk send (admin/moderator only) */}
      {isStaff && (
        <div className="mb-5 p-4 bg-card border border-card-border rounded-2xl">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Barcha foydalanuvchilarga xabar</h2>
          {bulkSent && <div className="mb-3 p-2 bg-teal-50 border border-teal-200 rounded-lg text-teal-700 text-xs">Xabar yuborildi!</div>}
          <div className="space-y-2">
            <input value={bulkTitle} onChange={e => setBulkTitle(e.target.value)} placeholder="Sarlavha *"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background outline-none focus:border-primary" />
            <textarea value={bulkBody} onChange={e => setBulkBody(e.target.value)} placeholder="Matn (ixtiyoriy)"
              rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background outline-none focus:border-primary resize-none" />
            <input value={bulkLink} onChange={e => setBulkLink(e.target.value)} placeholder="Havola (ixtiyoriy, masalan: /books/5)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background outline-none focus:border-primary" />
            <button onClick={() => bulkSend.mutate()} disabled={!bulkTitle.trim() || bulkSend.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {bulkSend.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Yuborish
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl">
          <BellOff className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Hali bildirishnoma yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div key={n.id} onClick={() => { if (!n.readAt) readOne.mutate(n.id); if (n.link) window.location.href = n.link; }}
              className={cn("flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer",
                n.readAt ? "bg-card border-border opacity-75" : "bg-primary/5 border-primary/20 hover:bg-primary/10")}>
              <span className="text-xl shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", !n.readAt && "font-semibold")}>{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                <p className="text-xs text-muted-foreground mt-1">{formatDateShort(n.createdAt)}</p>
              </div>
              {!n.readAt && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
