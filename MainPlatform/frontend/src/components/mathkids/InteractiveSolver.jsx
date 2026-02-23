import React, { useState, useEffect, useRef } from "react";
import "./InteractiveSolver.css";

const API_BASE_URL = import.meta.env.VITE_MATH_API_URL
  ? import.meta.env.VITE_MATH_API_URL
  : (import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/mathkids`
    : "/api/v1/mathkids");

export default function InteractiveSolver({ problem, gradeLevel, onBack }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [conversation, setConversation] = useState([]);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const chatEndRef = useRef(null);

  // Birinchi qadamni boshlash
  useEffect(() => {
    startInteractiveSolving();
  }, []);

  // Chatni pastga scroll qilish
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, aiResponse]);

  const startInteractiveSolving = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/interactive-solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problem,
          grade_level: gradeLevel,
          current_step: 0,
          student_answer: null,
          conversation_history: [],
        }),
      });

      if (!res.ok) throw new Error(`Server xatosi: ${res.status}`);

      const data = await res.json();
      setAiResponse(data);
      setCurrentStep(1);
    } catch (err) {
      console.error("Xato:", err);
      window.appAlert(`Xatolik: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!studentAnswer.trim()) {
      window.appAlert("Iltimos, javobingizni kiriting!");
      return;
    }

    // Talaba javobini saqlab qo'yish
    const newConversation = [
      ...conversation,
      {
        user: studentAnswer,
        assistant: aiResponse
          ? `Qadam ${aiResponse.step_number}: ${aiResponse.question}`
          : "",
      },
    ];
    setConversation(newConversation);

    setLoading(true);
    setShowHint(false);

    try {
      const res = await fetch(`${API_BASE_URL}/interactive-solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problem,
          grade_level: gradeLevel,
          current_step: currentStep,
          student_answer: studentAnswer,
          conversation_history: newConversation,
        }),
      });

      if (!res.ok) throw new Error(`Server xatosi: ${res.status}`);

      const data = await res.json();
      setAiResponse(data);
      setStudentAnswer("");
      setCurrentStep(currentStep + 1);
    } catch (err) {
      console.error("Xato:", err);
      window.appAlert(`Xatolik: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  return (
    <div className="interactive-solver">
      <div className="solver-header">
        <button className="back-btn" onClick={onBack}>
          ← Orqaga
        </button>
        <h2>Interaktiv Yechish</h2>
        <div className="progress-badge">Qadim {currentStep}</div>
      </div>

      <div className="problem-display">
        <h3>Masala:</h3>
        <p>{problem}</p>
      </div>

      <div className="conversation-area">
        {/* Suhbat tarixi */}
        {conversation.map((item, index) => (
          <div key={index} className="conversation-item">
            {item.assistant && (
              <div className="ai-message">
                <div className="message-icon">🤖</div>
                <div className="message-content">{item.assistant}</div>
              </div>
            )}
            {item.user && (
              <div className="student-message">
                <div className="message-content">{item.user}</div>
                <div className="message-icon">You</div>
              </div>
            )}
          </div>
        ))}

        {/* Hozirgi AI savoli */}
        {aiResponse && (
          <div className="current-question">
            <div className="ai-message">
              <div className="message-icon">🤖</div>
              <div className="message-content">
                <strong>Qadim {aiResponse.step_number}:</strong>
                <p>{aiResponse.question}</p>

                {aiResponse.feedback && (
                  <div className="feedback">
                    <strong>Fikr:</strong> {aiResponse.feedback}
                  </div>
                )}

                {aiResponse.is_correct === true && (
                  <div className="correct-badge">To'g'ri!</div>
                )}

                {aiResponse.is_correct === false && (
                  <div className="incorrect-badge">
                    Qaytadan urinib ko'ring
                  </div>
                )}

                {aiResponse.hint && (
                  <div className="hint-section">
                    <button
                      className="hint-btn"
                      onClick={() => setShowHint(!showHint)}
                    >
                      Maslahat {showHint ? "▼" : "▶"}
                    </button>
                    {showHint && (
                      <div className="hint-content">{aiResponse.hint}</div>
                    )}
                  </div>
                )}

                {aiResponse.final_answer && (
                  <div className="final-answer">
                    <h3>Ajoyib! Masalani yechtingiz!</h3>
                    <p>
                      <strong>Javob:</strong> {aiResponse.final_answer}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Javob kiritish maydoni */}
      {aiResponse && !aiResponse.final_answer && (
        <div className="answer-input-section">
          <textarea
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Javobni yozing (masalan: 36)"
            rows="2"
            disabled={loading}
          />
          <button
            className="submit-btn"
            onClick={submitAnswer}
            disabled={loading || !studentAnswer.trim()}
          >
            {loading ? "Yuklanmoqda..." : "Javob yuborish"}
          </button>
        </div>
      )}

      {/* Tugadi */}
      {aiResponse?.final_answer && (
        <div className="completion-actions">
          <button className="btn-primary" onClick={onBack}>
            Bosh sahifaga qaytish
          </button>
        </div>
      )}
    </div>
  );
}
