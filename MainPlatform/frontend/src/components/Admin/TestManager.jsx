import React, { useState, useEffect } from 'react';
import { Plus, List, FileText, Send, BarChart2, ChevronLeft, Search } from 'lucide-react';
import apiService from '../../services/apiService';
import TestParser from '../../modules/testai/components/TestParser';
import TestBuilder from '../../modules/testai/components/TestBuilder';
import TestAssignment from '../../modules/testai/components/TestAssignment';
import TestResults from '../../modules/testai/components/TestResults';

const TestManager = () => {
    const [view, setView] = useState('list'); // list, parse, build, assign, results
    const [savedTests, setSavedTests] = useState([]);
    const [currentTests, setCurrentTests] = useState([]); // Tests being parsed/built
    const [selectedTest, setSelectedTest] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (view === 'list') {
            fetchSavedTests();
        }
    }, [view]);

    const fetchSavedTests = async () => {
        setLoading(true);
        try {
            // TestAI backend has an endpoint for my-tests
            const response = await apiService.get('/testai/my-tests');
            setSavedTests(response.data?.tests || response.tests || []);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestsParsed = (tests) => {
        setCurrentTests([{ id: 'new', questions: tests }]);
        setView('build');
    };

    const handleTestSaved = (savedTestData) => {
        setView('list');
        fetchSavedTests();
    };

    const deleteTest = async (testId) => {
        if (!window.confirm('Bu testni o\'chirmoqchimisiz?')) return;
        try {
            await apiService.delete(`/testai/test/${testId}`);
            fetchSavedTests();
        } catch (error) {
            console.error('Error deleting test:', error);
            alert('O\'chirishda xatolik yuz berdi');
        }
    };

    const renderListView = () => (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-purple-400" />
                        Saqlangan testlar
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Siz yaratgan va boshqaradigan barcha testlar</p>
                </div>
                <button
                    onClick={() => setView('parse')}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
                >
                    <Plus size={20} />
                    Yangi test yaratish
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
                <input
                    type="text"
                    placeholder="Testlarni qidirish..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
            ) : savedTests.length === 0 ? (
                <div className="bg-gray-900/30 border border-dashed border-gray-800 rounded-2xl p-12 text-center">
                    <FileText size={48} className="mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-500 font-medium">Hozircha testlar yo'q</p>
                    <button 
                        onClick={() => setView('parse')}
                        className="text-purple-400 font-bold mt-2 hover:text-purple-300 transition-colors"
                    >
                        Birinchi testni yarating →
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedTests
                        .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(test => (
                        <div key={test.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-purple-500/50 transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                    <FileText className="text-purple-400" size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setSelectedTest(test); setView('assign'); }}
                                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Yuborish"
                                    >
                                        <Send size={18} />
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedTest(test); setView('results'); }}
                                        className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                        title="Natijalar"
                                    >
                                        <BarChart2 size={18} />
                                    </button>
                                    <button 
                                        onClick={() => deleteTest(test.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="O'chirish"
                                    >
                                        <Plus className="rotate-45" size={18} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">{test.title}</h3>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{test.description || 'Tavsif yo\'q'}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-800">
                                <div className="flex items-center gap-1">
                                    <List size={14} />
                                    <span>{test.questions_count || test.questions?.length || 0} savol</span>
                                </div>
                                <span>{new Date(test.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderHeader = (title, subtitle) => (
        <div className="flex items-center gap-4 mb-8">
            <button
                onClick={() => setView('list')}
                className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors"
            >
                <ChevronLeft size={24} />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <p className="text-gray-500 text-sm">{subtitle}</p>
            </div>
        </div>
    );

    return (
        <div className="pb-12">
            {view === 'list' && renderListView()}

            {view === 'parse' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => setView('list')}
                            className="flex items-center gap-2 text-purple-400 font-bold hover:text-purple-300 transition-colors"
                        >
                            <ChevronLeft size={18} />
                            Orqaga qaytish
                        </button>
                    </div>
                    {/* TestParser has inner min-h-screen, might need styling adjustments */}
                    <div className="rounded-2xl overflow-hidden border border-gray-800">
                        <TestParser onTestsParsed={handleTestsParsed} />
                    </div>
                </div>
            )}

            {view === 'build' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => setView('parse')}
                            className="flex items-center gap-2 text-purple-400 font-bold hover:text-purple-300 transition-colors"
                        >
                            <ChevronLeft size={18} />
                            Orqaga (Analiz)
                        </button>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-gray-800">
                        <TestBuilder initialTests={currentTests} onTestSaved={handleTestSaved} />
                    </div>
                </div>
            )}

            {view === 'assign' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => setView('list')}
                            className="flex items-center gap-2 text-purple-400 font-bold hover:text-purple-300 transition-colors"
                        >
                            <ChevronLeft size={18} />
                            Ro'yxatga qaytish
                        </button>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-gray-800">
                        <TestAssignment tests={[selectedTest, ...savedTests]} />
                    </div>
                </div>
            )}

            {view === 'results' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => setView('list')}
                            className="flex items-center gap-2 text-purple-400 font-bold hover:text-purple-300 transition-colors"
                        >
                            <ChevronLeft size={18} />
                            Ro'yxatga qaytish
                        </button>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-gray-800">
                        <TestResults tests={[selectedTest, ...savedTests]} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestManager;
