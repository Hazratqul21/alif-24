import { useLocation, Link } from "wouter";
import { ArrowLeft, BarChart2, TrendingUp, AlertTriangle, CheckCircle2, Clock, BookOpen, Users, Loader2, Phone, Download, FileSpreadsheet, Crown, UserCheck, Eye, ShoppingBag } from "lucide-react";
import { useGetAnalyticsOverview } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { cn, formatDateShort } from "@/lib/utils";
import { exportExcel } from "@/lib/exportExcel";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const MONTHS_UZ = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTHS_UZ[parseInt(mo) - 1]} ${y}`;
}

async function exportPDF(overview: any) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("ru");

  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("Kitob berish statistikasi", 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Sana: ${today}`, 14, 30);

  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text("Umumiy ko'rsatkichlar", 14, 42);

  autoTable(doc, {
    startY: 46,
    head: [["Ko'rsatkich", "Qiymat"]],
    body: [
      ["Jami berilgan", String(overview.total ?? 0)],
      ["Hozir qo'lida (aktiv)", String(overview.active ?? 0)],
      ["Muddati o'tgan", String(overview.overdue ?? 0)],
      ["Qaytarilgan", String(overview.returned ?? 0)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [180, 83, 9] },
  });

  let lastY: number = (doc as any).lastAutoTable?.finalY ?? 80;

  if (overview.totalFineCollected > 0 || overview.totalFineExpected > 0) {
    lastY += 8;
    doc.setFontSize(13);
    doc.text("Jarima hisobi", 14, lastY);
    autoTable(doc, {
      startY: lastY + 4,
      head: [["Tur", "Summa (so'm)"]],
      body: [
        ...(overview.totalFineCollected > 0 ? [["Yig'ilgan jarima", overview.totalFineCollected.toLocaleString()]] : []),
        ...(overview.totalFineExpected > 0 ? [["Kutilayotgan jarima", overview.totalFineExpected.toLocaleString()]] : []),
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [180, 83, 9] },
    });
    lastY = (doc as any).lastAutoTable?.finalY ?? lastY + 30;
  }

  if (overview.topBooks?.length > 0) {
    lastY += 8;
    doc.setFontSize(13);
    doc.text("Eng ko'p berilgan kitoblar", 14, lastY);
    autoTable(doc, {
      startY: lastY + 4,
      head: [["#", "Kitob nomi", "Berilgan (marta)"]],
      body: overview.topBooks.map((b: any, i: number) => [i + 1, b.title, b.count]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [180, 83, 9] },
    });
    lastY = (doc as any).lastAutoTable?.finalY ?? lastY + 40;
  }

  if (overview.debtors?.length > 0) {
    lastY += 8;
    if (lastY > 240) { doc.addPage(); lastY = 20; }
    doc.setFontSize(13);
    doc.text("Qarzdorlar ro'yxati", 14, lastY);
    autoTable(doc, {
      startY: lastY + 4,
      head: [["Ism", "Telefon", "Kech (kun)", "Jarima (so'm)"]],
      body: overview.debtors.map((d: any) => [
        d.borrowerName,
        d.borrowerPhone ?? "—",
        d.overdueDays,
        d.expectedFine > 0 ? d.expectedFine.toLocaleString() : "—",
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [220, 38, 38] },
    });
  }

  doc.save(`statistika-${new Date().toISOString().split("T")[0]}.pdf`);
}

type AnalyticsTab = "overview" | "segments" | "funnel";

export default function Analytics() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("mahalla_token") : null;
  const { data, isLoading } = useGetAnalyticsOverview({ query: { enabled: !!token } } as any);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

  const { data: segmentsData, isLoading: segLoading } = useQuery({
    queryKey: ["analytics-segments"],
    enabled: isAuthenticated && !!token && activeTab === "segments",
    queryFn: async () => {
      const res = await fetch("/api/analytics/segments", { headers: { Authorization: `Bearer ${token}` } });
      return res.json() as Promise<{ segments: any[]; summary: any }>;
    },
  });
  const { data: funnelData, isLoading: funnelLoading } = useQuery({
    queryKey: ["analytics-funnel"],
    enabled: isAuthenticated && !!token && activeTab === "funnel",
    queryFn: async () => {
      const res = await fetch("/api/analytics/funnel", { headers: { Authorization: `Bearer ${token}` } });
      return res.json() as Promise<{ funnel: any[]; totals: any }>;
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <BarChart2 className="w-16 h-16 text-muted mb-4" />
        <h2 className="text-xl font-bold">Statistikani ko'rish uchun kiring</h2>
        <Link href="/login"><button className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">Kirish</button></Link>
      </div>
    );
  }

  if (isLoading || !data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const overview = data as any;
  const maxMonthly = Math.max(...(overview.monthlyActivity ?? []).map((m: any) => m.count), 1);

  const statCards = [
    { label: "Jami berilgan", value: overview.total, icon: BookOpen, color: "text-primary bg-primary/10", border: "border-primary/20" },
    { label: "Hozir qo'lida", value: overview.active, icon: Clock, color: "text-blue-600 bg-blue-50", border: "border-blue-200" },
    { label: "Muddati o'tgan", value: overview.overdue, icon: AlertTriangle, color: overview.overdue > 0 ? "text-rose-600 bg-rose-50" : "text-muted-foreground bg-muted", border: overview.overdue > 0 ? "border-rose-200" : "border-border" },
    { label: "Qaytarilgan", value: overview.returned, icon: CheckCircle2, color: "text-teal-600 bg-teal-50", border: "border-teal-200" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={() => navigate("/profile")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Profilga qaytish
      </button>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 overflow-x-auto">
        {([
          { key: "overview", label: "Umumiy", icon: BarChart2 },
          { key: "segments", label: "Segmentlar", icon: Users },
          { key: "funnel", label: "Funnel", icon: TrendingUp },
        ] as { key: AnalyticsTab; label: string; icon: typeof BarChart2 }[]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              activeTab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Kitob berish statistikasi</h1>
            <p className="text-sm text-muted-foreground">Sizning kutubxona faoliyatingiz</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => exportPDF(overview)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => {
              const sheets = [
                {
                  name: "Umumiy",
                  rows: [
                    { "Ko'rsatkich": "Jami berilgan", "Qiymat": overview.total ?? 0 },
                    { "Ko'rsatkich": "Hozir qo'lida (aktiv)", "Qiymat": overview.active ?? 0 },
                    { "Ko'rsatkich": "Muddati o'tgan", "Qiymat": overview.overdue ?? 0 },
                    { "Ko'rsatkich": "Qaytarilgan", "Qiymat": overview.returned ?? 0 },
                    { "Ko'rsatkich": "Yig'ilgan jarima (so'm)", "Qiymat": overview.totalFineCollected ?? 0 },
                    { "Ko'rsatkich": "Kutilayotgan jarima (so'm)", "Qiymat": overview.totalFineExpected ?? 0 },
                  ],
                },
                ...(overview.topBooks?.length ? [{
                  name: "Top kitoblar",
                  rows: overview.topBooks.map((b: any) => ({
                    "Kitob nomi": b.title,
                    "Berilgan marta": b.count,
                  })),
                }] : []),
                ...(overview.debtors?.length ? [{
                  name: "Qarzdorlar",
                  rows: overview.debtors.map((d: any) => ({
                    "O'quvchi": d.borrowerName,
                    "Telefon": d.borrowerPhone ?? "",
                    "Kech (kun)": d.overdueDays,
                    "Kutilayotgan jarima (so'm)": d.expectedFine ?? 0,
                  })),
                }] : []),
                ...(overview.monthlyActivity?.length ? [{
                  name: "Oylik faollik",
                  rows: overview.monthlyActivity.map((m: any) => ({
                    "Oy": m.month,
                    "Berilgan": m.lent,
                    "Qaytarilgan": m.returned,
                  })),
                }] : []),
              ];
              exportExcel(`statistika-${new Date().toISOString().slice(0, 10)}`, sheets);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={cn("bg-card border rounded-2xl p-4 shadow-sm", card.border)}>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2", card.color)}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Fine summary */}
      {(overview.totalFineCollected > 0 || overview.totalFineExpected > 0) && (
        <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Jarima hisobi
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {overview.totalFineCollected > 0 && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <div className="text-xs text-teal-600 mb-1">Yig'ilgan jarima</div>
                <div className="text-lg font-bold text-teal-700">{overview.totalFineCollected.toLocaleString()} so'm</div>
              </div>
            )}
            {overview.totalFineExpected > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <div className="text-xs text-rose-600 mb-1">Kutilayotgan jarima</div>
                <div className="text-lg font-bold text-rose-700">{overview.totalFineExpected.toLocaleString()} so'm</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly activity */}
      {overview.monthlyActivity?.length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" /> Oylik faollik
          </h2>
          <div className="flex items-end gap-2 h-28">
            {overview.monthlyActivity.map((m: any) => {
              const pct = maxMonthly > 0 ? (m.count / maxMonthly) * 100 : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">{m.count}</span>
                  <div
                    className="w-full rounded-lg bg-primary/80 transition-all"
                    style={{ height: `${Math.max(pct, 8)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{fmtMonth(m.month)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Top books */}
        {overview.topBooks?.length > 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Eng ko'p berilgan
            </h2>
            <div className="space-y-2">
              {overview.topBooks.map((b: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn("w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0",
                    i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-orange-300 text-white" : "bg-muted text-muted-foreground"
                  )}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.title}</p>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">{b.count} marta</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debtors list */}
        {overview.debtors?.length > 0 && (
          <div className="bg-card border border-rose-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-4 h-4" /> Qarzdorlar ({overview.debtors.length})
            </h2>
            <div className="space-y-2">
              {overview.debtors.map((d: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-rose-50 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-rose-800">{d.borrowerName}</p>
                    {d.borrowerPhone && (
                      <a href={`tel:${d.borrowerPhone}`} className="text-xs text-rose-600 flex items-center gap-1 hover:underline">
                        <Phone className="w-3 h-3" /> {d.borrowerPhone}
                      </a>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-rose-600 font-semibold">{d.overdueDays} kun kech</span>
                      {d.expectedFine > 0 && <span className="text-xs text-rose-700 font-bold">· {d.expectedFine.toLocaleString()} so'm</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {overview.total === 0 && activeTab === "overview" && (
        <div className="text-center py-12 bg-card border border-card-border rounded-2xl mt-4">
          <BarChart2 className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="font-medium">Hali statistika yo'q</p>
          <p className="text-sm text-muted-foreground mt-1">Kitob bergach bu yerda ma'lumotlar ko'rinadi</p>
        </div>
      )}

      {/* Segments tab */}
      {activeTab === "segments" && (
        <div>
          {segLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {segmentsData?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { key: "vip", label: "VIP", icon: Crown, color: "bg-amber-50 border-amber-200 text-amber-700" },
                    { key: "faol", label: "Faol o'quvchi", icon: UserCheck, color: "bg-blue-50 border-blue-200 text-blue-700" },
                    { key: "qarzdor", label: "Qarzdor", icon: AlertTriangle, color: "bg-rose-50 border-rose-200 text-rose-700" },
                    { key: "oddiy", label: "Oddiy", icon: Users, color: "bg-muted border-border text-muted-foreground" },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <div key={key} className={cn("rounded-2xl border p-4", color)}>
                      <Icon className="w-5 h-5 mb-1" />
                      <div className="text-2xl font-bold">{segmentsData.summary[key]}</div>
                      <div className="text-xs mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {(segmentsData?.segments ?? []).map((s: any) => {
                  const SEG_CFG: Record<string, { color: string; label: string }> = {
                    vip: { color: "bg-amber-100 text-amber-700", label: "VIP" },
                    faol: { color: "bg-blue-100 text-blue-700", label: "Faol" },
                    qarzdor: { color: "bg-rose-100 text-rose-700", label: "Qarzdor" },
                    oddiy: { color: "bg-muted text-muted-foreground", label: "Oddiy" },
                  };
                  const cfg = SEG_CFG[s.segment] ?? SEG_CFG.oddiy;
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </div>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", cfg.color)}>{cfg.label}</span>
                      <div className="text-right text-xs text-muted-foreground shrink-0">
                        <div>{s.activeBorrows} aktiv</div>
                        <div>{s.totalOrders} xarid</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Funnel tab */}
      {activeTab === "funnel" && (
        <div>
          {funnelLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {funnelData?.totals && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "Jami ko'rishlar", value: funnelData.totals.views, icon: Eye, color: "text-blue-600 bg-blue-50 border-blue-200" },
                    { label: "Ijaralangan", value: funnelData.totals.borrows, icon: BookOpen, color: "text-primary bg-primary/10 border-primary/20" },
                    { label: "Sotib olingan", value: funnelData.totals.purchases, icon: ShoppingBag, color: "text-teal-600 bg-teal-50 border-teal-200" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={cn("rounded-2xl border p-4", color.split(" ").slice(1).join(" "))}>
                      <Icon className={cn("w-5 h-5 mb-1", color.split(" ")[0])} />
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {(funnelData?.funnel ?? []).map((f: any) => {
                  const maxViews = Math.max(...(funnelData?.funnel ?? []).map((x: any) => x.views), 1);
                  return (
                    <div key={f.id} className="p-3.5 bg-card border border-card-border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium truncate mr-3">{f.title}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground shrink-0">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{f.views}</span>
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-primary" />{f.borrows}</span>
                          <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3 text-teal-600" />{f.purchases}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(f.views / maxViews) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(funnelData?.funnel ?? []).length === 0 && (
                  <div className="text-center py-12 bg-card border border-card-border rounded-2xl">
                    <TrendingUp className="w-12 h-12 text-muted mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Hali ko'rishlar qayd etilmagan</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
