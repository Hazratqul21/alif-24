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
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 14))); // Default last 2 weeks for compact view
  const [viewMode, setViewMode] = useState('week'); 
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const scrollRef = useRef(null);
  const dateInputRef = useRef(null);

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

  const handleDayShift = (days) => {
    const next = new Date(startDate);
    next.setDate(next.getDate() + days);
    setStartDate(next);
  };

  const getScoreColor = (score, max) => {
    if (score === null || score === undefined) return 'text-white/10';
    return 'text-[#ffd700]'; 
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-white/40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-sm">Jurnal yuklanmoqda...</p>
      </div>
    );
  }

  const allStudents = data?.students || [];
  const assignments = data?.assignments || [];
  const matrix = data?.matrix || {};

  const studentsWithStats = allStudents.map(student => {
    const studentMatrix = matrix[student.id] || {};
    const scores = Object.values(studentMatrix).map(m => m.score).filter(s => s !== null);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { ...student, avg, scoresCount: scores.length };
  });

  const rankedStudents = [...studentsWithStats].sort((a, b) => b.avg - a.avg);
  const students = rankedStudents.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRank = (studentId) => {
    return rankedStudents.findIndex(s => s.id === studentId) + 1;
  };

  // Generate 3-day window for the picker
  const dayWindow = [0, 1, 2].map(offset => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offset);
    return d;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-full overflow-hidden">
      {/* Compact Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#1e1e3a]/60 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} className="p-1.5 hover:bg-white/10 rounded-full text-white/40 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div 
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
              className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl text-white font-bold flex items-center gap-2 cursor-pointer hover:bg-white/10 relative"
            >
              <Calendar size={14} className="text-indigo-400" />
              <span className="text-xs uppercase whitespace-nowrap">
                {startDate.getFullYear()} M{(startDate.getMonth() + 1).toString().padStart(2, '0')}
              </span>
              <input 
                type="date" 
                ref={dateInputRef} 
                className="absolute opacity-0 w-0 h-0" 
                onChange={(e) => setStartDate(new Date(e.target.value))}
              />
            </div>
            <button onClick={handleNext} className="p-1.5 hover:bg-white/10 rounded-full text-white/40 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
             <button onClick={() => handleDayShift(-1)} className="p-1 text-white/20 hover:text-white transition-colors"><ChevronLeft size={14}/></button>
             {dayWindow.map((d, i) => (
               <div key={i} className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm transition-all cursor-pointer ${i === 0 ? 'bg-[#ffd700] text-[#1e1e3a]' : 'text-white/40 hover:bg-white/10'}`}>
                 {d.getDate()}
               </div>
             ))}
             <button onClick={() => handleDayShift(1)} className="p-1 text-white/20 hover:text-white transition-colors"><ChevronRight size={14}/></button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            <input 
              type="text" 
              placeholder="Qidirish..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none focus:border-indigo-500/50 w-full md:w-48 transition-all placeholder:text-white/10"
            />
          </div>
          
          <div className="flex p-1 bg-[#4b30fb]/10 rounded-xl border border-[#4b30fb]/20 shrink-0">
            <button onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider ${viewMode === 'week' ? 'bg-[#4b30fb] text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >Hafta</button>
            <button onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider ${viewMode === 'month' ? 'bg-[#4b30fb] text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >Oy</button>
          </div>

          <button onClick={fetchGradebook} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 transition-all border border-white/10 shrink-0">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Compact Matrix Table */}
      <div className="bg-[#1e1e3a]/40 rounded-2xl border border-white/5 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto custom-scrollbar" ref={scrollRef}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="sticky left-0 z-30 bg-[#1e1e3a] p-3 text-left border-b border-r border-white/5 min-w-[50px] text-white/20 text-[9px] uppercase tracking-widest font-black">ID</th>
                <th className="sticky left-[50px] z-30 bg-[#1e1e3a] p-3 text-left border-b border-r border-white/5 min-w-[180px] text-white/20 text-[9px] uppercase tracking-widest font-black">O'quvchi</th>
                
                {assignments.length === 0 ? (
                  <th className="p-4 text-left border-b border-white/5 text-white/10 italic text-xs font-medium">Topshiriqlar yo'q</th>
                ) : (
                  assignments.map(a => (
                    <th key={a.id} className="p-3 text-center border-b border-r border-white/5 min-w-[110px] group relative cursor-pointer hover:bg-white/5 transition-all" onClick={() => setSelectedAssignment(a)}>
                      <div className="text-white font-bold text-sm tracking-tight truncate max-w-[100px] mx-auto mb-0.5">{a.title}</div>
                      <div className="text-[9px] text-white/20 font-black uppercase tracking-wider">
                        {new Date(a.date).toLocaleDateString('uz', { day: '2-digit', month: 'short' })}
                      </div>
                    </th>
                  ))
                )}
                
                <th className="p-3 text-center border-b border-r border-white/5 min-w-[90px] bg-white/5">
                  <div className="text-white font-bold text-xs">O'rtacha</div>
                </th>
                <th className="p-3 text-center border-b border-white/5 min-w-[80px] bg-white/5">
                   <div className="text-white font-bold text-xs">Reyting</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={assignments.length + 4} className="p-10 text-center text-white/10">
                    <p className="text-sm">O'quvchilar topilmadi</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const studentMatrix = matrix[student.id] || {};
                  const rank = getRank(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="sticky left-0 z-20 bg-[#1e1e3a] p-3 border-r border-white/5 text-white/20 text-[10px] font-mono group-hover:bg-[#25254a] transition-colors">
                        {student.id.slice(-4)}
                      </td>
                      <td className="sticky left-[50px] z-20 bg-[#1e1e3a] p-3 border-r border-white/5 group-hover:bg-[#25254a] transition-colors">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-lg ${
                            rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 
                            rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                            rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                            'bg-indigo-600/50'
                          }`}>
                            {student.first_name.charAt(0)}
                          </div>
                          <div className="font-bold text-white tracking-tight truncate max-w-[140px]">
                            {student.last_name} {student.first_name}
                          </div>
                        </div>
                      </td>

                      {/* Scores */}
                      {assignments.map(a => {
                        const sub = studentMatrix[a.id];
                        return (
                          <td key={a.id} className="p-3 text-center border-r border-white/5 transition-all relative group/cell">
                            <div className={`font-bold text-xl tracking-tighter ${getScoreColor(sub?.score, a.max_score)}`}>
                              {sub?.score !== undefined ? sub.score : '-'}
                            </div>
                            {sub?.status === 'pending' && <div className="absolute right-2 top-2 w-1 h-1 rounded-full bg-yellow-500 animate-pulse" />}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 bg-indigo-600/10 backdrop-blur-[1px] transition-all cursor-pointer">
                               <Edit size={14} className="text-white/60" />
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-3 text-center border-r border-white/5 bg-white/[0.02]">
                        <div className="font-bold text-lg text-[#ffd700] opacity-80">
                          {student.avg > 0 ? student.avg.toFixed(1) : '-'}
                        </div>
                      </td>
                      <td className="p-3 text-center bg-white/[0.02]">
                        <div className="font-bold text-xl text-white opacity-90">
                          {rank}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.01); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        @media (max-width: 768px) {
          .sticky { position: static !important; }
        }
      `}</style>
    </div>
  );
};

export default GradebookMatrix;
