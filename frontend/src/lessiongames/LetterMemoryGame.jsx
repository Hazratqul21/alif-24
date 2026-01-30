import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './LetterMemoryGame.css';

// React + Vite + CSS versiyasi (framer-motion/react-query/base44 yo'q)
const getDifficultyLevels = (t) => ({
  easy: { pairs: 6, name: t('memory_easy'), emoji: '😊' },
  medium: { pairs: 8, name: t('memory_medium'), emoji: '🤔' },
  hard: { pairs: 15, name: t('memory_hard'), emoji: '🔥' },
});

const UZBEK_SET = [
  { letter: 'O', emoji: '🍎'},
  { letter: 'A', emoji: '🐝' },
  { letter: 'I', emoji: '🐶' },
  { letter: 'T', emoji: '🥚' },
  { letter: 'B', emoji: '🐟' },
  { letter: 'S', emoji: '🎁' },
  { letter: 'U', emoji: '🏠' },
  { letter: 'M', emoji: '🍦' },
  { letter: 'J', emoji: '🦒' },
  { letter: 'K', emoji: '🔑' },
  { letter: 'Sh', emoji: '🦁' },
  { letter: 'V', emoji: '🪁' },
  { letter: 'G', emoji: '🍒' },
  { letter: 'D', emoji: '🌳' },
  { letter: 'E', emoji: '🐐' },
  { letter: 'Z', emoji: '🦓' },
  { letter: 'L', emoji: '🌷' },

];

export default function MemoryGame() {
  const { t } = useLanguage();
  const DIFFICULTY_LEVELS = getDifficultyLevels(t);
  const checkTimeoutRef = useRef(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [showDifficultySelect, setShowDifficultySelect] = useState(true);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [bestScore, setBestScore] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (startTime) {
      const i = setInterval(() => setElapsedTime(Math.floor((Date.now() - startTime) / 1000)), 1000);
      return () => clearInterval(i);
    }
  }, [startTime]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const initializeGame = (reset = false) => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    if (reset) {
      setShowDifficultySelect(true);
      setCards([]); setFlipped([]); setMatched([]);
      setMoves(0); setIsChecking(false);
      setBestScore((prev) => (prev ?? null));
      setStartTime(null); setElapsedTime(0);
      return;
    }
    const numPairs = DIFFICULTY_LEVELS[difficulty].pairs;
    const selected = [...UZBEK_SET].sort(() => Math.random() - 0.5).slice(0, numPairs);
    const gameCards = [];
    selected.forEach((it, idx) => {
      gameCards.push({ id: `l-${idx}`, type: 'letter', content: it.letter, matchId: idx, color: it.color });
      gameCards.push({ id: `e-${idx}`, type: 'emoji', content: it.emoji, matchId: idx, color: it.color });
    });
    setCards(gameCards.sort(() => Math.random() - 0.5));
    setFlipped([]); setMatched([]); setMoves(0); setIsChecking(false);
    setStartTime(Date.now()); setElapsedTime(0);
    setShowDifficultySelect(false);
  };

  useEffect(() => {
    if (!showDifficultySelect && cards.length === 0) initializeGame();
  }, [showDifficultySelect, cards.length]);

  const startGame = (d) => { setDifficulty(d); setShowDifficultySelect(false); };
  const isFlipped = (id) => flipped.includes(id) || matched.includes(id);
  const isMatched = (id) => matched.includes(id);

  const handleCardClick = (id) => {
    if (flipped.length === 2 || isChecking) return;
    if (flipped.includes(id) || matched.includes(id)) return;
    const nf = [...flipped, id];
    setFlipped(nf);
    if (nf.length === 2) {
      setIsChecking(true); setMoves((m) => m + 1);
      const c1 = cards.find((c) => c.id === nf[0]);
      const c2 = cards.find((c) => c.id === nf[1]);
      if (c1.matchId === c2.matchId && c1.type !== c2.type) {
        checkTimeoutRef.current = setTimeout(() => {
          const nm = [...matched, nf[0], nf[1]];
          setMatched(nm); setFlipped([]); setIsChecking(false);
          if (nm.length === cards.length) {
            if (!bestScore || moves < bestScore) setBestScore(moves);
          }
        }, 500);
      } else {
        checkTimeoutRef.current = setTimeout(() => { setFlipped([]); setIsChecking(false); }, 900);
      }
    }
  };

  useEffect(() => () => { if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current); }, []);

  if (showDifficultySelect) {
    return (
      <div className="lmg-container">
        <div className="lmg-card">
          <h1 className="lmg-title">🃏 {t('memory_title')}</h1>
          <p className="lmg-sub">{t('memory_select_difficulty')}</p>
          <div className="lmg-grid">
            {Object.entries(DIFFICULTY_LEVELS).map(([key, level]) => (
              <button key={key} className="lmg-btn" onClick={() => startGame(key)}>
                <span className="lmg-emoji">{level.emoji}</span>
                <span className="lmg-name">{level.name}</span>
                <span className="lmg-info">{level.pairs} {t('memory_pairs')}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lmg-container">
      <div className="lmg-card">
        <div className="lmg-header">
          <button className="lmg-icon-btn" onClick={() => initializeGame(true)}><ArrowLeft /></button>
          <div className="lmg-title-row">
            <span className="lmg-game">🃏 {t('memory_title')}</span>
            <span className="lmg-level">{DIFFICULTY_LEVELS[difficulty].emoji} {DIFFICULTY_LEVELS[difficulty].name}</span>
          </div>
          <button className="lmg-icon-btn" onClick={() => initializeGame()}><RotateCcw /></button>
        </div>

        <div className="lmg-stats">
          <div className="lmg-stat"><span>⏱️</span><b>{formatTime(elapsedTime)}</b></div>
          <div className="lmg-stat"><span>🎯</span><b>{moves}</b></div>
          <div className="lmg-stat"><span>✅</span><b>{matched.length / 2}</b></div>
        </div>

        <div className={`lmg-grid-cards ${difficulty === 'hard' ? 'cols-5' : 'cols-4'} ${difficulty === 'medium' ? 'mdm' : ''}`}>
          {cards.map((card) => (
            <button
              key={card.id}
              className={`lmg-card-btn ${isMatched(card.id) ? 'matched' : ''}`}
              onClick={() => handleCardClick(card.id)}
              disabled={isMatched(card.id) || isChecking}
            >
              <span className={`lmg-card-content ${card.type === 'letter' ? 'text-letter' : 'text-emoji'}`}>
                {isFlipped(card.id) ? card.content : '❓'}
              </span>
            </button>
          ))}
        </div>

        <div className="lmg-progress">
          <div className="lmg-progress-bar" style={{ width: `${(matched.length / cards.length) * 100}%` }} />
        </div>

        <div className="lmg-hint">
          <p>💡 {t('memory_hint')}</p>
          {bestScore !== null && <p className="lmg-best">🏆 {t('memory_best_score')}: {bestScore} {t('memory_attempts')}</p>}
        </div>
      </div>
    </div>
  );
}
