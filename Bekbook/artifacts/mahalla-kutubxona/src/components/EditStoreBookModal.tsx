import { useState, useRef, lazy, Suspense } from "react";
import { X, Upload, Loader2, TrendingUp, TrendingDown, Trash2, Sparkles, CheckCircle2, Barcode, ScanLine } from "lucide-react";

const IsbnScannerModal = lazy(() => import("@/components/IsbnScannerModal"));
import { useUpdateStoreBook, getListStoreBooksQueryKey } from "@workspace/api-client-react";
import type { StoreBook } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPrice, cn } from "@/lib/utils";
import { fetchByIsbn } from "@/lib/isbn-fetch";

interface EditStoreBookModalProps {
  book: StoreBook & { previousPrice?: number | null };
  storeId: number;
  onClose: () => void;
  onSaved: (updated: StoreBook) => void;
}

const BOOK_TYPES = [
  { value: "sell", label: "Sotiladi" },
  { value: "free", label: "Bepul" },
  { value: "rent", label: "Vaqtincha (ijara)" },
];

const CONDITIONS = [
  { value: "active", label: "Yaxshi holda" },
  { value: "damaged", label: "Shikastlangan" },
  { value: "lost", label: "Yo'qolgan" },
  { value: "written_off", label: "Hisobdan chiqarilgan" },
];

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

function PriceChangeIndicator({ current, previous }: { current: number; previous: number | null | undefined }) {
  if (previous == null || previous === current) return null;
  const diff = current - previous;
  const pct = Math.abs(Math.round((diff / previous) * 100));
  if (diff > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 mt-1">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>Narx {formatPrice(Math.abs(diff))} ga oshdi (+{pct}%)</span>
        <span className="text-rose-400 ml-1">← {formatPrice(previous)} dan</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1.5 mt-1">
      <TrendingDown className="w-3.5 h-3.5" />
      <span>Narx {formatPrice(Math.abs(diff))} ga arzonlashdi (-{pct}%)</span>
      <span className="text-teal-500 ml-1">← {formatPrice(previous)} dan</span>
    </div>
  );
}

export default function EditStoreBookModal({ book, storeId, onClose, onSaved }: EditStoreBookModalProps) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateBook, isPending } = useUpdateStoreBook();

  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? "");
  const [description, setDescription] = useState(book.description ?? "");
  const [type, setType] = useState<"sell" | "free" | "rent">((book.type as any) ?? "sell");
  const [price, setPrice] = useState(String(book.price ?? ""));
  const [stock, setStock] = useState(String(book.stock ?? "1"));
  const [rentDuration, setRentDuration] = useState(String(book.rentDuration ?? "14"));
  const [inventoryNumber, setInventoryNumber] = useState((book as any).inventoryNumber ?? "");
  const [isbn, setIsbn] = useState((book as any).isbn ?? "");
  const [location, setLocation] = useState((book as any).location ?? "");
  const [condition, setCondition] = useState<string>((book as any).condition ?? "active");
  const [ageRestriction, setAgeRestriction] = useState(String((book as any).ageRestriction ?? 0));
  const [image, setImage] = useState<string | null>(book.image ?? null);
  const [image2, setImage2] = useState<string | null>(book.image2 ?? null);
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const [error, setError] = useState("");
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnFetched, setIsbnFetched] = useState(false);
  const [isbnError, setIsbnError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const img1Ref = useRef<HTMLInputElement>(null);
  const img2Ref = useRef<HTMLInputElement>(null);

  const currentPrice = parseFloat(price) || 0;
  const previousPrice = (book as any).previousPrice as number | null | undefined;

  async function handleImageUpload(slot: 1 | 2, file: File) {
    if (slot === 1) setUploading1(true);
    else setUploading2(true);
    try {
      const url = await uploadImage(file);
      if (slot === 1) setImage(url);
      else setImage2(url);
    } catch {
      setError("Rasmni yuklashda xatolik yuz berdi");
    } finally {
      if (slot === 1) setUploading1(false);
      else setUploading2(false);
    }
  }

  async function applyIsbn(targetIsbn: string) {
    setIsbnFetched(false);
    setIsbnError("");
    setIsbnLoading(true);
    try {
      const book = await fetchByIsbn(targetIsbn);
      if (book) {
        if (book.title) setTitle(book.title);
        if (book.author) setAuthor(book.author);
        if (book.description && !description) setDescription(book.description);
        setIsbnFetched(true);
      } else {
        setIsbnError("Bu ISBN bo'yicha ma'lumot topilmadi — qo'lda kiriting");
      }
    } catch {
      setIsbnError("Tarmoq xatosi — ISBN saqlandi");
    } finally {
      setIsbnLoading(false);
    }
  }

  async function handleScanDetected(scannedIsbn: string) {
    setIsbn(scannedIsbn);
    await applyIsbn(scannedIsbn);
  }

  async function fetchIsbn() {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
    if (!cleanIsbn) return;
    await applyIsbn(cleanIsbn);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Kitob nomi kiritilishi shart"); return; }
    setError("");
    try {
      const data: any = {
        title: title.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
        type,
        price: type === "sell" ? (parseFloat(price) || 0) : 0,
        stock: parseInt(stock) || 1,
        rentDuration: type === "rent" ? (parseInt(rentDuration) || 14) : undefined,
        image: image ?? undefined,
        image2: image2 ?? undefined,
        inventoryNumber: inventoryNumber.trim() || undefined,
        isbn: isbn.trim() || undefined,
        location: location.trim() || undefined,
        condition,
        ageRestriction: parseInt(ageRestriction) || 0,
      };
      const updated = await updateBook({ storeId, storeBookId: book.id, data } as any);
      await queryClient.invalidateQueries({ queryKey: getListStoreBooksQueryKey(storeId) });
      onSaved(updated as StoreBook);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Saqlashda xatolik yuz berdi");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kitobni tahrirlash"
        className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Kitobni tahrirlash</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* Images */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rasmlar</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ slot: 1 as const, val: image, uploading: uploading1, ref: img1Ref, label: "1-rasm" },
                  { slot: 2 as const, val: image2, uploading: uploading2, ref: img2Ref, label: "2-rasm" }].map(({ slot, val, uploading, ref, label }) => (
                  <div key={slot}>
                    <input
                      ref={ref}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(slot, f); }}
                    />
                    {val ? (
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border group">
                        <img src={val} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button type="button" onClick={() => ref.current?.click()}
                            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow hover:bg-muted transition-colors">
                            <Upload className="w-4 h-4 text-foreground" />
                          </button>
                          <button type="button" onClick={() => slot === 1 ? setImage(null) : setImage2(null)}
                            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow hover:bg-rose-50 transition-colors">
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => ref.current?.click()}
                        disabled={uploading}
                        className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground"
                      >
                        {uploading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            <span className="text-xs font-medium">{label}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ISBN auto-fetch */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5" /> ISBN orqali to'ldirish
              </label>
              <div className="flex flex-col gap-1.5">
                <input
                  value={isbn}
                  onChange={e => { setIsbn(e.target.value); setIsbnFetched(false); setIsbnError(""); }}
                  className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/40"
                  placeholder="978-..."
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="flex-1 px-2 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <ScanLine className="w-3.5 h-3.5" /> Skanerlash
                  </button>
                  <button
                    type="button"
                    onClick={fetchIsbn}
                    disabled={!isbn.trim() || isbnLoading}
                    className="flex-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {isbnLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Yuklash
                  </button>
                </div>
              </div>
              {isbnFetched && (
                <p className="text-xs text-teal-700 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Nom va muallif to'ldirildi
                </p>
              )}
              {isbnError && <p className="text-xs text-rose-600 mt-1">{isbnError}</p>}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Kitob nomi *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Kitob nomi"
                required
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Muallif</label>
              <input
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Muallif ismi"
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
                placeholder="Kitob haqida qisqacha ma'lumot..."
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Turi</label>
              <div className="flex gap-2">
                {BOOK_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value as any)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all",
                      type === t.value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price (sell only) */}
            {type === "sell" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Narxi (so'm)</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="0"
                />
                <PriceChangeIndicator current={currentPrice} previous={previousPrice} />
              </div>
            )}

            {/* Rent duration */}
            {type === "rent" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Ijara muddati (kun)</label>
                <div className="flex gap-2">
                  {[7, 14, 30].map(d => (
                    <button key={d} type="button" onClick={() => setRentDuration(String(d))}
                      className={cn("flex-1 py-2 rounded-xl text-sm font-semibold border transition-all",
                        rentDuration === String(d)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-background border-border text-muted-foreground hover:border-blue-300"
                      )}>
                      {d} kun
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Nusxalar soni</label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
                min="1"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Inventory / Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Inv. raqam</label>
                <input
                  value={inventoryNumber}
                  onChange={e => setInventoryNumber(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="001"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Joylashuvi</label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="1-qavat, A-javon"
                />
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Holati</label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                {CONDITIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Age restriction */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Yosh cheklov</label>
              <select
                value={ageRestriction}
                onChange={e => setAgeRestriction(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="0">Yosh cheklov yo'q</option>
                <option value="6">6+</option>
                <option value="12">12+</option>
                <option value="16">16+</option>
                <option value="18">18+</option>
              </select>
            </div>

            {error && (
              <div className="px-3 py-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
              Bekor qilish
            </button>
            <button type="submit" disabled={isPending || uploading1 || uploading2}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saqlanmoqda...</> : "Saqlash"}
            </button>
          </div>
        </form>
      </div>

      {/* ISBN Scanner Modal */}
      {showScanner && (
        <Suspense fallback={null}>
          <IsbnScannerModal
            onDetected={(isbn) => {
              setShowScanner(false);
              handleScanDetected(isbn);
            }}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
