import { useState, useEffect, useRef, useCallback } from "react";

const WORD_DATA = [
    { word: "olma", syllables: ["ol", "ma"], emoji: "🍎" },
    { word: "bola", syllables: ["bo", "la"], emoji: "👦" },
    { word: "tomchi", syllables: ["tom", "chi"], emoji: "💧" },
    { word: "kalit", syllables: ["ka", "lit"], emoji: "🔑" },
    { word: "dengiz", syllables: ["den", "giz"], emoji: "🌊" },
    { word: "shamol", syllables: ["sha", "mol"], emoji: "💨" },
    { word: "bahor", syllables: ["ba", "hor"], emoji: "🌸" },
    { word: "yurak", syllables: ["yu", "rak"], emoji: "❤️" },
    { word: "quyosh", syllables: ["qu", "yosh"], emoji: "☀️" },
    { word: "yulduz", syllables: ["yul", "duz"], emoji: "⭐" },
    { word: "bulut", syllables: ["bu", "lut"], emoji: "☁️" },
    { word: "yomg'ir", syllables: ["yom", "g'ir"], emoji: "🌧️" },
    { word: "mushuk", syllables: ["mu", "shuk"], emoji: "🐱" },
    { word: "kuchuk", syllables: ["ku", "chuk"], emoji: "🐶" },
    { word: "baliq", syllables: ["ba", "liq"], emoji: "🐟" },
    { word: "tovuq", syllables: ["to", "vuq"], emoji: "🐔" },
    { word: "burgut", syllables: ["bur", "gut"], emoji: "🦅" },
    { word: "sigir", syllables: ["si", "gir"], emoji: "🐄" },
    { word: "cho'chqa", syllables: ["cho'ch", "qa"], emoji: "🐷" },
    { word: "bedana", syllables: ["be", "da", "na"], emoji: "🥚" },
    { word: "limon", syllables: ["li", "mon"], emoji: "🍋" },
    { word: "uzum", syllables: ["u", "zum"], emoji: "🍇" },
    { word: "anor", syllables: ["a", "nor"], emoji: "🍓" },
    { word: "tarvuz", syllables: ["tar", "vuz"], emoji: "🍉" },
    { word: "sabzi", syllables: ["sab", "zi"], emoji: "🥕" },
    { word: "piyoz", syllables: ["pi", "yoz"], emoji: "🧅" },
    { word: "bodring", syllables: ["bod", "ring"], emoji: "🥒" },
    { word: "daraxti", syllables: ["da", "raxt"], emoji: "🌳" },
    { word: "olcha", syllables: ["ol", "cha"], emoji: "🍒" },
    { word: "temir", syllables: ["te", "mir"], emoji: "⚙️" },
    { word: "qovoq", syllables: ["qo", "voq"], emoji: "🎃" },
    { word: "gilos", syllables: ["gi", "los"], emoji: "🍒" },
    { word: "taom", syllables: ["ta", "om"], emoji: "🍲" },
    { word: "qo'ng'iz", syllables: ["qo'ng'", "iz"], emoji: "🐞" },
    { word: "o'rmon", syllables: ["o'r", "mon"], emoji: "🌲" },
    { word: "asal", syllables: ["a", "sal"], emoji: "🍯" },
    { word: "qoʻzi", syllables: ["qoʻ", "zi", "choq"], emoji: "🐑" },
    { word: "kartoshka", syllables: ["kar", "tosh", "ka"], emoji: "🥔" },
    { word: "pomidor", syllables: ["po", "mi", "dor"], emoji: "🍅" },
    { word: "kapalak", syllables: ["ka", "pa", "lak"], emoji: "🦋" },
    { word: "bolalar", syllables: ["bo", "la", "lar"], emoji: "👧👦" },
    { word: "kitobim", syllables: ["ki", "to", "bim"], emoji: "📚" },
    { word: "qushcha", syllables: ["qush", "cha"], emoji: "🐦" },
    { word: "mashina", syllables: ["ma", "shi", "na"], emoji: "🚗" },
    { word: "muzqaymoq", syllables: ["muz", "qay", "moq"], emoji: "🍦" },
    { word: "oshxona", syllables: ["osh", "xo", "na"], emoji: "🍳" },
    { word: "chiroyli", syllables: ["chi", "roy", "li"], emoji: "✨" },
    { word: "sevimli", syllables: ["se", "vim", "li"], emoji: "💖" },
    { word: "shaftoli", syllables: ["shaf", "to", "li"], emoji: "🍑" },
    { word: "yashil", syllables: ["ya", "shil"], emoji: "🌿" },
    { word: "sariq", syllables: ["sa", "riq"], emoji: "🟡" },
    { word: "qizil", syllables: ["qi", "zil"], emoji: "🔴" },
    { word: "quyon", syllables: ["qu", "yon"], emoji: "🐰" },
    { word: "timsoh", syllables: ["tim", "soh"], emoji: "🐊" },
    { word: "ayiq", syllables: ["a", "yiq"], emoji: "🐻" },
    { word: "maymun", syllables: ["may", "mun"], emoji: "🐒" },
    { word: "koptok", syllables: ["kop", "tok"], emoji: "⚽" },
    { word: "asalari", syllables: ["a", "sa", "la", "ri"], emoji: "🐝" },
    { word: "kalamush", syllables: ["ka", "la", "mush"], emoji: "🐭" },
    { word: "toshbaqa", syllables: ["tosh", "ba", "qa"], emoji: "🐢" },
    { word: "jirafа", syllables: ["ji", "ra", "fa"], emoji: "🦒" },
    { word: "pingvin", syllables: ["ping", "vin"], emoji: "🐧" },
    { word: "qo'ng'iroq", syllables: ["qo'n", "g'i", "roq"], emoji: "🔔" },
    { word: "raketa", syllables: ["ra", "ke", "ta"], emoji: "🚀" },
    { word: "samolyot", syllables: ["sa", "mo", "lyot"], emoji: "✈️" },
    { word: "koʻprik", syllables: ["koʻp", "rik"], emoji: "🌉" },
    { word: "bozor", syllables: ["bo", "zor"], emoji: "🏪" },
    { word: "dono", syllables: ["do", "no"], emoji: "🦉" },
    { word: "o'qituvchi", syllables: ["o'", "qi", "tuv", "chi"], emoji: "👩‍🏫" },
    { word: "shifokor", syllables: ["shi", "fo", "kor"], emoji: "👨‍⚕️" },
    { word: "haydovchi", syllables: ["hay", "dov", "chi"], emoji: "🧑‍✈️" },
    { word: "quruvchi", syllables: ["qu", "ruv", "chi"], emoji: "👷" },
    { word: "kutubxona", syllables: ["ku", "tub", "xo", "na"], emoji: "📖" },
    { word: "television", syllables: ["te", "le", "vi", "zor"], emoji: "📺" },
    { word: "kompyuter", syllables: ["komp", "yu", "ter"], emoji: "💻" },
    { word: "velosiped", syllables: ["ve", "lo", "si", "ped"], emoji: "🚲" },
    { word: "matematika", syllables: ["ma", "te", "ma", "ti", "ka"], emoji: "🔢" },
    { word: "bayroq", syllables: ["bay", "roq"], emoji: "🇺🇿" },
    { word: "harorat", syllables: ["ha", "ro", "rat"], emoji: "🌡️" },
    { word: "muhandis", syllables: ["mu", "han", "dis"], emoji: "👷" },
    { word: "laboratoriya", syllables: ["la", "bo", "ra", "to", "ri", "ya"], emoji: "🔬" },
    { word: "astronomiya", syllables: ["as", "tro", "no", "mi", "ya"], emoji: "🌟" },
    { word: "biologiya", syllables: ["bi", "o", "lo", "gi", "ya"], emoji: "🧬" },
    { word: "informatika", syllables: ["in", "for", "ma", "ti", "ka"], emoji: "💾" },
    { word: "tabriklayman", syllables: ["tab", "rik", "lay", "man"], emoji: "🎉" },
    { word: "sehrli", syllables: ["sehr", "li"], emoji: "🪄" },
    { word: "qahramon", syllables: ["qah", "ra", "mon"], emoji: "🦸" },
    { word: "ajdaho", syllables: ["aj", "da", "ho"], emoji: "🐉" },
    { word: "kosmos", syllables: ["kos", "mos"], emoji: "🌌" },
    { word: "olmos", syllables: ["ol", "mos"], emoji: "💎" },
    { word: "oltin", syllables: ["ol", "tin"], emoji: "🏅" },
    { word: "kumush", syllables: ["ku", "mush"], emoji: "🥈" },
    { word: "qalqon", syllables: ["qal", "qon"], emoji: "🛡️" },
    { word: "sovg'a", syllables: ["sov", "g'a"], emoji: "🎁" },
    { word: "kema", syllables: ["ke", "ma"], emoji: "🚢" },
    { word: "poyezd", syllables: ["po", "yezd"], emoji: "🚂" },
    { word: "avtobus", syllables: ["av", "to", "bus"], emoji: "🚌" },
    { word: "parovoz", syllables: ["pa", "ro", "voz"], emoji: "🚂" },
    { word: "gʻijjak", syllables: ["gʻij", "jak"], emoji: "🎻" },
    { word: "dutor", syllables: ["gi", "ta", "ra"], emoji: "🎸" },
    { word: "kungaboqar", syllables: ["kun", "ga", "bo", "qar"], emoji: "🌻" },
    { word: "maktab", syllables: ["mak", "tab"], emoji: "🏫" },
    { word: "kasalxona", syllables: ["ka", "sal", "xo", "na"], emoji: "🏥" },
    { word: "mehmonxona", syllables: ["meh", "mon", "xo", "na"], emoji: "🏨" },
    { word: "do'kon", syllables: ["do'", "kon"], emoji: "🏬" },
    { word: "hovuz", syllables: ["ho", "vuz"], emoji: "🏊" },
    { word: "stadion", syllables: ["sta", "di", "on"], emoji: "🏟️" },
    { word: "ko'cha", syllables: ["ko'", "cha"], emoji: "🛣️" },
];

function getLevelConfig(level) {
    const syllableTarget = Math.min(2 + Math.floor((level - 1) / 20), 5);
    const distractors = Math.min(Math.floor((level - 1) / 15), 4);
    const hasTimer = level > 10;
    const timeLimit = hasTimer ? Math.max(30000 - (level - 11) * 220, 10000) : null;
    const wordsPerLevel = Math.min(3 + Math.floor(level / 25), 6);
    return { syllableTarget, distractors, hasTimer, timeLimit, wordsPerLevel };
}

function calcScore(errors, timeTaken, level, timeLimit) {
    const base = 200 + level * 8;
    const errorPenalty = errors * 40;
    let speedBonus = 0;
    if (timeLimit && timeTaken < timeLimit) {
        speedBonus = Math.floor(((timeLimit - timeTaken) / timeLimit) * 150);
    }
    return Math.max(10, base - errorPenalty + speedBonus);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getWordsForLevel(level) {
    const cfg = getLevelConfig(level);
    const matching = WORD_DATA.filter(w => Math.abs(w.syllables.length - cfg.syllableTarget) <= 1);
    return matching.length > 0 ? matching : WORD_DATA;
}

function getDistractors(correctSyllables, count) {
    const allSyllables = WORD_DATA.flatMap(w => w.syllables);
    const unique = [...new Set(allSyllables)].filter(s => !correctSyllables.includes(s));
    return shuffle(unique).slice(0, count);
}

const TILE_PALETTE = [
    { bg: "#4f46e5", text: "#fff", border: "#6366f1" },
    { bg: "#0891b2", text: "#fff", border: "#06b6d4" },
    { bg: "#059669", text: "#fff", border: "#10b981" },
    { bg: "#d97706", text: "#fff", border: "#f59e0b" },
    { bg: "#db2777", text: "#fff", border: "#ec4899" },
    { bg: "#7c3aed", text: "#fff", border: "#8b5cf6" },
    { bg: "#dc2626", text: "#fff", border: "#ef4444" },
    { bg: "#0284c7", text: "#fff", border: "#0ea5e9" },
    { bg: "#65a30d", text: "#fff", border: "#84cc16" },
    { bg: "#c2410c", text: "#fff", border: "#f97316" },
];

const FUN_CORRECT = ["🎉 Zo'r!", "🌟 Ajoyib!", "🔥 Harika!", "💪 Barakalla!", "🎊 Yasha!", "🏆 A'lo!", "✨ Mukammal!"];
const FUN_WRONG = ["😅 Qayta urining!", "💪 Kuch bering!", "🤔 O'ylab ko'ring!", "😊 Yana bir marta!"];

function LivesDisplay({ lives, max = 3 }) {
    return (
        <div className="flex gap-1">
            {Array.from({ length: max }).map((_, i) => (
                <span key={i} className={`text-xl transition-all duration-300 ${i < lives ? "opacity-100" : "opacity-20 grayscale"}`}>
                    ⭐
                </span>
            ))}
        </div>
    );
}

function PoolTile({ syllable, onClick, used, palette }) {
    return (
        <button
            onClick={() => !used && onClick(syllable)}
            disabled={used}
            className="relative px-4 py-3 rounded-2xl font-black text-lg select-none transition-all duration-200"
            style={{
                minWidth: 54,
                letterSpacing: "0.05em",
                background: used ? "rgba(255,255,255,0.08)" : palette.bg,
                color: used ? "rgba(255,255,255,0.2)" : palette.text,
                border: `2px solid ${used ? "transparent" : palette.border}`,
                cursor: used ? "not-allowed" : "pointer",
                transform: used ? "scale(0.88)" : undefined,
                boxShadow: used ? "none" : `0 2px 8px ${palette.bg}55`,
                opacity: used ? 0.4 : 1,
            }}
        >
            {syllable}
        </button>
    );
}

function PlacedTile({ syllable, onClick, revealed, isCorrect }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-3 rounded-2xl font-black text-lg select-none transition-all duration-300 cursor-pointer"
            style={{
                minWidth: 54,
                border: "2px solid",
                background: revealed
                    ? isCorrect ? "#059669" : "#dc2626"
                    : "#ffffff",
                color: revealed ? "#fff" : "#1e293b",
                borderColor: revealed
                    ? isCorrect ? "#10b981" : "#ef4444"
                    : "#cbd5e1",
                boxShadow: revealed ? "none" : "0 2px 6px rgba(0,0,0,0.08)",
                transform: revealed && isCorrect ? "scale(1.05)" : undefined,
            }}
        >
            {syllable}
        </button>
    );
}

function EmptySlot() {
    return (
        <div
            className="px-4 py-3 rounded-2xl flex items-center justify-center transition-all duration-200"
            style={{
                minWidth: 54,
                minHeight: 54,
                border: "2px dashed rgba(99,102,241,0.35)",
                background: "rgba(99,102,241,0.06)",
            }}
        >
            <span style={{ color: "rgba(99,102,241,0.4)", fontSize: 20 }}>?</span>
        </div>
    );
}

export default function BoghinQuruvchi() {
    const [level, setLevel] = useState(() => { try { return Math.max(1, parseInt(localStorage.getItem("bq_level") || "1")); } catch { return 1; } });
    const [bestScore, setBestScore] = useState(() => { try { return parseInt(localStorage.getItem("bq_best") || "0"); } catch { return 0; } });

    const [phase, setPhase] = useState("home");
    const [wordData, setWordData] = useState(null);
    const [poolTiles, setPoolTiles] = useState([]);
    const [placed, setPlaced] = useState([]);
    const [usedPool, setUsedPool] = useState(new Set());
    const [errors, setErrors] = useState(0);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [wordsDone, setWordsDone] = useState(0);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [timeLeft, setTimeLeft] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [scorePopup, setScorePopup] = useState(null);
    const [tilePalettes, setTilePalettes] = useState([]);
    const [funText, setFunText] = useState("");
    const [confetti, setConfetti] = useState([]);
    const [usedWordIndices, setUsedWordIndices] = useState([]);

    const timerRef = useRef(null);
    const cfg = getLevelConfig(level);

    useEffect(() => { try { localStorage.setItem("bq_level", String(level)); } catch { } }, [level]);

    const triggerConfetti = useCallback(() => {
        const pieces = Array.from({ length: 18 }, (_, i) => ({
            id: i,
            emoji: ["🎉", "⭐", "🌟", "💫", "✨", "🎊", "🏆", "🎈", "🌈", "💎"][i % 10],
            x: Math.random() * 100,
            delay: Math.random() * 0.5,
        }));
        setConfetti(pieces);
        setTimeout(() => setConfetti([]), 2000);
    }, []);

    const generateRound = useCallback(() => {
        const pool = getWordsForLevel(level);
        const availableIndices = pool.map((w, i) => i).filter(i => !usedWordIndices.includes(WORD_DATA.indexOf(pool[i])));
        if (availableIndices.length === 0) { setUsedWordIndices([]); }
        const finalIndices = availableIndices.length > 0 ? availableIndices : pool.map((_, i) => i);
        const picked = finalIndices[Math.floor(Math.random() * finalIndices.length)];
        const word = pool[picked];
        const globalIdx = WORD_DATA.indexOf(word);
        setUsedWordIndices(prev => [...prev, globalIdx]);

        const distractorSylls = getDistractors(word.syllables, cfg.distractors);
        const allTiles = shuffle([...word.syllables, ...distractorSylls]);
        const palettes = allTiles.map((_, i) => TILE_PALETTE[i % TILE_PALETTE.length]);

        setWordData(word);
        setPoolTiles(allTiles);
        setPlaced(new Array(word.syllables.length).fill(null));
        setUsedPool(new Set());
        setErrors(0);
        setFeedback(null);
        setTilePalettes(palettes);
        setStartTime(Date.now());
        setFunText("");

        if (cfg.timeLimit) setTimeLeft(cfg.timeLimit);
        else setTimeLeft(null);
        setPhase("playing");
    }, [level, cfg.distractors, cfg.timeLimit, usedWordIndices]);

    useEffect(() => {
        if (phase !== "playing" || !cfg.hasTimer || timeLeft === null) { clearInterval(timerRef.current); return; }
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 100) { clearInterval(timerRef.current); handleTimeout(); return 0; }
                return prev - 100;
            });
        }, 100);
        return () => clearInterval(timerRef.current);
    }, [phase, cfg.hasTimer]);

    const handleTimeout = useCallback(() => {
        clearInterval(timerRef.current);
        setErrors(e => e + 2);
        setFunText("⏰ Vaqt tugadi!");
        setLives(prev => {
            const next = prev - 1;
            if (next <= 0) setTimeout(() => setPhase("gameover"), 1500);
            return next;
        });
        setFeedback({ correct: false, timedOut: true });
        setPhase("feedback");
    }, []);

    const placeSyllable = useCallback((poolIndex) => {
        if (phase !== "playing") return;
        if (usedPool.has(poolIndex)) return;
        const emptySlot = placed.findIndex(s => s === null);
        if (emptySlot === -1) return;
        const newPlaced = [...placed];
        newPlaced[emptySlot] = { syllable: poolTiles[poolIndex], poolIndex };
        setPlaced(newPlaced);
        setUsedPool(prev => new Set([...prev, poolIndex]));
    }, [phase, usedPool, placed, poolTiles]);

    const removePlaced = useCallback((slotIndex) => {
        if (phase !== "playing") return;
        const item = placed[slotIndex];
        if (!item) return;
        const newPlaced = [...placed];
        newPlaced[slotIndex] = null;
        setPlaced(newPlaced);
        setUsedPool(prev => { const next = new Set(prev); next.delete(item.poolIndex); return next; });
    }, [phase, placed]);

    const checkAnswer = useCallback(() => {
        if (phase !== "playing") return;
        if (placed.some(s => s === null)) return;
        clearInterval(timerRef.current);

        const userAnswer = placed.map(p => p.syllable);
        const correct = wordData.syllables;
        const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correct);
        const timeTaken = Date.now() - startTime;
        setTotalAttempts(p => p + 1);

        if (isCorrect) {
            setTotalCorrect(p => p + 1);
            const pts = calcScore(errors, timeTaken, level, cfg.timeLimit);
            setScore(prev => {
                const next = prev + pts;
                if (next > bestScore) { setBestScore(next); try { localStorage.setItem("bq_best", String(next)); } catch { } }
                return next;
            });
            setScorePopup({ val: pts, id: Date.now() });
            setFunText(FUN_CORRECT[Math.floor(Math.random() * FUN_CORRECT.length)]);
            setFeedback({ correct: true, slots: userAnswer.map(() => true) });
            triggerConfetti();
        } else {
            const newErr = errors + 1;
            setErrors(newErr);
            setFunText(FUN_WRONG[Math.floor(Math.random() * FUN_WRONG.length)]);
            setFeedback({ correct: false, slots: userAnswer.map((s, i) => s === correct[i]) });
            setLives(prev => { const next = prev - 1; if (next <= 0) setTimeout(() => setPhase("gameover"), 1800); return next; });
        }
        setTimeout(() => setPhase("feedback"), 300);
    }, [phase, placed, wordData, errors, level, cfg.timeLimit, startTime, bestScore, triggerConfetti]);

    const nextWord = useCallback(() => {
        if (lives <= 0) { setPhase("gameover"); return; }
        const newDone = wordsDone + 1;
        setWordsDone(newDone);
        if (newDone >= cfg.wordsPerLevel) setPhase("levelup");
        else generateRound();
    }, [lives, wordsDone, cfg.wordsPerLevel, generateRound]);

    const advanceLevel = () => { if (level < 100) setLevel(l => l + 1); setWordsDone(0); generateRound(); };
    const startGame = () => { setScore(0); setLives(3); setWordsDone(0); setTotalCorrect(0); setTotalAttempts(0); setUsedWordIndices([]); generateRound(); };
    const goHome = () => { clearInterval(timerRef.current); setPhase("home"); };

    useEffect(() => () => clearInterval(timerRef.current), []);

    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const timerPct = (cfg.timeLimit && timeLeft !== null) ? timeLeft / cfg.timeLimit : 1;
    const timerColor = timerPct > 0.6 ? "#10b981" : timerPct > 0.3 ? "#f59e0b" : "#ef4444";

    const BG = "linear-gradient(160deg, #1e1b4b 0%, #312e81 35%, #1e3a5f 65%, #0f172a 100%)";
    const CARD_BG = "rgba(255,255,255,0.95)";
    const CARD_BORDER = "rgba(99,102,241,0.18)";
    const POOL_BG = "rgba(255,255,255,0.07)";
    const POOL_BORDER = "rgba(255,255,255,0.15)";

    const cardStyle = {
        background: CARD_BG,
        border: `1.5px solid ${CARD_BORDER}`,
        borderRadius: 24,
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center pb-10"
            style={{ background: BG, fontFamily: "'Fredoka One', 'Trebuchet MS', cursive", position: "relative", overflow: "hidden" }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');
        @keyframes bounceIn { 0%{transform:scale(0) rotate(-10deg);opacity:0} 60%{transform:scale(1.18) rotate(3deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes wiggle { 0%,100%{transform:rotate(0) scale(1)} 25%{transform:rotate(-8deg) scale(1.08)} 75%{transform:rotate(8deg) scale(1.08)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-9px)} 40%{transform:translateX(9px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes scoreFloat { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-80px) scale(1.5)} }
        @keyframes confettiFall { 0%{opacity:1;transform:translateY(-20px) rotate(0deg) scale(1)} 100%{opacity:0;transform:translateY(100vh) rotate(720deg) scale(0.5)} }
        @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.5)} 50%{box-shadow:0 0 0 14px rgba(99,102,241,0)} }
        @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .bq-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.68,-0.55,0.265,1.55) forwards; }
        .bq-slide-up { animation: slideUp 0.38s ease-out forwards; }
        .bq-shake { animation: shake 0.4s ease; }
        .bq-score-float { animation: scoreFloat 1.4s ease-out forwards; }
        .bq-rainbow-txt {
          background: linear-gradient(90deg,#818cf8,#a78bfa,#c084fc,#f472b6,#fb923c,#facc15,#34d399,#818cf8);
          background-size: 250%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradShift 4s linear infinite;
        }
        .bq-btn-play {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
          box-shadow: 0 6px 28px rgba(99,102,241,0.45);
          animation: pulseRing 2.5s infinite;
        }
        .bq-btn-play:hover { filter: brightness(1.08); }
        .bq-btn-play:active { transform: scale(0.96); }
        .bq-btn-next {
          background: linear-gradient(135deg, #059669, #0284c7);
          color: #fff;
          box-shadow: 0 4px 18px rgba(5,150,105,0.35);
        }
        .bq-btn-next:hover { filter: brightness(1.08); }
        .bq-btn-next:active { transform: scale(0.96); }
      `}</style>

            {confetti.map(p => (
                <div key={p.id} style={{ position: "fixed", left: `${p.x}%`, top: 0, fontSize: "2rem", zIndex: 999, animation: `confettiFall 1.8s ease-out ${p.delay}s forwards`, pointerEvents: "none" }}>
                    {p.emoji}
                </div>
            ))}

            <div className="w-full max-w-lg px-4 pt-4 pb-3 sticky top-0 z-10"
                style={{ background: "rgba(15,23,42,0.88)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                <div className="flex items-center justify-between mb-2">
                    <button onClick={goHome} className="flex items-center gap-2">
                        <span className="text-3xl" style={{ animation: phase === "home" ? "wiggle 2s ease-in-out infinite" : "none" }}>🧩</span>
                        <div className="flex flex-col leading-none">
                            <span style={{ color: "#a5b4fc", fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>BO'G'IN PAZL</span>
                        </div>
                    </button>
                    {phase !== "home" && <LivesDisplay lives={lives} />}
                </div>

                {phase !== "home" && (
                    <div className="flex items-center justify-between rounded-2xl px-4 py-2"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div className="flex flex-col items-center">
                            <span style={{ color: "#fbbf24", fontWeight: 900, fontSize: 15 }}>{score.toLocaleString()}</span>
                            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Ball</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span style={{ color: "#e2e8f0", fontWeight: 900, fontSize: 15 }}>Daraja {level}</span>
                            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{wordsDone}/{cfg.wordsPerLevel} so'z</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span style={{ color: "#fbbf24", fontWeight: 900, fontSize: 15 }}>🏆 {bestScore.toLocaleString()}</span>
                            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Rekord</span>
                        </div>
                        {cfg.hasTimer && timeLeft !== null && phase === "playing" && (
                            <div className="flex flex-col items-center">
                                <span style={{ color: timerColor, fontWeight: 900, fontSize: 15 }}>⏱️ {Math.ceil(timeLeft / 1000)}s</span>
                            </div>
                        )}
                    </div>
                )}

                {phase === "playing" && cfg.hasTimer && timeLeft !== null && (
                    <div className="mt-2 w-full rounded-full overflow-hidden" style={{ height: 8, background: "rgba(255,255,255,0.1)" }}>
                        <div style={{ width: `${timerPct * 100}%`, height: "100%", background: timerColor, borderRadius: 99, transition: "width 0.1s linear, background 0.3s" }} />
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg px-4 gap-5 pt-5">

                {phase === "home" && (
                    <div className="flex flex-col items-center gap-6 w-full bq-slide-up">
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-8xl" style={{ animation: "wiggle 1.8s ease-in-out infinite" }}>🧩</div>
                            <h1 className="bq-rainbow-txt font-black text-4xl text-center" style={{ lineHeight: 1.1 }}>BO'G'IN QURUVCHI</h1>
                            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 17, fontWeight: 700, textAlign: "center" }}>Bo'g'inlardan so'z yasagin! 🎯</p>
                        </div>

                        <div className="flex gap-2 flex-wrap justify-center items-center rounded-3xl p-4 w-full" style={cardStyle}>
                            <div className="text-2xl">🐱</div>
                            {["mu", "shuk"].map((s, i) => (
                                <div key={i} className="px-4 py-2 rounded-xl font-black text-lg bq-bounce-in"
                                    style={{ animationDelay: `${i * 120}ms`, background: TILE_PALETTE[i].bg, color: TILE_PALETTE[i].text, border: `2px solid ${TILE_PALETTE[i].border}`, boxShadow: `0 3px 10px ${TILE_PALETTE[i].bg}55` }}>
                                    {s}
                                </div>
                            ))}
                            <div style={{ color: "#64748b", fontSize: 22, fontWeight: 900 }}>→</div>
                            <div className="px-5 py-2 rounded-xl font-black text-xl" style={{ background: "#059669", color: "#fff", border: "2px solid #10b981", boxShadow: "0 3px 12px #05996944" }}>
                                mushuk 🐱
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 w-full">
                            {[
                                { icon: "🌟", label: "Ko'r", desc: "Emojiга qara" },
                                { icon: "✋", label: "Joylashtir", desc: "Bo'g'inni bos" },
                                { icon: "✅", label: "Tekshir", desc: "Javobni ko'r" },
                            ].map((c, i) => (
                                <div key={i} className="rounded-2xl p-3 flex flex-col items-center gap-1" style={cardStyle}>
                                    <span className="text-3xl">{c.icon}</span>
                                    <span style={{ color: "#1e293b", fontWeight: 900, fontSize: 13, textAlign: "center" }}>{c.label}</span>
                                    <span style={{ color: "#64748b", fontSize: 11, textAlign: "center" }}>{c.desc}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 w-full justify-center">
                            {bestScore > 0 && (
                                <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
                                    style={{ background: "rgba(251,191,36,0.15)", border: "1.5px solid rgba(251,191,36,0.4)" }}>
                                    <span className="text-xl">🏆</span>
                                    <div>
                                        <div style={{ color: "#fbbf24", fontWeight: 900, fontSize: 15 }}>{bestScore.toLocaleString()}</div>
                                        <div style={{ color: "rgba(251,191,36,0.7)", fontSize: 11 }}>Rekord</div>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
                                style={{ background: "rgba(99,102,241,0.15)", border: "1.5px solid rgba(99,102,241,0.35)" }}>
                                <span className="text-xl">📊</span>
                                <div>
                                    <div style={{ color: "#a5b4fc", fontWeight: 900, fontSize: 15 }}>{level} / 100</div>
                                    <div style={{ color: "rgba(165,180,252,0.6)", fontSize: 11 }}>Daraja</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={startGame}
                            className="bq-btn-play w-full py-5 rounded-3xl font-black text-white text-2xl transition-all"
                        >
                            🚀 O'yinni Boshlash!
                        </button>
                    </div>
                )}

                {phase === "playing" && wordData && (
                    <div className="flex flex-col items-center gap-5 w-full bq-slide-up">
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-8xl drop-shadow-xl" style={{ animation: "bounceIn 0.5s ease, wiggle 3s ease-in-out 1s infinite" }}>
                                {wordData.emoji}
                            </div>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700 }}>
                                🔤 {wordData.syllables.length} bo'g'in
                            </div>
                        </div>

                        <div className="rounded-3xl p-4 w-full" style={{ background: "rgba(255,255,255,0.97)", border: "2px solid rgba(99,102,241,0.2)", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
                            <p style={{ textAlign: "center", color: "#94a3b8", fontWeight: 700, fontSize: 11, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                👇 Bo'g'inni bosing va joylashtiring!
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center" style={{ minHeight: 60 }}>
                                {placed.map((item, i) =>
                                    item ? (
                                        <PlacedTile key={i} syllable={item.syllable} onClick={() => removePlaced(i)} revealed={false} isCorrect={false} />
                                    ) : (
                                        <EmptySlot key={i} />
                                    )
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl p-4 w-full" style={{ background: POOL_BG, border: `1.5px solid ${POOL_BORDER}` }}>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {poolTiles.map((syll, i) => (
                                    <PoolTile
                                        key={`${syll}-${i}`}
                                        syllable={syll}
                                        onClick={() => placeSyllable(i)}
                                        used={usedPool.has(i)}
                                        palette={tilePalettes[i] || TILE_PALETTE[0]}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => { setPlaced(new Array(wordData.syllables.length).fill(null)); setUsedPool(new Set()); }}
                                className="flex-1 py-3.5 rounded-2xl font-black text-base transition-all"
                                style={{ background: "rgba(255,255,255,0.1)", color: "#e2e8f0", border: "1.5px solid rgba(255,255,255,0.18)" }}
                            >
                                ↺ Tozala
                            </button>
                            <button
                                onClick={checkAnswer}
                                disabled={placed.some(s => s === null)}
                                className="rounded-2xl font-black text-white text-lg transition-all"
                                style={{
                                    flex: "2 1 0",
                                    padding: "14px 0",
                                    background: placed.some(s => s === null) ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#4f46e5,#059669)",
                                    color: placed.some(s => s === null) ? "rgba(255,255,255,0.25)" : "#fff",
                                    border: placed.some(s => s === null) ? "1.5px solid rgba(255,255,255,0.1)" : "1.5px solid rgba(99,102,241,0.6)",
                                    cursor: placed.some(s => s === null) ? "not-allowed" : "pointer",
                                    boxShadow: placed.some(s => s === null) ? "none" : "0 4px 18px rgba(79,70,229,0.4)",
                                    animation: !placed.some(s => s === null) ? "pulseRing 2s infinite" : "none",
                                }}
                            >
                                ✓ Tekshir!
                            </button>
                        </div>
                    </div>
                )}

                {phase === "feedback" && wordData && (
                    <div className="flex flex-col items-center gap-5 w-full relative bq-slide-up">
                        {feedback?.correct && scorePopup && (
                            <div key={scorePopup.id} className="absolute top-0 left-1/2 bq-score-float pointer-events-none z-10"
                                style={{ transform: "translateX(-50%)", color: "#10b981", fontWeight: 900, fontSize: 36 }}>
                                +{scorePopup.val} 🎯
                            </div>
                        )}

                        <div className={`text-7xl ${feedback?.correct ? "bq-bounce-in" : "bq-shake"}`}>
                            {feedback?.correct ? "🎉" : feedback?.timedOut ? "⏰" : "💥"}
                        </div>

                        <div style={{ fontWeight: 900, fontSize: 22, textAlign: "center", color: feedback?.correct ? "#10b981" : "#ef4444" }}>
                            {funText}
                        </div>

                        <div className="flex flex-col items-center gap-3 rounded-3xl p-5 w-full" style={cardStyle}>
                            <span className="text-6xl">{wordData.emoji}</span>
                            <div className="flex gap-2 flex-wrap justify-center">
                                {wordData.syllables.map((syll, i) => (
                                    <div key={i} className="px-5 py-3 rounded-2xl font-black text-xl bq-bounce-in"
                                        style={{
                                            animationDelay: `${i * 100}ms`,
                                            background: feedback?.correct ? "#059669" : "#f59e0b",
                                            color: "#fff",
                                            border: `2px solid ${feedback?.correct ? "#10b981" : "#fbbf24"}`,
                                            boxShadow: `0 3px 12px ${feedback?.correct ? "#05996944" : "#f59e0b44"}`,
                                        }}>
                                        {syll}
                                    </div>
                                ))}
                            </div>
                            <div style={{ color: "#475569", fontWeight: 700, fontSize: 17 }}>
                                = <span style={{ color: "#1e293b", fontWeight: 900, fontSize: 20 }}>{wordData.word}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 w-full">
                            {[
                                { label: "Xato", val: errors === 0 ? "0 ✨" : String(errors), color: errors > 0 ? "#ef4444" : "#10b981" },
                                { label: "Ball", val: score.toLocaleString(), color: "#f59e0b" },
                                { label: "Aniqlik", val: `${accuracy}%`, color: "#6366f1" },
                            ].map((s, i) => (
                                <div key={i} className="rounded-2xl py-3 flex flex-col items-center" style={{ background: "rgba(255,255,255,0.97)", border: "1.5px solid rgba(99,102,241,0.12)" }}>
                                    <span style={{ color: s.color, fontWeight: 900, fontSize: 19 }}>{s.val}</span>
                                    <span style={{ color: "#94a3b8", fontSize: 11 }}>{s.label}</span>
                                </div>
                            ))}
                        </div>

                        {lives > 0 && (
                            <button onClick={nextWord} className="bq-btn-next w-full py-4 rounded-2xl font-black text-white text-xl transition-all">
                                Keyingi so'z →
                            </button>
                        )}
                    </div>
                )}

                {phase === "levelup" && (
                    <div className="flex flex-col items-center gap-6 w-full bq-slide-up">
                        <div className="text-8xl bq-bounce-in">🏆</div>
                        <h2 className="bq-rainbow-txt font-black text-3xl text-center">Daraja Tugadi!</h2>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            {[
                                { label: "Ball", val: score.toLocaleString(), color: "#f59e0b", icon: "🎯" },
                                { label: "Aniqlik", val: `${accuracy}%`, color: "#10b981", icon: "🎯" },
                                { label: "Daraja", val: level, color: "#a5b4fc", icon: "📊" },
                                { label: "Rekord", val: bestScore.toLocaleString(), color: "#fbbf24", icon: "🏆" },
                            ].map((s, i) => (
                                <div key={i} className="rounded-2xl py-4 flex flex-col items-center bq-bounce-in"
                                    style={{ animationDelay: `${i * 100}ms`, background: "rgba(255,255,255,0.97)", border: "1.5px solid rgba(99,102,241,0.15)" }}>
                                    <span className="text-2xl mb-1">{s.icon}</span>
                                    <span style={{ fontWeight: 900, fontSize: 22, color: s.color }}>{s.val}</span>
                                    <span style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{s.label}</span>
                                </div>
                            ))}
                        </div>

                        {level < 100 && (
                            <button onClick={advanceLevel} className="bq-btn-play w-full py-5 rounded-3xl font-black text-white text-xl transition-all">
                                Keyingi daraja → 🚀
                            </button>
                        )}
                        <button onClick={goHome} style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 700 }}>← Bosh sahifa</button>
                    </div>
                )}

                {phase === "gameover" && (
                    <div className="flex flex-col items-center gap-6 w-full bq-slide-up">
                        <div className="text-8xl bq-bounce-in">😵</div>
                        <h2 style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 34 }}>O'yin Tugadi!</h2>

                        <div className="w-full rounded-3xl p-6 flex flex-col gap-4" style={cardStyle}>
                            <div className="flex justify-between items-center pb-3" style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                                <span style={{ color: "#64748b", fontWeight: 700 }}>Yakuniy ball</span>
                                <span style={{ color: "#f59e0b", fontWeight: 900, fontSize: 30 }}>{score.toLocaleString()} 🎯</span>
                            </div>
                            {score >= bestScore && bestScore > 0 && (
                                <div style={{ textAlign: "center", color: "#10b981", fontWeight: 900, fontSize: 17 }} className="animate-pulse">🏆 Yangi Rekord!</div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Daraja", val: level, icon: "📊" },
                                    { label: "Aniqlik", val: `${accuracy}%`, icon: "🎯" },
                                    { label: "Rekord", val: bestScore.toLocaleString(), icon: "🏆" },
                                    { label: "To'g'ri javoblar", val: `${totalCorrect}/${totalAttempts}`, icon: "✅" },
                                ].map((s, i) => (
                                    <div key={i} className="flex flex-col rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                        <span style={{ color: "#94a3b8", fontSize: 12 }}>{s.icon} {s.label}</span>
                                        <span style={{ color: "#1e293b", fontWeight: 900, fontSize: 19 }}>{s.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={startGame} className="bq-btn-play w-full py-5 rounded-3xl font-black text-white text-xl transition-all">
                            🔄 Qayta O'yna!
                        </button>
                        <button onClick={goHome} style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 700 }}>← Bosh sahifa</button>
                    </div>
                )}
            </div>
        </div>
    );
}
