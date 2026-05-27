import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Loader2 } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuth();
  const { mutateAsync: login, isPending } = useLogin();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await login({ data: form });
      setAuth(res.token, res.user);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Email yoki parol noto'g'ri");
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Xush kelibsiz</h1>
          <p className="text-muted-foreground text-sm mt-1">Hisobingizga kiring</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium text-foreground mb-1.5">Parol</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="Parolingiz"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Kirish
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Hisobingiz yo'qmi?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Ro'yxatdan o'ting
          </Link>
        </p>
      </div>
    </div>
  );
}
