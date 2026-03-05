import { motion } from 'framer-motion';

/**
 * SkeletonCard - Placeholder card with shimmer animation
 * Used while loading olympiad cards, task cards, etc.
 */
export function SkeletonCard({ className = '' }) {
    return (
        <div className={`relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-6 ${className}`}>
            <div className="flex items-start gap-4">
                {/* Icon placeholder */}
                <div className="w-14 h-14 rounded-xl bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                    {/* Title */}
                    <div className="h-5 bg-white/10 rounded-lg w-3/4" />
                    {/* Subtitle */}
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                    {/* Meta row */}
                    <div className="flex gap-3 pt-1">
                        <div className="h-3 bg-white/5 rounded w-16" />
                        <div className="h-3 bg-white/5 rounded w-20" />
                        <div className="h-3 bg-white/5 rounded w-12" />
                    </div>
                </div>
            </div>
            {/* Shimmer overlay */}
            <motion.div
                className="absolute inset-0 -translate-x-full"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
                }}
                animate={{ translateX: ['−100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
        </div>
    );
}

/**
 * SkeletonText - Placeholder text lines
 * @param {number} lines - Number of text lines to show
 */
export function SkeletonText({ lines = 3, className = '' }) {
    return (
        <div className={`space-y-2.5 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-3 bg-white/10 rounded"
                    style={{ width: `${Math.max(40, 100 - i * 15 - Math.random() * 20)}%` }}
                />
            ))}
        </div>
    );
}

/**
 * SkeletonGrid - Grid of skeleton cards
 * @param {number} count - Number of cards
 */
export function SkeletonGrid({ count = 4, className = '' }) {
    return (
        <div className={`grid gap-4 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

/**
 * SkeletonProfile - Skeleton for profile sections
 */
export function SkeletonProfile() {
    return (
        <div className="flex flex-col items-center gap-4 p-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-white/10" />
            {/* Name */}
            <div className="h-5 bg-white/10 rounded-lg w-32" />
            {/* Stats row */}
            <div className="flex gap-6">
                <div className="text-center space-y-2">
                    <div className="h-8 w-12 bg-white/10 rounded-lg mx-auto" />
                    <div className="h-3 w-10 bg-white/5 rounded mx-auto" />
                </div>
                <div className="text-center space-y-2">
                    <div className="h-8 w-12 bg-white/10 rounded-lg mx-auto" />
                    <div className="h-3 w-10 bg-white/5 rounded mx-auto" />
                </div>
                <div className="text-center space-y-2">
                    <div className="h-8 w-12 bg-white/10 rounded-lg mx-auto" />
                    <div className="h-3 w-10 bg-white/5 rounded mx-auto" />
                </div>
            </div>
        </div>
    );
}

/**
 * SkeletonLeaderboard - Skeleton for leaderboard rows
 */
export function SkeletonLeaderboard({ rows = 5 }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-8 h-8 bg-white/10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 rounded w-1/3" />
                        <div className="h-2.5 bg-white/5 rounded w-1/4" />
                    </div>
                    <div className="h-6 w-14 bg-white/10 rounded-lg" />
                </div>
            ))}
        </div>
    );
}
