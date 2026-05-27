import { useState } from "react";
import { Link, useLocation } from "wouter";
import { User, MapPin, Phone, BookOpen, Store, Edit2, Loader2, Plus, LogOut, Check, Heart, Star, BarChart2, CheckCircle2, Clock, Lock, ArrowLeftRight, AlertTriangle, RotateCcw, Trash2, CalendarClock, X, BookMarked, HandshakeIcon, QrCode as QrCodeIcon, ChevronDown, ShoppingBag, Crown } from "lucide-react";
import QrCode from "@/components/QrCode";
import {
  useGetMe, useGetMyBooks, useGetMyStore, useUpdateMe, getGetMeQueryKey,
  useGetMyFavorites, useGetMyTransactions, useReturnTransaction, useDeleteTransaction, getGetMyTransactionsQueryKey,
  useGetMyReservations, useCancelReservation, getGetMyReservationsQueryKey,
  useGetMyBorrowedTransactions, useConfirmTransactionReceipt, getGetMyBorrowedTransactionsQueryKey,
  useExtendTransaction,
} from "@workspace/api-client-react";
import type { Transaction } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import BookCard from "@/components/BookCard";
import { cn, formatDateShort } from "@/lib/utils";

type Tab = "listings" | "favorites" | "transactions" | "reservations" | "borrowed" | "orders";

const ROLE_LABELS: Record<string, string> = {
  user: "Foydalanuvchi",
  seller: "Sotuvchi",
  librarian: "Kutubxonachi",
  moderator: "Moderator",
  admin: "Admin",
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  regular: { label: "Oddiy o'quvchi", color: "bg-muted text-muted-foreground" },
  student: { label: "Talaba / O'quvchi", color: "bg-blue-100 text-blue-700" },
  teacher: { label: "O'qituvchi", color: "bg-violet-100 text-violet-700" },
};

function SubscriptionCard() {
  const token = typeof window !== "undefined" ? localStorage.getItem("mahalla_token") : null;
  const { data, isLoading } = useQuery({
    queryKey: ["my-subscriptions"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/my", { headers: { Authorization: `Bearer ${token}` } });
      return res.json() as Promise<{ subscriptions: any[] }>;
    },
  });
  const active = (data?.subscriptions ?? []).filter((s: any) => s.status === "active");
  if (isLoading || active.length === 0) return null;
  const sub = active[0];
  const daysLeft = Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000));
  const PLAN_LABELS: Record<string, string> = { oylik: "Oylik", yarim_yillik: "Yarim yillik", yillik: "Yillik" };
  return (
    <div className="mb-4 flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
        <Crown className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">{PLAN_LABELS[sub.plan] ?? sub.plan} obuna</p>
        <p className="text-xs text-amber-700">{daysLeft} kun qoldi</p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-semibold shrink-0">Aktiv</span>
    </div>
  );
}

function VirtualIdCard({ user }: { user: { name: string; readerId?: string; email: string; role: string; category?: string } }) {
  const [show, setShow] = useState(false);
  const qrValue = `mahalla-kutubxona:reader:${user.readerId}`;
  const cat = CATEGORY_LABELS[user.category ?? "regular"] ?? CATEGORY_LABELS.regular;
  return (
    <div className="mb-5">
      <button onClick={() => setShow(s => !s)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm hover:border-amber-300 transition-colors group">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <QrCodeIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-amber-900">Virtual ID karta</p>
            <p className="text-xs text-amber-700">Reader ID: {user.readerId}</p>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-amber-600 transition-transform", show ? "rotate-180" : "")} />
      </button>
      {show && (
        <div className="mt-2 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-amber-100">
              <QrCode value={qrValue} size={140} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg font-bold text-amber-900">{user.name}</p>
              <p className="text-sm text-amber-700 mt-0.5">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                  ID: {user.readerId}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-3 max-w-[200px]">
                Bu QR kodni kutubxonachiga ko'rsating — kitob olish jarayonini tezlashtiradi
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BorrowedTxCard({ tx, onConfirmReceipt, isConfirming }: {
  tx: Transaction;
  onConfirmReceipt: (id: number) => void;
  isConfirming: boolean;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: extendTx, isPending: isExtending } = useExtendTransaction();
  const [showExtend, setShowExtend] = useState(false);
  const [extendDate, setExtendDate] = useState("");
  const [extendErr, setExtendErr] = useState("");

  const due = new Date(tx.dueDate);
  const now = new Date();
  const isOverdue = tx.status === "overdue";
  const isReturned = tx.status === "returned";
  const daysLeft = !isReturned ? Math.ceil((due.getTime() - now.getTime()) / 86400000) : null;
  const hasConfirmed = !!(tx as any).borrowerConfirmedAt;

  async function handleExtend() {
    if (!extendDate) return;
    setExtendErr("");
    try {
      await extendTx({ transactionId: tx.id, data: { newDueDate: new Date(extendDate).toISOString() } } as any);
      queryClient.invalidateQueries({ queryKey: getGetMyBorrowedTransactionsQueryKey() });
      setShowExtend(false);
      setExtendDate("");
    } catch {
      setExtendErr("Xatolik yuz berdi");
    }
  }

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-xl border", isOverdue ? "bg-rose-50/50 border-rose-200" : isReturned ? "bg-teal-50/50 border-teal-200" : "bg-blue-50/50 border-blue-200")}>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", isOverdue ? "bg-rose-100" : isReturned ? "bg-teal-100" : "bg-blue-100")}>
        {isOverdue ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : isReturned ? <CheckCircle2 className="w-4 h-4 text-teal-600" /> : <BookMarked className="w-4 h-4 text-blue-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{tx.bookTitle ?? "Kitob"}</p>
        <p className="text-xs text-muted-foreground">{(tx as any).borrowerUser?.name ?? tx.borrowerName}</p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <span className="text-xs text-muted-foreground">Berildi: {formatDateShort(tx.issuedAt)}</span>
          <span className={cn("text-xs font-medium", isOverdue ? "text-rose-600" : isReturned ? "text-teal-600" : "text-blue-600")}>
            {isReturned ? `Qaytarildi: ${formatDateShort(tx.returnedAt!)}` : `Muddat: ${formatDateShort(tx.dueDate)}`}
          </span>
          {!isReturned && daysLeft !== null && (
            <span className={cn("text-xs font-bold", isOverdue ? "text-rose-600" : daysLeft <= 2 ? "text-orange-600" : "text-blue-600")}>
              {isOverdue ? `${Math.abs(daysLeft)} kun kech` : daysLeft === 0 ? "Bugun!" : `${daysLeft} kun qoldi`}
            </span>
          )}
        </div>
        {!isReturned && !hasConfirmed && (
          <button onClick={() => onConfirmReceipt(tx.id)} disabled={isConfirming}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
            <HandshakeIcon className="w-3 h-3" /> Kitobni qabul qildim
          </button>
        )}
        {!isReturned && hasConfirmed && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2 py-1 rounded-lg">
              <CheckCircle2 className="w-3 h-3" /> Qabul qilindi
            </span>
            <button onClick={() => setShowExtend(v => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
              <CalendarClock className="w-3 h-3" /> Muddatni uzaytirish
            </button>
          </div>
        )}
        {!isReturned && hasConfirmed && showExtend && (
          <div className="mt-2 p-3 bg-background border border-border rounded-xl space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">Yangi muddat *</label>
            <input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {extendErr && <p className="text-xs text-destructive">{extendErr}</p>}
            <div className="flex gap-2">
              <button onClick={handleExtend} disabled={isExtending || !extendDate}
                className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1">
                {isExtending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Saqlash
              </button>
              <button onClick={() => { setShowExtend(false); setExtendDate(""); }}
                className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
                Bekor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TxCard({ tx, onReturn, onDelete, isReturning }: {
  tx: Transaction;
  onReturn: (id: number) => void;
  onDelete: (id: number) => void;
  isReturning: boolean;
}) {
  const due = new Date(tx.dueDate);
  const issued = new Date(tx.issuedAt);
  const now = new Date();
  const isOverdue = tx.status === "overdue";
  const isReturned = tx.status === "returned";
  const daysLeft = !isReturned ? Math.ceil((due.getTime() - now.getTime()) / 86400000) : null;

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-xl border", isOverdue ? "bg-rose-50/50 border-rose-200" : isReturned ? "bg-teal-50/50 border-teal-200" : "bg-blue-50/50 border-blue-200")}>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", isOverdue ? "bg-rose-100" : isReturned ? "bg-teal-100" : "bg-blue-100")}>
        {isOverdue ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : isReturned ? <CheckCircle2 className="w-4 h-4 text-teal-600" /> : <Clock className="w-4 h-4 text-blue-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground truncate">{tx.bookTitle ?? "Kitob"}</p>
            <p className="text-xs text-muted-foreground">{tx.borrowerName}{tx.borrowerPhone ? ` · ${tx.borrowerPhone}` : ""}</p>
          </div>
          <button onClick={() => onDelete(tx.id)} className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <span className="text-xs text-muted-foreground">Berildi: {formatDateShort(tx.issuedAt)}</span>
          <span className={cn("text-xs font-medium", isOverdue ? "text-rose-600" : isReturned ? "text-teal-600" : "text-blue-600")}>
            {isReturned ? `Qaytarildi: ${formatDateShort(tx.returnedAt!)}` : `Muddat: ${formatDateShort(tx.dueDate)}`}
          </span>
          {!isReturned && daysLeft !== null && (
            <span className={cn("text-xs font-bold", isOverdue ? "text-rose-600" : daysLeft <= 2 ? "text-orange-600" : "text-blue-600")}>
              {isOverdue ? `${Math.abs(daysLeft)} kun kech` : daysLeft === 0 ? "Bugun!" : `${daysLeft} kun qoldi`}
            </span>
          )}
          {isReturned && tx.fineAmount > 0 && (
            <span className="text-xs font-bold text-rose-600">Jarima: {tx.fineAmount.toLocaleString()} so'm</span>
          )}
        </div>
        {!isReturned && (
          <button onClick={() => onReturn(tx.id)} disabled={isReturning}
            className={cn("mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors", isOverdue ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-blue-600 text-white hover:bg-blue-700", "disabled:opacity-60")}>
            <RotateCcw className="w-3 h-3" /> Qaytarildi deb belgilash
          </button>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const [, navigate] = useLocation();
  const { isAuthenticated, logout, token } = useAuth();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe({ query: { enabled: !!token } } as any);
  const { data: myBooks } = useGetMyBooks({ query: { enabled: !!token } } as any);
  const { data: myFavorites } = useGetMyFavorites({ query: { enabled: !!token } } as any);
  const { data: myStore } = useGetMyStore({ query: { enabled: !!token } } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: myTxs, isLoading: txLoading } = useGetMyTransactions({}, { query: { enabled: !!token } as any });
  const { data: myReservations } = useGetMyReservations({ query: { enabled: !!token } } as any);
  const { mutateAsync: returnTx, isPending: isReturning } = useReturnTransaction();
  const { mutateAsync: deleteTx } = useDeleteTransaction();
  const { mutateAsync: cancelReservation } = useCancelReservation();
  const { mutateAsync: updateMe, isPending: isUpdating } = useUpdateMe();
  const { data: borrowedTxs, isLoading: borrowedLoading } = useGetMyBorrowedTransactions({ query: { enabled: !!token } } as any);
  const { mutateAsync: confirmReceipt, isPending: isConfirming } = useConfirmTransactionReceipt();
  const { data: myOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["myOrders"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/payments/orders/my", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ orders: any[] }>;
    },
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [savedLat, setSavedLat] = useState<number | null>(null);
  const [savedLng, setSavedLng] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("listings");

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <User className="w-16 h-16 text-muted mb-4" />
        <h2 className="text-xl font-bold">Profil ko'rish uchun kiring</h2>
        <Link href="/login"><button className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Kirish</button></Link>
      </div>
    );
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  function startEdit() {
    setForm({ name: user?.name ?? "", phone: user?.phone ?? "", address: user?.address ?? "" });
    setSavedLat(user?.lat ?? null);
    setSavedLng(user?.lng ?? null);
    setEditing(true);
  }

  function getMyLocation() {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setSavedLat(pos.coords.latitude); setSavedLng(pos.coords.longitude); setGettingLocation(false); },
      () => setGettingLocation(false)
    );
  }

  async function handleSave() {
    await updateMe({ data: { name: form.name, phone: form.phone || undefined, address: form.address || undefined, lat: savedLat ?? undefined, lng: savedLng ?? undefined } });
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setEditing(false);
  }

  // Stats calculation
  const booksArr = myBooks?.books ?? [];
  const favsArr = myFavorites?.books ?? [];
  const sellCount = booksArr.filter(b => b.type === "sell").length;
  const freeCount = booksArr.filter(b => b.type === "free").length;
  const rentCount = booksArr.filter(b => b.type === "rent").length;
  const rentedOut = booksArr.filter(b => (b as any).status === "rented").length;
  const totalReviews = booksArr.reduce((s, b) => s + ((b as any).reviewCount ?? 0), 0);

  const txArr = myTxs?.transactions ?? [];
  const activeTxs = txArr.filter(t => t.status === "active");
  const overdueTxs = txArr.filter(t => t.status === "overdue");
  const returnedTxs = txArr.filter(t => t.status === "returned");
  const reservArr = (myReservations as any)?.reservations ?? [];
  const waitingReservations = reservArr.filter((r: any) => r.status === "waiting");

  const borrowedArr = borrowedTxs?.transactions ?? [];
  const unconfirmedBorrowed = borrowedArr.filter((t: any) => t.status !== "returned" && !t.borrowerConfirmedAt);

  async function handleConfirmReceipt(txId: number) {
    await confirmReceipt({ transactionId: txId });
    queryClient.invalidateQueries({ queryKey: getGetMyBorrowedTransactionsQueryKey() });
  }

  async function handleReturn(txId: number) {
    await returnTx({ transactionId: txId });
    queryClient.invalidateQueries({ queryKey: getGetMyTransactionsQueryKey() });
  }

  async function handleDeleteTx(txId: number) {
    await deleteTx({ transactionId: txId });
    queryClient.invalidateQueries({ queryKey: getGetMyTransactionsQueryKey() });
  }

  async function handleCancelReservation(id: number) {
    await cancelReservation({ id });
    queryClient.invalidateQueries({ queryKey: getGetMyReservationsQueryKey() });
  }

  const statsItems = [
    { icon: BookOpen, label: "Jami e'lon", value: booksArr.length, color: "text-primary bg-primary/10" },
    { icon: Heart, label: "Saqlangan", value: favsArr.length, color: "text-rose-500 bg-rose-50" },
    { icon: ArrowLeftRight, label: "Aktiv tranzaksiya", value: activeTxs.length + overdueTxs.length, color: "text-blue-600 bg-blue-50" },
    { icon: CalendarClock, label: "Rezervlar", value: waitingReservations.length, color: waitingReservations.length > 0 ? "text-orange-600 bg-orange-50" : "text-muted-foreground bg-muted" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile card */}
      <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm mb-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full text-lg font-bold bg-background border border-input rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              ) : (
                <h1 className="text-lg font-bold text-foreground truncate">{user?.name}</h1>
              )}
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{user?.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {ROLE_LABELS[user?.role ?? "user"]}
                </span>
                {(user as any)?.readerId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono border border-border">
                    ID: {(user as any).readerId}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <button onClick={handleSave} disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Saqlash
              </button>
            ) : (
              <button onClick={startEdit}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Edit2 className="w-4 h-4" /> Tahrirlash
              </button>
            )}
            <button onClick={() => { logout(); navigate("/"); }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border border-destructive/30 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors">
              <LogOut className="w-4 h-4" /> Chiqish
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {editing ? (
            <>
              <div className="flex gap-2 items-center">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Telefon raqami" className="flex-1 px-3 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex gap-2 items-center">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Manzil" className="flex-1 px-3 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button type="button" onClick={getMyLocation} disabled={gettingLocation}
                  className="px-2.5 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-50">
                  {gettingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedLat ? "GPS OK" : "GPS"}
                </button>
              </div>
            </>
          ) : (
            <>
              {user?.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-4 h-4" />{user.phone}</div>}
              {user?.address && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" />{user.address}</div>}
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statsItems.map(s => (
          <div key={s.label} className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Book type breakdown */}
      {booksArr.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">E'lonlar taqsimoti</h3>
          </div>
          <div className="flex gap-3 flex-wrap">
            {sellCount > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium border border-amber-200">{sellCount} ta sotiladi</span>}
            {freeCount > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 font-medium border border-teal-200">{freeCount} ta bepul</span>}
            {rentCount > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium border border-blue-200">{rentCount} ta ijaraga</span>}
            {rentedOut > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium border border-violet-200">{rentedOut} ta berilgan</span>}
          </div>
        </div>
      )}

      {/* Store section */}
      <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-2"><Store className="w-4 h-4 text-primary" /> Mening kutubxonam</h2>
        </div>
        {myStore ? (
          <Link href={`/stores/${myStore.id}`}>
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Store className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-semibold text-primary text-sm">{myStore.name}</p>
                <p className="text-xs text-muted-foreground">{myStore.address}</p>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/stores/new">
            <button className="flex items-center gap-2 border border-dashed border-primary/40 text-primary px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary/5 transition-colors w-full justify-center">
              <Plus className="w-4 h-4" /> Kutubxona ochish
            </button>
          </Link>
        )}
      </div>

      {/* Virtual ID Card */}
      {(user as any)?.readerId && (
        <VirtualIdCard user={user as any} />
      )}

      {/* Subscription status card */}
      <SubscriptionCard />

      {/* Analytics link */}
      <Link href="/analytics">
        <div className="mb-4 flex items-center justify-between p-4 bg-card border border-card-border rounded-2xl shadow-sm hover:border-primary/30 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Statistika va analitika</p>
              <p className="text-xs text-muted-foreground">Eng faol kitoblar, qarzdorlar, oylik faollik</p>
            </div>
          </div>
          <span className="text-xs text-primary font-medium group-hover:underline">Ko'rish →</span>
        </div>
      </Link>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5 overflow-x-auto">
        <button onClick={() => setActiveTab("listings")}
          className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap", activeTab === "listings" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
          <BookOpen className="w-4 h-4 inline mr-1.5" />E'lonlarim ({booksArr.length})
        </button>
        <button onClick={() => setActiveTab("favorites")}
          className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap", activeTab === "favorites" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
          <Heart className="w-4 h-4 inline mr-1.5" />Saqlangan ({favsArr.length})
        </button>
        <button onClick={() => setActiveTab("transactions")}
          className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap relative", activeTab === "transactions" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
          <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />Tranzaksiyalar ({txArr.length})
          {overdueTxs.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold">{overdueTxs.length}</span>}
        </button>
        <button onClick={() => setActiveTab("reservations")}
          className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap relative", activeTab === "reservations" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
          <CalendarClock className="w-4 h-4 inline mr-1.5" />Rezervlar ({reservArr.length})
          {waitingReservations.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">{waitingReservations.length}</span>}
        </button>
        <button onClick={() => setActiveTab("borrowed")}
          className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap relative", activeTab === "borrowed" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
          <BookMarked className="w-4 h-4 inline mr-1.5" />Olingan ({borrowedArr.length})
          {unconfirmedBorrowed.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">{unconfirmedBorrowed.length}</span>}
        </button>
        <button onClick={() => setActiveTab("orders")}
          className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap", activeTab === "orders" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
          <ShoppingBag className="w-4 h-4 inline mr-1.5" />Xaridlarim ({(myOrders?.orders ?? []).length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "listings" ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Mening e'lonlarim</h2>
            <Link href="/books/new">
              <button className="flex items-center gap-1.5 text-sm text-primary hover:underline"><Plus className="w-4 h-4" /> E'lon berish</button>
            </Link>
          </div>
          {booksArr.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {booksArr.map(book => <BookCard key={book.id} book={book} />)}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-card-border rounded-2xl">
              <BookOpen className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Hali e'lon berilmagan</p>
              <Link href="/books/new">
                <button className="mt-3 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity mx-auto">
                  <Plus className="w-4 h-4" /> Birinchi e'lon
                </button>
              </Link>
            </div>
          )}
        </div>
      ) : activeTab === "favorites" ? (
        <div>
          <h2 className="text-base font-bold mb-4">Saqlangan kitoblar</h2>
          {favsArr.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {favsArr.map(book => <BookCard key={book.id} book={book} />)}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-card-border rounded-2xl">
              <Heart className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Hali saqlangan kitob yo'q</p>
              <p className="text-xs text-muted-foreground mt-1">Kitob sahifasida ❤️ bosing</p>
            </div>
          )}
        </div>
      ) : activeTab === "reservations" ? (
        <div>
          <h2 className="text-base font-bold mb-4">Mening rezervlarim</h2>
          {reservArr.length === 0 ? (
            <div className="text-center py-12 bg-card border border-card-border rounded-2xl">
              <CalendarClock className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Hali rezerv qilingan kitob yo'q</p>
              <p className="text-xs text-muted-foreground mt-1">Ijarada bo'lgan kitobda "Navbatga qo'yilish" tugmasini bosing</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reservArr.map((r: any) => (
                <div key={r.id} className={cn("flex items-start gap-3 p-3.5 rounded-2xl border bg-card shadow-sm",
                  r.status === "waiting" ? "border-orange-200 bg-orange-50/30" : "border-border opacity-70"
                )}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    r.status === "waiting" ? "bg-orange-100" : "bg-teal-100"
                  )}>
                    <CalendarClock className={cn("w-4 h-4", r.status === "waiting" ? "text-orange-600" : "text-teal-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{r.bookTitle ?? (r.bookId ? `Kitob #${r.bookId}` : `Do'kon kitob #${r.storeBookId}`)}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                        r.status === "waiting" ? "bg-orange-100 text-orange-700" : "bg-teal-100 text-teal-700"
                      )}>
                        {r.status === "waiting" ? "Kutmoqda" : r.status === "ready" ? "Tayyor" : r.status === "expired" ? "Muddati o'tdi" : "Bekor qilindi"}
                      </span>
                      <span className="text-xs text-muted-foreground">Qo'shildi: {formatDateShort(r.createdAt)}</span>
                    </div>
                  </div>
                  {r.status === "waiting" && (
                    <button onClick={() => handleCancelReservation(r.id)}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Bekor qilish">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "orders" ? (
        <div>
          <h2 className="text-base font-bold mb-4">Xaridlarim</h2>
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (myOrders?.orders ?? []).length === 0 ? (
            <div className="text-center py-12 bg-card border border-card-border rounded-2xl">
              <ShoppingBag className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Hali xarid qilinmagan</p>
              <p className="text-xs text-muted-foreground mt-1">Kitob sahifasida "Sotib olish" tugmasini bosing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(myOrders?.orders ?? []).map((order: any) => {
                const STATUS_CFG: Record<string, { label: string; color: string }> = {
                  pending:    { label: "Kutmoqda",    color: "bg-orange-100 text-orange-700 border-orange-200" },
                  processing: { label: "Jarayonda",   color: "bg-blue-100 text-blue-700 border-blue-200" },
                  paid:       { label: "To'landi",    color: "bg-teal-100 text-teal-700 border-teal-200" },
                  cancelled:  { label: "Bekor qilindi", color: "bg-muted text-muted-foreground border-border" },
                };
                const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
                return (
                  <div key={order.id} className="flex items-center gap-3 p-3.5 bg-card border border-card-border rounded-2xl shadow-sm">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", order.status === "paid" ? "bg-teal-100" : "bg-muted")}>
                      <ShoppingBag className={cn("w-4 h-4", order.status === "paid" ? "text-teal-600" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{order.book?.title ?? `Buyurtma #${order.id}`}</p>
                      {order.book?.author && <p className="text-xs text-muted-foreground">{order.book.author}</p>}
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", cfg.color)}>{cfg.label}</span>
                        <span className="text-xs text-muted-foreground">{formatDateShort(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{(order.amount / 100).toLocaleString()} so'm</p>
                      <p className="text-xs text-muted-foreground">#{order.id}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "borrowed" ? (
        <div>
          <h2 className="text-base font-bold mb-4">Olingan kitoblar</h2>
          {borrowedLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : borrowedArr.length === 0 ? (
            <div className="text-center py-12 bg-card border border-card-border rounded-2xl">
              <BookMarked className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Hali olingan kitob yo'q</p>
              <p className="text-xs text-muted-foreground mt-1">Kutubxonadan kitob olganda bu yerda ko'rinadi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unconfirmedBorrowed.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <HandshakeIcon className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-blue-700">Tasdiqlash kerak ({unconfirmedBorrowed.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {unconfirmedBorrowed.map((tx: any) => (
                      <BorrowedTxCard key={tx.id} tx={tx} onConfirmReceipt={handleConfirmReceipt} isConfirming={isConfirming} />
                    ))}
                  </div>
                </div>
              )}
              {borrowedArr.filter((t: any) => t.status !== "returned" && t.borrowerConfirmedAt).length > 0 && (
                <div className="bg-card border border-card-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-blue-700">Qo'limda ({borrowedArr.filter((t: any) => t.status !== "returned" && t.borrowerConfirmedAt).length})</h3>
                  </div>
                  <div className="space-y-2">
                    {borrowedArr.filter((t: any) => t.status !== "returned" && t.borrowerConfirmedAt).map((tx: any) => (
                      <BorrowedTxCard key={tx.id} tx={tx} onConfirmReceipt={handleConfirmReceipt} isConfirming={isConfirming} />
                    ))}
                  </div>
                </div>
              )}
              {borrowedArr.filter((t: any) => t.status === "returned").length > 0 && (
                <div className="bg-card border border-card-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-bold text-teal-700">Qaytarilgan ({borrowedArr.filter((t: any) => t.status === "returned").length})</h3>
                  </div>
                  <div className="space-y-2">
                    {borrowedArr.filter((t: any) => t.status === "returned").map((tx: any) => (
                      <BorrowedTxCard key={tx.id} tx={tx} onConfirmReceipt={handleConfirmReceipt} isConfirming={isConfirming} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-base font-bold mb-4">Kitob berish tarixi</h2>
          {txLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : txArr.length === 0 ? (
            <div className="text-center py-12 bg-card border border-card-border rounded-2xl">
              <ArrowLeftRight className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Hali kitob berilmagan</p>
              <p className="text-xs text-muted-foreground mt-1">Kitob sahifasida "Kitob berish" tugmasini bosing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Overdue */}
              {overdueTxs.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h3 className="text-sm font-bold text-rose-700">Muddati o'tgan ({overdueTxs.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {overdueTxs.map(tx => <TxCard key={tx.id} tx={tx} onReturn={handleReturn} onDelete={handleDeleteTx} isReturning={isReturning} />)}
                  </div>
                </div>
              )}
              {/* Active */}
              {activeTxs.length > 0 && (
                <div className="bg-card border border-card-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-blue-700">Hozir berilgan ({activeTxs.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {activeTxs.map(tx => <TxCard key={tx.id} tx={tx} onReturn={handleReturn} onDelete={handleDeleteTx} isReturning={isReturning} />)}
                  </div>
                </div>
              )}
              {/* Returned */}
              {returnedTxs.length > 0 && (
                <div className="bg-card border border-card-border rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-bold text-teal-700">Qaytarilgan ({returnedTxs.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {returnedTxs.map(tx => <TxCard key={tx.id} tx={tx} onReturn={handleReturn} onDelete={handleDeleteTx} isReturning={isReturning} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
