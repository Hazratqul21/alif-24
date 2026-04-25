import React from 'react';
import { X, CheckCircle, XCircle, Clock, Award, BookOpen } from 'lucide-react';

const TestResultReview = ({ show, results, score, maxScore, correctCount, total, timeSpent, onClose }) => {
  if (!show) return null;

  const pct = Math.round((correctCount / Math.max(total, 1)) * 100);

  const getGradeEmoji = (pct) => {
    if (pct >= 90) return '🏆';
    if (pct >= 80) return '🎉';
    if (pct >= 60) return '👍';
    if (pct >= 40) return '📚';
    return '💪';
  };

  const getGradeText = (pct) => {
    if (pct >= 90) return "A'lo";
    if (pct >= 80) return 'Yaxshi';
    if (pct >= 60) return "Qoniqarli";
    if (pct >= 40) return "O'rtacha";
    return 'Qayta urinib ko\'ring';
  };

  const getGradeColor = (pct) => {
    if (pct >= 80) return 'from-green-500 to-emerald-500';
    if (pct >= 60) return 'from-yellow-500 to-amber-500';
    if (pct >= 40) return 'from-orange-500 to-amber-600';
    return 'from-red-500 to-rose-500';
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m} daqiqa ${s} soniya` : `${s} soniya`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1e1e3a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Score Header */}
        <div className={`bg-gradient-to-r ${getGradeColor(pct)} p-6 rounded-t-2xl text-center`}>
          <div className="text-4xl mb-2">{getGradeEmoji(pct)}</div>
          <h3 className="text-white text-2xl font-black">{getGradeText(pct)}</h3>
          <div className="flex items-center justify-center gap-4 mt-3 text-white/80 text-sm">
            <span className="flex items-center gap-1.5">
              <Award size={16} />
              <span className="font-bold text-white text-lg">{correctCount}</span>/{total}
            </span>
            <span className="text-white/40">|</span>
            <span className="flex items-center gap-1.5">
              <BookOpen size={16} />
              <span className="font-bold text-white text-lg">{pct}%</span>
            </span>
            {timeSpent > 0 && (
              <>
                <span className="text-white/40">|</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={16} />
                  {formatTime(timeSpent)}
                </span>
              </>
            )}
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Questions review */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <h4 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">
            Batafsil ko'rish
          </h4>
          {(results || []).map((r, idx) => (
            <div
              key={idx}
              className={`rounded-xl p-4 border transition-all ${
                r.is_correct
                  ? 'bg-green-500/5 border-green-500/15'
                  : 'bg-red-500/5 border-red-500/15'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                  r.is_correct ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {r.is_correct
                    ? <CheckCircle size={18} className="text-green-400" />
                    : <XCircle size={18} className="text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-relaxed mb-2">
                    {idx + 1}. {r.question}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                      r.is_correct
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      Sizning javob: <span className="font-bold">{r.student_answer?.toUpperCase()}</span>
                    </span>
                    {!r.is_correct && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400/80">
                        To'g'ri javob: <span className="font-bold">{r.correct_answer?.toUpperCase()}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all border-none cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestResultReview;
