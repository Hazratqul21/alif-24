import { useState, useRef, lazy, Suspense } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Loader2, ImagePlus, X, Upload, BookOpen, Clock, MapPin, Hash, Barcode, Sparkles, CheckCircle2, ScanLine } from "lucide-react";
import { useAddStoreBook, useGetStore, getListStoreBooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { fetchByIsbn } from "@/lib/isbn-fetch";

const IsbnScannerModal = lazy(() => import("@/components/IsbnScannerModal"));

const TYPES = [
  { value: "sell", label: "Sotiladi", desc: "Narxini belgilang" },
  { value: "free", label: "Bepul", desc: "Tekin berasiz" },
  { value: "rent", label: "Vaqtincha", desc: "Muddatli berasiz" },
];

const MAX_IMAGES = 2;

interface ImageSlot {
  preview: string;
  url: string | null;
  uploading: boolean;
  error: string;
}

export default function StoreCatalogNew() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const storeId = parseInt(id);
  const { data: store } = useGetStore(storeId);
  const { mutateAsync: addBook, isPending } = useAddStoreBook();

  const [form, setForm] = useState({
    title: "", author: "", description: "",
    type: "sell" as "sell" | "free" | "rent",
    rentDuration: "",
    price: "", stock: "",
    inventoryNumber: "", isbn: "",
    condition: "active" as "active" | "damaged" | "lost" | "written_off",
    location: "",
    ageRestriction: "0",
  });
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [error, setError] = useState("");
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [isbnFetched, setIsbnFetched] = useState(false);
  const [isbnError, setIsbnError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (store && user?.id !== store.ownerId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold">Ruxsat yo'q</h2>
      </div>
    );
  }

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("images", file);
    const token = getToken();
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error("Yuklash xatosi");
    const data = await res.json();
    return data.urls[0] as string;
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_IMAGES - images.length;
    const toAdd = Array.from(files).slice(0, remaining);
    if (toAdd.length === 0) return;
    const slots: ImageSlot[] = toAdd.map(file => ({ preview: URL.createObjectURL(file), url: null, uploading: true, error: "" }));
    const startIdx = images.length;
    setImages(prev => [...prev, ...slots]);
    for (let i = 0; i < toAdd.length; i++) {
      const absIdx = startIdx + i;
      try {
        const url = await uploadFile(toAdd[i]);
        setImages(prev => prev.map((s, si) => si === absIdx ? { ...s, url, uploading: false } : s));
      } catch {
        setImages(prev => prev.map((s, si) => si === absIdx ? { ...s, uploading: false, error: "Xato" } : s));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function applyIsbn(isbn: string) {
    setIsbnFetched(false);
    setIsbnError("");
    setIsbnLoading(true);
    try {
      const book = await fetchByIsbn(isbn);
      if (book) {
        setForm(f => ({
          ...f,
          isbn,
          title: book.title || f.title,
          author: book.author || f.author,
          description: book.description || f.description,
        }));
        setIsbnFetched(true);
      } else {
        setIsbnError("Bu ISBN bo'yicha ma'lumot topilmadi — qo'lda kiriting");
      }
    } catch {
      setIsbnError("Internet xatosi — ISBN saqlandi, qo'lda to'ldiring");
    } finally {
      setIsbnLoading(false);
    }
  }

  async function handleScanDetected(isbn: string) {
    setForm(f => ({ ...f, isbn }));
    await applyIsbn(isbn);
  }

  async function fetchIsbn() {
    const isbn = form.isbn.replace(/[^0-9X]/gi, "");
    if (!isbn) return;
    await applyIsbn(isbn);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (images.some(s => s.uploading)) { setError("Rasmlar hali yuklanmoqda, kuting..."); return; }
    setError("");
    const [img1, img2] = images.map(s => s.url).filter(Boolean) as string[];
    try {
      await addBook({
        storeId,
        data: {
          title: form.title,
          author: form.author || undefined,
          description: form.description || undefined,
          type: form.type,
          rentDuration: form.type === "rent" && form.rentDuration ? parseInt(form.rentDuration) : undefined,
          price: form.type === "sell" && form.price ? parseFloat(form.price) : undefined,
          stock: form.stock ? parseInt(form.stock) : undefined,
          image: img1 || undefined,
          image2: img2 || undefined,
          inventoryNumber: form.inventoryNumber || undefined,
          isbn: form.isbn || undefined,
          condition: form.condition !== "active" ? form.condition : undefined,
          location: form.location || undefined,
          ageRestriction: parseInt(form.ageRestriction) || 0,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getListStoreBooksQueryKey(storeId) });
      navigate(`/stores/${storeId}`);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Xatolik yuz berdi");
    }
  }

  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(`/stores/${storeId}`)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Katalogga kitob qo'shish</h1>
          {store && <p className="text-sm text-muted-foreground">{store.name}</p>}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Rasmlar <span className="text-muted-foreground font-normal">(2 tagacha)</span></label>
            <div className="flex gap-3 flex-wrap">
              {images.map((slot, i) => (
                <div key={i} className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-border group">
                  <img src={slot.preview} alt="" className="w-full h-full object-cover" />
                  {slot.uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white animate-spin" /></div>}
                  {slot.error && <div className="absolute inset-0 bg-destructive/80 flex items-center justify-center text-white text-xs">{slot.error}</div>}
                  {!slot.uploading && (
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">{i + 1}/{MAX_IMAGES}</div>
                </div>
              ))}
              {canAddMore && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-28 h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary">
                  <ImagePlus className="w-7 h-7" />
                  <span className="text-xs font-medium">Rasm qo'sh</span>
                  <span className="text-xs opacity-60">{images.length}/{MAX_IMAGES}</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            <p className="text-xs text-muted-foreground mt-1.5"><Upload className="w-3 h-3 inline mr-1" />JPEG, PNG, WebP · Max 5 MB</p>
          </div>

          {/* ISBN auto-fetch */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5 text-blue-800">
              <Barcode className="w-4 h-4" /> ISBN orqali avtomatik to'ldirish
            </label>
            <div className="flex flex-col gap-2">
              <input
                value={form.isbn}
                onChange={e => { setForm(f => ({ ...f, isbn: e.target.value })); setIsbnFetched(false); setIsbnError(""); }}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/40"
                placeholder="978-3-16-148410-0"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ScanLine className="w-3.5 h-3.5" /> Kamera bilan skanerlash
                </button>
                <button
                  type="button"
                  onClick={fetchIsbn}
                  disabled={!form.isbn.trim() || isbnLoading}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isbnLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isbnFetched ? "To'ldirildi" : "Yuklash"}
                </button>
              </div>
            </div>
            {isbnFetched && (
              <p className="text-xs text-teal-700 flex items-center gap-1 mt-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Nom va muallif OpenLibrary dan to'ldirildi
              </p>
            )}
            {isbnError && <p className="text-xs text-rose-600 mt-1.5">{isbnError}</p>}
            {!isbnFetched && !isbnError && <p className="text-xs text-blue-600 mt-1">ISBN kiriting va "Auto-to'ldirish" tugmasini bosing</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Kitob nomi *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Masalan: Harry Potter" />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Muallif</label>
            <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Masalan: J.K. Rowling" />
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Tur *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.value as any }))}
                  className={cn("p-3 rounded-xl border text-left transition-all", form.type === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50")}>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Rent duration */}
          {form.type === "rent" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Ijara muddati <span className="text-muted-foreground font-normal">(kun)</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                <input
                  type="number" min="1" max="365"
                  value={form.rentDuration}
                  onChange={e => setForm(f => ({ ...f, rentDuration: e.target.value }))}
                  className="w-full pl-9 pr-14 py-2.5 bg-background border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400"
                  placeholder="Masalan: 7, 14, 30..."
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">kun</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[7, 14, 30].map(d => (
                  <button key={d} type="button"
                    onClick={() => setForm(f => ({ ...f, rentDuration: String(d) }))}
                    className={cn("px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                      form.rentDuration === String(d)
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-border text-muted-foreground hover:border-blue-300 hover:text-blue-600")}>
                    {d} kun
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price (only for sell) */}
          {form.type === "sell" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Narxi (so'm)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="50000" min="0" />
            </div>
          )}

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nusxalar soni</label>
            <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="10" min="0" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Tavsif</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Kitob haqida qisqacha ma'lumot..." />
          </div>

          {/* Location (Joylashuvi) */}
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-500" /> Joylashuvi <span className="text-muted-foreground font-normal">(ixtiyoriy)</span>
            </label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Masalan: 1-qavat, A-bo'lim, 3-shkaf" />
          </div>

          {/* Inventory number */}
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Inventar raqami
            </label>
            <input value={form.inventoryNumber} onChange={e => setForm(f => ({ ...f, inventoryNumber: e.target.value }))}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="INV-001" />
          </div>

          {/* Age restriction */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Yosh cheklov</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "0", label: "Yo'q" },
                { value: "6", label: "6+" },
                { value: "12", label: "12+" },
                { value: "16", label: "16+" },
                { value: "18", label: "18+" },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, ageRestriction: opt.value }))}
                  className={cn("px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                    form.ageRestriction === opt.value
                      ? opt.value === "0" ? "border-primary bg-primary/10 text-primary" : "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-border text-muted-foreground hover:border-primary/40")}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Holati</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                { value: "active", label: "Yaxshi", cls: "text-teal-700 border-teal-200 bg-teal-50" },
                { value: "damaged", label: "Shikastlangan", cls: "text-amber-700 border-amber-200 bg-amber-50" },
                { value: "lost", label: "Yo'qolgan", cls: "text-rose-700 border-rose-200 bg-rose-50" },
                { value: "written_off", label: "Hisobdan chiqarilgan", cls: "text-muted-foreground border-border bg-muted" },
              ] as { value: typeof form.condition; label: string; cls: string }[]).map(c => (
                <button key={c.value} type="button"
                  onClick={() => setForm(f => ({ ...f, condition: c.value }))}
                  className={cn("p-2 rounded-xl border text-xs font-medium text-center transition-all",
                    form.condition === c.value ? c.cls + " ring-2 ring-offset-1 ring-primary/40" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isPending || images.some(s => s.uploading)}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Katalogga qo'shish
          </button>
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
