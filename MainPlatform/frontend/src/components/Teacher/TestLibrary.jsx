import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Eye, Edit, Send, Tag, Trash2, Search,
  Clock, CheckCircle, RefreshCw, BookOpen, Filter, MoreVertical,
  Download, Copy, ChevronRight, Sparkles, BarChart3
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';
import TestPreviewModal from './TestPreviewModal';
import TestAssignModal from './TestAssignModal';
import TestResultsView from './TestResultsView';

const TestLibrary = ({ classrooms = [], onShowNotif, onOpenTestBuilder }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const notify = (type, msg) => {
    if (onShowNotif) onShowNotif(type, msg);
  };

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teacherService.getMyTests();
      setTests(res.tests || []);
    } catch (e) {
      console.error('Tests fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const handleDelete = async (testId) => {
    if (!confirm("Testni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await teacherService.deleteTest(testId);
      notify('success', "Test o'chirildi");
      fetchTests();
    } catch (e) {
      notify('error', e.message || "Xatolik");
    }
  };

  const filteredTests = tests.filter(t =>
    !searchTerm || t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showResults && selectedTest) {
    return (
      <TestResultsView
        test={selectedTest}
        onBack={() => { setShowResults(false); setSelectedTest(null); }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            Testlarim
          </h3>
          <p className="text-white/40 text-sm mt-1">
            {tests.length} ta test mavjud
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTests}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/60 hover:text-white transition-all"
            title="Yangilash"
          >
            <RefreshCw size={16} />
          </button>
          {onOpenTestBuilder && (
            <button
              onClick={onOpenTestBuilder}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl border-none cursor-pointer hover:shadow-lg hover:shadow-purple-500/20 transition-all text-sm font-semibold"
            >
              <Plus size={16} /> Yangi test
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Test nomi yoki fan bo'yicha qidirish..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 text-sm"
        />
      </div>

      {/* Test cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/5 rounded-2xl h-48 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <FileText className="w-14 h-14 text-white/10 mx-auto mb-4" />
          <h4 className="text-white/60 font-semibold mb-2">
            {searchTerm ? "Hech narsa topilmadi" : "Hozircha test yo'q"}
          </h4>
          <p className="text-white/30 text-sm mb-4">
            {searchTerm
              ? "Boshqa kalit so'z bilan qidiring"
              : "Yangi test yaratish uchun yuqoridagi tugmani bosing"
            }
          </p>
          {!searchTerm && onOpenTestBuilder && (
            <button
              onClick={onOpenTestBuilder}
              className="px-5 py-2.5 bg-purple-500/20 text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-500/30 transition-colors"
            >
              <Sparkles className="w-4 h-4 inline mr-1.5" /> Test yaratish
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTests.map(test => (
            <div
              key={test.id}
              className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] hover:border-purple-500/20 transition-all relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-white font-bold text-base truncate group-hover:text-purple-300 transition-colors">
                    {test.title}
                  </h4>
                  {test.subject && (
                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-md">
                      {test.subject}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === test.id ? null : test.id); }}
                    className="p-1.5 text-white/20 hover:text-white/60 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {activeMenu === test.id && (
                    <div className="absolute right-0 top-8 z-20 bg-[#1e1e3a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px]"
                      onClick={() => setActiveMenu(null)}>
                      <button onClick={() => handleDelete(test.id)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} /> O'chirish
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-white/40 mb-4">
                <span className="flex items-center gap-1">
                  <BookOpen size={12} />
                  {test.questions_count || test.questions?.length || 0} savol
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {test.created_at ? new Date(test.created_at).toLocaleDateString('uz') : ''}
                </span>
                {test.difficulty && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    test.difficulty === 'easy' ? 'bg-green-500/15 text-green-400' :
                    test.difficulty === 'hard' ? 'bg-red-500/15 text-red-400' :
                    'bg-yellow-500/15 text-yellow-400'
                  }`}>
                    {test.difficulty === 'easy' ? 'Oson' : test.difficulty === 'hard' ? 'Qiyin' : 'O\'rta'}
                  </span>
                )}
              </div>

              {/* Description */}
              {test.description && (
                <p className="text-white/40 text-xs mb-4 line-clamp-2">{test.description}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => { setSelectedTest(test); setShowPreview(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-xs font-medium transition-all border border-white/5"
                >
                  <Eye size={13} /> Ko'rish
                </button>
                <button
                  onClick={() => { setSelectedTest(test); setShowAssign(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium transition-all border border-purple-500/10"
                >
                  <Send size={13} /> Ulashish
                </button>
                <button
                  onClick={() => { setSelectedTest(test); setShowResults(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-xs font-medium transition-all border border-green-500/10"
                >
                  <BarChart3 size={13} /> Natijalar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showPreview && selectedTest && (
        <TestPreviewModal
          test={selectedTest}
          onClose={() => { setShowPreview(false); setSelectedTest(null); }}
        />
      )}
      {showAssign && selectedTest && (
        <TestAssignModal
          test={selectedTest}
          classrooms={classrooms}
          onClose={() => { setShowAssign(false); setSelectedTest(null); }}
          onAssigned={() => {
            setShowAssign(false);
            setSelectedTest(null);
            notify('success', 'Test muvaffaqiyatli ulashildi!');
          }}
          onShowNotif={notify}
        />
      )}

      {/* Click outside to close menu */}
      {activeMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
      )}
    </div>
  );
};

export default TestLibrary;
