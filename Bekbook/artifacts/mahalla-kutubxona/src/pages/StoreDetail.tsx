import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, MapPin, Phone, Clock, Store, BookOpen, Plus, Trash2, Loader2, X, ChevronLeft, ChevronRight, CheckCircle2, Lock, HandshakeIcon, Calendar, ArrowLeftRight, AlertTriangle, RotateCcw, Search, UserCheck, User, FileText, Download, CalendarClock, QrCode, Pencil, TrendingUp, TrendingDown, Crown, Upload } from "lucide-react";
import { useGetStore, useListStoreBooks, useDeleteStoreBook, getListStoreBooksQueryKey, useCreateTransaction, getGetMyTransactionsQueryKey, useGetMyTransactions, useReturnTransaction, useDeleteTransaction, useSearchUsers, useExtendTransaction, useUpdateStore, useDeleteStore, getGetStoreQueryKey } from "@workspace/api-client-react";
import type { StoreBook, UserSearchResult } from "@workspace/api-client-react";
import { exportCsv } from "@/lib/exportCsv";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatPrice, cn, formatDateShort } from "@/lib/utils";
import { useState, lazy, Suspense, useRef } from "react";
const QrCodeDisplay = lazy(() => import("@/components/QrCode"));

async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("mahalla_token");
  const form = new FormData();
  form.append("images", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Rasmni yuklashda xatolik");
  const data = await res.json();
  return data.urls[0];
}


const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  sell: { label: "Sotiladi", color: "bg-amber-100 text-amber-700 border-amber-200" },
  free: { label: "Bepul", color: "bg-teal-100 text-teal-700 border-teal-200" },
  rent: { label: "Vaqtincha", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  available: { label: "Mavjud", color: "bg-teal-100 text-teal-700 border-teal-200", icon: CheckCircle2 },
  reserved: { label: "Band", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock },
  rented: { label: "Berildi", color: "bg-rose-100 text-rose-700 border-rose-200", icon: Lock },
};


function StoreBookDetailModal({ book, isOwner, onClose, onDelete, onLent, onEdit }: {
  book: StoreBook & { type?: string; status?: string; rentDuration?: number | null; rentedCount?: number; availableCount?: number; previousPrice?: number | null };
  isOwner: boolean;
  onClose: () => void;
  onDelete: (id: number) => void;
  onLent?: () => void;
  onEdit?: () => void;
}) {
  const queryClient = useQueryClient();
  const [imgIdx, setImgIdx] = useState(0);
  const [showLend, setShowLend] = useState(false);
  const [lendForm, setLendForm] = useState({ borrowerName: "", borrowerPhone: "", dueDate: "", finePerDay: "" });
  const [lendError, setLendError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBorrower, setSelectedBorrower] = useState<UserSearchResult | null>(null);
  const { mutateAsync: createTransaction, isPending: isLending } = useCreateTransaction();
  const { data: searchResults, isFetching: isSearching } = useSearchUsers(
    { q: searchQuery },
    { query: { enabled: searchQuery.length >= 2 && !selectedBorrower } } as any
  );
  const images = [book.image, book.image2].filter(Boolean) as string[];
  const typeBadge = TYPE_BADGE[(book.type ?? "sell")] ?? TYPE_BADGE.sell;
  const totalStock = book.stock ?? 1;
  const rentedCount = book.rentedCount ?? 0;
  const availableCount = book.availableCount ?? (book.status === "available" ? totalStock : 0);
  const isRentType = book.type === "rent";
  const canLend = isRentType && availableCount > 0;
  // For display status badge: use availableCount-aware logic
  const statusKey = isRentType
    ? (availableCount === 0 ? "rented" : "available")
    : (book.status ?? "available");
  const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.available;
  const StatusIcon = statusCfg.icon;

  async function handleLend(e: React.FormEvent) {
    e.preventDefault();
    const name = selectedBorrower ? selectedBorrower.name : lendForm.borrowerName;
    if (!name || !lendForm.dueDate) { setLendError("O'quvchi va muddat to'ldirilishi shart"); return; }
    setLendError("");
    try {
      await createTransaction({ data: {
        storeBookId: book.id,
        borrowerUserId: selectedBorrower ? selectedBorrower.id : undefined,
        borrowerName: name,
        borrowerPhone: selectedBorrower ? (selectedBorrower.phone ?? undefined) : (lendForm.borrowerPhone || undefined),
        dueDate: new Date(lendForm.dueDate).toISOString(),
        finePerDay: lendForm.finePerDay ? parseFloat(lendForm.finePerDay) : 0,
      } as any });
      queryClient.invalidateQueries({ queryKey: getGetMyTransactionsQueryKey() });
      setShowLend(false);
      setSelectedBorrower(null);
      setSearchQuery("");
      onLent?.();
      onClose();
    } catch (err: any) {
      setLendError(err?.data?.message || err?.message || "Xatolik yuz berdi");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Image area */}
        {images.length > 0 ? (
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            <img src={images[imgIdx]} alt={book.title} className="w-full h-full object-cover" />
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? "bg-white" : "bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
            {/* Status overlay badge */}
            <div className={cn("absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold", statusCfg.color)}>
              <StatusIcon className="w-3 h-3" /> {statusCfg.label}
            </div>
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center relative">
            <BookOpen className="w-16 h-16 text-amber-300" />
            <div className={cn("absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold", statusCfg.color)}>
              <StatusIcon className="w-3 h-3" /> {statusCfg.label}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-xl font-bold text-foreground">{book.title}</h2>
            <button onClick={onClose} className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {book.author && <p className="text-sm text-primary/80 font-medium mb-3">{book.author}</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            {/* Type badge */}
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", typeBadge.color)}>
              {typeBadge.label}
            </span>
            {/* Rent duration */}
            {book.type === "rent" && book.rentDuration && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {book.rentDuration} kun
              </span>
            )}
            {/* Price */}
            {book.type === "sell" && book.price != null && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {formatPrice(book.price)}
              </span>
            )}
            {/* Stock info */}
            {isRentType && totalStock > 1 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border flex items-center gap-1">
                {rentedCount > 0 && <span className="text-rose-600 font-semibold">{rentedCount} band</span>}
                {rentedCount > 0 && availableCount > 0 && <span>·</span>}
                {availableCount > 0 && <span className="text-teal-600 font-semibold">{availableCount} mavjud</span>}
                <span className="text-muted-foreground">/ {totalStock} ta</span>
              </span>
            )}
            {!isRentType && book.stock != null && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                {book.stock} dona
              </span>
            )}
          </div>

          {/* Price change indicator */}
          {book.type === "sell" && book.price != null && book.previousPrice != null && book.previousPrice !== book.price && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 py-2 mb-3",
              book.price > book.previousPrice
                ? "text-rose-600 bg-rose-50 border border-rose-200"
                : "text-teal-700 bg-teal-50 border border-teal-200"
            )}>
              {book.price > book.previousPrice
                ? <><TrendingUp className="w-3.5 h-3.5 shrink-0" /> Narx oshdi: +{formatPrice(book.price - book.previousPrice)} · avvalgi narx: {formatPrice(book.previousPrice)}</>
                : <><TrendingDown className="w-3.5 h-3.5 shrink-0" /> Arzonlashdi: -{formatPrice(book.previousPrice - book.price)} · avvalgi narx: {formatPrice(book.previousPrice)}</>
              }
            </div>
          )}

          {book.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{book.description}</p>
          )}

          {/* Location */}
          {(book as any).location && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800">Joylashuvi</p>
                <p className="text-xs text-amber-700">{(book as any).location}</p>
              </div>
            </div>
          )}

          {/* Condition */}
          {(book as any).condition && (book as any).condition !== "active" && (
            <div className={cn("mt-2 flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium",
              (book as any).condition === "damaged" ? "bg-amber-50 border border-amber-200 text-amber-700" :
              (book as any).condition === "lost" ? "bg-rose-50 border border-rose-200 text-rose-700" :
              "bg-muted border border-border text-muted-foreground"
            )}>
              {(book as any).condition === "damaged" ? "⚠️ Shikastlangan" :
               (book as any).condition === "lost" ? "❌ Yo'qolgan" : "Hisobdan chiqarilgan"}
            </div>
          )}

          {/* Inventory / QR info */}
          {((book as any).inventoryNumber || (book as any).isbn) && (
            <div className="mt-3 p-3 bg-muted/50 rounded-xl border border-border flex items-start gap-3">
              <Suspense fallback={<div className="w-16 h-16 bg-muted rounded-lg animate-pulse" />}>
                <QrCodeDisplay
                  value={`mahalla-kutubxona:book:${book.id}${(book as any).inventoryNumber ? `:inv:${(book as any).inventoryNumber}` : ""}`}
                  size={64}
                  className="rounded-lg shrink-0"
                />
              </Suspense>
              <div className="min-w-0">
                {(book as any).inventoryNumber && (
                  <p className="text-xs font-mono font-semibold text-primary">Inv: {(book as any).inventoryNumber}</p>
                )}
                {(book as any).isbn && (
                  <p className="text-xs text-muted-foreground">ISBN: {(book as any).isbn}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">QR-kod skanerlash uchun</p>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="mt-5 pt-4 border-t border-border space-y-3">
              {/* Lend button for rent-type available books */}
              {canLend && !showLend && (
                <button onClick={() => setShowLend(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                  <HandshakeIcon className="w-4 h-4" /> Kitob berish {availableCount > 1 ? `(${availableCount} ta mavjud)` : ""}
                </button>
              )}
              {isRentType && !canLend && (
                <div className="flex items-center justify-center gap-2 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                  <Lock className="w-4 h-4" /> Barcha nusxalar band
                </div>
              )}

              {/* Inline lend form */}
              {showLend && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-blue-800 flex items-center gap-1.5">
                      <HandshakeIcon className="w-4 h-4" /> Kitob berish
                    </h3>
                    <button onClick={() => { setShowLend(false); setLendError(""); setSelectedBorrower(null); setSearchQuery(""); }}
                      className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors">
                      <X className="w-3 h-3 text-blue-600" />
                    </button>
                  </div>
                  {lendError && <p className="text-xs text-destructive mb-2 bg-destructive/10 px-2 py-1.5 rounded-lg">{lendError}</p>}
                  <form onSubmit={handleLend} className="space-y-3">
                    {/* User search */}
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">O'quvchini qidirish *</label>
                      {selectedBorrower ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-lg">
                          <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{selectedBorrower.name}</p>
                            <p className="text-xs text-muted-foreground">ID: {selectedBorrower.readerId ?? "—"}{selectedBorrower.phone ? ` · ${selectedBorrower.phone}` : ""}</p>
                          </div>
                          <button type="button" onClick={() => { setSelectedBorrower(null); setSearchQuery(""); }}
                            className="shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200">
                            <X className="w-3 h-3 text-blue-600" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
                            <input
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                              placeholder="ID raqam yoki ism bilan qidiring…"
                            />
                            {isSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 animate-spin" />}
                          </div>
                          {searchQuery.length >= 2 && !isSearching && (searchResults?.users ?? []).length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                              {(searchResults?.users ?? []).map(u => (
                                <button key={u.id} type="button"
                                  onClick={() => { setSelectedBorrower(u); setSearchQuery(""); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-left">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                    <User className="w-3.5 h-3.5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{u.name}</p>
                                    <p className="text-xs text-muted-foreground">ID: {u.readerId ?? "—"}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchQuery.length >= 2 && !isSearching && (searchResults?.users ?? []).length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-200 rounded-lg shadow-lg z-10 px-3 py-2 text-xs text-muted-foreground">
                              Foydalanuvchi topilmadi
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Muddat *
                        </label>
                        <input required type="date" value={lendForm.dueDate} onChange={e => setLendForm(f => ({ ...f, dueDate: e.target.value }))}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full px-2 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-800 mb-1">Jarima (so'm/kun)</label>
                        <input type="number" min="0" value={lendForm.finePerDay} onChange={e => setLendForm(f => ({ ...f, finePerDay: e.target.value }))}
                          className="w-full px-2 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                          placeholder="0" />
                      </div>
                    </div>
                    <button type="submit" disabled={isLending || !selectedBorrower}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                      {isLending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {selectedBorrower ? "Berish" : "O'quvchini tanlang"}
                    </button>
                  </form>
                </div>
              )}

              <div className="flex gap-2">
                {onEdit && (
                  <button onClick={onEdit}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
                    <Pencil className="w-4 h-4" /> Tahrirlash
                  </button>
                )}
                <button onClick={() => { onDelete(book.id); onClose(); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-xl hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" /> O'chirish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditStoreModal({ store, onClose, onSaved }: {
  store: any;
  onClose: () => void;
  onSaved: (updated: any) => void;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateStore, isPending } = useUpdateStore();

  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description ?? "");
  const [address, setAddress] = useState(store.address ?? "");
  const [phone, setPhone] = useState(store.phone ?? "");
  const [openHours, setOpenHours] = useState(store.openHours ?? "");
  const [avatar, setAvatar] = useState<string | null>(store.avatar ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setAvatar(url);
    } catch {
      setError("Rasmni yuklashda xatolik yuz berdi");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Kutubxona nomi kiritilishi shart"); return; }
    if (!address.trim()) { setError("Kutubxona manzili kiritilishi shart"); return; }
    setError("");
    try {
      const data: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        phone: phone.trim() || undefined,
        openHours: openHours.trim() || undefined,
        avatar: avatar ?? undefined,
        lat: store.lat ?? 41.311081,
        lng: store.lng ?? 69.240562,
      };
      const updated = await updateStore({ storeId: store.id, data } as any);
      onSaved(updated);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Saqlashda xatolik yuz berdi");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kutubxona ma'lumotlarini tahrirlash"
        className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Kutubxonani tahrirlash</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
              />
              {avatar ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border group shadow-sm">
                  <img src={avatar} alt="Logo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-7 h-7 bg-white text-foreground rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setAvatar(null)}
                      className="w-7 h-7 bg-white text-rose-500 rounded-lg flex items-center justify-center hover:bg-rose-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">Rasm yuklash</span>
                    </>
                  )}
                </button>
              )}
              <span className="text-xs text-muted-foreground">Kutubxona logotipi</span>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 font-sans">Kutubxona nomi *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Kutubxona nomi"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Tavsif</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                placeholder="Kutubxona haqida tavsif kiriting..."
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Manzil *</label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Kutubxona manzili"
                required
              />
            </div>

            {/* Phone & OpenHours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Telefon</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="+998..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Ish vaqti</label>
                <input
                  value={openHours}
                  onChange={e => setOpenHours(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="09:00 - 18:00"
                />
              </div>
            </div>

            {error && (
              <div className="px-3 py-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex gap-3 mt-4">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
              Bekor qilish
            </button>
            <button type="submit" disabled={isPending || uploading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saqlanmoqda...</> : "Saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StoreBookCard({ book, onClick }: { book: StoreBook & { type?: string; status?: string; rentDuration?: number | null; rentedCount?: number; availableCount?: number }; onClick: () => void }) {
  const typeBadge = TYPE_BADGE[(book.type ?? "sell")] ?? TYPE_BADGE.sell;
  const status = (book.status ?? "available") as string;
  const totalStock = book.stock ?? 1;
  const rentedCount = book.rentedCount ?? 0;
  const availableCount = book.availableCount ?? (status === "available" ? totalStock : 0);
  const isRentType = book.type === "rent";
  const fullyRented = isRentType && availableCount === 0;

  return (
    <div onClick={onClick}
      className="group cursor-pointer bg-background border border-border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Image */}
      <div className="aspect-[3/4] bg-gradient-to-br from-amber-50 to-amber-100 relative overflow-hidden">
        {book.image ? (
          <img src={book.image} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-amber-300" />
          </div>
        )}
        {/* Type badge */}
        <span className={cn("absolute top-1.5 left-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full border", typeBadge.color)}>
          {typeBadge.label}
        </span>
        {/* Age restriction badge */}
        {(book as any).ageRestriction > 0 && (
          <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1 py-0.5 rounded bg-rose-600/90 text-white leading-tight">
            {(book as any).ageRestriction}+
          </span>
        )}
        {/* Price for sell */}
        {book.type === "sell" && book.price != null && (
          <span className="absolute bottom-1.5 left-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/90 text-amber-800 shadow-sm">
            {formatPrice(book.price)}
          </span>
        )}
        {/* Rent duration */}
        {book.type === "rent" && book.rentDuration && (
          <span className="absolute bottom-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-100/90 text-blue-700 font-medium flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />{book.rentDuration} k
          </span>
        )}
        {/* Fully rented overlay */}
        {fullyRented && (
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
            <span className="text-xs text-white font-semibold bg-rose-600/80 px-2 py-1 rounded-full">Band</span>
          </div>
        )}
        {/* Non-rent out of stock */}
        {!isRentType && book.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-xs text-white font-semibold bg-black/60 px-2 py-1 rounded-full">Tugagan</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-2.5">
        <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">{book.title}</h3>
        {book.author && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{book.author}</p>}
        {book.type === "free" && <p className="text-xs text-teal-600 font-medium mt-1">Bepul</p>}
        {/* Rent stock info */}
        {isRentType && totalStock > 1 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {rentedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium">{rentedCount} band</span>
            )}
            {availableCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">{availableCount} mavjud</span>
            )}
          </div>
        )}
        {isRentType && totalStock === 1 && fullyRented && (
          <p className="text-[10px] text-rose-600 font-medium mt-1">Band</p>
        )}
        {isRentType && totalStock === 1 && !fullyRented && (
          <p className="text-[10px] text-teal-600 font-medium mt-1">Mavjud</p>
        )}
        {!isRentType && book.stock != null && book.stock > 0 && (
          <p className="text-xs text-teal-600 mt-1">{book.stock} ta mavjud</p>
        )}
      </div>
    </div>
  );
}

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const storeId = parseInt(id);
  const { data: store, isLoading } = useGetStore(storeId);
  const { data: booksData } = useListStoreBooks(storeId);
  const { mutateAsync: deleteBook } = useDeleteStoreBook();
  const [selectedBook, setSelectedBook] = useState<(StoreBook & { type?: string; status?: string; rentDuration?: number | null }) | null>(null);
  const [activeType, setActiveType] = useState<"all" | "sell" | "free" | "rent">("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"catalog" | "transactions">("catalog");
  const token = typeof window !== "undefined" ? localStorage.getItem("mahalla_token") : null;
  const { data: txData } = useGetMyTransactions({}, { query: { enabled: !!token && !!user } } as any);
  const { mutateAsync: returnBook, isPending: returning } = useReturnTransaction();
  const { mutateAsync: deleteTx } = useDeleteTransaction();
  const { mutateAsync: extendTx, isPending: extending } = useExtendTransaction();
  const [extendModal, setExtendModal] = useState<{ txId: number; current: string } | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [catalogAddedMsg, setCatalogAddedMsg] = useState("");
  const [editingBook, setEditingBook] = useState<(StoreBook & { previousPrice?: number | null }) | null>(null);
  const [showEditStore, setShowEditStore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const { mutateAsync: deleteStore, isPending: isDeletingStore } = useDeleteStore();

  async function handleDeleteStore() {
    if (!window.confirm("Rostdan ham ushbu kutubxonani butunlay o'chirmoqchimisiz? Barcha kitoblar va ma'lumotlar tiklanmaydigan qilib o'chiriladi.")) {
      return;
    }
    try {
      await deleteStore({ storeId });
      queryClient.invalidateQueries({ queryKey: [`/api/stores`] } as any);
      navigate("/stores");
    } catch (err: any) {
      alert(err?.data?.message || err?.message || "O'chirishda xatolik yuz berdi");
    }
  }

  const QrScannerComp = lazy(() => import("@/components/QrScanner"));
  const CatalogPickerModal = lazy(() => import("@/components/CatalogPickerModal"));
  const EditStoreBookModal = lazy(() => import("@/components/EditStoreBookModal"));

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!store) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <h2 className="text-xl font-semibold">Kutubxona topilmadi</h2>
      <Link href="/stores" className="text-primary text-sm mt-2 inline-block hover:underline">Orqaga</Link>
    </div>
  );

  const isOwner = user?.id === store.ownerId;

  async function handleDeleteBook(storeBookId: number) {
    await deleteBook({ storeId, storeBookId });
    queryClient.invalidateQueries({ queryKey: getListStoreBooksQueryKey(storeId) });
  }

  const allBooks = (booksData?.books ?? []) as (StoreBook & { type?: string; status?: string; rentDuration?: number | null })[];
  const filteredBooks = allBooks
    .filter(b => activeType === "all" || (b.type ?? "sell") === activeType)
    .filter(b => {
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase();
      return b.title.toLowerCase().includes(q) || (b.author ?? "").toLowerCase().includes(q) || ((b as any).isbn ?? "").includes(q);
    });
  const visibleBooks = filteredBooks.slice(0, visibleCount);

  const sellCount = allBooks.filter(b => (b.type ?? "sell") === "sell").length;
  const freeCount = allBooks.filter(b => (b.type ?? "sell") === "free").length;
  const rentCount = allBooks.filter(b => (b.type ?? "sell") === "rent").length;

  const storeBookIds = new Set(allBooks.map(b => b.id));
  const allTxs = (txData?.transactions ?? []) as any[];
  const storeTxs = allTxs.filter(tx => tx.storeBookId != null && storeBookIds.has(tx.storeBookId));
  const activeTxs = storeTxs.filter(tx => tx.status === "active");
  const overdueTxs = storeTxs.filter(tx => tx.status === "overdue");
  const returnedTxs = storeTxs.filter(tx => tx.status === "returned");

  async function handleExtend() {
    if (!extendModal || !extendDate) return;
    await extendTx({ transactionId: extendModal.txId, data: { newDueDate: new Date(extendDate).toISOString() } } as any);
    queryClient.invalidateQueries({ queryKey: getGetMyTransactionsQueryKey() });
    setExtendModal(null);
    setExtendDate("");
  }

  function handleExportTxCsv() {
    exportCsv(`tranzaksiyalar-${storeId}.csv`, storeTxs.map((tx: any) => ({
      "ID": tx.id,
      "Kitob": allBooks.find((b: any) => b.id === tx.storeBookId)?.title ?? "",
      "O'quvchi": tx.borrowerName,
      "Telefon": tx.borrowerPhone ?? "",
      "Berildi": formatDateShort(tx.issuedAt),
      "Muddat": formatDateShort(tx.dueDate),
      "Holat": tx.status,
      "Qaytarildi": tx.returnedAt ? formatDateShort(tx.returnedAt) : "",
      "Jarima": tx.fineAmount ?? 0,
    })));
  }

  async function handleReturn(txId: number) {
    await returnBook({ transactionId: txId } as any);
    queryClient.invalidateQueries({ queryKey: getGetMyTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListStoreBooksQueryKey(storeId) });
  }

  async function handleDeleteTx(txId: number) {
    await deleteTx({ transactionId: txId } as any);
    queryClient.invalidateQueries({ queryKey: getGetMyTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListStoreBooksQueryKey(storeId) });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {selectedBook && !editingBook && (
        <StoreBookDetailModal
          book={selectedBook}
          isOwner={isOwner}
          onClose={() => setSelectedBook(null)}
          onDelete={handleDeleteBook}
          onLent={() => {
            queryClient.invalidateQueries({ queryKey: getListStoreBooksQueryKey(storeId) });
            setSelectedBook(null);
          }}
          onEdit={isOwner ? () => { setEditingBook(selectedBook); setSelectedBook(null); } : undefined}
        />
      )}

      {/* Edit Store Book Modal */}
      {editingBook && (
        <Suspense fallback={null}>
          <EditStoreBookModal
            book={editingBook}
            storeId={storeId}
            onClose={() => setEditingBook(null)}
            onSaved={(updated) => {
              setEditingBook(null);
              setActiveType("all");
              queryClient.invalidateQueries({ queryKey: getListStoreBooksQueryKey(storeId) });
            }}
          />
        </Suspense>
      )}

      {/* Edit Store Modal */}
      {showEditStore && (
        <EditStoreModal
          store={store}
          onClose={() => setShowEditStore(false)}
          onSaved={(updated) => {
            setShowEditStore(false);
            queryClient.invalidateQueries({ queryKey: getGetStoreQueryKey(storeId) });
          }}
        />
      )}

      <button onClick={() => navigate("/stores")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>

      {/* Store header */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="p-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              {store.avatar ? (
                <img src={store.avatar} alt={store.name} className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  <Store className="w-8 h-8 text-amber-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
                {store.description && <p className="text-muted-foreground text-sm mt-1">{store.description}</p>}
                {/* Quick stats */}
                {allBooks.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {sellCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{sellCount} sotiladi</span>}
                    {freeCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">{freeCount} bepul</span>}
                    {rentCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{rentCount} vaqtincha</span>}
                  </div>
                )}
                {!isOwner && (
                  <div className="mt-3">
                    <Link href={`/stores/${storeId}/subscribe`}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm">
                        <Crown className="w-3.5 h-3.5" /> Obuna bo'lish
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            {isOwner && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowEditStore(true)}
                  className="flex items-center justify-center w-9 h-9 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-all shadow-sm"
                  title="Tahrirlash"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteStore}
                  disabled={isDeletingStore}
                  className="flex items-center justify-center w-9 h-9 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all shadow-sm disabled:opacity-50"
                  title="O'chirish"
                >
                  {isDeletingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm">{store.address}</span>
            </div>
            {store.phone && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl">
                <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                <a href={`tel:${store.phone}`} className="text-sm text-teal-700 hover:underline">{store.phone}</a>
              </div>
            )}
            {store.openHours && (
              <div className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-sm">{store.openHours}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main tabs (owner only sees Transactions tab) */}
      {isOwner && (
        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-4 flex-wrap">
          <button onClick={() => setActiveTab("catalog")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5", activeTab === "catalog" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <BookOpen className="w-4 h-4" /> Katalog
          </button>
          <button onClick={() => setActiveTab("transactions")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 relative", activeTab === "transactions" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <ArrowLeftRight className="w-4 h-4" /> Tranzaksiyalar
            {(activeTxs.length + overdueTxs.length) > 0 && (
              <span className={cn("ml-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full", overdueTxs.length > 0 ? "bg-rose-500 text-white" : "bg-blue-500 text-white")}>
                {activeTxs.length + overdueTxs.length}
              </span>
            )}
          </button>
          <Link href={`/stores/${storeId}/invoices`}>
            <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-card/50">
              <FileText className="w-4 h-4" /> Nakladnoy
            </button>
          </Link>
          <Link href={`/stores/${storeId}/readers`}>
            <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-card/50">
              <User className="w-4 h-4" /> O'quvchilar
            </button>
          </Link>
        </div>
      )}

      {/* Catalog tab */}
      {activeTab === "catalog" && (
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Kitoblar katalogi</h2>
              {allBooks.length > 0 && <p className="text-sm text-muted-foreground mt-0.5">{allBooks.length} ta kitob</p>}
            </div>
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCatalogPicker(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 text-amber-800 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors border border-amber-200"
                >
                  <BookOpen className="w-4 h-4" /> Bazadan tanlash
                </button>
                <Link href={`/stores/${storeId}/catalog/new`}>
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
                    <Plus className="w-4 h-4" /> Kitob qo'shish
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Search input */}
          {allBooks.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={catalogSearch}
                onChange={e => { setCatalogSearch(e.target.value); setVisibleCount(20); }}
                placeholder="Kitob nomi, muallif yoki ISBN bo'yicha qidirish..."
                className="w-full pl-9 pr-9 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {catalogSearch && (
                <button onClick={() => { setCatalogSearch(""); setVisibleCount(20); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {allBooks.length > 0 && (
            <div className="flex gap-1 p-1 bg-muted rounded-xl mb-4 w-fit flex-wrap">
              {([
                { key: "all", label: `Barchasi (${allBooks.length})` },
                ...(sellCount > 0 ? [{ key: "sell", label: `Sotiladi (${sellCount})` }] : []),
                ...(freeCount > 0 ? [{ key: "free", label: `Bepul (${freeCount})` }] : []),
                ...(rentCount > 0 ? [{ key: "rent", label: `Vaqtincha (${rentCount})` }] : []),
              ] as { key: string; label: string }[]).map(tab => (
                <button key={tab.key} onClick={() => { setActiveType(tab.key as any); setVisibleCount(20); }}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", activeType === tab.key
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground")}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {filteredBooks.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {visibleBooks.map(book => (
                  <StoreBookCard key={book.id} book={book} onClick={() => setSelectedBook(book)} />
                ))}
              </div>
              {filteredBooks.length > visibleCount && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    className="px-6 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-all font-semibold text-sm shadow-sm flex items-center gap-1.5 active:scale-95 duration-100"
                  >
                    <Plus className="w-4 h-4" /> Yana yuklash
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-8 h-8 text-amber-300" />
              </div>
              <p className="font-medium text-foreground">Katalog bo'sh</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isOwner ? "Birinchi kitobni qo'shing" : "Hali kitob qo'shilmagan"}
              </p>
              {isOwner && (
                <Link href={`/stores/${storeId}/catalog/new`}>
                  <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity mx-auto">
                    <Plus className="w-4 h-4" /> Kitob qo'shish
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Catalog Picker Modal */}
      {showCatalogPicker && (
        <Suspense fallback={null}>
          <CatalogPickerModal
            storeId={storeId}
            onClose={() => setShowCatalogPicker(false)}
            onSuccess={(count) => {
              setCatalogAddedMsg(`${count} ta kitob muvaffaqiyatli qo'shildi!`);
              setTimeout(() => setCatalogAddedMsg(""), 4000);
            }}
          />
        </Suspense>
      )}

      {/* Success toast */}
      {catalogAddedMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-teal-600 text-white px-6 py-3 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4">
          ✓ {catalogAddedMsg}
        </div>
      )}

      {/* QR Scanner modal */}
      {showQrScanner && (
        <Suspense fallback={null}>
          <QrScannerComp
            onScan={(result) => {
              setShowQrScanner(false);
              const match = result.match(/mahalla-kutubxona:book:(\d+)/);
              if (match) {
                const bookId = parseInt(match[1]);
                const found = allBooks.find(b => b.id === bookId);
                if (found) setSelectedBook(found);
              }
            }}
            onClose={() => setShowQrScanner(false)}
          />
        </Suspense>
      )}

      {/* Extend modal */}
      {extendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-blue-600" /> Muddatni uzaytirish
              </h3>
              <button onClick={() => setExtendModal(null)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Joriy muddat: <span className="font-medium">{formatDateShort(extendModal.current)}</span></p>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Yangi muddat *</label>
              <input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleExtend} disabled={extending || !extendDate}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {extending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Uzaytirish
              </button>
              <button onClick={() => setExtendModal(null)} className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Bekor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions tab (owner only) */}
      {activeTab === "transactions" && isOwner && (
        <div className="space-y-4">
          {storeTxs.length > 0 && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{storeTxs.length} ta tranzaksiya</span>
              <div className="flex gap-2">
                <button onClick={() => setShowQrScanner(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-medium transition-colors">
                  <QrCode className="w-3.5 h-3.5" /> Skanerlash
                </button>
                <button onClick={handleExportTxCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-medium transition-colors">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              </div>
            </div>
          )}
          {storeTxs.length === 0 && (
            <div className="bg-card border border-card-border rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ArrowLeftRight className="w-8 h-8 text-blue-300" />
              </div>
              <p className="font-medium">Tranzaksiyalar yo'q</p>
              <p className="text-sm text-muted-foreground mt-1">Do'kondagi kitob berilganda bu yerda ko'rinadi</p>
            </div>
          )}

          {overdueTxs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-rose-600 flex items-center gap-1.5 mb-2 px-1">
                <AlertTriangle className="w-4 h-4" /> Muddati o'tgan ({overdueTxs.length})
              </h3>
              <div className="space-y-2">
                {overdueTxs.map((tx: any) => {
                  const storeBook = allBooks.find(b => b.id === tx.storeBookId);
                  const daysOverdue = Math.floor((Date.now() - new Date(tx.dueDate).getTime()) / 86400000);
                  return (
                    <div key={tx.id} className="bg-card border border-rose-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{storeBook?.title ?? `Kitob #${tx.storeBookId}`}</p>
                          <p className="text-sm text-muted-foreground">{tx.borrowerName}{tx.borrowerPhone && ` · ${tx.borrowerPhone}`}</p>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground">Berildi: {formatDateShort(tx.issuedAt)}</span>
                            <span className="text-xs font-medium text-rose-600">Muddat: {formatDateShort(tx.dueDate)}</span>
                            <span className="text-xs font-bold text-rose-600">{daysOverdue} kun kech</span>
                          </div>
                          {tx.finePerDay > 0 && (
                            <span className="text-xs font-bold text-rose-600">
                              Kutilayotgan jarima: {(daysOverdue * tx.finePerDay).toLocaleString()} so'm
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleReturn(tx.id)} disabled={returning}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50">
                            <RotateCcw className="w-3 h-3" /> Qaytarildi
                          </button>
                          <button onClick={() => handleDeleteTx(tx.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTxs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-blue-600 flex items-center gap-1.5 mb-2 px-1">
                <HandshakeIcon className="w-4 h-4" /> Faol ({activeTxs.length})
              </h3>
              <div className="space-y-2">
                {activeTxs.map((tx: any) => {
                  const storeBook = allBooks.find(b => b.id === tx.storeBookId);
                  const daysLeft = Math.ceil((new Date(tx.dueDate).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={tx.id} className="bg-card border border-card-border rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{storeBook?.title ?? `Kitob #${tx.storeBookId}`}</p>
                          <p className="text-sm text-muted-foreground">{tx.borrowerName}{tx.borrowerPhone && ` · ${tx.borrowerPhone}`}</p>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground">Berildi: {formatDateShort(tx.issuedAt)}</span>
                            <span className="text-xs font-medium text-blue-600">Muddat: {formatDateShort(tx.dueDate)}</span>
                            <span className={cn("text-xs font-bold", daysLeft <= 2 ? "text-orange-600" : "text-blue-600")}>
                              {daysLeft === 0 ? "Bugun!" : daysLeft < 0 ? `${Math.abs(daysLeft)} kun kech` : `${daysLeft} kun qoldi`}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setExtendModal({ txId: tx.id, current: tx.dueDate }); setExtendDate(""); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                            <CalendarClock className="w-3 h-3" /> Uzaytir
                          </button>
                          <button onClick={() => handleReturn(tx.id)} disabled={returning}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50">
                            <RotateCcw className="w-3 h-3" /> Qaytarildi
                          </button>
                          <button onClick={() => handleDeleteTx(tx.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {returnedTxs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-teal-600 flex items-center gap-1.5 mb-2 px-1">
                <CheckCircle2 className="w-4 h-4" /> Qaytarilgan ({returnedTxs.length})
              </h3>
              <div className="space-y-2">
                {returnedTxs.map((tx: any) => {
                  const storeBook = allBooks.find(b => b.id === tx.storeBookId);
                  return (
                    <div key={tx.id} className="bg-card border border-card-border rounded-2xl p-4 shadow-sm opacity-80">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{storeBook?.title ?? `Kitob #${tx.storeBookId}`}</p>
                          <p className="text-sm text-muted-foreground">{tx.borrowerName}{tx.borrowerPhone && ` · ${tx.borrowerPhone}`}</p>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground">Berildi: {formatDateShort(tx.issuedAt)}</span>
                            <span className="text-xs font-medium text-teal-600">Qaytarildi: {formatDateShort(tx.returnedAt)}</span>
                          </div>
                          {tx.fineAmount > 0 && (
                            <span className="text-xs font-bold text-rose-600">Jarima: {tx.fineAmount.toLocaleString()} so'm</span>
                          )}
                        </div>
                        <button onClick={() => handleDeleteTx(tx.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
