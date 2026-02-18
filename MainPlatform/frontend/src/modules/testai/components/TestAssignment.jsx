import React, { useState, useEffect } from 'react';
import apiService from '../../../services/apiService';
import { Send, Users, Calendar, Clock, CheckCircle, AlertCircle, Plus, X, BookOpen, Target, Zap, Rocket } from 'lucide-react';

const TestAssignment = ({ tests = [] }) => {
  const [selectedTest, setSelectedTest] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [studentIds, setStudentIds] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showNewClassForm, setShowNewClassForm] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', description: '' });

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchClasses();
    fetchAssignments();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await apiService.get('/teachers/classrooms');
      setClasses(response.data?.classes || response.classes || response || []);
    } catch (error) {
      console.error('Classes fetch error:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await apiService.get('/teacher-tests');
      setAssignments(response.data?.assignments || response.assignments || []);
    } catch (error) {
      console.error('Assignments fetch error:', error);
    }
  };

  const createClass = async () => {
    if (!newClass.name.trim()) {
      showNotification('error', 'Sinf nomini kiriting!');
      return;
    }

    try {
      const response = await apiService.post('/teachers/classrooms', {
        name: newClass.name,
        description: newClass.description
      });

      showNotification('success', 'Sinf muvaffaqiyatli yaratildi!');
      setClasses([...classes, response.data?.class || response]);
      setNewClass({ name: '', description: '' });
      setShowNewClassForm(false);
    } catch (error) {
      console.error('Class creation error:', error);
      showNotification('error', 'Sinf yaratishda xatolik!');
    }
  };

  const assignTest = async () => {
    if (!selectedTest) {
      showNotification('error', 'Iltimos, test tanlang!');
      return;
    }

    if (!selectedClass && !studentIds.trim()) {
      showNotification('error', 'Iltimos, sinf tanlang yoki o\'quvchi IDlarini kiriting!');
      return;
    }

    setLoading(true);
    try {
      const assignmentData = {
        test_id: selectedTest.id,
        class_name: selectedClass || 'custom',
        student_ids: studentIds.split(',').map(id => id.trim()).filter(id => id),
        assigned_at: new Date().toISOString(),
        due_date: dueDate || null
      };

      const response = await apiService.post('/testai/assign', assignmentData);

      showNotification('success', 'Test sinfga muvaffaqiyatli yuborildi!');
      fetchAssignments();

      setSelectedTest(null);
      setSelectedClass('');
      setStudentIds('');
      setDueDate('');

    } catch (error) {
      console.error('Assignment error:', error);
      showNotification('error', 'Testni yuborishda xatolik!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* Animated Neon Background */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-neonSlideIn">
          <div className={`relative px-6 py-4 rounded-xl backdrop-blur-xl border-2 ${notification.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)]'
              : 'bg-rose-500/20 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.6)]'
            }`}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-6 h-6 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-400" />
              )}
              <p className="font-bold text-white">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 animate-neonFadeIn">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-blue-500/20 border-2 border-blue-400 rounded-full text-sm font-black mb-6 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_40px_rgba(59,130,246,0.8)] transition-all duration-300">
            <Rocket className="w-5 h-5 text-blue-400 animate-pulse" />
            <span className="text-blue-400 uppercase tracking-wider">Test Yuborish Platformasi</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 relative inline-block animate-neonGlow">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-pink-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.8)]">
              TESTNI YUBORISH
            </span>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-pink-500 opacity-20 blur-2xl -z-10"></div>
          </h1>

          <p className="text-lg sm:text-xl text-cyan-300 max-w-2xl mx-auto leading-relaxed font-semibold">
            Testlarni sinflarga yoki individual o'quvchilarga yuboring
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Test Assignment Form */}
          <div className="space-y-6 animate-neonSlideLeft">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>

              <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-blue-400/50 p-6 sm:p-8 shadow-[0_0_50px_rgba(59,130,246,0.3)] hover:shadow-[0_0_80px_rgba(59,130,246,0.5)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.6)]">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-blue-400 uppercase tracking-wide">Test Yuborish</h2>
                </div>

                {/* Test Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-wider">
                    Test Tanlang *
                  </label>
                  <div className="relative group/select">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover/select:opacity-50 transition-opacity duration-300 blur"></div>
                    <select
                      value={selectedTest?.id || ''}
                      onChange={(e) => {
                        const test = tests.find(t => t.id === e.target.value);
                        setSelectedTest(test);
                      }}
                      className="relative w-full px-4 py-3 bg-black/60 border-2 border-blue-400/50 rounded-xl text-cyan-300 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all font-semibold"
                    >
                      <option value="" className="bg-black">Test tanlang...</option>
                      {tests.map((test) => (
                        <option key={test.id} value={test.id} className="bg-black">
                          {test.title} ({test.questions?.length || 0} savol)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Class Selection */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-black text-cyan-400 uppercase tracking-wider">
                      Sinf
                    </label>
                    <button
                      onClick={() => setShowNewClassForm(!showNewClassForm)}
                      className="text-sm text-pink-400 hover:text-pink-300 font-black flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      YANGI SINF
                    </button>
                  </div>

                  {showNewClassForm && (
                    <div className="mb-4 p-4 bg-blue-500/10 rounded-xl border-2 border-blue-400/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)] animate-neonFadeIn">
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Sinf nomi"
                          value={newClass.name}
                          onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                          className="w-full px-3 py-2 bg-black/60 border-2 border-blue-400/50 rounded-lg text-cyan-300 placeholder:text-cyan-600 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                        />
                        <input
                          type="text"
                          placeholder="Tavsif (ixtiyoriy)"
                          value={newClass.description}
                          onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                          className="w-full px-3 py-2 bg-black/60 border-2 border-blue-400/50 rounded-lg text-cyan-300 placeholder:text-cyan-600 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={createClass}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-black text-sm hover:scale-105 transition-all border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                          >
                            YARATISH
                          </button>
                          <button
                            onClick={() => setShowNewClassForm(false)}
                            className="px-4 py-2 bg-rose-500/20 text-rose-400 border-2 border-rose-400 rounded-lg font-black text-sm hover:bg-rose-500/30 transition-all"
                          >
                            BEKOR QILISH
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative group/select">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover/select:opacity-50 transition-opacity duration-300 blur"></div>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="relative w-full px-4 py-3 bg-black/60 border-2 border-blue-400/50 rounded-xl text-cyan-300 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all font-semibold"
                    >
                      <option value="" className="bg-black">Sinf tanlang...</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.name} className="bg-black">
                          {cls.name} ({cls.student_count} o'quvchi)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Student IDs */}
                <div className="mb-6">
                  <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-wider">
                    O'quvchi IDlari
                  </label>
                  <div className="relative group/textarea">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-0 group-hover/textarea:opacity-50 transition-opacity duration-300 blur"></div>
                    <textarea
                      value={studentIds}
                      onChange={(e) => setStudentIds(e.target.value)}
                      className="relative w-full px-4 py-3 bg-black/60 border-2 border-purple-400/50 rounded-xl text-cyan-300 placeholder:text-cyan-600 focus:outline-none focus:border-pink-400 focus:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all h-20 resize-none font-mono"
                      placeholder="student1, student2, student3"
                    />
                  </div>
                </div>

                {/* Due Date */}
                <div className="mb-6">
                  <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-wider">
                    Muddati (ixtiyoriy)
                  </label>
                  <div className="relative group/input">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-0 group-hover/input:opacity-50 transition-opacity duration-300 blur"></div>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="relative w-full px-4 py-3 bg-black/60 border-2 border-purple-400/50 rounded-xl text-cyan-300 focus:outline-none focus:border-pink-400 focus:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={assignTest}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-pink-600 text-white rounded-xl font-black text-lg shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:shadow-[0_0_70px_rgba(59,130,246,0.8)] transition-all flex items-center justify-center gap-3 disabled:opacity-30 hover:scale-105 border-2 border-blue-400 disabled:hover:scale-100"
                >
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>YUBORILMOQDA...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-6 h-6" />
                      <span>TESTNI YUBORISH</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Assignments */}
          <div className="space-y-6 animate-neonSlideRight">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>

              <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-purple-400/50 p-6 sm:p-8 shadow-[0_0_50px_rgba(168,85,247,0.3)] hover:shadow-[0_0_80px_rgba(168,85,247,0.5)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.6)]">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-purple-400 uppercase tracking-wide">So'nggi Topshiriqlar</h2>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {assignments.length === 0 ? (
                    <div className="text-center py-12 animate-neonPulse">
                      <div className="w-20 h-20 bg-purple-500/20 border-2 border-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                        <Calendar className="w-10 h-10 text-purple-400" />
                      </div>
                      <p className="text-purple-300 font-bold text-lg">Hozircha topshiriqlar yo'q</p>
                    </div>
                  ) : (
                    assignments.map((assignment, index) => (
                      <div
                        key={assignment.id}
                        className="relative group/card animate-neonSlideUp"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-xl opacity-0 group-hover/card:opacity-40 transition-opacity duration-300 blur"></div>

                        <div className="relative p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border-2 border-purple-400/50 hover:border-cyan-400 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_35px_rgba(6,182,212,0.4)]">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-5 h-5 text-cyan-400" />
                                <h3 className="font-black text-cyan-300">
                                  TEST ID: {assignment.test_id}
                                </h3>
                              </div>

                              <div className="space-y-2 ml-7">
                                <p className="text-sm text-purple-300 font-bold">
                                  <span className="text-pink-400">SINF:</span> {assignment.class_name}
                                </p>
                                <p className="text-sm text-purple-300 font-bold">
                                  <span className="text-pink-400">O'QUVCHILAR:</span> {assignment.student_ids?.length || 0} TA
                                </p>
                                <p className="text-xs text-cyan-400 font-semibold">
                                  📅 {new Date(assignment.assigned_at).toLocaleDateString('uz-UZ')}
                                </p>
                              </div>
                            </div>

                            <div className={`px-3 py-1.5 rounded-lg text-xs font-black border-2 ${assignment.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                              }`}>
                              {assignment.status === 'active' ? '⚡ FAOL' : '✓ BAJARILGAN'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes neonSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes neonFadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes neonSlideLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes neonSlideRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes neonSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes neonGlow {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.8));
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(6, 182, 212, 0.8));
          }
        }

        @keyframes neonPulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-neonSlideIn {
          animation: neonSlideIn 0.5s ease-out;
        }

        .animate-neonFadeIn {
          animation: neonFadeIn 0.8s ease-out;
        }

        .animate-neonSlideLeft {
          animation: neonSlideLeft 0.8s ease-out;
        }

        .animate-neonSlideRight {
          animation: neonSlideRight 0.8s ease-out;
        }

        .animate-neonSlideUp {
          animation: neonSlideUp 0.6s ease-out forwards;
        }

        .animate-neonGlow {
          animation: neonGlow 3s ease-in-out infinite;
        }

        .animate-neonPulse {
          animation: neonPulse 2s ease-in-out infinite;
        }

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #06b6d4, #ec4899);
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          box-shadow: 0 0 20px rgba(236, 72, 153, 0.8);
        }

        .border-3 {
          border-width: 3px;
        }
      `}</style>
    </div>
  );
};

export default TestAssignment;