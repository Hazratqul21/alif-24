import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Common/Navbar';
import './ProfilePageTeacher.css';

/**
 * Profile Page for Teachers and Parents
 * Statistics, settings, and management
 */
const ProfilePageTeacher = () => {
  const { language } = useLanguage();

  const content = {
    uz: {
      title: 'Profil',
      welcome: 'Xush kelibsiz',
      stats: {
        title: 'Statistika',
        students: 'O\'quvchilar',
        lessons: 'Darslar',
        progress: 'O\'rtacha progress',
        time: 'Jami vaqt'
      },
      recentActivity: {
        title: 'So\'nggi faoliyat',
        empty: 'Hali faoliyat yo\'q'
      },
      settings: {
        title: 'Sozlamalar',
        profile: 'Profil sozlamalari',
        notification: 'Bildirishnomalar',
        privacy: 'Maxfiylik',
        help: 'Yordam'
      },
      children: {
        title: 'Mening sinflarim',
        addChild: 'Sinf qo\'shish',
        empty: 'Hali sinf qo\'shilmagan'
      },
      teacher: {
        title: 'Mening o\'quvchilarim',
        addClass: 'Sinf qo\'shish',
        empty: 'Hali o\'quvchi yo\'q'
      }
    },
    ru: {
      title: 'Профиль',
      welcome: 'Добро пожаловать',
      stats: {
        title: 'Статистика',
        students: 'Ученики',
        lessons: 'Уроки',
        progress: 'Средний прогресс',
        time: 'Общее время'
      },
      recentActivity: {
        title: 'Последняя активность',
        empty: 'Нет активности'
      },
      settings: {
        title: 'Настройки',
        profile: 'Настройки профиля',
        notification: 'Уведомления',
        privacy: 'Конфиденциальность',
        help: 'Помощь'
      },
      children: {
        title: 'Мои классы',
        addChild: 'Добавить класс',
        empty: 'Классы еще не добавлены'
      },
      teacher: {
        title: 'Мои ученики',
        addClass: 'Добавить класс',
        empty: 'Учеников пока нет'
      }
    },
    en: {
      title: 'Profile',
      welcome: 'Welcome',
      stats: {
        title: 'Statistics',
        students: 'Students',
        lessons: 'Lessons',
        progress: 'Average progress',
        time: 'Total time'
      },
      recentActivity: {
        title: 'Recent activity',
        empty: 'No activity yet'
      },
      settings: {
        title: 'Settings',
        profile: 'Profile settings',
        notification: 'Notifications',
        privacy: 'Privacy',
        help: 'Help'
      },
      children: {
        title: 'My classes',
        addChild: 'Add class',
        empty: 'No classes added yet'
      },
      teacher: {
        title: 'My students',
        addClass: 'Add class',
        empty: 'No students yet'
      }
    }
  };

  const t = content[language] || content.uz;

  // Mock user data - replace with real data from auth context
  const user = {
    name: 'Jasur Karimov',
    role: 'teacher',
    avatar: '👤'
  };

  const stats = [
    { icon: '👨‍🎓', label: t.stats.students, value: '25' },
    { icon: '📚', label: t.stats.lessons, value: '24' },
    { icon: '📈', label: t.stats.progress, value: '78%' },
    { icon: '⏱️', label: t.stats.time, value: '12h' }
  ];

  return (
    <>
      <Navbar />
      <div className="profile-teacher-page">
      {/* Header */}
      <section className="profile-header">
        <div className="container">
          <div className="profile-welcome">
            <div className="user-avatar">{user.avatar}</div>
            <div className="user-info">
              <h1 className="user-name">{t.welcome}, {user.name}!</h1>
              <p className="user-role">O'qituvchi</p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="profile-stats-section">
        <div className="container">
          <h2 className="section-title">{t.stats.title}</h2>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-info">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Children/Students Section */}
      <section className="profile-children-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              {t.teacher.title}
            </h2>
            <button className="btn-add">
              {t.teacher.addClass}
            </button>
          </div>
          <div className="children-grid">
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>{t.teacher.empty}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="profile-activity-section">
        <div className="container">
          <h2 className="section-title">{t.recentActivity.title}</h2>
          <div className="activity-list">
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>{t.recentActivity.empty}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="profile-settings-section">
        <div className="container">
          <h2 className="section-title">{t.settings.title}</h2>
          <div className="settings-list">
            <button className="setting-item">
              <span className="setting-icon">👤</span>
              <span className="setting-label">{t.settings.profile}</span>
              <span className="setting-arrow">›</span>
            </button>
            <button className="setting-item">
              <span className="setting-icon">🔔</span>
              <span className="setting-label">{t.settings.notification}</span>
              <span className="setting-arrow">›</span>
            </button>
            <button className="setting-item">
              <span className="setting-icon">🔒</span>
              <span className="setting-label">{t.settings.privacy}</span>
              <span className="setting-arrow">›</span>
            </button>
            <button className="setting-item">
              <span className="setting-icon">❓</span>
              <span className="setting-label">{t.settings.help}</span>
              <span className="setting-arrow">›</span>
            </button>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default ProfilePageTeacher;
