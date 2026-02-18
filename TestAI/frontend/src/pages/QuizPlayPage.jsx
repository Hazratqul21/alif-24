import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

/**
 * QuizPlayPage — Students participate in a live quiz session
 */
export default function QuizPlayPage() {
    const { quizId } = useParams();
    const [playerName] = useState(() => sessionStorage.getItem('quizPlayerName') || 'Mehmon');
    const [status, setStatus] = useState('waiting'); // waiting, question, answered, results, finished
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);

    // Poll for quiz status (in production, replace with WebSocket)
    useEffect(() => {
        // Placeholder: showing waiting screen until quiz starts
        setStatus('waiting');
    }, [quizId]);

    // Timer countdown
    useEffect(() => {
        if (status !== 'question' || timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [status, timeLeft]);

    const handleAnswer = (index) => {
        if (status !== 'question' || selectedAnswer !== null) return;
        setSelectedAnswer(index);
        setStatus('answered');
        // In production: send answer to server
    };

    const optionColors = [
        'from-red-500 to-rose-600',
        'from-blue-500 to-indigo-600',
        'from-yellow-500 to-amber-600',
        'from-green-500 to-emerald-600',
    ];

    const optionIcons = ['▲', '◆', '●', '■'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-950">
            {/* Header */}
            <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎮</span>
                        <div>
                            <p className="text-white font-bold text-sm">Quiz #{quizId}</p>
                            <p className="text-indigo-300 text-xs">{playerName}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-indigo-400 text-xs">Ball</p>
                        <p className="text-white font-bold text-lg">{score}</p>
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Waiting */}
                {status === 'waiting' && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">Kutilmoqda...</h2>
                        <p className="text-indigo-300 mb-6">O'qituvchi quizni boshlaguncha kuting</p>
                        <div className="inline-block bg-white/10 border border-white/20 rounded-2xl px-8 py-4">
                            <p className="text-indigo-400 text-sm">Siz sifatida kirgansiz</p>
                            <p className="text-white text-xl font-bold">{playerName}</p>
                        </div>
                        <div className="mt-8">
                            <Link to="/quiz/join" className="text-indigo-400 hover:text-white text-sm transition-colors">
                                ← Boshqa quiz'ga o'tish
                            </Link>
                        </div>
                    </div>
                )}

                {/* Question */}
                {status === 'question' && currentQuestion && (
                    <div>
                        {/* Progress */}
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-indigo-400 text-sm">
                                Savol {questionIndex + 1}/{totalQuestions}
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center text-white font-bold">
                                    {timeLeft}
                                </div>
                            </div>
                        </div>

                        {/* Question text */}
                        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6">
                            <h2 className="text-xl md:text-2xl font-bold text-white text-center">
                                {currentQuestion.text}
                            </h2>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-2 gap-3">
                            {(currentQuestion.options || []).map((option, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(i)}
                                    disabled={selectedAnswer !== null}
                                    className={`p-6 rounded-2xl font-bold text-white text-lg bg-gradient-to-br ${optionColors[i % 4]} hover:opacity-90 transition-all disabled:opacity-60 shadow-lg ${selectedAnswer === i ? 'ring-4 ring-white scale-95' : 'hover:scale-[1.02]'
                                        }`}
                                >
                                    <span className="mr-2 opacity-50">{optionIcons[i % 4]}</span>
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Answered — waiting for results */}
                {status === 'answered' && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">✅</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Javob yuborildi!</h2>
                        <p className="text-indigo-300">Natijalar kutilmoqda...</p>
                    </div>
                )}

                {/* Finished */}
                {status === 'finished' && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🏆</div>
                        <h2 className="text-3xl font-bold text-white mb-2">Quiz tugadi!</h2>
                        <p className="text-4xl font-bold text-purple-400 mb-6">{score} ball</p>
                        <Link
                            to="/quiz/join"
                            className="inline-block px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors"
                        >
                            Yangi quiz'ga kirish
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
