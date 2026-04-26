import React, { useState, useEffect } from 'react';
import {
  X, Send, Clock, Shuffle, Hash, Users, BookOpen,
  ChevronDown, CheckCircle, Timer, ListOrdered, Dices
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';

const TestAssignModal = ({ test, classrooms = [], onClose, onAssigned, onShowNotif }) => {
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [assignTarget, setAssignTarget] = useState('classroom'); // classroom | student

  // Test config
  const totalQuestions = test?.questions?.length || 0;
  const [questionCount, setQuestionCount] = useState(totalQuestions);
  const [questionSelection, setQuestionSelection] = useState('all'); // all | first_n | random
  const [timeType, setTimeType] = useState('total'); // total | per_question | none
  const [totalTime, setTotalTime] = useState(30); // minutes
  const [perQuestionTime, setPerQuestionTime] = useState(90); // seconds
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [dueDate, setDueDate] = useState('');

  // Fetch students when class changes
  useEffect(() => {
    if (selectedClassId) {
      teacherService.getClassroomDetail(selectedClassId).then(res => {
        setClassStudents(res.data?.students || []);
      }).catch(() => setClassStudents([]));
    } else {
      setClassStudents([]);
    }
  }, [selectedClassId]);

  const handleSubmit = async () => {
    if (!selectedClassId && selectedStudentIds.length === 0) {
      onShowNotif?.('error', 'Sinf yoki o\'quvchilarni tanlang');
      return;
    }

    setLoading(true);
    try {
      const testConfig = {
        question_count: questionSelection === 'all' ? totalQuestions : questionCount,
        question_selection: questionSelection,
        time_type: timeType,
        total_time_minutes: timeType === 'total' ? totalTime : null,
        per_question_seconds: timeType === 'per_question' ? perQuestionTime : null,
        shuffle_questions: shuffleQuestions,
      };

      const payload = {
        test_id: test.id,
        class_name: null,
        student_ids: null,
        due_date: dueDate || null,
        test_config: testConfig,
      };

      // Find selected classroom name
      if (assignTarget === 'classroom' && selectedClassId) {
        const cls = classrooms.find(c => c.id === selectedClassId);
        payload.class_name = cls?.name || null;
      }
      if (assignTarget === 'student' && selectedStudentIds.length > 0) {
        payload.student_ids = selectedStudentIds;
      }

      await teacherService.assignTest(payload);
      onAssigned?.();
    } catch (e) {
      onShowNotif?.('error', e.message || 'Ulashishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  if (!test) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1e1e3a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-white font-bold text-lg">Testni ulashish</h3>
            <p className="text-white/40 text-xs mt-1">{test.title} &bull; {totalQuestions} savol</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all border-none cursor-pointer bg-transparent">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Target Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Kimga ulashish</label>
            <select
              value={selectedClassId}
              onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentIds([]); }}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 text-sm appearance-none"
            >
              <option value="" className="bg-[#1a1a2e]">Sinf tanlang</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id} className="bg-[#1a1a2e]">
                  {c.name} ({c.student_count || 0} ta o'quvchi)
                </option>
              ))}
            </select>

            {selectedClassId && classStudents.length > 0 && (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignTarget('classroom')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border-none cursor-pointer ${
                      assignTarget === 'classroom' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <Users size={13} className="inline mr-1" /> Butun sinfga
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignTarget('student')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border-none cursor-pointer ${
                      assignTarget === 'student' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <Hash size={13} className="inline mr-1" /> Individual
                  </button>
                </div>

                {assignTarget === 'student' && (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 bg-white/5 border border-white/5 rounded-xl p-2">
                    {classStudents.map(s => (
                      <label key={s.user_id} className="flex items-center gap-3 p-2 bg-white/[0.03] rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s.user_id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.user_id]);
                            else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.user_id));
                          }}
                          className="w-4 h-4 rounded accent-purple-500"
                        />
                        <span className="text-white text-sm">{s.first_name} {s.last_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Question selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Savollar soni</label>
            <div className="flex gap-2">
              {[
                { v: 'all', l: `Barchasi (${totalQuestions})`, ic: BookOpen },
                { v: 'first_n', l: 'Birinchi N ta', ic: ListOrdered },
                { v: 'random', l: 'Tasodifiy', ic: Dices },
              ].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => {
                    setQuestionSelection(opt.v);
                    if (opt.v === 'all') setQuestionCount(totalQuestions);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all border-none cursor-pointer ${
                    questionSelection === opt.v ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  <opt.ic size={13} /> {opt.l}
                </button>
              ))}
            </div>
            {questionSelection !== 'all' && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={totalQuestions}
                  value={questionCount}
                  onChange={e => setQuestionCount(parseInt(e.target.value))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-white font-bold text-sm w-12 text-center bg-white/10 rounded-lg py-1">
                  {questionCount}
                </span>
              </div>
            )}
          </div>

          {/* Time settings */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Vaqt sozlamalari</label>
            <div className="flex gap-2">
              {[
                { v: 'none', l: 'Cheksiz', ic: Clock },
                { v: 'total', l: 'Umumiy vaqt', ic: Timer },
                { v: 'per_question', l: 'Har savol', ic: Clock },
              ].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setTimeType(opt.v)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all border-none cursor-pointer ${
                    timeType === opt.v ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  <opt.ic size={13} /> {opt.l}
                </button>
              ))}
            </div>
            {timeType === 'total' && (
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                <Timer size={16} className="text-purple-400" />
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={totalTime}
                  onChange={e => setTotalTime(parseInt(e.target.value) || 1)}
                  className="bg-transparent border-none text-white text-lg font-bold w-16 focus:outline-none text-center"
                />
                <span className="text-white/40 text-sm">daqiqa</span>
              </div>
            )}
            {timeType === 'per_question' && (
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                <Clock size={16} className="text-purple-400" />
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={perQuestionTime}
                  onChange={e => setPerQuestionTime(parseInt(e.target.value) || 10)}
                  className="bg-transparent border-none text-white text-lg font-bold w-16 focus:outline-none text-center"
                />
                <span className="text-white/40 text-sm">soniya / savol</span>
              </div>
            )}
          </div>

          {/* Shuffle */}
          <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Shuffle size={16} className="text-purple-400" />
              <span className="text-white text-sm font-medium">Savollar tartibini aralashtirish</span>
            </div>
            <button
              onClick={() => setShuffleQuestions(!shuffleQuestions)}
              className={`w-11 h-6 rounded-full transition-all border-none cursor-pointer relative ${
                shuffleQuestions ? 'bg-purple-600' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                shuffleQuestions ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Due date */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Muddat (ixtiyoriy)</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 text-sm"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-4 space-y-2">
            <h5 className="text-white font-semibold text-xs uppercase tracking-wider">Xulosa</h5>
            <div className="text-white/60 text-xs space-y-1">
              <p>📝 {questionSelection === 'all' ? totalQuestions : questionCount} ta savol{questionSelection === 'random' ? ' (tasodifiy)' : ''}</p>
              <p>⏱️ {timeType === 'none' ? 'Vaqt cheksiz' : timeType === 'total' ? `${totalTime} daqiqa umumiy` : `${perQuestionTime} soniya/savol`}</p>
              <p>🔀 {shuffleQuestions ? 'Tartib aralashtiriladi' : 'Doimiy tartib'}</p>
              {dueDate && <p>📅 Muddat: {new Date(dueDate).toLocaleString('uz')}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-black/20 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl text-sm font-bold transition-all border-none cursor-pointer bg-transparent"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!selectedClassId && selectedStudentIds.length === 0)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
              loading || (!selectedClassId && selectedStudentIds.length === 0)
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30'
            }`}
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Yuborilmoqda...</>
            ) : (
              <><Send size={16} /> Testni ulashish</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestAssignModal;
