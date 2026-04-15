import { useState } from "react";
import { Copy, Share2, Trash2, Delete, Check } from "lucide-react";

const COL_COLORS = [
    { hex: "#4CAF50", dark: "#2E7D32" },
    { hex: "#9C27B0", dark: "#6A1B9A" },
    { hex: "#FF9800", dark: "#E65100" },
    { hex: "#2196F3", dark: "#0D47A1" },
    { hex: "#FFEB3B", dark: "#F9A825" },
    { hex: "#212121", dark: "#000000" },
    { hex: "#F44336", dark: "#B71C1C" },
];

const ROW_SHAPES = ["star", "circle", "diamond", "triangle", "heart", "hexagon", "square", "square"];

const EMOJIS = [
    "🍎", "🐝", "🐱", "🐶", "🐘", "🐸", "🦒", "🏠", "🍦", "🎃",
    "🔑", "🦁", "🌙", "🌈", "🍊", "🐧", "👑", "🌹", "🌠", "🌳",
    "🎻", "🌊", "🎈", "🔋", "🍇", "🦋", "🌸", "🎸", "🎯", "🦔",
    "🦚", "🐞", "🌟", "🎨", "🧲", "🌺", "🦉", "🐙", "🧩", "🦜",
    "🌻", "🦅", "🍁", "🦦", "🔮", "🧊", "🌴", "⚓", "🦈", "🌵",
    "🗻", "🍄", "🚀", "🎭", "🎠", "💎", "🐉", "💡", "🏆", "🎵",
    "🎬", "📚", "🎲", "🔥", "💫", "🍀", "🦄", "🐬", "🦕", "🌮",
];

const LAYOUTS = {
    LATIN: [
        ["Q", "W", "E", "R", "T", "Y", "U"],
        ["I", "O", "P", "A", "S", "D", "F"],
        ["G", "H", "J", "K", "L", "Z", "X"],
        ["C", "V", "B", "N", "M", "*", "@"],
        [";", "$", "#", ".", "0", "1", "2"],
        ["3", "4", "5", "6", "7", "8", "9"],
        ["'", "/", "SPACE", ",", "ENT"],
    ],
    RU: [
        ["Й", "Ц", "У", "К", "Е", "Н", "Г"],
        ["Ш", "Щ", "З", "Ф", "Ы", "В", "А"],
        ["П", "Р", "О", "Л", "Д", "Я", "Ч"],
        ["С", "М", "И", "Т", "Ь", "Ё", "Ж"],
        ["Б", "Э", "Х", "Ю", "0", "1", "2"],
        ["3", "4", "5", "6", "7", "8", "9"],
        ["'", "/", "SPACE", ",", "ENT"],
    ],
};

const CIPHER_MAP = {};
const EMOJI_MAP = {};
const REV_EMOJI = {};
const SHAPE_COL_MAP = {};

(function () {
    let ei = 0;
    const seen = {};
    ["LATIN", "RU"].forEach(lang => {
        LAYOUTS[lang].forEach((row, ri) => {
            const shape = ROW_SHAPES[Math.min(ri, ROW_SHAPES.length - 1)];
            row.forEach((letter, ci) => {
                if (letter === "SPACE" || letter === "ENT") return;
                const key = letter.toUpperCase();
                if (!seen[key]) {
                    seen[key] = true;
                    const color = COL_COLORS[ci % COL_COLORS.length];
                    CIPHER_MAP[key] = { shape, shapeIdx: ri, colIdx: ci % COL_COLORS.length, color };
                    const em = EMOJIS[ei % EMOJIS.length];
                    EMOJI_MAP[key] = em;
                    if (!REV_EMOJI[em]) REV_EMOJI[em] = key;
                    if (!SHAPE_COL_MAP[shape]) SHAPE_COL_MAP[shape] = {};
                    SHAPE_COL_MAP[shape][ci % COL_COLORS.length] = key;
                    ei++;
                }
            });
        });
    });
    const dE = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
    "0123456789".split("").forEach((d, i) => {
        if (!CIPHER_MAP[d]) {
            CIPHER_MAP[d] = { shape: ROW_SHAPES[i % ROW_SHAPES.length], colIdx: i % COL_COLORS.length, color: COL_COLORS[i % COL_COLORS.length] };
            EMOJI_MAP[d] = dE[i]; REV_EMOJI[dE[i]] = d;
        }
    });
    CIPHER_MAP[" "] = { shape: "square", colIdx: 2, color: COL_COLORS[2] };
    EMOJI_MAP[" "] = "⬜"; REV_EMOJI["⬜"] = " ";
    CIPHER_MAP["\n"] = { shape: "square", colIdx: 6, color: COL_COLORS[6] };
    EMOJI_MAP["\n"] = "↩️"; REV_EMOJI["↩️"] = "\n";
})();

const LEVELS = [
    { word: "OY" }, { word: "KUN" }, { word: "SUV" }, { word: "TOG'" }, { word: "GUL" },
    { word: "BOL" }, { word: "YOZ" }, { word: "QOR" }, { word: "KO'Z" }, { word: "TONG" },
    { word: "OLMA" }, { word: "BOLA" }, { word: "KOSA" }, { word: "TOSH" }, { word: "DALA" },
    { word: "KINO" }, { word: "RANG" }, { word: "SOYA" }, { word: "ARRA" }, { word: "DONA" },
    { word: "YULDUZ" }, { word: "QUYOSH" }, { word: "DARYO" }, { word: "OSMON" }, { word: "KITOB" },
    { word: "MAKTAB" }, { word: "MUZQAYMOQ" }, { word: "KOMPYUTER" }, { word: "TELEFON" }, { word: "INTERNET" },
    { word: "BAHOR" }, { word: "KUZGI" }, { word: "DENGIZ" }, { word: "SHAMOL" }, { word: "DARAXT" },
    { word: "QUSHCHA" }, { word: "SANDAL" }, { word: "GILOS" }, { word: "QOVOQ" }, { word: "BODRING" },
    { word: "KURASH" }, { word: "FUTBOL" }, { word: "SUZISH" }, { word: "YUGURISH" }, { word: "SAKRASH" },
    { word: "BALIQ" }, { word: "QUYON" }, { word: "TULKI" }, { word: "AYIQ" }, { word: "ARSLON" },
    { word: "BOG'CHA" }, { word: "SINF" }, { word: "DAFTAR" }, { word: "QALAM" }, { word: "JADVAL" },
    { word: "BOZOR" }, { word: "DELFIN" }, { word: "TOG'A" }, { word: "AMMA" }, { word: "JIYAN" },
    { word: "BULUT" }, { word: "YOMGIR" }, { word: "CHAQMOQ" }, { word: "TUMAN" }, { word: "MUZLIK" },
    { word: "TILLA" }, { word: "KUMUSH" }, { word: "OLMOS" }, { word: "TEMIR" }, { word: "SHISHA" },
    { word: "UCHOQ" }, { word: "KEMA" }, { word: "POYEZD" }, { word: "VELOSIPED" }, { word: "TRAKTOR" },
    { word: "NILUFAR" }, { word: "LOLA" }, { word: "YASMIN" }, { word: "RAYHON" }, { word: "ATIRGUL" },
    { word: "DASTUR" }, { word: "KAMERA" }, { word: "EKRAN" }, { word: "BATAREYA" }, { word: "KABEL" },
    { word: "MANZARA" }, { word: "TABIAT" }, { word: "HAVOLA" }, { word: "ARXIV" }, { word: "RUXSAT" },
    { word: "MEHMON" }, { word: "OSHPAZ" }, { word: "DOKTOR" }, { word: "PILOT" }, { word: "USTOZ" },
    { word: "DARAJA" }, { word: "GALABA" }, { word: "XALQARO" }, { word: "SAYYORA" }, { word: "QAHVAXONA" },
];

function SvgShape({ shape, color, dark, size = 32 }) {
    const p = { width: size, height: size, viewBox: "0 0 36 36", style: { display: "inline-block", flexShrink: 0 } };
    const sw = "1.5";
    if (shape === "star") return <svg {...p}><polygon points="18,2 22,13 35,13 25,21 29,33 18,25 7,33 11,21 1,13 14,13" fill={color} stroke={dark} strokeWidth={sw} /></svg>;
    if (shape === "circle") return <svg {...p}><circle cx="18" cy="18" r="15" fill={color} stroke={dark} strokeWidth={sw} /></svg>;
    if (shape === "diamond") return <svg {...p}><polygon points="18,2 34,18 18,34 2,18" fill={color} stroke={dark} strokeWidth={sw} /></svg>;
    if (shape === "triangle") return <svg {...p}><polygon points="18,3 34,33 2,33" fill={color} stroke={dark} strokeWidth={sw} /></svg>;
    if (shape === "heart") return <svg {...p}><path d="M18 30C18 30 4 20 4 12C4 7 8 4 12 4C15 4 17 6 18 8C19 6 21 4 24 4C28 4 32 7 32 12C32 20 18 30 18 30Z" fill={color} stroke={dark} strokeWidth={sw} /></svg>;
    if (shape === "hexagon") return <svg {...p}><polygon points="18,2 32,10 32,26 18,34 4,26 4,10" fill={color} stroke={dark} strokeWidth={sw} /></svg>;
    return <svg {...p}><rect x="4" y="4" width="28" height="28" rx="4" fill={color} stroke={dark} strokeWidth={sw} /></svg>;
}

function findKeyPosition(char, lang) {
    const rows = LAYOUTS[lang];
    for (let ri = 0; ri < rows.length; ri++) {
        for (let ci = 0; ci < rows[ri].length; ci++) {
            if (rows[ri][ci] === char) return { ri, ci };
        }
    }
    return null;
}

function Toast({ msg }) {
    return (
        <div style={{
            position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
            background: "#0f0c29", color: "#fff", padding: "10px 22px", borderRadius: 999,
            fontWeight: 800, fontSize: 13, zIndex: 999, whiteSpace: "nowrap",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)", pointerEvents: "none",
            fontFamily: "'Nunito',sans-serif", border: "1px solid rgba(167,139,250,0.3)",
        }}>{msg}</div>
    );
}

function TopBar({ onBack, title }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)",
            padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
            borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0,
        }}>
            <button onClick={onBack} style={{
                background: "rgba(255,255,255,0.14)", border: "none", color: "#fff",
                borderRadius: 10, width: 36, height: 36, cursor: "pointer",
                fontSize: 18, fontWeight: 900, fontFamily: "'Nunito',sans-serif",
            }}>←</button>
            <h2 style={{
                color: "#fff", fontSize: 16, fontWeight: 900, flex: 1, textAlign: "center",
                margin: 0, marginRight: 36, fontFamily: "'Nunito',sans-serif",
            }}>{title}</h2>
        </div>
    );
}

function Keyboard({ lang, onLangToggle, onKey, usedKeys = {}, highlightedKeys = new Set() }) {
    const rows = LAYOUTS[lang];
    const btn = {
        height: 36, borderRadius: 9, cursor: "pointer",
        fontSize: 12, fontWeight: 900, fontFamily: "'Nunito',sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "transform .08s",
    };
    const press = e => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = "0 1px 0 #9ca3af"; };
    const release = (e, shadow) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = shadow; };

    return (
        <div style={{
            background: "rgba(20,15,60,0.72)", borderRadius: 18, padding: "10px 8px 8px",
            border: "1.5px solid rgba(255,255,255,0.13)", boxShadow: "0 4px 28px rgba(0,0,0,0.4)",
        }}>
            <div style={{ display: "grid", gridTemplateColumns: "32px repeat(7,1fr)", gap: 3, marginBottom: 5, alignItems: "center" }}>
                <button onClick={onLangToggle} style={{
                    background: "#0288D1", color: "#fff", border: "none", borderRadius: 7,
                    fontSize: 9, fontWeight: 900, cursor: "pointer", height: 22, fontFamily: "'Nunito',sans-serif",
                }}>{lang === "LATIN" ? "RU" : "EN"}</button>
                {COL_COLORS.map(c => (
                    <div key={c.hex} style={{ height: 18, borderRadius: 5, background: c.hex, border: "2px solid rgba(0,0,0,0.2)" }} />
                ))}
            </div>

            {rows.map((row, ri) => {
                const shape = ROW_SHAPES[Math.min(ri, ROW_SHAPES.length - 1)];
                const isLast = ri === rows.length - 1;

                return (
                    <div key={ri} style={{
                        display: "grid",
                        gridTemplateColumns: isLast ? "32px 1fr 1fr 3fr 1fr 1fr" : "32px repeat(7,1fr)",
                        gap: 3, marginBottom: 3, alignItems: "center",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <SvgShape shape={shape} color="#6b7280" dark="#4b5563" size={18} />
                        </div>

                        {isLast ? (
                            <>
                                {[["'", `${ri}-0`], ["/", `${ri}-1`]].map(([letter, kid]) => {
                                    const used = !!usedKeys[kid];
                                    const shadow = used ? "none" : "0 3px 0 #9ca3af";
                                    return (
                                        <button key={kid} onClick={() => onKey(letter, kid)}
                                            style={{ ...btn, background: used ? "#e5e7eb" : "white", color: used ? "#9ca3af" : "#374151", border: used ? "1.5px solid #e5e7eb" : "1.5px solid #d1d5db", boxShadow: shadow }}
                                            onMouseDown={press} onMouseUp={e => release(e, shadow)}
                                            onTouchStart={press} onTouchEnd={e => release(e, shadow)}
                                        >{letter}</button>
                                    );
                                })}
                                <button onClick={() => onKey("SPACE", "space")} style={{
                                    ...btn, background: "white", border: "1.5px solid #d1d5db",
                                    boxShadow: "0 3px 0 #9ca3af", fontSize: 9, color: "#9ca3af",
                                }} onMouseDown={press} onMouseUp={e => release(e, "0 3px 0 #9ca3af")}
                                    onTouchStart={press} onTouchEnd={e => release(e, "0 3px 0 #9ca3af")}>SPACE</button>
                                {[[",", `${ri}-5`]].map(([letter, kid]) => {
                                    const used = !!usedKeys[kid];
                                    const shadow = used ? "none" : "0 3px 0 #9ca3af";
                                    return (
                                        <button key={kid} onClick={() => onKey(letter, kid)}
                                            style={{ ...btn, background: used ? "#e5e7eb" : "white", color: used ? "#9ca3af" : "#374151", border: used ? "1.5px solid #e5e7eb" : "1.5px solid #d1d5db", boxShadow: shadow }}
                                            onMouseDown={press} onMouseUp={e => release(e, shadow)}
                                            onTouchStart={press} onTouchEnd={e => release(e, shadow)}
                                        >{letter}</button>
                                    );
                                })}
                                <button onClick={() => onKey("ENT", "ent")} style={{
                                    ...btn, background: "white", border: "1.5px solid #d1d5db",
                                    boxShadow: "0 3px 0 #9ca3af", fontSize: 14, color: "#374151",
                                }} onMouseDown={press} onMouseUp={e => release(e, "0 3px 0 #9ca3af")}
                                    onTouchStart={press} onTouchEnd={e => release(e, "0 3px 0 #9ca3af")}>↵</button>
                            </>
                        ) : (
                            row.map((letter, ci) => {
                                const kid = `${ri}-${ci}`;
                                const used = !!usedKeys[kid];
                                const hl = highlightedKeys.has(letter.toUpperCase());
                                const shadow = used ? "none" : hl ? "0 3px 0 #7c3aed" : "0 3px 0 #9ca3af";
                                return (
                                    <button key={kid} onClick={() => onKey(letter, kid)}
                                        style={{
                                            ...btn,
                                            background: used ? "#e5e7eb" : hl ? "#ede9fe" : "white",
                                            color: used ? "#9ca3af" : hl ? "#6d28d9" : "#374151",
                                            border: used ? "1.5px solid #e5e7eb" : hl ? "2px solid #7c3aed" : "1.5px solid #d1d5db",
                                            boxShadow: shadow,
                                        }}
                                        onMouseDown={press} onMouseUp={e => release(e, shadow)}
                                        onTouchStart={press} onTouchEnd={e => release(e, shadow)}
                                    >{letter}</button>
                                );
                            })
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function HomeScreen({ onGo }) {
    const cards = [
        { key: "levels", icon: "🔮", title: "Yashirin So'z", desc: "Figuralardan so'z toping!", bg: "linear-gradient(135deg,#7c3aed,#a855f7)", sh: "#5b21b6" },
        { key: "encode", icon: "✏️", title: "Yozish", desc: "Matnni shifrlang", bg: "linear-gradient(135deg,#1d4ed8,#3b82f6)", sh: "#1e40af" },
        { key: "decode", icon: "🔓", title: "Ochish", desc: "Shifrni oching", bg: "linear-gradient(135deg,#065f46,#10b981)", sh: "#064e3b" },
    ];
    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0c29,#302b63,#24243e)", display: "flex", flexDirection: "column" }}>
            <div style={{ textAlign: "center", padding: "44px 20px 28px" }}>
                <div style={{ fontSize: 56, marginBottom: 10 }}>🔐</div>
                <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 32, letterSpacing: 6, margin: 0, fontFamily: "'Nunito',sans-serif" }}>CRYPTO</h1>
                <p style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700, marginTop: 6, letterSpacing: 2, fontFamily: "'Nunito',sans-serif" }}>SHIFRLASH O'YINLARI</p>
            </div>
            <div style={{ padding: "0 20px 32px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 400, margin: "0 auto", width: "100%" }}>
                {cards.map(c => (
                    <button key={c.key} onClick={() => onGo(c.key)} style={{
                        background: c.bg, border: "none", borderRadius: 20, padding: "20px 22px",
                        display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
                        boxShadow: `0 8px 0 ${c.sh}`, fontFamily: "'Nunito',sans-serif", textAlign: "left",
                    }}
                        onMouseDown={e => { e.currentTarget.style.transform = "translateY(4px)"; e.currentTarget.style.boxShadow = `0 4px 0 ${c.sh}`; }}
                        onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 8px 0 ${c.sh}`; }}
                        onTouchStart={e => { e.currentTarget.style.transform = "translateY(4px)"; e.currentTarget.style.boxShadow = `0 4px 0 ${c.sh}`; }}
                        onTouchEnd={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 8px 0 ${c.sh}`; }}
                    >
                        <span style={{ fontSize: 42 }}>{c.icon}</span>
                        <div>
                            <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>{c.title}</div>
                            <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: 700, marginTop: 3 }}>{c.desc}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function LevelSelectScreen({ onBack, onLevel, completed }) {
    const done = Object.keys(completed).length;
    const next = (() => { for (let i = 0; i < 100; i++)if (!completed[i]) return i; return 99; })();
    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0c29,#302b63,#24243e)", display: "flex", flexDirection: "column" }}>
            <TopBar onBack={onBack} title="🔮 Yashirin So'z" />
            <div style={{ padding: "12px 14px", maxWidth: 460, margin: "0 auto", width: "100%", boxSizing: "border-box", overflowY: "auto" }}>
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "#a78bfa", fontFamily: "'Nunito',sans-serif" }}>{done} / 100 daraja</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7 }}>
                    {Array.from({ length: 100 }, (_, i) => {
                        const isDone = !!completed[i], isCur = i === next, isLocked = !isDone && !isCur;
                        return (
                            <button key={i} onClick={() => !isLocked && onLevel(i)} style={{
                                aspectRatio: "1", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 900,
                                cursor: isLocked ? "not-allowed" : "pointer", fontFamily: "'Nunito',sans-serif",
                                background: isDone ? "#4CAF50" : isCur ? "#3b82f6" : "#1e293b",
                                color: isLocked ? "#4b5563" : "#fff",
                                boxShadow: isDone ? "0 4px 0 #2E7D32" : isCur ? "0 4px 0 #1d4ed8" : "0 4px 0 #0f172a",
                                animation: isCur ? "pulse 1.5s ease-in-out infinite" : "none",
                            }}>{i + 1}</button>
                        );
                    })}
                </div>
            </div>
            <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
        </div>
    );
}

function GameScreen({ levelIdx, onBack, onComplete, totalStars, onStarChange }) {
    const lvl = LEVELS[levelIdx];
    const word = lvl.word;

    const [userAnswer, setUserAnswer] = useState([]);
    const [boxStates, setBoxStates] = useState(Array(word.length).fill("empty"));
    const [usedKeys, setUsedKeys] = useState({});
    const [showResult, setShowResult] = useState(false);
    const [resultType, setResultType] = useState("win");
    const [lang, setLang] = useState("LATIN");
    const [toast, setToast] = useState(null);

    const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

    const highlightedKeys = levelIdx < 3 ? new Set(word.split("")) : new Set();

    const handleKey = (letter, keyId) => {
        if (letter === "SPACE" || letter === "ENT") return;
        if (userAnswer.length >= word.length) return;
        const ch = letter.toUpperCase();
        const newAns = [...userAnswer, { ch, keyId }];
        setUserAnswer(newAns);
        setUsedKeys(prev => ({ ...prev, [keyId]: (prev[keyId] || 0) + 1 }));
        setBoxStates(prev => { const n = [...prev]; n[newAns.length - 1] = "filled"; return n; });
    };

    const delLetter = () => {
        if (!userAnswer.length) return;
        const last = userAnswer[userAnswer.length - 1];
        const newAns = userAnswer.slice(0, -1);
        setUserAnswer(newAns);
        setUsedKeys(prev => {
            const n = { ...prev };
            if (n[last.keyId] > 1) n[last.keyId]--; else delete n[last.keyId];
            return n;
        });
        setBoxStates(prev => { const n = [...prev]; n[newAns.length] = "empty"; return n; });
    };

    const checkAnswer = () => {
        if (userAnswer.length < word.length) { showToast("Barcha harflarni to'ldiring!"); return; }
        const ans = userAnswer.map(x => x.ch).join("");
        if (ans === word) {
            setBoxStates(Array(word.length).fill("correct"));
            onStarChange(3);
            setTimeout(() => { setResultType("win"); setShowResult(true); }, 400);
        } else {
            setBoxStates(userAnswer.map((x, i) => x.ch === word[i] ? "correct" : "wrong"));
            onStarChange(-1);
            showToast("Noto'g'ri! Qayta urinib ko'ring");
            setTimeout(() => {
                setUserAnswer([]); setUsedKeys({});
                setBoxStates(Array(word.length).fill("empty"));
            }, 900);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0c29,#302b63,#24243e)", display: "flex", flexDirection: "column", position: "relative" }}>
            <TopBar onBack={onBack} title={`Daraja ${levelIdx + 1}`} />

            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 16px", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "#a78bfa", whiteSpace: "nowrap", fontFamily: "'Nunito',sans-serif" }}>{levelIdx + 1} / 100</span>
                    <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: Math.round((levelIdx / 100) * 100) + "%", background: "linear-gradient(90deg,#4CAF50,#8BC34A)", borderRadius: 4, transition: "width .4s" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "#fbbf24", whiteSpace: "nowrap", fontFamily: "'Nunito',sans-serif" }}>⭐ {totalStars}</span>
                </div>

                <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "12px 14px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.12)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#a78bfa", letterSpacing: 2, marginBottom: 10, fontFamily: "'Nunito',sans-serif" }}>SO'ZNI TOPING</div>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "wrap", minHeight: 46 }}>
                        {word.split("").map((ch, i) => {
                            const code = CIPHER_MAP[ch]; if (!code) return null;
                            return <SvgShape key={i} shape={code.shape} color={code.color.hex} dark={code.color.dark} size={40} />;
                        })}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
                    {word.split("").map((_, i) => {
                        const state = boxStates[i], letter = userAnswer[i]?.ch || "";
                        const styles = {
                            empty: { bg: "rgba(255,255,255,0.92)", border: "2.5px solid rgba(255,255,255,0.25)", color: "#1565C0" },
                            filled: { bg: "#e3f2fd", border: "2.5px solid #0288D1", color: "#1565C0" },
                            correct: { bg: "#e8f5e9", border: "2.5px solid #4CAF50", color: "#2E7D32" },
                            wrong: { bg: "#ffebee", border: "2.5px solid #F44336", color: "#B71C1C" },
                        }[state] || { bg: "rgba(255,255,255,0.92)", border: "2.5px solid rgba(255,255,255,0.25)", color: "#1565C0" };
                        const sz = Math.max(28, Math.min(46, Math.floor(300 / word.length) - 4));
                        return (
                            <div key={i} style={{
                                width: sz, height: sz, borderRadius: 10, background: styles.bg, border: styles.border,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 20, fontWeight: 900, color: styles.color, fontFamily: "'Nunito',sans-serif",
                                transition: "all .2s", animation: state === "wrong" ? "shake .3s" : "none",
                            }}>{letter}</div>
                        );
                    })}
                </div>

                <div style={{ display: "flex", gap: 8, paddingBottom: 10 }}>
                    {[
                        { id: "del", icon: <Delete size={18} />, bg: "#EF5350", sh: "#b71c1c", fn: delLetter },
                        { id: "clr", icon: <Trash2 size={18} />, bg: "#9CA3AF", sh: "#4B5563", fn: () => { setUserAnswer([]); setUsedKeys({}); setBoxStates(Array(word.length).fill("empty")); } },
                        { id: "chk", icon: <Check size={18} />, bg: "linear-gradient(135deg,#1565C0,#0288D1)", sh: "#0d47a1", fn: checkAnswer },
                    ].map(b => (
                        <button key={b.id} onClick={b.fn} style={{
                            flex: 1, padding: "12px 4px", border: "none", borderRadius: 12,
                            fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "'Nunito',sans-serif",
                            background: b.bg, color: "#fff", boxShadow: `0 4px 0 ${b.sh}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                            onMouseDown={e => { e.currentTarget.style.transform = "translateY(3px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${b.sh}`; }}
                            onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${b.sh}`; }}
                            onTouchStart={e => { e.currentTarget.style.transform = "translateY(3px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${b.sh}`; }}
                            onTouchEnd={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${b.sh}`; }}
                        >{b.icon}</button>
                    ))}
                </div>

                <div style={{ marginBottom: 10 }}>
                    <Keyboard
                        lang={lang}
                        onLangToggle={() => setLang(l => l === "LATIN" ? "RU" : "LATIN")}
                        onKey={handleKey}
                        highlightedKeys={highlightedKeys}
                    />
                </div>
            </div>

            {showResult && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(6px)" }}>
                    <div style={{ background: "#1e1b4b", borderRadius: 24, padding: "32px 28px", textAlign: "center", maxWidth: 290, width: "90%", border: "1px solid rgba(167,139,250,0.35)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
                        <div style={{ fontSize: 60, marginBottom: 10 }}>{resultType === "win" ? "🎉" : "⏭"}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#a78bfa", marginBottom: 6, fontFamily: "'Nunito',sans-serif" }}>{resultType === "win" ? "Ajoyib!" : "O'tkazildi"}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 22, letterSpacing: 4, fontFamily: "'Nunito',sans-serif" }}>{word}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <button onClick={() => onComplete(levelIdx, true)} style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", border: "none", borderRadius: 14, padding: "13px 28px", fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "'Nunito',sans-serif", boxShadow: "0 5px 0 #5b21b6" }}>Keyingisi →</button>
                            <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", color: "#cbd5e1", border: "none", borderRadius: 14, padding: "11px 20px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>Darajalar</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast msg={toast} />}
            <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}`}</style>
        </div>
    );
}

function EncodeScreen({ onBack }) {
    const [encText, setEncText] = useState([]);
    const [lang, setLang] = useState("LATIN");
    const [toast, setToast] = useState(null);
    const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

    const handleKey = (letter) => {
        if (letter === "SPACE") setEncText(p => [...p, " "]);
        else if (letter === "ENT") setEncText(p => [...p, "\n"]);
        else setEncText(p => [...p, letter]);
    };

    const getEmojiStr = () => encText.map(l => {
        if (l === " ") return EMOJI_MAP[" "];
        if (l === "\n") return EMOJI_MAP["\n"];
        return EMOJI_MAP[l.toUpperCase()] || l;
    }).join("");

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0c29,#302b63,#24243e)", display: "flex", flexDirection: "column" }}>
            <TopBar onBack={onBack} title="✏️ Yozish" />
            <div style={{ flex: 1, padding: "10px 10px 16px", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box", overflowY: "auto" }}>
                <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", padding: "8px 10px", marginBottom: 8, height: 110, overflowY: "auto" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignContent: "flex-start", minHeight: 44 }}>
                        {encText.length === 0
                            ? <span style={{ color: "#4b5563", fontSize: 11, fontWeight: 900, alignSelf: "center", fontFamily: "'Nunito',sans-serif" }}>Figuralar bu yerda...</span>
                            : encText.map((l, i) => {
                                const key = l === " " ? " " : l === "\n" ? "\n" : l.toUpperCase();
                                const code = CIPHER_MAP[key];
                                if (l === "\n") return <div key={i} style={{ width: "100%", height: 2 }} />;
                                if (code) return <SvgShape key={i} shape={code.shape} color={code.color.hex} dark={code.color.dark} size={26} />;
                                return <span key={i} style={{ fontSize: 13, fontWeight: 900, color: "#e2e8f0" }}>{l}</span>;
                            })}
                    </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", padding: "8px 10px", marginBottom: 8, height: 100, overflowY: "auto" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 5px", alignItems: "flex-start", minHeight: 28 }}>
                        {encText.length === 0
                            ? <span style={{ color: "#4b5563", fontSize: 11, fontWeight: 900, fontFamily: "'Nunito',sans-serif" }}>Harflar bu yerda...</span>
                            : encText.map((l, i) => <span key={i} style={{ fontSize: 19, fontWeight: 900, color: "#e2e8f0", lineHeight: 1, fontFamily: "'Nunito',sans-serif" }}>{l.toUpperCase()}</span>)
                        }
                    </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {[
                        { id: "copy", icon: <Copy size={18} />, bg: "#4CAF50", fn: () => { const t = getEmojiStr().trim(); if (!t) { showToast("Avval matn yozing!"); return; } navigator.clipboard.writeText(t).then(() => showToast("Nusxa olindi!")); } },
                        { id: "share", icon: <Share2 size={18} />, bg: "#FF9800", fn: () => { const t = getEmojiStr().trim(); if (!t) { showToast("Avval matn yozing!"); return; } if (navigator.share) navigator.share({ text: t }); else navigator.clipboard.writeText(t).then(() => showToast("Messenjerga joylashtiring!")); } },
                        { id: "clear", icon: <Trash2 size={18} />, bg: "#C62828", fn: () => setEncText([]) },
                        { id: "delete", icon: <Delete size={18} />, bg: "#EF9A9A", color: "#7f1d1d", fn: () => setEncText(p => p.slice(0, -1)) },
                    ].map(b => (
                        <button key={b.id} onClick={b.fn} style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "'Nunito',sans-serif", background: b.bg, color: b.color || "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{b.icon}</button>
                    ))}
                </div>
                <Keyboard lang={lang} onLangToggle={() => setLang(l => l === "LATIN" ? "RU" : "LATIN")} onKey={handleKey} />
            </div>
            {toast && <Toast msg={toast} />}
        </div>
    );
}

function DecodeScreen({ onBack }) {
    const [shapes, setShapes] = useState([]);
    const [letters, setLetters] = useState([]);
    const [userAnswer, setUserAnswer] = useState("");
    const [toast, setToast] = useState(null);
    const [hasPasted, setHasPasted] = useState(false);
    const [lang, setLang] = useState("LATIN");
    const [usedKeys, setUsedKeys] = useState({});
    const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) { showToast("Clipboard bo'sh!"); return; }
            decodeText(text);
        } catch { showToast("Paste qilish mumkin emas!"); }
    };

    const decodeText = (input) => {
        let segs;
        try { segs = Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(input)).map(s => s.segment); }
        catch { segs = Array.from(input); }
        const newShapes = [], newLetters = [];
        for (const ch of segs) {
            if (ch === " ") {
                const sc = CIPHER_MAP[" "];
                if (sc) newShapes.push({ shape: sc.shape, color: sc.color });
                newLetters.push(" ");
            }
            else if (REV_EMOJI[ch]) {
                const d = REV_EMOJI[ch];
                const code = CIPHER_MAP[d];
                if (code) newShapes.push({ shape: code.shape, color: code.color });
                newLetters.push(d);
            }
        }
        if (newShapes.length === 0) return;
        setShapes(newShapes);
        setLetters(newLetters);
        setHasPasted(true);
        setUsedKeys({});
    };

    const handleKey = (k) => {
        if (!hasPasted) return;
        const char = k === "SPACE" ? " " : k;
        setUserAnswer(prev => prev + char);
        const pos = findKeyPosition(char, lang);
        if (pos) setUsedKeys(u => ({ ...u, [`${pos.ri}-${pos.ci}`]: (u[`${pos.ri}-${pos.ci}`] || 0) + 1 }));
    };

    const handleAction = (action) => {
        if (action === "CLR") { setUserAnswer(""); setUsedKeys({}); }
        else if (action === "DEL") {
            if (userAnswer.length > 0) {
                const lastChar = userAnswer[userAnswer.length - 1];
                setUserAnswer(prev => prev.slice(0, -1));
                const pos = findKeyPosition(lastChar, lang);
                if (pos && usedKeys[`${pos.ri}-${pos.ci}`]) {
                    setUsedKeys(u => { const nu = { ...u }; nu[`${pos.ri}-${pos.ci}`] = Math.max(0, (nu[`${pos.ri}-${pos.ci}`] || 0) - 1); return nu; });
                }
            }
        } else if (action === "ENT") {
            const correct = letters.join("").replace(/\s/g, "").toUpperCase();
            const answer = userAnswer.replace(/\s/g, "").toUpperCase();
            if (answer === correct) showToast("🎉 To'g'ri! So'z ochildi!");
            else showToast("❌ Noto'g'ri, qayta urinib ko'ring!");
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0f0c29,#302b63,#24243e)", display: "flex", flexDirection: "column" }}>
            <TopBar onBack={onBack} title="🔓 Ochish" />
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 16px", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
                <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "5px 5px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.12)", textAlign: "center", position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: "#a78bfa", letterSpacing: 2, padding: "12px 12px", fontFamily: "'Nunito',sans-serif" }}>SO'ZNI TOPING</div>
                        {!hasPasted && (
                            <button onClick={handlePaste} style={{
                                background: "#f5e8c8", border: "none", borderRadius: 10, padding: "8px",
                                cursor: "pointer", boxShadow: "0 3px 0 #c4a870", display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="#3a2a10" strokeWidth="2" strokeMiterlimit="10">
                                    <path d="M17,6c0-1.1-0.9-2-2-2s-2,0.9-2,2h-3v4h10V6H17z" />
                                    <polyline points="10,6 6,6 6,27 14,27 " />
                                    <polyline points="24,15 24,6 20,6 " />
                                    <rect x="14" y="15" width="12" height="14" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, flexWrap: "wrap", height: 90, overflowY: "auto" }}>
                        {shapes.length > 0 ? shapes.map((s, i) => s.raw ?
                            <span key={i} style={{ fontSize: 13, fontWeight: 900, color: "#e2e8f0" }}>{s.raw}</span> :
                            <SvgShape key={i} shape={s.shape} color={s.color.hex} dark={s.color.dark} size={26} />
                        ) : (
                            <span style={{ color: "#4b5563", fontSize: 11, fontWeight: 900, alignSelf: "center", fontFamily: "'Nunito',sans-serif" }}>Emoji shifr kutilyapti...</span>
                        )}
                    </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                    <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value.toUpperCase())}
                        placeholder="Bu yerga so'zni yozing..."
                        rows={3}
                        style={{
                            width: "100%", padding: "10px 14px", border: "2px solid rgba(96,165,250,0.4)",
                            borderRadius: 10, fontSize: 22, fontWeight: 900, background: "rgba(255,255,255,0.1)",
                            color: "#e2e8f0", outline: "none", fontFamily: "'Nunito',sans-serif",
                            boxSizing: "border-box", textTransform: "uppercase", letterSpacing: 2, resize: "none"
                        }}
                    />
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {[
                        { id: "del", icon: <Delete size={18} />, bg: "#f97316", sh: "#9a3412", fn: () => handleAction("DEL") },
                        { id: "clr", icon: <Trash2 size={18} />, bg: "#ef4444", sh: "#991b1b", fn: () => handleAction("CLR") },
                        { id: "chk", icon: <Check size={18} />, bg: "#0284c7", sh: "#075985", fn: () => handleAction("ENT") },
                    ].map(b => (
                        <button key={b.id} onClick={b.fn} style={{
                            flex: 1, padding: "12px 4px", border: "none", borderRadius: 12,
                            fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "'Nunito',sans-serif",
                            background: b.bg, color: "#fff", boxShadow: `0 4px 0 ${b.sh}`, display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                            onMouseDown={e => { e.currentTarget.style.transform = "translateY(3px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${b.sh}`; }}
                            onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${b.sh}`; }}
                            onTouchStart={e => { e.currentTarget.style.transform = "translateY(3px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${b.sh}`; }}
                            onTouchEnd={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${b.sh}`; }}
                        >{b.icon}</button>
                    ))}
                </div>

                <div style={{ marginBottom: 10 }}>
                    <Keyboard lang={lang} onLangToggle={() => setLang(l => l === "LATIN" ? "RU" : "LATIN")} onKey={handleKey} />
                </div>
            </div>
            {toast && <Toast msg={toast} />}
        </div>
    );
}

export default function CryptoGame() {
    const [screen, setScreen] = useState("home");
    const [currentLevel, setCurrentLevel] = useState(0);
    const [completed, setCompleted] = useState({});
    const [totalStars, setTotalStars] = useState(0);

    if (screen === "home") return <HomeScreen onGo={s => setScreen(s)} />;
    if (screen === "levels") return <LevelSelectScreen completed={completed} onBack={() => setScreen("home")} onLevel={i => { setCurrentLevel(i); setScreen("game"); }} />;
    if (screen === "game") return (
        <GameScreen
            key={currentLevel}
            levelIdx={currentLevel}
            onBack={() => setScreen("levels")}
            onComplete={(idx, goNext) => {
                setCompleted(p => ({ ...p, [idx]: true }));
                if (goNext && idx + 1 < 100) setCurrentLevel(idx + 1);
                else setScreen("levels");
            }}
            totalStars={totalStars}
            onStarChange={delta => setTotalStars(p => Math.max(0, p + delta))}
        />
    );
    if (screen === "encode") return <EncodeScreen onBack={() => setScreen("home")} />;
    if (screen === "decode") return <DecodeScreen onBack={() => setScreen("home")} />;
    return null;
}
