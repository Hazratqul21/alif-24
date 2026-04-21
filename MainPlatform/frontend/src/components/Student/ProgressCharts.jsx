import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, Award } from 'lucide-react';

const ProgressCharts = ({ performanceData }) => {
  const { trend = [], subjects = [] } = performanceData || {};

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
      <div className="bg-indigo-900 border border-indigo-700 rounded-[2rem] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-300">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold">O'zlashtirish trendi</h3>
            <p className="text-indigo-300 text-xs">Oxirgi 30 kunlik natijalar</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayTrend}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fill: '#a5b4fc', fontSize: 10 }}
                tickFormatter={(val) => val.split('-').slice(1).join('/')}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                tick={{ fill: '#a5b4fc', fontSize: 10 }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #4338ca', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#a5b4fc', fontWeight: 'bold' }}
                labelStyle={{ color: '#e0e7ff' }}
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
      <div className="bg-purple-900 border border-purple-700 rounded-[2rem] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-500/30 rounded-xl flex items-center justify-center text-purple-300">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold">Fanlar Mastery</h3>
            <p className="text-purple-300 text-xs">Bilim sohalari qamrovi</p>
          </div>
        </div>

        <div className="h-64 w-full flex justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={displaySubjects}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#d8b4fe', fontSize: 10 }}
              />
              <Radar
                name="Ball"
                dataKey="score"
                stroke="#a855f7"
                fill="#a855f7"
                fillOpacity={0.4}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#3b0764', border: '1px solid #7c3aed', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#d8b4fe' }}
                labelStyle={{ color: '#f3e8ff' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ProgressCharts;