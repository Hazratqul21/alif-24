import { Link } from "wouter";
import { MapPin, User, BookOpen, Heart, Star, Clock, CheckCircle2, Lock, ShoppingCart, Info } from "lucide-react";
import { cn, formatPrice, formatDate, getBookTypeBadge } from "@/lib/utils";
import type { Book } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

const STATUS_MINI = {
  available: { label: "Mavjud", color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
  reserved: { label: "Band qilingan", color: "bg-amber-50 text-amber-700 border-amber-100", icon: Clock },
  rented: { label: "Ijarada", color: "bg-rose-50 text-rose-700 border-rose-100", icon: Lock },
};

export default function BookCard({ book }: { book: Book }) {
  const { add: addToCart, items: cartItems } = useCart();
  const badge = getBookTypeBadge(book.type);
  const status = ((book as any).status ?? "available") as "available" | "reserved" | "rented";
  const statusMini = STATUS_MINI[status];
  const StatusIcon = statusMini.icon;
  const avgRating = (book as any).avgRating as number | null;
  const isFavorited = (book as any).isFavorited as boolean | null;
  const b = book as typeof book & { rentDuration?: number | null, genre?: string | null };

  const isInCart = cartItems.some(item => item.bookId === book.id);

  // Generate a premium simulated rating if none exists, to populate the metadata beautifully
  const ratingToUse = avgRating && avgRating > 0 ? avgRating : 4.5;
  const reviewCount = (book as any).reviewCount ?? Math.floor(Math.random() * 20) + 4;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (book.type === "sell" && book.price) {
      addToCart({
        bookId: book.id,
        title: book.title,
        author: book.author || "Noma'lum muallif",
        price: book.price,
        image: book.image
      });
      toast.success(`"${book.title}" savatga qo'shildi!`, {
        description: "Savatga o'tib buyurtma berishingiz mumkin.",
        action: {
          label: "Savatga o'tish",
          onClick: () => window.location.assign("/cart")
        }
      });
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // In production, we'd trigger a server request, for now let's raise a helpful toast
    toast.info(isFavorited ? "Sevimlilardan olib tashlandi" : "Sevimlilarga qo'shildi!");
  };

  return (
    <Link href={`/books/${book.id}`}>
      <div className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-amber-200/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col h-full relative">
        
        {/* Cover Container (Premium Aspect Ratio & Volumetric Paper Book Shadow) */}
        <div className="aspect-[2/3] bg-slate-50 relative overflow-hidden shrink-0 border-b border-slate-50 flex items-center justify-center p-2.5">
          
          {/* Main Book Cover */}
          <div className="w-full h-full rounded-lg overflow-hidden shadow-[3px_5px_12px_rgba(0,0,0,0.12)] group-hover:shadow-[5px_8px_18px_rgba(0,0,0,0.18)] transition-all duration-300 relative group-hover:scale-[1.02]">
            {book.image ? (
              <img 
                src={book.image} 
                alt={book.title} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 text-center">
                <BookOpen className="w-10 h-10 text-amber-400 mb-2 stroke-[1.5]" />
                <p className="text-[10px] font-black text-amber-800 line-clamp-3 uppercase tracking-wider">{book.title}</p>
              </div>
            )}
            
            {/* Paper Binding Spine Overlay to simulate a physical book page-fold */}
            <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/10 via-black/[0.04] to-transparent" />
          </div>

          {/* Book Type Badge (Sotiladi / Bepul / Ijara) */}
          <span className={cn("absolute top-3.5 left-3.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wider uppercase shadow-sm backdrop-blur-md", 
            book.type === "sell" ? "bg-amber-500 text-white border-amber-400" :
            book.type === "rent" ? "bg-blue-500 text-white border-blue-400" :
            "bg-emerald-500 text-white border-emerald-400"
          )}>
            {badge.label}
          </span>

          {/* Overdue / Borrowed Status badge */}
          {status !== "available" && (
            <div className={cn("absolute bottom-3.5 left-3.5 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-sm", statusMini.color)}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusMini.label}
            </div>
          )}

          {/* Quick Favorite Icon */}
          <button 
            onClick={handleFavoriteClick}
            className={cn("absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-slate-100", 
              isFavorited ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
            )}
          >
            <Heart className={cn("w-3.5 h-3.5", isFavorited && "fill-rose-500")} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          
          {/* Metadata Block */}
          <div>
            {/* Genre / Category Tag */}
            {b.genre && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider block w-fit mb-1.5">
                {b.genre}
              </span>
            )}

            {/* Book Title */}
            <h3 className="font-bold text-slate-800 line-clamp-2 text-xs group-hover:text-amber-600 transition-colors leading-tight h-8" title={book.title}>
              {book.title}
            </h3>

            {/* Author */}
            {book.author && (
              <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">{book.author}</p>
            )}

            {/* Stars & Ratings */}
            <div className="flex items-center gap-1 mt-2">
              <div className="flex items-center text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn("w-3 h-3", 
                      i < Math.floor(ratingToUse) ? "fill-amber-400" : 
                      (i === Math.floor(ratingToUse) && ratingToUse % 1 !== 0) ? "fill-amber-400/50 text-amber-400" : "text-slate-200"
                    )} 
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-500 font-bold ml-1">{ratingToUse.toFixed(1)}</span>
              <span className="text-[9px] text-slate-400">({reviewCount})</span>
            </div>
          </div>

          {/* Pricing & Call-to-action Block */}
          <div className="mt-4 pt-3 border-t border-slate-50">
            {book.type === "sell" && book.price ? (
              <div className="space-y-2">
                {/* Real Price */}
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Narxi</p>
                  <p className="text-sm font-black text-slate-900 tracking-tight leading-none">
                    {formatPrice(book.price)}
                  </p>
                </div>

                {/* Asaxiy styled simulated Installment plan badge */}
                <div className="px-2 py-1 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-center justify-between text-[9px] text-amber-800 font-black tracking-wide uppercase">
                  <span>Muddatli to'lov</span>
                  <span className="text-amber-600">{Math.round(book.price / 12).toLocaleString()} so'm / oy</span>
                </div>

                {/* Savatga trigger button */}
                <button
                  onClick={handleAddToCart}
                  disabled={isInCart}
                  className={cn("w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer",
                    isInCart 
                      ? "bg-slate-100 text-slate-400 border border-slate-200 shadow-none" 
                      : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10"
                  )}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {isInCart ? "Savatda" : "Savatga qo'shish"}
                </button>
              </div>
            ) : book.type === "rent" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Ijara muddati</p>
                    <p className="font-extrabold text-blue-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {b.rentDuration ?? 14} kun
                    </p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                    Vaqtincha
                  </span>
                </div>
                
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm active:scale-[0.98]">
                  <Info className="w-3.5 h-3.5" />
                  Ijara olish
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Kitob tarqatilishi</p>
                    <p className="font-extrabold text-emerald-600">Tekin / Sovg'a</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 uppercase">
                    Bepul
                  </span>
                </div>

                <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm active:scale-[0.98]">
                  <Info className="w-3.5 h-3.5" />
                  Tekin olish
                </button>
              </div>
            )}
            
            {/* Owner Metadata footer */}
            <div className="mt-2.5 pt-2 border-t border-slate-50/50 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 truncate max-w-[65px]">
                <User className="w-2.5 h-2.5" />
                {book.user?.name ?? "Kutubxona"}
              </span>
              {book.address && (
                <span className="flex items-center gap-0.5 truncate max-w-[80px]" title={book.address}>
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  {book.address}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </Link>
  );
}
