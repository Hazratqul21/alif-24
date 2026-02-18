import { Heart, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-[#0f0f1a] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-5 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/Logo.png" alt="Alif24" className="w-10 h-10" />
              <span className="text-white font-bold text-xl tracking-wide">Alif24</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              {t('footer_desc') || "Bolalar uchun sun'iy intellektga asoslangan ta'lim platformasi. O'yin orqali o'rganish!"}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              {t('footer_links') || 'Sahifalar'}
            </h4>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate('/')} className="text-white/40 hover:text-white text-sm text-left bg-transparent border-none cursor-pointer transition-colors">
                {t('home') || 'Bosh sahifa'}
              </button>
              <button onClick={() => navigate('/about')} className="text-white/40 hover:text-white text-sm text-left bg-transparent border-none cursor-pointer transition-colors">
                {t('aboutus') || 'Biz haqimizda'}
              </button>
              <button onClick={() => navigate('/partners')} className="text-white/40 hover:text-white text-sm text-left bg-transparent border-none cursor-pointer transition-colors">
                {t('partner') || 'Hamkorlar'}
              </button>
              <button onClick={() => navigate('/smartkids')} className="text-white/40 hover:text-white text-sm text-left bg-transparent border-none cursor-pointer transition-colors">
                SmartKids AI
              </button>
              <button onClick={() => navigate('/mathkids')} className="text-white/40 hover:text-white text-sm text-left bg-transparent border-none cursor-pointer transition-colors">
                MathKids AI
              </button>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              {t('footer_contact') || 'Aloqa'}
            </h4>
            <div className="flex flex-col gap-3">
              <a href="mailto:info@alif24.uz" className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors no-underline">
                <Mail size={14} />
                info@alif24.uz
              </a>
              <a href="tel:+998901234567" className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors no-underline">
                <Phone size={14} />
                +998 90 123 45 67
              </a>
              <span className="flex items-center gap-2 text-white/40 text-sm">
                <MapPin size={14} />
                Toshkent, O'zbekiston
              </span>
            </div>
          </div>
        </div>

        {/* Divider + Copyright */}
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs">
            &copy; {year} Alif24. {t('footer_rights') || 'Barcha huquqlar himoyalangan.'}
          </p>
          <p className="text-white/20 text-xs flex items-center gap-1">
            Made with <Heart size={12} className="text-red-400 fill-red-400" /> in Uzbekistan
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
