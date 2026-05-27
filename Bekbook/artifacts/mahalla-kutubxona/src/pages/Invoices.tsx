import { useState, lazy, Suspense } from "react";
import { useParams, Link } from "wouter";
import { useGetStore, useGetStoreInvoices, useCreateInvoice, getGetStoreInvoicesQueryKey, useDeleteInvoice, useListStoreBooks } from "@workspace/api-client-react";
import type { Invoice, StoreBook } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { exportExcelSimple } from "@/lib/exportExcel";
import { ArrowLeft, Plus, Trash2, Loader2, FileText, PackagePlus, PackageMinus, ChevronDown, ChevronUp, X, Search, QrCode, Download, FileDown, FileSpreadsheet } from "lucide-react";
const QrScannerComp = lazy(() => import("@/components/QrScanner"));

const TYPE_LABEL: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  kirim: { label: "Kirim", color: "bg-teal-100 text-teal-700 border-teal-200", icon: PackagePlus },
  chiqim: { label: "Chiqim / Hisobdan chiqarish", color: "bg-rose-100 text-rose-700 border-rose-200", icon: PackageMinus },
};

const REASON_OPTIONS = ["eskirgan", "yo'qolgan", "shikastlangan", "boshqa sabab"];

interface FormItem {
  storeBookId: string;
  title: string;
  author: string;
  isbn: string;
  quantity: string;
  unitPrice: string;
  reason: string;
  inventoryNumbers: string;
}

function emptyItem(): FormItem {
  return { storeBookId: "", title: "", author: "", isbn: "", quantity: "1", unitPrice: "0", reason: "", inventoryNumbers: "" };
}

async function exportInvoicePDF(inv: Invoice) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  const typeLabel = inv.type === "kirim" ? "Kirim" : "Chiqim / Hisobdan chiqarish";
  doc.setFontSize(18);
  doc.text(`Nakladnoy № ${inv.number}`, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tur: ${typeLabel}`, 14, 30);
  doc.text(`Sana: ${inv.date}`, 14, 36);
  if (inv.supplier) doc.text(`Yetkazib beruvchi: ${inv.supplier}`, 14, 42);
  if (inv.notes) doc.text(`Izoh: ${inv.notes}`, 14, inv.supplier ? 48 : 42);
  const startY = (inv.supplier || inv.notes) ? 56 : 46;
  doc.setTextColor(40, 40, 40);
  autoTable(doc, {
    startY,
    head: [["Kitob nomi", "Muallif", "Soni", "Narxi", "Jami"]],
    body: (inv.items ?? []).map(item => [
      item.title,
      item.author ?? "—",
      item.quantity,
      item.unitPrice > 0 ? item.unitPrice.toLocaleString() : "—",
      item.unitPrice > 0 ? (item.quantity * item.unitPrice).toLocaleString() : "—",
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [180, 83, 9] },
  });
  const totalQty = (inv.items ?? []).reduce((s, it) => s + it.quantity, 0);
  const totalSum = (inv.items ?? []).reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const lastY: number = (doc as any).lastAutoTable?.finalY ?? startY + 30;
  doc.setFontSize(10);
  doc.text(`Jami: ${totalQty} ta kitob${totalSum > 0 ? ` · ${totalSum.toLocaleString()} so'm` : ""}`, 14, lastY + 8);
  doc.save(`nakladnoy-${inv.number}-${inv.date}.pdf`);
}

function InvoiceCard({ inv, onDelete }: { inv: Invoice; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_LABEL[inv.type] ?? TYPE_LABEL.kirim;
  const Icon = cfg.icon;
  const totalQty = inv.items?.reduce((s, it) => s + it.quantity, 0) ?? 0;
  const totalSum = inv.items?.reduce((s, it) => s + it.quantity * it.unitPrice, 0) ?? 0;

  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", cfg.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">№ {inv.number}</p>
              <p className="text-xs text-muted-foreground">{inv.date} {inv.supplier ? `· ${inv.supplier}` : ""}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", cfg.color)}>{cfg.label}</span>
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-muted-foreground">{totalQty} ta kitob</span>
            {totalSum > 0 && <span className="text-xs text-muted-foreground">{totalSum.toLocaleString()} so'm</span>}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {inv.notes && <p className="text-xs text-muted-foreground mb-3 bg-muted px-3 py-2 rounded-lg">{inv.notes}</p>}
          <div className="space-y-2">
            {(inv.items ?? []).map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-sm border border-border rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.author && <p className="text-xs text-muted-foreground">{item.author}</p>}
                  {item.inventoryNumbers && <p className="text-xs text-primary font-mono">Inv: {item.inventoryNumbers}</p>}
                  {item.reason && <p className="text-xs text-rose-600">Sabab: {item.reason}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold">{item.quantity} ta</p>
                  {item.unitPrice > 0 && <p className="text-xs text-muted-foreground">{(item.quantity * item.unitPrice).toLocaleString()} so'm</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); exportInvoicePDF(inv); }}
              className="flex items-center gap-1.5 text-xs text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
            >
              <FileDown className="w-3.5 h-3.5" /> PDF yuklab olish
            </button>
            <button onClick={() => onDelete(inv.id)}
              className="flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Nakladnoyni o'chirish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Invoices() {
  const { id: storeIdStr } = useParams<{ id: string }>();
  const storeId = parseInt(storeIdStr ?? "0");
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: storeData } = useGetStore(storeId, { query: { enabled: !!token && !!storeId } } as any);
  const { data: invoicesData, isLoading } = useGetStoreInvoices(storeId, undefined, { query: { enabled: !!storeId } } as any);
  const { data: storeBooks } = useListStoreBooks(storeId, { query: { enabled: !!storeId } } as any);
  const { mutateAsync: createInvoice, isPending: isCreating } = useCreateInvoice();
  const { mutateAsync: deleteInvoice } = useDeleteInvoice();

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"kirim" | "chiqim">("kirim");
  const [formNumber, setFormNumber] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formSupplier, setFormSupplier] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<FormItem[]>([emptyItem()]);
  const [formError, setFormError] = useState("");
  const [filterType, setFilterType] = useState<"" | "kirim" | "chiqim">("");
  const [bookSearch, setBookSearch] = useState<string[]>([""]);
  const [scanningForIdx, setScanningForIdx] = useState<number | null>(null);

  const books = (storeBooks as any)?.books ?? [];
  const invs = invoicesData?.invoices ?? [];
  const filtered = filterType ? invs.filter(i => i.type === filterType) : invs;

  function updateItem(idx: number, field: keyof FormItem, val: string) {
    setFormItems(items => items.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }

  function selectBook(idx: number, book: StoreBook) {
    setFormItems(items => items.map((it, i) => i === idx ? {
      ...it,
      storeBookId: String(book.id),
      title: book.title,
      author: book.author ?? "",
      isbn: (book as any).isbn ?? "",
      inventoryNumbers: (book as any).inventoryNumber ?? "",
    } : it));
    const s = [...bookSearch]; s[idx] = ""; setBookSearch(s);
  }

  function handleQrScan(result: string, idx: number) {
    setScanningForIdx(null);
    const match = result.match(/mahalla-kutubxona:book:(\d+)/);
    if (match) {
      const bookId = parseInt(match[1]);
      const found = books.find((b: StoreBook) => b.id === bookId);
      if (found) { selectBook(idx, found); return; }
    }
    const isbnMatch = result.match(/^(97[89]\d{10}|\d{9}[\dXx])$/);
    if (isbnMatch) {
      updateItem(idx, "isbn", result.trim());
      return;
    }
    updateItem(idx, "title", result.trim());
  }

  function handleExportCsv() {
    exportExcelSimple(
      `nakladnoylar-${storeId}`,
      filtered.flatMap(inv =>
        (inv.items ?? []).map(it => ({
          "Nakladnoy №": inv.number,
          "Tur": inv.type,
          "Sana": inv.date,
          "Yetkazuvchi": inv.supplier ?? "",
          "Kitob": it.title,
          "Muallif": it.author ?? "",
          "ISBN": it.isbn ?? "",
          "Miqdor": it.quantity,
          "Narx (so'm)": it.unitPrice,
          "Jami": it.quantity * it.unitPrice,
          "Sabab": it.reason ?? "",
          "Inv raqamlar": it.inventoryNumbers ?? "",
        }))
      ),
      "Nakladnoylar"
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formNumber || !formDate) { setFormError("Nakladnoy raqami va sana to'ldirilishi shart"); return; }
    if (formItems.some(it => !it.title)) { setFormError("Har bir qator uchun kitob nomi kiritilishi shart"); return; }
    setFormError("");
    try {
      await createInvoice({ data: {
        type: formType, number: formNumber, date: formDate,
        supplier: formSupplier || undefined, notes: formNotes || undefined,
        storeId,
        items: formItems.map(it => ({
          storeBookId: it.storeBookId ? parseInt(it.storeBookId) : undefined,
          title: it.title, author: it.author || undefined, isbn: it.isbn || undefined,
          quantity: parseInt(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          reason: it.reason || undefined,
          inventoryNumbers: it.inventoryNumbers || undefined,
        })),
      } as any });
      queryClient.invalidateQueries({ queryKey: getGetStoreInvoicesQueryKey(storeId) });
      setShowForm(false);
      setFormItems([emptyItem()]);
      setFormNumber(""); setFormSupplier(""); setFormNotes("");
    } catch (err: any) {
      setFormError(err?.data?.message || "Xatolik yuz berdi");
    }
  }

  async function handleDelete(id: number) {
    await deleteInvoice({ invoiceId: id });
    queryClient.invalidateQueries({ queryKey: getGetStoreInvoicesQueryKey({ storeId } as any) });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {scanningForIdx !== null && (
        <Suspense fallback={null}>
          <QrScannerComp
            onScan={(result) => handleQrScan(result, scanningForIdx)}
            onClose={() => setScanningForIdx(null)}
          />
        </Suspense>
      )}

      <div className="flex items-center gap-3 mb-6">
        <Link href={`/stores/${storeId}`}>
          <button className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Nakladnoylar</h1>
          {storeData && <p className="text-xs text-muted-foreground">{(storeData as any).name}</p>}
        </div>
        {invs.length > 0 && (
          <button onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground px-3 py-2 rounded-xl text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        )}
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Yangi
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5">
        {(["", "kirim", "chiqim"] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={cn("flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              filterType === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t === "" ? `Barchasi (${invs.length})` : t === "kirim" ? `Kirim (${invs.filter(i => i.type === "kirim").length})` : `Chiqim (${invs.filter(i => i.type === "chiqim").length})`}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl">
          <FileText className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted-foreground">Hali nakladnoy yo'q</p>
          <button onClick={() => setShowForm(true)}
            className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 mx-auto flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Birinchi nakladnoy
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => <InvoiceCard key={inv.id} inv={inv} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-base">Yangi nakladnoy</h2>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{formError}</p>}

              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2">
                {(["kirim", "chiqim"] as const).map(t => {
                  const cfg = TYPE_LABEL[t];
                  const Icon = cfg.icon;
                  return (
                    <button key={t} type="button" onClick={() => setFormType(t)}
                      className={cn("flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                        formType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                      <Icon className="w-4 h-4" /> {cfg.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nakladnoy raqami *</label>
                  <input required value={formNumber} onChange={e => setFormNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="2024-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Sana *</label>
                  <input required type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {formType === "kirim" && (
                <div>
                  <label className="block text-xs font-medium mb-1">Yetkazib beruvchi</label>
                  <input value={formSupplier} onChange={e => setFormSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Nashriyot yoki ta'minotchi nomi" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1">Izoh</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Qo'shimcha ma'lumot..." />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kitoblar</label>
                  <button type="button" onClick={() => { setFormItems(its => [...its, emptyItem()]); setBookSearch(s => [...s, ""]); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Qo'shish
                  </button>
                </div>
                <div className="space-y-3">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="border border-border rounded-xl p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                        {formItems.length > 1 && (
                          <button type="button" onClick={() => { setFormItems(its => its.filter((_, i) => i !== idx)); setBookSearch(s => s.filter((_, i) => i !== idx)); }}
                            className="w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Book search for chiqim */}
                      {formType === "chiqim" && books.length > 0 && (
                        <div className="relative">
                          <div className="relative flex gap-1">
                            <div className="relative flex-1">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <input
                                value={bookSearch[idx] ?? ""}
                                onChange={e => { const s = [...bookSearch]; s[idx] = e.target.value; setBookSearch(s); }}
                                className="w-full pl-8 pr-3 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                placeholder="Kutubxonadagi kitobni qidiring..." />
                            </div>
                            <button type="button" onClick={() => setScanningForIdx(idx)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-lg text-xs text-foreground transition-colors shrink-0">
                              <QrCode className="w-3.5 h-3.5" /> Skan
                            </button>
                          </div>
                          {(bookSearch[idx] ?? "").length >= 1 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 max-h-36 overflow-y-auto">
                              {books.filter((b: StoreBook) => b.title.toLowerCase().includes((bookSearch[idx] ?? "").toLowerCase())).slice(0, 6).map((b: StoreBook) => (
                                <button key={b.id} type="button" onClick={() => selectBook(idx, b)}
                                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors">
                                  <span className="font-medium">{b.title}</span>
                                  {b.author && <span className="text-muted-foreground ml-1.5 text-xs">{b.author}</span>}
                                  {(b as any).inventoryNumber && <span className="text-primary text-xs ml-1.5">#{(b as any).inventoryNumber}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">Kitob nomi *</label>
                          <input required value={item.title} onChange={e => updateItem(idx, "title", e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="Sarlavha" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">Muallif</label>
                          <input value={item.author} onChange={e => updateItem(idx, "author", e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="Muallif" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">Miqdor</label>
                          <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">Narxi (so'm)</label>
                          <input type="number" min="0" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">ISBN</label>
                          <input value={item.isbn} onChange={e => updateItem(idx, "isbn", e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="978-..." />
                        </div>
                      </div>
                      {formType === "kirim" && (
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">Inventar raqamlar (vergul bilan)</label>
                          <input value={item.inventoryNumbers} onChange={e => updateItem(idx, "inventoryNumbers", e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="INV-001, INV-002" />
                        </div>
                      )}
                      {formType === "chiqim" && (
                        <div>
                          <label className="block text-xs text-muted-foreground mb-0.5">Chiqim sababi</label>
                          <select value={item.reason} onChange={e => updateItem(idx, "reason", e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">Tanlang...</option>
                            {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isCreating}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Saqlash
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Bekor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
