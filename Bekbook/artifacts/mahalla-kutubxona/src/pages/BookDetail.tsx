import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, MapPin, User, Phone, Mail, Trash2, BookOpen, Loader2, ChevronLeft, ChevronRight, Heart, Star, Send, Clock, CheckCircle2, Lock, HandshakeIcon, X, Calendar, ShoppingBag, MessageSquare, ShoppingCart, TrendingDown } from "lucide-react";
import {
  useGetBook, useDeleteBook, getListBooksQueryKey,
  useFavoriteBook, useUnfavoriteBook, useIsBookFavorited,
  useListBookReviews, useCreateBookReview, getListBookReviewsQueryKey,
  useUpdateBookStatus, useCreateTransaction, getGetMyTransactionsQueryKey,
  useCreateReservation, getGetMyReservationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import BookCard from "@/components/BookCard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatPrice, formatDate, getBookTypeBadge, cn } from "@/lib/utils";

const STATUS_CONFIG = {
  available: { label: "Mavjud", color: "bg-teal-100 text-teal-700 border-teal-200", icon: CheckCircle2 },
  reserved: { label: "Band", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock },
  rented: { label: "Berildi", color: "bg-rose-100 text-rose-700 border-rose-200", icon: Lock },
};

function StarRating({ rating, max = 5, size = "sm" }: { rating: number; max?: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={cn(sz, i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted fill-muted")} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}>
          <Star className={cn("w-6 h-6 transition-colors", (hover || value) >= i ? "fill-amber-400 text-amber-400" : "text-muted")} />
        </button>
      ))}
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const bookId = parseInt(id);

  const { data: book, isLoading } = useGetBook(bookId);
  const { mutateAsync: deleteBook, isPending: isDeleting } = useDeleteBook();
  const { data: favData } = useIsBookFavorited(bookId, { query: { enabled: isAuthenticated } } as any);
  const { mutateAsync: addFav, isPending: isFaving } = useFavoriteBook();
  const { mutateAsync: removeFav, isPending: isUnfaving } = useUnfavoriteBook();
  const { data: reviewsData } = useListBookReviews(bookId);
  const { mutateAsync: createReview, isPending: isReviewing } = useCreateBookReview();
  const { mutateAsync: updateStatus } = useUpdateBookStatus();

  const [imgIdx, setImgIdx] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "" });
  const [reviewError, setReviewError] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [showLendModal, setShowLendModal] = useState(false);
  const [lendForm, setLendForm] = useState({ borrowerName: "", borrowerPhone: "", dueDate: "", finePerDay: "" });
  const [lendError, setLendError] = useState("");
  const [reserveMsg, setReserveMsg] = useState("");
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState("");
  const { add: addToCart, items: cartItems } = useCart();
  const { mutateAsync: createTransaction, isPending: isLending } = useCreateTransaction();
  const { mutateAsync: reserve, isPending: isReserving } = useCreateReservation();

  const bookIdNum = parseInt(String(id));
  const { data: priceHistData } = useQuery({
    queryKey: ["priceHistory", bookIdNum],
    enabled: !!bookIdNum,
    queryFn: async () => {
      const res = await fetch(`/api/books/${bookIdNum}/price-history`);
      return res.json() as Promise<{ history: any[] }>;
    },
  });
  const { data: similarData } = useQuery({
    queryKey: ["similar", bookIdNum],
    enabled: !!bookIdNum,
    queryFn: async () => {
      const res = await fetch(`/api/books/${bookIdNum}/similar`);
      return res.json() as Promise<{ books: any[] }>;
    },
  });

  useEffect(() => {
    if (bookIdNum) fetch(`/api/books/${bookIdNum}/view`, { method: "POST" }).catch(() => {});
  }, [bookIdNum]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!book) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <h2 className="text-xl font-semibold">Kitob topilmadi</h2>
      <Link href="/" className="text-primary text-sm mt-2 inline-block hover:underline">Orqaga qaytish</Link>
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const bk = book!;
  const badge = getBookTypeBadge(book.type);
  const isOwner = user?.id === book.userId;
  const b = book as typeof book & { image2?: string | null; rentDuration?: number | null; status?: string };
  const images = [b.image, b.image2].filter(Boolean) as string[];
  const isFavorited = favData?.isFavorited ?? false;
  const avgRating = (book as any).avgRating as number | null;
  const reviewCount = (book as any).reviewCount as number ?? 0;
  const bookStatus = (b.status ?? "available") as "available" | "reserved" | "rented";
  const statusCfg = STATUS_CONFIG[bookStatus];
  const StatusIcon = statusCfg.icon;
  const hasReviewed = reviewsData?.reviews.some(r => r.userId === user?.id);

  async function handleDelete() {
    if (!confirm("Bu e'lonni o'chirishni xohlaysizmi?")) return;
    await deleteBook({ bookId: bk.id });
    queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
    navigate("/");
  }

  async function toggleFavorite() {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (isFavorited) {
      await removeFav({ bookId: bk.id });
    } else {
      await addFav({ bookId: bk.id });
    }
    queryClient.invalidateQueries({ queryKey: ["isBookFavorited", bk.id] });
    queryClient.invalidateQueries({ queryKey: ["getMyFavorites"] });
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewForm.rating) { setReviewError("Yulduz tanlang"); return; }
    setReviewError("");
    await createReview({ bookId: bk.id, data: { rating: reviewForm.rating, comment: reviewForm.comment || undefined } });
    queryClient.invalidateQueries({ queryKey: getListBookReviewsQueryKey(bk.id) });
    queryClient.invalidateQueries({ queryKey: ["getBook", bk.id] });
    setReviewForm({ rating: 0, comment: "" });
  }

  async function handleStatusChange(status: "available" | "reserved" | "rented") {
    await updateStatus({ bookId: bk.id, data: { status } });
    queryClient.invalidateQueries({ queryKey: ["getBook", bk.id] });
  }

  async function handleReserve() {
    if (!isAuthenticated) { navigate("/login"); return; }
    try {
      await reserve({ data: { bookId: bk.id } });
      queryClient.invalidateQueries({ queryKey: getGetMyReservationsQueryKey() });
      setReserveMsg("Rezerv qilindi! Kitob bo'sh bo'lganda xabar beramiz.");
    } catch (err: any) {
      setReserveMsg(err?.data?.message || "Allaqachon rezerv qilingansiz");
    }
  }

  async function handleBuy() {
    if (!isAuthenticated) { navigate("/login"); return; }
    setIsBuying(true);
    setBuyError("");
    try {
      const token = localStorage.getItem("mahalla_token");
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ bookId: bk.id }),
      });
      const data = await res.json();
      if (!res.ok) { setBuyError(data.error || "Xatolik yuz berdi"); return; }
      window.location.href = data.checkoutUrl;
    } catch {
      setBuyError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setIsBuying(false);
    }
  }

  async function handleLend(e: React.FormEvent) {
    e.preventDefault();
    if (!lendForm.borrowerName || !lendForm.dueDate) { setLendError("Ism va muddat to'ldirilishi shart"); return; }
    setLendError("");
    try {
      await createTransaction({ data: {
        bookId: bk.id,
        borrowerName: lendForm.borrowerName,
        borrowerPhone: lendForm.borrowerPhone || undefined,
        dueDate: new Date(lendForm.dueDate).toISOString(),
        finePerDay: lendForm.finePerDay ? parseFloat(lendForm.finePerDay) : 0,
      } as any });
      queryClient.invalidateQueries({ queryKey: ["getBook", bk.id] });
      queryClient.invalidateQueries({ queryKey: getGetMyTransactionsQueryKey() });
      setShowLendModal(false);
      setLendForm({ borrowerName: "", borrowerPhone: "", dueDate: "", finePerDay: "" });
    } catch (err: any) {
      setLendError(err?.data?.message || err?.message || "Xatolik yuz berdi");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Lend Modal */}
      {showLendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLendModal(false)}>
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                  <HandshakeIcon className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="font-bold text-lg">Kitob berish</h2>
              </div>
              <button onClick={() => setShowLendModal(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">"{book.title}" kitobini berish ma'lumotlari</p>
            {lendError && <div className="mb-3 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{lendError}</div>}
            <form onSubmit={handleLend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">O'quvchi ismi *</label>
                <input required value={lendForm.borrowerName} onChange={e => setLendForm(f => ({ ...f, borrowerName: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ism Familiya" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Telefon raqami</label>
                <input value={lendForm.borrowerPhone} onChange={e => setLendForm(f => ({ ...f, borrowerPhone: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="+998 90 000 00 00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Qaytarish muddati *
                </label>
                <input required type="date" value={lendForm.dueDate} onChange={e => setLendForm(f => ({ ...f, dueDate: e.target.value }))}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Jarima (so'm/kun)</label>
                <input type="number" min="0" value={lendForm.finePerDay} onChange={e => setLendForm(f => ({ ...f, finePerDay: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="0" />
                <p className="text-xs text-muted-foreground mt-1">Kech qaytarilsa kuniga qancha jarima</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowLendModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Bekor qilish
                </button>
                <button type="submit" disabled={isLending}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {isLending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Berish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>

      <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
        {/* Image gallery */}
        <div className="aspect-video w-full overflow-hidden relative bg-gradient-to-br from-amber-50 to-amber-100">
          {images.length > 0 ? (
            <>
              <img src={images[imgIdx]} alt={book.title} className="w-full h-full object-cover" />
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 flex gap-1.5">
                    {images.map((src, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className={cn("w-10 h-10 rounded-lg overflow-hidden border-2 transition-all", i === imgIdx ? "border-white" : "border-white/40 opacity-70")}>
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-20 h-20 text-amber-300" />
            </div>
          )}
          {/* Status badge on image */}
          <div className={cn("absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold", statusCfg.color)}>
            <StatusIcon className="w-3 h-3" />
            {statusCfg.label}
          </div>
          {/* Favorite button */}
          <button onClick={toggleFavorite} disabled={isFaving || isUnfaving}
            className="absolute top-3 right-3 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 disabled:opacity-60">
            <Heart className={cn("w-5 h-5 transition-colors", isFavorited ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", badge.color)}>
                  {badge.label}
                </span>
                {book.type === "rent" && b.rentDuration && (
                  <span className="text-xs px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {b.rentDuration} kun
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground mt-2">{book.title}</h1>
              {book.author && (
                <p className="text-sm text-primary/80 font-medium mt-1">{book.author}</p>
              )}
              {book.type === "sell" && book.price && (
                <p className="text-xl font-bold text-primary mt-1">{formatPrice(book.price)}</p>
              )}
              {/* Rating summary */}
              {reviewCount > 0 && avgRating && (
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={avgRating} size="sm" />
                  <span className="text-sm font-medium text-amber-600">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviewCount} ta sharh)</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {isOwner && (
                <button onClick={handleDelete} disabled={isDeleting}
                  className="p-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {book.description && (
            <p className="text-muted-foreground mt-4 leading-relaxed">{book.description}</p>
          )}

          {/* Owner controls */}
          {isOwner && (
            <div className="mt-4 space-y-3">
              {/* Lend button for rent-type books */}
              {book.type === "rent" && bookStatus === "available" && (
                <button onClick={() => setShowLendModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                  <HandshakeIcon className="w-4 h-4" /> Kitob berish
                </button>
              )}
              {/* Status change */}
              <div className="p-3 bg-muted/40 rounded-xl">
                <p className="text-xs font-medium text-muted-foreground mb-2">Holatni o'zgartirish:</p>
                <div className="flex gap-2 flex-wrap">
                  {(["available", "reserved", "rented"] as const).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <button key={s} onClick={() => handleStatusChange(s)}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                          bookStatus === s ? cn(cfg.color, "ring-1 ring-offset-1") : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                        )}>
                        <Icon className="w-3.5 h-3.5" /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Buy/Cart buttons for sell-type books (non-owners) */}
          {!isOwner && book.type === "sell" && bookStatus === "available" && (
            <div className="mt-4 space-y-2">
              {buyError && <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{buyError}</div>}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => {
                  addToCart({ bookId: bk.id, title: bk.title, author: bk.author, price: bk.price ?? 0, image: bk.image });
                }} disabled={cartItems.some(i => i.bookId === bk.id)}
                  className="flex items-center justify-center gap-2 py-2.5 border-2 border-primary text-primary rounded-xl text-sm font-bold hover:bg-primary/5 transition-colors disabled:opacity-50">
                  <ShoppingCart className="w-4 h-4" />
                  {cartItems.some(i => i.bookId === bk.id) ? "Savatda ✓" : "Savatchaga"}
                </button>
                <button onClick={handleBuy} disabled={isBuying}
                  className="flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60">
                  {isBuying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                  {isBuying ? "..." : "Hozir olish"}
                </button>
              </div>
              {book.price && <p className="text-xs text-muted-foreground text-center">Narx: <strong>{book.price.toLocaleString()} so'm</strong> · Payme orqali</p>}
            </div>
          )}

          {/* Reserve button for rented rent-type books (non-owners) */}
          {!isOwner && book.type === "rent" && bookStatus === "rented" && (
            <div className="mt-4">
              {reserveMsg ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700 font-medium text-center">{reserveMsg}</div>
              ) : (
                <button onClick={handleReserve} disabled={isReserving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-60">
                  {isReserving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  Navbatga qo'yilish (Rezerv)
                </button>
              )}
            </div>
          )}

          {/* Contact & seller info */}
          <div className="mt-6 space-y-3 border-t border-border pt-4">
            {book.user && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Egasi</p>
                  <p className="text-sm font-medium">{book.user.name}</p>
                </div>
              </div>
            )}
            {book.address && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Manzil</p>
                  <p className="text-sm font-medium">{book.address}</p>
                </div>
              </div>
            )}

            {/* Contact & Chat buttons (non-owner) */}
            {!isOwner && book.user && (
              <div className="mt-1 space-y-2">
                {showContact ? (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                    {book.user.phone ? (
                      <a href={`tel:${book.user.phone}`}
                        className="flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline">
                        <Phone className="w-4 h-4" /> {book.user.phone}
                      </a>
                    ) : null}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{book.user.email}</span>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowContact(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                    <Phone className="w-4 h-4" /> Sotuvchi bilan bog'lanish
                  </button>
                )}
                <Link href={`/messages/${book.user.id}`}>
                  <button className="w-full flex items-center justify-center gap-2 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                    <MessageSquare className="w-4 h-4" /> Chat boshlash
                  </button>
                </Link>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-4">E'lon berilgan: {formatDate(book.createdAt)}</p>
        </div>
      </div>

      {/* Price history chart */}
      {(priceHistData?.history?.length ?? 0) > 0 && (
        <div className="mt-6 bg-card border border-card-border rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />Narx tarixi
          </h2>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={priceHistData!.history.map((h: any) => ({ date: h.changedAt?.slice(0, 10), price: h.newPrice }))}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v.toLocaleString()}`} width={60} />
              <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()} so'm`} />
              <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Similar books */}
      {(similarData?.books?.length ?? 0) > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />O'xshash kitoblar
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {similarData!.books.map((b: any) => <BookCard key={b.id} book={b} />)}
          </div>
        </div>
      )}

      {/* Reviews section */}
      <div className="mt-6 bg-card border border-card-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold">Sharhlar</h2>
          {reviewCount > 0 && avgRating && (
            <div className="flex items-center gap-1.5">
              <StarRating rating={avgRating} size="sm" />
              <span className="text-sm font-semibold text-amber-600">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Add review form */}
        {isAuthenticated && !isOwner && !hasReviewed && (
          <form onSubmit={handleReview} className="mb-6 p-4 bg-muted/30 rounded-xl border border-border">
            <p className="text-sm font-medium mb-3">Sharh qoldiring</p>
            {reviewError && <p className="text-xs text-destructive mb-2">{reviewError}</p>}
            <StarPicker value={reviewForm.rating} onChange={v => setReviewForm(f => ({ ...f, rating: v }))} />
            <textarea value={reviewForm.comment}
              onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
              rows={2} placeholder="Izoh (ixtiyoriy)..."
              className="mt-3 w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            <button type="submit" disabled={isReviewing || !reviewForm.rating}
              className="mt-2 flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
              {isReviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Yuborish
            </button>
          </form>
        )}

        {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
          <div className="space-y-4">
            {reviewsData.reviews.map(r => (
              <div key={r.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{r.user?.name ?? "Foydalanuvchi"}</span>
                    <StarRating rating={r.rating} size="sm" />
                    <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Star className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Hali sharh yo'q</p>
          </div>
        )}
      </div>
    </div>
  );
}
