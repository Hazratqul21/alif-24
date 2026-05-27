import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2, Star, Zap, Crown, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const PLAN_META: Record<string, { icon: typeof Star; color: string; badge: string }> = {
  monthly:  { icon: Star,  color: "border-blue-200 bg-blue-50",   badge: "bg-blue-100 text-blue-700" },
  biannual: { icon: Zap,   color: "border-orange-200 bg-orange-50", badge: "bg-orange-100 text-orange-700" },
  annual:   { icon: Crown, color: "border-amber-200 bg-amber-50",  badge: "bg-amber-100 text-amber-700" },
};

export default function SubscriptionPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { token, isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: plansData } = useQuery({
    queryKey: ["subPlans"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/plans");
      return res.json() as Promise<{ plans: any[] }>;
    },
  });

  const { data: mySubData } = useQuery({
    queryKey: ["mySub", storeId],
    enabled: isAuthenticated && !!storeId,
    queryFn: async () => {
      const res = await fetch(`/api/subscriptions/store/${storeId}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json() as Promise<{ active: boolean; subscriptions: any[] }>;
    },
  });

  async function handleSubscribe(plan: string) {
    if (!isAuthenticated) { window.location.href = "/login"; return; }
    setLoading(plan);
    setError("");
    try {
      const res = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ storeId: parseInt(storeId), plan }),
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

  const plans: any[] = plansData?.plans ?? [];
  const isActive = mySubData?.active ?? false;

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/stores/${storeId}`} className="p-2 rounded-xl hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Abonement</h1>
          <p className="text-xs text-muted-foreground">Cheksiz ijara imkoniyati</p>
        </div>
      </div>

      {isActive && (
        <div className="mb-5 p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-3">
          <Check className="w-5 h-5 text-teal-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-teal-700">Abonement faol!</p>
            <p className="text-xs text-teal-600">Siz ushbu kutubxonadan cheksiz kitob ijaraga olishingiz mumkin</p>
          </div>
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">{error}</div>}

      <div className="space-y-3">
        {plans.map((plan: any) => {
          const meta = PLAN_META[plan.key] ?? PLAN_META.monthly;
          const Icon = meta.icon;
          return (
            <div key={plan.key} className={cn("p-4 border-2 rounded-2xl transition-all", meta.color)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{plan.label}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", meta.badge)}>{plan.days} kun</span>
                  </div>
                </div>
                <p className="text-lg font-bold">{(plan.price / 100).toLocaleString()} so'm</p>
              </div>
              <ul className="space-y-1 mb-4">
                {["Cheksiz ijara", "Navbatsiz olish", "Ustuvor xizmat"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-teal-600" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleSubscribe(plan.key)} disabled={!!loading || isActive}
                className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                {loading === plan.key ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isActive ? "Faol abonement bor" : "Payme orqali to'lash"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        To'lov Payme orqali xavfsiz amalga oshiriladi
      </p>
    </div>
  );
}
