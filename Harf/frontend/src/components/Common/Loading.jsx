import { useLanguage } from '../../context/LanguageContext';
import './Loading.css';

/**
 * Loading Spinner Component
 * Displays loading state with optional message
 */
const Loading = ({ message, fullScreen = false }) => {
  const { t } = useLanguage();

  const content = (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
      </div>
      <p className="loading-message">{message || t('loading')}</p>
    </div>
  );

  if (fullScreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  return content;
};

export default Loading;
