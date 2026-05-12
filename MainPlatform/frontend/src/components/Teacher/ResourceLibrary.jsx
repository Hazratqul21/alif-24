import React, { useState, useRef, useEffect, useCallback } from 'react';
import { teacherService } from '../../services/teacherService';
import {
  Folder, FolderPlus, File, FileText, Image, Film, Upload, Trash2,
  Download, Search, ChevronRight, Plus, X, Loader2,
  FolderOpen, Paperclip, Grid, List, BookOpen, Eye, Play,
  CheckCircle, Clock, Users, Award, Zap, MoreVertical, Send,
  Tag, ShoppingBag, DollarSign, Info, MessageCircle, GraduationCap, FileCheck
} from 'lucide-react';

const ResourceLibrary = ({ classrooms = [], onAttach }) => {
  // File management state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [viewMode, setViewMode] = useState('grid');
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);

  // Saved tests state
  const [savedTests, setSavedTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [assigningTest, setAssigningTest] = useState(null);
  const [assignClassName, setAssignClassName] = useState('');

  // Marketplace listing state
  const [marketTest, setMarketTest] = useState(null);
  const [marketForm, setMarketForm] = useState({
    title: '',
    description: '',
    instructions: '',
    price: 15000,
    price_type: 'one_time',
    grade_level: '',
    format: 'online',
    includes_answers: true,
    support_info: '',
  });
  const [marketListingLoading, setMarketListingLoading] = useState(false);

  const [folders, setFolders] = useState([
    { id: 'root', name: 'Barcha fayllar', parent: null },
    { id: 'tests', name: 'Testlar', parent: 'root', icon: '📝', isSpecial: true },
    { id: 'presentations', name: 'Prezentatsiyalar', parent: 'root', icon: '📊' },
    { id: 'documents', name: 'Hujjatlar', parent: 'root', icon: '📄' },
    { id: 'media', name: 'Rasm va Video', parent: 'root', icon: '🖼️' },
  ]);

  // Fetch saved tests
  const fetchSavedTests = useCallback(async () => {
    setTestsLoading(true);
    try {
      const res = await teacherService.getMyTests();
      setSavedTests(res.data?.tests || res.tests || []);
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    } finally {
      setTestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedTests();
  }, [fetchSavedTests]);

  const breadcrumb = [];
  let current = folders.find(f => f.id === currentFolder);
  while (current) {
    breadcrumb.unshift(current);
    current = folders.find(f => f.id === current.parent);
  }

  const currentFolderChildren = folders.filter(f => f.parent === currentFolder);
  const currentFiles = uploadedFiles.filter(f => f.folder === currentFolder);
  const filteredFiles = searchQuery
    ? uploadedFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentFiles;

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/20' };
    if (['doc', 'docx'].includes(ext)) return { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (['ppt', 'pptx'].includes(ext)) return { icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/20' };
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { icon: Image, color: 'text-green-400', bg: 'bg-green-500/20' };
    if (['mp4', 'avi', 'mov', 'webm'].includes(ext)) return { icon: Film, color: 'text-purple-400', bg: 'bg-purple-500/20' };
    return { icon: File, color: 'text-white/40', bg: 'bg-white/10' };
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        try {
          const res = await teacherService.uploadAssignmentFile(file);
          const fileData = res.data || res;
          setUploadedFiles(prev => [...prev, {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            url: fileData?.url || '#',
            folder: currentFolder === 'tests' ? 'documents' : currentFolder,
            uploadedAt: new Date().toISOString(),
          }]);
        } catch {
          setUploadedFiles(prev => [...prev, {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
            folder: currentFolder === 'tests' ? 'documents' : currentFolder,
            uploadedAt: new Date().toISOString(),
          }]);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders(prev => [...prev, {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      parent: currentFolder,
      icon: '📁',
    }]);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleDeleteFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm("Bu testni o'chirishni xohlaysizmi?")) return;
    try {
      await teacherService.deleteTest(testId);
      setSavedTests(prev => prev.filter(t => t.id !== testId));
    } catch (err) {
      console.error('Delete test error:', err);
    }
  };

  const handleAssignTest = async (testId) => {
    if (!assignClassName) return;
    try {
      await teacherService.assignTest({
        test_id: testId,
        class_name: assignClassName,
      });
      setAssigningTest(null);
      setAssignClassName('');
      alert("Test muvaffaqiyatli biriktirildi!");
    } catch (err) {
      console.error('Assign error:', err);
      alert("Xatolik: " + (err.message || "Test biriktirishda muammo"));
    }
  };

  const getDifficultyBadge = (diff) => {
    switch (diff) {
      case 'easy': return { label: 'Oson', cls: 'bg-green-500/20 text-green-400' };
      case 'hard': return { label: 'Qiyin', cls: 'bg-red-500/20 text-red-400' };
      default: return { label: "O'rta", cls: 'bg-amber-500/20 text-amber-400' };
    }
  };

  // ============ RENDER: TESTS FOLDER ============
  if (currentFolder === 'tests') {
    return (
      <div className="space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => setCurrentFolder('root')} className="text-white/40 hover:text-white/60 px-2 py-1 rounded-lg transition-colors">
            Barcha fayllar
          </button>
          <ChevronRight className="w-3 h-3 text-white/20" />
          <span className="text-white font-bold px-2 py-1 bg-white/10 rounded-lg">📝 Testlar</span>
        </div>

        {/* Tests Header */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-bold text-lg">Saqlangan Testlar</h4>
            <p className="text-white/40 text-xs mt-0.5">{savedTests.length} ta test</p>
          </div>
          <button onClick={fetchSavedTests} disabled={testsLoading}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 text-xs transition-colors">
            {testsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yangilash'}
          </button>
        </div>

        {/* Tests List */}
        {testsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
          </div>
        ) : savedTests.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
            <BookOpen className="w-14 h-14 text-white/10 mx-auto mb-3" />
            <p className="text-white/50 font-medium">Hozircha saqlangan test yo'q</p>
            <p className="text-white/25 text-sm mt-1">Vazifalar → Test → Matn/Fayldan orqali test yarating</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedTests.map(test => {
              const diff = getDifficultyBadge(test.difficulty);
              const isExpanded = selectedTest === test.id;

              return (
                <div key={test.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">
                  {/* Test Card Header */}
                  <div className="p-4 cursor-pointer" onClick={() => setSelectedTest(isExpanded ? null : test.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-white font-bold truncate">{test.title}</h5>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {test.subject && (
                              <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded">{test.subject}</span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${diff.cls}`}>{diff.label}</span>
                            <span className="text-white/30 text-xs flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> {test.questions_count || test.questions?.length || 0} ta savol
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setMarketTest(test);
                          setMarketForm(prev => ({
                            ...prev,
                            title: test.title || '',
                            description: `${test.questions_count || test.questions?.length || 0} ta savol. ${test.subject ? test.subject + ' fani bo\'yicha.' : ''} Qiyinlik: ${getDifficultyBadge(test.difficulty).label}.`,
                            grade_level: '',
                          }));
                        }}
                          className="p-2 hover:bg-green-500/20 rounded-lg text-white/30 hover:text-green-400 transition-all"
                          title="Marketplacega joylashtirish">
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id); }}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-white/30 hover:text-red-400 transition-all"
                          title="O'chirish">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {test.description && (
                      <p className="text-white/40 text-xs mt-2 ml-[52px] line-clamp-1">{test.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 ml-[52px] text-[10px] text-white/20">
                      {test.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(test.created_at).toLocaleDateString('uz')}
                        </span>
                      )}
                      {test.language && <span className="uppercase">{test.language}</span>}
                    </div>
                  </div>



                  {/* Expanded: Questions Preview */}
                  {isExpanded && test.questions && (
                    <div className="border-t border-white/5 px-4 pb-4 max-h-80 overflow-y-auto">
                      <div className="mt-3 space-y-3">
                        {(test.questions || []).map((q, qIdx) => (
                          <div key={qIdx} className="bg-black/20 rounded-xl p-3">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 text-[10px] font-bold flex-shrink-0">
                                {qIdx + 1}
                              </span>
                              <p className="text-white text-sm font-medium">{q.question}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 ml-8">
                              {(q.options || []).map((opt, oIdx) => (
                                <div key={oIdx}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs ${
                                    (q.correct === oIdx || q.correct_answer === oIdx)
                                      ? 'bg-green-500/20 text-green-400 font-medium'
                                      : 'bg-white/5 text-white/50'
                                  }`}>
                                  <span className="font-bold mr-1">{String.fromCharCode(65 + oIdx)})</span> {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Marketplace Listing Modal */}
        {marketTest && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4" onClick={() => setMarketTest(null)}>
            <div className="bg-[#1e1e3a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-green-400" /> Marketga joylashtirish
                  </h3>
                  <p className="text-white/40 text-xs mt-1">{marketTest.title}</p>
                </div>
                <button onClick={() => setMarketTest(null)} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all border-none cursor-pointer bg-transparent">
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Test nomi */}
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Test nomi</label>
                  <input type="text" value={marketForm.title}
                    onChange={e => setMarketForm({ ...marketForm, title: e.target.value })}
                    placeholder="Masalan: Matematikadan 5-sinf final testi"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 placeholder:text-white/15" />
                </div>

                {/* Qisqa tavsif */}
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Qisqa tavsif</label>
                  <textarea value={marketForm.description}
                    onChange={e => setMarketForm({ ...marketForm, description: e.target.value })}
                    placeholder="Test qancha savoldan iborat, qaysi mavzularni qamrab oladi, qiyinlik darajasi..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 placeholder:text-white/15 h-20 resize-none" />
                </div>

                {/* Ko'rsatmalar */}
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Ko'rsatmalar (ixtiyoriy)</label>
                  <textarea value={marketForm.instructions}
                    onChange={e => setMarketForm({ ...marketForm, instructions: e.target.value })}
                    placeholder="Mijoz testni qanday ishlatishi, natijalarni ko'rish haqida..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 placeholder:text-white/15 h-16 resize-none" />
                </div>

                {/* Namuna (demo) */}
                {marketTest.questions?.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Namuna (demo) — dastlabki 2 ta savol ko'rsatiladi</label>
                    <div className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-2">
                      {marketTest.questions.slice(0, 2).map((q, i) => (
                        <div key={i} className="text-xs">
                          <p className="text-white/70 font-medium">{i + 1}. {q.question}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1 ml-3">
                            {(q.options || []).map((opt, oi) => (
                              <span key={oi} className="text-white/30 bg-white/5 px-2 py-0.5 rounded text-[10px]">
                                {String.fromCharCode(65 + oi)}) {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {marketTest.questions.length > 2 && (
                        <p className="text-white/20 text-[10px] italic">...va yana {marketTest.questions.length - 2} ta savol</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Narx */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Narxi (UZS)</label>
                    <div className="relative">
                      <input type="number" value={marketForm.price}
                        onChange={e => setMarketForm({ ...marketForm, price: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs font-bold">UZS</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">To'lov turi</label>
                    <select value={marketForm.price_type}
                      onChange={e => setMarketForm({ ...marketForm, price_type: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 appearance-none">
                      <option value="one_time" className="bg-[#1a1a2e]">Bir martalik</option>
                      <option value="subscription" className="bg-[#1a1a2e]">Obuna asosida</option>
                      <option value="free" className="bg-[#1a1a2e]">Bepul</option>
                    </select>
                  </div>
                </div>

                {/* Sinf tavsiyasi + Format */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Sinf / Yosh tavsiyasi</label>
                    <input type="text" value={marketForm.grade_level}
                      onChange={e => setMarketForm({ ...marketForm, grade_level: e.target.value })}
                      placeholder="Masalan: 5-sinf, 14-16 yosh"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 placeholder:text-white/15" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Format</label>
                    <select value={marketForm.format}
                      onChange={e => setMarketForm({ ...marketForm, format: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 appearance-none">
                      <option value="online" className="bg-[#1a1a2e]">Onlayn (Alif24)</option>
                      <option value="pdf" className="bg-[#1a1a2e]">PDF</option>
                      <option value="word" className="bg-[#1a1a2e]">Word</option>
                      <option value="google_forms" className="bg-[#1a1a2e]">Google Forms</option>
                    </select>
                  </div>
                </div>

                {/* Yechimlar bilan + Qo'llab-quvvatlash */}
                <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileCheck size={16} className="text-green-400" />
                    <span className="text-white text-sm">Javoblar bilan birga</span>
                  </div>
                  <button onClick={() => setMarketForm({ ...marketForm, includes_answers: !marketForm.includes_answers })}
                    className={`w-11 h-6 rounded-full transition-all border-none cursor-pointer relative ${marketForm.includes_answers ? 'bg-green-600' : 'bg-white/20'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${marketForm.includes_answers ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* Aloqa */}
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Aloqa / Qo'llab-quvvatlash (ixtiyoriy)</label>
                  <input type="text" value={marketForm.support_info}
                    onChange={e => setMarketForm({ ...marketForm, support_info: e.target.value })}
                    placeholder="Telegram: @username yoki email"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50 placeholder:text-white/15" />
                </div>

                {/* Komissiya haqida */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-amber-400/80 text-[11px]">
                    <Info size={12} className="inline mr-1" />
                    Platforma komissiyasi: 10% ({(marketForm.price * 0.1).toLocaleString()} so'm). Siz olasiz: {(marketForm.price * 0.9).toLocaleString()} so'm.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-white/10 bg-black/20 flex gap-3">
                <button onClick={() => setMarketTest(null)}
                  className="flex-1 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl text-sm font-bold transition-all border-none cursor-pointer bg-transparent">
                  Bekor qilish
                </button>
                <button
                  disabled={marketListingLoading || !marketForm.title.trim()}
                  onClick={async () => {
                    setMarketListingLoading(true);
                    try {
                      await teacherService.listTestInMarket({
                        resource_id: marketTest.id,
                        title: marketForm.title,
                        description: marketForm.description,
                        instructions: marketForm.instructions,
                        price: marketForm.price_type === 'free' ? 0 : marketForm.price,
                        price_type: marketForm.price_type,
                        grade_level: marketForm.grade_level,
                        format: marketForm.format,
                        includes_answers: marketForm.includes_answers,
                        support_info: marketForm.support_info,
                        resource_type: 'test',
                      });
                      setMarketTest(null);
                      alert("Test marketpleysga muvaffaqiyatli joylashtirildi!");
                    } catch (err) {
                      alert("Xatolik: " + (err.message || "Marketga joylashtirishda muammo"));
                    } finally {
                      setMarketListingLoading(false);
                    }
                  }}
                  className="flex-1 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all border-none cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2">
                  {marketListingLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda...</>
                    : <><Tag className="w-4 h-4" /> Marketga joylashtirish</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ RENDER: NORMAL FILE BROWSER ============
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Fayl qidirish..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#4b30fb]/50" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white">
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
          {currentFolder !== 'root' && (
            <button onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/60 text-xs font-medium">
              <FolderPlus className="w-4 h-4" /> Papka
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
          {currentFolder !== 'tests' && (
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-xl text-white text-xs font-bold hover:scale-105 transition-transform disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Yuklash
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      {currentFolder !== 'root' && (
        <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
          {breadcrumb.map((f, i) => (
            <React.Fragment key={f.id}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />}
              <button onClick={() => setCurrentFolder(f.id)}
                className={`px-2 py-1 rounded-lg flex-shrink-0 transition-colors ${f.id === currentFolder ? 'text-white font-bold bg-white/10' : 'text-white/40 hover:text-white/60'}`}>
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* New Folder Input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
          <FolderPlus className="w-4 h-4 text-amber-400" />
          <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Papka nomi..."
            className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-white/20"
            autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} />
          <button onClick={handleCreateFolder} className="text-green-400 hover:text-green-300 text-xs font-bold">Yaratish</button>
          <button onClick={() => setShowNewFolder(false)} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Content Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {currentFolderChildren.map(f => (
            <button key={f.id} onClick={() => setCurrentFolder(f.id)}
              className="p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition-all group relative">
              <div className="text-2xl mb-2">{f.icon || '📁'}</div>
              <div className="text-white text-sm font-medium truncate">{f.name}</div>
              <div className="text-white/30 text-[10px] mt-0.5">
                {f.id === 'tests'
                  ? `${savedTests.length} ta test`
                  : `${uploadedFiles.filter(uf => uf.folder === f.id).length} ta fayl`}
              </div>
              {f.id === 'tests' && savedTests.length > 0 && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">{savedTests.length}</span>
                </div>
              )}
            </button>
          ))}

          {filteredFiles.map(f => {
            const { icon: FileIcon, color, bg } = getFileIcon(f.name);
            return (
              <div key={f.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group relative">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                  <FileIcon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="text-white text-sm font-medium truncate">{f.name}</div>
                <div className="text-white/30 text-[10px] mt-0.5">{formatFileSize(f.size)}</div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {onAttach && (
                    <button onClick={() => onAttach(f)} className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/30">
                      <Paperclip className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => handleDeleteFile(f.id)} className="p-1.5 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {currentFolderChildren.length === 0 && filteredFiles.length === 0 && (
            <div className="col-span-full py-10 text-center">
              <FolderOpen className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Bu papka bo'sh</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {currentFolderChildren.map(f => (
            <button key={f.id} onClick={() => setCurrentFolder(f.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 border-b border-white/5 transition-colors text-left">
              <span className="text-lg">{f.icon || '📁'}</span>
              <span className="text-white text-sm font-medium flex-1">{f.name}</span>
              <span className="text-white/20 text-xs">
                {f.id === 'tests' ? `${savedTests.length} ta test` : `${uploadedFiles.filter(uf => uf.folder === f.id).length} ta fayl`}
              </span>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </button>
          ))}
          {filteredFiles.map(f => {
            const { icon: FileIcon, color, bg } = getFileIcon(f.name);
            return (
              <div key={f.id} className="flex items-center gap-3 p-3 hover:bg-white/5 border-b border-white/5 transition-colors group">
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <FileIcon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{f.name}</div>
                  <div className="text-white/30 text-[10px]">{formatFileSize(f.size)}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onAttach && (
                    <button onClick={() => onAttach(f)} className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400"><Paperclip className="w-3 h-3" /></button>
                  )}
                  <button onClick={() => handleDeleteFile(f.id)} className="p-1.5 bg-red-500/20 rounded-lg text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })}
          {currentFolderChildren.length === 0 && filteredFiles.length === 0 && (
            <div className="py-10 text-center">
              <FolderOpen className="w-10 h-10 text-white/10 mx-auto mb-2" />
              <p className="text-white/30 text-sm">Bo'sh</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceLibrary;
