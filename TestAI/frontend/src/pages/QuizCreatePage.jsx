import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Play, Copy } from 'lucide-react';

/**
 * QuizCreatePage — Teachers create live quiz sessions
 */
export default function QuizCreatePage() {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState([
        { text: '', options: ['', '', '', ''], correctIndex: 0, timeLimit: 20 }
    ]);
    const [quizPin, setQuizPin] = useState(null);
    const [creating, setCreating] = useState(false);

    const addQuestion = () => {
        setQuestions([...questions, { text: '', options: ['', '', '', ''], correctIndex: 0, timeLimit: 20 }]);
    };

    const removeQuestion = (index) => {
        if (questions.length <= 1) return;
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const updateOption = (qIndex, oIndex, value) => {
        const updated = [...questions];
        updated[qIndex].options[oIndex] = value;
        setQuestions(updated);
    };

    const handleCreate = async () => {
        if (!title.trim()) return;
        if (questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()))) return;

        try {
            setCreating(true);
            // Generate a random PIN (in production: get from server)
            const pin = String(Math.floor(100000 + Math.random() * 900000));
            setQuizPin(pin);
        } catch (err) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    // Quiz created — show PIN
    if (quizPin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-800 to-blue-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-10 text-center max-w-md w-full">
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Quiz tayyor!</h2>
                    <p className="text-indigo-200 mb-6">O'quvchilaringizga ushbu PIN kodni bering</p>

                    <div className="bg-white/10 border-2 border-white/30 rounded-2xl p-6 mb-6">
                        <p className="text-5xl font-bold tracking-[0.3em] text-white">{quizPin}</p>
                    </div>

                    <button
                        onClick={() => navigator.clipboard?.writeText(quizPin)}
                        className="flex items-center gap-2 mx-auto px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors mb-4"
                    >
                        <Copy className="w-4 h-4" />
                        Nusxa olish
                    </button>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => setQuizPin(null)}
                            className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                        >
                            Tahrirlash
                        </button>
                        <Link
                            to={`/quiz/${quizPin}`}
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Boshlash
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Quiz yaratish</h1>
                        <p className="text-gray-500 text-xs">{questions.length} ta savol</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/olympiad" className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">
                            Bekor qilish
                        </Link>
                        <button
                            onClick={handleCreate}
                            disabled={creating || !title.trim()}
                            className="px-6 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Yaratish
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Title */}
                <input
                    type="text"
                    placeholder="Quiz nomi..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-2xl font-bold p-4 bg-white border border-gray-200 rounded-2xl mb-6 focus:outline-none focus:border-purple-400 transition-colors"
                />

                {/* Questions */}
                {questions.map((q, qi) => (
                    <div key={qi} className="bg-white border border-gray-200 rounded-2xl p-6 mb-4 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-500">Savol {qi + 1}</span>
                            <div className="flex items-center gap-3">
                                <select
                                    value={q.timeLimit}
                                    onChange={(e) => updateQuestion(qi, 'timeLimit', Number(e.target.value))}
                                    className="text-sm border rounded-lg px-2 py-1 text-gray-600"
                                >
                                    {[10, 15, 20, 30, 45, 60].map(t => (
                                        <option key={t} value={t}>{t} soniya</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => removeQuestion(qi)}
                                    disabled={questions.length <= 1}
                                    className="text-red-400 hover:text-red-600 disabled:opacity-30"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Savolni yozing..."
                            value={q.text}
                            onChange={(e) => updateQuestion(qi, 'text', e.target.value)}
                            className="w-full text-lg font-medium p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:border-purple-400"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            {q.options.map((opt, oi) => (
                                <div key={oi} className="relative">
                                    <input
                                        type="text"
                                        placeholder={`Javob ${oi + 1}`}
                                        value={opt}
                                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                                        className={`w-full p-3 pl-10 rounded-xl border-2 focus:outline-none transition-colors ${q.correctIndex === oi
                                                ? 'border-green-400 bg-green-50'
                                                : 'border-gray-200 bg-white'
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => updateQuestion(qi, 'correctIndex', oi)}
                                        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${q.correctIndex === oi
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'border-gray-300'
                                            }`}
                                    >
                                        {q.correctIndex === oi && '✓'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Add Question */}
                <button
                    onClick={addQuestion}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Savol qo'shish
                </button>
            </div>
        </div>
    );
}
