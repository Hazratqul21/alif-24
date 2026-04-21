import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, X, Sparkles } from 'lucide-react';

const LevelUpModal = ({ isOpen, onClose, newLevel }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
          className="relative max-w-md w-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-[3rem] p-10 text-center border-4 border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.4)]"
        >
          {/* Confetti-like bits */}
          <div className="absolute inset-0 overflow-hidden rounded-[3rem]">
             <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
             <div className="absolute top-20 right-20 w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
             <div className="absolute bottom-10 left-1/2 w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
          </div>

          <div className="relative z-10">
            <motion.div 
               animate={{ y: [0, -20, 0] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl mb-8 transform rotate-6 border-4 border-white/20"
            >
               <Trophy className="w-12 h-12 text-white" />
            </motion.div>

            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">TABRIKLAYMIZ! 🎉</h2>
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs mb-8">Yangi darajaga erishdingiz</p>

            <div className="flex items-center justify-center gap-4 mb-10">
               <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center">
                  <div className="text-[10px] font-black text-white/30 uppercase">Oldingi</div>
                  <div className="text-3xl font-black text-white/40">{newLevel - 1}</div>
               </div>
               <div className="text-indigo-500 animate-pulse">
                  <Sparkles size={32} />
               </div>
               <div className="w-24 h-24 rounded-3xl bg-indigo-500 flex flex-col items-center justify-center shadow-lg shadow-indigo-500/50">
                  <div className="text-[10px] font-black text-white/80 uppercase">Hozirgi</div>
                  <div className="text-5xl font-black text-white">{newLevel}</div>
               </div>
            </div>

            <div className="space-y-3">
               <button 
                 onClick={onClose}
                 className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
               >
                 DAVOM ETISH
               </button>
               <p className="text-white/20 text-[10px] font-medium italic">Siz bilan g'ururlanamiz! ✨</p>
            </div>
          </div>

          {/* Close corner */}
          <button onClick={onClose} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LevelUpModal;
