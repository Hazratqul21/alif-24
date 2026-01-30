import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../Common';
import './ProfileTypeSelector.css';
import translations from '../../language/translations';

/**
 * ProfileTypeSelector Component
 * Allows user to select profile type: young child, student, parent, teacher
 */
const ProfileTypeSelector = ({ onSelect, selectedType }) => {
  const { t: tCtx } = useLanguage();
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'uz';
  const t = (key) => (translations[lang] && translations[lang][key]) || translations.uz[key] || key;

  const profileTypes = [
    {
      type: 'child_young',
      titleKey: 'profile_type_child_young',
      descKey: 'profile_type_child_young_desc',
      icon: '🧒',
      color: '#4CAF50'
    },
    {
      type: 'child_student',
      titleKey: 'profile_type_child_student',
      descKey: 'profile_type_child_student_desc',
      icon: '🎓',
      color: '#2196F3'
    },
    {
      type: 'parent',
      titleKey: 'profile_type_parent',
      descKey: 'profile_type_parent_desc',
      icon: '👨‍👩‍👧',
      color: '#FF9800'
    },
    {
      type: 'teacher',
      titleKey: 'profile_type_teacher',
      descKey: 'profile_type_teacher_desc',
      icon: '👨‍🏫',
      color: '#9C27B0'
    }
  ];

  return (
    <div className="profile-type-selector">
      <h2 className="selector-title">{t('profile_whoAreYou')}</h2>
      
      <div className="profile-types-grid">
        {profileTypes.map(type => (
          <div
            key={type.type}
            className={`profile-type-card ${selectedType === type.type ? 'selected' : ''}`}
            onClick={() => onSelect(type.type)}
            style={{
              '--type-color': type.color,
              borderColor: selectedType === type.type ? type.color : '#e0e0e0'
            }}
          >
            <div className="type-icon" style={{ backgroundColor: type.color }}>
              {type.icon}
            </div>
            <h3 className="type-title">{t(type.titleKey)}</h3>
            <p className="type-desc">{t(type.descKey)}</p>
            {selectedType === type.type && (
              <div className="check-mark">✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileTypeSelector;
