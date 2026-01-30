import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Common/Navbar';
import './PartnerPage.css';

/**
 * Partners Page
 * Display partner organizations and companies
 */
const PartnerPage = () => {
  const { language } = useLanguage();

  const content = {
    uz: {
      title: 'Hamkorlarimiz',
      subtitle: 'Biz bilan hamkorlik qilayotgan tashkilotlar va kompaniyalar',
      partners: [
        {
          name: 'School21',
          desc: 'O\'zbekistonda bepul raqamli texnologiyalar maktabi',
          image: './images.png',
          type: 'education'
        },
           {
          name: 'School21',
          desc: 'O\'zbekistonda bepul raqamli texnologiyalar maktabi',
          image: './images.png',
          type: 'education'
        },
            {
          name: 'School21',
          desc: 'O\'zbekistonda bepul raqamli texnologiyalar maktabi',
          image: './images.png',
          type: 'education'
        },


      ],
      becomePartner: {
        title: 'Hamkor bo\'lish',
        desc: 'Siz ham bizning hamkorimiz bo\'lishni istaysizmi? Biz bilan bog\'laning!',
        button: 'Bog\'lanish'
      },
      categories: {
        all: 'Barchasi',
        government: 'Davlat',
        tech: 'Texnologiya',
        innovation: 'Innovatsiya',
        international: 'Xalqaro',
        education: 'Ta\'lim',
        social: 'Ijtimoiy'
      }
    },
    ru: {
      title: 'Наши партнеры',
      subtitle: 'Организации и компании, сотрудничающие с нами',
      partners: [
        {
          name: 'School21',
          desc: 'Бесплатная школа цифровых технологий в Узбекистане',
          image: './images.png',
          type: 'education'
        },
           {
          name: 'School21',
          desc: 'Бесплатная школа цифровых технологий в Узбекистане',
          image: './images.png',
          type: 'education'
        },
           {
          name: 'School21',
          desc: 'Бесплатная школа цифровых технологий в Узбекистане',
          image: './images.png',
          type: 'education'
        },
       
      ],
      becomePartner: {
        title: 'Стать партнером',
        desc: 'Хотите стать нашим партнером? Свяжитесь с нами!',
        button: 'Связаться'
      },
      categories: {
        all: 'Все',
        government: 'Государство',
        tech: 'Технологии',
        innovation: 'Инновации',
        international: 'Международные',
        education: 'Образование',
        social: 'Социальные'
      }
    },
    en: {
      title: 'Our Partners',
      subtitle: 'Organizations and companies collaborating with us',
      partners: [
        {
          name: 'School21',
          desc: 'Free digital technology school in Uzbekistan',
          image: './images.png',
          type: 'education'
        },
          {
          name: 'School21',
          desc: 'Free digital technology school in Uzbekistan',
          image: './images.png',
          type: 'education'
        },
          {
          name: 'School21',
          desc: 'Free digital technology school in Uzbekistan',
          image: './images.png',
          type: 'education'
        },
       
      ],
      becomePartner: {
        title: 'Become a Partner',
        desc: 'Want to become our partner? Contact us!',
        button: 'Contact'
      },
      categories: {
        all: 'All',
        government: 'Government',
        tech: 'Technology',
        innovation: 'Innovation',
        international: 'International',
        education: 'Education',
        social: 'Social'
      }
    }
  };

  const t = content[language] || content.uz;

  return (
    <>
      <Navbar />
      <div className="partner-page">
      {/* Hero Section */}
      <section className="partner-hero">
        <h1 className="partner-title">{t.title}</h1>
        <p className="partner-subtitle">{t.subtitle}</p>
      </section>

      {/* Partners Grid */}
      <section className="partners-section">
        <div className="container">
          <div className="partners-grid">
            {t.partners.map((partner, index) => (
              <div key={index} className="partner-card">
                {partner.image ? (
                  <img src={partner.image} alt={partner.name} className="partner-image" />
                ) : (
                  <div className="partner-icon">{partner.icon}</div>
                )}
                <h3 className="partner-name">{partner.name}</h3>
                <p className="partner-desc">{partner.desc}</p>
                <span className="partner-badge">{t.categories[partner.type]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Become Partner Section */}
      <section className="become-partner-section">
        <div className="container">
          <div className="become-partner-card">
            <h2 className="become-partner-title">{t.becomePartner.title}</h2>
            <p className="become-partner-desc">{t.becomePartner.desc}</p>
            <a href="mailto:partners@alifbe.uz" className="become-partner-btn">
              {t.becomePartner.button}
            </a>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default PartnerPage;
