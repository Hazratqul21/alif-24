import { motion } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import MathContent from './Common/MathContent';

/**
 * DetailedResultModal
 * Displays a question-by-question breakdown of test results.
 * Used by both students and potentially admins.
 */
export default function DetailedResultModal({ viewingResult, onClose, olympiadQuestions }) {
    if (!viewingResult) return null;

    const { type, data, ertak } = viewingResult;
    const questions = type === 'global' ? olympiadQuestions : (ertak?.questions || []);
    const answers = data?.answers || [];
    const correctCount = data?.correct_answers || 0;
    const totalCount = data?.total_questions || questions.length;
    const score = data?.quiz_score || data?.score || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3" onClick={onClose}>
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-[#1a1a2e] border border-white/10 rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 px-6 py-6 border-b border-white/5">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-white font-black text-2xl mb-1">Test natijalari</h2>
                            <p className="text-white/40 text-xs uppercase tracking-widest font-bold">
                                {type === 'global' ? 'Olimpiada testi' : ertak?.title || 'Batafsil natija'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                            <p className="text-emerald-400 font-black text-2xl leading-none mb-1">{correctCount}</p>
                            <p className="text-white/30 text-[10px] uppercase font-bold">To'g'ri</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                            <p className="text-rose-400 font-black text-2xl leading-none mb-1">{totalCount - correctCount}</p>
                            <p className="text-white/30 text-[10px] uppercase font-bold">Noto'g'ri</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                            <p className="text-amber-400 font-black text-2xl leading-none mb-1">{score}</p>
                            <p className="text-white/30 text-[10px] uppercase font-bold">Ball</p>
                        </div>
                    </div>
                </div>

                {/* Answers List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                    {answers.length === 0 ? (
                        <div className="text-center py-10 opacity-40">
                            <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                            <p>Batafsil ma'lumot mavjud emas (Eski natija)</p>
                        </div>
                    ) : (
                        answers.map((ans, idx) => {
                            const question = questions?.find(q => String(q.id) === String(ans.question_id)) || questions?.[idx];
                            const isCorrect = ans.is_correct;
                            
                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={idx}
                                    className={`p-5 rounded-2xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 p-1.5 rounded-lg ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <MathContent content={question?.question_text || question?.question || `Savol #${idx+1}`} className="text-white font-bold text-base mb-3 leading-snug" />
                                            
                                            {question?.options ? (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {question.options.map((opt, oi) => {
                                                        const isSelected = Number(ans.submitted_answer) === oi || Number(ans.selected_answer) === oi;
                                                        const isCorrectOpt = Number(question.correct_answer) === oi || Number(question.correct) === oi;
                                                        
                                                        let bgClass = "bg-white/5 border-white/5 text-white/50";
                                                        if (isSelected) {
                                                            bgClass = isCorrect ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-rose-500/20 border-rose-500/40 text-rose-300";
                                                        } else if (isCorrectOpt) {
                                                            bgClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                                                        }

                                                        return (
                                                            <div key={oi} className={`px-4 py-2.5 rounded-xl border text-sm flex items-center justify-between ${bgClass}`}>
                                                                <MathContent content={opt} className="flex-1 text-sm text-gray-300" />
                                                                {isSelected && (isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />)}
                                                                {!isSelected && isCorrectOpt && <CheckCircle2 className="w-4 h-4 opacity-50" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="space-y-2 pt-1">
                                                   {(ans.submitted_answer !== undefined || ans.selected_answer !== undefined) && (
                                                       <p className="text-sm text-white/60">
                                                           Sizning javobingiz: <span className="text-white font-medium">{ans.submitted_answer ?? ans.selected_answer}</span>
                                                       </p>
                                                   )}
                                                   {(question?.correct_answer !== undefined || question?.answer) && (
                                                       <p className="text-sm text-emerald-400/80">
                                                           To'g'ri javob: <span className="font-medium">{question.correct_answer ?? question.answer}</span>
                                                       </p>
                                                   )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20"
                    >
                        Tushunarli
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
