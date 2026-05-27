import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Send, MessageSquare, Loader2, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDateShort } from "@/lib/utils";

function useMessagesApi(path: string, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["messages", path],
    enabled: enabled && !!token,
    refetchInterval: 5000,
    queryFn: async () => {
      const res = await fetch(`/api/messages${path}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("error");
      return res.json();
    },
  });
}

export default function MessagesPage() {
  const params = useParams<{ userId?: string }>();
  const [, navigate] = useLocation();
  const { token, user: me, isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const convData = useMessagesApi("/conversations", !params.userId);
  const threadData = useMessagesApi(`/${params.userId}`, !!params.userId);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ toId: parseInt(params.userId!), body }),
      });
      if (!res.ok) throw new Error("error");
      return res.json();
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", `/${params.userId}`] });
      qc.invalidateQueries({ queryKey: ["messages", "/conversations"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadData.data]);

  if (!isAuthenticated) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Kirish kerak</p>
      <Link href="/login"><button className="mt-3 px-4 py-2 bg-primary text-white rounded-xl text-sm">Kirish</button></Link>
    </div>
  );

  if (params.userId) {
    const messages: any[] = threadData.data?.messages ?? [];
    return (
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => navigate("/messages")} className="p-2 rounded-xl hover:bg-muted">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">Foydalanuvchi #{params.userId}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {threadData.isLoading ? (
            <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center pt-8 text-muted-foreground text-sm">Hali xabar yo'q. Birinchi siz yozing!</div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.fromId === me?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-white rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                    <p>{msg.body}</p>
                    <p className={`text-xs mt-0.5 ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                      {formatDateShort(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-border bg-card">
          <form onSubmit={e => { e.preventDefault(); if (text.trim()) sendMutation.mutate(text); }}
            className="flex items-center gap-2">
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Xabar yozing..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-sm outline-none" />
            <button type="submit" disabled={!text.trim() || sendMutation.isPending}
              className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-50">
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const conversations: any[] = convData.data?.conversations ?? [];
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-5 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />Xabarlar
      </h1>
      {convData.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl">
          <MessageSquare className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Hali xabar yo'q</p>
          <p className="text-xs text-muted-foreground mt-1">Kitob sahifasida sotuvchi bilan muloqot boshlang</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c: any) => (
            <button key={c.other_id} onClick={() => navigate(`/messages/${c.other_id}`)}
              className="w-full flex items-center gap-3 p-3.5 bg-card border border-card-border rounded-2xl hover:border-primary/30 transition-colors text-left">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {c.other_avatar ? (
                  <img src={c.other_avatar.startsWith("http") ? c.other_avatar : `/api${c.other_avatar}`}
                    className="w-10 h-10 rounded-full object-cover" alt="" />
                ) : <User className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{c.other_name ?? `Foydalanuvchi #${c.other_id}`}</p>
                <p className="text-xs text-muted-foreground truncate">{c.last_body}</p>
              </div>
              {Number(c.unread_count) > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {c.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
