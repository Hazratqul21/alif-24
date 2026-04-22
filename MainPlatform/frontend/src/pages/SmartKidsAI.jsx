import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SmartReaderTTS from '../components/smartkids/SmartReaderTTS';
import Navbar from '../components/Common/Navbar';
import SEO from '../components/SEO';

export default function SmartKidsAI() {
  const navigate = useNavigate();
  return (
     <>
     <SEO
       title="SmartKids AI — Bolalar uchun matnni ovozga aylantirish"
       description="AI yordamida matnni tabiiy ovozga aylantiruvchi bolalarga mo'ljallangan o'qish vositasi. Uyda mustaqil o'qishni rivojlantiring."
       keywords="smartkids, bolalar AI, matnni ovozga aylantirish, TTS bolalar uchun, alif24 smartkids, o'qishni o'rganish"
       path="/smartkids"
     />
     <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-2 transition-colors bg-transparent border-none cursor-pointer text-sm"
        >
          <ArrowLeft size={18} />
          <span>Ortga</span>
        </button>
      </div>
      <SmartReaderTTS />
      </>
  );
}
