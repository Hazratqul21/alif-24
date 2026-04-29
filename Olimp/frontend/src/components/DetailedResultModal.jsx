import { motion } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import MathContent from './Common/MathContent';

/**
 * Common Wrapper for both modals
 */
function ModalWrapper({ onClose, title, subtitle, children }) {
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
                            <h2 className="text-white font-black text-2xl mb-1">{title}</h2>
                            <p className="text-white/40 text-xs uppercase tracking-widest font-bold">
                                {subtitle}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {children[0]}
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                    {children[1]}
                </div>

                {/* Footer Section */}
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

/**
 * ReadingDetailedResultModal
 * Specifically for story reading and voice quizzes
 */
export function ReadingDetailedResultModal({ data, ertak, onClose }) {
    if (!data) return null;

    const answers = data.answers || [];
    const correctCount = data.correct_answers || 0;
    const totalCount = data.total_questions || ertak?.questions?.length || 0;
    const score = data.quiz_score || data.score || data.total_points || 0;
    const stats = data.reading_stats;

    return (
        <ModalWrapper 
            onClose={onClose} 
            title="Natijalar" 
            subtitle={ertak?.title || 'Ertak mutolaasi'}
        >
            {/* Header Children */}
            <div className="space-y-4">
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

                {stats && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-500/10 rounded-2xl p-3 border border-blue-500/20 text-center">
                            <p className="text-blue-400 font-black text-xl leading-none mb-1">{stats.wpm || 0}</p>
                            <p className="text-white/30 text-[9px] uppercase font-bold">So'z/daq</p>
                        </div>
                        <div className="bg-indigo-500/10 rounded-2xl p-3 border border-indigo-500/20 text-center">
                            <p className="text-indigo-400 font-black text-xl leading-none mb-1">{Math.round(stats.readPercent || 0)}%</p>
                            <p className="text-white/30 text-[9px] uppercase font-bold">O'qilgan</p>
                        </div>
                        <div className="bg-purple-500/10 rounded-2xl p-3 border border-purple-500/20 text-center">
                            <p className="text-purple-400 font-black text-xl leading-none mb-1">
                                {stats.elapsed ? `${Math.floor(stats.elapsed / 60)}:${String(stats.elapsed % 60).padStart(2, '0')}` : '00:00'}
                            </p>
                            <p className="text-white/30 text-[9px] uppercase font-bold">Vaqt</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Children */}
            <>
                {answers.length === 0 ? (
                    <div className="text-center py-10 opacity-40">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                        <p>Batafsil ma'lumot mavjud emas</p>
                    </div>
                ) : (
                    answers.map((ans, idx) => {
                        const question = ertak?.questions?.find(q => String(q.id) === String(ans.question_id)) || ertak?.questions?.[idx];
                        const isCorrect = ans.is_correct ?? (ans.score !== undefined ? ans.score >= 50 : false);
                        
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
                                        <MathContent content={question?.question || `Savol #${idx+1}`} className="text-white font-bold text-base mb-3 leading-snug" />
                                        
                                        <div className="space-y-2 pt-1">
                                            {(ans.submitted_answer !== undefined || ans.answer_text !== undefined) && (() => {
                                                const displayAns = ans.answer_text || ans.submitted_answer || "(Javob aniqlanmadi)";
                                                return (
                                                    <p className="text-sm text-white/60">
                                                        Sizning javobingiz: <span className="text-white font-medium italic">"{displayAns}"</span>
                                                    </p>
                                                );
                                            })()}
                                            {ans.score !== undefined && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${ans.score >= 80 ? 'bg-emerald-500' : ans.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                                            style={{ width: `${ans.score}%` }} 
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-black ${ans.score >= 80 ? 'text-emerald-400' : ans.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                        {ans.score} ball
                                                    </span>
                                                </div>
                                            )}
                                            {question?.answer && (
                                                <p className="text-sm text-emerald-400/80">
                                                    To'g'ri javob: <span className="font-medium">{question.answer}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </>
        </ModalWrapper>
    );
}

/**
 * TestDetailedResultModal
 * Specifically for multiple choice tests
 */
export function TestDetailedResultModal({ data, questions, onClose, title = "Test natijalari" }) {
    if (!data) return null;

    const answers = data.answers || [];
    const correctCount = data.correct_answers || 0;
    const totalCount = data.total_questions || questions?.length || 0;
    const score = data.quiz_score || data.score || 0;

    return (
        <ModalWrapper 
            onClose={onClose} 
            title={title} 
            subtitle="Olimpiada testi"
        >
            {/* Header Children */}
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

            {/* Content Children */}
            <>
                {answers.length === 0 ? (
                    <div className="text-center py-10 opacity-40">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                        <p>Batafsil ma'lumot mavjud emas</p>
                    </div>
                ) : (
                    answers.map((ans, idx) => {
                        const question = questions?.find(q => String(q.id) === String(ans.question_id)) || questions?.[idx];
                        const isCorrect = ans.is_correct ?? false;
                        
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
                                        
                                        {question?.options && (
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
                                                            <MathContent content={opt} className="flex-1 text-sm" />
                                                            {isSelected && (isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />)}
                                                            {!isSelected && isCorrectOpt && <CheckCircle2 className="w-4 h-4 opacity-50" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </>
        </ModalWrapper>
    );
}

/**
 * Default Export - Router
 * For backward compatibility or easy unified usage
 */
export default function DetailedResultModal({ viewingResult, onClose, olympiadQuestions }) {
    if (!viewingResult) return null;
    const { type, data, ertak } = viewingResult;

    if (type === 'story' || data?.reading_stats) {
        return <ReadingDetailedResultModal data={data} ertak={ertak} onClose={onClose} />;
    }

    return (
        <TestDetailedResultModal 
            data={data} 
            questions={type === 'global' ? olympiadQuestions : (ertak?.questions || [])} 
            onClose={onClose} 
            title={type === 'global' ? "Olimpiada testi" : "Test natijalari"}
        />
    );
}
