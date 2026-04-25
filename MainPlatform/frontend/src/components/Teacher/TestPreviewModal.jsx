import React from 'react';
import { X, CheckCircle, BookOpen, Clock } from 'lucide-react';

const TestPreviewModal = ({ test, onClose }) => {
  if (!test) return null;
  const questions = test.questions || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1e1e3a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-white font-bold text-lg truncate">{test.title}</h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <BookOpen size={12} /> {questions.length} savol
              </span>
              {test.subject && (
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[10px] font-bold uppercase">
                  {test.subject}
                </span>
              )}
              {test.created_at && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {new Date(test.created_at).toLocaleDateString('uz')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all border-none cursor-pointer bg-transparent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/40">Savollar topilmadi</p>
            </div>
          ) : (
            questions.map((q, idx) => {
              const correctIdx = typeof q.correct === 'number' ? q.correct :
                typeof q.correct_answer === 'string' ? q.correct_answer.charCodeAt(0) - 97 :
                typeof q.correct_answer === 'number' ? q.correct_answer : 0;

              return (
                <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <p className="text-white text-sm font-medium leading-relaxed">{q.question}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                    {(q.options || []).map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          oIdx === correctIdx
                            ? 'bg-green-500/15 border border-green-500/30 text-green-300'
                            : 'bg-white/[0.03] border border-white/5 text-white/60'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          oIdx === correctIdx
                            ? 'bg-green-500/30 text-green-300'
                            : 'bg-white/10 text-white/40'
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {oIdx === correctIdx && <CheckCircle size={14} className="text-green-400 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
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

export default TestPreviewModal;
