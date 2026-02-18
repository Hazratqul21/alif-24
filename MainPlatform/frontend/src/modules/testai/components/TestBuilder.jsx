import React, { useState, useEffect } from 'react';
import apiService from '../../../services/apiService';
import { Save, Plus, Trash2, Edit3, Check, X, AlertCircle, BookOpen, Users, Clock, Award, Zap } from 'lucide-react';

const TestBuilder = ({ initialTests = [], onTestSaved }) => {
  const [tests, setTests] = useState(initialTests);
  const [editingIndex, setEditingIndex] = useState(null);
  const [notification, setNotification] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testInfo, setTestInfo] = useState({
    title: '',
    description: '',
    category: 'general',
    tags: []
  });
  const [newTag, setNewTag] = useState('');

  // MathJax ni render qilish uchun useEffect
  useEffect(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([document.getElementById('root')])
        .catch(err => console.error('MathJax error:', err));
    }
  }, [tests, editingIndex]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const updateTest = (index, field, value) => {
    const updatedTests = [...tests];
    updatedTests[index] = { ...updatedTests[index], [field]: value };
    setTests(updatedTests);
  };

  const updateQuestion = (testIndex, questionIndex, field, value) => {
    const updatedTests = [...tests];
    updatedTests[testIndex].questions[questionIndex] = {
      ...updatedTests[testIndex].questions[questionIndex],
      [field]: value
    };
    setTests(updatedTests);
  };

  const addNewQuestion = (testIndex) => {
    const newQuestion = {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correct_answer: null,
      explanation: ''
    };

    const updatedTests = [...tests];
    updatedTests[testIndex].questions.push(newQuestion);
    setTests(updatedTests);
  };

  const removeQuestion = (testIndex, questionIndex) => {
    const updatedTests = [...tests];
    updatedTests[testIndex].questions.splice(questionIndex, 1);
    setTests(updatedTests);
  };

  const addTag = () => {
    if (newTag.trim() && !testInfo.tags.includes(newTag.trim())) {
      setTestInfo({
        ...testInfo,
        tags: [...testInfo.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTestInfo({
      ...testInfo,
      tags: testInfo.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const saveTest = async () => {
    if (!testInfo.title.trim()) {
      showNotification('error', 'Iltimos, test nomini kiriting!');
      return;
    }

    if (tests.length === 0 || tests[0].questions.length === 0) {
      showNotification('error', 'Iltimos, kamida bitta savol qo\'shing!');
      return;
    }

    setSaving(true);
    try {
      const testData = {
        title: testInfo.title,
        description: testInfo.description,
        questions: tests[0].questions,
        tags: testInfo.tags,
        category: testInfo.category
      };

      const response = await apiService.post('/testai/save', testData);

      showNotification('success', 'Test muvaffaqiyatli saqlandi!');
      onTestSaved && onTestSaved(response.data?.test || response.test || response);

      setTestInfo({
        title: '',
        description: '',
        category: 'general',
        tags: []
      });
      setTests([]);

    } catch (error) {
      console.error('Save error:', error);
      showNotification('error', 'Testni saqlashda xatolik yuz berdi.');
    } finally {
      setSaving(false);
    }
  };

  const addNewTest = () => {
    setTests([...tests, {
      id: Date.now().toString(),
      questions: []
    }]);
    setEditingIndex(tests.length);
  };

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-cyan-900/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridScroll 20s linear infinite'
        }}></div>

        {/* Neon Orbs */}
        <div className="neon-orb neon-orb-1"></div>
        <div className="neon-orb neon-orb-2"></div>
        <div className="neon-orb neon-orb-3"></div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
          <div className={`neon-card p-4 flex items-center gap-3 ${notification.type === 'success'
              ? 'border-cyan-400 bg-cyan-950/90'
              : 'border-pink-500 bg-pink-950/90'
            }`}>
            <div className={notification.type === 'success' ? 'text-cyan-400' : 'text-pink-400'}>
              {notification.type === 'success' ? (
                <Check className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
            <p className="font-bold text-white">{notification.message}</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-6 py-2 mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center gap-2 px-4 py-2 bg-black border-2 border-cyan-400 rounded-full neon-text-cyan">
              <Zap className="w-4 h-4" />
              <span className="font-black tracking-wider uppercase text-sm">Test Tuzish</span>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 relative">
            <span className="neon-text-gradient block mb-2" style={{
              textShadow: `
                0 0 10px rgba(0, 255, 255, 0.8),
                0 0 20px rgba(0, 255, 255, 0.6),
                0 0 40px rgba(0, 255, 255, 0.4),
                0 0 80px rgba(138, 43, 226, 0.6)
              `
            }}>
              TEST YARATISH
            </span>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-sm"></div>
          </h1>

          <p className="text-lg sm:text-xl text-cyan-300/80 max-w-2xl mx-auto font-mono">
            {'>'} Testlarni tekshiring, to'g'ri javoblarni belgilang va saqlang
          </p>
        </div>

        {/* Test Info Card */}
        <div className="neon-card mb-8 p-6 sm:p-8 animate-fadeIn">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 border border-purple-400 rounded-lg neon-glow-purple">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
            <span className="neon-text-purple">TEST MA'LUMOTLARI</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-wider">
                Test Nomi *
              </label>
              <input
                type="text"
                value={testInfo.title}
                onChange={(e) => setTestInfo({ ...testInfo, title: e.target.value })}
                className="neon-input"
                placeholder="Masalan: Matematika testi"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-wider">
                Kategoriya
              </label>
              <select
                value={testInfo.category}
                onChange={(e) => setTestInfo({ ...testInfo, category: e.target.value })}
                className="neon-input"
              >
                <option value="general">Umumiy</option>
                <option value="math">Matematika</option>
                <option value="science">Fan</option>
                <option value="language">Til</option>
                <option value="history">Tarix</option>
                <option value="it">IT</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-wider">
              Tavsif
            </label>
            <textarea
              value={testInfo.description}
              onChange={(e) => setTestInfo({ ...testInfo, description: e.target.value })}
              className="neon-input h-24 resize-none"
              placeholder="Test haqida qisqacha ma'lumot..."
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-wider">
              Teglar
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="neon-input flex-1"
                placeholder="Yangi teg..."
              />
              <button
                onClick={addTag}
                className="neon-button-primary px-6"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {testInfo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-950/50 border-2 border-purple-500 rounded-lg text-purple-300 font-bold neon-glow-purple-soft hover:bg-purple-900/50 transition-all"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-pink-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Questions */}
        {tests.length > 0 && tests[0].questions.map((question, qIndex) => (
          <div key={question.id} className="neon-card p-6 sm:p-8 mb-6 animate-fadeIn" style={{ animationDelay: `${qIndex * 0.1}s` }}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <span className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center text-lg border-2 border-cyan-400 neon-glow-cyan">
                  {qIndex + 1}
                </span>
                <span className="neon-text-cyan">SAVOL</span>
              </h3>
              <button
                onClick={() => removeQuestion(0, qIndex)}
                className="p-3 bg-pink-950/30 border-2 border-pink-500 rounded-lg text-pink-400 hover:bg-pink-900/50 transition-all neon-glow-pink group"
              >
                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-wider">
                  Savol Matni
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) => updateQuestion(0, qIndex, 'question', e.target.value)}
                  className="neon-input h-20 resize-none"
                  placeholder="Savolni kiriting..."
                />
              </div>

              <div>
                <label className="block text-sm font-black text-cyan-400 mb-3 uppercase tracking-wider">
                  Variantlar
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center font-black text-white border-2 border-purple-400 neon-glow-purple shrink-0">
                        {String.fromCharCode(65 + oIndex)}
                      </div>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...question.options];
                          newOptions[oIndex] = e.target.value;
                          updateQuestion(0, qIndex, 'options', newOptions);
                        }}
                        className="neon-input flex-1"
                        placeholder={`Variant ${oIndex + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-cyan-400 mb-3 uppercase tracking-wider">
                  To'g'ri Javob
                </label>
                <div className="flex gap-3">
                  {['A', 'B', 'C', 'D'].map((letter) => (
                    <button
                      key={`${letter}-${qIndex}`}
                      onClick={() => updateQuestion(0, qIndex, 'correct_answer', letter)}
                      className={`w-14 h-14 rounded-lg font-black text-xl transition-all ${question.correct_answer === letter
                          ? 'bg-gradient-to-br from-green-500 to-cyan-500 text-white border-2 border-green-400 neon-glow-green scale-110'
                          : 'bg-gray-900/50 text-gray-400 border-2 border-gray-700 hover:border-cyan-500 hover:text-cyan-400 hover:scale-105'
                        }`}
                      title={`${qIndex + 1}-savol uchun ${letter} variantini tanlash`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
                {question.correct_answer && (
                  <p className="text-sm text-green-400 mt-3 font-bold font-mono">
                    → Tanlangan: {question.correct_answer}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-black text-cyan-400 mb-2 uppercase tracking-wider">
                  Izoh (ixtiyoriy)
                </label>
                <textarea
                  value={question.explanation || ''}
                  onChange={(e) => updateQuestion(0, qIndex, 'explanation', e.target.value)}
                  className="neon-input h-16 resize-none"
                  placeholder="To'g'ri javobning izohi..."
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add Question Button */}
        <div className="mb-8">
          <button
            onClick={() => addNewQuestion(0)}
            className="w-full py-6 bg-black/50 border-2 border-dashed border-cyan-500/50 rounded-xl text-cyan-400 font-black text-lg hover:bg-cyan-950/30 hover:border-cyan-400 transition-all flex items-center justify-center gap-3 group neon-glow-cyan-soft"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            YANGI SAVOL QO'SHISH
          </button>
        </div>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={saveTest}
            disabled={saving}
            className="flex-1 py-6 bg-gradient-to-r from-green-600 via-cyan-600 to-blue-600 text-white rounded-xl font-black text-xl shadow-2xl hover:shadow-cyan-500/50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 border-2 border-cyan-400 neon-glow-cyan relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            {saving ? (
              <>
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="relative">SAQLANMOQDA...</span>
              </>
            ) : (
              <>
                <Save className="w-6 h-6 relative" />
                <span className="relative">TESTNI SAQLASH</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        * {
          font-family: 'Orbitron', monospace;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gridScroll {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(50px);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-30px, 30px) scale(0.9);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }

        .border-3 {
          border-width: 3px;
        }

        .neon-card {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95));
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 1rem;
          box-shadow: 
            0 0 20px rgba(0, 255, 255, 0.2),
            inset 0 0 20px rgba(0, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
        }

        .neon-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 0.5rem;
          color: #fff;
          font-weight: 700;
          outline: none;
          transition: all 0.3s;
        }

        .neon-input:focus {
          border-color: #00ffff;
          box-shadow: 
            0 0 10px rgba(0, 255, 255, 0.5),
            inset 0 0 10px rgba(0, 255, 255, 0.1);
        }

        .neon-input::placeholder {
          color: rgba(148, 163, 184, 0.5);
        }

        .neon-button-primary {
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #8b5cf6, #00ffff);
          border: 2px solid #00ffff;
          border-radius: 0.5rem;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }

        .neon-button-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(0, 255, 255, 0.6);
        }

        .neon-text-cyan {
          color: #00ffff;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
        }

        .neon-text-purple {
          color: #a78bfa;
          text-shadow: 0 0 10px rgba(167, 139, 250, 0.8);
        }

        .neon-text-gradient {
          background: linear-gradient(135deg, #00ffff, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .neon-glow-cyan {
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
        }

        .neon-glow-cyan-soft {
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
        }

        .neon-glow-purple {
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);
        }

        .neon-glow-purple-soft {
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }

        .neon-glow-pink {
          box-shadow: 0 0 15px rgba(236, 72, 153, 0.5);
        }

        .neon-glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
        }

        .neon-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: float 20s infinite ease-in-out;
        }

        .neon-orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(0, 255, 255, 0.4), transparent);
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .neon-orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.4), transparent);
          bottom: -150px;
          right: -150px;
          animation-delay: -7s;
        }

        .neon-orb-3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.4), transparent);
          top: 50%;
          left: 50%;
          animation-delay: -14s;
        }

        select.neon-input {
          cursor: pointer;
        }

        select.neon-input option {
          background: #1f2937;
          color: #fff;
        }
      `}</style>
    </div>
  );
};

export default TestBuilder;