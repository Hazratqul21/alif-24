import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trophy, BookOpen, Brain, Star, CheckCircle, ChevronRight } from 'lucide-react';
import MathContent from './Common/MathContent';
import { ReadingOlympiadResultSummary } from '../pages/OlimpiadErtaklarPage';

/**
 * Common Wrapper for both modals
 */
function ModalWrapper({ onClose, title, children, dark = true }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3" onClick={onClose}>
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={`relative ${dark ? 'bg-[#0f172a]' : 'bg-[#1a1a2e]'} border border-white/10 rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col overflow-hidden`}
                style={{ maxHeight: '94vh' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-4 right-4 z-50">
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 custom-scrollbar">
                    {children}
                </div>
            </motion.div>
        </div>
    );
}

/**
 * StorySummaryModal
 * Wraps the shared component from the main page
 */
export function StorySummaryModal({ data, ertak, onClose, onShowDetails }) {
    if (!data) return null;

    const stats = data.reading_stats || {
        wpm: data.wpm || 0,
        readPercent: data.read_percent || 0,
        elapsed: data.reading_duration_seconds || 0
    };
    
    const quizScore = data.quiz_score || 0;
    const answers = data.answers || data.quiz_answers || [];
    const totalCorrect = answers.filter(a => a.is_correct || a.score >= 50).length;

    return (
        <ReadingOlympiadResultSummary 
            ertak={ertak}
            readingStats={stats}
            totalScore={quizScore}
            scores={answers}
            totalCorrect={totalCorrect}
            questions={ertak?.questions || []}
            onClose={(res) => {
                if (res && res.quiz_score !== undefined) {
                    onShowDetails();
                } else {
                    onClose();
                }
            }}
            resultSubmitted={true} // Since we are viewing old results
        />
    );
}


/**
 * TestDetailedResultModal
 */
export function TestDetailedResultModal({ data, questions, onClose, title = "Test natijalari" }) {
    if (!data) return null;

    const answers = data.answers || [];
    const correctCount = data.correct_answers || 0;
    const totalCount = data.total_questions || questions?.length || 0;
    const score = data.quiz_score || data.score || 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-white font-black text-2xl tracking-tight">{title}</h2>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Olimpiada testi</p>
                </div>
                <div className="p-3 bg-amber-400/20 rounded-2xl border border-amber-400/20">
                    <Trophy className="w-6 h-6 text-amber-400" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-emerald-400 font-black text-2xl leading-none mb-1">{correctCount}</p>
                    <p className="text-white/30 text-[9px] uppercase font-bold tracking-tighter">To'g'ri</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-rose-400 font-black text-2xl leading-none mb-1">{totalCount - correctCount}</p>
                    <p className="text-white/30 text-[9px] uppercase font-bold tracking-tighter">Noto'g'ri</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-amber-400 font-black text-2xl leading-none mb-1">{score}</p>
                    <p className="text-white/30 text-[9px] uppercase font-bold tracking-tighter">Ball</p>
                </div>
            </div>

            <div className="space-y-4 pt-2">
                {answers.map((ans, idx) => {
                    const question = questions?.find(q => String(q.id) === String(ans.question_id)) || questions?.[idx];
                    const isCorrect = ans.is_correct ?? false;
                    
                    return (
                        <div key={idx} className={`p-5 rounded-3xl border transition-all ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                            <MathContent content={question?.question_text || question?.question || `Savol #${idx+1}`} className="text-white font-bold text-sm mb-4 leading-relaxed" />
                            {question?.options && (
                                <div className="space-y-2">
                                    {question.options.map((opt, oi) => {
                                        const isSelected = Number(ans.submitted_answer) === oi || Number(ans.selected_answer) === oi;
                                        const isCorrectOpt = Number(question.correct_answer) === oi || Number(question.correct) === oi;
                                        let cls = "bg-white/5 border-white/5 text-white/40";
                                        if (isSelected) cls = isCorrect ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-rose-500/20 border-rose-500/40 text-rose-300";
                                        else if (isCorrectOpt) cls = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                                        return (
                                            <div key={oi} className={`px-4 py-2.5 rounded-xl border text-[11px] font-medium ${cls}`}>
                                                <MathContent content={opt} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button onClick={onClose} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest mt-4">
                Tushunarli
            </button>
        </div>
    );
}

/**
 * Default Export - Router
 */
export default function DetailedResultModal({ viewingResult, onClose, olympiadQuestions }) {
    const [viewMode, setViewMode] = useState('summary');

    if (!viewingResult) return null;
    const { type, data, ertak } = viewingResult;

    const isStory = type === 'story' || type === 'story_test';

    return (
        <ModalWrapper onClose={onClose} dark={isStory && viewMode === 'summary'}>
            {isStory ? (
                viewMode === 'summary' ? (
                    <StorySummaryModal 
                        data={data} 
                        ertak={ertak} 
                        onClose={onClose} 
                        onShowDetails={() => setViewMode('details')} 
                    />
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-white font-black text-2xl tracking-tight">Batafsil natija</h2>
                                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{ertak?.title}</p>
                            </div>
                            <button onClick={() => setViewMode('summary')} className="text-indigo-400 text-xs font-black uppercase tracking-widest underline underline-offset-4">Orqaga</button>
                        </div>
                        <div className="space-y-4">
                            {(data.answers || []).map((ans, idx) => {
                                const isCorrect = (ans.score !== undefined ? ans.score >= 50 : ans.is_correct);
                                return (
                                    <div key={idx} className={`p-5 rounded-3xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                        <p className="text-white/40 text-[10px] font-black uppercase mb-3 tracking-widest">{idx + 1}-savol</p>
                                        <p className="text-xs text-white/90 font-medium mb-3 leading-relaxed">
                                            {ans.answer_text || ans.submitted_answer || "(Javob aniqlanmadi)"}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <div className={`h-full transition-all duration-1000 ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${ans.score || 0}%` }} />
                                            </div>
                                            <span className="text-[10px] font-black text-white/40">{ans.score || 0} ball</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button onClick={onClose} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest mt-4">
                            Yopish
                        </button>
                    </div>
                )
            ) : (
                <TestDetailedResultModal 
                    data={data} 
                    questions={type === 'global' ? olympiadQuestions : (ertak?.questions || [])} 
                    onClose={onClose} 
                    title={type === 'global' ? "Olimpiada testi" : "Test natijalari"}
                />
            )}
        </ModalWrapper>
    );
}
