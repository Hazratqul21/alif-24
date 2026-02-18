import React, { useState, useEffect } from 'react';
import apiService from '../../../services/apiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Award, TrendingUp, Users, Clock, CheckCircle, AlertCircle, Download, Filter, Search, Eye, Calendar, Activity, Target } from 'lucide-react';

const TestResults = ({ tests = [] }) => {
  const [selectedTest, setSelectedTest] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('list');

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (selectedTest) {
      fetchTestResults(selectedTest.id);
    }
  }, [selectedTest]);

  const fetchTestResults = async (testId) => {
    setLoading(true);
    try {
      const response = await apiService.get(`/testai/results/${testId}`);
      setResults(response.data?.results || response.results || []);
    } catch (error) {
      console.error('Results fetch error:', error);
      showNotification('error', 'Natijalarni olishda xatolik!');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = () => {
    if (results.length === 0) return null;

    const scores = results.map(r => r.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passed = scores.filter(s => s >= 60).length;

    return {
      average: average.toFixed(1),
      highest,
      lowest,
      passed,
      total: results.length,
      passRate: ((passed / results.length) * 100).toFixed(1)
    };
  };

  const getScoreDistribution = () => {
    const distribution = [
      { range: '0-20', count: 0, color: '#ef4444' },
      { range: '21-40', count: 0, color: '#f97316' },
      { range: '41-60', count: 0, color: '#eab308' },
      { range: '61-80', count: 0, color: '#22c55e' },
      { range: '81-100', count: 0, color: '#10b981' }
    ];

    results.forEach(result => {
      const score = result.score;
      if (score <= 20) distribution[0].count++;
      else if (score <= 40) distribution[1].count++;
      else if (score <= 60) distribution[2].count++;
      else if (score <= 80) distribution[3].count++;
      else distribution[4].count++;
    });

    return distribution.filter(d => d.count > 0);
  };

  const exportResults = () => {
    if (!selectedTest || results.length === 0) return;

    const csvContent = [
      ['O\'quvchi ID', 'Ball', 'To\'g\'ri javoblar', 'Sarflangan vaqt (daqiqada)', 'Boshlangan vaqt', 'Tugatilgan vaqt'],
      ...results.map(r => [
        r.student_id,
        r.score,
        `${r.correct_answers}/${r.total_questions}`,
        Math.round(r.time_spent / 60),
        new Date(r.started_at).toLocaleString('uz-UZ'),
        new Date(r.completed_at).toLocaleString('uz-UZ')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `test_${selectedTest.id}_results.csv`;
    link.click();
  };

  const filteredResults = results.filter(result => 
    result.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = calculateStatistics();
  const scoreDistribution = getScoreDistribution();

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-black to-purple-900/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
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
          <div className={`neon-card p-4 flex items-center gap-3 ${
            notification.type === 'success' 
              ? 'border-green-400 bg-green-950/90' 
              : 'border-red-500 bg-red-950/90'
          }`}>
            <div className={notification.type === 'success' ? 'text-green-400' : 'text-red-400'}>
              {notification.type === 'success' ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
            <p className="font-bold text-white">{notification.message}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-6 py-2 mb-6 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center gap-2 px-4 py-2 bg-black border-2 border-blue-400 rounded-full neon-text-blue">
              <Activity className="w-4 h-4" />
              <span className="font-black tracking-wider uppercase text-sm">Test Natijalari</span>
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 relative">
            <span className="neon-text-gradient block mb-2" style={{
              textShadow: `
                0 0 10px rgba(59, 130, 246, 0.8),
                0 0 20px rgba(59, 130, 246, 0.6),
                0 0 40px rgba(59, 130, 246, 0.4),
                0 0 80px rgba(147, 51, 234, 0.6)
              `
            }}>
              NATIJALAR TAHLILI
            </span>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent blur-sm"></div>
          </h1>
          
          <p className="text-lg sm:text-xl text-blue-300/80 max-w-2xl mx-auto font-mono">
            {'>'} O'quvchilarning test natijalarini tahlil qiling
          </p>
        </div>

        {/* Test Selection & Filters */}
        <div className="neon-card mb-8 p-6 sm:p-8 animate-fadeIn">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-black text-blue-400 mb-2 uppercase tracking-wider">
                Test Tanlang
              </label>
              <select
                value={selectedTest?.id || ''}
                onChange={(e) => {
                  const test = tests.find(t => t.id === e.target.value);
                  setSelectedTest(test);
                }}
                className="neon-input"
              >
                <option value="">Test tanlang...</option>
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-black text-blue-400 mb-2 uppercase tracking-wider">
                Qidirish
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-blue-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="neon-input pl-10"
                  placeholder="O'quvchi ID..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-blue-400 mb-2 uppercase tracking-wider">
                Ko'rish Turi
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="neon-input"
              >
                <option value="list">Ro'yxat</option>
                <option value="chart">Grafik</option>
                <option value="analytics">Tahlil</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-black text-blue-400 mb-2 uppercase tracking-wider">
                &nbsp;
              </label>
              <button
                onClick={exportResults}
                disabled={!selectedTest || results.length === 0}
                className="neon-button-primary w-full"
              >
                <Download className="w-5 h-5" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>

        {selectedTest && (
          <>
            {/* Statistics Cards */}
            {stats && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="neon-stat-card animate-fadeIn" style={{animationDelay: '0.1s'}}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-600/20 border-2 border-blue-400 rounded-lg neon-glow-blue">
                      <Users className="w-8 h-8 text-blue-400" />
                    </div>
                    <span className="text-4xl font-black text-white neon-text-white">{stats.total}</span>
                  </div>
                  <p className="text-sm text-blue-300 font-bold uppercase tracking-wider">Jami O'quvchilar</p>
                </div>

                <div className="neon-stat-card animate-fadeIn" style={{animationDelay: '0.2s'}}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-green-600/20 border-2 border-green-400 rounded-lg neon-glow-green">
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    </div>
                    <span className="text-4xl font-black text-white neon-text-white">{stats.average}</span>
                  </div>
                  <p className="text-sm text-green-300 font-bold uppercase tracking-wider">O'rtacha Ball</p>
                </div>

                <div className="neon-stat-card animate-fadeIn" style={{animationDelay: '0.3s'}}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-yellow-600/20 border-2 border-yellow-400 rounded-lg neon-glow-yellow">
                      <Award className="w-8 h-8 text-yellow-400" />
                    </div>
                    <span className="text-4xl font-black text-white neon-text-white">{stats.highest}</span>
                  </div>
                  <p className="text-sm text-yellow-300 font-bold uppercase tracking-wider">Eng Yuqori</p>
                </div>

                <div className="neon-stat-card animate-fadeIn" style={{animationDelay: '0.4s'}}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-cyan-600/20 border-2 border-cyan-400 rounded-lg neon-glow-cyan">
                      <CheckCircle className="w-8 h-8 text-cyan-400" />
                    </div>
                    <span className="text-4xl font-black text-white neon-text-white">{stats.passed}</span>
                  </div>
                  <p className="text-sm text-cyan-300 font-bold uppercase tracking-wider">O'tganlar</p>
                </div>

                <div className="neon-stat-card animate-fadeIn" style={{animationDelay: '0.5s'}}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-purple-600/20 border-2 border-purple-400 rounded-lg neon-glow-purple">
                      <Target className="w-8 h-8 text-purple-400" />
                    </div>
                    <span className="text-4xl font-black text-white neon-text-white">{stats.passRate}%</span>
                  </div>
                  <p className="text-sm text-purple-300 font-bold uppercase tracking-wider">O'tish Foizi</p>
                </div>
              </div>
            )}

            {/* Content based on view mode */}
            {viewMode === 'list' && (
              <div className="neon-card p-6 sm:p-8 animate-fadeIn">
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 border border-blue-400 rounded-lg neon-glow-blue">
                    <Eye className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="neon-text-blue">NATIJALAR RO'YXATI</span>
                </h2>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4 neon-glow-blue"></div>
                    <p className="text-blue-400 font-bold">YUKLANMOQDA...</p>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-700">
                      <AlertCircle className="w-10 h-10 text-gray-500" />
                    </div>
                    <p className="text-gray-500 font-bold">NATIJALAR TOPILMADI</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-blue-500/30">
                          <th className="text-left py-4 px-4 font-black text-blue-400 uppercase text-sm">O'quvchi ID</th>
                          <th className="text-left py-4 px-4 font-black text-blue-400 uppercase text-sm">Ball</th>
                          <th className="text-left py-4 px-4 font-black text-blue-400 uppercase text-sm">To'g'ri</th>
                          <th className="text-left py-4 px-4 font-black text-blue-400 uppercase text-sm">Vaqt</th>
                          <th className="text-left py-4 px-4 font-black text-blue-400 uppercase text-sm">Boshlangan</th>
                          <th className="text-left py-4 px-4 font-black text-blue-400 uppercase text-sm">Tugatilgan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((result, index) => (
                          <tr 
                            key={result.id} 
                            className="border-b border-blue-500/10 hover:bg-blue-950/30 transition-all group"
                            style={{animationDelay: `${index * 0.05}s`}}
                          >
                            <td className="py-4 px-4">
                              <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                                {result.student_id}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-black border-2 ${
                                result.score >= 60 
                                  ? 'bg-green-950/50 text-green-400 border-green-500 neon-glow-green-soft'
                                  : 'bg-red-950/50 text-red-400 border-red-500 neon-glow-red-soft'
                              }`}>
                                {result.score}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-cyan-400 font-bold">
                                {result.correct_answers}/{result.total_questions}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2 text-purple-400 font-bold">
                                <Clock className="w-4 h-4" />
                                <span>{Math.round(result.time_spent / 60)} min</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2 text-blue-400 font-bold">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(result.started_at).toLocaleDateString('uz-UZ')}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2 text-blue-400 font-bold">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(result.completed_at).toLocaleDateString('uz-UZ')}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {viewMode === 'chart' && scoreDistribution.length > 0 && (
              <div className="neon-card p-6 sm:p-8 animate-fadeIn">
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                  <div className="p-2 bg-purple-600/20 border border-purple-400 rounded-lg neon-glow-purple">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="neon-text-purple">BALLAR TAQSIMOTI</span>
                </h2>
                
                <div className="bg-black/30 p-6 rounded-xl border border-blue-500/20">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
                      <XAxis dataKey="range" stroke="#60a5fa" style={{ fontWeight: 'bold' }} />
                      <YAxis stroke="#60a5fa" style={{ fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(17, 24, 39, 0.95)', 
                          border: '2px solid rgba(59, 130, 246, 0.5)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: 'bold'
                        }} 
                      />
                      <Legend wrapperStyle={{ color: '#60a5fa', fontWeight: 'bold' }} />
                      <Bar dataKey="count" name="O'quvchilar soni" radius={[8, 8, 0, 0]}>
                        {scoreDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {viewMode === 'analytics' && scoreDistribution.length > 0 && (
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="neon-card p-6 sm:p-8 animate-fadeIn">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-purple-600/20 border border-purple-400 rounded-lg neon-glow-purple">
                      <TrendingUp className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="neon-text-purple">BALLAR TAQSIMOTI</span>
                  </h2>
                  
                  <div className="bg-black/30 p-6 rounded-xl border border-purple-500/20">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={scoreDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ range, count }) => `${range}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {scoreDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(17, 24, 39, 0.95)', 
                            border: '2px solid rgba(147, 51, 234, 0.5)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: 'bold'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="neon-card p-6 sm:p-8 animate-fadeIn" style={{animationDelay: '0.1s'}}>
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-cyan-600/20 border border-cyan-400 rounded-lg neon-glow-cyan">
                      <Award className="w-6 h-6 text-cyan-400" />
                    </div>
                    <span className="neon-text-cyan">TAHLIL</span>
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-r from-blue-950/50 to-blue-900/50 rounded-xl border-2 border-blue-500/50 neon-glow-blue-soft">
                      <p className="text-sm font-black text-blue-400 mb-2 uppercase tracking-wider">O'rtacha Ko'rsatkich</p>
                      <p className="text-4xl font-black text-white neon-text-white mb-1">{stats.average}%</p>
                      <p className="text-sm text-blue-300 font-bold">Test o'rtacha ko'rsatkichi</p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-r from-green-950/50 to-green-900/50 rounded-xl border-2 border-green-500/50 neon-glow-green-soft">
                      <p className="text-sm font-black text-green-400 mb-2 uppercase tracking-wider">O'tish Foizi</p>
                      <p className="text-4xl font-black text-white neon-text-white mb-1">{stats.passRate}%</p>
                      <p className="text-sm text-green-300 font-bold">{stats.passed} ta o'quvchi o'tdi</p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-r from-yellow-950/50 to-yellow-900/50 rounded-xl border-2 border-yellow-500/50 neon-glow-yellow-soft">
                      <p className="text-sm font-black text-yellow-400 mb-2 uppercase tracking-wider">Eng Yuqori Ball</p>
                      <p className="text-4xl font-black text-white neon-text-white mb-1">{stats.highest}%</p>
                      <p className="text-sm text-yellow-300 font-bold">Eng past ball: {stats.lowest}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
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

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }

        .neon-card {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95));
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 1rem;
          box-shadow: 
            0 0 20px rgba(59, 130, 246, 0.2),
            inset 0 0 20px rgba(59, 130, 246, 0.05);
          position: relative;
          overflow: hidden;
        }

        .neon-stat-card {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95));
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 
            0 0 20px rgba(59, 130, 246, 0.2),
            inset 0 0 20px rgba(59, 130, 246, 0.05);
          transition: all 0.3s;
        }

        .neon-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 
            0 0 30px rgba(59, 130, 246, 0.4),
            inset 0 0 30px rgba(59, 130, 246, 0.08);
        }

        .neon-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.5rem;
          color: #fff;
          font-weight: 700;
          outline: none;
          transition: all 0.3s;
        }

        .neon-input:focus {
          border-color: #3b82f6;
          box-shadow: 
            0 0 10px rgba(59, 130, 246, 0.5),
            inset 0 0 10px rgba(59, 130, 246, 0.1);
        }

        .neon-input::placeholder {
          color: rgba(148, 163, 184, 0.5);
        }

        .neon-button-primary {
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border: 2px solid #3b82f6;
          border-radius: 0.5rem;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .neon-button-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
        }

        .neon-button-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .neon-text-blue {
          color: #3b82f6;
          text-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
        }

        .neon-text-purple {
          color: #a78bfa;
          text-shadow: 0 0 10px rgba(167, 139, 250, 0.8);
        }

        .neon-text-cyan {
          color: #06b6d4;
          text-shadow: 0 0 10px rgba(6, 182, 212, 0.8);
        }

        .neon-text-white {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .neon-text-gradient {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .neon-glow-blue {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
        }

        .neon-glow-blue-soft {
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
        }

        .neon-glow-purple {
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);
        }

        .neon-glow-cyan {
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.5);
        }

        .neon-glow-green {
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.5);
        }

        .neon-glow-green-soft {
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
        }

        .neon-glow-yellow {
          box-shadow: 0 0 15px rgba(234, 179, 8, 0.5);
        }

        .neon-glow-yellow-soft {
          box-shadow: 0 0 10px rgba(234, 179, 8, 0.3);
        }

        .neon-glow-red-soft {
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
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
          background: radial-gradient(circle, rgba(59, 130, 246, 0.4), transparent);
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

export default TestResults;