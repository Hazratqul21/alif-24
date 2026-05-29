import { create } from 'zustand';

export interface CartItem {
  bookId: number;
  title: string;
  author: string | null;
  price: number;
  image: string | null;
}

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (bookId: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  items: [],
  add: (item) =>
    set((state) => {
      const exists = state.items.find((i) => i.bookId === item.bookId);
      if (exists) return state;
      return { items: [...state.items, item] };
    }),
  remove: (bookId) =>
    set((state) => ({ items: state.items.filter((i) => i.bookId !== bookId) })),
  clear: () => set({ items: [] }),
}));
