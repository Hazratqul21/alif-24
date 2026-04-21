import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Eye, Clock, Users, CheckCircle } from 'lucide-react';

const DAYS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

const AssignmentCalendar = ({ assignments = [], onAssignmentClick }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Previous month trailing days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: null });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, isCurrentMonth: true, date: dateStr });
    }

    // Next month leading days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, date: null });
    }

    return days;
  }, [currentMonth, currentYear]);

  // Map assignments to dates
  const assignmentsByDate = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      if (a.due_date) {
        const dateStr = a.due_date.split('T')[0];
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(a);
      }
    });
    return map;
  }, [assignments]);

  const selectedAssignments = selectedDate ? (assignmentsByDate[selectedDate] || []) : [];
  const todayStr = today.toISOString().split('T')[0];

  const getTypeColor = (type) => {
    switch (type) {
      case 'test': return 'bg-purple-500';
      case 'homework': return 'bg-blue-500';
      case 'reading': return 'bg-green-500';
      case 'project': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'test': return 'Test';
      case 'homework': return 'Uy vazifasi';
      case 'reading': return "O'qish";
      case 'project': return 'Loyiha';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-white font-bold text-lg min-w-[180px] text-center">
              {MONTHS_UZ[currentMonth]} {currentYear}
            </h3>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={goToToday} className="px-3 py-1.5 bg-[#4b30fb]/20 text-[#4b30fb] rounded-lg text-xs font-bold hover:bg-[#4b30fb]/30 transition-colors">
            Bugun
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-t border-white/5">
          {DAYS_UZ.map(d => (
            <div key={d} className="p-2 text-center text-white/30 text-xs font-bold uppercase">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, i) => {
            const hasAssignments = cell.date && assignmentsByDate[cell.date]?.length > 0;
            const isToday = cell.date === todayStr;
            const isSelected = cell.date === selectedDate;
            const assignmentCount = cell.date ? (assignmentsByDate[cell.date]?.length || 0) : 0;

            return (
              <button
                key={i}
                onClick={() => cell.date && setSelectedDate(cell.date)}
                disabled={!cell.isCurrentMonth}
                className={`relative p-2 min-h-[60px] border-t border-r border-white/5 text-left transition-all
                  ${!cell.isCurrentMonth ? 'opacity-20 cursor-default' : 'cursor-pointer hover:bg-white/5'}
                  ${isSelected ? 'bg-[#4b30fb]/20 ring-1 ring-[#4b30fb]/40' : ''}
                  ${isToday ? 'bg-white/5' : ''}`}
              >
                <span className={`text-xs font-bold ${isToday ? 'text-[#4b30fb] bg-[#4b30fb]/20 w-6 h-6 rounded-full flex items-center justify-center' : 'text-white/60'}`}>
                  {cell.day}
                </span>
                {hasAssignments && (
                  <div className="flex gap-0.5 mt-1 flex-wrap">
                    {assignmentsByDate[cell.date].slice(0, 3).map((a, j) => (
                      <div key={j} className={`w-1.5 h-1.5 rounded-full ${getTypeColor(a.assignment_type)}`} />
                    ))}
                    {assignmentCount > 3 && <span className="text-[8px] text-white/30">+{assignmentCount - 3}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Assignments */}
      {selectedDate && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <h4 className="text-white/60 text-xs font-bold uppercase tracking-wider">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('uz', { weekday: 'long', day: 'numeric', month: 'long' })}
            <span className="ml-2 text-white/30">({selectedAssignments.length} ta vazifa)</span>
          </h4>

          {selectedAssignments.length === 0 ? (
            <p className="text-white/30 text-sm py-4 text-center">Bu kunga vazifa belgilanmagan</p>
          ) : (
            <div className="space-y-2">
              {selectedAssignments.map(a => (
                <div key={a.id} onClick={() => onAssignmentClick?.(a.id)}
                  className="flex items-center gap-3 p-3 bg-black/20 rounded-xl cursor-pointer hover:bg-black/30 transition-colors group">
                  <div className={`w-1 h-10 rounded-full ${getTypeColor(a.assignment_type)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate group-hover:text-[#4b30fb] transition-colors">{a.title}</div>
                    <div className="flex items-center gap-3 text-white/30 text-xs mt-0.5">
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {getTypeLabel(a.assignment_type)}</span>
                      {a.total_students > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {a.total_students}</span>}
                      {a.submitted_count > 0 && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {a.submitted_count}</span>}
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-2">
        {[
          { type: 'test', label: 'Test' },
          { type: 'homework', label: 'Uy vazifasi' },
          { type: 'reading', label: "O'qish" },
          { type: 'project', label: 'Loyiha' },
        ].map(item => (
          <div key={item.type} className="flex items-center gap-1.5 text-white/30 text-[10px]">
            <div className={`w-2 h-2 rounded-full ${getTypeColor(item.type)}`} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssignmentCalendar;
