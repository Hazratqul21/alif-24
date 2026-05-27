import { useState, useEffect } from "react";
import { Link } from "wouter";
import { MapPin, Locate, BookOpen, Store, Filter } from "lucide-react";
import { useGetNearby } from "@workspace/api-client-react";
import { getBookTypeBadge, cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

const TASHKENT = { lat: 41.2995, lng: 69.2401 };
const RADIUS_OPTIONS = [5, 10, 20, 50];
const TYPE_OPTIONS = [
  { value: "", label: "Barchasi" },
  { value: "sell", label: "Sotiladi" },
  { value: "free", label: "Bepul" },
  { value: "rent", label: "Vaqtincha" },
];

export default function MapPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [center, setCenter] = useState(TASHKENT);
  const [radius, setRadius] = useState(10);
  const [type, setType] = useState("");
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    // Dynamically import react-leaflet to avoid SSR issues
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([rl, L]) => {
      // Fix leaflet default marker icons
      delete (L.default.Icon.Default.prototype as any)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      setMapComponents({ ...rl, L: L.default });
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setCenter(loc);
      });
    }
  }, []);

  const { data: nearby, isLoading } = useGetNearby({
    lat: center.lat, lng: center.lng, radius,
    type: type ? (type as "sell" | "free" | "rent") : undefined,
  });

  function goToMyLocation() {
    if (userLocation) setCenter(userLocation);
    else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setCenter(loc);
      });
    }
  }

  if (!MapComponents) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-primary animate-bounce mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Xarita yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap } = MapComponents;

  function RecenterButton() {
    const map = useMap();
    return (
      <button
        onClick={() => { map.setView([center.lat, center.lng], 13); goToMyLocation(); }}
        className="absolute top-4 right-4 z-[1000] bg-card border border-border rounded-xl p-2.5 shadow-md hover:bg-muted transition-colors"
        title="Mening joylashuvim"
      >
        <Locate className="w-5 h-5 text-primary" />
      </button>
    );
  }

  const bookCount = nearby?.books?.length ?? 0;
  const storeCount = nearby?.stores?.length ?? 0;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Filter bar */}
      <div className="bg-card border-b border-border px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter:</span>
        </div>
        {TYPE_OPTIONS.map(t => (
          <button key={t.value} onClick={() => setType(t.value)}
            className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all", type === t.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/50")}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Radius:</span>
          <select value={radius} onChange={e => setRadius(parseInt(e.target.value))}
            className="px-2 py-1 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
            {RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
        </div>
        <span className="text-xs text-muted-foreground">
          {bookCount} kitob, {storeCount} kutubxona
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={[center.lat, center.lng]} zoom={13} className="w-full h-full" style={{ zIndex: 0 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

          {nearby?.books?.map((book: any) => book.lat && book.lng && (
            <Marker key={`book-${book.id}`} position={[book.lat, book.lng]}>
              <Popup>
                <div className="min-w-[160px]">
                  <p className="font-semibold text-sm">{book.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{getBookTypeBadge(book.type).label}</p>
                  {book.address && <p className="text-xs text-gray-500 mt-0.5">{book.address}</p>}
                  <a href={`/books/${book.id}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">Ko'rish</a>
                </div>
              </Popup>
            </Marker>
          ))}

          {nearby?.stores?.map((store: any) => (
            <Marker key={`store-${store.id}`} position={[store.lat, store.lng]}>
              <Popup>
                <div className="min-w-[160px]">
                  <p className="font-semibold text-sm">{store.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{store.address}</p>
                  {store.openHours && <p className="text-xs text-gray-500 mt-0.5">{store.openHours}</p>}
                  <a href={`/stores/${store.id}`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">Ko'rish</a>
                </div>
              </Popup>
            </Marker>
          ))}
          <RecenterButton />
        </MapContainer>

        {isLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-card border border-border rounded-full px-3 py-1.5 shadow-md text-sm text-muted-foreground flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Yuklanmoqda...
          </div>
        )}
      </div>
    </div>
  );
}
