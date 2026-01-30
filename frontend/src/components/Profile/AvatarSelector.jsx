import { useState, useEffect } from 'react';
import { avatarService } from '../../services';
import { useLanguage } from '../../context/LanguageContext';
import './AvatarSelector.css';
import translations from '../../language/translations';

/**
 * Avatar Selector Component
 * Displays 10 character avatars for child to select
 */
const AvatarSelector = ({ onSelect, selectedAvatarId }) => {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { language } = useLanguage();
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'uz';
  const t = (key) => (translations[lang] && translations[lang][key]) || translations.uz[key] || key;

  useEffect(() => {
    loadAvatars();
  }, [language]);

  const loadAvatars = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await avatarService.getAll(language);
      setAvatars(data);
    } catch (err) {
      setError(err.message || 'Failed to load avatars');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="avatar-selector-loading">
        <div className="spinner"></div>
        <p>{t('profile_loadingAvatars')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="avatar-selector-error">
        <p>{error}</p>
        <button onClick={loadAvatars}>{t('common_retry')}</button>
      </div>
    );
  }

  return (
    <div className="avatar-selector">
      <div className="avatar-selector-header">
        <h2>🎭 {t('profile_pickFriend')}</h2>
        <p>{t('profile_whichLike')}</p>
      </div>
      <div className="avatar-grid">
        {avatars.map((avatar) => (
          <div
            key={avatar.id}
            className={`avatar-card ${selectedAvatarId === avatar.id ? 'selected' : ''}`}
            onClick={() => onSelect(avatar)}
          >
            <div className="avatar-image-wrapper">
              <img 
                src={avatar.imageUrl} 
                alt={avatar.name}
                className="avatar-image"
                onError={(e) => {
                  e.target.src = '/avatars/default.svg';
                }}
              />
              {selectedAvatarId === avatar.id && (
                <div className="avatar-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>
            <p className="avatar-name">{avatar.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvatarSelector;
