import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Wand2, Edit, Save, Trash2, Plus, Check, X, ArrowLeft, Sparkles, FileText, ChevronDown } from 'lucide-react';
import apiService from '../../services/apiService';

const TestCreator = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const callbackUrl = searchParams.get('callback');

  const [activeTab, setActiveTab] = useState('ai');
  const [questions, setQuestions] = useState([]);
  const [testTitle, setTestTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTestId, setSavedTestId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);

  // AI form
  const [aiForm, setAiForm] = useState({ subject: '', topic: '', difficulty: 'medium', question_count: 10, language: 'uz' });

  // Manual form
  const [manualQ, setManualQ] = useState({ question: '', options: ['', '', '', ''], correct: 0 });

  // My tests list
  const [myTests, setMyTests] = useState([]);
  const [showMyTests, setShowMyTests] = useState(false);

  useEffect(() => { loadMyTests(); }, []);

  const loadMyTests = async () => {
    try {
      const res = await apiService.get('/test/my-tests');
      setMyTests(res.data?.tests || []);
    } catch {}
  };

  // ========== AI GENERATE ==========
  const handleAIGenerate = async () => {
    if (!aiForm.subject.trim() || !aiForm.topic.trim()) {
      setError("Fan va mavzuni kiriting");
      return;
    }
    setError(''); setSuccess(''); setIsGenerating(true);
    try {
      const res = await apiService.post('/test/generate', { ...aiForm, save: true });
      const data = res.data;
      setQuestions(data.questions || []);
      setTestTitle(data.title || `${aiForm.subject} — ${aiForm.topic}`);
      setSavedTestId(data.id);
      setSuccess(`AI ${data.questions_count} ta savol yaratdi va saqladi!`);
      loadMyTests();
    } catch (err) {
      setError(err.message || 'AI xatolik');
    } finally {
      setIsGenerating(false);
    }
  };

  // ========== MANUAL ADD ==========
  const addManualQuestion = () => {
    if (!manualQ.question.trim() || manualQ.options.some(o => !o.trim())) {
      setError("Savol va barcha variantlarni to'ldiring");
      return;
    }
    setQuestions(prev => [...prev, { ...manualQ }]);
    setManualQ({ question: '', options: ['', '', '', ''], correct: 0 });
    setError('');
  };

  const removeQuestion = (idx) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const updateOption = (qIdx, oIdx, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      const opts = [...updated[qIdx].options];
      opts[oIdx] = value;
      updated[qIdx] = { ...updated[qIdx], options: opts };
      return updated;
    });
  };

  // ========== SAVE ==========
  const handleSave = async () => {
    if (!questions.length) return setError("Kamida 1 ta savol kerak");
    if (!testTitle.trim()) return setError("Test sarlavhasini kiriting");
    setError(''); setIsSaving(true);
    try {
      if (savedTestId) {
        await apiService.put(`/test/${savedTestId}`, { title: testTitle, questions });
        setSuccess("Test yangilandi!");
      } else {
        const res = await apiService.post('/test/save', {
          title: testTitle,
          subject: aiForm.subject || null,
          topic: aiForm.topic || null,
          difficulty: aiForm.difficulty,
          language: aiForm.language,
          questions,
          ai_generated: 'manual',
        });
        setSavedTestId(res.data?.id);
        setSuccess("Test saqlandi!");
      }
      loadMyTests();
    } catch (err) {
      setError(err.message || 'Saqlashda xatolik');
    } finally {
      setIsSaving(false);
    }
  };

  // ========== REDIRECT BACK ==========
  const handleUseTest = () => {
    if (callbackUrl && savedTestId) {
      const url = new URL(callbackUrl);
      url.searchParams.set('test_id', savedTestId);
      window.location.href = url.toString();
    }
  };

  const loadExistingTest = async (testId) => {
    try {
      const res = await apiService.get(`/test/${testId}`);
      const t = res.data;
      setQuestions(t.questions || []);
      setTestTitle(t.title || '');
      setSavedTestId(t.id);
      setShowMyTests(false);
      setAiForm(prev => ({ ...prev, subject: t.subject || '', topic: t.topic || '' }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] left-[12%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
        <div className="absolute top-[15%] left-[28%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
        <div className="absolute top-[8%] left-[55%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s', animationDuration: '2.5s' }} />
        <div className="absolute top-[22%] left-[72%] w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '3.5s' }} />
        <div className="absolute top-[50%] left-[88%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '2.8s' }} />
        <div className="absolute top-[70%] left-[15%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.2s', animationDuration: '3.2s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TestAI — Test Yaratish</h1>
              <p className="text-xs text-white/50">testai.alif24.uz</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMyTests(!showMyTests)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white/70 text-sm hover:bg-white/20 transition-colors">
              <FileText className="w-4 h-4" /> Testlarim ({myTests.length})
            </button>
            <a href="https://alif24.uz" className="text-white/50 text-sm hover:text-white transition-colors">← Bosh sahifa</a>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-between">
            {error} <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center justify-between">
            {success}
            {callbackUrl && savedTestId && (
              <button onClick={handleUseTest}
                className="ml-3 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
                Bu testni qo'llash →
              </button>
            )}
            <button onClick={() => setSuccess('')} className="ml-2"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* My Tests Dropdown */}
        {showMyTests && myTests.length > 0 && (
          <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <h3 className="text-white font-semibold mb-2">Mening Testlarim</h3>
            {myTests.map(t => (
              <div key={t.id} onClick={() => loadExistingTest(t.id)}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <div>
                  <p className="text-white text-sm font-medium">{t.title}</p>
                  <p className="text-white/40 text-xs">{t.questions_count} savol · {t.ai_generated === 'openai' ? 'AI' : 'Qo\'lda'} · {t.subject || '—'}</p>
                </div>
                <span className="text-white/30 text-xs">{t.created_at?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl w-fit">
          {[
            { key: 'ai', label: 'AI bilan yaratish', icon: Wand2 },
            { key: 'manual', label: "Qo'lda kiritish", icon: Edit },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white shadow-[0_4px_15px_rgba(75,48,251,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-bold text-lg mb-4">AI bilan Test Yaratish</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-white/50 mb-1 block">Fan *</label>
                <input value={aiForm.subject} onChange={e => setAiForm(p => ({ ...p, subject: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#4b30fb]"
                  placeholder="Masalan: Matematika" />
              </div>
              <div>
                <label className="text-sm text-white/50 mb-1 block">Mavzu *</label>
                <input value={aiForm.topic} onChange={e => setAiForm(p => ({ ...p, topic: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#4b30fb]"
                  placeholder="Masalan: Trigonometriya" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-sm text-white/50 mb-1 block">Qiyinlik</label>
                <select value={aiForm.difficulty} onChange={e => setAiForm(p => ({ ...p, difficulty: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#4b30fb]">
                  <option value="easy" className="bg-gray-900">Oson</option>
                  <option value="medium" className="bg-gray-900">O'rta</option>
                  <option value="hard" className="bg-gray-900">Qiyin</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/50 mb-1 block">Savollar soni</label>
                <input type="number" value={aiForm.question_count} onChange={e => setAiForm(p => ({ ...p, question_count: parseInt(e.target.value) || 10 }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#4b30fb]" min={1} max={50} />
              </div>
              <div>
                <label className="text-sm text-white/50 mb-1 block">Til</label>
                <select value={aiForm.language} onChange={e => setAiForm(p => ({ ...p, language: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#4b30fb]">
                  <option value="uz" className="bg-gray-900">O'zbek</option>
                  <option value="ru" className="bg-gray-900">Русский</option>
                  <option value="en" className="bg-gray-900">English</option>
                </select>
              </div>
            </div>
            <button onClick={handleAIGenerate} disabled={isGenerating}
              className="w-full py-3.5 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white font-bold rounded-xl hover:scale-[1.01] transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(75,48,251,0.4)]">
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI yaratmoqda...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2"><Wand2 className="w-5 h-5" /> AI bilan Yaratish</span>
              )}
            </button>
          </div>
        )}

        {/* Manual Tab */}
        {activeTab === 'manual' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-bold text-lg mb-4">Savol Qo'shish</h2>
            <div className="space-y-3">
              <input value={manualQ.question} onChange={e => setManualQ(p => ({ ...p, question: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#4b30fb]"
                placeholder="Savol matni" />
              <div className="grid grid-cols-2 gap-3">
                {manualQ.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button onClick={() => setManualQ(p => ({ ...p, correct: i }))}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                        i === manualQ.correct ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'
                      }`}>{String.fromCharCode(65 + i)}</button>
                    <input value={opt} onChange={e => { const opts = [...manualQ.options]; opts[i] = e.target.value; setManualQ(p => ({ ...p, options: opts })); }}
                      className="flex-1 px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#4b30fb]" />
                  </div>
                ))}
              </div>
              <button onClick={addManualQuestion}
                className="w-full py-2.5 bg-[#4b30fb]/20 border border-[#4b30fb]/30 text-[#4b30fb] font-medium rounded-xl hover:bg-[#4b30fb]/30 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Savol qo'shish
              </button>
            </div>
          </div>
        )}

        {/* Questions List + Save */}
        {questions.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <input value={testTitle} onChange={e => setTestTitle(e.target.value)}
                  className="bg-transparent text-white text-lg font-bold border-b border-white/20 focus:outline-none focus:border-[#4b30fb] pb-1 w-80"
                  placeholder="Test sarlavhasi" />
                <p className="text-white/40 text-sm mt-1">{questions.length} ta savol {savedTestId && `· ID: ${savedTestId}`}</p>
              </div>
              <button onClick={handleSave} disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors">
                <Save className="w-4 h-4" /> {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>

            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white font-medium text-sm">{i + 1}. {q.question}</p>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <button onClick={() => setEditingIdx(editingIdx === i ? null : i)} className="p-1 text-white/30 hover:text-white"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeQuestion(i)} className="p-1 text-white/30 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {editingIdx === i ? (
                    <div className="space-y-2 mt-3">
                      <input value={q.question} onChange={e => updateQuestion(i, 'question', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#4b30fb]" />
                      {q.options?.map((opt, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <button onClick={() => updateQuestion(i, 'correct', j)}
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${j === q.correct ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                            {String.fromCharCode(65 + j)}
                          </button>
                          <input value={opt} onChange={e => updateOption(i, j, e.target.value)}
                            className="flex-1 px-2 py-1.5 bg-white/10 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#4b30fb]" />
                        </div>
                      ))}
                      <button onClick={() => setEditingIdx(null)} className="text-xs text-emerald-400 hover:underline">✓ Tayyor</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {q.options?.map((opt, j) => (
                        <span key={j} className={`text-xs px-2.5 py-1 rounded-lg ${j === q.correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                          {String.fromCharCode(65 + j)}) {opt}
                        </span>
                      ))}
                    </div>
                  )}

                  {q.explanation && (
                    <p className="text-white/30 text-xs mt-2 italic">💡 {q.explanation}</p>
                  )}
                </div>
              ))}
            </div>

            {callbackUrl && savedTestId && (
              <button onClick={handleUseTest}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:scale-[1.01] transition-all shadow-lg">
                ✅ Bu testni qo'llash va qaytish
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestCreator;