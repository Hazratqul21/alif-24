import React, { useState } from 'react';
import { Button } from '../Common';
import './PasswordInput.css';
import translations from '../../language/translations';

/**
 * PasswordInput Component
 * Password input for student/parent/teacher profiles
 */
const PasswordInput = ({ onSubmit, onBack, profileType }) => {
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'uz';
  const t = (key) => (translations[lang] && translations[lang][key]) || translations.uz[key] || key;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (password.length < 6) {
      setError(t('password_minLengthError'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('password_mismatchError'));
      return;
    }

    onSubmit(password);
  };

  const getTitle = () => t('password_setTitle');

  const getDescription = () => {
    const map = {
      child_student: 'password_desc_student',
      parent: 'password_desc_parent',
      teacher: 'password_desc_teacher',
    };
    return t(map[profileType] || 'password_desc_student');
  };

  return (
    <div className="password-input-container">
      <div className="password-header">
        <h2 className="password-title">{getTitle()}</h2>
        <p className="password-desc">{getDescription()}</p>
      </div>

      <form onSubmit={handleSubmit} className="password-form">
        <div className="form-group">
          <label htmlFor="password">
            {t('password_label')}
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password_placeholder')}
              required
              minLength={6}
              autoFocus
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">
            {t('password_confirmLabel')}
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('password_confirmPlaceholder')}
            required
            minLength={6}
          />
        </div>

        {error && <div className="password-error">{error}</div>}

        <div className="password-actions">
          <Button type="button" variant="secondary" onClick={onBack}>
            {t('common_back')}
          </Button>
          <Button type="submit" variant="primary">
            {t('common_continue')}
          </Button>
        </div>
      </form>

      <div className="password-tips">
        <h4>{t('password_requirementsTitle')}</h4>
        <ul>
          <li className={password.length >= 6 ? 'valid' : ''}>
            {t('password_req_minLength')}
          </li>
          <li className={password === confirmPassword && password ? 'valid' : ''}>
            {t('password_req_match')}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default PasswordInput;
