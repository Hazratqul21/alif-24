import React, { useState } from 'react';
import { Smile, Star, Trophy, Volume2, Zap, Sparkles, Rocket } from 'lucide-react';

const KidsMode = ({ tests }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);

  const handleAnswer = (optionIndex) => {
    setSelectedOption(optionIndex);
    // To'g'ri javobni tekshirish
    setTimeout(() => {
      if (optionIndex === tests[currentQuestion].correctIndex) {
        setScore(score + 1);
      }
      setSelectedOption(null);
      setCurrentQuestion(currentQuestion + 1);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-black to-cyan-900/20"></div>
        
        {/* Stars */}
        <div className="stars-container">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="star"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Colorful Orbs */}
        <div className="neon-orb neon-orb-1"></div>
        <div className="neon-orb neon-orb-2"></div>
        <div className="neon-orb neon-orb-3"></div>
        <div className="neon-orb neon-orb-4"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-3 mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity animate-pulse-slow"></div>
            <div className="relative px-6 py-3 bg-black border-3 border-pink-400 rounded-full">
              <div className="flex items-center gap-2">
                <Rocket className="w-6 h-6 text-cyan-400 animate-bounce-slow" />
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
                  BOLA O'YINLARI
                </span>
                <Sparkles className="w-6 h-6 text-pink-400 animate-spin-slow" />
              </div>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 relative">
            <span className="neon-text-rainbow block mb-3 animate-glow">
              SUPER O'YIN
            </span>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-pink-400 to-transparent blur-sm"></div>
          </h1>

          {/* Score Display */}
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-3 border-yellow-400 rounded-2xl neon-glow-yellow backdrop-blur-sm">
            <Trophy className="w-10 h-10 text-yellow-400 animate-bounce-slow" />
            <span className="text-4xl font-black text-yellow-400 neon-text-yellow">
              {score}
            </span>
            <Star className="w-10 h-10 text-yellow-400 animate-spin-slow" />
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion < tests.length ? (
          <div className="neon-card-kids mb-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center border-3 border-pink-400 neon-glow-pink animate-pulse-slow">
                  <Smile className="w-8 h-8 text-white" />
                </div>
                <span className="text-3xl font-black text-cyan-400 neon-text-cyan">
                  SAVOL {currentQuestion + 1}
                </span>
              </div>
              <button className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl border-3 border-cyan-400 neon-glow-cyan hover:scale-110 transition-transform group">
                <Volume2 className="w-8 h-8 text-white group-hover:animate-pulse" />
              </button>
            </div>

            <div className="mb-8 p-6 bg-black/30 rounded-2xl border-2 border-purple-500/50">
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                {tests[currentQuestion].question}
              </h2>
            </div>

            {/* Options as big neon buttons */}
            <div className="grid sm:grid-cols-2 gap-4">
              {tests[currentQuestion].options.map((option, index) => {
                const colors = [
                  { from: 'from-pink-500', to: 'to-rose-600', border: 'border-pink-400', glow: 'neon-glow-pink' },
                  { from: 'from-cyan-500', to: 'to-blue-600', border: 'border-cyan-400', glow: 'neon-glow-cyan' },
                  { from: 'from-purple-500', to: 'to-violet-600', border: 'border-purple-400', glow: 'neon-glow-purple' },
                  { from: 'from-green-500', to: 'to-emerald-600', border: 'border-green-400', glow: 'neon-glow-green' }
                ];
                const color = colors[index];

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={selectedOption !== null}
                    className={`p-6 rounded-2xl text-xl sm:text-2xl font-black transition-all duration-300 border-3 relative overflow-hidden group ${
                      selectedOption === index
                        ? index === tests[currentQuestion].correctIndex
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 neon-glow-green-strong scale-105 animate-success'
                          : 'bg-gradient-to-br from-red-500 to-rose-600 border-red-400 neon-glow-red scale-105 animate-shake'
                        : `bg-gradient-to-br ${color.from} ${color.to} ${color.border} ${color.glow} hover:scale-105 hover:shadow-2xl`
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    
                    <div className="relative flex items-center justify-center gap-3 text-white">
                      <span className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center text-2xl font-black border-2 border-white/50">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1 text-left">{option}</span>
                      {selectedOption === index && index === tests[currentQuestion].correctIndex && (
                        <Zap className="w-8 h-8 animate-bounce" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="mt-8">
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-700">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 transition-all duration-500 neon-glow-rainbow"
                  style={{ width: `${((currentQuestion + 1) / tests.length) * 100}%` }}
                ></div>
              </div>
              <p className="text-center text-cyan-400 font-black mt-2 text-sm">
                {currentQuestion + 1} / {tests.length}
              </p>
            </div>
          </div>
        ) : (
          <div className="neon-card-kids text-center animate-fadeIn">
            <div className="mb-8 relative">
              <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-yellow-500 via-pink-500 to-cyan-500 opacity-50 animate-pulse-slow"></div>
              <Trophy className="w-32 h-32 text-yellow-400 mx-auto relative animate-bounce-slow neon-glow-yellow-strong" />
            </div>

            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              <span className="neon-text-rainbow animate-glow">
                TABRIKLAYMIZ! 🎉
              </span>
            </h2>

            <div className="mb-8 p-6 bg-black/30 rounded-2xl border-2 border-purple-500/50 inline-block">
              <p className="text-2xl sm:text-3xl text-white font-black mb-2">
                Sizning natijangiz:
              </p>
              <div className="flex items-center justify-center gap-3">
                <Star className="w-10 h-10 text-yellow-400 animate-spin-slow" />
                <span className="text-5xl font-black text-yellow-400 neon-text-yellow">
                  {score} / {tests.length}
                </span>
                <Star className="w-10 h-10 text-yellow-400 animate-spin-slow" />
              </div>
            </div>

            <button
              onClick={() => {
                setCurrentQuestion(0);
                setScore(0);
                setSelectedOption(null);
              }}
              className="px-10 py-5 bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500 text-white text-2xl sm:text-3xl font-black rounded-2xl border-3 border-cyan-400 neon-glow-rainbow hover:scale-110 transition-all shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <div className="relative flex items-center gap-3">
                <Rocket className="w-8 h-8 animate-bounce-slow" />
                <span>YANA O'YNASH</span>
                <Sparkles className="w-8 h-8 animate-spin-slow" />
              </div>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Poppins:wght@400;700;900&display=swap');
        
        * {
          font-family: 'Poppins', 'Fredoka One', sans-serif;
        }

        h1, h2, .font-black {
          font-family: 'Fredoka One', cursive;
        }

        .border-3 {
          border-width: 3px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes glow {
          0%, 100% {
            text-shadow: 
              0 0 20px rgba(255, 0, 255, 0.8),
              0 0 40px rgba(0, 255, 255, 0.8),
              0 0 60px rgba(255, 0, 255, 0.6);
          }
          50% {
            text-shadow: 
              0 0 30px rgba(0, 255, 255, 0.8),
              0 0 50px rgba(255, 0, 255, 0.8),
              0 0 80px rgba(0, 255, 255, 0.6);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(40px, -40px) scale(1.2);
          }
          66% {
            transform: translate(-40px, 40px) scale(0.8);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) scale(1.05); }
          25% { transform: translateX(-10px) scale(1.05); }
          75% { transform: translateX(10px) scale(1.05); }
        }

        @keyframes success {
          0%, 100% { transform: scale(1.05); }
          50% { transform: scale(1.15); }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-success {
          animation: success 0.5s ease-in-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .neon-card-kids {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95));
          border: 3px solid rgba(236, 72, 153, 0.5);
          border-radius: 2rem;
          padding: 2rem;
          box-shadow: 
            0 0 30px rgba(236, 72, 153, 0.3),
            0 0 60px rgba(0, 255, 255, 0.2),
            inset 0 0 30px rgba(236, 72, 153, 0.05);
          position: relative;
          overflow: hidden;
        }

        .neon-text-cyan {
          color: #00ffff;
          text-shadow: 0 0 15px rgba(0, 255, 255, 1);
        }

        .neon-text-yellow {
          color: #fbbf24;
          text-shadow: 0 0 15px rgba(251, 191, 36, 1);
        }

        .neon-text-rainbow {
          background: linear-gradient(90deg, #ec4899, #8b5cf6, #00ffff, #ec4899);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: rainbow 3s linear infinite;
        }

        @keyframes rainbow {
          to {
            background-position: 200% center;
          }
        }

        .neon-glow-pink {
          box-shadow: 0 0 20px rgba(236, 72, 153, 0.6);
        }

        .neon-glow-cyan {
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
        }

        .neon-glow-purple {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
        }

        .neon-glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
        }

        .neon-glow-green-strong {
          box-shadow: 0 0 40px rgba(34, 197, 94, 0.8);
        }

        .neon-glow-yellow {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
        }

        .neon-glow-yellow-strong {
          box-shadow: 0 0 40px rgba(251, 191, 36, 0.8);
        }

        .neon-glow-red {
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.8);
        }

        .neon-glow-rainbow {
          box-shadow: 
            0 0 20px rgba(236, 72, 153, 0.5),
            0 0 40px rgba(0, 255, 255, 0.5),
            0 0 60px rgba(139, 92, 246, 0.5);
        }

        .neon-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.4;
          animation: float 15s infinite ease-in-out;
          pointer-events: none;
        }

        .neon-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.6), transparent);
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .neon-orb-2 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(0, 255, 255, 0.6), transparent);
          bottom: -100px;
          right: -100px;
          animation-delay: -5s;
        }

        .neon-orb-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.6), transparent);
          top: 50%;
          left: 30%;
          animation-delay: -10s;
        }

        .neon-orb-4 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.6), transparent);
          bottom: 30%;
          left: 60%;
          animation-delay: -7s;
        }

        .stars-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .star {
          position: absolute;
          width: 3px;
          height: 3px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
          animation: twinkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default KidsMode;