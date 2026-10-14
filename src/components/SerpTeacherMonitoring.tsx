import React, { useMemo, useState } from 'react';
import { Teacher } from '../types';
import { Clock } from 'lucide-react';

interface DailyLog {
  date: string;
  teacherId: string;
}

interface SerpTeacherMonitoringProps {
  logs: DailyLog[];
  teachers: Teacher[];
}

export default function SerpTeacherMonitoring({ logs, teachers }: SerpTeacherMonitoringProps) {
  const [pendingStartDate, setPendingStartDate] = useState<string>(() => {
    return localStorage.getItem('serp_monitor_start_date') || 
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        return d.toISOString().split('T')[0];
      })();
  });

  const [pendingEndDate, setPendingEndDate] = useState<string>(() => {
    return localStorage.getItem('serp_monitor_end_date') || 
      (() => {
        return new Date().toISOString().split('T')[0];
      })();
  });

  const handlePendingStartDateChange = (val: string) => {
    setPendingStartDate(val);
    localStorage.setItem('serp_monitor_start_date', val);
  };

  const handlePendingEndDateChange = (val: string) => {
    setPendingEndDate(val);
    localStorage.setItem('serp_monitor_end_date', val);
  };

  const teacherPendingData = useMemo(() => {
    if (!pendingStartDate || !pendingEndDate) return [];
    const start = new Date(pendingStartDate);
    const end = new Date(pendingEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    const datesList: string[] = [];
    const current = new Date(start);
    const todayStr = new Date().toISOString().split('T')[0];
    let limit = 0;
    while (current <= end && limit < 150) {
      const dateStr = current.toISOString().split('T')[0];
      if (dateStr <= todayStr) {
        datesList.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
      limit++;
    }

    const teacherData = teachers
      .filter(t => t.role === 'teacher')
      .map(teacher => {
       const teacherLogs = new Set(logs.filter(l => l.teacherId === teacher.id).map(l => l.date));
       const pendingDates = datesList.filter(d => !teacherLogs.has(d)).sort((a, b) => b.localeCompare(a));
       return {
          teacher,
          pendingCount: pendingDates.length,
          pendingDates
       };
    });

    return teacherData.sort((a, b) => b.pendingCount - a.pendingCount);
  }, [logs, teachers, pendingStartDate, pendingEndDate]);

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Teacher Daily Log Monitoring</h2>
            <p className="text-xs text-slate-500 font-semibold">Track pending daily logs across all SERP teachers</p>
          </div>
        </div>

        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div>
                 <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Start Date</label>
                 <input 
                    type="date"
                    value={pendingStartDate}
                    onChange={(e) => handlePendingStartDateChange(e.target.value)}
                    className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-rose-500 outline-none"
                 />
              </div>
              <div>
                 <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">End Date</label>
                 <input 
                    type="date"
                    value={pendingEndDate}
                    onChange={(e) => handlePendingEndDateChange(e.target.value)}
                    className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-rose-500 outline-none"
                 />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherPendingData.map((data) => (
                 <div key={data.teacher.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                       <h3 className="text-sm font-black text-slate-800">{data.teacher.name}</h3>
                       {data.pendingCount > 0 ? (
                           <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest">{data.pendingCount} Pending Logs</p>
                       ) : (
                           <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">All caught up! 🎉</p>
                       )}
                    </div>
                    {data.pendingCount > 0 && (
                       <div className="mt-4 pt-3 border-t border-slate-200">
                           <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                              {data.pendingDates.map(d => (
                                 <span key={d} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] font-bold">
                                    {d}
                                 </span>
                              ))}
                           </div>
                       </div>
                    )}
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
