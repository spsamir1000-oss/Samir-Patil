import { useState, useMemo } from 'react';
import { Teacher, Student, AttendanceRecord } from '../types';
import {
  Users,
  Shield,
  School,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
  CheckCircle,
  XCircle,
  TrendingUp,
  X,
  Plus,
  Calendar,
  UserCheck
} from 'lucide-react';

interface TeacherMonitoringProps {
  teachers: Teacher[];
  students: Student[];
  records: AttendanceRecord[];
}

const getPastWorkingDates = (daysCount: number) => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 60; i++) {
    if (dates.length >= daysCount) break;
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    
    // Day 0 is Sunday
    if (d.getDay() !== 0) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
  }
  return dates;
};

const formatDateWithDay = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      const dayName = days[d.getDay()];
      return `${formattedDate} (${dayName})`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

export default function TeacherMonitoring({ teachers, students, records }: TeacherMonitoringProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDaysLimit, setSelectedDaysLimit] = useState<number>(15);
  const [expandedTeachers, setExpandedTeachers] = useState<Record<string, boolean>>({});
  const [filterType, setFilterType] = useState<'days' | 'custom'>('days');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Get unique list of all schools in students dataset
  const allSchools = useMemo(() => {
    return Array.from(new Set(students.map(s => s.school)));
  }, [students]);

  // Fast O(1) set of existing records indexed by: school | std | div | date
  const recordKeySet = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      set.add(`${r.school.toLowerCase().trim()}|${r.std.toString().trim().toLowerCase()}|${r.div.toLowerCase().trim()}|${r.date}`);
    });
    return set;
  }, [records]);

  // Fast O(1) set of school holiday or leave (LH) dates indexed by: school | date
  const schoolHolidaySet = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.status === 'Holiday' || r.status === 'Leave') {
        set.add(`${r.school.toLowerCase().trim()}|${r.date}`);
      }
    });
    return set;
  }, [records]);

  // Active dates we are auditing
  const checkDates = useMemo(() => {
    if (filterType === 'days') {
      return getPastWorkingDates(selectedDaysLimit);
    } else {
      const dates: string[] = [];
      if (!customStartDate || !customEndDate) return dates;
      
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return dates;
      
      // Handle cases where start date is after end date gracefully
      const actualStart = start < end ? start : end;
      const actualEnd = start < end ? end : start;
      const curr = new Date(actualStart);
      let safetyCount = 0;
      while (curr <= actualEnd && safetyCount < 366) {
        if (curr.getDay() !== 0) { // Skip Sundays
          const year = curr.getFullYear();
          const month = String(curr.getMonth() + 1).padStart(2, '0');
          const day = String(curr.getDate()).padStart(2, '0');
          dates.push(`${year}-${month}-${day}`);
        }
        curr.setDate(curr.getDate() + 1);
        safetyCount++;
      }
      return dates.reverse(); // Newest first
    }
  }, [filterType, selectedDaysLimit, customStartDate, customEndDate]);

  // Compute pending submissions for each teacher
  const computedTeachers = useMemo(() => {
    return teachers.map(teacher => {
      const isSuperUser = teacher.role === 'admin' || teacher.role === 'manager';
      
      // Determine schools this teacher is responsible for
      const assignedSchools = isSuperUser || !teacher.allowedSchools || teacher.allowedSchools.length === 0
        ? allSchools
        : teacher.allowedSchools;

      // Filter students corresponding to assigned schools
      const teacherStudents = students.filter(s => assignedSchools.includes(s.school));

      // Find all unique class units (school, std, div) overseen by this teacher
      const schoolClassMap = new Map<string, { school: string; std: string; div: string }>();
      teacherStudents.forEach(s => {
        const key = `${s.school.toLowerCase().trim()}|${s.std.toString().trim().toLowerCase()}|${s.div.toLowerCase().trim()}`;
        if (!schoolClassMap.has(key)) {
          schoolClassMap.set(key, { school: s.school, std: s.std, div: s.div });
        }
      });
      const uniqueClasses = Array.from(schoolClassMap.values());

      // Find missing attendance submissions for each class and check date
      const missingSubmissions: { school: string; std: string; div: string; date: string }[] = [];
      uniqueClasses.forEach(cls => {
        checkDates.forEach(date => {
          // If this school is marked as holiday or leave (LH) on this date, skip it
          const schoolHolidayKey = `${cls.school.toLowerCase().trim()}|${date}`;
          if (schoolHolidaySet.has(schoolHolidayKey)) {
            return;
          }

          const key = `${cls.school.toLowerCase().trim()}|${cls.std.toString().trim().toLowerCase()}|${cls.div.toLowerCase().trim()}|${date}`;
          if (!recordKeySet.has(key)) {
            missingSubmissions.push({
              school: cls.school,
              std: cls.std,
              div: cls.div,
              date
            });
          }
        });
      });

      // Sort missing submissions chronologically (newest first)
      missingSubmissions.sort((a, b) => b.date.localeCompare(a.date));

      // Group missing submissions by school and class
      const missingBySchool: Record<string, Record<string, string[]>> = {};
      missingSubmissions.forEach(sub => {
        if (!missingBySchool[sub.school]) {
          missingBySchool[sub.school] = {};
        }
        const classKey = `Standard ${sub.std} - Div ${sub.div}`;
        if (!missingBySchool[sub.school][classKey]) {
          missingBySchool[sub.school][classKey] = [];
        }
        missingBySchool[sub.school][classKey].push(sub.date);
      });

      return {
        teacher,
        assignedSchools,
        uniqueClassesCount: uniqueClasses.length,
        missingCount: missingSubmissions.length,
        missingSubmissions,
        missingBySchool
      };
    });
  }, [teachers, students, records, recordKeySet, schoolHolidaySet, allSchools, checkDates]);

  // Sort with highest missing count first (descending), secondary alphabetic sort
  const sortedTeachers = useMemo(() => {
    return [...computedTeachers].sort((a, b) => {
      if (b.missingCount !== a.missingCount) {
        return b.missingCount - a.missingCount;
      }
      return a.teacher.name.localeCompare(b.teacher.name);
    });
  }, [computedTeachers]);

  // Apply search filtering on teacher name
  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return sortedTeachers;
    const term = searchTerm.toLowerCase().trim();
    return sortedTeachers.filter(st => {
      const nameMatch = st.teacher.name.toLowerCase().includes(term);
      const roleMatch = (st.teacher.role || '').toLowerCase().includes(term);
      const schoolMatch = st.assignedSchools.some(s => s.toLowerCase().includes(term));
      return nameMatch || roleMatch || schoolMatch;
    });
  }, [sortedTeachers, searchTerm]);

  // Summary Metrics
  const totalTeachers = teachers.length;
  const totalDefaulters = sortedTeachers.filter(t => t.missingCount > 0).length;
  const totalCompliant = totalTeachers - totalDefaulters;
  const grandTotalMissing = sortedTeachers.reduce((acc, t) => acc + t.missingCount, 0);

  const toggleExpand = (teacherId: string) => {
    setExpandedTeachers(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" id="teacher-monitoring-container">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-red-950 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Shield className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-rose-450 text-xs font-black tracking-widest uppercase">
            <Flame className="w-4 h-4 animate-pulse text-rose-400" />
            हजेरी अनुपालन अहवाल (Attendance Compliance Supervision)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            शिक्षकांचे हजेरी नियंत्रण आणि ट्रॅकिंग (Teacher Monitoring Panel)
          </h1>
        </div>

        {/* Real-time Summary Cards */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-rose-350 text-rose-300">एकूण शिक्षक (Total)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-white">{totalTeachers}</span>
              <span className="text-[10px] font-bold text-slate-400">staff</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-green-300">पूर्ण हजेरी शाळा (Fully Compliant)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{totalCompliant}</span>
              <span className="text-[10px] font-bold text-slate-400">शिक्षकांची</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-amber-300">हजेरी अपूर्ण शिक्षक (Pending Staff)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-amber-400">{totalDefaulters}</span>
              <span className="text-[10px] font-bold text-slate-400">alerts</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-rose-300">एकूण प्रलंबित हजेरी दिवस (Total Missing)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-rose-400">{grandTotalMissing}</span>
              <span className="text-[10px] font-bold text-slate-400">entries</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        {/* Search input - required */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="शिक्षकाचे नाव शोधा (Search Teacher Name or Role)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-900 pl-10 pr-4 py-3 rounded-xl outline-none focus:border-indigo-500 shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 bg-slate-200 hover:bg-slate-350 p-0.5 rounded-full"
            >
              <X className="w-3 h-3 text-slate-650" />
            </button>
          )}
        </div>

        {/* Date Window Selection or Custom Date picker */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto self-start md:self-center">
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setFilterType('days')}
              className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'days'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              मर्यादित दिवस (Days)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('custom')}
              className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'custom'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              तारीख रेंज (Custom Range)
            </button>
          </div>

          {filterType === 'days' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { label: '७ दिवस (7d)', val: 7 },
                { label: '१५ दिवस (15d)', val: 15 },
                { label: '३० दिवस (30d)', val: 30 }
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setSelectedDaysLimit(opt.val)}
                  className={`text-xs font-black px-3 py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${
                    selectedDaysLimit === opt.val
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs font-bold border border-slate-205 bg-slate-50 text-slate-850 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] font-black text-slate-400">ते</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs font-bold border border-slate-205 bg-slate-50 text-slate-850 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-505"
              />
            </div>
          )}
        </div>
      </div>

      {/* Grid of Defaulters Ordered by Missing Submissions Count descending */}
      <div className="grid grid-cols-1 gap-6">
        {filteredTeachers.map(item => {
          const { teacher, missingCount, missingBySchool, assignedSchools, uniqueClassesCount } = item;
          const isExpanded = !!expandedTeachers[teacher.id];
          const hasMissing = missingCount > 0;

          return (
            <div
              key={teacher.id}
              className={`bg-white rounded-3xl border border-slate-200 shadow-sm transition-all relative overflow-hidden ${
                hasMissing
                  ? 'border-l-4 border-l-rose-500'
                  : 'border-l-4 border-l-emerald-500'
              }`}
            >
              {/* Card Header section */}
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Badge representing compliance */}
                  <div className={`p-3 rounded-2xl flex-shrink-0 ${
                    hasMissing ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {hasMissing ? (
                      <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />
                    ) : (
                      <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
                        {teacher.name}
                      </h3>
                      <span className="bg-slate-100 border border-slate-200 text-[9px] font-black uppercase text-slate-500 px-2 py-0.5 rounded-md">
                        {teacher.role || 'Staff'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-bold">
                      <span className="flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-slate-400" />
                        असाइन शाळा (Assigned Schools): {assignedSchools.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        वर्ग संख्या: {uniqueClassesCount} classes
                      </span>
                    </div>

                    {teacher.types && teacher.types.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {teacher.types.map(t => (
                          <span key={t} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stat details badge */}
                <div className="flex items-center gap-3 sm:self-center justify-between sm:justify-start">
                  <div className="text-right">
                    <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl border ${
                      hasMissing
                        ? 'bg-rose-50 text-rose-700 border-rose-250 animate-pulse border-rose-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-250 border-emerald-100'
                    }`}>
                      {hasMissing ? `${missingCount} हजेरी प्रलंबित (Pending)` : `हजेरी पूर्ण (Compliant) 🎉`}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleExpand(teacher.id)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
                    title={isExpanded ? "तपशील बंद करा" : "हजेरी प्रलंबित तपशील पहा"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-650" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-650" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable detailed audit results */}
              {isExpanded && (
                <div className="bg-slate-50/50 border-t border-slate-200 p-5 sm:p-6 space-y-4">
                  <div className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    अपलोड शाळांनुसार गैरहजेरी तपशील (Detailed Attendance Gaps by Assigned Schools)
                  </div>

                  {!hasMissing ? (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      उत्कृष्ट! या शिक्षकाची मागील {selectedDaysLimit} दिवसातील सर्व शाळांची आणि वर्गांची हजेरी यशस्वीरीत्या पूर्ण भरलेली आहे! (All submissions completed)
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(missingBySchool).map(([schoolName, classes]) => (
                        <div key={schoolName} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-inner space-y-3">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900 border-b border-indigo-50 pb-2">
                            <School className="w-4 h-4 text-indigo-500" />
                            {schoolName}
                          </div>

                          <div className="divide-y divide-slate-100">
                            {Object.entries(classes).map(([classLabel, datesMissing]) => (
                              <div key={classLabel} className="py-2.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                <div className="font-bold text-slate-700 min-w-[200px]">
                                  {classLabel}
                                </div>
                                <div className="flex flex-wrap gap-1.5 flex-1 justify-start md:justify-end">
                                  {datesMissing.map(dMissing => (
                                    <span
                                      key={dMissing}
                                      className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-black px-2.5 py-1 rounded-lg"
                                    >
                                      {formatDateWithDay(dMissing)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state when query results is nil */}
        {filteredTeachers.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center text-slate-550">
            <p className="text-sm font-semibold text-slate-500">शोधलेले कोणतेही शिक्षक आढळले नाहीत. कृपया दुसरं नाव किंवा भूमिका तपासा.</p>
          </div>
        )}
      </div>
    </div>
  );
}
