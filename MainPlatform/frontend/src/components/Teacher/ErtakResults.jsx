import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BarChart3, Users, Clock, Award, 
  ChevronRight, Search, Filter, BookOpen, User 
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';

const ErtakResults = ({ ertak, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStoryAssignments = async () => {
      setLoading(true);
      try {
        // Fetch all assignments and filter by reference_id (story id)
        const res = await teacherService.getAssignments();
        const allAssignments = res.data?.assignments || [];
        const storyAssignments = allAssignments.filter(a => a.reference_id === ertak.id && a.reference_type === 'ertak');
        setAssignments(storyAssignments);
        
        if (storyAssignments.length > 0) {
          handleSelectAssignment(storyAssignments[0]);
        }
      } catch (e) {
        console.error('Error fetching story assignments:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStoryAssignments();
  }, [ertak.id]);

  const handleSelectAssignment = async (assignment) => {
    setSelectedAssignment(assignment);
    try {
      const res = await teacherService.getAssignmentDetail(assignment.id);
      setSubmissions(res.data?.submissions || []);
    } catch (e) {
      console.error('Error fetching assignment submissions:', e);
    }
  };

  const filteredSubmissions = submissions.filter(s => 
    !searchTerm || s.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-400" />
              Natijalar: {ertak.title}
            </h3>
            <p className="text-white/40 text-sm mt-1">O'quvchilarning o'qish natijalari</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-20 text-center">
          <Users className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <h4 className="text-white/60 font-bold mb-2">Hozircha natijalar yo'q</h4>
          <p className="text-white/30 text-sm max-w-xs mx-auto">
            Ushbu ertak hali biror sinfga yoki o'quvchiga vazifa sifatida berilmagan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Assignment Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="text-white/30 text-[10px] uppercase font-bold tracking-widest px-2">Vazifalar ro'yxati</div>
            {assignments.map(a => (
              <button
                key={a.id}
                onClick={() => handleSelectAssignment(a)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedAssignment?.id === a.id 
                  ? 'bg-orange-500/10 border-orange-500/30 text-white' 
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <div className="font-bold text-sm truncate">{a.title}</div>
                <div className="flex items-center gap-2 mt-2 text-[10px] opacity-60">
                  <Calendar size={10} /> {new Date(a.created_at).toLocaleDateString('uz')}
                </div>
              </button>
            ))}
          </div>

          {/* Submissions Main */}
          <div className="lg:col-span-3 space-y-4">
            {selectedAssignment && (
              <>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="O'quvchi ismini qidirish..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 text-sm"
                    />
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="p-4 text-white/40 text-xs font-bold uppercase tracking-wider">O'quvchi</th>
                        <th className="p-4 text-white/40 text-xs font-bold uppercase tracking-wider">Holat</th>
                        <th className="p-4 text-white/40 text-xs font-bold uppercase tracking-wider text-center">Ball</th>
                        <th className="p-4 text-white/40 text-xs font-bold uppercase tracking-wider text-right">Topshirildi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-20 text-center text-white/20">
                            Hech kim hali topshirmagan
                          </td>
                        </tr>
                      ) : (
                        filteredSubmissions.map(s => (
                          <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-xs border border-orange-500/10">
                                  {s.student_name?.charAt(0)}
                                </div>
                                <div className="text-white font-medium text-sm">{s.student_name}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                s.status === 'graded' ? 'bg-green-500/10 text-green-400' :
                                s.status === 'submitted' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-white/5 text-white/30'
                              }`}>
                                {s.status === 'graded' ? 'Baholangan' : 
                                 s.status === 'submitted' ? 'Topshirilgan' : 'Kutilmoqda'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="text-white font-bold">{s.score || '-'}<span className="text-white/20 text-[10px] ml-1">/ {selectedAssignment.max_score}</span></div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="text-white/40 text-xs">
                                {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('uz') : '-'}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Calendar = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

export default ErtakResults;
