import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Trash2, ArrowLeft, Loader2, MapPin, Truck, Package } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const { items, remove, clear } = useCart();
  const { token, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState("");

  const total = items.reduce((s, i) => s + i.price, 0);

  async function handleCheckout(bookId: number, price: number) {
    if (!isAuthenticated) { navigate("/login"); return; }
    setLoading(bookId);
    setError("");
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          bookId,
          deliveryType,
          deliveryAddress: deliveryType === "delivery" ? deliveryAddress : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Xatolik"); return; }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingCart className="w-16 h-16 text-muted mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Savat bo'sh</h1>
        <p className="text-muted-foreground text-sm mb-6">Kitob sahifasida "Savatchaga" tugmasini bosing</p>
        <Link href="/">
          <button className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:opacity-90">
            Kitoblarni ko'rish
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Savat ({items.length})</h1>
      </div>

      {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">{error}</div>}

      {/* Delivery type */}
      <div className="mb-5 p-4 bg-card border border-card-border rounded-2xl">
        <p className="text-sm font-semibold mb-3">Yetkazib berish turi</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "pickup", label: "O'zim olib ketaman", icon: Package },
            { key: "delivery", label: "Yetkazib berish", icon: Truck },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setDeliveryType(key as "pickup" | "delivery")}
              className={cn("flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all",
                deliveryType === key ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50")}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
        {deliveryType === "delivery" && (
          <div className="mt-3">
            <label className="text-xs text-muted-foreground mb-1 block">Manzil</label>
            <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Toshkent, Chilonzor 5-kvartal..." className="text-sm flex-1 bg-transparent outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3 mb-5">
        {items.map(item => (
          <div key={item.bookId} className="flex items-center gap-3 p-3.5 bg-card border border-card-border rounded-2xl">
            {item.image ? (
              <img src={item.image.startsWith("http") ? item.image : `/api${item.image}`} alt={item.title}
                className="w-12 h-14 object-cover rounded-lg shrink-0" />
            ) : (
              <div className="w-12 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{item.title}</p>
              {item.author && <p className="text-xs text-muted-foreground">{item.author}</p>}
              <p className="text-sm font-bold text-primary mt-0.5">{item.price.toLocaleString()} so'm</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button onClick={() => remove(item.bookId)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleCheckout(item.bookId, item.price)} disabled={loading === item.bookId}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-60 flex items-center gap-1">
                {loading === item.bookId ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                To'lash
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-card border border-card-border rounded-2xl">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-muted-foreground">Jami ({items.length} kitob)</span>
          <span className="text-lg font-bold">{total.toLocaleString()} so'm</span>
        </div>
        {deliveryType === "delivery" && (
          <p className="text-xs text-muted-foreground">+ Yetkazib berish narxi kelishiladi</p>
        )}
        <button onClick={clear} className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive transition-colors">
          Savatni tozalash
        </button>
      </div>
    </div>
  );
}
