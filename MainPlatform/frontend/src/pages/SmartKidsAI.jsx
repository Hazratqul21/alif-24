import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SmartReaderTTS from '../components/smartkids/SmartReaderTTS';
import Navbar from '../components/Common/Navbar';

export default function SmartKidsAI() {
  const navigate = useNavigate();
  return (
     <>
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
