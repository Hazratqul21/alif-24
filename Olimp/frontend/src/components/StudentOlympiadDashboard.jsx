import { motion } from 'framer-motion';
import { Trophy, CheckCircle, Clock, Lock, Sparkles, Star, Users, MapPin, Calendar, BookOpen, AlertCircle, ArrowRight, School } from 'lucide-react';

const STAGE_SCOPES = {
  'school': 'Maktab',
  'district': 'Tuman',
  'region': 'Viloyat',
  'national': 'Respublika'
};

const STAGE_ICONS = {
  1: MapPin,
  2: Users,
  3: Trophy,
  4: Sparkles
};

export default function StudentOlympiadDashboard({
  olympiad,
  stages = [],
  myParticipation = {},
  stageResults = [],
  leaderboard = [],
  onStartTask,
  isTaskActive = false
}) {
  const currentStageNumber = myParticipation.current_stage || 1;
  
  // Find current stage config
  const currentStage = stages.find(s => s.stage_number === currentStageNumber) || stages[0] || {};
  
  // Find if current stage task is already completed
  const currentStageResult = stageResults.find(r => r.stage_id === currentStage.id);
  const isCompleted = !!currentStageResult;

  // Format second to mm:ss
  const fmtSec = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. HeroSection */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/20 rounded-2xl p-6 md:p-8 overflow-hidden shadow-xl"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Trophy className="w-64 h-64 text-indigo-400" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 animate-spin" /> Ko'p bosqichli
            </span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full">
              Faol ishtirokchi
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white">{olympiad.title}</h1>
          <p className="text-indigo-200/80 text-sm md:text-base max-w-2xl">{olympiad.description || "Nizomga muvofiq, maktab, tuman, viloyat va respublika bosqichlaridan iborat nufuzli olimpiada."}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Hududingiz</p>
                <p className="text-white font-bold text-sm truncate">{myParticipation.region}, {myParticipation.district}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <School className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Muassasa / Sinf</p>
                <p className="text-white font-bold text-sm">{myParticipation.school_number}-maktab, {myParticipation.class_number}-sinf</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Joriy bosqich</p>
                <p className="text-white font-bold text-sm">{currentStageNumber}-bosqich ({STAGE_SCOPES[currentStage.scope_type] || 'Maktab'})</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Visual Timeline and Dates Section */}
      <div className="bg-[#1a1a2e]/60 border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Olimpiada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm text-white/70 text-left">
            <div className="flex gap-4">
              <span className="text-white/40 min-w-[70px]">Ro'yxat:</span>
              <span className="font-semibold text-white">
                {olympiad.registration_start ? new Date(olympiad.registration_start).toLocaleString('uz-UZ') : '—'}
              </span>
            </div>
            <div className="flex gap-4">
              <span className="text-white/40 min-w-[70px]">Tugash:</span>
              <span className="font-semibold text-white">
                {olympiad.registration_end ? new Date(olympiad.registration_end).toLocaleString('uz-UZ') : '—'}
              </span>
            </div>
            <div className="flex gap-4">
              <span className="text-white/40 min-w-[70px]">Yosh:</span>
              <span className="font-semibold text-white">
                {olympiad.min_age || 6}-{olympiad.max_age || 18}
              </span>
            </div>
            <div className="flex gap-4">
              <span className="text-white/40 min-w-[70px]">Sinflar:</span>
              <span className="font-semibold text-white">
                {olympiad.allowed_classes ? olympiad.allowed_classes.join(', ') : '1-11'}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 space-y-4">
          <h4 className="text-lg font-bold text-white">Bosqichlar ({stages.length})</h4>
          <div className="space-y-3">
            {stages.map((st) => {
              const scopeNames = {
                school: "Maktab",
                district: "Tuman",
                region: "Viloyat",
                state: "Respublika"
              };
              const contentNames = {
                mixed: "Aralash",
                story: "Ertak",
                quiz: "Test"
              };
              const num = st.stage_number;
              const currentScope = scopeNames[st.scope_type] || "Maktab";
              const currentContent = contentNames[st.content_type] || "Aralash";

              const formatDateRange = (start, end) => {
                if (!start) return '—';
                const s = new Date(start);
                const e = new Date(end);
                const sStr = s.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const sTime = s.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                const eStr = e.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const eTime = e.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                if (sStr === eStr) {
                  return `${sStr}, ${sTime} - ${eTime}`;
                }
                return `${sStr}, ${sTime} - ${eStr}, ${eTime}`;
              };

              return (
                <div key={st.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl gap-4 hover:border-indigo-500/30 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/90 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/20">
                      {num}
                    </div>
                    <div>
                      <h5 className="text-white font-bold text-base">{st.title || `${num}-bosqich`}</h5>
                      <p className="text-white/40 text-xs font-medium">
                        {currentScope} • {currentContent} • Top {st.passing_percent}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs md:text-sm text-white/50">
                    <span className="font-semibold text-white/90">
                      {formatDateRange(st.start_time, st.end_time)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. CurrentStageCard & Action Button */}
        <div className="lg:col-span-2 space-y-6">
          
          <motion.div 
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
              <div>
                <span className="text-[10px] font-bold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                  Joriy topshiriq
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white mt-3">{currentStage.title || `${currentStageNumber}-bosqich`}</h2>
                <p className="text-white/70 text-sm mt-2">
                  Ushbu bosqichda siz <span className="text-indigo-400 font-bold uppercase">{currentStage.content_type === 'test' ? 'Test sinovlari' : 'Matn o\'qish (vazifalar)'}</span> orqali bilimingizni namoyish etasiz.
                  Natijangiz kamida <span className="text-emerald-400 font-extrabold">{currentStage.passing_percent}%</span> bo'lishi lozim.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Bosqich boshlanishi</p>
                    <p className="text-white font-bold text-sm mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      {currentStage.start_time ? new Date(currentStage.start_time).toLocaleString('uz-UZ') : 'Noma\'lum'}
                    </p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Bosqich tugashi</p>
                    <p className="text-white font-bold text-sm mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      {currentStage.end_time ? new Date(currentStage.end_time).toLocaleString('uz-UZ') : 'Noma\'lum'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                {isCompleted ? (
                  <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 animate-fadeIn">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                    <p className="text-emerald-400 font-black text-base">Topshiriq muvaffaqiyatli bajarildi!</p>
                    <p className="text-white/60 text-xs">
                      Sizning natijangiz: <span className="text-white font-bold">{currentStageResult.score} ball</span>. 
                      Navbatdagi bosqich natijalari hisoblanishini va keyingi bosqich ochilishini kuting.
                    </p>
                  </div>
                ) : !isTaskActive ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 animate-pulse" />
                    <div>
                      <p className="font-extrabold text-sm">Topshiriq hozircha faol emas!</p>
                      <p className="mt-0.5 text-white/60">Ushbu bosqich belgilangan vaqt oralig'ida ochiladi yoki siz sinf mezonlariga mos kelmaysiz.</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={onStartTask}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] text-white font-black rounded-xl hover:bg-right transition-all duration-500 shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 hover:gap-3"
                  >
                    <span>{currentStage.content_type === 'test' ? '✏️ Test sinovini boshlash' : '📖 O\'qish vazifasini boshlash'}</span>
                    <ArrowRight className="w-4 h-4 transition-all" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* 4. Previous ResultsGrid */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> Avvalgi bosqichlar natijalari
            </h3>

            {stageResults.length === 0 ? (
              <p className="text-center py-6 text-white/30 text-sm">Hozircha natijalar mavjud emas</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stageResults.map((res) => {
                  const st = stages.find(s => s.id === res.stage_id) || {};
                  return (
                    <div key={res.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                            {st.stage_number}-bosqich ({STAGE_SCOPES[st.scope_type]})
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            res.is_passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {res.is_passed ? "O'tdi" : "O'ta olmadi"}
                          </span>
                        </div>
                        <h4 className="text-white font-bold text-sm mt-1 truncate">{st.title || 'Bosqich'}</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 text-xs">
                        <div>
                          <p className="text-white/40">To'plangan ball</p>
                          <p className="text-white font-black">{res.score} ball</p>
                        </div>
                        <div>
                          <p className="text-white/40">Sarflangan vaqt</p>
                          <p className="text-white font-bold font-mono">{fmtSec(res.duration_seconds)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 5. RivalsTable / Geographically scoped Leaderboard */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-white font-extrabold text-lg">Reyting jadvali</h3>
              </div>
              <p className="text-white/40 text-xs mt-1">
                Joriy bosqich doirasi: <span className="text-indigo-400 font-bold uppercase">{STAGE_SCOPES[currentStage.scope_type]}</span> bo'yicha filterlangan.
              </p>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-center py-8 text-white/30 text-xs">Ishtirokchilar yo'q</p>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {leaderboard.map((entry, idx) => {
                  const isMe = String(entry.student_id) === String(localStorage.getItem('userId'));
                  const rank = idx + 1;
                  const colors = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-white/30';
                  
                  return (
                    <div 
                      key={entry.student_id || idx}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isMe ? 'bg-indigo-600/20 border-indigo-500/40 shadow shadow-indigo-500/5' : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 text-center font-black text-sm ${colors}`}>
                          {rank}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                            {entry.student_name}{isMe ? ' (Siz)' : ''}
                          </p>
                          <p className="text-[10px] text-white/30 mt-0.5 truncate">
                            {entry.region ? `${entry.region.substring(0,10)}. / ${entry.school_number}-maktab` : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black text-emerald-400">{entry.total_score || entry.score || 0} b</p>
                        <p className="text-[9px] text-white/30 font-mono mt-0.5">{entry.reading_wpm ? `${entry.reading_wpm} wpm` : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
