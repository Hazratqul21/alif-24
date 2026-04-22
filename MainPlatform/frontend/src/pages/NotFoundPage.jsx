import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFoundPage() {
  return (
    <>
      <SEO
        title="404 — Sahifa topilmadi"
        description="Siz qidirayotgan sahifa topilmadi. Asosiy sahifaga qayting yoki boshqa bo'limga o'ting."
        path="/404"
        noindex
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50 px-4">
        <div className="max-w-xl w-full text-center">
          <div className="select-none text-[10rem] leading-none font-extrabold bg-gradient-to-br from-[#4A90A4] to-[#2d6673] bg-clip-text text-transparent">
            404
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
            Sahifa topilmadi
          </h1>
          <p className="mt-3 text-gray-600">
            Kechirasiz, siz qidirayotgan sahifa mavjud emas yoki ko'chirilgan bo'lishi mumkin.
            Quyidagi tugmalar orqali asosiy sahifaga qaytishingiz mumkin.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#4A90A4] text-white font-medium hover:bg-[#2d6673] transition-colors shadow-sm"
            >
              <Home size={18} />
              Bosh sahifa
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft size={18} />
              Orqaga qaytish
            </button>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Link to="/about" className="text-gray-600 hover:text-[#4A90A4] underline-offset-2 hover:underline">Biz haqimizda</Link>
            <Link to="/partners" className="text-gray-600 hover:text-[#4A90A4] underline-offset-2 hover:underline">Hamkorlar</Link>
            <Link to="/leaderboard" className="text-gray-600 hover:text-[#4A90A4] underline-offset-2 hover:underline">Reyting</Link>
            <Link to="/smartkids" className="text-gray-600 hover:text-[#4A90A4] underline-offset-2 hover:underline">SmartKids</Link>
            <Link to="/mathkids" className="text-gray-600 hover:text-[#4A90A4] underline-offset-2 hover:underline">MathKids</Link>
            <Link to="/privacy" className="text-gray-600 hover:text-[#4A90A4] underline-offset-2 hover:underline">Maxfiylik</Link>
          </div>
        </div>
      </div>
    </>
  );
}
