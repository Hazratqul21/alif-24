import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, ShoppingCart, Star, 
  ArrowRight, BookOpen, ClipboardList, Package, 
  ChevronDown, LayoutGrid, List, Sparkles, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/Common/Navbar';
import apiService from '../../services/apiService';

const MarketplaceStore = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [activeType, setActiveType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetchMarketplace();
  }, [activeType, searchTerm]);

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeType !== 'all') params.item_type = activeType;
      if (searchTerm) params.search = searchTerm;
      
      const res = await apiService.get('/marketplace', params);
      setItems(res.items || []);
    } catch (err) {
      console.error("Market fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    if (!cart.find(i => i.id === item.id)) {
      setCart([...cart, item]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent -z-10" />
        <div className="max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <span className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} /> YANGI DAVR TA'LIMI
            </span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black mb-6 tracking-tighter"
          >
            Resurslar <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Marketpleysi</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg max-w-2xl mx-auto mb-10"
          >
            Eng yaxshi o'qituvchilar tomonidan yaratilgan interaktiv darslar, testlar va metodik qo'llanmalar to'plami.
          </motion.p>

          {/* Search & Filters Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-4xl mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 p-2 rounded-3xl flex flex-col md:flex-row items-center gap-2 shadow-2xl"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="text" 
                placeholder="Matematika, Biologiya, 5-sinf..." 
                className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-white focus:outline-none placeholder:text-slate-600 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-slate-300 font-bold"
              >
                <Filter size={18} /> Filtrlar
              </button>
              <button className="flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all font-black shadow-lg shadow-indigo-600/20">
                QIDIRISH
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pb-32">
        {/* Categories Tabs */}
        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {['all', 'lesson', 'test', 'material', 'bundle'].map((type) => (
              <button 
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeType === type ? 'bg-white text-black' : 'hover:bg-white/5 text-slate-400'
                }`}
              >
                {type === 'all' ? 'Barchasi' : 
                 type === 'lesson' ? 'Darslar' : 
                 type === 'test' ? 'Testlar' : 
                 type === 'material' ? 'Materiallar' : 'To\'plamlar'}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/5 p-1 rounded-xl">
             <button className="p-2 bg-white/10 rounded-lg text-white"><LayoutGrid size={18}/></button>
             <button className="p-2 text-slate-500 hover:text-slate-300"><List size={18}/></button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading ? (
             Array(8).fill(0).map((_, i) => (
               <div key={i} className="bg-white/5 aspect-[3/4] rounded-[40px] animate-pulse border border-white/5" />
             ))
          ) : items.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Hech narsa topilmadi</h3>
              <p className="text-slate-500">Boshqa kalit so'zlar yoki filtrlar bilan urinib ko'ring.</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-[#1e1e30] rounded-[40px] border border-white/5 overflow-hidden hover:border-indigo-500/50 transition-all shadow-xl hover:-translate-y-2"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img 
                    src={item.thumbnail_url || `https://source.unsplash.com/random/400x300?education,${idx}`} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    alt={item.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e30] via-transparent to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/10">
                      {item.resource_type === 'lesson' ? 'Dars' : 'Test'}
                    </span>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-indigo-600 px-4 py-1.5 rounded-2xl font-black text-sm shadow-xl">
                    {item.price === 0 ? 'Bepul' : `${item.price.toLocaleString()} UZS`}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-1 mb-2 text-yellow-500">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-black">{item.average_rating || '5.0'}</span>
                    <span className="text-xs text-slate-500 font-bold ml-1">({item.review_count || 0})</span>
                  </div>
                  <h3 className="text-lg font-black leading-tight mb-3 group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-tighter">
                    <div className="flex items-center gap-1">
                      <BookOpen size={14} /> {item.subject || 'Boshqa'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy size={14} /> {item.grade_level || 'Sinf'}
                    </div>
                  </div>
                </div>

                {/* Footer / Actions */}
                <div className="p-6 pt-0 flex gap-2">
                  <button 
                    onClick={() => addToCart(item)}
                    className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all border border-white/5"
                  >
                    SAVATCHA
                  </button>
                  <button className="p-3 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-2xl transition-all border border-indigo-500/20 group-hover:scale-105">
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-10 right-10 z-50 bg-white text-black p-6 rounded-full shadow-2xl flex items-center justify-center gap-4 group"
          >
            <div className="relative">
              <ShoppingCart size={24} />
              <span className="absolute -top-3 -right-3 w-6 h-6 bg-indigo-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white">
                {cart.length}
              </span>
            </div>
            <span className="font-black text-sm pr-2">KO'RISH</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketplaceStore;
