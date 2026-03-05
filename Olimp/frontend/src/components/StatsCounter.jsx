import { useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const CountUp = ({ end, duration = 2, suffix = "" }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    useEffect(() => {
        if (!isInView) return;

        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);

            // easeOutExpo curve
            const easeOutProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setCount(Math.floor(easeOutProgress * end));

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, [end, duration, isInView]);

    return (
        <span ref={ref} className="tabular-nums">
            {count.toLocaleString('uz-UZ')}{suffix}
        </span>
    );
};

export default function StatsCounter() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 py-8 bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl"
        >
            <div className="flex flex-col items-center justify-center p-2">
                <p className="text-3xl lg:text-4xl font-black text-white mb-1"><CountUp end={1250} suffix="+" /></p>
                <p className="text-indigo-300 text-xs lg:text-sm font-medium uppercase tracking-wider">Faol O'quvchilar</p>
            </div>
            <div className="flex flex-col items-center justify-center p-2 border-l border-white/5">
                <p className="text-3xl lg:text-4xl font-black text-emerald-400 mb-1"><CountUp end={54} /></p>
                <p className="text-indigo-300 text-xs lg:text-sm font-medium uppercase tracking-wider">Olimpiadalar</p>
            </div>
            <div className="flex flex-col items-center justify-center p-2 border-t lg:border-t-0 lg:border-l border-white/5 mt-4 lg:mt-0 pt-6 lg:pt-2">
                <p className="text-3xl lg:text-4xl font-black text-amber-400 mb-1"><CountUp end={85} suffix="K" /></p>
                <p className="text-indigo-300 text-xs lg:text-sm font-medium uppercase tracking-wider">Berilgan Savollar</p>
            </div>
            <div className="flex flex-col items-center justify-center p-2 border-t lg:border-t-0 border-l border-white/5 mt-4 lg:mt-0 pt-6 lg:pt-2">
                <p className="text-3xl lg:text-4xl font-black text-purple-400 mb-1"><CountUp end={98} suffix="%" /></p>
                <p className="text-indigo-300 text-xs lg:text-sm font-medium uppercase tracking-wider">Muvaffaqiyat</p>
            </div>
        </motion.div>
    );
}
