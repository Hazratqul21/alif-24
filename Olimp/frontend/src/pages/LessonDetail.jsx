import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, GraduationCap, BookOpen } from 'lucide-react';
import apiService from '../services/apiService';

export default function LessonDetail() {
    const { id, olympiadId } = useParams();
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => { loadLesson(); }, [id]);

    const loadLesson = async () => {
        try {
            setLoading(true);
            const data = await apiService.get(`/olympiads/${olympiadId}/content/lessons/${id}`);
            setLesson(data.data || data);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">❌ {error}</p>
                    <Link to={`/olympiad/${olympiadId}/content/lessons`} className="text-[#4b30fb] hover:text-white">← Darsliklar</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
            <header className="border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link to={`/olympiad/${olympiadId}/content/lessons`} className="inline-flex items-center gap-2 text-[#4b30fb] hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Barcha darsliklar
                    </Link>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8">
                <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-8 border-b border-white/10">
                        <h1 className="text-3xl font-bold text-white mb-4">{lesson?.title}</h1>
                        {lesson?.description && <p className="text-[#4b30fb] mb-6">{lesson.description}</p>}
                        <div className="flex flex-wrap gap-4 text-sm">
                            <span className="flex items-center gap-2 text-white/60"><GraduationCap className="w-4 h-4" />{lesson?.subject || 'Umumiy'}</span>
                            <span className="flex items-center gap-2 text-white/60"><Clock className="w-4 h-4" />{lesson?.duration_minutes || 30} daqiqa</span>
                            <span className="flex items-center gap-2 text-white/60"><BookOpen className="w-4 h-4" />{lesson?.grade_level || 'Barcha darajalar'}</span>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="prose prose-invert max-w-none">
                            {lesson?.content ? (
                                <div className="text-white/90 leading-relaxed whitespace-pre-wrap text-base">{lesson.content}</div>
                            ) : (
                                <p className="text-white/50 text-center py-8">Darslik matni hali yuklanmagan</p>
                            )}
                        </div>
                    </div>
                </motion.article>
            </div>
        </div>
    );
}
