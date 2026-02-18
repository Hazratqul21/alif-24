import { Bell, Search, Globe, ChevronDown, Menu } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

const Header = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
    const { t, language, switchLanguage } = useLanguage();
    const { user } = useAuth();
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langRef.current && !langRef.current.contains(event.target)) {
                setLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const languages = {
        uz: { label: "O'zbekcha", flag: "🇺🇿" },
        ru: { label: "Русский", flag: "🇷🇺" },
        en: { label: "English", flag: "🇺🇸" }
    };

    return (
        <header className={`
      h-[70px] bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-30 transition-all duration-300
      ${sidebarOpen && !isMobile ? 'ml-64' : !sidebarOpen && !isMobile ? 'ml-20' : 'ml-0'}
    `}>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                >
                    <Menu size={24} />
                </button>

                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 w-64 focus-within:ring-2 focus-within:ring-[#4b30fb]/20 transition-all">
                    <Search size={18} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('search') || "Qidirish..."}
                        className="bg-transparent border-none outline-none text-sm w-full text-gray-700"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Language Selector */}
                <div className="relative" ref={langRef}>
                    <button
                        onClick={() => setLangOpen(!langOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                    >
                        <span className="text-lg">{languages[language]?.flag || "🇺🇿"}</span>
                        <span className="text-sm font-medium text-gray-700 uppercase hidden sm:inline">{language}</span>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {langOpen && (
                        <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {Object.entries(languages).map(([code, { label, flag }]) => (
                                <button
                                    key={code}
                                    onClick={() => {
                                        switchLanguage(code);
                                        setLangOpen(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors ${language === code ? 'text-[#4b30fb] bg-blue-50/50' : 'text-gray-700'
                                        }`}
                                >
                                    <span>{flag}</span>
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                {/* User Profile (Simple) */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-900 leading-none">{user?.first_name || 'Admin'}</p>
                        <p className="text-xs text-gray-500 mt-1 capitalize">{user?.role || 'User'}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden ring-2 ring-white shadow-sm">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#4b30fb] text-white font-bold text-sm">
                                {user?.first_name?.[0] || 'U'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
