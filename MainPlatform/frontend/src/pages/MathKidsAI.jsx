import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MathSolver from '../components/mathkids/MathSolver';
import Navbar from '../components/Common/Navbar';
import SEO from '../components/SEO';

const MathKidsAI = () => {
  const navigate = useNavigate();
  return (
  <>
     <SEO
       title="MathKids AI — Bolalar uchun matematika yordamchisi"
       description="Sun'iy intellekt yordamida matematik misollarni yechuvchi bolalar uchun AI yordamchi. Vazifalarni bosqichma-bosqich tushuntirib beradi."
       keywords="mathkids, bolalar matematika, AI matematika, misollar yechish, alif24 matematika, matematika yordamchi"
       path="/mathkids"
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
      <MathSolver />
      </>
  );
};

export default MathKidsAI;
