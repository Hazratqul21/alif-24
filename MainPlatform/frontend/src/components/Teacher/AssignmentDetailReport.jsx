import React, { useState, useEffect } from 'react';
import { X, Trophy, Clock, CheckCircle, XCircle, BarChart3, Download } from 'lucide-react';
import { teacherService } from '../../services/teacherService';

const AssignmentDetailReport = ({ assignment, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [assignment.id]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await teacherService.getAssignmentReport(assignment.id);
      setReport(res.data);
    } catch (err) {
      console.error("Report fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#1a1a2e] p-10 rounded-3xl border border-white/10 flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-white/60">Tahlil hisoboti tayyorlanmoqda...</p>
        </div>
      </div>
    );
  }

  const results = report?.results || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 lg:p-10 animate-in fade-in zoom-in duration-300">
      <div className="bg-[#1a1a2e] w-full max-w-6xl max-h-[90vh] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 lg:p-8 flex items-center justify-between bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">
                {assignment.type === 'test' ? 'Onlayn Test' : 'Mustaqil ish'}
              </span>
              <h2 className="text-2xl font-black text-white">{assignment.title}</h2>
            </div>
            <p className="text-white/40 text-sm">Vazifa bo'yicha batafsil statistik tahlil</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/10"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 lg:p-8 border-b border-white/5 bg-white/[0.02]">
           <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                <BarChart3 size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black text-white/30 uppercase">Topshirdi</div>
                <div className="text-xl font-black text-white">{results.filter(r => r.status !== 'pending').length} / {results.length}</div>
              </div>
           </div>
           <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black text-white/30 uppercase">O'rtacha Ball</div>
                <div className="text-xl font-black text-white">
                  {(results.reduce((acc, r) => acc + (r.score || 0), 0) / (results.filter(r => r.status !== 'pending').length || 1)).toFixed(1)}
                </div>
              </div>
           </div>
           <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-400">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black text-white/30 uppercase">O'rtacha Vaqt</div>
                <div className="text-xl font-black text-white">
                  {Math.round(results.reduce((acc, r) => acc + (r.time_spent_seconds || 0), 0) / (results.filter(r => r.status !== 'pending').length || 1))}s
                </div>
              </div>
           </div>
           <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center justify-center">
              <button className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/20">
                <Download size={14} /> EXCEL YUKLASH
              </button>
           </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-white/10">
                <th className="pb-4 text-[10px] font-black text-white/30 uppercase tracking-widest pl-4">ID</th>
                <th className="pb-4 text-[10px] font-black text-white/30 uppercase tracking-widest">O'quvchi</th>
                <th className="pb-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Savollar</th>
                <th className="pb-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">To'g'ri</th>
                <th className="pb-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Xato</th>
                <th className="pb-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Vaqt</th>
                <th className="pb-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Baho</th>
                <th className="pb-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Reyting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.map((res, i) => (
                <tr key={res.student_id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="py-4 pl-4 text-xs font-mono text-white/30">{res.student_id.slice(-4)}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 text-xs font-black">
                        {res.student_first_name.charAt(0)}
                      </div>
                      <div className="text-sm font-bold text-white">{res.student_last_name} {res.student_first_name}</div>
                    </div>
                  </td>
                  <td className="py-4 text-center font-bold text-white/60">{res.total_questions || '-'}</td>
                  <td className="py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-green-500/10 text-green-500 font-black">
                      {res.correct_count}
                    </span>
                  </td>
                  <td className="py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-500/10 text-red-500 font-black">
                      {res.incorrect_count}
                    </span>
                  </td>
                  <td className="py-4 text-center font-mono text-xs text-white/40">
                    {res.status !== 'pending' ? `${Math.floor((res.time_spent_seconds || 0) / 60)}:${((res.time_spent_seconds || 0) % 60).toString().padStart(2, '0')}` : '-'}
                  </td>
                  <td className="py-4 text-center">
                    <div className="text-lg font-black text-white">{res.score || '-'}</div>
                  </td>
                  <td className="py-4 text-center">
                    {res.rank ? (
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black ${
                        res.rank === 1 ? 'bg-yellow-500 text-black' : 
                        res.rank === 2 ? 'bg-slate-300 text-black' :
                        res.rank === 3 ? 'bg-amber-600 text-white' :
                        'bg-white/10 text-white/60'
                      }`}>
                        {res.rank === 1 && <Trophy size={10} />}
                        {res.rank}-o'rin
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/20 font-bold uppercase">Topshirmadi</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end">
           <button onClick={onClose} className="px-10 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-black text-sm rounded-2xl transition-all border border-white/10">
             YOPISH
           </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AssignmentDetailReport;
