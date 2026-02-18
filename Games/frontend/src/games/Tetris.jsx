import React, { useState, useEffect, useCallback, useRef } from 'react';

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#eab308', '#22c55e', '#a855f7', '#ef4444'];
const SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[0, 1], [0, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 1], [0, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
];

const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const randomPiece = () => {
    const i = Math.floor(Math.random() * SHAPES.length);
    return { shape: SHAPES[i], color: COLORS[i], x: Math.floor(COLS / 2) - 1, y: 0 };
};

const rotate = (matrix) => matrix[0].map((_, i) => matrix.map(r => r[i]).reverse());

const valid = (board, piece, dx = 0, dy = 0, shape = null) => {
    const s = shape || piece.shape;
    for (let r = 0; r < s.length; r++)
        for (let c = 0; c < s[r].length; c++)
            if (s[r][c]) {
                const nx = piece.x + c + dx, ny = piece.y + r + dy;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
                if (ny >= 0 && board[ny][nx]) return false;
            }
    return true;
};

const merge = (board, piece) => {
    const b = board.map(r => [...r]);
    piece.shape.forEach((row, r) => row.forEach((cell, c) => {
        if (cell && piece.y + r >= 0) b[piece.y + r][piece.x + c] = piece.color;
    }));
    return b;
};

const clearRows = (board) => {
    let cleared = 0;
    const b = board.filter(row => {
        if (row.every(c => c)) { cleared++; return false; }
        return true;
    });
    while (b.length < ROWS) b.unshift(Array(COLS).fill(0));
    return { board: b, cleared };
};

const Tetris = () => {
    const [board, setBoard] = useState(createBoard());
    const [piece, setPiece] = useState(randomPiece());
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [paused, setPaused] = useState(false);
    const [started, setStarted] = useState(false);
    const intervalRef = useRef(null);

    const drop = useCallback(() => {
        if (gameOver || paused || !started) return;
        if (valid(board, piece, 0, 1)) {
            setPiece(p => ({ ...p, y: p.y + 1 }));
        } else {
            const merged = merge(board, piece);
            const { board: cleared, cleared: n } = clearRows(merged);
            setBoard(cleared);
            setScore(s => s + n * 100 + 10);
            setLines(l => l + n);
            const np = randomPiece();
            if (!valid(cleared, np)) { setGameOver(true); return; }
            setPiece(np);
        }
    }, [board, piece, gameOver, paused, started]);

    useEffect(() => {
        if (!started || gameOver || paused) return;
        intervalRef.current = setInterval(drop, Math.max(100, 500 - lines * 10));
        return () => clearInterval(intervalRef.current);
    }, [drop, started, gameOver, paused, lines]);

    useEffect(() => {
        const handler = (e) => {
            if (!started || gameOver) return;
            if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) e.preventDefault();
            if (e.key === 'p' || e.key === 'P') { setPaused(p => !p); return; }
            if (paused) return;
            if (e.key === 'ArrowLeft' && valid(board, piece, -1, 0)) setPiece(p => ({ ...p, x: p.x - 1 }));
            if (e.key === 'ArrowRight' && valid(board, piece, 1, 0)) setPiece(p => ({ ...p, x: p.x + 1 }));
            if (e.key === 'ArrowDown') drop();
            if (e.key === 'ArrowUp') {
                const rotated = rotate(piece.shape);
                if (valid(board, piece, 0, 0, rotated)) setPiece(p => ({ ...p, shape: rotated }));
            }
            if (e.key === ' ') {
                let dy = 0;
                while (valid(board, piece, 0, dy + 1)) dy++;
                setPiece(p => ({ ...p, y: p.y + dy }));
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [board, piece, drop, started, gameOver, paused]);

    const restart = () => {
        setBoard(createBoard());
        setPiece(randomPiece());
        setScore(0);
        setLines(0);
        setGameOver(false);
        setPaused(false);
        setStarted(true);
    };

    const display = merge(board, piece);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">TETRIS</h1>

            <div className="flex gap-6 items-start">
                {/* Board */}
                <div
                    className="border-2 border-gray-600 rounded-lg overflow-hidden bg-gray-950 shadow-2xl shadow-purple-900/20"
                    style={{ width: COLS * CELL + 2, height: ROWS * CELL + 2 }}
                >
                    {display.map((row, r) => (
                        <div key={r} className="flex">
                            {row.map((cell, c) => (
                                <div
                                    key={c}
                                    style={{
                                        width: CELL, height: CELL,
                                        backgroundColor: cell || '#111827',
                                        border: cell ? '1px solid rgba(255,255,255,0.2)' : '1px solid #1f2937',
                                        borderRadius: cell ? 3 : 0,
                                    }}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                {/* Info */}
                <div className="w-40 space-y-4">
                    <div className="bg-gray-800 rounded-xl p-4">
                        <p className="text-gray-400 text-xs mb-1">Ball</p>
                        <p className="text-2xl font-bold text-cyan-400">{score}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4">
                        <p className="text-gray-400 text-xs mb-1">Qatorlar</p>
                        <p className="text-2xl font-bold text-purple-400">{lines}</p>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                        <p>← → Harakatlanish</p>
                        <p>↑ Aylantirish</p>
                        <p>↓ Past</p>
                        <p>Space Tushirish</p>
                        <p>P Pauza</p>
                    </div>
                    {!started && (
                        <button onClick={restart} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-xl font-bold hover:from-cyan-700 hover:to-purple-700 transition-all">
                            Boshlash
                        </button>
                    )}
                    {started && (
                        <button onClick={restart} className="w-full py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 transition-colors">
                            Qayta boshlash
                        </button>
                    )}
                </div>
            </div>

            {/* Overlays */}
            {gameOver && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-2xl p-8 text-center">
                        <h2 className="text-3xl font-bold text-red-400 mb-2">O'yin tugadi!</h2>
                        <p className="text-xl text-gray-300 mb-4">Ball: <span className="text-cyan-400 font-bold">{score}</span></p>
                        <button onClick={restart} className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-xl font-bold hover:from-cyan-700 hover:to-purple-700">
                            Qayta boshlash
                        </button>
                    </div>
                </div>
            )}

            {paused && !gameOver && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-2xl p-8 text-center">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-2">⏸ Pauza</h2>
                        <p className="text-gray-400">P bosing davom ettirish uchun</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tetris;
