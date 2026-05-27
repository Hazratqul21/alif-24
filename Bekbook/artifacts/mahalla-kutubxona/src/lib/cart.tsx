import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  bookId: number;
  title: string;
  author?: string | null;
  price: number;
  image?: string | null;
}

interface CartCtx {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (bookId: number) => void;
  clear: () => void;
  count: number;
}

const CartContext = createContext<CartCtx>({
  items: [], add: () => {}, remove: () => {}, clear: () => {}, count: 0,
});

const KEY = "mahalla_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  function add(item: CartItem) {
    setItems(prev => prev.find(i => i.bookId === item.bookId) ? prev : [...prev, item]);
  }
  function remove(bookId: number) { setItems(prev => prev.filter(i => i.bookId !== bookId)); }
  function clear() { setItems([]); }

  return (
    <CartContext.Provider value={{ items, add, remove, clear, count: items.length }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() { return useContext(CartContext); }
