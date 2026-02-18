import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Common/Navbar';
import { ArrowLeft, Handshake, Building, School, Laptop, Phone, Mail, MessageCircle } from 'lucide-react';

const PartnersPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const partnerTypes = [
    {
      icon: School,
      title: "Ta'lim muassasalari",
      desc: "Maktablar va bog'chalar uchun maxsus imkoniyatlar",
      benefits: [
        "O'quvchilar uchun bepul premium obuna",
        "O'qituvchilar uchun maxsus panel",
        "Sinf boshqarish tizimi",
        "Dars yaratish va nazorat vositalari"
      ]
    },
    {
      icon: Building,
      title: "O'quv markazlari",
      desc: "Xususiy ta'lim markazlari uchun hamkorlik",
      benefits: [
        "CRM tizimi integratsiyasi",
        "O'quvchilar tahlili va hisobotlar",
        "Brendlashtirilgan platforma",
        "Maxsus kontent yaratish imkoniyati"
      ]
    },
    {
      icon: Laptop,
      title: "Texnologiya kompaniyalari",
      desc: "AI va EdTech sohasida hamkorlik",
      benefits: [
        "API integratsiya imkoniyati",
        "Birgalikda mahsulot ishlab chiqish",
        "Ma'lumotlar almashish (anonim)",
        "Texnik hamkorlik va mentorlik"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>{t('home') || 'Bosh sahifa'}</span>
        </button>

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Handshake className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Hamkorlik <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4b30fb] to-[#00d2d3]">dasturi</span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Alif24 bilan hamkorlik qiling va bolalar ta'limini yangi bosqichga olib chiqing.
            Biz bilan birgalikda ta'limni zamonaviy va sifatli qilaylik!
          </p>
        </div>

        {/* Partner Types */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {partnerTypes.map((type, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-[#4b30fb]/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-xl flex items-center justify-center mb-4">
                <type.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{type.title}</h3>
              <p className="text-white/60 text-sm mb-4">{type.desc}</p>
              <ul className="space-y-2">
                {type.benefits.map((benefit, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-[#4b30fb] mt-0.5">✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-[#4b30fb]/20 to-[#764ba2]/20 border border-[#4b30fb]/30 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Biz bilan bog'laning</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <a
              href="tel:+998901234567"
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all no-underline"
            >
              <Phone className="w-6 h-6 text-[#4b30fb]" />
              <div>
                <div className="text-sm text-white/60">Telefon</div>
                <div className="text-white font-medium">+998 90 123 45 67</div>
              </div>
            </a>
            <a
              href="mailto:info@alif24.uz"
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all no-underline"
            >
              <Mail className="w-6 h-6 text-[#4b30fb]" />
              <div>
                <div className="text-sm text-white/60">Email</div>
                <div className="text-white font-medium">info@alif24.uz</div>
              </div>
            </a>
            <a
              href="https://t.me/Alif24Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all no-underline"
            >
              <MessageCircle className="w-6 h-6 text-[#4b30fb]" />
              <div>
                <div className="text-sm text-white/60">Telegram</div>
                <div className="text-white font-medium">@Alif24Bot</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnersPage;
