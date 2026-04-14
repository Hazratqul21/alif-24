import { useState, useEffect, useRef } from "react";

const COLORS = [
  { id: 0, name: "red", bg: "bg-red-500", active: "bg-red-300", sound: 261.63 },
  { id: 1, name: "blue", bg: "bg-blue-500", active: "bg-blue-300", sound: 329.63 },
  { id: 2, name: "green", bg: "bg-green-500", active: "bg-green-300", sound: 392.00 },
  { id: 3, name: "yellow", bg: "bg-yellow-400", active: "bg-yellow-200", sound: 523.25 },
];

const INITIAL_SPEED = 800;
const MIN_SPEED = 300;

export default function SimonGame() {
  const [sequence, setSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [activeColor, setActiveColor] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("simon_highscore") || "0"));
  const [status, setStatus] = useState("Tap Start to Play!");
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const audioCtx = useRef(null);
  const nextRoundTimer = useRef(null);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("simon_highscore", score.toString());
    }
  }, [score, highScore]);

  const playSound = (frequency) => {
    if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const oscillator = audioCtx.current.createOscillator();
    const gainNode = audioCtx.current.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audioCtx.current.currentTime);

    gainNode.gain.setValueAtTime(0.5, audioCtx.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.4);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.current.destination);

    oscillator.start();
    oscillator.stop(audioCtx.current.currentTime + 0.4);
  };

  const startNewGame = () => {
    setSequence([]);
    setUserSequence([]);
    setScore(0);
    setIsPlaying(true);
    setSpeed(INITIAL_SPEED);
    const firstColor = Math.floor(Math.random() * 4);
    showSequence([firstColor]);
  };

  const showSequence = async (newSequence) => {
    setIsShowingSequence(true);
    setStatus("Watch carefully...");
    setSequence(newSequence);

    for (let i = 0; i < newSequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, speed * 0.2));
      const colorId = newSequence[i];
      setActiveColor(colorId);
      playSound(COLORS[colorId].sound);
      await new Promise(resolve => setTimeout(resolve, speed * 0.8));
      setActiveColor(null);
    }

    setIsShowingSequence(false);
    setUserSequence([]);
    setStatus("Your turn!");
  };

  const handleColorClick = (colorId) => {
    if (!isPlaying || isShowingSequence) return;

    playSound(COLORS[colorId].sound);
    setActiveColor(colorId);
    setTimeout(() => setActiveColor(null), 200);

    const newUserSequence = [...userSequence, colorId];
    setUserSequence(newUserSequence);

    if (colorId !== sequence[newUserSequence.length - 1]) {
      clearTimeout(nextRoundTimer.current);
      setStatus("Oops! Wrong color!");
      setIsPlaying(false);
      setTimeout(() => setStatus("Game Over! Try Again?"), 1000);
      return;
    }

    if (newUserSequence.length === sequence.length) {
      setScore(s => s + 1);
      setStatus("Correct! Well done!");
      setSpeed(prev => Math.max(MIN_SPEED, prev - 20));

      nextRoundTimer.current = setTimeout(() => {
        const nextSequence = [...sequence, Math.floor(Math.random() * 4)];
        showSequence(nextSequence);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black mb-2 tracking-tight">SIMON SAYS</h1>
        <div className="flex gap-8 justify-center items-center">
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs uppercase font-bold tracking-widest">Score</span>
            <span className="text-3xl font-mono text-emerald-400">{score}</span>
          </div>
          <div className="flex flex-col border-l border-slate-700 pl-8">
            <span className="text-slate-400 text-xs uppercase font-bold tracking-widest">Best</span>
            <span className="text-3xl font-mono text-amber-400">{highScore}</span>
          </div>
        </div>
      </div>

      <div className={`mb-8 px-6 py-2 rounded-full border border-slate-700 bg-slate-800 transition-all duration-300 ${isShowingSequence ? 'opacity-100 scale-105' : 'opacity-70'}`}>
         <p className="text-sm font-bold tracking-wide uppercase text-slate-300 italic">
            {status}
         </p>
      </div>

      <div className="relative w-72 h-72 sm:w-96 sm:h-96 grid grid-cols-2 gap-4 p-4 rounded-full bg-slate-800 shadow-2xl border-4 border-slate-700">
        {COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => handleColorClick(color.id)}
            disabled={!isPlaying || isShowingSequence}
            className={`
              w-full h-full rounded-2xl transition-all duration-100
              ${activeColor === color.id ? color.active + ' scale-95 opacity-100' : color.bg + ' opacity-60'}
              ${!isPlaying || isShowingSequence ? 'cursor-default' : 'hover:scale-105 hover:opacity-100 cursor-pointer active:scale-90 shadow-lg'}
            `}
            style={{
                borderRadius: color.id === 0 ? '100% 20% 20% 20%' :
                              color.id === 1 ? '20% 100% 20% 20%' :
                              color.id === 2 ? '20% 20% 20% 100%' : '20% 20% 100% 20%'
            }}
          />
        ))}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-900 rounded-full flex items-center justify-center p-2 border-4 border-slate-800 shadow-xl pointer-events-auto">
            {!isPlaying ? (
              <button
                onClick={startNewGame}
                className="w-full h-full bg-emerald-500 rounded-full flex items-center justify-center text-slate-900 font-black text-sm uppercase tracking-tighter hover:bg-emerald-400 active:scale-90 transition-all shadow-inner"
              >
                Start
              </button>
            ) : (
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Level</span>
                    <span className="text-xl font-black text-white">{sequence.length}</span>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-slate-500 max-w-xs">
          <p className="text-xs uppercase font-bold tracking-widest mb-2">How to Play</p>
          <p className="text-sm leading-relaxed">
            Simon will light up a color and play a sound. Follow the sequence to score points!
          </p>
      </div>
    </div>
  );
}
