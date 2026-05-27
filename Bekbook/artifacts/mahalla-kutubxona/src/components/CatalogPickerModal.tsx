import { useState, useEffect, useMemo } from "react";
import { X, Search, BookOpen, Check, Loader2, ChevronDown } from "lucide-react";
import { useGetBooksCatalog, useAddBooksFromCatalog, getListStoreBooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface CatalogPickerModalProps {
  storeId: number;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

const BOOK_TYPES = [
  { value: "rent", label: "Ijaraga" },
  { value: "sell", label: "Sotish" },
  { value: "free", label: "Bepul" },
];

export default function CatalogPickerModal({ storeId, onClose, onSuccess }: CatalogPickerModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bookType, setBookType] = useState<"rent" | "sell" | "free">("rent");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("1");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useGetBooksCatalog(
    { search: debouncedSearch || undefined, limit: 100 },
    { query: {} } as any
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const { mutateAsync: addFromCatalog } = useAddBooksFromCatalog();

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(b => b.id)));
    }
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setAdding(true);
    setError("");
    try {
      const res = await addFromCatalog({
        storeId,
        data: {
          catalogIds: Array.from(selected),
          type: bookType,
          price: parseFloat(price) || 0,
          stock: parseInt(stock) || 1,
        }
      } as any);
      await queryClient.invalidateQueries({ queryKey: getListStoreBooksQueryKey(storeId) });
      const count = (res as any)?.added ?? selected.size;
      onSuccess?.(count);
      onClose();
    } catch {
      setError("Xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setAdding(false);
    }
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && selected.size < items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Kitoblar bazasidan tanlash" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-amber-900">Kitoblar bazasidan tanlash</h2>
            <p className="text-sm text-stone-500 mt-0.5">{total} ta kitob mavjud</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b bg-stone-50">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Kitob nomi yoki muallif..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white"
              autoFocus
            />
          </div>
        </div>

        {/* Select all row */}
        {items.length > 0 && (
          <label className="px-6 py-2 border-b bg-amber-50 flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleAll}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
            <span className="text-sm text-stone-600">
              {selected.size > 0 ? `${selected.size} ta tanlandi` : "Barchasini tanlash"}
            </span>
          </label>
        )}

        {/* Book list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-amber-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <BookOpen size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Kitob topilmadi</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {items.map(book => {
                const isSelected = selected.has(book.id);
                return (
                  <label
                    key={book.id}
                    className={`w-full flex items-center gap-4 px-6 py-3 cursor-pointer select-none transition-colors ${
                      isSelected ? "bg-amber-50" : "hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(book.id)}
                      className="w-4 h-4 accent-amber-500 flex-shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? "text-amber-900" : "text-stone-800"}`}>
                        {book.title}
                      </p>
                      {book.author && (
                        <p className="text-xs text-stone-500 truncate mt-0.5">{book.author}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — options + add button */}
        <div className="px-6 py-4 border-t bg-stone-50 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-600 mb-1">Turi</label>
              <select
                value={bookType}
                onChange={e => setBookType(e.target.value as any)}
                className="w-full py-2 px-3 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white"
              >
                {BOOK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {bookType === "sell" && (
              <div className="w-32">
                <label className="block text-xs font-medium text-stone-600 mb-1">Narxi (so'm)</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  min="0"
                  className="w-full py-2 px-3 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>
            )}
            <div className="w-24">
              <label className="block text-xs font-medium text-stone-600 mb-1">Soni</label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
                min="1"
                className="w-full py-2 px-3 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || adding}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {adding ? (
              <><Loader2 size={16} className="animate-spin" /> Qo'shilmoqda...</>
            ) : (
              <>{selected.size > 0 ? `${selected.size} ta kitobni qo'shish` : "Kitoblarni belgilang"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
