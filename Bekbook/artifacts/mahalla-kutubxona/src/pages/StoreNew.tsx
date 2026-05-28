import { useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Loader2, MapPin, Info, CheckCircle2 } from "lucide-react";
import { useCreateStore, getListStoresQueryKey, getGetMyStoreQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function StoreNew() {
  const [, navigate] = useLocation();
  const { isAuthenticated, token } = useAuth();
  const queryClient = useQueryClient();
  const { mutateAsync: createStore, isPending } = useCreateStore();
  const [form, setForm] = useState({
    name: "", description: "", address: "", phone: "", openHours: "", avatar: "",
    lat: "", lng: "",
  });
  const [error, setError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);

  // Auto-integration state
  const [activeTab, setActiveTab] = useState<"manual" | "auto">("manual");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-xl font-bold mb-2">Kirish talab qilinadi</h2>
        <Link href="/login"><button className="mt-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Kirish</button></Link>
      </div>
    );
  }

  function getMyLocation() {
    if (!navigator.geolocation) return;
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setForm(f => ({ ...f, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) })); setGettingLocation(false); },
      () => setGettingLocation(false)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lat || !form.lng) { setError("Joylashuvni GPS orqali aniqlang"); return; }
    setError("");
    try {
      const store = await createStore({
        data: {
          name: form.name, description: form.description || undefined,
          address: form.address, phone: form.phone || undefined,
          openHours: form.openHours || undefined, avatar: form.avatar || undefined,
          lat: parseFloat(form.lat), lng: parseFloat(form.lng),
        }
      });
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMyStoreQueryKey() });
      navigate(`/stores/${store.id}/activate`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Xatolik yuz berdi");
    }
  }

  async function handleAutoImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importUrl) return;
    setImporting(true);
    setError("");
    try {
      const response = await fetch("/api/stores/import-external", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ url: importUrl })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Integratsiya vaqtida xatolik yuz berdi");
      }
      
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMyStoreQueryKey() });
      
      toast.success("Kutubxona muvaffaqiyatli integratsiya qilindi!", {
        description: `${data.importedCount} ta kitob avtomat ravishda asosiy sahifaga import qilindi.`,
      });
      
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate("/stores")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>
      <h1 className="text-2xl font-bold mb-6">Kutubxona qo'shish</h1>

      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-800 mb-1">Oylik obuna kerak</p>
          <p className="text-amber-700 text-xs">Kutubxona yoki do'kon ochish uchun oylik <strong>200 000 so'm</strong> to'lov talab qilinadi. Ro'yxatdan o'tgandan so'ng to'lov sahifasiga yo'naltirilasiz.</p>
          <ul className="mt-2 space-y-1">
            {["Cheksiz kitob katalogi", "Tranzaksiya va ijara boshqaruvi", "QR kod va inventarizatsiya"].map(f => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-amber-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />{f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
        {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">{error}</div>}
        
        {/* Tabs */}
        <div className="flex border-b border-slate-100 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={cn(
              "flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors cursor-pointer",
              activeTab === "manual"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Qo'lda kiritish
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("auto")}
            className={cn(
              "flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors cursor-pointer",
              activeTab === "auto"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Avtomatik integratsiya (Sayt URL) ⚡
          </button>
        </div>

        {activeTab === "auto" ? (
          <form onSubmit={handleAutoImport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Kutubxona / Do'kon sayt havolasi (URL)</label>
              <input
                required
                type="url"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                placeholder="Masalan: https://knigamir.uz"
              />
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Tizim hamkor saytni (masalan, <strong>knigamir.uz</strong>) avtomatik aniqlab, barcha kitoblarni platformaga to'liq integratsiya qilib beradi.
              </p>
            </div>
            
            <button
              type="submit"
              disabled={importing}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  Avtomatik sinxronizatsiya qilinmoqda...
                </>
              ) : (
                <>
                  ⚡ Integratsiya qilish va import
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Kutubxona nomi *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Masalan: Nodir kutubxonasi" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Tavsif</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Kutubxona haqida..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Manzil *</label>
              <div className="flex gap-2">
                <input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="flex-1 px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ko'cha, bino raqami..." />
                <button type="button" onClick={getMyLocation} disabled={gettingLocation}
                  className="flex items-center gap-1.5 px-3 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50">
                  {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {form.lat ? "OK" : "GPS"}
                </button>
              </div>
              {form.lat && <p className="text-xs text-teal-600 mt-1">Joylashuv aniqlandi: {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Telefon</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="+998 90 000 00 00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Ish vaqti</label>
                <input value={form.openHours} onChange={e => setForm(f => ({ ...f, openHours: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="09:00 - 18:00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Logo URL (ixtiyoriy)</label>
              <input value={form.avatar} onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="https://..." />
            </div>
            <button type="submit" disabled={isPending}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Davom etish → To'lov
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
