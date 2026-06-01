import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  BookOpen, 
  ShoppingBag, 
  Wallet, 
  Settings, 
  LogOut,
  Store
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Buyurtmalar", icon: ShoppingBag },
    { href: "/books", label: "Kitoblar", icon: BookOpen },
    { href: "/finances", label: "Moliya", icon: Wallet },
    { href: "/settings", label: "Sozlamalar", icon: Settings },
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">Sotuvchi</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                  isActive 
                    ? "bg-primary text-white font-semibold shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                )}>
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold shrink-0">
              {user?.name?.charAt(0) || "S"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">Sotuvchi</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden border-t border-border bg-card pb-safe shrink-0">
          <div className="flex justify-around p-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors cursor-pointer",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
