import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { 
  TrendingUp, 
  ShoppingBag, 
  BookOpen, 
  Wallet,
  ArrowUpRight,
  Clock
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function DashboardHome() {
  const { user } = useAuth();

  const stats = [
    { label: "Jami tushum", value: formatPrice(2450000), trend: "+12.5%", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Yangi buyurtmalar", value: "12 ta", trend: "+4 ta", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Faol kitoblar", value: "145 ta", trend: "-2 ta", icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-100" },
    { label: "Kutilayotgan daromad", value: formatPrice(450000), trend: "Kutmoqda", icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Xush kelibsiz, {user?.name}</h1>
          <p className="text-muted-foreground mt-1">Bugungi savdo ko'rsatkichlaringiz va statistikalar</p>
        </div>
        <div className="flex gap-3">
          <Link href="/books/new">
            <button className="px-4 py-2 bg-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-primary/20 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Kitob qo'shish
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-card-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                s.trend.startsWith("+") ? "bg-emerald-50 text-emerald-700" :
                s.trend.startsWith("-") ? "bg-rose-50 text-rose-700" : "bg-muted text-muted-foreground"
              }`}>
                {s.trend}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-card-border rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">So'nggi buyurtmalar</h3>
            <Link href="/orders"><button className="text-sm font-medium text-primary hover:underline">Barchasi</button></Link>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">Yaxshilik qiling</h4>
                    <p className="text-xs text-muted-foreground">Xaridor: Islomjon • 2 soat oldin</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{formatPrice(120000)}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 mt-1">
                    Kutmoqda
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold mb-6">Ommabop kitoblar</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="font-bold text-lg text-muted-foreground/30 w-5 text-center">{i}</div>
                <div className="w-10 h-10 bg-muted rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">Tarixiy obidalar</p>
                  <p className="text-xs text-muted-foreground">32 marta sotildi</p>
                </div>
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  +12%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
