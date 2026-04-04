import { useState, useEffect, useCallback, useRef } from "react";

// ─── FRUIT DEFINITIONS ───────────────────────────────────────────
const FRUIT_DEFS = [
    { em: "🍎", name: "Olma", color: "#ff6b6b", shadow: "#c0392b" },
    { em: "🍊", name: "Apelsin", color: "#ff9f43", shadow: "#d68910" },
    { em: "🍉", name: "Tarvuz", color: "#1dd1a1", shadow: "#10ac84" },
    { em: "🍋", name: "Limon", color: "#f9ca24", shadow: "#c5a300" },
    { em: "🍇", name: "Uzum", color: "#a29bfe", shadow: "#6c5ce7" },
    { em: "🍓", name: "Qulupnay", color: "#fd79a8", shadow: "#e84393" },
    { em: "🍑", name: "Shaftoli", color: "#fdcb6e", shadow: "#e17055" },
    { em: "🍒", name: "Gilos", color: "#e17055", shadow: "#c0392b" },
    { em: "🫐", name: "Ko'k rezavor", color: "#74b9ff", shadow: "#2d3436" },
    { em: "🍍", name: "Ananas", color: "#55efc4", shadow: "#00b894" },
];

const FRUIT_SETS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 9], [1, 3, 9],
    [2, 6, 9], [0, 5, 7], [1, 6, 8], [3, 7, 9], [0, 2, 9], [4, 6, 8], [1, 5, 9],
];


// ─── PUZZLE GENERATORS ───────────────────────────────────────────
function rnd(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── 26 ta SAVOL SHABLONI — aynan 2 amal, barcha operator turlari ──
const ALL_Q = [
    // + va -
    (A, B, C, a, b, c) => ({ t: `${A}+${B}-${C}`, v: a + b - c, ok: a + b > c }),
    (A, B, C, a, b, c) => ({ t: `${B}-${C}+${A}`, v: b - c + a, ok: b > c }),
    (A, B, C, a, b, c) => ({ t: `${A}+${C}-${B}`, v: a + c - b, ok: a + c > b }),
    // + va ×
    (A, B, C, a, b, c) => ({ t: `${A}×${B}+${C}`, v: a * b + c }),
    (A, B, C, a, b, c) => ({ t: `${A}+${B}×${C}`, v: a + b * c }),
    (A, B, C, a, b, c) => ({ t: `${B}×${C}+${A}`, v: b * c + a }),
    (A, B, C, a, b, c) => ({ t: `2×${A}+${B}`, v: 2 * a + b }),
    (A, B, C, a, b, c) => ({ t: `${A}×2+${C}`, v: a * 2 + c }),
    // - va ×
    (A, B, C, a, b, c) => ({ t: `${A}×${B}-${C}`, v: a * b - c, ok: a * b > c }),
    (A, B, C, a, b, c) => ({ t: `${B}×${C}-${A}`, v: b * c - a, ok: b * c > a }),
    (A, B, C, a, b, c) => ({ t: `${A}×${C}-${B}`, v: a * c - b, ok: a * c > b }),
    // + va ÷
    (A, B, C, a, b, c) => b % c === 0 ? ({ t: `${B}÷${C}+${A}`, v: b / c + a }) : null,
    (A, B, C, a, b, c) => a % c === 0 ? ({ t: `${A}÷${C}+${B}`, v: a / c + b }) : null,
    (A, B, C, a, b, c) => (a * b) % c === 0 ? ({ t: `${A}×${B}÷${C}`, v: a * b / c }) : null,
    // - va ÷
    (A, B, C, a, b, c) => (b % c === 0 && b / c > a) ? ({ t: `${B}÷${C}-${A}`, v: b / c - a }) : null,
    (A, B, C, a, b, c) => (b * c) % a === 0 ? ({ t: `${B}×${C}÷${A}`, v: b * c / a }) : null,
    // qavslar + ×
    (A, B, C, a, b, c) => ({ t: `(${A}+${B})×${C}`, v: (a + b) * c }),
    (A, B, C, a, b, c) => ({ t: `(${B}+${C})×${A}`, v: (b + c) * a }),
    (A, B, C, a, b, c) => ({ t: `${A}×(${B}+${C})`, v: a * (b + c) }),
    // qavslar - ×
    (A, B, C, a, b, c) => ({ t: `(${B}-${C})×${A}`, v: (b - c) * a, ok: b > c }),
    (A, B, C, a, b, c) => ({ t: `(${A}-${C})×${B}`, v: (a - c) * b, ok: a > c }),
    (A, B, C, a, b, c) => ({ t: `${C}×(${A}-${B})`, v: c * (a - b), ok: a > b }),
    // qavslar ÷
    (A, B, C, a, b, c) => (a + b) % c === 0 ? ({ t: `(${A}+${B})÷${C}`, v: (a + b) / c }) : null,
    (A, B, C, a, b, c) => ((b - c) > 0 && (b - c) % a === 0) ? ({ t: `(${B}-${C})÷${A}`, v: (b - c) / a }) : null,
    (A, B, C, a, b, c) => (a * b) % c === 0 ? ({ t: `(${A}×${B})÷${C}`, v: a * b / c }) : null,
    (A, B, C, a, b, c) => (a * c) % b === 0 ? ({ t: `(${A}×${C})÷${B}`, v: a * c / b }) : null,
];

function buildQ(fruits, va, vb, vc) {
    const [A, B, C] = [fruits[0].em, fruits[1].em, fruits[2].em];
    const shuffled = [...ALL_Q].sort(() => Math.random() - 0.5);
    for (const fn of shuffled) {
        try {
            const r = fn(A, B, C, va, vb, vc);
            if (!r) continue;
            if (r.ok === false) continue;
            if (!Number.isFinite(r.v) || !Number.isInteger(r.v)) continue;
            if (r.v <= 0 || r.v > 500) continue;
            return { text: r.t + " = ?", ans: r.v };
        } catch (e) { continue; }
    }
    return { text: `${fruits[0].em}+${fruits[1].em}+${fruits[2].em} = ?`, ans: va + vb + vc };
}

// ── EASY (1-25): 3A, A+2B, B-C ─────────────────────────────────
function easyPuzzle(fruits) {
    let va, vb, vc, t = 0;
    do { va = rnd(4, 8); vb = rnd(2, 6); vc = rnd(1, 4); t++; if (t > 500) break; }
    while (va === vb || vb === vc || va === vc || vb <= vc || va <= vb);
    const q = buildQ(fruits, va, vb, vc);
    return {
        clues: [
            { parts: [{ fruit: fruits[0], n: 3 }], result: 3 * va },
            { parts: [{ fruit: fruits[0], n: 1 }, { fruit: fruits[1], n: 2 }], result: va + 2 * vb },
            { parts: [], eq: `${fruits[1].em} - ${fruits[2].em}`, result: vb - vc, minus: true },
        ],
        question: { parts: [], text: q.text }, answer: q.ans,
        values: { [fruits[0].em]: va, [fruits[1].em]: vb, [fruits[2].em]: vc },
    };
}

// ── MEDIUM (26-50): 2A, A+B, A+C+B ─────────────────────────────
function mediumPuzzle(fruits) {
    let va, vb, vc, t = 0;
    do { va = rnd(5, 9); vb = rnd(2, 7); vc = rnd(2, 6); t++; if (t > 500) break; }
    while (va === vb || vb === vc || va === vc || vb <= vc || va <= vb);
    const q = buildQ(fruits, va, vb, vc);
    return {
        clues: [
            { parts: [{ fruit: fruits[0], n: 2 }], result: 2 * va },
            { parts: [{ fruit: fruits[0], n: 1 }, { fruit: fruits[1], n: 1 }], result: va + vb },
            { parts: [{ fruit: fruits[0], n: 1 }, { fruit: fruits[2], n: 1 }, { fruit: fruits[1], n: 1 }], result: va + vc + vb },
        ],
        question: { parts: [], text: q.text }, answer: q.ans,
        values: { [fruits[0].em]: va, [fruits[1].em]: vb, [fruits[2].em]: vc },
    };
}

// ── HARD (51-75): A²+A, 2A+B, B-C ──────────────────────────────
function hardPuzzle(fruits) {
    let va, vb, vc, t = 0;
    do { va = rnd(3, 6); vb = rnd(5, 9); vc = rnd(1, vb - 1); t++; if (t > 500) break; }
    while (va === vb || va === vc || vb === vc);
    const q = buildQ(fruits, va, vb, vc);
    return {
        clues: [
            { parts: [], eq: `${fruits[0].em}×${fruits[0].em}+${fruits[0].em}`, result: va * va + va },
            { parts: [{ fruit: fruits[0], n: 2 }, { fruit: fruits[1], n: 1 }], result: 2 * va + vb },
            { parts: [], eq: `${fruits[1].em}-${fruits[2].em}`, result: vb - vc, minus: true },
        ],
        question: { parts: [], text: q.text }, answer: q.ans,
        values: { [fruits[0].em]: va, [fruits[1].em]: vb, [fruits[2].em]: vc },
    };
}

// ── EXPERT (76-100): A², B²-A, A+B+C ───────────────────────────
function expertPuzzle(fruits) {
    let va, vb, vc, t = 0;
    do { va = rnd(2, 5); vb = rnd(4, 8); vc = rnd(2, 6); t++; if (t > 500) break; }
    while (va === vb || vb === vc || va === vc || vb <= vc);
    const q = buildQ(fruits, va, vb, vc);
    return {
        clues: [
            { parts: [], eq: `${fruits[0].em}×${fruits[0].em}`, result: va * va },
            { parts: [], eq: `${fruits[1].em}×${fruits[1].em}-${fruits[0].em}`, result: vb * vb - va },
            { parts: [{ fruit: fruits[0], n: 1 }, { fruit: fruits[1], n: 1 }, { fruit: fruits[2], n: 1 }], result: va + vb + vc },
        ],
        question: { parts: [], text: q.text }, answer: q.ans,
        values: { [fruits[0].em]: va, [fruits[1].em]: vb, [fruits[2].em]: vc },
    };
}

function generateLevel(levelNum) {
    const setIdx = Math.floor((levelNum - 1) / 10) % FRUIT_SETS.length;
    const fruits = FRUIT_SETS[setIdx].map(i => FRUIT_DEFS[i]);
    let puzzle;
    if (levelNum <= 25) puzzle = easyPuzzle(fruits);
    else if (levelNum <= 50) puzzle = mediumPuzzle(fruits);
    else if (levelNum <= 75) puzzle = hardPuzzle(fruits);
    else puzzle = expertPuzzle(fruits);
    const { answer } = puzzle;
    const spread = Math.max(4, Math.floor(answer * 0.3));
    const wrongs = new Set();
    let tries = 0;
    while (wrongs.size < 3 && tries < 300) {
        const d = rnd(-spread, spread), w = answer + d;
        if (w > 0 && w !== answer && !wrongs.has(w)) wrongs.add(w);
        tries++;
    }
    return { ...puzzle, fruits, options: [answer, ...wrongs].sort(() => Math.random() - 0.5) };
}

// ─── FRUIT PILE COMPONENT ─────────────────────────────────────────
function FruitPile({ fruit, count, label, size = 52 }) {
    const [tapped, setTapped] = useState([]);
    const total = tapped.length;

    const toggleTap = (i) => {
        setTapped(prev =>
            prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
        );
    };

    // layout: stack like real fruits
    const positions = [];
    const cols = Math.min(count, 3);
    for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const rowOffset = row % 2 === 1 ? (size * 0.35) : 0;
        positions.push({
            x: col * (size * 0.72) + rowOffset,
            y: -row * (size * 0.45),
        });
    }

    const maxX = Math.max(...positions.map(p => p.x)) + size;
    const maxY = size - Math.min(...positions.map(p => p.y));
    const minY = Math.min(...positions.map(p => p.y));

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {label && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: 1 }}>
                    {label}
                </div>
            )}
            <div style={{ position: "relative", width: maxX, height: maxY + 8 }}>
                {positions.map((pos, i) => {
                    const isTapped = tapped.includes(i);
                    return (
                        <div
                            key={i}
                            onClick={() => toggleTap(i)}
                            style={{
                                position: "absolute",
                                left: pos.x,
                                bottom: pos.y - minY,
                                width: size,
                                height: size,
                                fontSize: size * 0.78,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer",
                                transform: isTapped ? "scale(1.18) translateY(-5px)" : "scale(1)",
                                transition: "all 0.18s ease",
                                zIndex: i + 1,
                                filter: isTapped
                                    ? `drop-shadow(0 0 6px #22c55e) drop-shadow(0 3px 6px rgba(0,0,0,0.4)) brightness(1.15)`
                                    : `drop-shadow(0 3px 5px rgba(0,0,0,0.35))`,
                            }}
                        >
                            {fruit.em}
                            {isTapped && (
                                <span style={{
                                    position: "absolute",
                                    top: -8, right: -4,
                                    background: "#22c55e",
                                    color: "white",
                                    borderRadius: "50%",
                                    width: 18, height: 18,
                                    fontSize: 10, fontWeight: 800,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                                }}>✓</span>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* count display */}
        </div>
    );
}

// ─── CLUE ROW ─────────────────────────────────────────────────────
function ClueRow({ clue }) {
    const hasPiles = clue.parts && clue.parts.length > 0 && !clue.minus;

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(255,255,255,0.05)", borderRadius: 14,
            padding: "10px 14px", marginBottom: 7,
            border: "1px solid rgba(255,255,255,0.08)",
            flexWrap: "wrap", gap: 8,
        }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
                {hasPiles ? clue.parts.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                        {i > 0 && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18, paddingBottom: 6 }}>+</span>}
                        <FruitPile fruit={p.fruit} count={p.n} size={42} />
                    </div>
                )) : (
                    <span style={{ color: "white", fontSize: 20, letterSpacing: 1 }}>{clue.eq}</span>
                )}
            </div>
            <span style={{ color: "#fbbf24", fontWeight: 900, fontSize: 20, whiteSpace: "nowrap" }}>
                = {clue.result}
            </span>
        </div>
    );
}

// ─── VISUAL QUESTION ─────────────────────────────────────────────
function VisualQuestion({ puzzle, revealed }) {
    // For easy puzzles, show real fruit piles
    const { question, fruits, values } = puzzle;
    const hasParts = question.parts && question.parts.length > 0;

    return (
        <div style={{
            background: "linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.05))",
            border: "2px solid rgba(251,191,36,0.3)", borderRadius: 16,
            padding: "14px", textAlign: "center", marginTop: 4,
        }}>
            <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: 2 }}>❓ SAVOL</div>

            {hasParts ? (
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, flexWrap: "wrap", minHeight: 90 }}>
                    {question.parts.map((p, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                            {i > 0 && <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 22, paddingBottom: 8 }}>+</span>}
                            <FruitPile fruit={p.fruit} count={p.n} size={48} />
                        </div>
                    ))}
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 22, paddingBottom: 8 }}>=</span>
                    <div style={{
                        width: 50, height: 50, borderRadius: "50%",
                        background: "rgba(255,255,255,0.1)",
                        border: "2px dashed rgba(251,191,36,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24, color: "#fbbf24", fontWeight: 900,
                    }}>?</div>
                </div>
            ) : (
                <div style={{ color: "white", fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>{question.text}</div>
            )}
        </div>
    );
}

// ─── STARS / HELPERS ─────────────────────────────────────────────
const TOTAL = 100;
const getDiff = (l) =>
    l <= 25 ? { label: "Oson", color: "#22c55e", bg: "rgba(34,197,94,0.15)" }
        : l <= 50 ? { label: "O'rta", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" }
            : l <= 75 ? { label: "Qiyin", color: "#f97316", bg: "rgba(249,115,22,0.15)" }
                : { label: "Ustoz", color: "#a855f7", bg: "rgba(168,85,247,0.15)" };

const Stars = ({ count }) => (
    <span>{[...Array(3)].map((_, i) => (
        <span key={i} style={{ color: i < count ? "#fbbf24" : "rgba(255,255,255,0.18)", fontSize: 14 }}>★</span>
    ))}</span>
);

// ─── MAIN APP ─────────────────────────────────────────────────────
export default function App() {
    const [screen, setScreen] = useState("home");
    const [level, setLevel] = useState(1);
    const [puzzle, setPuzzle] = useState(null);
    const [selected, setSelected] = useState(null);
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(40);
    const [timerOn, setTimerOn] = useState(false);
    const [results, setResults] = useState({});
    const [streak, setStreak] = useState(0);
    const [parts, setParts] = useState([]);
    const [hint, setHint] = useState(false);

    const mt = (l) => Math.max(20, 45 - Math.floor(l / 10) * 3);
    const unlocked = Math.min(Math.max(...Object.keys(results).map(Number), 0) + 1, TOTAL);
    const totalStars = Object.values(results).reduce((a, b) => a + b, 0);
    const done = Object.keys(results).length;

    const startLevel = useCallback((l) => {
        setPuzzle(generateLevel(l));
        setLevel(l); setSelected(null); setAnswered(false); setHint(false);
        setTimeLeft(mt(l)); setTimerOn(true); setScreen("game");
    }, []);

    useEffect(() => {
        if (!timerOn || answered) return;
        if (timeLeft <= 0) { doAnswer(null); return; }
        const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
        return () => clearTimeout(t);
    }, [timeLeft, timerOn, answered]);

    const boom = () => {
        const ps = [...Array(16)].map((_, i) => ({
            id: Date.now() + i, x: 5 + Math.random() * 90,
            e: ["🎉", "⭐", "✨", "🌟", "💫", "🎊", "🍎", "🍊", "🍉"][i % 9],
            d: Math.random() * 0.6,
        }));
        setParts(ps); setTimeout(() => setParts([]), 2200);
    };

    const doAnswer = (opt) => {
        if (answered) return;
        setTimerOn(false); setSelected(opt); setAnswered(true);
        const ok = opt === puzzle.answer;
        const mtime = mt(level);
        const pts = ok ? 10 + Math.floor((timeLeft / mtime) * 10) : 0;
        const stars = ok ? (timeLeft > mtime * 0.65 ? 3 : timeLeft > mtime * 0.3 ? 2 : 1) : 0;
        if (ok) { boom(); setStreak(s => s + 1); } else setStreak(0);
        setScore(s => s + pts);
        setResults(prev => ({ ...prev, [level]: Math.max(prev[level] || 0, stars) }));
    };

    const mtime = mt(level);
    const diff = getDiff(level);

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0c29 0%,#1a1060 40%,#24243e 100%)", fontFamily: "'Nunito','Segoe UI',sans-serif", position: "relative", overflowX: "hidden" }}>
            {[...Array(4)].map((_, i) => (
                <div key={i} style={{ position: "fixed", borderRadius: "50%", pointerEvents: "none", width: 100 + i * 70, height: 100 + i * 70, background: `radial-gradient(circle,rgba(${i % 2 ? "139,92,246" : "99,102,241"},0.06) 0%,transparent 70%)`, top: `${8 + i * 20}%`, left: `${-8 + i * 25}%`, animation: `fbg ${5 + i}s ease-in-out infinite alternate` }} />
            ))}
            {parts.map(p => (
                <div key={p.id} style={{ position: "fixed", left: `${p.x}%`, top: "30%", fontSize: 24, zIndex: 9999, animation: `fly 1.8s ease-out ${p.d}s forwards`, pointerEvents: "none", opacity: 0 }}>{p.e}</div>
            ))}

            <style>{`
        @keyframes fbg{from{transform:translateY(0)}to{transform:translateY(-22px)}}
        @keyframes fly{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-200px) scale(0.2)}}
        @keyframes pop{from{transform:scale(0.82);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes up{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes shk{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}60%{transform:translateX(10px)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
        @keyframes glow{0%,100%{box-shadow:0 0 12px rgba(251,191,36,0.25)}50%{box-shadow:0 0 30px rgba(251,191,36,0.65)}}
        .ob:hover:not(:disabled){transform:translateY(-4px) scale(1.04)!important;filter:brightness(1.12)}
        .ob:active:not(:disabled){transform:scale(0.96)!important}
        .lb:hover:not(:disabled){transform:scale(1.1)!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:4px}
      `}</style>

            <div style={{ maxWidth: 460, margin: "0 auto", padding: "14px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

                {/* HOME */}
                {screen === "home" && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, animation: "up .5s ease" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 68, animation: "pulse 2.5s ease-in-out infinite", lineHeight: 1 }}>🧠</div>
                            <div style={{ color: "#818cf8", fontSize: 11, letterSpacing: 5, textTransform: "uppercase", marginTop: 8 }}>alif24.uz</div>
                            <h1 style={{ color: "white", fontSize: 30, fontWeight: 900, margin: "4px 0 0", lineHeight: 1.15 }}>
                                Mantiqiy<br />
                                <span style={{ background: "linear-gradient(90deg,#fbbf24,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Matematika</span>
                            </h1>
                            <p style={{ color: "#94a3b8", fontSize: 13, margin: "6px 0 0" }}>Mevalarni sanaб, masalalarni yeching!</p>
                        </div>

                        {/* fruit preview */}
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            {FRUIT_DEFS.slice(0, 5).map((f, i) => (
                                <span key={i} style={{ fontSize: 32, filter: "drop-shadow(1px 3px 4px rgba(0,0,0,0.4))", animation: `pulse ${2 + i * 0.3}s ease-in-out ${i * 0.2}s infinite` }}>{f.em}</span>
                            ))}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, width: "100%" }}>
                            {[{ icon: "🎯", val: `${done}/100`, label: "Daraja" }, { icon: "⭐", val: totalStars, label: "Yulduz" }, { icon: "💎", val: score, label: "Ball" }].map(s => (
                                <div key={s.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 15, padding: "13px 7px", textAlign: "center", border: "1px solid rgba(255,255,255,0.07)" }}>
                                    <div style={{ fontSize: 22 }}>{s.icon}</div>
                                    <div style={{ color: "white", fontWeight: 900, fontSize: 18 }}>{s.val}</div>
                                    <div style={{ color: "#64748b", fontSize: 10 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setScreen("levelSelect")} style={{ width: "100%", padding: "16px", borderRadius: 17, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1e1b4b", fontSize: 17, fontWeight: 900, letterSpacing: 1, animation: "glow 2.5s ease-in-out infinite" }}>
                            🚀 O'YINNI BOSHLASH
                        </button>
                        {done > 0 && (
                            <button onClick={() => startLevel(unlocked)} style={{ width: "100%", padding: "12px", borderRadius: 13, border: "2px solid rgba(255,255,255,0.13)", background: "transparent", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                                ▶ Davom ettirish — Daraja {unlocked}
                            </button>
                        )}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                            {[["🌱 1-25", "#22c55e"], ["🔥 26-50", "#f59e0b"], ["⚡ 51-75", "#f97316"], ["👑 76-100", "#a855f7"]].map(([l, c]) => (
                                <span key={l} style={{ background: `${c}22`, color: c, border: `1px solid ${c}44`, borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>{l}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* LEVEL SELECT */}
                {screen === "levelSelect" && (
                    <div style={{ animation: "up .4s ease" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16, marginTop: 4 }}>
                            <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,0.09)", border: "none", borderRadius: 11, width: 36, height: 36, cursor: "pointer", fontSize: 16, color: "white" }}>←</button>
                            <div>
                                <h2 style={{ color: "white", margin: 0, fontSize: 19, fontWeight: 800 }}>Darajalar</h2>
                                <div style={{ color: "#64748b", fontSize: 11 }}>{done}/100 tugatildi · {totalStars} ⭐</div>
                            </div>
                        </div>
                        {[
                            { label: "🌱 Oson", color: "#22c55e", range: [1, 25] },
                            { label: "🔥 O'rta", color: "#f59e0b", range: [26, 50] },
                            { label: "⚡ Qiyin", color: "#f97316", range: [51, 75] },
                            { label: "👑 Ustoz", color: "#a855f7", range: [76, 100] },
                        ].map(sec => (
                            <div key={sec.label} style={{ marginBottom: 16 }}>
                                <div style={{ color: sec.color, fontWeight: 800, fontSize: 13, marginBottom: 7 }}>{sec.label}</div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
                                    {[...Array(sec.range[1] - sec.range[0] + 1)].map((_, i) => {
                                        const l = sec.range[0] + i, st = results[l] || 0, locked = l > unlocked;
                                        return (
                                            <button key={l} className="lb" disabled={locked} onClick={() => startLevel(l)} style={{ aspectRatio: "1", borderRadius: 12, border: "none", cursor: locked ? "not-allowed" : "pointer", background: locked ? "rgba(255,255,255,0.03)" : st > 0 ? `linear-gradient(135deg,${sec.color}44,${sec.color}22)` : "rgba(255,255,255,0.08)", color: locked ? "rgba(255,255,255,0.13)" : "white", fontSize: 12, fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, transition: "all .16s", border: st > 0 ? `2px solid ${sec.color}55` : "2px solid transparent" }}>
                                                {locked ? "🔒" : <><span>{l}</span>{st > 0 && <span style={{ fontSize: 8 }}>{"★".repeat(st)}{"☆".repeat(3 - st)}</span>}</>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* GAME */}
                {screen === "game" && puzzle && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 11, animation: "up .3s ease" }}>

                        {/* header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 2 }}>
                            <button onClick={() => { setTimerOn(false); setScreen("levelSelect"); }} style={{ background: "rgba(255,255,255,0.09)", border: "none", borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 15, color: "white" }}>←</button>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ color: "#fbbf24", fontWeight: 900, fontSize: 16 }}>Daraja {level}</div>
                                <div style={{ background: diff.bg, color: diff.color, borderRadius: 20, padding: "1px 9px", fontSize: 10, fontWeight: 700, display: "inline-block" }}>{diff.label}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>💎 {score}</div>
                                {streak > 1 && <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 700 }}>🔥 {streak}!</div>}
                            </div>
                        </div>

                        {/* timer */}
                        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 9, padding: "6px 11px", display: "flex", alignItems: "center", gap: 9 }}>
                            <span style={{ color: "#64748b", fontSize: 11 }}>⏱</span>
                            <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.09)", borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 99, transition: "width 1s linear, background .4s", width: `${(timeLeft / mtime) * 100}%`, background: timeLeft > mtime * .5 ? "#22c55e" : timeLeft > mtime * .25 ? "#fbbf24" : "#ef4444" }} />
                            </div>
                            <span style={{ color: timeLeft <= 5 ? "#ef4444" : "white", fontWeight: 900, fontSize: 16, minWidth: 22, textAlign: "right" }}>{timeLeft}</span>
                        </div>

                        {/* puzzle */}
                        <div style={{ background: "rgba(255,255,255,0.055)", borderRadius: 20, padding: "16px 14px", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(18px)", animation: "pop .35s ease" }}>
                            {hint && (
                                <div style={{ display: "flex", gap: 7, marginBottom: 11, flexWrap: "wrap" }}>
                                    {Object.entries(puzzle.values).map(([em, v]) => (
                                        <span key={em} style={{ background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.28)", borderRadius: 9, padding: "3px 9px", color: "#fbbf24", fontSize: 14, fontWeight: 700 }}>
                                            {em} = {v}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div style={{ color: "#475569", fontSize: 11, fontWeight: 600, marginBottom: 11, textAlign: "center" }}>
                                🔍 Har bir mevaning qiymatini aniqlab, savolga javob bering
                            </div>

                            {puzzle.clues.map((cl, i) => (
                                <ClueRow key={i} clue={cl} />
                            ))}

                            <VisualQuestion puzzle={puzzle} />
                        </div>

                        {/* options */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {puzzle.options.map((opt, i) => {
                                const sel = selected === opt, ok = opt === puzzle.answer;
                                const showOk = answered && ok, showBad = answered && sel && !ok;
                                return (
                                    <button key={i} className="ob" disabled={answered} onClick={() => doAnswer(opt)} style={{ padding: "16px 10px", borderRadius: 15, border: `2px solid ${showOk ? "#22c55e" : showBad ? "#ef4444" : "rgba(255,255,255,0.1)"}`, background: showOk ? "linear-gradient(135deg,#14532d,#166534)" : showBad ? "linear-gradient(135deg,#7f1d1d,#991b1b)" : "rgba(255,255,255,0.07)", color: "white", fontSize: 25, fontWeight: 900, cursor: answered ? "default" : "pointer", transition: "all .17s", animation: showBad ? "shk .4s ease" : showOk ? "pop .3s ease" : "none" }}>
                                        {showOk ? "✅ " : showBad ? "❌ " : ""}{opt}
                                    </button>
                                );
                            })}
                        </div>

                        {!answered && !hint && (
                            <button onClick={() => { setHint(true); setScore(s => Math.max(0, s - 3)); }} style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 10, padding: "8px", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                💡 Maslahat ko'rish (−3 ball)
                            </button>
                        )}

                        {answered && (
                            <div style={{ background: selected === puzzle.answer ? "rgba(34,197,94,0.09)" : "rgba(239,68,68,0.09)", border: `1px solid ${selected === puzzle.answer ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)"}`, borderRadius: 17, padding: "13px", textAlign: "center", animation: "pop .3s ease" }}>
                                {selected === puzzle.answer ? (
                                    <><div style={{ fontSize: 28 }}>🎉</div><div style={{ color: "#22c55e", fontWeight: 900, fontSize: 17 }}>To'g'ri javob!</div><div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>+{10 + Math.floor((timeLeft / mtime) * 10)} ball · <Stars count={timeLeft > mtime * .65 ? 3 : timeLeft > mtime * .3 ? 2 : 1} /></div></>
                                ) : (
                                    <><div style={{ fontSize: 28 }}>😔</div><div style={{ color: "#ef4444", fontWeight: 900, fontSize: 17 }}>Noto'g'ri!</div>
                                        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>To'g'ri javob: <strong style={{ color: "#fbbf24", fontSize: 17 }}>{puzzle.answer}</strong></div>
                                        <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 7, flexWrap: "wrap" }}>
                                            {Object.entries(puzzle.values).map(([em, v]) => (
                                                <span key={em} style={{ background: "rgba(251,191,36,0.14)", borderRadius: 7, padding: "2px 7px", color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>{em}={v}</span>
                                            ))}
                                        </div></>
                                )}
                                <button onClick={() => { if (level < TOTAL) startLevel(level + 1); else setScreen("result"); }} style={{ marginTop: 11, width: "100%", padding: "12px", borderRadius: 13, border: "none", background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1e1b4b", fontSize: 15, fontWeight: 900, cursor: "pointer" }}>
                                    {level < TOTAL ? "Keyingi daraja →" : "🏆 Tugatish!"}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* RESULT */}
                {screen === "result" && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, animation: "up .5s ease" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 74, animation: "pulse 1.5s ease-in-out infinite" }}>🏆</div>
                            <h1 style={{ color: "#fbbf24", fontSize: 30, fontWeight: 900, margin: 0 }}>Barakalla!</h1>
                            <p style={{ color: "#94a3b8", fontSize: 14 }}>Barcha 100 darajani tugatdingiz!</p>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, width: "100%" }}>
                            {[{ icon: "💎", val: score, label: "Jami ball" }, { icon: "⭐", val: totalStars, label: "Jami yulduz" }, { icon: "🎯", val: done, label: "Daraja" }, { icon: "🔥", val: streak, label: "Eng zanjir" }].map(s => (
                                <div key={s.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 17, padding: "16px", textAlign: "center" }}>
                                    <div style={{ fontSize: 28 }}>{s.icon}</div>
                                    <div style={{ color: "white", fontWeight: 900, fontSize: 24 }}>{s.val}</div>
                                    <div style={{ color: "#64748b", fontSize: 11 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => { setScore(0); setResults({}); setStreak(0); setScreen("home"); }} style={{ width: "100%", padding: 16, borderRadius: 17, border: "none", background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1e1b4b", fontSize: 17, fontWeight: 900, cursor: "pointer" }}>
                            🔄 Qayta boshlash
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}