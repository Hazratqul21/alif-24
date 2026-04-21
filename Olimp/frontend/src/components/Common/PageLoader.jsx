/**
 * PageLoader — minimal loading fallback for React.lazy/Suspense.
 * Intentionally lightweight: no external deps, no layout shift.
 */
export default function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e]"
      role="status"
      aria-live="polite"
      aria-label="Sahifa yuklanmoqda"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-white/60 text-sm">Yuklanmoqda...</p>
      </div>
    </div>
  );
}
