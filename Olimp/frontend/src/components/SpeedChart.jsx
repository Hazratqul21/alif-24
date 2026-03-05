import { motion } from 'framer-motion';

export default function SpeedChart({ dailyResults }) {
    if (!dailyResults || dailyResults.length === 0) return null;

    // Process data to calculate WPM
    const data = dailyResults
        .filter(d => d.status === 'completed' && d.reading_time_seconds > 0)
        .map(d => {
            const wpm = Math.round((d.words_read || 0) / (d.reading_time_seconds / 60));
            return {
                title: d.title,
                wpm: wpm,
                day: d.day,
                id: d.id || Math.random() // keys
            };
        });

    if (data.length === 0) return null;

    const maxWpm = Math.max(...data.map(d => d.wpm), 100); // Minimum 100 as boundary

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800/80 border border-gray-800 rounded-2xl p-5 mt-6 shadow-lg">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                <span className="text-blue-400">⚡</span> O'qish Tezligi Dinamikasi (WPM)
            </h3>
            <div className="h-48 flex items-end gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900/50">
                {data.map((item, idx) => {
                    const heightPct = Math.max((item.wpm / maxWpm) * 100, 5);
                    return (
                        <div key={idx} className="flex-shrink-0 flex flex-col items-center w-12 sm:w-16 group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-900 text-blue-100 text-xs py-1 px-2 rounded-lg whitespace-nowrap z-10 pointer-events-none border border-blue-500/30 shadow-xl">
                                <span className="font-bold text-white">{item.wpm}</span> WPM
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-900"></div>
                            </div>

                            {/* Bar Container */}
                            <div className="w-full flex justify-center items-end h-32 bg-gray-800/40 rounded-t-xl relative border-x border-t border-white/5 group-hover:bg-gray-800/60 transition-colors">
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: `${heightPct}%`, opacity: 1 }}
                                    transition={{ duration: 1, delay: idx * 0.1, type: 'spring', bounce: 0.4 }}
                                    className={`w-6 sm:w-10 rounded-t-lg shadow-[0_0_15px_rgba(59,130,246,0.5)] ${item.wpm >= 80 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' :
                                            item.wpm >= 50 ? 'bg-gradient-to-t from-blue-600 to-blue-400' :
                                                'bg-gradient-to-t from-amber-600 to-amber-400'
                                        }`}
                                ></motion.div>
                            </div>

                            {/* Label */}
                            <div className="text-[10px] text-gray-500 mt-3 truncate w-full text-center group-hover:text-white transition-colors">
                                {item.title?.substring(0, 10)}{item.title?.length > 10 ? '...' : ''} <br />
                                <span className="opacity-50 text-[8px] uppercase">{item.day}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-gray-500 text-[10px] sm:text-xs mt-6 text-center italic bg-gray-900/50 py-2 rounded-lg">WPM = Words per minute (Daqiqasiga o'qilgan so'zlar soni)</p>
        </div>
    );
}
