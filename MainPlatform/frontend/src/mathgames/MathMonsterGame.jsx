import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Trophy, Star, Lock, CheckCircle, Play, ArrowLeft, Coins } from 'lucide-react';
import GuestGuard from '../components/Common/GuestGuard';
import coinService from '../services/coinService';
import './MathMonsterGame.css';

const MatematikaSarguzashti = () => {
  const { t } = useLanguage();
  const [difficulty, setDifficulty] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showFeedback, setShowFeedback] = useState(null);
  const [showCoins, setShowCoins] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  
  const [levelStars, setLevelStars] = useState(() => {
    const saved = {};
    [1, 2, 3].forEach(diff => {
      saved[diff] = JSON.parse(localStorage.getItem(`levelStars_${diff}`) || '{}');
    });
    return saved;
  });

  const [completedLevels, setCompletedLevels] = useState(() => {
    const saved = {};
    [1, 2, 3].forEach(diff => {
      saved[diff] = JSON.parse(localStorage.getItem(`completedLevels_${diff}`) || '[]');
    });
    return saved;
  });

  const [totalScore, setTotalScore] = useState(() => {
    const saved = {};
    [1, 2, 3].forEach(diff => {
      saved[diff] = parseInt(localStorage.getItem(`totalScore_${diff}`) || '0');
    });
    return saved;
  });

  const difficulties = [
    { id: 1, name: t('math_easy'), min: 0, max: 10, color: 'green', emoji: '' },
    { id: 2, name: t('math_medium'), min: 10, max: 100, color: 'blue', emoji: '' },
    { id: 3, name: t('math_hard'), min: 100, max: 1000, color: 'purple', emoji: '' }
  ];

  const TOTAL_LEVELS = 50;
  const QUESTIONS_PER_LEVEL = 10;

  const encouragements = [
    t('math_enc1'),
    t('math_enc2'),
    t('math_enc3'),
    t('math_enc4'),
    t('math_enc5'),
    t('math_enc6'),
    t('math_enc7')
  ];

  const tryAgainMessages = [
    t('math_tryAgain1'),
    t('math_tryAgain2'),
    t('math_tryAgain3'),
    t('math_tryAgain4')
  ];

  const saveProgress = (diff, levels, stars, score) => {
    localStorage.setItem(`completedLevels_${diff}`, JSON.stringify(levels));
    localStorage.setItem(`levelStars_${diff}`, JSON.stringify(stars));
    localStorage.setItem(`totalScore_${diff}`, score.toString());
  };

  const calculateStars = (correct) => {
    if (correct === 10) return 3;
    if (correct >= 7) return 2;
    if (correct >= 5) return 1;
    return 0;
  };

  const generateQuestion = (diff) => {
    const diffSettings = difficulties.find(d => d.id === diff);
    
    // 10-leveldan keyin 3 talik misollar
    if (currentLevel > 10) {
      const operations = [
        { op1: '+', op2: '+' },
        { op1: '+', op2: '-' },
        { op1: '-', op2: '+' }
      ];
      const ops = operations[Math.floor(Math.random() * operations.length)];
      
      let num1 = Math.floor(Math.random() * (diffSettings.max - diffSettings.min + 1)) + diffSettings.min;
      let num2 = Math.floor(Math.random() * (diffSettings.max - diffSettings.min + 1)) + diffSettings.min;
      let num3 = Math.floor(Math.random() * (diffSettings.max - diffSettings.min + 1)) + diffSettings.min;
      
      // Birinchi amal
      let temp = ops.op1 === '+' ? num1 + num2 : num1 - num2;
      
      // Manfiy bo'lmaslik uchun
      if (temp < 0) {
        [num1, num2] = [num2, num1];
        temp = ops.op1 === '+' ? num1 + num2 : num1 - num2;
      }
      
      // Ikkinchi amal
      let correctAnswer = ops.op2 === '+' ? temp + num3 : temp - num3;
      
      // Oxirgi javob manfiy bo'lmaslik uchun
      if (correctAnswer < 0) {
        if (ops.op2 === '-') {
          num3 = Math.floor(Math.random() * temp);
          correctAnswer = temp - num3;
        }
      }
      
      const answers = [correctAnswer];
      while (answers.length < 4) {
        const offset = Math.floor(Math.random() * 20) - 10;
        const wrongAnswer = correctAnswer + offset;
        if (!answers.includes(wrongAnswer) && wrongAnswer >= 0) {
          answers.push(wrongAnswer);
        }
      }
      
      answers.sort(() => Math.random() - 0.5);
      
      setQuestion({
        num1,
        num2,
        num3,
        operation1: ops.op1,
        operation2: ops.op2,
        correctAnswer,
        answers,
        isThreeNumbers: true
      });
    } else {
      // 10-levelgacha oddiy 2 talik misollar
      const operations = ['+', '-'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      let num1 = Math.floor(Math.random() * (diffSettings.max - diffSettings.min + 1)) + diffSettings.min;
      let num2 = Math.floor(Math.random() * (diffSettings.max - diffSettings.min + 1)) + diffSettings.min;
      
      if (operation === '-' && num1 < num2) {
        [num1, num2] = [num2, num1];
      }
      
      const correctAnswer = operation === '+' ? num1 + num2 : num1 - num2;
      
      const answers = [correctAnswer];
      while (answers.length < 4) {
        const offset = Math.floor(Math.random() * 20) - 10;
        const wrongAnswer = correctAnswer + offset;
        if (!answers.includes(wrongAnswer) && wrongAnswer >= 0) {
          answers.push(wrongAnswer);
        }
      }
      
      answers.sort(() => Math.random() - 0.5);
      
      setQuestion({
        num1,
        num2,
        operation,
        correctAnswer,
        answers,
        isThreeNumbers: false
      });
    }
  };

  const selectDifficulty = (diffId) => {
    setDifficulty(diffId);
  };

  const startLevel = (levelNum) => {
    const canPlay = levelNum === 1 || completedLevels[difficulty].includes(levelNum - 1);
    if (!canPlay) return;
    
    setCurrentLevel(levelNum);
    setQuestionNumber(1);
    setCorrectAnswers(0);
    generateQuestion(difficulty);
  };

  const checkAnswer = (selectedAnswer) => {
    if (selectedAnswer === question.correctAnswer) {
      const message = encouragements[Math.floor(Math.random() * encouragements.length)];
      setShowFeedback({ correct: true, message });
      setCorrectAnswers(correctAnswers + 1);
      setShowCoins(true);
      playSound(true);
      
      setTimeout(() => {
        setShowFeedback(null);
        setShowCoins(false);
        
        if (questionNumber < QUESTIONS_PER_LEVEL) {
          setQuestionNumber(questionNumber + 1);
          generateQuestion(difficulty);
        } else {
          // Level tugadi - yulduzchalarni hisoblash
          const newStars = calculateStars(correctAnswers + 1);
          const currentStars = levelStars[difficulty][currentLevel] || 0;
          const finalStars = Math.max(newStars, currentStars);
          
          setEarnedStars(finalStars);
          setShowLevelComplete(true);
          
          // Progressni saqlash
          const newCompletedLevels = { ...completedLevels };
          if (!newCompletedLevels[difficulty].includes(currentLevel)) {
            newCompletedLevels[difficulty] = [...newCompletedLevels[difficulty], currentLevel];
          }
          
          const newLevelStars = { ...levelStars };
          if (!newLevelStars[difficulty]) newLevelStars[difficulty] = {};
          newLevelStars[difficulty][currentLevel] = finalStars;
          
          const newScore = { ...totalScore };
          const scoreDiff = (finalStars - currentStars) * 10;
          newScore[difficulty] = (newScore[difficulty] || 0) + Math.max(0, scoreDiff);
          
          setCompletedLevels(newCompletedLevels);
          setLevelStars(newLevelStars);
          setTotalScore(newScore);
          
          saveProgress(difficulty, newCompletedLevels[difficulty], newLevelStars[difficulty], newScore[difficulty]);
          
          // Backend coin reward
          coinService.awardGameCoins('math_monster', true, correctAnswers + 1).then(res => {
            if (res.coins_earned > 0) setEarnedCoins(res.coins_earned);
          });
        }
      }, 2000);
    } else {
      const message = tryAgainMessages[Math.floor(Math.random() * tryAgainMessages.length)];
      setShowFeedback({ correct: false, message });
      playSound(false);
      
      setTimeout(() => {
        setShowFeedback(null);
        
        if (questionNumber < QUESTIONS_PER_LEVEL) {
          setQuestionNumber(questionNumber + 1);
          generateQuestion(difficulty);
        } else {
          // Level tugadi - yulduzchalarni hisoblash
          const newStars = calculateStars(correctAnswers);
          const currentStars = levelStars[difficulty][currentLevel] || 0;
          const finalStars = Math.max(newStars, currentStars);
          
          setEarnedStars(finalStars);
          setShowLevelComplete(true);
          
          // Progressni saqlash
          const newCompletedLevels = { ...completedLevels };
          if (!newCompletedLevels[difficulty].includes(currentLevel)) {
            newCompletedLevels[difficulty] = [...newCompletedLevels[difficulty], currentLevel];
          }
          
          const newLevelStars = { ...levelStars };
          if (!newLevelStars[difficulty]) newLevelStars[difficulty] = {};
          newLevelStars[difficulty][currentLevel] = finalStars;
          
          const newScore = { ...totalScore };
          const scoreDiff = (finalStars - currentStars) * 10;
          newScore[difficulty] = (newScore[difficulty] || 0) + Math.max(0, scoreDiff);
          
          setCompletedLevels(newCompletedLevels);
          setLevelStars(newLevelStars);
          setTotalScore(newScore);
          
          saveProgress(difficulty, newCompletedLevels[difficulty], newLevelStars[difficulty], newScore[difficulty]);
          
          // Backend coin reward (even partial completion)
          if (correctAnswers >= 5) {
            coinService.awardGameCoins('math_monster', true, correctAnswers).then(res => {
              if (res.coins_earned > 0) setEarnedCoins(res.coins_earned);
            });
          } else {
            setEarnedCoins(0);
          }
        }
      }, 1500);
    }
  };

  const playSound = (isCorrect) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (isCorrect) {
      oscillator.frequency.value = 523.25;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 659.25;
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.2);
      }, 100);
    } else {
      oscillator.frequency.value = 200;
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  };

  const closeLevelComplete = () => {
    setShowLevelComplete(false);
    setCurrentLevel(null);
    setQuestion(null);
    setEarnedCoins(0);
  };

  const backToDifficulties = () => {
    setDifficulty(null);
    setCurrentLevel(null);
    setQuestion(null);
  };

  const backToLevels = () => {
    setCurrentLevel(null);
    setQuestion(null);
  };

  const getLevelStatus = (levelNum) => {
    if (completedLevels[difficulty].includes(levelNum)) return 'completed';
    if (levelNum === 1 || completedLevels[difficulty].includes(levelNum - 1)) return 'available';
    return 'locked';
  };

  const getLevelColorClass = (levelNum) => {
    const status = getLevelStatus(levelNum);
    if (status === 'completed') return 'level-completed';
    if (status === 'available') return 'level-available';
    return 'level-locked';
  };

  const getLevelIcon = (levelNum) => {
    const status = getLevelStatus(levelNum);
    if (status === 'completed') return <CheckCircle className="level-icon" />;
    if (status === 'available') return <Play className="level-icon" />;
    return <Lock className="level-icon" />;
  };

  // Asosiy render qismi
  if (!difficulty) {
    return (
      <div className="matematika-container22">
        <div className="card-wrapper22">
         
          
          <div className="difficulty-grid">
            {difficulties.map((diff) => {
              const totalStars = Object.values(levelStars[diff.id] || {}).reduce((a, b) => a + b, 0);
              const maxStars = TOTAL_LEVELS * 3;
              
              return (
                <button
                  key={diff.id}
                  onClick={() => selectDifficulty(diff.id)}
                  className={`difficulty-card difficulty-${diff.color}`}
                >
                  <div className="difficulty-emoji">
                    {diff.emoji}
                  </div>
                  <div className={`difficulty-name text-${diff.color}`}>
                    {diff.name}
                  </div>
                  <div className="difficulty-info">
                  
                  </div>
                  <div className="score-display">
                    <Trophy className="trophy-icon" />
                    <span className="score-value">
                      {totalScore[diff.id] || 0} {t('math_points')}
                    </span>
                  </div>
                  <div className="stars-display">
                                     
                  </div>
                  <div className="completion-status">
                    {completedLevels[diff.id].length}/50 {t('math_completed')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (difficulty && !currentLevel) {
    const diffSettings = difficulties.find(d => d.id === difficulty);
    return (
      <div className="matematika-container">
        <div className="levels-wrapper1">
          <div className="levels-header1">
            <div><button
              onClick={backToDifficulties}
              className="back-button"
            >
              <ArrowLeft className="back-icon" />
             
            </button> </div>
            <div className="total-score-display">
              <Trophy className="total-trophy-icon" />
              <span className="total-score-value">{totalScore[difficulty] || 0}</span>
            </div>
          </div>

          <h2 className="levels-title">
            {diffSettings.name}
          </h2>
          <p className="levels-subtitle">
            {completedLevels[difficulty].length}/{TOTAL_LEVELS} {t('math_level')} {t('math_completed')}
          </p>

          <div className="levels-grid">
            {[...Array(TOTAL_LEVELS)].map((_, i) => {
              const levelNum = i + 1;
              const status = getLevelStatus(levelNum);
              const isClickable = status !== 'locked';
              const stars = levelStars[difficulty]?.[levelNum] || 0;

              return (
                <button
                  key={levelNum}
                  onClick={() => startLevel(levelNum)}
                  disabled={!isClickable}
                  className={`level-button ${getLevelColorClass(levelNum)} ${isClickable ? 'clickable' : 'locked'}`}
                >
                  <div className="level-icon-wrapper">
                    {getLevelIcon(levelNum)}
                  </div>
                  <div className="level-number">
                    {levelNum}
                  </div>
                  {stars > 0 && (
                    <div className="level-stars">
                      {[...Array(stars)].map((_, idx) => (
                        <Star 
                          key={idx} 
                          className="level-star-icon" 
                          fill="currentColor" 
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <GuestGuard contentType="math" contentId={`level-${difficulty || 'unknown'}`}>
      <div className="matematika-container1">
        <div className="game-wrapper1">
        <div className="game-header">
          <button
            onClick={backToLevels}
            className="game-back-button"
          >
            <ArrowLeft className="game-back-icon" />
            
          </button>
          <div className="game-info">
            <span className="game-level-info">
               {currentLevel} -  {questionNumber}/{QUESTIONS_PER_LEVEL}
            </span>
          </div>
          <div className="game-score">
            <span className="correct-answers">
              ✓ {correctAnswers}
            </span>
          </div>
        </div>

        {question && (
          <div className="game-content">
            <div className="question-display1">
              <div className="question-text1">
                {question.isThreeNumbers ? (
                  <span>{question.num1} {question.operation1} {question.num2} {question.operation2} {question.num3} = ?</span>
                ) : (
                  <span>{question.num1} {question.operation} {question.num2} = ?</span>
                )}
              </div>
            </div>

            <div className="answers-grid">
              {question.answers.map((answer, index) => (
                <button
                  key={index}
                  onClick={() => checkAnswer(answer)}
                  disabled={showFeedback !== null}
                  className="answer-button"
                >
                  {answer}
                </button>
              ))}
            </div>
          </div>
        )}

        {showFeedback && (
          <div className="feedback-overlay">
            <div className={`feedback-modal ${showFeedback.correct ? 'correct' : 'incorrect'}`}>
              <div className="feedback-emoji">
                {showFeedback.correct ? <CheckCircle size={48} className="text-green-500" /> : <Star size={48} className="text-orange-500" />}
              </div>
              <div className="feedback-text">
                {showFeedback.message}
              </div>
            </div>
          </div>
        )}

        {showLevelComplete && (
          <div className="level-complete-overlay">
            <div className="level-complete-modal">
              <div className="level-complete-emoji">🎊</div>
              <h2 className="level-complete-title">
                {t('math_levelFinished')} {currentLevel}!
              </h2>
              <div className="level-complete-result">
                {t('math_correctAnswers')}: {correctAnswers}/{QUESTIONS_PER_LEVEL}
              </div>
              <div className="earned-stars">
                {[...Array(3)].map((_, idx) => (
                  <Star 
                    key={idx} 
                    className={`star-earned ${idx < earnedStars ? 'earned' : 'not-earned'}`}
                    fill={idx < earnedStars ? 'currentColor' : 'none'}
                    style={{
                      animationDelay: `${idx * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              {earnedCoins > 0 && (
                <div className="earned-coins-display" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',margin:'12px 0',padding:'8px 16px',background:'#FEF3C7',borderRadius:'12px',border:'1px solid #FDE68A'}}>
                  <Coins size={20} style={{color:'#D97706'}} />
                  <span style={{fontWeight:'bold',color:'#92400E',fontSize:'1.1rem'}}>+{earnedCoins} coin</span>
                </div>
              )}
              <button
                onClick={closeLevelComplete}
                className="continue-button"
              >
                {t('math_continue')}
              </button>
            </div>
          </div>
        )}

        {showCoins && (
          <div className="coins-overlay">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="coin-animation"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              >
                <Star className="coin-icon" fill="currentColor" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </GuestGuard>
  );
};

export default MatematikaSarguzashti;
