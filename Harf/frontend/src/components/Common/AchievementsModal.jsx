import React from 'react';
import { X, Star } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './AchievementsModal.css';

const AchievementsModal = ({ isOpen, onClose, totalStars, starsBreakdown, getStarsHistory }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const history = getStarsHistory();

  return (
    <>
      <div 
        className="achievements-modal-overlay"
        onClick={onClose}
      />
      <div className="achievements-modal">
        <div className="achievements-modal-header">
          <h2 className="achievements-modal-title">
            🏆 {t('achievements') || 'Yutuqlar'}
          </h2>
          <button 
            className="achievements-close-btn"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <div className="achievements-modal-body">
          {/* Jami yulduzchalar */}
          <div className="total-stars-section">
            <div className="total-stars-icon">
              <Star size={48} fill="#FFD700" color="#FFD700" />
            </div>
            <div className="total-stars-text">
              <div className="total-stars-number">{totalStars}</div>
              <div className="total-stars-label">
                {t('totalStars') || "Jami yulduzchalar"}
              </div>
            </div>
          </div>

          {/* O'yinlar bo'yicha */}
          <div className="games-stars-section">
            <h3 className="section-title">{t('starsByGames') || "O'yinlar bo'yicha"}</h3>
            
            <div className="game-star-card">
              <div className="game-icon">🅰️</div>
              <div className="game-info">
                <div className="game-name">{t('uzbekLetters') || "O'zbek harflari"}</div>
                <div className="game-stars">
                  <Star size={16} fill="#FFD700" color="#FFD700" />
                  <span>{starsBreakdown.harfModal}</span>
                </div>
              </div>
            </div>

            <div className="game-star-card">
              <div className="game-icon">Я</div>
              <div className="game-info">
                <div className="game-name">{t('russianLetters') || "Rus harflari"}</div>
                <div className="game-stars">
                  <Star size={16} fill="#FFD700" color="#FFD700" />
                  <span>{starsBreakdown.harfrModal}</span>
                </div>
              </div>
            </div>

            <div className="game-star-card">
              <div className="game-icon">🔢</div>
              <div className="game-info">
                <div className="game-name">{t('mathGame') || "Matematika o'yini"}</div>
                <div className="game-stars">
                  <Star size={16} fill="#FFD700" color="#FFD700" />
                  <span>{starsBreakdown.mathGame}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Oxirgi yutuqlar tarixi */}
          <div className="stars-history-section">
            <h3 className="section-title">{t('recentAchievements') || "Oxirgi yutuqlar"}</h3>
            
            {history.harfModal.length === 0 && history.harfrModal.length === 0 ? (
              <div className="no-history">
                <p>{t('noAchievements') || "Hali yutuqlar yo'q"}</p>
              </div>
            ) : (
              <div className="history-list">
                {/* O'zbek harflar tarixi */}
                {history.harfModal.slice(-5).reverse().map((item, index) => (
                  <div key={`harf-${index}`} className="history-item">
                    <div className="history-icon">🅰️</div>
                    <div className="history-content">
                      <div className="history-text">
                        <strong>{item.letter}</strong> harfi uchun
                      </div>
                      <div className="history-stars">
                        {[...Array(item.stars)].map((_, i) => (
                          <Star key={i} size={12} fill="#FFD700" color="#FFD700" />
                        ))}
                      </div>
                    </div>
                    <div className="history-time">
                      {new Date(item.timestamp).toLocaleDateString('uz-UZ', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}

                {/* Rus harflar tarixi */}
                {history.harfrModal.slice(-5).reverse().map((item, index) => (
                  <div key={`harfr-${index}`} className="history-item">
                    <div className="history-icon">Я</div>
                    <div className="history-content">
                      <div className="history-text">
                        <strong>{item.letter}</strong> буква учун
                      </div>
                      <div className="history-stars">
                        {[...Array(item.stars)].map((_, i) => (
                          <Star key={i} size={12} fill="#FFD700" color="#FFD700" />
                        ))}
                      </div>
                    </div>
                    <div className="history-time">
                      {new Date(item.timestamp).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AchievementsModal;
