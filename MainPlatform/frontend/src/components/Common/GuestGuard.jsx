/**
 * GuestGuard - HOC to protect content pages
 * Allows first content access, requires login for subsequent access
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import guestSessionService from '../../services/guestSessionService';
import { useAuth } from '../../context/AuthContext';

const GuestGuard = ({ children, contentType, contentId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      // If user is logged in, always allow access
      if (user) {
        setCanAccess(true);
        setIsChecking(false);
        return;
      }

      // TODO: Guest session API endpoint not implemented yet in backend
      // For now, always allow access without tracking
      setCanAccess(true);
      setIsChecking(false);
      
      // Uncomment when backend guest endpoint is ready:
      /*
      // Track content access for guest
      const result = await guestSessionService.trackContentAccess(contentType, contentId);
      
      if (result.requires_login) {
        // Show login prompt but allow current content access
        setShowLoginPrompt(true);
        setCanAccess(true);
      } else {
        // First content, allow access
        setCanAccess(true);
      }
      
      setIsChecking(false);
      */
    } catch (error) {
      console.error('Error checking access:', error);
      // On error, still allow access but show login prompt
      setCanAccess(true);
      setShowLoginPrompt(true);
      setIsChecking(false);
    }
  };

  const handleLoginClick = () => {
    // Navigate to login page or show login modal
    // You can customize this based on your auth flow
    navigate('/');
    // Or trigger login modal if you have one in context
  };

  const handleContinueAsGuest = () => {
    // User chooses to continue without logging in
    // Close the prompt but remember they saw it
    setShowLoginPrompt(false);
    sessionStorage.setItem('guest_prompt_shown', 'true');
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Kirish Taqiqlangan</h2>
            <p className="text-gray-600">
              Ushbu kontentga kirish uchun ro'yxatdan o'ting yoki tizimga kiring.
            </p>
          </div>
          <button
            onClick={handleLoginClick}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transform hover:scale-105 transition duration-200"
          >
            Kirish / Ro'yxatdan o'tish
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      
      {/* Login Prompt Modal - shown after first content */}
      {showLoginPrompt && !sessionStorage.getItem('guest_prompt_shown') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Birinchi kontentni ko'rdingiz!
              </h2>
              <p className="text-gray-600 mb-4">
                Barcha imkoniyatlardan foydalanish uchun ro'yxatdan o'ting yoki tizimga kiring.
              </p>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4">
                <ul className="text-left text-sm text-gray-700 space-y-2">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Cheksiz kontentdan foydalaning
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Progressingizni saqlang
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Yutuqlarni yig'ing
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Darslarga qo'shiling
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleLoginClick}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transform hover:scale-105 transition duration-200"
              >
                Ro'yxatdan o'tish / Kirish
              </button>
              <button
                onClick={handleContinueAsGuest}
                className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-200 transition duration-200"
              >
                Keyinroq
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GuestGuard;
