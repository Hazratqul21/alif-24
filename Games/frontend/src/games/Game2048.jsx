import React, { useState, useEffect, useCallback } from 'react';

const SIZE = 4;
const createEmpty = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

const TILE_COLORS = {
    0: '#1e293b', 2: '#e2e8f0', 4: '#cbd5e1', 8: '#f59e0b', 16: '#f97316',
    32: '#ef4444', 64: '#dc2626', 128: '#eab308', 256: '#facc15',
    512: '#a3e635', 1024: '#22c55e', 2048: '#6366f1', 4096: '#a855f7',
};

const TILE_TEXT = {
    0: 'transparent', 2: '#1e293b', 4: '#1e293b', 8: '#fff', 16: '#fff',
    32: '#fff', 64: '#fff', 128: '#fff', 256: '#fff',
    512: '#fff', 1024: '#fff', 2048: '#fff', 4096: '#fff',
};

const addRandom = (grid) => {
    const empty = [];
    grid.forEach((row, r) => row.forEach((cell, c) => { if (!cell) empty.push([r, c]); }));
    if (!empty.length) return grid;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const g = grid.map(row => [...row]);
    g[r][c] = Math.random() < 0.9 ? 2 : 4;
    return g;
};

const slideRow = (row) => {
    let arr = row.filter(v => v);
    let score = 0;
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
            arr[i] *= 2;
            score += arr[i]; // only add merged value
            arr.splice(i + 1, 1);
        }
    }
    while (arr.length < SIZE) arr.push(0);
    return { row: arr, moved: arr.some((v, i) => v !== row[i]), score };
};

const move = (grid, dir) => {
    let g = grid.map(r => [...r]);
    let moved = false;
    let score = 0;

    if (dir === 'left') {
        g = g.map(row => {
            const res = slideRow(row);
            if (res.moved) moved = true;
            score += res.score;
            return res.row;
        });
    } else if (dir === 'right') {
        g = g.map(row => {
            const res = slideRow([...row].reverse());
            if (res.moved) moved = true;
            score += res.score;
            return res.row.reverse();
        });
    } else if (dir === 'up') {
        for (let c = 0; c < SIZE; c++) {
            const col = g.map(r => r[c]);
            const res = slideRow(col);
            if (res.moved) moved = true;
            score += res.score;
            res.row.forEach((v, r) => g[r][c] = v);
        }
    } else if (dir === 'down') {
        for (let c = 0; c < SIZE; c++) {
            const col = g.map(r => r[c]).reverse();
            const res = slideRow(col);
            if (res.moved) moved = true;
            score += res.score;
            res.row.reverse().forEach((v, r) => g[r][c] = v);
        }
    }

    return { grid: g, moved, score };
};

const canMove = (grid) => {
    for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
            if (!grid[r][c]) return true;
            if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
            if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
        }
    return false;
};

const hasWon = (grid) => grid.some(r => r.some(v => v >= 2048));

const initGrid = () => addRandom(addRandom(createEmpty()));

const Game2048 = () => {
    const [grid, setGrid] = useState(initGrid);
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(() => parseInt(localStorage.getItem('2048_best') || '0'));
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);

    const handleMove = useCallback((dir) => {
        if (gameOver) return;
        const result = move(grid, dir);
        if (result.moved) {
            const newGrid = addRandom(result.grid);
            setGrid(newGrid);
            const newScore = score + result.score; // add only merged values
            setScore(newScore);
            if (newScore > best) {
                setBest(newScore);
                localStorage.setItem('2048_best', String(newScore));
            }
            if (hasWon(newGrid) && !won) setWon(true);
            if (!canMove(newGrid)) setGameOver(true);
        }
    }, [grid, gameOver, won, best]);

    useEffect(() => {
        const handler = (e) => {
            const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
            if (map[e.key]) {
                e.preventDefault();
                handleMove(map[e.key]);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleMove]);

    // Touch support
    const touchRef = React.useRef(null);
    const handleTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const handleTouchEnd = (e) => {
        if (!touchRef.current) return;
        const dx = e.changedTouches[0].clientX - touchRef.current.x;
        const dy = e.changedTouches[0].clientY - touchRef.current.y;
        if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? 'right' : 'left');
        else handleMove(dy > 0 ? 'down' : 'up');
        touchRef.current = null;
    };

    const restart = () => {
        setGrid(initGrid());
        setScore(0);
        setGameOver(false);
        setWon(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 p-4"
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        >
            <h1 className="text-5xl font-bold text-amber-800 mb-1">2048</h1>
            <p className="text-amber-600 text-sm mb-4">Plitalarni birlashtiring!</p>

            {/* Score */}
            <div className="flex gap-3 mb-4">
                <div className="bg-amber-700 rounded-lg px-5 py-2 text-center min-w-[80px]">
                    <p className="text-amber-300 text-xs">BALL</p>
                    <p className="text-white text-xl font-bold">{score}</p>
                </div>
                <div className="bg-amber-700 rounded-lg px-5 py-2 text-center min-w-[80px]">
                    <p className="text-amber-300 text-xs">ENG YAXSHI</p>
                    <p className="text-white text-xl font-bold">{best}</p>
                </div>
            </div>

            {/* Grid */}
            <div className="bg-amber-800 p-3 rounded-xl shadow-2xl relative">
                <div className="grid grid-cols-4 gap-2">
                    {grid.flat().map((val, i) => (
                        <div
                            key={i}
                            className="w-[72px] h-[72px] rounded-lg flex items-center justify-center font-bold transition-all duration-100"
                            style={{
                                backgroundColor: TILE_COLORS[val] || '#6366f1',
                                color: TILE_TEXT[val] || '#fff',
                                fontSize: val >= 1024 ? 18 : val >= 128 ? 22 : 28,
                            }}
                        >
                            {val || ''}
                        </div>
                    ))}
                </div>

                {/* Game Over Overlay */}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white mb-2">O'yin tugadi!</p>
                            <button onClick={restart} className="px-6 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors">
                                Qayta boshlash
                            </button>
                        </div>
                    </div>
                )}

                {/* Win Overlay */}
                {won && !gameOver && (
                    <div className="absolute inset-0 bg-yellow-400/70 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-amber-900 mb-2">🎉 2048!</p>
                            <div className="flex gap-2">
                                <button onClick={() => setWon(false)} className="px-4 py-2 bg-amber-800 text-white rounded-lg font-bold hover:bg-amber-900">
                                    Davom etish
                                </button>
                                <button onClick={restart} className="px-4 py-2 bg-white text-amber-800 rounded-lg font-bold hover:bg-gray-100">
                                    Yangi o'yin
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 text-xs text-amber-600 text-center">
                <p>Strelka tugmalari yoki suring harakatlanish uchun</p>
            </div>

            <button onClick={restart} className="mt-3 px-6 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors">
                Yangi o'yin
            </button>
        </div>
    );
};

export default Game2048;
