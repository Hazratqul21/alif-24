import React, { useState } from 'react';
import { Upload, Wand2, Edit, Save, Trash2, Plus, Check, X } from 'lucide-react';

const TestCreator = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [tests, setTests] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Word/PDF fayldan test yuklash
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await readFileContent(file);
      const parsedTests = parseTestsFromText(text);
      setTests(parsedTests);
    } catch (error) {
      window.appAlert('Faylni o\'qishda xatolik yuz berdi');
    }
  };

  const readFileContent = async (file) => {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const text = new TextDecoder().decode(uint8Array);
      return text;
    } else {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
  };

  const parseTestsFromText = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const tests = [];
    let currentTest = null;

    lines.forEach(line => {
      const questionMatch = line.match(/^(\d+)\.\s*(.+)/);
      if (questionMatch) {
        if (currentTest) tests.push(currentTest);
        currentTest = {
          id: Date.now() + Math.random(),
          question: questionMatch[2].trim(),
          options: [],
          correctAnswer: null
        };
      } else if (currentTest) {
        const optionMatch = line.match(/^([A-D])\)\s*(.+)/);
        if (optionMatch) {
          currentTest.options.push({
            letter: optionMatch[1],
            text: optionMatch[2].trim()
          });
        }
      }
    });
    if (currentTest) tests.push(currentTest);
    return tests;
  };

  // AI orqali test yaratish
  const generateTestsWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `${aiPrompt}

Iltimos, testlarni quyidagi JSON formatida bering (faqat JSON, boshqa hech narsa emas):
[
  {
    "question": "Savol matni?",
    "options": [
      {"letter": "A", "text": "Variant A"},
      {"letter": "B", "text": "Variant B"},
      {"letter": "C", "text": "Variant C"},
      {"letter": "D", "text": "Variant D"}
    ],
    "correctAnswer": "A"
  }
]`
          }]
        })
      });

      const data = await response.json();
      const aiText = data.content.map(item => item.type === 'text' ? item.text : '').join('');
      const cleanText = aiText.replace(/```json|```/g, '').trim();
      const aiTests = JSON.parse(cleanText);
      
      const formattedTests = aiTests.map(test => ({
        ...test,
        id: Date.now() + Math.random()
      }));
      
      setTests(formattedTests);
    } catch (error) {
      window.appAlert('AI test yaratishda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Qo'lda test qo'shish
  const addManualTest = () => {
    const newTest = {
      id: Date.now(),
      question: '',
      options: [
        { letter: 'A', text: '' },
        { letter: 'B', text: '' },
        { letter: 'C', text: '' },
        { letter: 'D', text: '' }
      ],
      correctAnswer: null
    };
    setTests([...tests, newTest]);
    setEditingIndex(tests.length);
  };

  // Test o'zgartirish
  const updateTest = (index, field, value) => {
    const newTests = [...tests];
    newTests[index][field] = value;
    setTests(newTests);
  };

  const updateOption = (testIndex, optionIndex, value) => {
    const newTests = [...tests];
    newTests[testIndex].options[optionIndex].text = value;
    setTests(newTests);
  };

  // Test o'chirish
  const deleteTest = (index) => {
    setTests(tests.filter((_, i) => i !== index));
  };

  // Testlarni saqlash
  const saveTests = () => {
    const testData = JSON.stringify(tests, null, 2);
    const blob = new Blob([testData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'testlar.json';
    a.click();
    window.appAlert('Testlar saqlandi!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-indigo-900">Test Tuzish Tizimi</h1>

        {/* Tablar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Upload size={20} />
              Fayl yuklash
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'manual'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Edit size={20} />
              Qo'lda kiritish
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'ai'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Wand2 size={20} />
              AI bilan yaratish
            </button>
          </div>

          {/* Fayl yuklash */}
          {activeTab === 'upload' && (
            <div className="text-center">
              <label className="cursor-pointer inline-block">
                <div className="border-4 border-dashed border-indigo-300 rounded-lg p-12 hover:border-indigo-500 transition">
                  <Upload size={48} className="mx-auto mb-4 text-indigo-600" />
                  <p className="text-lg font-semibold text-gray-700">Word yoki PDF faylni yuklang</p>
                  <p className="text-sm text-gray-500 mt-2">Faylni tanlash uchun bosing</p>
                </div>
                <input
                  type="file"
                  accept=".doc,.docx,.pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* AI bilan yaratish */}
          {activeTab === 'ai' && (
            <div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='Masalan: "Menga trigonometriyadan 10 ta, geometriyadan 5 ta test tuzib ber"'
                className="w-full p-4 border-2 border-gray-300 rounded-lg mb-4 h-32 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={generateTestsWithAI}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
              >
                {isGenerating ? 'Yaratilmoqda...' : 'AI bilan test yaratish'}
              </button>
            </div>
          )}

          {/* Qo'lda kiritish */}
          {activeTab === 'manual' && (
            <button
              onClick={addManualTest}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Yangi test qo'shish
            </button>
          )}
        </div>

        {/* Testlar ro'yxati */}
        {tests.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Testlar ({tests.length} ta)</h2>
              <button
                onClick={saveTests}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Save size={20} />
                Saqlash
              </button>
            </div>

            <div className="space-y-6">
              {tests.map((test, index) => (
                <div key={test.id} className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-lg font-bold text-indigo-600">Test {index + 1}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => deleteTest(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {editingIndex === index ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={test.question}
                        onChange={(e) => updateTest(index, 'question', e.target.value)}
                        placeholder="Savol matnini kiriting"
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      />
                      {test.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex gap-2">
                          <span className="font-bold text-gray-700 w-8">{option.letter})</span>
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => updateOption(index, optIndex, e.target.value)}
                            placeholder={`Variant ${option.letter}`}
                            className="flex-1 p-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">To'g'ri javob:</label>
                        <div className="flex gap-2">
                          {test.options.map((option) => (
                            <button
                              key={option.letter}
                              onClick={() => updateTest(index, 'correctAnswer', option.letter)}
                              className={`px-4 py-2 rounded-lg font-semibold transition ${
                                test.correctAnswer === option.letter
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {option.letter}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-lg mb-3">{test.question}</p>
                      <div className="space-y-2">
                        {test.options.map((option) => (
                          <div
                            key={option.letter}
                            className={`flex items-center gap-2 p-2 rounded ${
                              test.correctAnswer === option.letter ? 'bg-green-100' : ''
                            }`}
                          >
                            <span className="font-bold">{option.letter})</span>
                            <span>{option.text}</span>
                            {test.correctAnswer === option.letter && (
                              <Check size={20} className="text-green-600 ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestCreator;