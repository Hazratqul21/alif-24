import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, Zap, Star } from 'lucide-react';

const StudentPortalHeader = ({ profile, user }) => {
  // Level Formula: Level = floor(sqrt(points / 100)) + 1
  // XP needed for current level = (level-1)^2 * 100
  // XP needed for next level = level^2 * 100
  const level = profile?.level || 1;
  const currentPoints = profile?.total_points || 0;
  
  const xpStart = Math.pow(level - 1, 2) * 100;
  const xpEnd = Math.pow(level, 2) * 100;
  const xpInLevel = currentPoints - xpStart;
  const xpRequired = xpEnd - xpStart;
  const progressPercent = Math.min(100, Math.max(0, (xpInLevel / xpRequired) * 100));

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-[2rem] p-8 border border-white/5 shadow-2xl">
      {/* Background Shapes */}
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-100px] left-[-20px] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* User Info */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform">
               <span className="text-4xl font-black text-white">{user?.first_name?.charAt(0) || 'A'}</span>
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-2 -right-2 bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-black shadow-lg border-4 border-[#1a1a2e]"
            >
              LVL {level}
            </motion.div>
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-white mb-1">Salom, {user?.first_name}! 👋</h1>
            <p className="text-white/40 font-medium">Bugun yangi bilimlar sari olg'a!</p>
            <div className="flex gap-3 mt-4">
               <div className="flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-xl border border-orange-500/10 backdrop-blur-md">
                 <Flame className="w-4 h-4 fill-current" />
                 <span className="text-sm font-black">{profile?.current_streak || 0} KUN</span>
               </div>
               <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-1.5 rounded-xl border border-indigo-500/10 backdrop-blur-md">
                 <Zap className="w-4 h-4 fill-current" />
                 <span className="text-sm font-black">{currentPoints} XP</span>
               </div>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="w-full md:w-96">
          <div className="flex justify-between items-end mb-3">
             <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Progress</div>
             <div className="text-xs font-black text-white/60">{xpInLevel}/{xpRequired} XP</div>
          </div>
          <div className="h-6 bg-white/5 rounded-full p-1.5 border border-white/5 relative overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${progressPercent}%` }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
             />
          </div>
          <div className="flex justify-between mt-3 px-1">
             <span className="text-[10px] font-black text-white/20">LEVEL {level}</span>
             <span className="text-[10px] font-black text-white/20">LEVEL {level + 1}</span>
          </div>
        </div>

        {/* Global Rank Snippet (Optional) */}
        <div className="hidden lg:flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
           <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/10">
              <Trophy className="w-6 h-6" />
           </div>
           <div>
              <div className="text-[10px] font-black text-white/30 uppercase">Global Rank</div>
              <div className="text-xl font-black text-white">#12</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPortalHeader;
