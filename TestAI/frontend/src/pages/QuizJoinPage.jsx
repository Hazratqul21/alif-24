import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * QuizJoinPage — Students enter a PIN to join a live quiz session
 */
export default function QuizJoinPage() {
    const [pin, setPin] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [joining, setJoining] = useState(false);
    const navigate = useNavigate();

    const handleJoin = async (e) => {
        e.preventDefault();
        if (pin.length < 4) {
            setError("PIN kamida 4 ta raqamdan iborat bo'lishi kerak");
            return;
        }
        if (!name.trim()) {
            setError("Ismingizni kiriting");
            return;
        }

        try {
            setJoining(true);
            setError('');
            // Store player name for the quiz session
            sessionStorage.setItem('quizPlayerName', name.trim());
            sessionStorage.setItem('quizPin', pin);
            navigate(`/quiz/${pin}`);
        } catch (err) {
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-800 to-blue-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <form onSubmit={handleJoin} className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-3">🎮</div>
                        <h1 className="text-3xl font-bold text-white mb-1">Live Quiz</h1>
                        <p className="text-indigo-200 text-sm">O'qituvchingiz bergan PIN kodni kiriting</p>
                    </div>

                    {/* PIN Input */}
                    <div className="mb-4">
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="PIN kod"
                            value={pin}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '');
                                if (v.length <= 6) setPin(v);
                            }}
                            className="w-full text-center text-3xl font-bold tracking-[0.5em] p-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                            autoFocus
                        />
                    </div>

                    {/* Name Input */}
                    <div className="mb-6">
                        <input
                            type="text"
                            placeholder="Ismingiz"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={30}
                            className="w-full text-center text-lg p-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                        />
                    </div>

                    {error && (
                        <p className="text-red-300 text-sm text-center mb-4 bg-red-500/10 rounded-lg p-2">
                            ❌ {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={joining || pin.length < 4 || !name.trim()}
                        className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-lg font-bold rounded-2xl hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                    >
                        {joining ? 'Yuklanmoqda...' : 'Kirish →'}
                    </button>
                </form>

                <p className="text-center text-indigo-300/50 text-xs mt-6">
                    alif24 • TestAI Platform
                </p>
            </div>
        </div>
    );
}
