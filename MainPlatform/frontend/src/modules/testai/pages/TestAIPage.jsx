import React, { useState, useEffect } from 'react';
import TestParser from '../components/TestParser';
import TestBuilder from '../components/TestBuilder';
import TestAssignment from '../components/TestAssignment';
import TestResults from '../components/TestResults';
import { BookOpen, Edit3, Send, Award, Sparkles } from 'lucide-react';
import apiService from '../../../services/apiService';

function TestAIPage() {
    const [tests, setTests] = useState([]);
    const [savedTests, setSavedTests] = useState([]);
    const [currentView, setCurrentView] = useState('parser'); // 'parser', 'builder', 'assignment', 'results'
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchSavedTests();
    }, []);

    const fetchSavedTests = async () => {
        try {
            // In main backend, we register it under /api/v1/teacher-tests (for get) or /api/v1/testai (for parsing)
            // The original TestAI used /api/tests for everything.
            // My backend implementation:
            // POST /api/v1/testai/save -> Creates TeacherTest
            // GET /api/v1/teacher-tests -> Gets TeacherTests

            const response = await apiService.get('/teacher-tests');
            setSavedTests(response.data || response || []);
            // Note: TeacherTest response shape might differ from TestAI expected shape.
            // TestAI expects: { tests: [...] } or list. 
            // TeacherTest logic returns list directly or paginated object. 
            // I should check TeacherTest endpoint response.
            // For now assuming list or adapting.
        } catch (error) {
            console.error('Tests fetch error:', error);
        }
    };

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleTestsParsed = (parsedTests) => {
        setTests(parsedTests);
        setCurrentView('builder');
    };

    const handleTestSaved = (savedTest) => {
        setSavedTests([...savedTests, savedTest]);
        showNotification('success', 'Test muvaffaqiyatli saqlandi!');
        setCurrentView('assignment');
    };

    const navigation = [
        { id: 'parser', name: 'Test Yaratish', icon: Sparkles, description: 'PDF, Word dan test yaratish' },
        { id: 'builder', name: 'Test Tuzish', icon: Edit3, description: 'Testlarni tahrir qilish' },
        { id: 'assignment', name: 'Test Yuborish', icon: Send, description: 'Sinfga yuborish' },
        { id: 'results', name: 'Natijalar', icon: Award, description: 'Test natijalarini ko\'rish' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-4 right-4 z-50 animate-slideIn">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm border ${notification.type === 'success'
                            ? 'bg-emerald-500/95 border-emerald-400 text-white'
                            : 'bg-rose-500/95 border-rose-400 text-white'
                        }`}>
                        <div className="w-6 h-6 flex-shrink-0">
                            {notification.type === 'success' ? '✓' : '!'}
                        </div>
                        <p className="font-medium">{notification.message}</p>
                    </div>
                </div>
            )}

            {/* Module Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg shadow-sm">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    TestAI Platformasi
                </h1>
                <p className="text-slate-600 mt-2 ml-14">Sun'iy intellekt yordamida testlar yarating va boshqaring</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-4 mb-8">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setCurrentView(item.id)}
                            className={`flex items-center gap-3 px-6 py-4 rounded-xl font-medium transition-all shadow-sm ${currentView === item.id
                                    ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white ring-2 ring-indigo-200'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:shadow-md'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <div className="text-left">
                                <div className="font-bold">{item.name}</div>
                                <div className="text-xs opacity-75 font-normal">{item.description}</div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
                {currentView === 'parser' && (
                    <TestParser onTestsParsed={handleTestsParsed} />
                )}

                {currentView === 'builder' && (
                    <TestBuilder
                        initialTests={tests.length > 0 ? [{ questions: tests }] : []}
                        onTestSaved={handleTestSaved}
                    />
                )}

                {currentView === 'assignment' && (
                    <TestAssignment tests={savedTests} />
                )}

                {currentView === 'results' && (
                    <TestResults tests={savedTests} />
                )}
            </div>

            <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
      `}</style>
        </div>
    );
}

export default TestAIPage;
