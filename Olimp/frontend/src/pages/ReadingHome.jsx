import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import readingService from '../services/readingService';

const DAYS = {
    monday: { label: 'Dushanba', short: 'Du', num: 1 },
    tuesday: { label: 'Seshanba', short: 'Se', num: 2 },
    wednesday: { label: 'Chorshanba', short: 'Ch', num: 3 },
    thursday: { label: 'Payshanba', short: 'Pa', num: 4 },
    friday: { label: 'Juma', short: 'Ju', num: 5 },
};

export default function ReadingHome() {
    const navigate = useNavigate();
    const [competitions, setCompetitions] = useState([]);
    const [selectedComp, setSelectedComp] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [results, setResults] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [activeTab, setActiveTab] = useState('tasks'); // tasks | results | leaderboard
    const [leaderboardGroup, setLeaderboardGroup] = useState('champion'); // fast_reader | accurate_reader | test_master | champion

    const hasToken = !!localStorage.getItem('accessToken');

    useEffect(() => {
        loadCompetitions();
    }, []);

    const loadCompetitions = async () => {
        try {
            setLoading(true);
            const data = await readingService.getCompetitions();
            setCompetitions(data.competitions || []);
            if (data.competitions?.length > 0) {
                selectCompetition(data.competitions[0]);
            }
        } catch (err) {
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const selectCompetition = async (comp) => {
        if (!hasToken) {
            setSelectedComp(comp);
            setTasks([]);
            return;
        }
        try {
            setLoading(true);
            const data = await readingService.getCompetition(comp.id);
            setSelectedComp(data.competition);
            setTasks(data.tasks || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadResults = async () => {
        if (!selectedComp || !hasToken) return;
        try {
            const data = await readingService.getMyResults(selectedComp.id);
            setResults(data);
        } catch { }
    };

    const loadLeaderboard = async (group) => {
        if (!selectedComp) return;
        try {
            const data = await readingService.getLeaderboard(selectedComp.id, { group: group || leaderboardGroup });
            setLeaderboard(data.leaderboard || []);
        } catch { }
    };

    useEffect(() => {
        if (activeTab === 'results') loadResults();
        if (activeTab === 'leaderboard') loadLeaderboard();
    }, [activeTab, selectedComp]);

    if (loading && !selectedComp) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-xl">📖</div>
                        <div>
                            <h1 className="text-white font-bold text-lg">O'qish Musobaqasi</h1>
                            <p className="text-gray-500 text-xs">Alif24 · olimp.alif24.uz</p>
                        </div>
                    </div>
                    {!hasToken && (
                        <a href="https://alif24.uz" className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors">
                            Kirish
                        </a>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6">
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        {error}
                        <button onClick={() => setError('')} className="ml-2 opacity-50 hover:opacity-100">✕</button>
                    </div>
                )}

                {/* Competition selector */}
                {competitions.length > 1 && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {competitions.map(c => (
                            <button key={c.id} onClick={() => selectCompetition(c)}
                                className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${selectedComp?.id === c.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                                {c.title}
                            </button>
                        ))}
                    </div>
                )}

                {!selectedComp && competitions.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">📚</div>
                        <h2 className="text-white text-xl font-bold mb-2">Hozircha musobaqa yo'q</h2>
                        <p className="text-gray-500">Yangi musobaqa boshlanishini kuting</p>
                    </div>
                )}

                {selectedComp && (
                    <>
                        {/* Competition info */}
                        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-6">
                            <h2 className="text-white font-bold text-xl mb-1">{selectedComp.title}</h2>
                            {selectedComp.description && <p className="text-gray-400 text-sm mb-3">{selectedComp.description}</p>}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                <span>📅 Hafta {selectedComp.week_number}/{selectedComp.year}</span>
                                {selectedComp.start_date && <span>🗓 {selectedComp.start_date} — {selectedComp.end_date}</span>}
                            </div>
                        </div>

                        {!hasToken && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-center">
                                <p className="text-amber-400 text-sm">Musobaqada ishtirok etish uchun <a href="https://alif24.uz" className="underline font-medium">tizimga kiring</a></p>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex gap-1 mb-6 bg-gray-900/50 p-1 rounded-xl w-fit">
                            {[
                                { key: 'tasks', label: 'Vazifalar', icon: '📖' },
                                { key: 'results', label: 'Natijalarim', icon: '📊' },
                                { key: 'leaderboard', label: 'Reyting', icon: '🏆' },
                            ].map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tasks */}
                        {activeTab === 'tasks' && (
                            <div className="grid gap-3">
                                {tasks.length > 0 ? tasks.map((task, i) => {
                                    const day = DAYS[task.day_of_week] || {};
                                    const completed = task.status === 'completed';
                                    return (
                                        <div key={task.id}
                                            className={`border rounded-2xl p-5 transition-all ${completed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-gray-900/50 border-gray-800 hover:border-emerald-500/30'}`}>
                                            <div className="flex items-center gap-4">
                                                {task.image_url ? (
                                                    <img src={task.image_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                                                ) : (
                                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-xl flex items-center justify-center text-2xl">
                                                        {completed ? '✅' : '📖'}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{day.label}</span>
                                                        {completed && <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Bajarildi</span>}
                                                    </div>
                                                    <h3 className="text-white font-semibold truncate">{task.title}</h3>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                        <span>{task.total_words} so'z</span>
                                                        <span>{task.questions_count} savol</span>
                                                        {task.my_score != null && <span className="text-emerald-400 font-medium">{task.my_score.toFixed(0)} ball</span>}
                                                    </div>
                                                </div>
                                                {hasToken && !completed && (
                                                    <button onClick={() => navigate(`/reading/${selectedComp.id}/${task.id}`)}
                                                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap">
                                                        O'qishni boshlash
                                                    </button>
                                                )}
                                                {completed && (
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold text-emerald-400">{task.my_score?.toFixed(0)}</div>
                                                        <div className="text-xs text-gray-500">ball</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-12 text-gray-500">
                                        <p>Vazifalar yo'q yoki tizimga kiring</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Results */}
                        {activeTab === 'results' && (
                            <div>
                                {results?.daily?.length > 0 ? (
                                    <div className="space-y-3">
                                        {results.daily.map((d, i) => (
                                            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-white font-medium">{DAYS[d.day]?.label} — {d.title}</span>
                                                    <span className={`text-lg font-bold ${d.status === 'completed' ? 'text-emerald-400' : 'text-gray-600'}`}>
                                                        {d.total_score?.toFixed(0) || '—'}
                                                    </span>
                                                </div>
                                                {d.status === 'completed' && (
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[
                                                            { label: 'Matn', val: `${d.completion_percentage?.toFixed(0)}%`, score: d.score_completion },
                                                            { label: "So'zlar", val: `${d.words_read}/${d.total_words}`, score: d.score_words },
                                                            { label: 'Vaqt', val: `${d.reading_time_seconds?.toFixed(0)}s`, score: d.score_time },
                                                            { label: 'Savollar', val: `${d.questions_correct}/${d.questions_total}`, score: d.score_questions },
                                                        ].map((s, j) => (
                                                            <div key={j} className="bg-gray-800/50 rounded-lg p-2 text-center">
                                                                <div className="text-xs text-gray-500">{s.label}</div>
                                                                <div className="text-white text-sm font-medium">{s.val}</div>
                                                                <div className="text-emerald-400 text-xs">{s.score?.toFixed(0)} ball</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {results.overall && (
                                            <div className="bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 rounded-xl p-5 mt-4">
                                                <h3 className="text-white font-bold mb-2">Umumiy Natija</h3>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-emerald-400">{results.overall.total_reading_score?.toFixed(0)}</div>
                                                        <div className="text-xs text-gray-500">O'qish</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-blue-400">{results.overall.test_score?.toFixed(0)}</div>
                                                        <div className="text-xs text-gray-500">Test ({results.overall.test_correct}/{results.overall.test_total})</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-amber-400">{results.overall.total_score?.toFixed(0)}</div>
                                                        <div className="text-xs text-gray-500">Jami</div>
                                                    </div>
                                                </div>
                                                {results.overall.rank_overall && (
                                                    <div className="text-center mt-3 text-gray-400 text-sm">O'rin: <span className="text-white font-bold">#{results.overall.rank_overall}</span></div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">Natijalar hali yo'q</div>
                                )}
                            </div>
                        )}

                        {/* Leaderboard */}
                        {activeTab === 'leaderboard' && (
                            <div>
                                {/* 4 guruh tanlash */}
                                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                    {[
                                        { key: 'champion', label: 'Umumiy reyting', icon: '🏆', desc: 'Eng ko\'p bal' },
                                        { key: 'fast_reader', label: 'Tez o\'quvchilar', icon: '⚡', desc: '90%+ to\'liq, tez' },
                                        { key: 'accurate_reader', label: 'Aniq o\'quvchilar', icon: '🎯', desc: '90%+ to\'liq, to\'g\'ri javob' },
                                        { key: 'test_master', label: 'Test ustasi', icon: '📝', desc: 'Test natijasi' },
                                    ].map(g => (
                                        <button key={g.key}
                                            onClick={() => { setLeaderboardGroup(g.key); loadLeaderboard(g.key); }}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all flex-shrink-0 ${leaderboardGroup === g.key
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                                : 'bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-800'
                                            }`}>
                                            <span>{g.icon}</span>
                                            <span className="font-medium">{g.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {leaderboard.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-gray-500 border-b border-gray-800">
                                                    <th className="text-left py-3 px-3">#</th>
                                                    <th className="text-left py-3 px-3">Ism</th>
                                                    {leaderboardGroup === 'fast_reader' && <>
                                                        <th className="text-center py-3 px-3">To'liqlik</th>
                                                        <th className="text-center py-3 px-3">Vaqt (sek)</th>
                                                        <th className="text-center py-3 px-3">So'zlar</th>
                                                    </>}
                                                    {leaderboardGroup === 'accurate_reader' && <>
                                                        <th className="text-center py-3 px-3">To'liqlik</th>
                                                        <th className="text-center py-3 px-3">To'g'ri javoblar</th>
                                                    </>}
                                                    {leaderboardGroup === 'test_master' && <>
                                                        <th className="text-center py-3 px-3">Test</th>
                                                        <th className="text-center py-3 px-3">Jami</th>
                                                    </>}
                                                    {leaderboardGroup === 'champion' && <>
                                                        <th className="text-center py-3 px-3">O'qish</th>
                                                        <th className="text-center py-3 px-3">Test</th>
                                                        <th className="text-center py-3 px-3">Jami</th>
                                                    </>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {leaderboard.map((r, i) => (
                                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                                        <td className="py-3 px-3">
                                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-500">{r.rank}</span>}
                                                        </td>
                                                        <td className="py-3 px-3 text-white font-medium">{r.student_name}</td>
                                                        {leaderboardGroup === 'fast_reader' && <>
                                                            <td className="py-3 px-3 text-center text-emerald-400">{r.avg_completion?.toFixed(0)}%</td>
                                                            <td className="py-3 px-3 text-center text-blue-400">{r.avg_reading_time?.toFixed(1)}s</td>
                                                            <td className="py-3 px-3 text-center text-gray-400">{r.total_words_read}</td>
                                                        </>}
                                                        {leaderboardGroup === 'accurate_reader' && <>
                                                            <td className="py-3 px-3 text-center text-emerald-400">{r.avg_completion?.toFixed(0)}%</td>
                                                            <td className="py-3 px-3 text-center text-blue-400">{r.questions_correct}/{r.questions_total}</td>
                                                        </>}
                                                        {leaderboardGroup === 'test_master' && <>
                                                            <td className="py-3 px-3 text-center text-blue-400">{r.test_score?.toFixed(0)}</td>
                                                            <td className="py-3 px-3 text-center text-amber-400 font-bold">{r.total_score?.toFixed(0)}</td>
                                                        </>}
                                                        {leaderboardGroup === 'champion' && <>
                                                            <td className="py-3 px-3 text-center text-emerald-400">{r.total_reading_score?.toFixed(0)}</td>
                                                            <td className="py-3 px-3 text-center text-blue-400">{r.test_score?.toFixed(0)}</td>
                                                            <td className="py-3 px-3 text-center text-amber-400 font-bold">{r.total_score?.toFixed(0)}</td>
                                                        </>}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        <div className="text-4xl mb-2">🏆</div>
                                        Bu guruhda natijalar hali yo'q
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
