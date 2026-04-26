import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Info, Filter, 
  Calendar, RotateCcw, Search, Download, Trash2, Edit,
  TrendingUp, Award, Star
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';
import AssignmentDetailReport from './AssignmentDetailReport';

const GradebookMatrix = ({ classroomId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 180))); 
  const [viewMode, setViewMode] = useState('week'); 
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchGradebook();
  }, [classroomId, startDate, viewMode]);

  const fetchGradebook = async () => {
    setLoading(true);
    try {
      const end = new Date(startDate);
      end.setDate(end.getDate() + (viewMode === 'week' ? 7 : 30));
      
      const res = await teacherService.getGradebook(classroomId, startDate.toISOString(), end.toISOString());
      setData(res.data);
    } catch (err) {
      console.error("Gradebook fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const next = new Date(startDate);
    next.setDate(next.getDate() + (viewMode === 'week' ? 7 : 30));
    setStartDate(next);
  };

  const handlePrev = () => {
    const prev = new Date(startDate);
    prev.setDate(prev.getDate() - (viewMode === 'week' ? 7 : 30));
    setStartDate(prev);
  };

  const getScoreColor = (score, max) => {
    if (score === null || score === undefined) return 'text-white/10';
    return 'text-[#ffd700]'; // Golden color as per screenshot
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p>Jurnal yuklanmoqda...</p>
      </div>
    );
  }

  const allStudents = data?.students || [];
  const assignments = data?.assignments || [];
  const matrix = data?.matrix || {};

  // Calculate stats and sort for ranking
  const studentsWithStats = allStudents.map(student => {
    const studentMatrix = matrix[student.id] || {};
    const scores = Object.values(studentMatrix).map(m => m.score).filter(s => s !== null);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { ...student, avg, scoresCount: scores.length };
  });

  // Sort by average for ranking
  const rankedStudents = [...studentsWithStats].sort((a, b) => b.avg - a.avg);
  
  // Apply search filter
  const students = rankedStudents.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRank = (studentId) => {
    return rankedStudents.findIndex(s => s.id === studentId) + 1;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Premium Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1e1e3a]/40 p-4 rounded-[2rem] border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-full text-white/40 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <div className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl text-white font-bold flex items-center gap-3">
              <Calendar size={18} className="text-indigo-400" />
              <span className="tracking-tight uppercase text-sm">
                {startDate.getFullYear()} M{(startDate.getMonth() + 1).toString().padStart(2, '0')}
              </span>
            </div>
            <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-full text-white/40 transition-colors">
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
             {[27, 28, 29].map(day => (
               <div key={day} className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-lg transition-all cursor-pointer ${day === 27 ? 'bg-[#ffd700] text-[#1e1e3a]' : 'text-white/40 hover:bg-white/10'}`}>
                 {day}
               </div>
             ))}
             <ChevronRight size={18} className="mx-2 text-white/20" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              type="text" 
              placeholder="O'quvchini qidirish..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 w-72 transition-all placeholder:text-white/10"
            />
          </div>
          
          <div className="flex p-1.5 bg-[#4b30fb]/10 rounded-2xl border border-[#4b30fb]/20">
            <button 
              onClick={() => setViewMode('week')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${viewMode === 'week' ? 'bg-[#4b30fb] text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >Hafta</button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${viewMode === 'month' ? 'bg-[#4b30fb] text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >Oy</button>
          </div>

          <button onClick={fetchGradebook} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 transition-all border border-white/10">
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* Premium Matrix Table */}
      <div className="bg-[#1e1e3a]/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl backdrop-blur-2xl">
        <div className="overflow-x-auto custom-scrollbar" ref={scrollRef}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="sticky left-0 z-30 bg-[#1e1e3a] p-6 text-left border-b border-r border-white/5 min-w-[80px] text-white/20 text-[10px] uppercase tracking-[0.2em] font-black">ID</th>
                <th className="sticky left-[80px] z-30 bg-[#1e1e3a] p-6 text-left border-b border-r border-white/5 min-w-[280px] text-white/20 text-[10px] uppercase tracking-[0.2em] font-black">O'quvchi</th>
                
                {assignments.length === 0 ? (
                  <th className="p-6 text-left border-b border-white/5 text-white/10 italic font-medium">Hozircha vazifalar mavjud emas</th>
                ) : (
                  assignments.map(a => (
                    <th key={a.id} className="p-6 text-center border-b border-r border-white/5 min-w-[180px] group relative cursor-pointer hover:bg-white/5 transition-all" onClick={() => setSelectedAssignment(a)}>
                      <div className="text-white font-bold text-2xl tracking-tight leading-tight mb-1">{a.title}</div>
                      <div className="text-[10px] text-white/20 font-black uppercase tracking-[0.15em]">
                        {new Date(a.date).toLocaleDateString('uz', { day: '2-digit', month: 'short' })}
                      </div>
                    </th>
                  ))
                )}
                
                <th className="p-6 text-center border-b border-r border-white/5 min-w-[160px] bg-white/5">
                  <div className="text-white font-bold text-xl tracking-tight mb-1">Umumiy baho</div>
                </th>
                <th className="p-6 text-center border-b border-white/5 min-w-[160px] bg-white/5">
                   <div className="text-white font-bold text-3xl tracking-tighter flex items-center justify-center gap-2">
                     Reyting <ChevronRight size={20} className="text-[#ffd700] rotate-90" />
                   </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={assignments.length + 4} className="p-32 text-center text-white/10">
                    <div className="flex flex-col items-center gap-4">
                      <Search size={64} className="opacity-5" />
                      <p className="text-xl font-medium tracking-tight">O'quvchilar ro'yxati bo'sh</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const studentMatrix = matrix[student.id] || {};
                  const rank = getRank(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="sticky left-0 z-20 bg-[#1e1e3a] p-6 border-r border-white/5 text-white/20 text-sm font-mono group-hover:bg-[#25254a] transition-colors">
                        {student.id.slice(-4)}
                      </td>
                      <td className="sticky left-[80px] z-20 bg-[#1e1e3a] p-6 border-r border-white/5 group-hover:bg-[#25254a] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-xl ${
                            rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 
                            rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                            rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                            'bg-indigo-600/50'
                          }`}>
                            {student.first_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-lg tracking-tight group-hover:text-indigo-400 transition-colors">
                              {student.last_name} {student.first_name}
                            </div>
                            <div className="text-[10px] text-white/20 uppercase tracking-widest font-bold">O'quvchi</div>
                          </div>
                        </div>
                      </td>

                      {/* Scores */}
                      {assignments.map(a => {
                        const sub = studentMatrix[a.id];
                        return (
                          <td key={a.id} className="p-6 text-center border-r border-white/5 transition-all relative group/cell">
                            <div className={`font-bold text-[42px] leading-none tracking-tighter ${getScoreColor(sub?.score, a.max_score)}`}>
                              {sub?.score !== undefined ? sub.score : '-'}
                            </div>
                            {sub?.status === 'pending' && <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Kutilmoqda" />}
                            
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 bg-indigo-600/10 backdrop-blur-[2px] transition-all cursor-pointer">
                               <Edit size={24} className="text-white/80" />
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-6 text-center border-r border-white/5 bg-white/[0.02]">
                        <div className="font-bold text-[38px] text-[#ffd700] tracking-tighter opacity-80">
                          {student.avg > 0 ? student.avg.toFixed(1) : '-'}
                        </div>
                      </td>
                      <td className="p-6 text-center bg-white/[0.02]">
                        <div className="font-bold text-[56px] text-white leading-none tracking-tighter opacity-90">
                          {rank}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              
              <tr className="hover:bg-white/[0.03] transition-all cursor-pointer">
                <td colSpan={2} className="p-8 text-white/30 text-sm text-center border-r border-white/5">
                  <div className="flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px]">
                    <Plus size={18} className="text-green-500" /> Yangi o'quvchi qo'shish
                  </div>
                </td>
                {assignments.map(a => (
                   <td key={a.id} className="border-r border-white/5"></td>
                ))}
                <td colSpan={2} className="bg-white/[0.01]"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {selectedAssignment && (
        <AssignmentDetailReport 
          assignment={selectedAssignment} 
          onClose={() => setSelectedAssignment(null)} 
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.01); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); border: 2px solid transparent; background-clip: content-box; }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};

export default GradebookMatrix;
