import React, { useState, useRef } from "react";
import "./MathSolver.css";
import ImageCropper from "./ImageCropper";
// Lazy-loaded: microsoft-cognitiveservices-speech-sdk (~30MB)
let SpeechSDK = null;
const loadSpeechSDK = async () => {
  if (!SpeechSDK) {
    SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");
  }
  return SpeechSDK;
};

export default function MathSolver() {
  const [mode, setMode] = useState("input"); // "input", "list", "solving"
  const [inputText, setInputText] = useState("");
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [gradeLevel, setGradeLevel] = useState("1");
  const [loading, setLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Interactive solving state
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState("");
  
  const recognizerRef = useRef(null);
  const textareaRef = useRef(null);
const API_BASE_URL = import.meta.env.VITE_MATH_API_URL 
  ? import.meta.env.VITE_MATH_API_URL
  : (import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/mathkids`
    : "/api/v1/mathkids");

const SPEECH_TOKEN_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/smartkids/speech-token` 
  : "/api/v1/smartkids/speech-token";

  

  const handleTextExtracted = (text) => {
    setInputText(text);
    parseProblems(text);
    setShowUploader(false);
  };

  const parseProblems = (text) => {
    // Masalalarni ajratish: qator boshida raqam + nuqta/qavs + matn
    // Mukammallashtirilgan regex: qator boshi (yoki yangi qator) -> raqam -> nuqta/qavs -> bo'shliq -> matn
    // Lookahead (?=\n\d+[.)]\s|$) yordamida keyingi masala boshlanishigacha bo'lgan qismini olamiz
    const problemRegex = /(?:^|\n)(\d+)[.)]\s+([\s\S]+?)(?=\n\d+[.)]\s|$)/g;
    const matches = [...text.matchAll(problemRegex)];
    
    if (matches.length > 0) {
      let parsed = matches.map(match => ({
        num: match[1],
        text: match[2].trim()
      }));
      // Cheklov: bir vaqtda faqat 10 ta masala ko'rsatiladi
      if (parsed.length > 10) {
        parsed = parsed.slice(0, 10);
        window.appAlert("Eslatma: Masalalar 10 ta bilan cheklangan, qolganlari ko'rsatilmaydi.");
      }
      setProblems(parsed);
      if (parsed.length === 1) {
        // Agar faqat bitta masala bo'lsa — bevosita yechishga o'tamiz
        setSelectedProblem(parsed[0]);
        startSolving(parsed[0].text);
      } else {
        // Bir nechta masala — ro'yxat ko'rsatiladi va foydalanuvchi tanlaydi
        setMode("list");
      }
    } else {
      // Agar pattern topilmasa, butun textni bitta masala sifatida qabul qilish
      const single = { num: "1", text: text.trim() };
      setProblems([single]);
      // Agar bo'sh emas — avtomatik yechishni boshlaymiz
      if (single.text) {
        setSelectedProblem(single);
        startSolving(single.text);
      } else {
        setMode("list");
      }
    }
  };

  const handleManualInput = () => {
    if (!inputText.trim()) {
      window.appAlert('Iltimos, masalalarni kiriting!');
      return;
    }
    parseProblems(inputText);
    setShowUploader(false);
    setIsEditing(false);
  };

  const selectProblem = (prob) => {
    setSelectedProblem(prob);
    startSolving(prob.text);
  };

  const startSolving = async (problemText) => {
    if (!problemText.trim()) {
        window.appAlert('Iltimos, masalani kiriting!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem: problemText,
          grade_level: gradeLevel,
        }),
      });

      if (!response.ok) {
        throw new Error('API so\'rovi muvaffaqiyatsiz bo\'ldi');
      }

      const data = await response.json();
      console.log('API response:', data);
      
      if (data.solution && data.solution.steps && data.solution.steps.length > 0) {
        setSteps(data.solution.steps);
        setFinalAnswer(data.solution.final_answer || "");
        setCurrentStep(0);
        setMode("solving");
        setFeedback("");
      } else {
          window.appAlert('Yechim topilmadi. Iltimos, masalani tekshiring.');
      }
    } catch (error) {
      console.error('Xatolik yuz berdi:', error);
        window.appAlert('Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = () => {
    if (!userAnswer.trim()) {
      setFeedback("⚠️ Iltimos, javobingizni kiriting!");
      return;
    }

    const step = steps[currentStep];
    const expected = step.expected_answer?.toString().trim().toLowerCase();
    const user = userAnswer.trim().toLowerCase();

    if (expected && (user === expected || user.includes(expected) || expected.includes(user))) {
      setFeedback("✅ To'g'ri!");
      
      setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
          setUserAnswer("");
          setFeedback("");
        } else {
          setFeedback(`🎉 Ajoyib! ${finalAnswer}`);
        }
      }, 1500);
    } else {
      setFeedback("❌ Qaytadan urinib ko'ring. Maslahat: " + (step.example || ""));
    }
  };

  const startVoiceRecognition = async () => {
    try {
      const sdk = await loadSpeechSDK();
      const tokenRes = await fetch(SPEECH_TOKEN_URL);
      if (!tokenRes.ok) throw new Error("Token olishda xatolik");

      const { token, region } = await tokenRes.json();
      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "uz-UZ";

      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      setIsRecording(true);

      recognizer.recognizeOnceAsync(
        (result) => {
          setIsRecording(false);
          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            setUserAnswer(result.text);
          }
          recognizer.close();
        },
        (err) => {
          console.error("Ovoz tanish xatosi:", err);
          setIsRecording(false);
          recognizer.close();
        }
      );
    } catch (err) {
      console.error("Mikrofon xatosi:", err);
        window.appAlert("Mikrofonni ishlatishda xatolik!");
      setIsRecording(false);
    }
  };

  const resetSolver = () => {
    setMode("input");
    setSteps([]);
    setCurrentStep(0);
    setUserAnswer("");
    setFeedback("");
    setInputText("");
    setProblems([]);
    setSelectedProblem(null);
    setFinalAnswer("");
  };

  const goToPrev = () => {
    const ns = Math.max(0, currentStep - 1);
    if (ns !== currentStep) {
      setCurrentStep(ns);
      setUserAnswer("");
      setFeedback("");
    }
  };

  const goToNext = () => {
    const ns = Math.min(steps.length - 1, currentStep + 1);
    if (ns !== currentStep) {
      setCurrentStep(ns);
      setUserAnswer("");
      setFeedback("");
    }
  };

  // Unified layout: persistent problem list (sidebar on desktop, top row on mobile)
  // Main content renders input, list hints or solving UI depending on `mode`.
  const ProblemList = () => (
    // Only render the list if there are problems loaded
    problems.length === 0 ? null : (
      <aside className="problem-list" aria-label="Masalalar ro'yxati">
        <div className="problem-list-inner">
          <h4 className="list-title">Masalalar</h4>
          {problems.map((prob, idx) => (
            <div
              key={idx}
              className={`problem-list-item ${selectedProblem?.num === prob.num ? 'active' : ''}`}
              onClick={() => selectProblem(prob)}
            >
              <div className="pl-number">{prob.num}</div>
              <div className="pl-text">{prob.text.length > 120 ? prob.text.slice(0, 120) + '…' : prob.text}</div>
            </div>
          ))}
        </div>
      </aside>
    ));

  // Solving/main content
  if (mode === "solving") {
    const step = steps[currentStep];
    if (!step) {
      return (
        <div className="math-solver-container">
          <div className={`math-layout ${problems.length === 0 ? 'no-list' : ''}`}>
            {ProblemList()}
            <main className="math-main">
              <div className="math-solver-card">
                <h2>🧮 Masala yechilmoqda…</h2>
                <p>Yechim yuklanmoqda, biroz kuting...</p>
              </div>
            </main>
          </div>
        </div>
      );
    }
    const isLastStep = currentStep === steps.length - 1;
    const isComplete = feedback.includes("🎉");
    return (
      <div className="math-solver-container">
        <div className={`math-layout ${problems.length === 0 ? 'no-list' : ''}`}>
          {ProblemList()}
          <main className="math-main">
            <div className="math-solver-card">
              <h2>🧮 Masalani yechamiz</h2>

              <div className="problem-display">
                <strong>📝 Masala {selectedProblem?.num}:</strong>
                <p>{selectedProblem?.text}</p>
              </div>

              <div className="progress-bar">
                <div className="progress-info">
                  Qadam {currentStep + 1} / {steps.length}
                </div>
                <div className="progress-track">
                  <div 
                    className="progress-fill" 
                    style={{width: `${((currentStep + 1) / steps.length) * 100}%`}}
                  />
                </div>
              </div>

              <div className="step-nav" style={{display:'flex',gap:8,justifyContent:'center',marginTop:8}}>
                <button className="nav-button" onClick={goToPrev} disabled={currentStep === 0}>◀ Avvalgi</button>
                <button className="nav-button" onClick={goToNext} disabled={currentStep === steps.length - 1}>Keyingi ▶</button>
              </div>

              <div className="step-display">
                <div className="step-header">
                  <span className="step-badge"> {step.step_number}</span>
                  <h3>{step.title}</h3>
                </div>
                <p className="step-explanation">{step.explanation}</p>
                {step.example && (
                  <div className="step-example">
                    <span className="example-label">💡 Misol:</span>
                    <span>{step.example}</span>
                  </div>
                )}
              </div>

              {!isComplete && (
                <div className="answer-input-section">
                  <label>Sizning javobingiz:</label>
                  <div className="input-with-mic">
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
                      placeholder="Javobingizni kiriting..."
                      disabled={loading}
                    />
                    <button
                      className={`mic-btn ${isRecording ? 'recording' : ''}`}
                      onClick={startVoiceRecognition}
                      disabled={loading || isRecording}
                      title="Ovoz bilan javob berish"
                    >
                      {isRecording ? '🔴' : '🎤'}
                    </button>
                  </div>
                  <button 
                    className="check-button" 
                    onClick={checkAnswer}
                    disabled={loading}
                  >
                    Tekshirish
                  </button>
                </div>
              )}

              {feedback && (
                <div className={`feedback ${feedback.includes('✅') ? 'success' : feedback.includes('🎉') ? 'complete' : 'warning'}`}>
                  {feedback}
                </div>
              )}

              <button className="reset-button" onClick={resetSolver}>
                🔄 Yangi masala
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Default view (input / list) inside unified layout
  return (
    <div className="math-solver-container">
      <div className={`math-layout ${problems.length === 0 ? 'no-list' : ''}`}>
        {ProblemList()}
        <main className="math-main">
          
            <h2 className="text-2xl sm:text-4xl font-bold text-center mb-8 text-blue-600 leading-tight">🧮 AI bilan masala yechish</h2>

            {showUploader ? (
              <ImageCropper onTextExtracted={handleTextExtracted} />
            ) : (
              <div style={{marginTop:5, display:'flex', gap:8, justifyContent:'center', alignItems:'center'}}>
                <button
                  className="custom-problem-btn"
                  onClick={() => {
                    setShowUploader(true);
                    setIsEditing(false);
                    // keep existing inputText so user can re-upload or clear
                  }}
                >
                  ➕ Yangi masala yuklash
                </button>
                <button
                  className="edit-button"
                  onClick={() => {
                    setIsEditing(true);
                    setTimeout(() => {
                      if (textareaRef && textareaRef.current) {
                        textareaRef.current.focus();
                        try { textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}
                      }
                    }, 50);
                  }}
                  disabled={!inputText || !inputText.trim()}
                >
                  ✏️ Tahrirlash
                </button>
              </div>
            )}

            {isEditing && (
              <>
                <div className="divider">
                  <span>yoki qo'lda kiriting</span>
                </div>

                <div className="problem-input">
                  <label>Masalalar matni:</label>
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Masalalarni kiriting. Masalan:\n4) x = 12, x - y = 3\n5) 2a = 16, a - 3b = 5\n...`}
                    rows="10"
                  />
                </div>

                <button 
                  className="solve-button" 
                  onClick={handleManualInput} 
                  disabled={loading || !inputText.trim()}
                >
                  {loading ? '⏳ Yuklanmoqda...' : '📋 Masalalarni ajratish'}
                </button>
              </>
            )}
          
        </main>
      </div>
    </div>
  );
}
