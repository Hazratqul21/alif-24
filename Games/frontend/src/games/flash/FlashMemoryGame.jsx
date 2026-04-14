import { useState, useEffect, useCallback, useRef } from "react";

const EMOJI_POOL = [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
    "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆",
    "🦅", "🦉", "🦋", "🐛", "🐝", "🐞", "🦀", "🐙", "🦑", "🐠",
    "🐟", "🐡", "🐬", "🐳", "🦈", "🐊", "🐢", "🦎", "🐍", "🦕",
    "🍎", "🍊", "🍋", "🍇", "🍓", "🍒", "🍑", "🥝", "🍍", "🥭",
    "🌽", "🥦", "🥕", "🍆", "🥑", "🍄", "🌸", "🌺", "🌻", "🌹",
    "⭐", "🌙", "☀️", "🌈", "⚡", "🔥", "❄️", "🌊", "🍀", "🌴",
    "🎈", "🎀", "🎁", "🎯", "🎲", "🎮", "🎸", "🎺", "🎻", "🥁",
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "✈️",
    "🚀", "🛸", "⛵", "🚂", "🏠", "🏰", "🗼", "⛩️", "🎡", "🎢",
];

function getLevelConfig(level) {
    const cardCount = Math.min(2 + Math.floor((level - 1) * 0.15), 12);
    const optionCount = Math.min(cardCount + 2 + Math.floor(level * 0.08), cardCount + 6, 18);
    const showTime = Math.max(5000 - (level - 1) * 42, 800);
    return { cardCount, optionCount, showTime };
}

function calcStars(wrong, total) {
    if (wrong === 0) return 3;
    if (wrong <= Math.ceil(total * 0.25)) return 2;
    return 1;
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function Stars({ count, animated }) {
    return (
        <div className="flex gap-1 justify-center">
            {[1, 2, 3].map((i) => (
                <span
                    key={i}
                    className={`text-4xl transition-all duration-500 ${i <= count
                            ? "opacity-100 scale-110 drop-shadow-lg"
                            : "opacity-25 grayscale scale-90"
                        } ${animated && i <= count ? "animate-bounce" : ""}`}
                    style={{ animationDelay: `${i * 120}ms` }}
                >
                    ⭐
                </span>
            ))}
        </div>
    );
}

function ProgressBar({ level, maxLevel = 100 }) {
    const pct = Math.min(((level - 1) / (maxLevel - 1)) * 100, 100);
    return (
        <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #34d399, #06b6d4, #818cf8)",
                }}
            />
        </div>
    );
}

function CardTile({ emoji, revealed, onClick, state }) {
    const bgMap = {
        idle: "bg-white hover:bg-yellow-50 hover:scale-105 active:scale-95",
        correct: "bg-green-300 scale-105",
        wrong: "bg-red-300 scale-95",
        missed: "bg-orange-200 border-orange-400",
    };
    return (
        <button
            onClick={onClick}
            disabled={state !== "idle"}
            className={`
        relative rounded-2xl border-4 border-white/60 shadow-xl
        flex items-center justify-center cursor-pointer
        transition-all duration-300 select-none
        ${bgMap[state] || bgMap.idle}
        w-20 h-20 sm:w-24 sm:h-24 text-4xl sm:text-5xl
      `}
        >
            {revealed ? emoji : (
                <span className="text-2xl opacity-40">?</span>
            )}
        </button>
    );
}

export default function FlashMemoryGame() {
    const [level, setLevel] = useState(() => {
        try { return Math.max(1, parseInt(localStorage.getItem("fm_level") || "1", 10)); }
        catch { return 1; }
    });
    const [bestLevels, setBestLevels] = useState(() => {
        try { return JSON.parse(localStorage.getItem("fm_best") || "{}"); }
        catch { return {}; }
    });

    const [phase, setPhase] = useState("between");
    const [cards, setCards] = useState([]);
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [tileStates, setTileStates] = useState({});
    const [wrongCount, setWrongCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [stars, setStars] = useState(0);
    const [showFlash, setShowFlash] = useState(false);

    const timerRef = useRef(null);
    const flashRef = useRef(null);

    const cfg = getLevelConfig(level);

    useEffect(() => {
        try { localStorage.setItem("fm_level", String(level)); } catch { }
    }, [level]);

    useEffect(() => {
        try { localStorage.setItem("fm_best", JSON.stringify(bestLevels)); } catch { }
    }, [bestLevels]);

    const startRound = useCallback(() => {
        const { cardCount, optionCount, showTime } = getLevelConfig(level);
        const pool = shuffle(EMOJI_POOL);
        const correct = pool.slice(0, cardCount);
        const distractors = pool.slice(cardCount, optionCount);
        const allOptions = shuffle([...correct, ...distractors]);

        setCards(correct);
        setOptions(allOptions);
        setSelected(new Set());
        setTileStates({});
        setWrongCount(0);
        setTimeLeft(showTime);
        setTotalTime(showTime);
        setPhase("memorize");
    }, [level]);

    useEffect(() => {
        if (phase !== "memorize") return;
        clearInterval(timerRef.current);
        const interval = 50;
        timerRef.current = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= interval) {
                    clearInterval(timerRef.current);
                    setPhase("recall");
                    return 0;
                }
                return t - interval;
            });
        }, interval);
        return () => clearInterval(timerRef.current);
    }, [phase]);

    const handleSelect = useCallback((emoji) => {
        if (phase !== "recall") return;
        if (selected.has(emoji)) return;

        const isCorrect = cards.includes(emoji);
        const newSelected = new Set(selected).add(emoji);
        setSelected(newSelected);

        setTileStates((prev) => ({
            ...prev,
            [emoji]: isCorrect ? "correct" : "wrong",
        }));

        let newWrong = wrongCount;
        if (!isCorrect) {
            newWrong = wrongCount + 1;
            setWrongCount(newWrong);
            setShowFlash(true);
            clearTimeout(flashRef.current);
            flashRef.current = setTimeout(() => setShowFlash(false), 400);
        }

        const correctSelected = [...newSelected].filter((e) => cards.includes(e));
        if (correctSelected.length === cards.length) {
            setPhase("completing");
            const earnedStars = calcStars(newWrong, cards.length);
            setStars(earnedStars);
            const missedStates = {};
            cards.forEach((e) => {
                if (!newSelected.has(e)) missedStates[e] = "missed";
            });
            setTileStates((prev) => ({ ...prev, ...missedStates }));

            setBestLevels((prev) => {
                const prevStars = prev[level] || 0;
                if (earnedStars > prevStars) return { ...prev, [level]: earnedStars };
                return prev;
            });

            setTimeout(() => setPhase("result"), 600);
        }
    }, [phase, selected, cards, wrongCount, level]);

    const nextLevel = () => {
        if (level < 100) setLevel((l) => l + 1);
        setPhase("between");
    };

    const retryLevel = () => {
        setPhase("between");
    };

    const goToLevel = (l) => {
        setLevel(l);
        setPhase("between");
    };

    const timerPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
    const timerColor =
        timerPct > 60 ? "#34d399" : timerPct > 30 ? "#fbbf24" : "#f87171";

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-start overflow-auto"
            style={{
                background: showFlash
                    ? "linear-gradient(135deg, #fca5a5 0%, #fee2e2 100%)"
                    : "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0f172a 100%)",
                transition: "background 0.2s",
            }}
        >
            <div className="w-full max-w-2xl px-4 pt-6 pb-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-3xl">🧠</span>
                        <span className="text-white font-black text-xl tracking-wide">Flash xotira</span>
                    </div>
                    <div className="bg-white/10 rounded-xl px-4 py-1 text-white font-bold text-lg">
                        Level {level}
                    </div>
                </div>
                <ProgressBar level={level} />
                <div className="flex justify-between text-white/50 text-xs mt-1 px-1">
                    <span>Level 1</span>
                    <span>Level 100</span>
                </div>
            </div>

            {phase === "between" && (
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 w-full max-w-lg gap-6">
                    <div
                        className="rounded-3xl p-8 flex flex-col items-center gap-6 w-full"
                        style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
                    >
                        <span className="text-6xl animate-pulse">🧠</span>
                        <h1 className="text-white font-black text-3xl text-center">
                            Level {level}
                        </h1>
                        <div className="grid grid-cols-2 gap-3 w-full text-center">
                            <div className="bg-white/10 rounded-2xl py-3 px-2">
                                <div className="text-3xl font-black text-yellow-300">{cfg.cardCount}</div>
                                <div className="text-white/60 text-sm mt-0.5">Kartochkalar</div>
                            </div>
                            <div className="bg-white/10 rounded-2xl py-3 px-2">
                                <div className="text-3xl font-black text-cyan-300">
                                    {(cfg.showTime / 1000).toFixed(1)}s
                                </div>
                                <div className="text-white/60 text-sm mt-0.5">Ko'rish vaqti</div>
                            </div>
                        </div>
                        {bestLevels[level] && (
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-white/50 text-sm">Eng yaxshi natija</span>
                                <Stars count={bestLevels[level]} />
                            </div>
                        )}
                        <button
                            onClick={startRound}
                            className="w-full py-5 rounded-2xl text-white font-black text-2xl shadow-2xl active:scale-95 transition-transform"
                            style={{
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                boxShadow: "0 8px 32px rgba(99,102,241,0.5)",
                            }}
                        >
                            🚀 Boshlash!
                        </button>
                        {level > 1 && (
                            <button
                                onClick={() => goToLevel(1)}
                                className="text-white/40 text-sm underline hover:text-white/70 transition-colors"
                            >
                                Boshidan boshlash
                            </button>
                        )}
                    </div>
                </div>
            )}

            {phase === "memorize" && (
                <div className="flex-1 flex flex-col items-center px-4 py-6 w-full max-w-xl gap-5">
                    <div className="w-full flex flex-col gap-2">
                        <div className="flex justify-between text-white/70 text-sm font-semibold px-1">
                            <span>⏱ Eslab qol!</span>
                            <span>{(timeLeft / 1000).toFixed(1)}s</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-5 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${timerPct}%`,
                                    background: timerColor,
                                    transition: "width 0.05s linear",
                                }}
                            />
                        </div>
                    </div>

                    <div
                        className="rounded-3xl p-6 flex flex-col items-center gap-4 w-full"
                        style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}
                    >
                        <p className="text-white/70 text-base font-semibold">
                            Bu {cards.length} ta emoji ni eslab qol! 👀
                        </p>
                        <div
                            className="flex flex-wrap gap-3 justify-center"
                            style={{ maxWidth: 400 }}
                        >
                            {cards.map((emoji, i) => (
                                <div
                                    key={i}
                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white shadow-xl flex items-center justify-center text-4xl sm:text-5xl animate-bounce"
                                    style={{ animationDelay: `${i * 80}ms`, animationDuration: "0.8s" }}
                                >
                                    {emoji}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(phase === "recall" || phase === "completing") && (
                <div className="flex-1 flex flex-col items-center px-4 py-6 w-full max-w-2xl gap-5">
                    <div
                        className="rounded-3xl px-6 py-4 w-full flex flex-col items-center gap-1"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                        <p className="text-white font-black text-xl">
                            {cards.length} ta kartochkani top! 👆
                        </p>
                        <p className="text-white/50 text-sm">
                            To'g'ri: {[...selected].filter((e) => cards.includes(e)).length} / {cards.length}
                            {wrongCount > 0 && (
                                <span className="text-red-400 ml-2">❌ {wrongCount} xato</span>
                            )}
                        </p>
                    </div>

                    <div
                        className="flex flex-wrap gap-3 justify-center p-4 rounded-3xl w-full"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                        {options.map((emoji, i) => (
                            <CardTile
                                key={i}
                                emoji={emoji}
                                revealed={true}
                                state={tileStates[emoji] || "idle"}
                                onClick={() => handleSelect(emoji)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {phase === "result" && (
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 w-full max-w-lg gap-6">
                    <div
                        className="rounded-3xl p-8 flex flex-col items-center gap-6 w-full"
                        style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
                    >
                        <div className="text-6xl animate-bounce">
                            {stars === 3 ? "🎉" : stars === 2 ? "😊" : "💪"}
                        </div>
                        <h2 className="text-white font-black text-3xl">
                            {stars === 3 ? "Mukammal!" : stars === 2 ? "Zo'r!" : "Davom et!"}
                        </h2>
                        <Stars count={stars} animated={true} />

                        <div className="grid grid-cols-2 gap-3 w-full text-center">
                            <div className="bg-white/10 rounded-2xl py-3 px-2">
                                <div className="text-3xl font-black text-green-300">
                                    {[...selected].filter((e) => cards.includes(e)).length}
                                </div>
                                <div className="text-white/60 text-sm mt-0.5">To'g'ri javob</div>
                            </div>
                            <div className="bg-white/10 rounded-2xl py-3 px-2">
                                <div className={`text-3xl font-black ${wrongCount > 0 ? "text-red-300" : "text-green-300"}`}>
                                    {wrongCount}
                                </div>
                                <div className="text-white/60 text-sm mt-0.5">Xato</div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                            {level < 100 && (
                                <button
                                    onClick={nextLevel}
                                    className="w-full py-5 rounded-2xl text-white font-black text-xl shadow-2xl active:scale-95 transition-transform"
                                    style={{
                                        background: "linear-gradient(135deg, #10b981, #059669)",
                                        boxShadow: "0 8px 32px rgba(16,185,129,0.4)",
                                    }}
                                >
                                    Keyingi Level →
                                </button>
                            )}
                            <button
                                onClick={retryLevel}
                                className="w-full py-4 rounded-2xl text-white font-bold text-lg active:scale-95 transition-transform"
                                style={{ background: "rgba(255,255,255,0.1)" }}
                            >
                                🔄 Qayta urinish
                            </button>
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto pb-2">
                        <div className="flex gap-2 w-max mx-auto px-2">
                            {Array.from({ length: Math.min(level + 4, 100) }, (_, i) => i + 1)
                                .slice(Math.max(0, level - 5), level + 4)
                                .map((l) => (
                                    <button
                                        key={l}
                                        onClick={() => goToLevel(l)}
                                        className={`w-12 h-12 rounded-xl font-bold text-sm transition-all active:scale-90 ${l === level
                                                ? "bg-purple-500 text-white shadow-lg scale-110"
                                                : l < level
                                                    ? "bg-white/20 text-white/70 hover:bg-white/30"
                                                    : "bg-white/10 text-white/40 hover:bg-white/20"
                                            }`}
                                    >
                                        {l}
                                        {bestLevels[l] && (
                                            <div className="text-xs leading-none">
                                                {"⭐".repeat(bestLevels[l])}
                                            </div>
                                        )}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
