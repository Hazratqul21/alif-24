import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Info, Filter, 
  Calendar, RotateCcw, Search, Download, Trash2, Edit 
} from 'lucide-react';
import { classroomService } from '../../services/classroomService';
import { teacherService } from '../../services/teacherService';
import AssignmentDetailReport from './AssignmentDetailReport';

const GradebookMatrix = ({ classroomId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 14))); // Default last 14 days
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchGradebook();
  }, [classroomId, startDate]);

  const fetchGradebook = async () => {
    setLoading(true);
    try {
      const end = new Date(startDate);
      end.setDate(end.getDate() + (viewMode === 'week' ? 7 : 30));
      
      const res = await classroomService.getGradebook(classroomId, startDate.toISOString(), end.toISOString());
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
    if (score === null || score === undefined) return 'text-white/20';
    const pct = (score / (max || 100)) * 100;
    if (pct >= 85) return 'text-green-400';
    if (pct >= 70) return 'text-blue-400';
    if (pct >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p>Jurnal yuklanmoqda...</p>
      </div>
    );
  }

  const students = data?.students?.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  const assignments = data?.assignments || [];
  const matrix = data?.matrix || {};

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-lg text-white/60 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="bg-white/5 px-4 py-2 rounded-xl text-white font-medium flex items-center gap-2">
            <Calendar size={16} className="text-indigo-400" />
            {startDate.toLocaleDateString('uz', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-lg text-white/60 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text" 
              placeholder="O'quvchini qidirish..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50 w-64"
            />
          </div>
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >Hafta</button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >Oy</button>
          </div>
          <button onClick={fetchGradebook} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 transition-all border border-white/10">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto custom-scrollbar" ref={scrollRef}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/5">
                {/* ID & Name Headers (Sticky) */}
                <th className="sticky left-0 z-20 bg-[#1e1e3a] p-4 text-left border-b border-r border-white/10 min-w-[60px] text-white/40 text-[10px] uppercase tracking-wider font-bold">ID</th>
                <th className="sticky left-[60px] z-20 bg-[#1e1e3a] p-4 text-left border-b border-r border-white/10 min-w-[200px] text-white/40 text-[10px] uppercase tracking-wider font-bold">O'quvchi</th>
                
                {/* Assignment Headers */}
                {assignments.length === 0 ? (
                  <th className="p-4 text-left border-b border-white/10 text-white/20 italic font-normal">Bu vaqt oralig'ida vazifalar yo'q</th>
                ) : (
                  assignments.map(a => (
                    <th key={a.id} className="p-4 text-center border-b border-r border-white/10 min-w-[140px] group relative cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setSelectedAssignment(a)}>
                      <div className="text-[10px] text-indigo-400 font-bold mb-1 uppercase tracking-tighter">
                        {new Date(a.date).toLocaleDateString('uz', { day: '2-digit', month: '2-digit' })}
                      </div>
                      <div className="text-white font-bold text-xs truncate max-w-[120px]">{a.title}</div>
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={14} className="text-white/40 bg-white/10 rounded-full mx-auto p-0.5 hover:text-white" />
                      </div>
                    </th>
                  ))
                )}
                
                {/* Global Headers */}
                <th className="p-4 text-center border-b border-white/10 min-w-[100px] bg-indigo-600/10">
                  <div className="text-[10px] text-white/40 font-bold uppercase mb-1">Reyting</div>
                  <div className="text-white font-black text-sm">#</div>
                </th>
                <th className="p-4 text-center border-b border-white/10 min-w-[100px] bg-green-600/10">
                  <div className="text-[10px] text-white/40 font-bold uppercase mb-1">Baho</div>
                  <div className="text-white font-black text-sm">AVG</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={assignments.length + 4} className="p-20 text-center text-white/20">
                    <div className="flex flex-col items-center">
                      <Search size={40} className="mb-4 opacity-10" />
                      O'quvchilar topilmadi
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const studentMatrix = matrix[student.id] || {};
                  
                  // Calculate average and rank (mock logic for now)
                  const scores = Object.values(studentMatrix).map(m => m.score).filter(s => s !== null);
                  const avg = scores.length > 0 ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1) : '-';

                  return (
                    <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                      <td className="sticky left-0 z-10 bg-[#1e1e3a] p-4 border-b border-r border-white/10 text-white/40 text-xs font-mono group-hover:bg-indigo-950/30 transition-colors">
                        {student.id.slice(-4)}
                      </td>
                      <td className="sticky left-[60px] z-10 bg-[#1e1e3a] p-4 border-b border-r border-white/10 group-hover:bg-indigo-950/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/5">
                            {student.first_name.charAt(0)}
                          </div>
                          <div className="font-bold text-white text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]">
                            {student.last_name} {student.first_name}
                          </div>
                        </div>
                      </td>

                      {/* Scores */}
                      {assignments.map(a => {
                        const sub = studentMatrix[a.id];
                        return (
                          <td key={a.id} className="p-4 text-center border-b border-r border-white/10 transition-colors relative group/cell">
                            <div className={`font-black text-lg ${getScoreColor(sub?.score, a.max_score)}`}>
                              {sub?.score !== undefined ? sub.score : '-'}
                            </div>
                            {sub?.status === 'pending' && <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-white/20" title="Kutilmoqda" />}
                            
                            {/* Hover Edit Action */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 bg-indigo-600/20 backdrop-blur-[2px] transition-all cursor-pointer">
                               <Edit size={14} className="text-white" />
                            </div>
                          </td>
                        );
                      })}

                      {/* Global stats columns per student */}
                      <td className="p-4 text-center border-b border-white/10 bg-indigo-600/5 font-black text-indigo-400 text-lg">
                        {idx + 1}
                      </td>
                      <td className="p-4 text-center border-b border-white/10 bg-green-600/5 font-black text-green-400 text-lg">
                        {avg}
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Bottom row for adding students directly */}
              <tr className="hover:bg-white/5 transition-colors cursor-pointer border-t border-white/10">
                <td colSpan={2} className="p-4 text-white/40 text-xs text-center border-r border-white/10">
                  <div className="flex items-center justify-center gap-2">
                    <Plus size={14} className="text-green-500" /> Yangi o'quvchi qo'shish
                  </div>
                </td>
                {assignments.map(a => (
                   <td key={a.id} className="p-4 border-r border-white/10"></td>
                ))}
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Detail Modal */}
      {selectedAssignment && (
        <AssignmentDetailReport 
          assignment={selectedAssignment} 
          onClose={() => setSelectedAssignment(null)} 
        />
      )}

      {/* Custom Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default GradebookMatrix;
