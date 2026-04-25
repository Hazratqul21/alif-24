import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Trophy, Clock, Target, Users, BarChart3,
  ChevronDown, ChevronUp, CheckCircle, XCircle, Medal,
  TrendingUp, Award, Eye
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';

const TestResultsView = ({ test, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [questionStats, setQuestionStats] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);

  useEffect(() => {
    fetchResults();
  }, [test?.id]);

  const fetchResults = async () => {
    if (!test?.id) return;
    setLoading(true);
    try {
      // Try leaderboard endpoint first
      try {
        const res = await teacherService.getTestLeaderboard(test.id);
        const lb = res.leaderboard || res.data?.leaderboard;
        if (lb) {
          setLeaderboard(lb);
          setQuestionStats(res.question_stats || res.data?.question_stats || null);
          setLoading(false);
          return;
        }
      } catch {}

      // Fallback to basic results
      const res = await teacherService.getTestResults(test.id);
      const results = res.results || [];
      // Convert to leaderboard format
      const lb = results
        .filter(r => r.status === 'graded')
        .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.time_spent || 0) - (b.time_spent || 0))
        .map((r, idx) => ({
          rank: idx + 1,
          student_name: r.student_name || `O'quvchi ${r.student_id?.slice(-4) || ''}`,
          student_id: r.student_id,
          score: r.correct_answers || Math.round((r.score || 0) / (test.max_score || 100) * (test.questions?.length || 0)),
          total: r.total_questions || test.questions?.length || 0,
          time_spent_seconds: r.time_spent || 0,
          percentage: r.score || 0,
          submission_content: r.content || null,
        }));
      setLeaderboard(lb);
    } catch (e) {
      console.error('Results fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}d ${s}s` : `${s}s`;
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-amber-500 text-black';
    if (rank === 2) return 'from-gray-300 to-gray-400 text-black';
    if (rank === 3) return 'from-amber-600 to-amber-700 text-white';
    return 'from-white/10 to-white/5 text-white/60';
  };

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'text-green-400';
    if (pct >= 60) return 'text-yellow-400';
    if (pct >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (pct) => {
    if (pct >= 80) return 'bg-green-500/15 border-green-500/20';
    if (pct >= 60) return 'bg-yellow-500/15 border-yellow-500/20';
    if (pct >= 40) return 'bg-orange-500/15 border-orange-500/20';
    return 'bg-red-500/15 border-red-500/20';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Test natijalari
          </h3>
          <p className="text-white/40 text-sm mt-0.5">{test.title}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white/5 rounded-2xl h-16 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Users className="w-14 h-14 text-white/10 mx-auto mb-4" />
          <h4 className="text-white/60 font-semibold mb-2">Natijalar hali yo'q</h4>
          <p className="text-white/30 text-sm">Hech bir o'quvchi testni topshirmagan</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
              <div className="text-blue-400 text-2xl font-bold">{leaderboard.length}</div>
              <div className="text-white/40 text-xs mt-1">Jami topshirgan</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <div className="text-green-400 text-2xl font-bold">
                {leaderboard.length > 0 ? Math.round(leaderboard.reduce((s, r) => s + r.percentage, 0) / leaderboard.length) : 0}%
              </div>
              <div className="text-white/40 text-xs mt-1">O'rtacha ball</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <div className="text-amber-400 text-2xl font-bold">
                {leaderboard.length > 0 ? Math.max(...leaderboard.map(r => r.percentage)) : 0}%
              </div>
              <div className="text-white/40 text-xs mt-1">Eng yuqori</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
              <div className="text-purple-400 text-2xl font-bold">
                {leaderboard.length > 0 && leaderboard.some(r => r.time_spent_seconds > 0) ? formatTime(Math.min(...leaderboard.filter(r => r.time_spent_seconds > 0).map(r => r.time_spent_seconds))) : '-'}
              </div>
              <div className="text-white/40 text-xs mt-1">Eng tez</div>
            </div>
          </div>

          {/* Top 3 podium */}
          {leaderboard.length >= 3 && (
            <div className="flex items-end justify-center gap-3 py-4">
              {[1, 0, 2].map(idx => {
                const entry = leaderboard[idx];
                if (!entry) return null;
                const isFirst = idx === 0;
                return (
                  <div key={idx} className={`flex flex-col items-center ${isFirst ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                    <div className={`w-12 h-12 bg-gradient-to-br ${getRankStyle(entry.rank)} rounded-full flex items-center justify-center text-lg font-black mb-2 ${isFirst ? 'w-16 h-16 text-xl ring-4 ring-yellow-400/20' : ''}`}>
                      {entry.rank}
                    </div>
                    <span className={`text-white font-bold text-xs text-center max-w-[80px] truncate ${isFirst ? 'text-sm' : ''}`}>
                      {entry.student_name}
                    </span>
                    <span className={`text-xs font-bold mt-1 ${getScoreColor(entry.percentage)}`}>
                      {entry.score}/{entry.total}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leaderboard table */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[50px_1fr_80px_80px_80px] gap-2 px-5 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5">
              <span>#</span>
              <span>O'quvchi</span>
              <span className="text-center">Ball</span>
              <span className="text-center">Vaqt</span>
              <span className="text-center">%</span>
            </div>
            {leaderboard.map((entry, idx) => {
              const pct = entry.percentage || Math.round((entry.score / Math.max(entry.total, 1)) * 100);
              return (
                <div key={idx}>
                  <div
                    className={`grid grid-cols-[50px_1fr_80px_80px_80px] gap-2 px-5 py-3.5 items-center hover:bg-white/5 transition-colors cursor-pointer ${
                      idx < leaderboard.length - 1 ? 'border-b border-white/5' : ''
                    }`}
                    onClick={() => setExpandedStudent(expandedStudent === idx ? null : idx)}
                  >
                    <div className={`w-7 h-7 bg-gradient-to-br ${getRankStyle(entry.rank)} rounded-lg flex items-center justify-center text-xs font-black`}>
                      {entry.rank <= 3 ? <Medal size={14} /> : entry.rank}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white text-sm font-medium truncate">{entry.student_name}</span>
                    </div>
                    <div className="text-center">
                      <span className={`text-sm font-bold ${getScoreColor(pct)}`}>
                        {entry.score}/{entry.total}
                      </span>
                    </div>
                    <div className="text-center text-white/40 text-xs">
                      {formatTime(entry.time_spent_seconds)}
                    </div>
                    <div className="text-center">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold border ${getScoreBg(pct)} ${getScoreColor(pct)}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedStudent === idx && entry.submission_content && (() => {
                    try {
                      const parsed = typeof entry.submission_content === 'string'
                        ? JSON.parse(entry.submission_content)
                        : entry.submission_content;
                      const results = parsed?.results || [];
                      if (results.length === 0) return null;
                      return (
                        <div className="px-5 pb-4 bg-white/[0.02]">
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {results.map((r, rIdx) => (
                              <div key={rIdx} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                                r.is_correct ? 'bg-green-500/10 border border-green-500/10' : 'bg-red-500/10 border border-red-500/10'
                              }`}>
                                {r.is_correct ? <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" /> : <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-white/80 font-medium">{rIdx + 1}. {r.question}</p>
                                  <div className="flex gap-4 mt-1 text-[11px]">
                                    <span className="text-white/40">Javob: <span className={r.is_correct ? 'text-green-400' : 'text-red-400'}>{r.student_answer?.toUpperCase()}</span></span>
                                    {!r.is_correct && <span className="text-green-400/60">To'g'ri: {r.correct_answer?.toUpperCase()}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
              );
            })}
          </div>

          {/* Question stats */}
          {questionStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {questionStats.most_correct?.length > 0 && (
                <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                  <h5 className="text-green-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle size={14} /> Eng oson savollar
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {questionStats.most_correct.map(q => (
                      <span key={q} className="px-2.5 py-1 bg-green-500/15 text-green-400 rounded-lg text-xs font-bold">
                        #{q + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {questionStats.most_incorrect?.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                  <h5 className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <XCircle size={14} /> Eng qiyin savollar
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {questionStats.most_incorrect.map(q => (
                      <span key={q} className="px-2.5 py-1 bg-red-500/15 text-red-400 rounded-lg text-xs font-bold">
                        #{q + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TestResultsView;
