import React, { useState } from 'react';
import { Save, Download, Edit, Trash2, CheckCircle, XCircle, Award, Target, Zap } from 'lucide-react';
import apiService from '../../../services/apiService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const TestDisplay = ({ tests, onSave }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedTest, setEditedTest] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const handleSaveTest = async () => {
    const testData = {
      title: `Test ${new Date().toLocaleDateString()}`,
      description: 'Avtomatik generatsiya qilingan test',
      questions: tests
    };

    try {
      const response = await apiService.post('/testai/save', testData);
      onSave(response.data?.test_id || response.test_id || response.id);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('test-content');
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('test.pdf');
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditedTest({ ...tests[index] });
  };

  const handleSaveEdit = () => {
    const updatedTests = [...tests];
    updatedTests[editingIndex] = editedTest;
    onSave(updatedTests);
    setEditingIndex(null);
    setEditedTest(null);
  };

  const calculateScore = () => {
    let correct = 0;
    tests.forEach((test, index) => {
      if (test.correct_answer && userAnswers[index] === test.correct_answer) {
        correct++;
      }
    });
    return { correct, total: tests.length };
  };

  const score = calculateScore();
  const percentage = tests.length > 0 ? (score.correct / score.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* Animated Neon Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <div id="test-content" className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Test Header */}
        <div className="relative group animate-neonFadeIn">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          
          <div className="relative bg-black/80 backdrop-blur-xl p-6 rounded-2xl border-2 border-cyan-400/50 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-cyan-500/20 border-2 border-cyan-400 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                    <Target className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 uppercase tracking-wide">
                    Yaratilgan Testlar
                  </h2>
                </div>
                <p className="text-cyan-300/70 font-semibold ml-14">
                  {tests.length} TA TEST • Tahrirlash va export qilish mumkin
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSaveTest}
                  className="relative group/btn flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3 rounded-xl font-black hover:scale-105 transition-all duration-300 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] hover:shadow-[0_0_40px_rgba(52,211,153,0.8)]"
                >
                  <Save className="w-5 h-5" />
                  <span>SAQLASH</span>
                </button>
                
                <button
                  onClick={handleExportPDF}
                  className="relative group/btn flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-black hover:scale-105 transition-all duration-300 border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_40px_rgba(59,130,246,0.8)]"
                >
                  <Download className="w-5 h-5" />
                  <span>PDF EXPORT</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Test Questions */}
        {tests.map((test, index) => {
          const isAnswered = userAnswers[index] !== undefined;
          const isCorrectAnswer = test.correct_answer && userAnswers[index] === test.correct_answer;
          
          return (
            <div 
              key={index} 
              className="relative group animate-neonSlideUp"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              
              <div className="relative bg-black/80 backdrop-blur-xl p-6 rounded-2xl border-2 border-purple-400/50 shadow-[0_0_50px_rgba(168,85,247,0.3)] hover:shadow-[0_0_80px_rgba(168,85,247,0.5)] transition-all duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-lg border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                        {index + 1}
                      </div>
                    </div>
                    
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editedTest.question}
                        onChange={(e) => setEditedTest({
                          ...editedTest,
                          question: e.target.value
                        })}
                        className="flex-1 text-lg font-bold bg-black/60 border-2 border-pink-400 rounded-lg px-4 py-2 text-pink-300 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all"
                      />
                    ) : (
                      <h3 className="text-lg sm:text-xl font-bold text-cyan-300 leading-relaxed">
                        {test.question}
                      </h3>
                    )}
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    {editingIndex === index ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)] hover:shadow-[0_0_25px_rgba(52,211,153,0.6)] transition-all duration-300"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="p-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg border-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:shadow-[0_0_25px_rgba(244,63,94,0.6)] transition-all duration-300"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(index)}
                          className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all duration-300"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            const newTests = tests.filter((_, i) => i !== index);
                            onSave(newTests);
                          }}
                          className="p-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg border-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:shadow-[0_0_25px_rgba(244,63,94,0.6)] transition-all duration-300"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3 ml-0 sm:ml-14">
                  {test.options.map((option, optIndex) => {
                    const letter = String.fromCharCode(65 + optIndex);
                    const isCorrect = test.correct_answer === letter;
                    const isSelected = userAnswers[index] === letter;
                    
                    return (
                      <label
                        key={optIndex}
                        className={`relative group/option flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                          isSelected
                            ? isCorrect
                              ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)]'
                              : 'bg-rose-500/20 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.5)]'
                            : 'bg-purple-500/10 border-purple-400/50 hover:bg-purple-500/20 hover:border-pink-400 hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]'
                        } ${showResults && isCorrect ? 'ring-2 ring-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.6)]' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={letter}
                          checked={isSelected}
                          onChange={(e) => {
                            setUserAnswers({
                              ...userAnswers,
                              [index]: e.target.value
                            });
                          }}
                          className="hidden"
                        />
                        
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full mr-3 sm:mr-4 font-black text-lg border-2 shadow-lg transition-all duration-300 ${
                          isSelected
                            ? isCorrect
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]'
                              : 'bg-rose-500 text-white border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
                            : 'bg-purple-500/20 text-purple-300 border-purple-400 group-hover/option:bg-pink-500/30 group-hover/option:border-pink-400'
                        }`}>
                          {letter}
                        </div>
                        
                        {editingIndex === index ? (
                          <input
                            type="text"
                            value={editedTest.options[optIndex]}
                            onChange={(e) => {
                              const newOptions = [...editedTest.options];
                              newOptions[optIndex] = e.target.value;
                              setEditedTest({ ...editedTest, options: newOptions });
                            }}
                            className="flex-1 bg-black/60 border-2 border-purple-400 rounded-lg px-3 py-2 text-purple-300 focus:outline-none focus:border-pink-400 focus:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                          />
                        ) : (
                          <span className="flex-1 text-cyan-300 font-semibold">{option}</span>
                        )}
                        
                        {showResults && isCorrect && (
                          <CheckCircle className="w-6 h-6 text-emerald-400 ml-2 animate-pulse" />
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Explanation */}
                {test.explanation && (
                  <div className="mt-4 ml-0 sm:ml-14 p-4 bg-blue-500/10 rounded-xl border-2 border-blue-400/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]">
                    <div className="flex items-start gap-2">
                      <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black text-blue-400 uppercase text-sm">Izoh:</span>
                        <p className="text-blue-300 mt-1">{test.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Answer Status Badge */}
                {isAnswered && (
                  <div className={`mt-4 ml-0 sm:ml-14 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-black text-sm ${
                    isCorrectAnswer 
                      ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                      : 'bg-rose-500/20 text-rose-400 border-2 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                  }`}>
                    {isCorrectAnswer ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>TO'G'RI JAVOB!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        <span>NOTO'G'RI JAVOB</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Results Section */}
        {tests.length > 0 && (
          <div className="relative group animate-neonFadeIn">
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            
            <div className="relative bg-black/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border-2 border-yellow-400/50 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-yellow-500/20 border-2 border-yellow-400 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                      <Award className="w-7 h-7 text-yellow-400" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 uppercase tracking-wide">
                      Test Natijalari
                    </h3>
                  </div>
                  
                  {showResults && (
                    <div className="space-y-3 ml-0 sm:ml-16">
                      <div className="flex items-center gap-4 text-lg sm:text-xl font-bold">
                        <span className="text-yellow-300">Natija:</span>
                        <span className="text-cyan-400">{score.correct}</span>
                        <span className="text-yellow-400/50">/</span>
                        <span className="text-pink-400">{score.total}</span>
                      </div>
                      
                      <div className="relative h-4 bg-black/60 rounded-full border-2 border-yellow-400/50 overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.8)] transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      
                      <p className="text-yellow-400 font-black text-xl">
                        {percentage.toFixed(0)}% TO'G'RI
                      </p>

                      {/* Score Badge */}
                      <div className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black text-lg border-2 ${
                        percentage >= 80 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.5)]'
                          : percentage >= 60
                          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)]'
                          : 'bg-orange-500/20 text-orange-400 border-orange-400 shadow-[0_0_25px_rgba(251,146,60,0.5)]'
                      }`}>
                        {percentage >= 80 ? '🌟 A\'LO!' : percentage >= 60 ? '👍 YAXSHI!' : '💪 HARAKAT QILING!'}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowResults(!showResults)}
                    className="relative group/btn flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-black hover:scale-105 transition-all duration-300 border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_40px_rgba(168,85,247,0.8)]"
                  >
                    <Award className="w-5 h-5" />
                    <span>{showResults ? 'YASHIRISH' : 'KO\'RISH'}</span>
                  </button>
                  
                  <button
                    onClick={() => setUserAnswers({})}
                    className="px-6 py-3 border-2 border-cyan-400 text-cyan-400 rounded-xl font-black hover:bg-cyan-500/10 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-300"
                  >
                    TOZALASH
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
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

        @keyframes neonSlideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-neonFadeIn {
          animation: neonFadeIn 0.8s ease-out;
        }

        .animate-neonSlideUp {
          animation: neonSlideUp 0.6s ease-out forwards;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
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

export default TestDisplay;