import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Store, CheckCircle2, Calendar, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface OwnerStatus {
  isActive: boolean;
  price: number;
  subscription: {
    id: number;
    expiresAt: string | null;
    status: string;
  } | null;
}

export default function StoreOwnerPay() {
  const { storeId } = useParams<{ storeId: string }>();
  const { token, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<OwnerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !token || !storeId) return;
    fetch(`/api/subscriptions/owner-status/${storeId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: OwnerStatus) => setStatus(d))
      .catch(() => setError("Ma'lumot yuklanmadi"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, token, storeId]);

  async function handlePay() {
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/subscriptions/activate-store", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId: parseInt(storeId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setPaid(true);
      setStatus(prev => prev ? { ...prev, isActive: true, subscription: data.subscription } : prev);
    } catch (e: any) {
      setError(e.message || "Xatolik");
    } finally {
      setPaying(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-xl font-bold mb-2">Kirish talab qilinadi</h2>
        <Link href="/login"><button className="mt-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium">Kirish</button></Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const expiresDate = status?.subscription?.expiresAt
    ? new Date(status.subscription.expiresAt).toLocaleDateString("ru-RU")
    : null;

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/stores/${storeId}`} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Kutubxona obunasi</h1>
          <p className="text-xs text-muted-foreground">Do'kon egasi oylik to'lovi</p>
        </div>
      </div>

      {(paid || status?.isActive) && (
        <div className="mb-5 p-4 bg-teal-50 border border-teal-200 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <p className="font-bold text-teal-700">Obuna faol!</p>
          </div>
          <p className="text-sm text-teal-600 ml-8">Kutubxonangiz muvaffaqiyatli faollashtirildi.</p>
          {expiresDate && (
            <div className="flex items-center gap-2 mt-2 ml-8 text-xs text-teal-600">
              <Calendar className="w-3.5 h-3.5" />
              <span>Muddati: {expiresDate}</span>
            </div>
          )}
          <Link href={`/stores/${storeId}`}>
            <button className="mt-4 w-full bg-teal-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 ml-0">
              Kutubxonaga o'tish
            </button>
          </Link>
        </div>
      )}

      {!status?.isActive && !paid && (
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold">Oylik obuna</p>
              <p className="text-2xl font-black text-primary">
                {(status?.price ?? 200000).toLocaleString()} so'm
              </p>
            </div>
          </div>

          <ul className="space-y-2 mb-5">
            {[
              "Kutubxonangiz platformada ko'rinadi",
              "Cheksiz kitob katalogi",
              "Ijara va tranzaksiya boshqaruvi",
              "QR kod va inventarizatsiya",
              "30 kun davomida faol",
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <div className="bg-muted/50 rounded-xl p-3 mb-5 text-xs text-muted-foreground text-center">
            To'lovdan so'ng kutubxonangiz 30 kun davomida faol bo'ladi.
            Har oy yangilash kerak.
          </div>

          {error && <p className="text-sm text-destructive mb-3 text-center">{error}</p>}

          <button onClick={handlePay} disabled={paying}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {(status?.price ?? 200000).toLocaleString()} so'm to'lash
          </button>
        </div>
      )}
    </div>
  );
}
