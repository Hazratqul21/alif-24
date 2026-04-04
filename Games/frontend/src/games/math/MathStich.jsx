import { useState, useRef, useCallback, useEffect } from "react";

// ─── 7-SEGMENT DATA ───
// Segments: top=0, topRight=1, bottomRight=2, bottom=3, bottomLeft=4, topLeft=5, middle=6
const SEG_DATA = {
    0: [1, 1, 1, 1, 1, 1, 0], 1: [0, 1, 1, 0, 0, 0, 0], 2: [1, 1, 0, 1, 1, 0, 1],
    3: [1, 1, 1, 1, 0, 0, 1], 4: [0, 1, 1, 0, 0, 1, 1], 5: [1, 0, 1, 1, 0, 1, 1],
    6: [1, 0, 1, 1, 1, 1, 1], 7: [1, 1, 1, 0, 0, 0, 0], 8: [1, 1, 1, 1, 1, 1, 1],
    9: [1, 1, 1, 1, 0, 1, 1],
};

// Segment geometry: each segment has position/rotation in a unit cell (W=60, H=100)
// [type: 'h'|'v', x, y] - horizontal or vertical, position of center
const W = 60, H = 100, T = 8, PAD = 6;
const SEG_POSITIONS = [
    { type: 'h', cx: W / 2, cy: PAD },              // 0: top
    { type: 'v', cx: W - PAD, cy: H / 4 },             // 1: topRight
    { type: 'v', cx: W - PAD, cy: 3 * H / 4 },            // 2: bottomRight
    { type: 'h', cx: W / 2, cy: H - PAD },            // 3: bottom
    { type: 'v', cx: PAD, cy: 3 * H / 4 },            // 4: bottomLeft
    { type: 'v', cx: PAD, cy: H / 4 },             // 5: topLeft
    { type: 'h', cx: W / 2, cy: H / 2 },             // 6: middle
];

// ─── VERIFIED PUZZLES ───
// diff: 0=Oson, 1=O'rta, 2=Qiyin, 3=Juda qiyin (2-xonali), 4=Ekspert (3-qismli)
const PUZZLES = [
    // ── OSON (1-20): 1 ta operand raqamini o'zgartir ──
    { w: "6+9=18", c: "9+9=18", diff: 0, hint: "Chap 6→9" },
    { w: "9+9=15", c: "6+9=15", diff: 0, hint: "Chap 9→6" },
    { w: "6+8=17", c: "9+8=17", diff: 0, hint: "Chap 6→9" },
    { w: "9+8=14", c: "6+8=14", diff: 0, hint: "Chap 9→6" },
    { w: "3+9=14", c: "5+9=14", diff: 0, hint: "Chap 3→5" },
    { w: "5+9=12", c: "3+9=12", diff: 0, hint: "Chap 5→3" },
    { w: "6+5=14", c: "9+5=14", diff: 0, hint: "Chap 6→9" },
    { w: "9+5=11", c: "6+5=11", diff: 0, hint: "Chap 9→6" },
    { w: "9+3=14", c: "9+5=14", diff: 0, hint: "O\'ng 3→5" },
    { w: "8+6=17", c: "8+9=17", diff: 0, hint: "O\'ng 6→9" },
    { w: "7+6=16", c: "7+9=16", diff: 0, hint: "O\'ng 6→9" },
    { w: "7+9=13", c: "7+6=13", diff: 0, hint: "O\'ng 9→6" },
    { w: "9+2=12", c: "9+3=12", diff: 0, hint: "O\'ng 2→3" },
    { w: "7+3=12", c: "7+5=12", diff: 0, hint: "O\'ng 3→5" },
    { w: "8+2=11", c: "8+3=11", diff: 0, hint: "O\'ng 2→3" },
    { w: "7+2=10", c: "7+3=10", diff: 0, hint: "O\'ng 2→3" },
    { w: "5+3=10", c: "5+5=10", diff: 0, hint: "O\'ng 3→5" },
    { w: "6+6=15", c: "9+6=15", diff: 0, hint: "Chap 6→9" },
    { w: "9+6=12", c: "6+6=12", diff: 0, hint: "Chap 9→6" },
    { w: "2+9=12", c: "3+9=12", diff: 0, hint: "Chap 2→3" },
    // ── O\'RTA (21-40): natija raqamini o\'zgartir ──
    { w: "9-3=9", c: "9-3=6", diff: 1, hint: "Natija: 9→6" },
    { w: "8-2=9", c: "8-2=6", diff: 1, hint: "Natija: 9→6" },
    { w: "9-7=3", c: "9-7=2", diff: 1, hint: "Natija: 3→2" },
    { w: "7-4=5", c: "7-4=3", diff: 1, hint: "Natija: 5→3" },
    { w: "9-6=5", c: "9-6=3", diff: 1, hint: "Natija: 5→3" },
    { w: "9-4=3", c: "9-4=5", diff: 1, hint: "Natija: 3→5" },
    { w: "8-3=3", c: "8-3=5", diff: 1, hint: "Natija: 3→5" },
    { w: "2+7=6", c: "2+7=9", diff: 1, hint: "Natija: 6→9" },
    { w: "3+6=6", c: "3+6=9", diff: 1, hint: "Natija: 6→9" },
    { w: "4+5=6", c: "4+5=9", diff: 1, hint: "Natija: 6→9" },
    { w: "1+5=9", c: "1+5=6", diff: 1, hint: "Natija: 9→6" },
    { w: "3+3=9", c: "3+3=6", diff: 1, hint: "Natija: 9→6" },
    { w: "1+8=6", c: "1+8=9", diff: 1, hint: "Natija: 6→9" },
    { w: "9-9=6", c: "9-9=0", diff: 1, hint: "Natija: 6→0" },
    { w: "8-8=6", c: "8-8=0", diff: 1, hint: "Natija: 6→0" },
    { w: "8-6=3", c: "8-6=2", diff: 1, hint: "Natija: 3→2" },
    { w: "6-3=5", c: "6-3=3", diff: 1, hint: "Natija: 5→3" },
    { w: "7-2=3", c: "7-2=5", diff: 1, hint: "Natija: 3→5" },
    { w: "4+2=9", c: "4+2=6", diff: 1, hint: "Natija: 9→6" },
    { w: "7+2=6", c: "7+2=9", diff: 1, hint: "Natija: 6→9" },
    // ── QIYIN (41-60): belgi + raqam birga ──
    { w: "8-9=18", c: "9+9=18", diff: 2, hint: "Belgi -→+, chap 8→9" },
    { w: "8-8=17", c: "9+8=17", diff: 2, hint: "Belgi -→+, chap 8→9" },
    { w: "7-8=16", c: "7+9=16", diff: 2, hint: "Belgi -→+, o\'ng 8→9" },
    { w: "8-8=14", c: "6+8=14", diff: 2, hint: "Belgi -→+, chap 8→6" },
    { w: "9-8=13", c: "5+8=13", diff: 2, hint: "Belgi -→+, chap 9→5" },
    { w: "6-8=15", c: "6+9=15", diff: 2, hint: "Belgi -→+, o\'ng 8→9" },
    { w: "8-6=15", c: "9+6=15", diff: 2, hint: "Belgi -→+, chap 8→9" },
    { w: "7-8=13", c: "7+6=13", diff: 2, hint: "Belgi -→+, o\'ng 8→6" },
    { w: "9-7=12", c: "5+7=12", diff: 2, hint: "Belgi -→+, chap 9→5" },
    { w: "9-8=11", c: "3+8=11", diff: 2, hint: "Belgi -→+, chap 9→3" },
    { w: "5+1=8", c: "9-1=8", diff: 2, hint: "Belgi +→-, chap 5→9" },
    { w: "5+4=5", c: "9-4=5", diff: 2, hint: "Belgi +→-, chap 5→9" },
    { w: "5+6=3", c: "9-6=3", diff: 2, hint: "Belgi +→-, chap 5→9" },
    { w: "5+7=2", c: "9-7=2", diff: 2, hint: "Belgi +→-, chap 5→9" },
    { w: "6+2=6", c: "8-2=6", diff: 2, hint: "Belgi +→-, chap 6→8" },
    { w: "6+3=5", c: "8-3=5", diff: 2, hint: "Belgi +→-, chap 6→8" },
    { w: "6+5=3", c: "8-5=3", diff: 2, hint: "Belgi +→-, chap 6→8" },
    { w: "6+7=1", c: "8-7=1", diff: 2, hint: "Belgi +→-, chap 6→8" },
    { w: "9+1=9", c: "9-1=8", diff: 2, hint: "Belgi +→-, natija 9→8" },
    { w: "8+2=5", c: "8-2=6", diff: 2, hint: "Belgi +→-, natija 5→6" },
    // ── JUDA QIYIN (61-80): ikki xonali sonlar ──
    { w: "56-20=30", c: "50-20=30", diff: 3, hint: "Chap: 56→50 (6→0)" },
    { w: "59-20=30", c: "50-20=30", diff: 3, hint: "Chap: 59→50 (9→0)" },
    { w: "50-26=30", c: "50-20=30", diff: 3, hint: "O\'ng: 26→20 (6→0)" },
    { w: "50-29=30", c: "50-20=30", diff: 3, hint: "O\'ng: 29→20 (9→0)" },
    { w: "50-20=20", c: "50-20=30", diff: 3, hint: "Natija: 20→30 (2→3)" },
    { w: "50-20=50", c: "50-20=30", diff: 3, hint: "Natija: 50→30 (5→3)" },
    { w: "56-30=20", c: "50-30=20", diff: 3, hint: "Chap: 56→50 (6→0)" },
    { w: "50-50=20", c: "50-30=20", diff: 3, hint: "O\'ng: 50→30 (5→3)" },
    { w: "50-39=20", c: "50-30=20", diff: 3, hint: "O\'ng: 39→30 (9→0)" },
    { w: "96-30=60", c: "90-30=60", diff: 3, hint: "Chap: 96→90 (6→0)" },
    { w: "99-30=60", c: "90-30=60", diff: 3, hint: "Chap: 99→90 (9→0)" },
    { w: "90-36=60", c: "90-30=60", diff: 3, hint: "O\'ng: 36→30 (6→0)" },
    { w: "90-30=90", c: "90-30=60", diff: 3, hint: "Natija: 90→60 (9→6)" },
    { w: "66-20=40", c: "60-20=40", diff: 3, hint: "Chap: 66→60 (6→0)" },
    { w: "69-20=40", c: "60-20=40", diff: 3, hint: "Chap: 69→60 (9→0)" },
    { w: "60-26=40", c: "60-20=40", diff: 3, hint: "O\'ng: 26→20 (6→0)" },
    { w: "53-22=30", c: "52-22=30", diff: 3, hint: "Chap: 53→52 (3→2)" },
    { w: "52-32=30", c: "52-22=30", diff: 3, hint: "O\'ng: 32→22 (3→2)" },
    { w: "20-20=10", c: "30-20=10", diff: 3, hint: "Chap: 20→30 (2→3)" },
    { w: "30-26=10", c: "30-20=10", diff: 3, hint: "O\'ng: 26→20 (6→0)" },
    // ── EKSPERT (81-100): uch qismli tenglamalar ──
    { w: "9+9-9=6", c: "6+9-9=6", diff: 4, hint: "Birinchi raqam: 9→6" },
    { w: "9-9+9=6", c: "6-9+9=6", diff: 4, hint: "Birinchi raqam: 9→6" },
    { w: "9+8-9=5", c: "6+8-9=5", diff: 4, hint: "Birinchi raqam: 9→6" },
    { w: "8+9-9=5", c: "8+6-9=5", diff: 4, hint: "O\'rtadagi raqam: 9→6" },
    { w: "9+7-9=4", c: "6+7-9=4", diff: 4, hint: "Birinchi raqam: 9→6" },
    { w: "7+9-9=4", c: "7+6-9=4", diff: 4, hint: "O\'rtadagi raqam: 9→6" },
    { w: "9+9-8=7", c: "6+9-8=7", diff: 4, hint: "Birinchi raqam: 9→6" },
    { w: "8+9-8=6", c: "8+6-8=6", diff: 4, hint: "O\'rtadagi raqam: 9→6" },
    { w: "9+8-8=6", c: "6+8-8=6", diff: 4, hint: "Birinchi raqam: 9→6" },
    { w: "9+9-7=8", c: "6+9-7=8", diff: 4, hint: "Birinchi raqam: 9→6" },
    { w: "6+2-8=4", c: "8+2-6=4", diff: 4, hint: "6 va 8 o\'rin almashadi (1 gugurt ko\'chadi)" },
    { w: "9+9-9=2", c: "3+8-9=2", diff: 4, hint: "1-raqam 9→3, 2-raqam 9→8" },
    { w: "9+8-9=3", c: "3+8-8=3", diff: 4, hint: "1-raqam 9→3, 3-raqam 9→8" },
    { w: "9+9-8=5", c: "5+8-8=5", diff: 4, hint: "1-raqam 9→5, 2-raqam 9→8" },
    { w: "9-9+8=5", c: "5-8+8=5", diff: 4, hint: "1-raqam 9→5, 2-raqam 9→8" },
    { w: "9+9-8=3", c: "3+8-8=3", diff: 4, hint: "1-raqam 9→3, 2-raqam 9→8" },
    { w: "9-8+9=3", c: "3-8+8=3", diff: 4, hint: "1-raqam 9→3, 3-raqam 9→8" },
    { w: "9+7-9=4", c: "3+7-8=4", diff: 4, hint: "1-raqam 9→3, 3-raqam 9→8" },
    { w: "8+9-9=11", c: "8+9-6=11", diff: 4, hint: "3-raqam 9→6" },
    { w: "7+9-9=10", c: "7+9-6=10", diff: 4, hint: "3-raqam 9→6" },
];


const DIFF_INFO = [
    { label: "Oson", color: "#4ade80", dark: "#16a34a", bg: "rgba(74,222,128,0.15)", desc: "Operand o'zgartir" },
    { label: "O'rta", color: "#fb923c", dark: "#ea580c", bg: "rgba(251,146,60,0.15)", desc: "Natija o'zgartir" },
    { label: "Qiyin", color: "#c084fc", dark: "#9333ea", bg: "rgba(192,132,252,0.15)", desc: "Belgi+raqam" },
    { label: "Juda qiyin", color: "#f87171", dark: "#dc2626", bg: "rgba(248,113,113,0.15)", desc: "2-xonali sonlar" },
    { label: "Ekspert", color: "#fbbf24", dark: "#d97706", bg: "rgba(251,191,36,0.15)", desc: "3-qismli tenglama" },
];

// Parse equation — supports: "6+9=18", "50-20=30", "9+9-9=6"
function parseEq(eq) {
    // 3-part: a op1 b op2 c = r
    const m3 = eq.match(/^(\d+)([+\-])(\d+)([+\-])(\d+)=(\d+)$/);
    if (m3) return { a: +m3[1], op: m3[2], b: +m3[3], op2: m3[4], c: +m3[5], r: +m3[6], parts: 3 };
    // 2-part: a op b = r
    const m2 = eq.match(/^(\d+)([+\-])(\d+)=(\d+)$/);
    if (m2) return { a: +m2[1], op: m2[2], b: +m2[3], r: +m2[4], parts: 2 };
    return null;
}
function evalEq(eq) {
    const p = parseEq(eq);
    if (!p) return false;
    if (p.parts === 3) {
        const mid = p.op === "+" ? p.a + p.b : p.a - p.b;
        return (p.op2 === "+" ? mid + p.c : mid - p.c) === p.r;
    }
    return (p.op === "+" ? p.a + p.b : p.a - p.b) === p.r;
}

// ─── MATCHSTICK CANVAS COMPONENT ───
// Renders an equation as real matchstick SVG with drag interaction
function MatchCanvas({ equation, onSegmentClick, selected, maxMoves, movesLeft }) {
    const p = parseEq(equation);
    if (!p) return null;

    // Build tokens: [{type:'digit'|'op', value, key}]
    const tokens = [];
    String(p.a).split("").forEach((ch, i) => tokens.push({ type: "digit", value: +ch, key: `a${i}` }));
    tokens.push({ type: "op", value: p.op, key: "op" });
    String(p.b).split("").forEach((ch, i) => tokens.push({ type: "digit", value: +ch, key: `b${i}` }));
    tokens.push({ type: "eq", key: "eq" });
    String(p.r).split("").forEach((ch, i) => tokens.push({ type: "digit", value: +ch, key: `r${i}` }));

    const DW = W + 16; // digit width + gap
    const OW = 52;     // operator width
    const EQW = 48;    // equals width
    const GAP = 10;

    // Calculate x positions
    let cx = 0;
    const positions = tokens.map(tok => {
        const x = cx;
        if (tok.type === "digit") cx += DW + GAP;
        else if (tok.type === "op") cx += OW + GAP;
        else cx += EQW + GAP;
        return { ...tok, x };
    });

    const totalW = cx;
    const svgH = H + 24;

    // Draw a single match segment
    function MatchStick({ segIdx, active, tokenKey, onClick }) {
        const seg = SEG_POSITIONS[segIdx];
        const isH = seg.type === "h";
        const len = isH ? W - PAD * 2 - T : H / 2 - PAD * 2 - T;
        const thick = T;

        // Head position (always at start of segment)
        const hx = isH ? seg.cx - len / 2 : seg.cx;
        const hy = isH ? seg.cy : seg.cy - len / 2;

        const clickable = active && onClick;
        const isSelected = selected && selected.tokenKey === tokenKey && selected.segIdx === segIdx;

        return (
            <g
                onClick={clickable ? () => onClick(tokenKey, segIdx) : undefined}
                style={{ cursor: clickable ? "pointer" : "default" }}
            >
                {/* glow for selected */}
                {isSelected && (
                    <rect
                        x={isH ? seg.cx - len / 2 - 6 : seg.cx - thick / 2 - 6}
                        y={isH ? seg.cy - thick / 2 - 6 : seg.cy - len / 2 - 6}
                        width={isH ? len + 12 : thick + 12}
                        height={isH ? thick + 12 : len + 12}
                        rx={8} fill="rgba(255,220,50,0.35)"
                        style={{ filter: "blur(3px)" }}
                    />
                )}
                {/* stick body */}
                <rect
                    x={isH ? seg.cx - len / 2 : seg.cx - thick / 2}
                    y={isH ? seg.cy - thick / 2 : seg.cy - len / 2}
                    width={isH ? len : thick}
                    height={isH ? thick : len}
                    rx={thick / 2}
                    fill={isSelected ? "#ffe44d" : active ? "#e8c06a" : "rgba(255,255,255,0.06)"}
                    stroke={isSelected ? "#ffaa00" : active ? "rgba(200,150,50,0.4)" : "rgba(255,255,255,0.04)"}
                    strokeWidth={isSelected ? 1.5 : 1}
                />
                {/* match head */}
                {active && (
                    <circle
                        cx={hx}
                        cy={hy}
                        r={thick * 0.9}
                        fill={isSelected ? "#ff6600" : "#cc3300"}
                    />
                )}
                {/* hover/click area */}
                {clickable && (
                    <rect
                        x={isH ? seg.cx - len / 2 - 8 : seg.cx - thick / 2 - 8}
                        y={isH ? seg.cy - thick / 2 - 8 : seg.cy - len / 2 - 8}
                        width={isH ? len + 16 : thick + 16}
                        height={isH ? thick + 16 : len + 16}
                        rx={10} fill="transparent"
                    />
                )}
            </g>
        );
    }

    function DrawDigit({ d, x, y, tokenKey, onClick }) {
        const segs = SEG_DATA[d] || SEG_DATA[0];
        return (
            <g transform={`translate(${x},${y})`}>
                {segs.map((on, si) => (
                    <MatchStick
                        key={si} segIdx={si} active={!!on}
                        tokenKey={tokenKey} onClick={onClick}
                    />
                ))}
                {/* Inactive segments as ghost targets */}
                {segs.map((on, si) => !on && (
                    <MatchStick
                        key={`ghost_${si}`} segIdx={si} active={false}
                        tokenKey={tokenKey} onClick={onClick}
                    />
                ))}
            </g>
        );
    }

    function DrawPlus({ x, y, tokenKey, onClick }) {
        const cx2 = x + OW / 2, cy2 = y + H / 2;
        const arm = 18, thick2 = T;
        const isSel = selected?.tokenKey === tokenKey;
        const c = isSel ? "#ffe44d" : "#e8c06a";
        const hc = isSel ? "#ff6600" : "#cc3300";
        return (
            <g onClick={onClick ? () => onClick(tokenKey, 0) : undefined}
                style={{ cursor: onClick ? "pointer" : "default" }}>
                <rect x={cx2 - arm} y={cy2 - thick2 / 2} width={arm * 2} height={thick2} rx={thick2 / 2} fill={c} />
                <rect x={cx2 - thick2 / 2} y={cy2 - arm} width={thick2} height={arm * 2} rx={thick2 / 2} fill={c} />
                <circle cx={cx2 - arm} cy={cy2} r={thick2 * 0.9} fill={hc} />
                <circle cx={cx2} cy={cy2 - arm} r={thick2 * 0.9} fill={hc} />
            </g>
        );
    }

    function DrawMinus({ x, y, tokenKey, onClick }) {
        const cx2 = x + OW / 2, cy2 = y + H / 2;
        const arm = 18, thick2 = T;
        const isSel = selected?.tokenKey === tokenKey;
        const c = isSel ? "#ffe44d" : "#e8c06a";
        return (
            <g onClick={onClick ? () => onClick(tokenKey, 0) : undefined}
                style={{ cursor: onClick ? "pointer" : "default" }}>
                <rect x={cx2 - arm} y={cy2 - thick2 / 2} width={arm * 2} height={thick2} rx={thick2 / 2} fill={c} />
                <circle cx={cx2 - arm} cy={cy2} r={thick2 * 0.9} fill={isSel ? "#ff6600" : "#cc3300"} />
            </g>
        );
    }

    function DrawEquals({ x, y }) {
        const cx2 = x + EQW / 2, cy2 = y + H / 2;
        const arm = 14, thick2 = T;
        return (
            <g>
                <rect x={cx2 - arm} y={cy2 - thick2 - 3} width={arm * 2} height={thick2} rx={thick2 / 2} fill="#e8c06a" />
                <rect x={cx2 - arm} y={cy2 + 3} width={arm * 2} height={thick2} rx={thick2 / 2} fill="#e8c06a" />
                <circle cx={cx2 - arm} cy={cy2 - thick2 / 2 - 3} r={thick2 * 0.9} fill="#cc3300" />
                <circle cx={cx2 - arm} cy={cy2 + 3 + thick2 / 2} r={thick2 * 0.9} fill="#cc3300" />
            </g>
        );
    }

    return (
        <svg
            viewBox={`-10 -10 ${totalW + 20} ${svgH + 20}`}
            style={{ width: "100%", maxHeight: 180, display: "block" }}
        >
            {positions.map(tok => {
                const y = 12;
                if (tok.type === "digit") {
                    return <DrawDigit key={tok.key} d={tok.value} x={tok.x} y={y} tokenKey={tok.key} onClick={onSegmentClick} />;
                }
                if (tok.type === "op") {
                    return tok.value === "+"
                        ? <DrawPlus key={tok.key} x={tok.x} y={y} tokenKey={tok.key} onClick={onSegmentClick} />
                        : <DrawMinus key={tok.key} x={tok.x} y={y} tokenKey={tok.key} onClick={onSegmentClick} />;
                }
                return <DrawEquals key={tok.key} x={tok.x} y={y} />;
            })}
        </svg>
    );
}

// ─── MAIN GAME SCREEN ───
function GameScreen({ puzzleIdx, onBack, onNext, totalSolved }) {
    const puzzle = PUZZLES[puzzleIdx];
    const diff = DIFF_INFO[puzzle.diff];

    // Parse equation into tokens with segment state
    function buildState(eqStr) {
        const p = parseEq(eqStr);
        if (!p) return null;
        const state = {};
        const addDigit = (val, prefix) => {
            String(val).split("").forEach((ch, i) => {
                const key = `${prefix}${i}`;
                state[key] = { type: "digit", value: +ch, segs: [...SEG_DATA[+ch]] };
            });
        };
        addDigit(p.a, "a");
        state["op"] = { type: "op", value: p.op };
        addDigit(p.b, "b");
        if (p.parts === 3) {
            state["op2"] = { type: "op", value: p.op2 };
            addDigit(p.c, "c");
        }
        addDigit(p.r, "r");
        return state;
    }

    function stateToEq(state) {
        const p = parseEq(puzzle.w);
        const getNum = (prefix) => {
            let s = "", i = 0;
            while (state[`${prefix}${i}`]) {
                const tok = state[`${prefix}${i}`];
                let best = 0, bestScore = -1;
                for (let d = 0; d <= 9; d++) {
                    const sc = SEG_DATA[d].reduce((acc, v, j) => acc + (v === tok.segs[j] ? 1 : 0), 0);
                    if (sc > bestScore) { bestScore = sc; best = d; }
                }
                s += best; i++;
            }
            return parseInt(s) || 0;
        };
        const a = getNum("a"), op = state["op"].value, b = getNum("b"), r = getNum("r");
        if (p.parts === 3) {
            const op2 = state["op2"].value, c = getNum("c");
            return `${a}${op}${b}${op2}${c}=${r}`;
        }
        return `${a}${op}${b}=${r}`;
    }

    const [segState, setSegState] = useState(() => buildState(puzzle.w));
    const [selected, setSelected] = useState(null); // {tokenKey, segIdx}
    const [moves, setMoves] = useState(0);
    const [solved, setSolved] = useState(false);
    const [wrong, setWrong] = useState(false);
    const [hint, setHint] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const maxMoves = 1;

    const currentEq = stateToEq(segState);
    const isCorrect = evalEq(currentEq);

    // Handle segment click
    const handleSegClick = useCallback((tokenKey, segIdx) => {
        if (solved) return;

        const tok = segState[tokenKey];
        if (!tok) return;

        if (!selected) {
            // Select an active segment to move
            if (tok.type === "digit" && tok.segs[segIdx] === 1) {
                setSelected({ tokenKey, segIdx });
                setWrong(false);
            } else if (tok.type === "op") {
                setSelected({ tokenKey, segIdx: 0 });
                setWrong(false);
            }
        } else {
            // Place the selected segment somewhere
            const fromKey = selected.tokenKey;
            const fromSeg = selected.segIdx;
            const toKey = tokenKey;
            const toSeg = segIdx;

            if (fromKey === toKey && fromSeg === toSeg) {
                setSelected(null);
                return;
            }

            // Attempt move
            const newState = JSON.parse(JSON.stringify(segState));
            const isOpKey = k => k === "op" || k === "op2";

            if (isOpKey(fromKey) || isOpKey(toKey)) {
                // Operator involved
                const opKey = isOpKey(fromKey) ? fromKey : toKey;
                const digitKey = isOpKey(fromKey) ? toKey : fromKey;
                const digitSeg = isOpKey(fromKey) ? toSeg : fromSeg;
                const fromOp = isOpKey(fromKey);

                if (fromOp) {
                    // Moving from operator to digit (op must be "+")
                    const toTok = newState[digitKey];
                    if (toTok && toTok.type === "digit" && toTok.segs[digitSeg] === 0) {
                        if (newState[opKey].value === "+") {
                            newState[opKey] = { type: "op", value: "-" };
                            toTok.segs[digitSeg] = 1;
                            setSegState(newState); setMoves(m => m + 1); setSelected(null); checkResult(newState);
                        } else { setSelected(null); }
                    } else { setSelected(null); }
                } else {
                    // Moving from digit to operator (op must be "-")
                    const fromTok = newState[digitKey];
                    if (fromTok && fromTok.type === "digit" && fromTok.segs[digitSeg] === 1) {
                        if (newState[opKey].value === "-") {
                            newState[opKey] = { type: "op", value: "+" };
                            fromTok.segs[digitSeg] = 0;
                            setSegState(newState); setMoves(m => m + 1); setSelected(null); checkResult(newState);
                        } else { setSelected(null); }
                    } else { setSelected(null); }
                }
            } else {
                // Both are digits - move segment from one to another
                const fromTok3 = newState[fromKey];
                const toTok3 = newState[toKey];
                if (fromTok3?.type === "digit" && toTok3?.type === "digit") {
                    if (fromTok3.segs[fromSeg] === 1 && toTok3.segs[toSeg] === 0) {
                        fromTok3.segs[fromSeg] = 0;
                        toTok3.segs[toSeg] = 1;
                        setSegState(newState); setMoves(m => m + 1); setSelected(null); checkResult(newState);
                    } else { setSelected(null); }
                } else { setSelected(null); }
            }
        }
    }, [segState, selected, solved]);

    function checkResult(state) {
        const eq = stateToEq(state);
        if (evalEq(eq)) {
            setSolved(true);
            setTimeout(() => setShowSuccess(true), 300);
        } else if (moves >= maxMoves - 1) {
            setWrong(true);
            setTimeout(() => setWrong(false), 800);
        }
    }

    function reset() {
        setSegState(buildState(puzzle.w));
        setSelected(null);
        setMoves(0);
        setSolved(false);
        setWrong(false);
        setShowSuccess(false);
        setHint(false);
    }

    // Build display equation from segState
    function buildDisplayEq() {
        const tokens = [];
        const addDigits = (prefix) => {
            let i = 0;
            while (segState[`${prefix}${i}`]) {
                const tok = segState[`${prefix}${i}`];
                let best = 0, bestScore = -1;
                for (let d = 0; d <= 9; d++) {
                    const sc = SEG_DATA[d].reduce((a, v, j) => a + (v === tok.segs[j] ? 1 : 0), 0);
                    if (sc > bestScore) { bestScore = sc; best = d; }
                }
                tokens.push({ type: "digit", key: `${prefix}${i}`, d: best, segs: tok.segs });
                i++;
            }
        };
        addDigits("a");
        tokens.push({ type: "op", key: "op", value: segState["op"].value });
        addDigits("b");
        // 3-part support
        if (segState["op2"]) {
            tokens.push({ type: "op", key: "op2", value: segState["op2"].value });
            addDigits("c");
        }
        tokens.push({ type: "eq", key: "eq" });
        addDigits("r");
        return tokens;
    }

    const tokens = buildDisplayEq();

    // Layout
    const GAP = 10; const DW = W + GAP; const OW_ = 52; const EQW_ = 48;
    let cx2 = 0;
    const positioned = tokens.map(tok => {
        const x = cx2;
        if (tok.type === "digit") cx2 += DW + GAP;
        else if (tok.type === "op") cx2 += OW_ + GAP;
        else cx2 += EQW_ + GAP;
        return { ...tok, x };
    });
    const totalW = cx2;

    function SegStick({ active, isSelected, isGhost, x, y, segIdx, tokenKey, onClick }) {
        const seg = SEG_POSITIONS[segIdx];
        const isH = seg.type === "h";
        const len = isH ? W - PAD * 2 - T : H / 2 - PAD * 2 - T;
        const hx = isH ? seg.cx - len / 2 : seg.cx;
        const hy = isH ? seg.cy : seg.cy - len / 2;

        if (!active && !isGhost) return null;

        return (
            <g transform={`translate(${x},${y})`}
                onClick={onClick ? (() => onClick(tokenKey, segIdx)) : undefined}
                style={{ cursor: onClick ? "pointer" : "default" }}>
                {isSelected && (
                    <rect
                        x={isH ? seg.cx - len / 2 - 8 : seg.cx - T / 2 - 8}
                        y={isH ? seg.cy - T / 2 - 8 : seg.cy - len / 2 - 8}
                        width={isH ? len + 16 : T + 16}
                        height={isH ? T + 16 : len + 16}
                        rx={10} fill="rgba(255,220,50,0.4)"
                    />
                )}
                <rect
                    x={isH ? seg.cx - len / 2 : seg.cx - T / 2}
                    y={isH ? seg.cy - T / 2 : seg.cy - len / 2}
                    width={isH ? len : T}
                    height={isH ? T : len}
                    rx={T / 2}
                    fill={
                        isGhost ? "rgba(255,255,255,0.06)" :
                            isSelected ? "#ffe44d" : "#d4a843"
                    }
                    stroke={
                        isGhost ? "rgba(255,255,255,0.1)" :
                            isSelected ? "#ffaa00" : "rgba(220,170,60,0.6)"
                    }
                    strokeWidth={isGhost ? 1 : isSelected ? 2 : 1}
                    opacity={isGhost ? 1 : 1}
                />
                {active && (
                    <circle cx={hx} cy={hy} r={T * 0.95}
                        fill={isSelected ? "#ff5500" : "#8b1a00"} />
                )}
                {/* invisible click target */}
                {(isGhost || active) && onClick && (
                    <rect
                        x={isH ? seg.cx - len / 2 - 10 : seg.cx - T / 2 - 10}
                        y={isH ? seg.cy - T / 2 - 10 : seg.cy - len / 2 - 10}
                        width={isH ? len + 20 : T + 20}
                        height={isH ? T + 20 : len + 20}
                        rx={12} fill="transparent"
                        onClick={() => onClick(tokenKey, segIdx)}
                    />
                )}
            </g>
        );
    }

    return (
        <div style={{
            minHeight: "100vh",
            background: "radial-gradient(ellipse at 30% 20%, #1e3a8a 0%, #1e1b4b 40%, #0f0f23 100%)",
            display: "flex", flexDirection: "column",
            fontFamily: "'Segoe UI',system-ui,sans-serif",
            overflow: "hidden",
        }}>
            {/* Top bar */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px",
                background: "rgba(0,0,0,0.3)",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}>
                <button onClick={onBack} style={{
                    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 10, color: "#fff", padding: "8px 14px", cursor: "pointer",
                    fontSize: 13, fontWeight: 700,
                }}>← Orqaga</button>

                <div style={{ textAlign: "center" }}>
                    <div style={{
                        background: "rgba(0,0,0,0.4)", border: "2px solid rgba(255,255,255,0.2)",
                        borderRadius: 12, padding: "6px 20px", color: "#fff",
                    }}>
                        <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2 }}>ХОДОВ </span>
                        <span style={{ fontSize: 18, fontWeight: 900, color: moves < maxMoves ? "#4ade80" : "#fb923c" }}>
                            {moves} / {maxMoves}
                        </span>
                    </div>
                </div>

                <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "rgba(0,0,0,0.4)", border: "2px solid rgba(255,200,0,0.3)",
                    borderRadius: 12, padding: "6px 14px",
                }}>
                    <span style={{ fontSize: 18 }}>⭐</span>
                    <span style={{ color: "#ffd700", fontWeight: 900, fontSize: 16 }}>{totalSolved}</span>
                </div>
            </div>

            {/* Level + difficulty */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "12px 20px 6px",
            }}>
                <div style={{
                    background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10, padding: "5px 16px", color: "#fff", fontSize: 13, fontWeight: 700,
                }}>Daraja {puzzleIdx + 1}</div>
                <div style={{
                    background: diff.bg, border: `1.5px solid ${diff.color}55`,
                    borderRadius: 10, padding: "5px 16px", color: diff.color, fontSize: 13, fontWeight: 700,
                }}>{diff.label}</div>
            </div>

            {/* Instruction */}
            <div style={{
                textAlign: "center", padding: "10px 20px 4px",
                color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 500,
            }}>
                {solved
                    ? "✅ To'g'ri! Ajoyib!"
                    : `${maxMoves} ta gugurt chupini siljiting — tenglamani to'g'rilang`}
            </div>

            {/* Equation display */}
            <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                padding: "10px 16px",
            }}>
                <div style={{
                    background: wrong
                        ? "rgba(239,68,68,0.15)"
                        : solved
                            ? "rgba(74,222,128,0.1)"
                            : "rgba(255,255,255,0.04)",
                    border: `2px solid ${wrong ? "rgba(239,68,68,0.5)" : solved ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 20,
                    padding: "20px 10px 16px",
                    width: "100%", maxWidth: 540,
                    transition: "all .2s",
                    boxShadow: solved ? "0 0 40px rgba(74,222,128,0.2)" : "none",
                }}>
                    <svg
                        viewBox={`0 0 ${totalW + 20} ${H + 40}`}
                        style={{ width: "100%", maxHeight: 160, display: "block" }}
                    >
                        {positioned.map(tok => {
                            const y = 16;
                            if (tok.type === "digit") {
                                return (
                                    <g key={tok.key}>
                                        {[0, 1, 2, 3, 4, 5, 6].map(si => (
                                            <SegStick
                                                key={si}
                                                active={tok.segs[si] === 1}
                                                isGhost={tok.segs[si] === 0 && !solved}
                                                isSelected={selected?.tokenKey === tok.key && selected?.segIdx === si}
                                                x={tok.x} y={y}
                                                segIdx={si} tokenKey={tok.key}
                                                onClick={!solved ? handleSegClick : null}
                                            />
                                        ))}
                                    </g>
                                );
                            }
                            if (tok.type === "op") {
                                const cx3 = tok.x + OW_ / 2, cy3 = y + H / 2, arm = 20, th = T;
                                const isSel = selected?.tokenKey === tok.key;
                                const fc = isSel ? "#ffe44d" : "#d4a843";
                                const hc = isSel ? "#ff5500" : "#8b1a00";
                                return (
                                    <g key={tok.key}
                                        onClick={!solved ? () => handleSegClick(tok.key, 0) : undefined}
                                        style={{ cursor: !solved ? "pointer" : "default" }}>
                                        <rect x={cx3 - arm} y={cy3 - th / 2} width={arm * 2} height={th} rx={th / 2} fill={fc} />
                                        {tok.value === "+" && <rect x={cx3 - th / 2} y={cy3 - arm} width={th} height={arm * 2} rx={th / 2} fill={fc} />}
                                        <circle cx={cx3 - arm} cy={cy3} r={th * 0.95} fill={hc} />
                                        {tok.value === "+" && <circle cx={cx3} cy={cy3 - arm} r={th * 0.95} fill={hc} />}
                                        {tok.value === "-" && !solved && (
                                            <rect x={cx3 - th / 2} y={cy3 - arm} width={th} height={arm * 2} rx={th / 2}
                                                fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                                        )}
                                    </g>
                                );
                            }
                            if (tok.type === "eq") {
                                const cx4 = tok.x + EQW_ / 2, cy4 = y + H / 2, arm = 14, th = T;
                                return (
                                    <g key="eq">
                                        <rect x={cx4 - arm} y={cy4 - th - 4} width={arm * 2} height={th} rx={th / 2} fill="#d4a843" />
                                        <rect x={cx4 - arm} y={cy4 + 4} width={arm * 2} height={th} rx={th / 2} fill="#d4a843" />
                                        <circle cx={cx4 - arm} cy={cy4 - th / 2 - 4} r={th * 0.95} fill="#8b1a00" />
                                        <circle cx={cx4 - arm} cy={cy4 + 4 + th / 2} r={th * 0.95} fill="#8b1a00" />
                                    </g>
                                );
                            }
                            return null;
                        })}
                    </svg>
                </div>
            </div>

            {/* Hint text */}
            {hint && (
                <div style={{
                    margin: "0 20px 10px", padding: "12px 16px",
                    background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,200,50,0.3)",
                    borderRadius: 14, color: "#fbbf24", fontSize: 13, fontWeight: 600,
                    textAlign: "center",
                }}>
                    💡 {puzzle.hint}
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 }}>
                        To'g'ri javob: <span style={{ color: "#4ade80", letterSpacing: 2 }}>{puzzle.c}</span>
                    </div>
                </div>
            )}

            {/* Bottom controls */}
            <div style={{
                display: "flex", justifyContent: "center", gap: 14,
                padding: "12px 20px 24px",
            }}>
                <button onClick={reset} style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)",
                    color: "#fff", fontSize: 22, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>↺</button>
                <button onClick={() => setHint(v => !v)} style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: hint ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.1)",
                    border: `2px solid ${hint ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.2)"}`,
                    color: hint ? "#fbbf24" : "#fff", fontSize: 22, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>💡</button>
                {solved && (
                    <button onClick={onNext} style={{
                        padding: "0 28px", height: 52, borderRadius: 26,
                        background: "linear-gradient(135deg,#4ade80,#22c55e)",
                        border: "none",
                        boxShadow: "0 4px 20px rgba(74,222,128,0.4)",
                        color: "#111", fontSize: 15, fontWeight: 900, cursor: "pointer",
                        letterSpacing: 1,
                    }}>Keyingi →</button>
                )}
            </div>

            {/* Success overlay */}
            {showSuccess && (
                <div style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 100,
                }}>
                    <div style={{
                        background: "linear-gradient(135deg,#1e3a8a,#1e1b4b)",
                        border: "2px solid rgba(74,222,128,0.4)",
                        borderRadius: 24, padding: "36px 40px",
                        textAlign: "center",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                        animation: "pop .3s ease",
                    }}>
                        <div style={{ fontSize: 56 }}>🎉</div>
                        <div style={{ color: "#4ade80", fontSize: 26, fontWeight: 900, margin: "12px 0 6px" }}>
                            Ajoyib!
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24 }}>
                            Daraja {puzzleIdx + 1} muvaffaqiyatli yechildi!
                        </div>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button onClick={() => { setShowSuccess(false); reset(); }} style={{
                                padding: "11px 20px", borderRadius: 12,
                                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                            }}>Qayta</button>
                            <button onClick={() => { setShowSuccess(false); onNext(); }} style={{
                                padding: "11px 24px", borderRadius: 12,
                                background: "linear-gradient(135deg,#4ade80,#22c55e)",
                                border: "none", color: "#111", fontSize: 14, fontWeight: 900, cursor: "pointer",
                                boxShadow: "0 4px 16px rgba(74,222,128,0.3)",
                            }}>Keyingi →</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes pop{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
        </div>
    );
}

// ─── LEVEL SELECT ───
function LevelSelect({ completed, onSelect }) {
    const diffGroups = [
        { label: "🟢 Oson", desc: "Operand raqamini o'zgartir", range: [0, 29], color: "#4ade80" },
        { label: "🟠 O'rta", desc: "Natija raqamini o'zgartir", range: [30, 59], color: "#fb923c" },
        { label: "🟣 Qiyin", desc: "Belgi + raqam birga o'zgaradi", range: [60, 93], color: "#c084fc" },
    ];

    return (
        <div style={{
            minHeight: "100vh",
            background: "radial-gradient(ellipse at 30% 20%,#1e3a8a 0%,#1e1b4b 40%,#0f0f23 100%)",
            fontFamily: "'Segoe UI',system-ui,sans-serif",
            color: "#fff",
            overflowY: "auto",
        }}>
            {/* header */}
            <div style={{
                padding: "24px 20px 16px", textAlign: "center",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
                <div style={{ fontSize: 13, letterSpacing: 4, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                    GUGURT O'YINI
                </div>
                <h1 style={{ margin: 0, fontSize: "clamp(22px,5vw,34px)", fontWeight: 900, letterSpacing: -0.5 }}>
                    🔥 Daraja Tanlang
                </h1>
                <div style={{
                    marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
                        {completed.length}/{PUZZLES.length} bajarildi
                    </span>
                    <div style={{
                        width: 120, height: 6, background: "rgba(255,255,255,0.1)",
                        borderRadius: 99, overflow: "hidden",
                    }}>
                        <div style={{
                            height: "100%",
                            width: `${(completed.length / PUZZLES.length) * 100}%`,
                            background: "linear-gradient(90deg,#4ade80,#fb923c,#c084fc)",
                            borderRadius: 99, transition: "width .4s",
                        }} />
                    </div>
                </div>
            </div>

            <div style={{ padding: "20px 16px 40px", maxWidth: 440, margin: "0 auto" }}>
                {diffGroups.map(g => (
                    <div key={g.label} style={{ marginBottom: 28 }}>
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
                            padding: "10px 14px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                        }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: g.color }}>{g.label}</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{g.desc}</div>
                            </div>
                            <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                                {completed.filter(i => i >= g.range[0] && i <= g.range[1]).length}/{g.range[1] - g.range[0] + 1}
                            </div>
                        </div>

                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(8,1fr)",
                            gap: 7,
                        }}>
                            {Array.from({ length: g.range[1] - g.range[0] + 1 }, (_, i) => {
                                const idx = g.range[0] + i;
                                const done = completed.includes(idx);
                                const isNext = idx === completed.length;
                                return (
                                    <LvlBtn
                                        key={idx} num={idx + 1} done={done}
                                        isNext={isNext} color={g.color}
                                        onClick={() => onSelect(idx)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function LvlBtn({ num, done, isNext, color, onClick }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                aspectRatio: "1/1", borderRadius: 10,
                background: done
                    ? `${color}22`
                    : isNext
                        ? `${color}18`
                        : "rgba(255,255,255,0.04)",
                border: `2px solid ${done || hov || isNext ? color + "66" : "rgba(255,255,255,0.1)"}`,
                color: done ? color : isNext ? "#fff" : "rgba(255,255,255,0.4)",
                fontSize: "clamp(9px,2vw,12px)",
                fontWeight: done || isNext ? 800 : 500,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
                transition: "all .12s",
                outline: "none",
                padding: 0,
            }}
        >
            {done ? "✓" : num}
            {isNext && (
                <div style={{
                    position: "absolute", top: -3, right: -3,
                    width: 8, height: 8, borderRadius: "50%",
                    background: color, border: "1.5px solid #0f0f23",
                }} />
            )}
        </button>
    );
}

// ─── ROOT ───
export default function App() {
    const [screen, setScreen] = useState("select");
    const [activeIdx, setActiveIdx] = useState(0);
    const [completed, setCompleted] = useState([]);

    const handleSelect = (idx) => {
        setActiveIdx(idx);
        setScreen("game");
    };

    const handleSolve = () => {
        setCompleted(p => [...new Set([...p, activeIdx])]);
    };

    const handleNext = () => {
        const next = activeIdx + 1;
        if (next < PUZZLES.length) {
            setActiveIdx(next);
        } else {
            setScreen("select");
        }
    };

    if (screen === "game") {
        return (
            <GameScreen
                key={activeIdx}
                puzzleIdx={activeIdx}
                onBack={() => setScreen("select")}
                onNext={() => { handleSolve(); handleNext(); }}
                totalSolved={completed.length}
            />
        );
    }

    return <LevelSelect completed={completed} onSelect={handleSelect} />;
}