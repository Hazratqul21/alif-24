import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null | undefined) {
  if (!price) return null;
  return new Intl.NumberFormat("uz-UZ").format(price) + " so'm";
}

const MONTHS_UZ = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}-${MONTHS_UZ[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function getBookTypeBadge(type: string) {
  if (type === "sell") return { label: "Sotiladi", color: "bg-amber-100 text-amber-800 border-amber-200" };
  if (type === "free") return { label: "Bepul", color: "bg-teal-100 text-teal-800 border-teal-200" };
  if (type === "rent") return { label: "Vaqtincha", color: "bg-blue-100 text-blue-800 border-blue-200" };
  return { label: type, color: "bg-gray-100 text-gray-700" };
}
