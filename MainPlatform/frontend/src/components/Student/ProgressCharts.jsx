import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, Award, BarChart3 } from 'lucide-react';

const ProgressCharts = ({ performanceData }) => {
  const { trend = [], subjects = [] } = performanceData || {};

  // Mock data if real data is empty
  const displayTrend = trend.length > 0 ? trend : [
    { date: '2026-04-15', score: 85 },
    { date: '2026-04-16', score: 90 },
    { date: '2026-04-17', score: 88 },
    { date: '2026-04-18', score: 95 },
  ];

  const displaySubjects = subjects.length > 0 ? subjects : [
    { subject: 'Matematika', score: 95 },
    { subject: 'Ona tili', score: 80 },
    { subject: 'Ingliz tili', score: 85 },
    { subject: 'IT', score: 90 },
    { subject: 'Mantiq', score: 75 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Trend */}
      <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 backdrop-blur-xl">
         <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
               <TrendingUp className="w-5 h-5" />
            </div>
            <div>
               <h3 className="text-white font-bold">O'zlashtirish trendi</h3>
               <p className="text-white/30 text-xs">Oxirgi 30 kunlik natijalar</p>
            </div>
         </div>
         
         <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={displayTrend}>
                 <defs>
                   <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                 <XAxis 
                   dataKey="date" 
                   stroke="rgba(255,255,255,0.2)" 
                   fontSize={10} 
                   tickFormatter={(val) => val.split('-').slice(1).join('/')}
                 />
                 <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} domain={[0, 100]} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: '12px', color: '#fff' }}
                   itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                 />
                 <Area 
                   type="monotone" 
                   dataKey="score" 
                   stroke="#6366f1" 
                   strokeWidth={3}
                   fillOpacity={1} 
                   fill="url(#colorScore)" 
                 />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Subject Mastery Radar */}
      <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 backdrop-blur-xl">
         <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
               <Award className="w-5 h-5" />
            </div>
            <div>
               <h3 className="text-white font-bold">Fanlar Mastery</h3>
               <p className="text-white/30 text-xs">Bilim sohalari qamrovi</p>
            </div>
         </div>

         <div className="h-64 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
               <RadarChart cx="50%" cy="50%" outerRadius="80%" data={displaySubjects}>
                 <PolarGrid stroke="rgba(255,255,255,0.05)" />
                 <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                 <Radar
                   name="Ball"
                   dataKey="score"
                   stroke="#8b5cf6"
                   fill="#8b5cf6"
                   fillOpacity={0.5}
                 />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: '12px', color: '#fff' }}
                 />
               </RadarChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

export default ProgressCharts;
