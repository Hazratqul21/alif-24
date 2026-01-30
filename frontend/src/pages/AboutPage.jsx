import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Common/Navbar';
import './AboutPage.css';

/**
 * About Us Page
 * Information about the platform, team, and mission
 */
const AboutPage = () => {
  const { language } = useLanguage();

  const content = {
    uz: {
      title: 'Biz haqimizda',
      subtitle: 'Alif24 - 3-9 yoshli bolalar uchun adaptiv ta\'lim platformasi',
      mission: {
        title: '🎯 Bizning maqsadimiz',
        text: 'Har bir bolaga zamonaviy, qiziqarli va samarali ta\'lim berish. Biz bolalarning individual xususiyatlarini hisobga olib, ularga eng mos ta\'lim usullarini taqdim etamiz.'
      },
      features: {
        title: '✨ Platformamiz imkoniyatlari',
        items: [
          {
            icon: '🎮',
            title: 'O\'yinlar orqali o\'rganish',
            desc: 'Bolalar uchun qiziqarli va ta\'limiy o\'yinlar'
          },
          {
            icon: '📊',
            title: 'Adaptiv ta\'lim',
            desc: 'Har bir bolaning darajasiga moslashuvchi dastur'
          },
          {
            icon: '🏆',
            title: 'Yutuqlar va mukofotlar',
            desc: 'Motivatsiya uchun yutuqlar tizimi'
          },
          {
            icon: '👨‍👩‍👧‍👦',
            title: 'Ota-onalar uchun nazorat',
            desc: 'Bolalar progressini kuzatish imkoniyati'
          },
          {
            icon: '🌍',
            title: 'Ko\'p tillilik',
            desc: 'O\'zbek, rus va ingliz tillarida'
          },
          {
            icon: '🔒',
            title: 'Xavfsizlik',
            desc: 'Bolalar uchun xavfsiz muhit'
          }
        ]
      },
      team: {
        title: '👥 Bizning jamoa',
        text: 'Biz - tajribali dasturchilar, dizaynerlar va ta\'lim mutaxassislaridan iborat jamoa. Bizning maqsadimiz - O\'zbekiston bolalariga sifatli ta\'lim berish.'
      },
      contact: {
        title: '📧 Biz bilan bog\'laning',
        email: 'nuralisadullayevich@gmail.com',
        phone: '+998 90 827 83 58'
       
      }
    },
    ru: {
      title: 'О нас',
      subtitle: 'Alif24 - адаптивная образовательная платформа для детей 3-9 лет',
      mission: {
        title: '🎯 Наша миссия',
        text: 'Предоставить каждому ребенку современное, интересное и эффективное образование. Мы учитываем индивидуальные особенности детей и предлагаем наиболее подходящие методы обучения.'
      },
      features: {
        title: '✨ Возможности платформы',
        items: [
          {
            icon: '🎮',
            title: 'Обучение через игры',
            desc: 'Интересные и образовательные игры для детей'
          },
          {
            icon: '📊',
            title: 'Адаптивное обучение',
            desc: 'Программа адаптируется к уровню каждого ребенка'
          },
          {
            icon: '🏆',
            title: 'Достижения и награды',
            desc: 'Система достижений для мотивации'
          },
          {
            icon: '👨‍👩‍👧‍👦',
            title: 'Контроль для родителей',
            desc: 'Возможность отслеживать прогресс детей'
          },
          {
            icon: '🌍',
            title: 'Многоязычность',
            desc: 'На узбекском, русском и английском языках'
          },
          {
            icon: '🔒',
            title: 'Безопасность',
            desc: 'Безопасная среда для детей'
          }
        ]
      },
      team: {
        title: '👥 Наша команда',
        text: 'Мы - команда опытных разработчиков, дизайнеров и специалистов по образованию. Наша цель - предоставить качественное образование детям Узбекистана.'
      },
      contact: {
        title: '📧 Свяжитесь с нами',
       email: 'nuralisadullayevich@gmail.com',
        phone: '+998 90 827 83 58'
      }
    },
    en: {
      title: 'About Us',
      subtitle: 'Alif24 - Adaptive learning platform for children aged 3-9',
      mission: {
        title: '🎯 Our Mission',
        text: 'To provide every child with modern, engaging, and effective education. We consider the individual characteristics of children and offer the most suitable learning methods.'
      },
      features: {
        title: '✨ Platform Features',
        items: [
          {
            icon: '🎮',
            title: 'Learning through games',
            desc: 'Fun and educational games for children'
          },
          {
            icon: '📊',
            title: 'Adaptive learning',
            desc: 'Program adapts to each child\'s level'
          },
          {
            icon: '🏆',
            title: 'Achievements and rewards',
            desc: 'Achievement system for motivation'
          },
          {
            icon: '👨‍👩‍👧‍👦',
            title: 'Parental control',
            desc: 'Track children\'s progress'
          },
          {
            icon: '🌍',
            title: 'Multilingual',
            desc: 'In Uzbek, Russian and English'
          },
          {
            icon: '🔒',
            title: 'Safety',
            desc: 'Safe environment for children'
          }
        ]
      },
      team: {
        title: '👥 Our Team',
        text: 'We are a team of experienced developers, designers and education specialists. Our goal is to provide quality education to children of Uzbekistan.'
      },
      contact: {
        title: '📧 Contact Us',
        email: 'nuralisadullayevich@gmail.com',
        phone: '+998 90 827 83 58'
      }
    }
  };

  const t = content[language] || content.uz;

  return (
    <>
      <Navbar />
      <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <h1 className="about-title">{t.title}</h1>
        <p className="about-subtitle">{t.subtitle}</p>
      </section>

      {/* Mission Section */}
      <section className="about-section mission-section">
        <div className="container">
          <h2 className="section-title">{t.mission.title}</h2>
          <p className="section-text">{t.mission.text}</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="about-section features-section">
        <div className="container">
          <h2 className="section-title">{t.features.title}</h2>
          <div className="features-grid">
            {t.features.items.map((item, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{item.icon}</div>
                <h3 className="feature-title">{item.title}</h3>
                <p className="feature-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="about-section team-section">
        <div className="container">
          <h2 className="section-title">{t.team.title}</h2>
          <p className="section-text">{t.team.text}</p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="about-section contact-section">
        <div className="container">
          <h2 className="section-title">{t.contact.title}</h2>
          <div className="contact-info">
            <div className="contact-item">
              <span className="contact-icon">📧</span>
              <a href={`mailto:${t.contact.email}`} className="contact-link">
                {t.contact.email}
              </a>
            </div>
            <div className="contact-item">
              <span className="contact-icon">📱</span>
              <a href={`tel:${t.contact.phone}`} className="contact-link">
                {t.contact.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default AboutPage;
