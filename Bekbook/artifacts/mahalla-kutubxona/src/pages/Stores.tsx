import { useState } from "react";
import { Link } from "wouter";
import { Search, Store, MapPin, Star, BookOpen, Plus } from "lucide-react";
import { useListStores } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export default function Stores() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data, isLoading } = useListStores({ search: debouncedSearch || undefined });

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any).__storeSearchTimer);
    (window as any).__storeSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kutubxonalar</h1>
          <p className="text-muted-foreground text-sm mt-1">Yaqinidagi kitob do'konlari va kutubxonalar</p>
        </div>
        {isAuthenticated && (
          <Link href="/stores/new">
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
              Kutubxona qo'shish
            </button>
          </Link>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search" placeholder="Kutubxona qidirish..."
          value={search} onChange={e => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse space-y-3">
              <div className="w-12 h-12 bg-muted rounded-xl" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : data?.stores && data.stores.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">{data.total} ta kutubxona</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.stores.map(store => (
              <Link key={store.id} href={`/stores/${store.id}`}>
                <div className="bg-card border border-card-border rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group">
                  <div className="flex items-start gap-3">
                    {store.avatar ? (
                      <img src={store.avatar} alt={store.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                        <Store className="w-6 h-6 text-amber-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{store.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1">{store.address}</span>
                      </div>
                    </div>
                  </div>
                  {store.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{store.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen className="w-3 h-3" />
                      <span>{store.bookCount ?? 0} kitob</span>
                    </div>
                    {store.openHours && (
                      <span className="text-xs text-muted-foreground">{store.openHours}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Store className="w-16 h-16 text-muted mb-4" />
          <h3 className="text-lg font-semibold">Kutubxona topilmadi</h3>
          <p className="text-muted-foreground text-sm mt-1">Birinchi bo'lib kutubxona qo'shing</p>
          {isAuthenticated && (
            <Link href="/stores/new">
              <button className="mt-4 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" />Kutubxona qo'shish
              </button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
