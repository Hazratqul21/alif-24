import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Loader2, MapPin, ImagePlus, X, Upload, Clock, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { useCreateBook, getListBooksQueryKey, getGetMyBooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const TYPES = [
  { value: "sell", label: "Sotiladi", desc: "Narxini belgilang" },
  { value: "free", label: "Bepul", desc: "Tekin berasiz" },
  { value: "rent", label: "Vaqtincha", desc: "Muddatli berasiz" },
];

const GENRES = [
  "Badiiy adabiyot",
  "Jahon adabiyoti",
  "Diniy adabiyot",
  "Biznes va psixologiya",
  "Bolalar adabiyoti",
  "Ilmiy-ommabop",
];

const MAX_IMAGES = 2;

interface ImageSlot {
  preview: string;
  url: string | null;
  uploading: boolean;
  error: string;
}

interface QuotaInfo {
  monthlyCount: number;
  freeQuota: number;
  requiresPayment: boolean;
  feeAmount: number;
}

type PaymentStep = "idle" | "confirming" | "paid";

export default function BookNew() {
  const [, navigate] = useLocation();
  const { isAuthenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const { mutateAsync: createBook, isPending } = useCreateBook();
  const [form, setForm] = useState({
    title: "", author: "", description: "", type: "sell" as "sell" | "free" | "rent",
    price: "", address: "", lat: "", lng: "", rentDuration: "", genre: "",
  });
  const [images, setImages] = useState<ImageSlot[]>([]);
  const [error, setError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [tempLat, setTempLat] = useState<number | null>(null);
  const [tempLng, setTempLng] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function MapEvents() {
    useMapEvents({
      click(e) {
        setTempLat(e.latlng.lat);
        setTempLng(e.latlng.lng);
      }
    });
    return null;
  }

  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [feeToken, setFeeToken] = useState<string | null>(null);
  const [payStep, setPayStep] = useState<PaymentStep>("idle");
  const [payError, setPayError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    setQuotaLoading(true);
    fetch("/api/books/listing-quota", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: QuotaInfo) => setQuota(d))
      .catch(() => {})
      .finally(() => setQuotaLoading(false));
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-xl font-bold mb-2">Kirish talab qilinadi</h2>
        <p className="text-muted-foreground text-sm mb-4">E'lon berish uchun tizimga kiring</p>
        <Link href="/login">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Kirish</button>
        </Link>
      </div>
    );
  }

  function getMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => { 
        setTempLat(pos.coords.latitude);
        setTempLng(pos.coords.longitude); 
      },
      () => {}
    );
  }

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("images", file);
    const tk = getToken();
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: tk ? { Authorization: `Bearer ${tk}` } : {},
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

  async function initiatePayment() {
    setPayError("");
    setPayStep("confirming");
    try {
      const res = await fetch("/api/payments/book-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setFeeToken(data.token);
      setPayStep("idle");
    } catch (e: any) {
      setPayError(e.message || "Xatolik");
      setPayStep("idle");
    }
  }

  async function confirmPayment() {
    if (!feeToken) return;
    setPayStep("confirming");
    setPayError("");
    try {
      const res = await fetch("/api/payments/book-listing/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: feeToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setPayStep("paid");
    } catch (e: any) {
      setPayError(e.message || "Xatolik");
      setPayStep("idle");
    }
  }

  function closePayModal() {
    setShowPayModal(false);
    setPayError("");
    if (payStep !== "paid") {
      setFeeToken(null);
      setPayStep("idle");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (images.some(s => s.uploading)) { setError("Rasmlar hali yuklanmoqda, kuting..."); return; }

    if (quota?.requiresPayment && payStep !== "paid") {
      setShowPayModal(true);
      if (!feeToken) await initiatePayment();
      return;
    }

    setError("");
    const [img1, img2] = images.map(s => s.url).filter(Boolean) as string[];
    try {
      await createBook({
        data: {
          title: form.title,
          author: form.author || undefined,
          description: form.description || undefined,
          type: form.type,
          price: form.type === "sell" && form.price ? parseFloat(form.price) : undefined,
          rentDuration: form.type === "rent" && form.rentDuration ? parseInt(form.rentDuration) : undefined,
          image: img1 || undefined,
          image2: img2 || undefined,
          address: form.address || undefined,
          lat: form.lat ? parseFloat(form.lat) : undefined,
          lng: form.lng ? parseFloat(form.lng) : undefined,
          genre: form.genre || undefined,
          ...(feeToken && payStep === "paid" ? { feeToken } : {}),
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMyBooksQueryKey() });
      navigate("/");
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Xatolik yuz berdi");
    }
  }

  const canAddMore = images.length < MAX_IMAGES;
  const used = quota?.monthlyCount ?? 0;
  const total = quota?.freeQuota ?? 5;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>
      <h1 className="text-2xl font-bold mb-6">Kitob e'loni berish</h1>

      {/* Quota banner */}
      {quota && !quotaLoading && (
        <div className={cn("mb-4 p-3 rounded-xl border flex items-start gap-3 text-sm",
          quota.requiresPayment
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-teal-50 border-teal-200 text-teal-800"
        )}>
          {quota.requiresPayment
            ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />}
          <div>
            {quota.requiresPayment
              ? <><strong>Bepul kvota tugadi</strong> — bu oy {used} ta e'lon berdingiz ({total} ta bepul). Keyingi e'lon uchun <strong>{quota.feeAmount.toLocaleString()} so'm</strong> to'lov kerak.</>
              : <>Bu oy <strong>{used}/{total}</strong> ta bepul e'lon ishlatdingiz. {total - used} ta qoldi.</>
            }
            {payStep === "paid" && <p className="mt-1 text-teal-700 font-medium">To'lov amalga oshirildi! E'lonni berishingiz mumkin.</p>}
          </div>
        </div>
      )}

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
                  {slot.error && <div className="absolute inset-0 bg-destructive/80 flex items-center justify-center text-white text-xs text-center px-1">{slot.error}</div>}
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
            <p className="text-xs text-muted-foreground mt-1.5"><Upload className="w-3 h-3 inline mr-1" />JPEG, PNG, WebP · Maksimal 5 MB har bir rasm</p>
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

          {/* Genre Selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Kitob janri *</label>
            <select
              required
              value={form.genre}
              onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="" disabled>Janrni tanlang</option>
              {GENRES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Type */}
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

          {/* Rent Duration */}
          {form.type === "rent" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Ijara muddati <span className="text-muted-foreground font-normal">(kun)</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                <input
                  type="number" min="1" max="365" value={form.rentDuration}
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

          {/* Price */}
          {form.type === "sell" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Narxi (so'm)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="50000" />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Tavsif</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Kitob haqida qisqacha..." />
          </div>

          {/* Address + GPS */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Manzil va Joylashuv xaritada *</label>
            <div className="flex gap-2">
              <input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="flex-1 px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ko'cha, mahalla..." />
              <button type="button" onClick={() => {
                  setTempLat(form.lat ? parseFloat(form.lat) : 41.3111);
                  setTempLng(form.lng ? parseFloat(form.lng) : 69.2401);
                  setShowMap(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50">
                <MapPin className="w-4 h-4" />
                {form.lat ? "Belgilangan" : "Xaritadan tanlash"}
              </button>
            </div>
            {form.lat && <p className="text-xs text-teal-600 mt-1">Joylashuv aniqlandi: {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}</p>}
          </div>

          <button type="submit" disabled={isPending || images.some(s => s.uploading)}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {quota?.requiresPayment && payStep !== "paid" ? "To'lov qilib e'lon berish" : "E'lon berish"}
          </button>
        </form>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-card-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-base">E'lon uchun to'lov</h3>
                <p className="text-xs text-muted-foreground">Bepul kvota tugadi</p>
              </div>
            </div>

            {payStep === "paid" ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-3" />
                <p className="font-bold text-teal-700 mb-1">To'lov muvaffaqiyatli!</p>
                <p className="text-sm text-muted-foreground mb-4">Endi e'lonni berishingiz mumkin</p>
                <button onClick={() => { setShowPayModal(false); handleSubmit({ preventDefault: () => {} } as any); }}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">
                  E'lonni berish
                </button>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">E'lon to'lovi</span>
                    <span className="font-bold text-lg">{(quota?.feeAmount ?? 10000).toLocaleString()} so'm</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Bu oy e'lonlar</span>
                    <span>{quota?.monthlyCount}/{quota?.freeQuota} (bepul kvota tugagan)</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4 text-center">
                  Har bir qo'shimcha e'lon uchun bir martalik to'lov
                </p>

                {payError && <p className="text-xs text-destructive mb-3 text-center">{payError}</p>}

                {!feeToken ? (
                  <button onClick={initiatePayment} disabled={payStep === "confirming"}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                    {payStep === "confirming" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    To'lovni boshlash
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-700 text-center">
                      To'lov tayyor — tasdiqlang
                    </div>
                    <button onClick={confirmPayment} disabled={payStep === "confirming"}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                      {payStep === "confirming" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {(quota?.feeAmount ?? 10000).toLocaleString()} so'm to'lash
                    </button>
                  </div>
                )}

                <button onClick={closePayModal} className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Bekor qilish
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showMap && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background w-full max-w-lg rounded-2xl overflow-hidden flex flex-col h-[70vh]">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">Joylashuvni tanlang</h3>
              <button type="button" onClick={() => setShowMap(false)} className="text-muted-foreground hover:text-foreground">X</button>
            </div>
            <div className="p-2 border-b">
               <button type="button" onClick={getMyLocation} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 transition-colors">
                  <MapPin className="w-4 h-4" /> Hozirgi joylashuvimni aniqlash
               </button>
            </div>
            <div className="flex-1 relative">
              <MapContainer 
                center={[tempLat || 41.3111, tempLng || 69.2401]} 
                zoom={12} 
                style={{ height: '100%', width: '100%', zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {tempLat && tempLng && (
                  <Marker position={[tempLat, tempLng]} />
                )}
                <MapEvents />
              </MapContainer>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button type="button" onClick={() => setShowMap(false)} className="px-4 py-2 border rounded-xl text-sm">Bekor qilish</button>
              <button type="button" onClick={() => {
                if (tempLat && tempLng) {
                  setForm(f => ({ ...f, lat: String(tempLat), lng: String(tempLng) }));
                  setShowMap(false);
                }
              }} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
