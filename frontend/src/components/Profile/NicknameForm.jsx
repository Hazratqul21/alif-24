import { useState, useEffect, useCallback } from 'react';
import { profileService } from '../../services';
import { Button } from '../Common';
import './NicknameForm.css';
import translations from '../../language/translations';

/**
 * Nickname Form Component
 * Allows child to choose a unique nickname with real-time validation
 */
const NicknameForm = ({ avatar, onSubmit, loading: parentLoading }) => {
  const [nickname, setNickname] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'uz';
  const t = (key) => (translations[lang] && translations[lang][key]) || translations.uz[key] || key;

  // Debounce timer
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Load suggestions when avatar changes
  useEffect(() => {
    if (avatar?.key) {
      loadSuggestions();
      setShowSuggestions(true);
    }
  }, [avatar]);

  const loadSuggestions = async () => {
    try {
      const data = await profileService.getSuggestions(avatar.key);
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  };

  const checkNickname = useCallback(async (value) => {
    if (!value || value.length < 3) {
      setAvailable(null);
      setError('');
      return;
    }

    try {
      setChecking(true);
      setError('');
      const result = await profileService.checkNickname(value);
      setAvailable(result.available);
      
      if (!result.available) {
        setShowSuggestions(true);
      }
    } catch (err) {
      setError(err.message || t('profile_failedCheckNickname'));
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  }, []);

  const handleNicknameChange = (value) => {
    setNickname(value);
    setAvailable(null);
    setError('');
    setShowSuggestions(false);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      checkNickname(value);
    }, 500);
    
    setDebounceTimer(timer);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    if (!nickname) {
      setError(t('profile_chooseName'));
      return;
    }

    onSubmit({ nickname, avatarId: avatar.id });
  };

  const selectSuggestion = (suggested) => {
    setNickname(suggested);
    setShowSuggestions(false);
    setAvailable(true);
    setError('');
  };

  return (
    <div className="nickname-form">
      <div className="nickname-form-header">
        <h2>🎮 {t('profile_pickNickname')}</h2>
        <p className="nickname-subtitle">{t('profile_clickFavoriteName')}</p>
      </div>

      {avatar && (
        <div className="selected-avatar-preview">
          <img src={avatar.imageUrl} alt={avatar.name} />
          <p className="avatar-greeting">{t('profile_hello')} {avatar.name}!</p>
        </div>
      )}

      {error && (
        <div className="nickname-error">
          <p>{error}</p>
        </div>
      )}

      {/* Show suggestions immediately */}
      {suggestions.length > 0 ? (
        <div className="nickname-selection">
          <div className="suggestions-grid">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={`suggestion-card ${nickname === suggestion ? 'selected' : ''}`}
                onClick={() => selectSuggestion(suggestion)}
                disabled={parentLoading}
              >
                <span className="suggestion-text">{suggestion}</span>
                {nickname === suggestion && (
                  <span className="selected-check">✓</span>
                )}
              </button>
            ))}
          </div>

          {nickname && (
            <Button
              onClick={handleSubmit}
              variant="primary"
              size="large"
              fullWidth
              loading={parentLoading}
              disabled={!nickname || parentLoading}
            >
              {t('common_continue')} →
            </Button>
          )}
        </div>
      ) : (
        <div className="loading-suggestions">
          <div className="spinner"></div>
          <p>{t('profile_loadingNames')}</p>
        </div>
      )}
    </div>
  );
};

export default NicknameForm;
