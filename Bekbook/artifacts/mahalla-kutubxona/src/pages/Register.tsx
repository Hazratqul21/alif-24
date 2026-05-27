import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Loader2 } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

export default function Register() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuth();
  const { mutateAsync: register, isPending } = useRegister();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await register({ data: { name: form.name, email: form.email, password: form.password, phone: form.phone || undefined } });
      setAuth(res.token, res.user);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Ro'yxatdan o'tishda xatolik");
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Hisob yaratish</h1>
          <p className="text-muted-foreground text-sm mt-1">Platformaga qo'shiling</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Ism familiya</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="To'liq ismingiz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Telefon (ixtiyoriy)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="+998 90 000 00 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Parol</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="Kamida 6 ta belgi"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Ro'yxatdan o'tish
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
