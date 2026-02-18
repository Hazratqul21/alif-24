import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Common/Navbar';
import { ArrowLeft, Sparkles } from 'lucide-react';

const AboutPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>{t('home') || 'Bosh sahifa'}</span>
        </button>

        {/* Coming Soon */}
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(75,48,251,0.3)]">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tez kunda...
          </h1>
          <p className="text-lg text-white/60 max-w-xl">
            Bu sahifa hozirda tayyorlanmoqda. Tez orada yangi va qiziqarli ma'lumotlar bilan qaytamiz!
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-8 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white px-8 py-3 rounded-xl font-medium hover:shadow-[0_0_20px_rgba(75,48,251,0.5)] transition-all border-none cursor-pointer"
          >
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
