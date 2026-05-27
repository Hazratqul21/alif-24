import { useLocation } from "wouter";
import { CheckCircle2, ShoppingBag, ArrowLeft } from "lucide-react";

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order_id");

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-teal-600" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">To'lov muvaffaqiyatli!</h1>
      <p className="text-muted-foreground mb-2">Kitob xaridingiz tasdiqlandi.</p>
      {orderId && (
        <p className="text-sm text-muted-foreground mb-8">
          Buyurtma raqami: <span className="font-mono font-semibold text-foreground">#{orderId}</span>
        </p>
      )}
      <div className="flex flex-col gap-3">
        <button onClick={() => navigate("/profile?tab=orders")}
          className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          <ShoppingBag className="w-4 h-4" /> Xaridlarimni ko'rish
        </button>
        <button onClick={() => navigate("/")}
          className="flex items-center justify-center gap-2 w-full py-3 border border-border rounded-xl text-muted-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" /> Bosh sahifaga qaytish
        </button>
      </div>
    </div>
  );
}
