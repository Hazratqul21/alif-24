import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ targetDate }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!targetDate) return;

        const target = new Date(targetDate).getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const difference = target - now;

            if (difference <= 0) {
                setIsExpired(true);
                return;
            }

            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000)
            });
        };

        updateTimer();
        const timerId = setInterval(updateTimer, 1000);

        return () => clearInterval(timerId);
    }, [targetDate]);

    if (!targetDate || isExpired) return null;

    return (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-mono font-medium mt-3 w-fit">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <div className="flex items-center gap-1">
                <span className="bg-red-500/20 px-1.5 py-0.5 rounded">{String(timeLeft.days).padStart(2, '0')}</span><span className="text-red-500/50">:</span>
                <span className="bg-red-500/20 px-1.5 py-0.5 rounded">{String(timeLeft.hours).padStart(2, '0')}</span><span className="text-red-500/50">:</span>
                <span className="bg-red-500/20 px-1.5 py-0.5 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span><span className="text-red-500/50">:</span>
                <span className="bg-red-500/20 px-1.5 py-0.5 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
        </div>
    );
}
