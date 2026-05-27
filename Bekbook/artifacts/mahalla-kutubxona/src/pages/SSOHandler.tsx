import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function SSOHandler() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get("sso_token");

    if (!ssoToken) {
      setError("SSO to'ken topilmadi");
      return;
    }

    // Verify token with backend
    fetch("/api/auth/sso-verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: ssoToken }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("SSO to'lov tekshiruvi muvaffaqiyatsiz tugadi");
        }
        return res.json();
      })
      .then((data) => {
        // Save the authenticated session
        setAuth(data.token, data.user);
        navigate("/");
      })
      .catch((err) => {
        setError(err.message || "Tizimga kirishda xatolik yuz berdi");
      });
  }, [setAuth, navigate]);

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">SSO Xatoligi</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          Login sahifasiga o'tish
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      <p className="text-sm font-semibold text-slate-600">Tizimga kirilmoqda, iltimos kuting...</p>
    </div>
  );
}
