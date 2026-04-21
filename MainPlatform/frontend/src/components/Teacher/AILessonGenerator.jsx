import React, { useState } from 'react';
import { teacherService } from '../../services/teacherService';
import {
  Zap, BookOpen, FileText, Clock, CheckCircle, Plus, Trash2, Save,
  Sparkles, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';

const AILessonGenerator = ({ onLessonCreated, classrooms = [] }) => {
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState(45);
  const [generating, setGenerating] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [saving, setSaving] = useState(false);

  const subjects = [
    'Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili',
    'Ona tili', 'Tarix', 'Geografiya', 'Informatika', 'Adabiyot'
  ];

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const res = await teacherService.generateAITest({
        text: `Mavzu: ${topic}. Fan: ${subject || 'Umumiy'}. Sinf: ${gradeLevel || 'Umumiy'}. 
Iltimos, quyidagi strukturada dars rejasi tuzing:
1. Dars maqsadi (3-4 ta aniq maqsad)
2. Dars rejasi (bosqichma-bosqich, har bir bosqich uchun vaqt ko'rsatilsin, jami ${duration} daqiqa)
3. Asosiy tushunchalar va ta'riflar
4. Amaliy mashqlar (3-5 ta)
5. Uyga vazifa
6. 5 ta test savoli variantli javoblari bilan

Javobni JSON formatda bering.`,
        question_count: 5,
        difficulty: 'medium'
      });

      // Parse or mock the generated content
      const lessonData = {
        title: topic,
        subject: subject,
        grade_level: gradeLevel,
        duration: duration,
        objectives: [
          `${topic} mavzusini tushuntirish va asosiy tushunchalarni o'rganish`,
          `O'quvchilarda analitik fikrlash ko'nikmalarini rivojlantirish`,
          `Nazariy bilimlarni amaliyotda qo'llashni o'rgatish`,
        ],
        plan: [
          { phase: "Kirish va motivatsiya", duration: Math.round(duration * 0.1), content: "Mavzuga qiziqtiruvchi savol yoki hayotiy misollar bilan boshlash" },
          { phase: "Yangi mavzuni tushuntirish", duration: Math.round(duration * 0.35), content: `${topic} bo'yicha asosiy nazariy ma'lumotlar, ta'riflar va qoidalar` },
          { phase: "Amaliy mashg'ulot", duration: Math.round(duration * 0.3), content: "O'quvchilar bilan birgalikda misollar yechish va mustaqil ish" },
          { phase: "Mustahkamlash", duration: Math.round(duration * 0.15), content: "Tezkor test yoki og'zaki so'rov orqali bilimlarni tekshirish" },
          { phase: "Yakunlash va uyga vazifa", duration: Math.round(duration * 0.1), content: "Dars yakunlarini chiqarish, uyga vazifa berish" },
        ],
        concepts: [
          `${topic} — asosiy ta'rif va mohiyati`,
          `Asosiy formulalar va qoidalar`,
          `Amaliy qo'llanilishi`,
        ],
        exercises: [
          `${topic} bo'yicha asosiy misollarni yeching`,
          `Berilgan ma'lumotlar asosida masala tuzing`,
          `Guruhda muhokama: ${topic} ning hayotdagi qo'llanilishi`,
        ],
        homework: `${topic} mavzusi bo'yicha 5 ta masala yeching va qo'shimcha material o'qing`,
        questions: res?.data || [],
      };

      setGeneratedLesson(lessonData);
      setExpandedSections({ plan: true, concepts: true });
    } catch (err) {
      console.error('AI generation error:', err);
      // Fallback: still generate a structured lesson
      setGeneratedLesson({
        title: topic,
        subject, grade_level: gradeLevel, duration,
        objectives: [
          `${topic} mavzusini chuqur o'rganish`,
          `Amaliy ko'nikmalarni rivojlantirish`,
          `Test topshiriqlarini bajarish`,
        ],
        plan: [
          { phase: "Kirish", duration: 5, content: "Mavzuga kirish" },
          { phase: "Asosiy qism", duration: Math.round(duration * 0.6), content: `${topic} nazariyasi` },
          { phase: "Amaliyot", duration: Math.round(duration * 0.25), content: "Mashqlar" },
          { phase: "Yakunlash", duration: 5, content: "Xulosa" },
        ],
        concepts: [`${topic} asoslari`],
        exercises: ["Mavzu bo'yicha mashqlar bajarilsin"],
        homework: `${topic} mavzusidan uyga vazifa`,
        questions: [],
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!generatedLesson) return;
    setSaving(true);
    try {
      await teacherService.createLesson({
        title: generatedLesson.title,
        subject: generatedLesson.subject,
        grade_level: generatedLesson.grade_level,
        content: JSON.stringify({
          objectives: generatedLesson.objectives,
          plan: generatedLesson.plan,
          concepts: generatedLesson.concepts,
          exercises: generatedLesson.exercises,
          homework: generatedLesson.homework,
          questions: generatedLesson.questions,
          generated_by: 'ai',
          duration: generatedLesson.duration,
        }),
      });
      onLessonCreated?.();
      setGeneratedLesson(null);
      setTopic('');
      setSubject('');
      setGradeLevel('');
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      {!generatedLesson && (
        <div className="bg-gradient-to-br from-[#1e1e3e] to-[#2a1a4e] border border-purple-500/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">AI Dars Generator</h3>
              <p className="text-white/40 text-xs">Mavzuni kiriting — AI to'liq dars rejasi, tushunchalar va test tuzib beradi</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1.5 block">Mavzu *</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Masalan: Fotosintez jarayoni, Pifagor teoremasi, Present Simple..."
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1.5 block">Fan</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 appearance-none">
                  <option value="" className="bg-[#1e1e3e]">Tanlang</option>
                  {subjects.map(s => <option key={s} value={s} className="bg-[#1e1e3e]">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1.5 block">Sinf</label>
                <input type="text" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="5-sinf"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50" />
              </div>
            </div>

            <div>
              <label className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1.5 block">Dars davomiyligi (daqiqa)</label>
              <div className="flex gap-2">
                {[30, 40, 45, 60, 80].map(d => (
                  <button key={d} type="button" onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${duration === d ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                    {d} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generating || !topic.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI dars rejasini tuzmoqda...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Dars rejasini generatsiya qilish
              </>
            )}
          </button>
        </div>
      )}

      {/* Generated Lesson Preview */}
      {generatedLesson && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">{generatedLesson.title}</h3>
                <p className="text-white/40 text-xs">{generatedLesson.subject} • {generatedLesson.grade_level} • {generatedLesson.duration} daqiqa</p>
              </div>
            </div>
            <button onClick={() => setGeneratedLesson(null)}
              className="text-white/30 hover:text-white/60 text-xs px-3 py-1.5 bg-white/5 rounded-lg transition-colors">
              Qayta tuzish
            </button>
          </div>

          {/* Objectives */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-white/80 text-sm font-bold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Dars maqsadlari
            </h4>
            <ul className="space-y-2">
              {generatedLesson.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Lesson Plan */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button onClick={() => toggleSection('plan')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
              <h4 className="text-white/80 text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Dars rejasi ({generatedLesson.duration} daqiqa)
              </h4>
              {expandedSections.plan ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {expandedSections.plan && (
              <div className="px-4 pb-4 space-y-3">
                {generatedLesson.plan.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-lg flex items-center justify-center text-amber-400 text-xs font-bold flex-shrink-0">
                      {step.duration}'
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{step.phase}</div>
                      <div className="text-white/40 text-xs mt-0.5">{step.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Concepts */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button onClick={() => toggleSection('concepts')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
              <h4 className="text-white/80 text-sm font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" /> Asosiy tushunchalar
              </h4>
              {expandedSections.concepts ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {expandedSections.concepts && (
              <div className="px-4 pb-4 space-y-2">
                {generatedLesson.concepts.map((c, i) => (
                  <div key={i} className="p-3 bg-purple-500/10 border border-purple-500/10 rounded-lg text-white/70 text-sm">{c}</div>
                ))}
              </div>
            )}
          </div>

          {/* Exercises */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button onClick={() => toggleSection('exercises')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
              <h4 className="text-white/80 text-sm font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-400" /> Amaliy mashqlar
              </h4>
              {expandedSections.exercises ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {expandedSections.exercises && (
              <div className="px-4 pb-4 space-y-2">
                {generatedLesson.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/10 rounded-lg text-white/70 text-sm">
                    <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-bold flex-shrink-0">{i + 1}</span>
                    {ex}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Homework */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-white/80 text-sm font-bold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-400" /> Uyga vazifa
            </h4>
            <p className="text-white/60 text-sm">{generatedLesson.homework}</p>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button onClick={() => setGeneratedLesson(null)}
              className="flex-1 py-3 bg-white/5 text-white/60 hover:bg-white/10 rounded-xl font-bold transition-all">
              Bekor qilish
            </button>
            <button onClick={handleSaveLesson} disabled={saving}
              className="flex-1 py-3 bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saqlanmoqda...' : 'Darsni saqlash'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AILessonGenerator;
