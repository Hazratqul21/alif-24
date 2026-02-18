import React, { useState } from 'react';
import apiService from '../../../services/apiService';
import { Upload, FileText, Image, Loader2, Sparkles, CheckCircle2, XCircle, Info, Zap } from 'lucide-react';

const TestParser = ({ onTestsParsed }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTextParse = async () => {
    if (!text.trim()) {
      showNotification('error', 'Iltimos, matn kiriting!');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/testai/parse/text', {
        text: text
      });
      const tests = response.data?.tests || response.tests || [];
      onTestsParsed(tests);
      showNotification('success', `${tests.length} ta test muvaffaqiyatli yaratildi!`);
    } catch (error) {
      console.error('Parsing error:', error);
      showNotification('error', 'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiService.post('/testai/parse/file', formData);
      const tests = response.data?.tests || response.tests || [];
      onTestsParsed(tests);
      setText(tests.map(t =>
        `${t.question}\n${t.options.map((opt, idx) =>
          `${String.fromCharCode(65 + idx)}) ${opt}`
        ).join('\n')}`
      ).join('\n\n'));
      showNotification('success', `Fayl muvaffaqiyatli yuklandi! ${tests.length} ta test topildi.`);
    } catch (error) {
      console.error('File upload error:', error);
      showNotification('error', 'Faylni yuklashda xatolik. Format to\'g\'riligini tekshiring.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
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
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 flex-shrink-0 text-rose-400" />
              )}
              <p className="font-bold text-white">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12 animate-neonFadeIn">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-cyan-500/20 border-2 border-cyan-400 rounded-full text-sm font-black mb-6 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] transition-all duration-300">
            <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-400 uppercase tracking-wider">AI-Powered Generator</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 relative inline-block animate-neonGlow">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]">
              TEST TUZISH
            </span>
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500 opacity-20 blur-2xl -z-10"></div>
          </h1>

          <p className="text-lg sm:text-xl text-cyan-300 max-w-2xl mx-auto leading-relaxed font-semibold">
            Matndan yoki fayldan avtomatik ravishda professional testlar yarating
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column - File Upload */}
          <div className="space-y-6 animate-neonSlideLeft">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>

              <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-cyan-400/50 p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.3)] hover:shadow-[0_0_80px_rgba(6,182,212,0.5)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-wide">Fayl Yuklash</h2>
                </div>

                <div
                  className={`relative border-3 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 group/drop cursor-pointer ${dragActive
                    ? 'border-pink-400 bg-pink-500/10 shadow-[inset_0_0_50px_rgba(236,72,153,0.3)]'
                    : 'border-cyan-400/50 hover:border-pink-400 hover:bg-cyan-500/5'
                    }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-pink-500/10 rounded-2xl transition-opacity duration-300 ${dragActive ? 'opacity-100' : 'opacity-0 group-hover/drop:opacity-50'
                    }`}></div>

                  <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full mb-6 border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)] group-hover/drop:scale-110 group-hover/drop:shadow-[0_0_50px_rgba(6,182,212,0.6)] transition-all duration-300">
                      <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400" />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-cyan-300 mb-3 uppercase">
                      Faylni Tashlang
                    </h3>

                    <p className="text-cyan-400/70 mb-6 text-sm sm:text-base font-bold">━━━ YOKI ━━━</p>

                    <label className="inline-block cursor-pointer group/btn">
                      <div className="relative px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-black text-lg shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:shadow-[0_0_50px_rgba(236,72,153,0.8)] transition-all duration-300 hover:scale-105 border-2 border-pink-400">
                        <span className="relative z-10">FAYL TANLASH</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-700 to-purple-700 opacity-0 group-hover/btn:opacity-100 rounded-xl transition-opacity duration-300"></div>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".txt,.pdf,.docx,.doc,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          if (e.target.files[0]) handleFileUpload(e.target.files[0]);
                        }}
                        disabled={loading}
                      />
                    </label>

                    <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
                      {['.txt', '.pdf', '.docx', '.jpg', '.png'].map((ext) => (
                        <span key={ext} className="px-3 py-1.5 bg-black/60 text-cyan-400 rounded-full font-bold border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                          {ext}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* File Upload Features */}
                <div className="mt-6 grid sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-emerald-500/10 rounded-xl border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)] transition-all duration-300">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-2" />
                    <p className="text-sm font-bold text-emerald-400">TEZ YUKLASH</p>
                  </div>
                  <div className="p-4 bg-cyan-500/10 rounded-xl border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-300">
                    <Sparkles className="w-6 h-6 text-cyan-400 mb-2" />
                    <p className="text-sm font-bold text-cyan-400">AI PARSING</p>
                  </div>
                  <div className="p-4 bg-purple-500/10 rounded-xl border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all duration-300">
                    <FileText className="w-6 h-6 text-purple-400 mb-2" />
                    <p className="text-sm font-bold text-purple-400">MULTI-FORMAT</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Text Input */}
          <div className="space-y-6 animate-neonSlideRight">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>

              <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-purple-400/50 p-6 sm:p-8 shadow-[0_0_50px_rgba(168,85,247,0.3)] hover:shadow-[0_0_80px_rgba(168,85,247,0.5)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.6)]">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-purple-400 uppercase tracking-wide">Matn Kiritish</h2>
                </div>

                <div className="relative group/textarea">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover/textarea:opacity-50 transition-opacity duration-300 blur"></div>
                  <textarea
                    className="relative w-full h-72 sm:h-96 p-5 bg-black/60 border-2 border-purple-400/50 rounded-2xl resize-none focus:outline-none focus:border-pink-400 focus:shadow-[0_0_30px_rgba(236,72,153,0.5)] font-mono text-sm transition-all duration-300 text-cyan-300 placeholder:text-cyan-600"
                    placeholder={`Test formatida yozing:

1. O'zbekiston poytaxti qayerda?
A) Toshkent
B) Samarqand
C) Buxoro
D) Xiva

2. Yer sayyorasi Quyosh atrofida necha oy aylanadi?
A) 12 oy
B) 6 oy  
C) 1 oy
D) 365 oy

Javob: A (ixtiyoriy)`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Character Counter */}
                <div className="mt-3 flex justify-between items-center text-sm">
                  <span className={`font-black ${text.length > 0 ? 'text-pink-400' : 'text-cyan-400/50'}`}>
                    {text.length} BELGI
                  </span>
                  <span className="text-cyan-400/70 font-bold">
                    {text.split('\n').filter(line => line.trim()).length} QATOR
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 animate-neonFadeIn">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>

            <div className="relative bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-cyan-400/50 p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleTextParse}
                  disabled={loading || !text.trim()}
                  className="flex-1 relative group/btn overflow-hidden bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 text-white py-4 sm:py-5 px-8 rounded-xl font-black text-base sm:text-lg shadow-[0_0_40px_rgba(236,72,153,0.5)] hover:shadow-[0_0_70px_rgba(236,72,153,0.8)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105 border-2 border-pink-400"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-700 via-purple-700 to-cyan-700 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>QAYTA ISHLANMOQDA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        <span>TESTLARNI YARATISH</span>
                      </>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => {
                    setText('');
                    showNotification('success', 'Matn tozalandi');
                  }}
                  disabled={loading}
                  className="sm:w-auto px-8 py-4 sm:py-5 border-2 border-cyan-400 text-cyan-400 rounded-xl font-black hover:bg-cyan-500/10 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  TOZALASH
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Format Guide */}
        <div className="mt-8 animate-neonFadeIn">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

            <div className="relative bg-black/80 backdrop-blur-xl border-2 border-yellow-400/50 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-500/20 border-2 border-yellow-400 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)] flex-shrink-0">
                  <Info className="w-6 h-6 text-yellow-400" />
                </div>

                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-black text-yellow-400 mb-4 uppercase tracking-wide">
                    Format Qoidalari
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-xl border border-yellow-400/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0 shadow-[0_0_10px_rgba(234,179,8,0.6)]"></div>
                      <p className="text-sm sm:text-base text-yellow-300 font-bold">
                        SAVOL: Raqam bilan boshlang (1. yoki 1))
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-xl border border-yellow-400/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0 shadow-[0_0_10px_rgba(234,179,8,0.6)]"></div>
                      <p className="text-sm sm:text-base text-yellow-300 font-bold">
                        VARIANTLAR: A), B), C), D) harflari bilan
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-xl border border-yellow-400/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0 shadow-[0_0_10px_rgba(234,179,8,0.6)]"></div>
                      <p className="text-sm sm:text-base text-yellow-300 font-bold">
                        BO'SH QATOR: Har bir savol orasida
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-xl border border-yellow-400/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0 shadow-[0_0_10px_rgba(234,179,8,0.6)]"></div>
                      <p className="text-sm sm:text-base text-yellow-300 font-bold">
                        TO'G'RI JAVOB: "Javob: A" yoki "Correct: B"
                      </p>
                    </div>
                  </div>

                  {/* Example Section */}
                  <div className="mt-6 p-4 bg-black/60 rounded-xl border border-yellow-400/50 shadow-[inset_0_0_20px_rgba(234,179,8,0.1)]">
                    <p className="text-sm font-black text-yellow-400 mb-2 uppercase">Namuna:</p>
                    <pre className="text-xs sm:text-sm text-yellow-300 font-mono overflow-x-auto">
                      {`1. Test savoli?
A) Birinchi javob
B) Ikkinchi javob
C) Uchinchi javob
D) To'rtinchi javob
Javob: A`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        {text.trim() && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 animate-neonFadeIn">
            {[
              { value: text.split(/\d+\./).length - 1, label: 'SAVOLLAR', color: 'cyan' },
              { value: text.length, label: 'BELGILAR', color: 'pink' },
              { value: text.split('\n').filter(line => line.trim()).length, label: 'QATORLAR', color: 'purple' },
              { value: text.split(/[A-D]\)/).length - 1, label: 'VARIANTLAR', color: 'yellow' }
            ].map((stat, index) => (
              <div key={index} className={`relative group/stat bg-black/80 backdrop-blur-xl rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.2)] p-4 text-center border-2 border-${stat.color}-400/50 hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] transition-all duration-300`}>
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-${stat.color}-500 to-${stat.color}-600 rounded-xl opacity-0 group-hover/stat:opacity-30 transition-opacity duration-300 blur`}></div>
                <p className={`relative text-3xl font-black text-${stat.color}-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]`}>
                  {stat.value}
                </p>
                <p className={`relative text-sm text-${stat.color}-300 mt-1 font-black tracking-wider`}>{stat.label}</p>
              </div>
            ))}
          </div>
        )}
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

        @keyframes neonGlow {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(6, 182, 212, 0.8));
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(236, 72, 153, 0.8));
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

        .animate-neonGlow {
          animation: neonGlow 3s ease-in-out infinite;
        }

        .border-3 {
          border-width: 3px;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #06b6d4, #ec4899);
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }

        ::-webkit-scrollbar-thumb:hover {
          box-shadow: 0 0 20px rgba(236, 72, 153, 0.8);
        }
      `}</style>
    </div>
  );
};

export default TestParser;