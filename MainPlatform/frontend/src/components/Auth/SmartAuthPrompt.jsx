import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import { BookOpen, Users, Lock, Sparkles } from 'lucide-react';

const SmartAuthPrompt = ({ 
  trigger, 
  message, 
  onAuthSuccess,
  showRegisterOption = true,
  usageCount = 0 
}) => {
  const { isAuthenticated } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (trigger && !isAuthenticated && !dismissed) {
      // Show prompt based on trigger type
      if (trigger === 'usage_limit' && usageCount >= 2) {
        setShowPrompt(true);
      } else if (trigger === 'restricted_content') {
        setShowPrompt(true);
      } else if (trigger === 'manual') {
        setShowPrompt(true);
      }
    }
  }, [trigger, isAuthenticated, dismissed, usageCount]);

  const handleAuthSuccess = () => {
    setShowPrompt(false);
    setDismissed(true);
    if (onAuthSuccess) {
      onAuthSuccess();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
  };

  const getPromptContent = () => {
    switch (trigger) {
      case 'usage_limit':
        return {
          icon: <Sparkles className="w-8 h-8 text-yellow-500" />,
          title: "Ko'proq imkoniyatlar uchun ro'yxatdan o'ting!",
          description: `Siz ${usageCount} marta foydalandingiz. Ro'yxatdan o'tib, barcha darsliklardan to'liq foydalanishingiz mumkin.`,
          features: [
            "Cheksiz darsliklarga kirish",
            "Shaxsiy progress kuzatish",
            "Topshiriqlarni yuklash",
            "Sertifikat olish"
          ]
        };
      case 'restricted_content':
        return {
          icon: <Lock className="w-8 h-8 text-red-500" />,
          title: "Ushbu kontentga kirish uchun ro'yxatdan o'ting",
          description: "Bu darslik faqat ro'yxatdan o'tgan foydalanuvchilar uchun mavjud.",
          features: [
            "To'liq darsliklar",
            "Video darslar",
            "Interactive mashqlar",
            "O'qituvchi bilan bog'lanish"
          ]
        };
      default:
        return {
          icon: <Users className="w-8 h-8 text-blue-500" />,
          title: "Alif24 platformasiga xush kelibsiz!",
          description: "Ro'yxatdan o'tib, o'qish jarayonini yanada samarali qiling.",
          features: [
            "Shaxsiy kabinet",
            "Progress kuzatish",
            "Interaktiv darsliklar",
            "Ota-ona uchun kuzatuv"
          ]
        };
    }
  };

  if (!showPrompt || isAuthenticated) return null;

  const promptContent = getPromptContent();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
        <div className="bg-white rounded-2xl max-w-md w-full relative">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6">
            {/* Icon and title */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                {promptContent.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {promptContent.title}
              </h3>
              <p className="text-gray-600">
                {promptContent.description}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              {promptContent.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setAuthMode('register')}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                Ro'yxatdan o'tish
              </button>
              
              {showRegisterOption && (
                <button
                  onClick={() => setAuthMode('login')}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Allaqachon hisobingiz bormi? Kirish
                </button>
              )}
            </div>

            {/* Skip option */}
            {trigger !== 'restricted_content' && (
              <button
                onClick={handleDismiss}
                className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Keyinroq
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auth modals */}
      {authMode === 'login' && (
        <LoginModal
          isOpen={authMode === 'login'}
          onClose={() => setAuthMode(null)}
          onSwitchToRegister={() => setAuthMode('register')}
        />
      )}
      
      {authMode === 'register' && (
        <RegisterModal
          isOpen={authMode === 'register'}
          onClose={() => setAuthMode(null)}
          onSwitchToLogin={() => setAuthMode('login')}
        />
      )}
    </>
  );
};

export default SmartAuthPrompt;
