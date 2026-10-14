import React, { useMemo, useState } from 'react';
import { Student, AttendanceRecord, InterventionTask, UserSession } from '../types';
import { Eye, Search, AlertCircle, Phone, Calendar as CalendarIcon, MapPin, ArrowRight, X, Users, Check } from 'lucide-react';

interface ObservePanelProps {
  students: Student[];
  records: AttendanceRecord[];
  tasks: InterventionTask[];
  currentUser: UserSession;
}

export default function ObservePanel({ students, records, tasks, currentUser }: ObservePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter successful students based on your criteria: 
  // "tasks madhil 'पूर्ण केलेले कार्य' madhe successful tag jyanna lagel ti mule Observe section madhe yetil."
  
  const observedStudents = useMemo(() => {
    const getStudentAttendanceReturnDate = (task: InterventionTask) => {
      const visitDateStr = task.visitDate || task.homeVisitDate;
      if (!visitDateStr) return null;
      const returnRecord = records
        .filter(r => r.studentId === task.studentId && r.status === 'Present' && r.date >= visitDateStr)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      return returnRecord ? returnRecord.date : null;
    };

    // 1. Get all successful tasks
    const successTasks = tasks.filter(task => {
      const presentDate = getStudentAttendanceReturnDate(task);
      return task.status === 'successful' || task.status === 'completed' || (presentDate !== null && (task.status === 'active_task' || task.status === 'home_visit_done'));
    });
    
    // 2. Extract unique student IDs
    const studentIds = Array.from(new Set(successTasks.map(t => t.studentId)));
    
    // 3. Find students and map their records and tasks
    return studentIds.map(id => {
      const dbStudent = students.find(s => s.id === id);
      if (!dbStudent) return null;
      
      const stTasks = successTasks.filter(t => t.studentId === id).sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
      const stRecords = records.filter(r => r.studentId === id);
      
      return {
        student: dbStudent,
        tasks: stTasks,
        records: stRecords
      };
    }).filter(Boolean) as { student: Student, tasks: InterventionTask[], records: AttendanceRecord[]}[];
    
  }, [students, records, tasks]);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Filters State
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedStds, setSelectedStds] = useState<string[]>([]);
  const [selectedDivs, setSelectedDivs] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);

  // Filter dropdown toggles
  const [isSchoolOpen, setIsSchoolOpen] = useState(false);
  const [isStdOpen, setIsStdOpen] = useState(false);
  const [isDivOpen, setIsDivOpen] = useState(false);
  const [isGenderOpen, setIsGenderOpen] = useState(false);

  // Unique options (Extract directly from the full students database, so users can filter by any existing option)
  const schoolsList = useMemo(() => Array.from(new Set(students.map(s => s.school))).filter(Boolean).sort(), [students]);
  const stdsList = useMemo(() => Array.from(new Set(students.map(s => s.std))).filter(Boolean).sort(), [students]);
  const divsList = useMemo(() => Array.from(new Set(students.map(s => s.div))).filter(Boolean).sort(), [students]);
  const gendersList = ['Male', 'Female'];

  // Apply search and dropdown filtering
  const filteredObserve = useMemo(() => {
    let result = observedStudents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        (o.student.name || '').toLowerCase().includes(q) || 
        (o.student.school || '').toLowerCase().includes(q)
      );
    }
    if (selectedSchools.length > 0) {
      result = result.filter(o => selectedSchools.includes(o.student.school));
    }
    if (selectedStds.length > 0) {
      result = result.filter(o => selectedStds.includes(o.student.std));
    }
    if (selectedDivs.length > 0) {
      result = result.filter(o => selectedDivs.includes(o.student.div));
    }
    if (selectedGenders.length > 0) {
      result = result.filter(o => {
        const studentGenderNorm = (o.student.gender || 'male').toLowerCase();
        return selectedGenders.some(filterGender => {
          const filterNorm = filterGender.toLowerCase();
          if (filterNorm === 'male') {
            return ['male', 'boy', 'm', 'मुलगा', 'पुरुष'].includes(studentGenderNorm);
          } else if (filterNorm === 'female') {
            return ['female', 'girl', 'f', 'मुलगी', 'स्त्री'].includes(studentGenderNorm);
          }
          return filterNorm === studentGenderNorm;
        });
      });
    }

    return result;
  }, [observedStudents, searchQuery, selectedSchools, selectedStds, selectedDivs, selectedGenders]);

  const calculateAnalysis = (st: { student: Student, tasks: InterventionTask[], records: AttendanceRecord[] }) => {
    // 1. Return Date (Task completion date essentially, or their first 'Present' after the task visit date)
    const latestTask = st.tasks[0];
    const taskCompletionStr = latestTask?.homeVisitDate || latestTask?.dateCreated;
    
    let returnDateStr: string | null = null;
    if (taskCompletionStr) {
      const returnRecord = st.records
        .filter(r => r.status === 'Present' && r.date >= taskCompletionStr)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      
      returnDateStr = returnRecord ? returnRecord.date : taskCompletionStr;
    }
    
    // Post return records
    let postReturnRecords: AttendanceRecord[] = [];
    if (returnDateStr) {
      postReturnRecords = st.records.filter(r => r.date >= returnDateStr).sort((a, b) => a.date.localeCompare(b.date));
    }
    
    const presentCount = postReturnRecords.filter(r => r.status === 'Present').length;
    const absentCount = postReturnRecords.filter(r => r.status === 'Absent').length;
    const totalCount = postReturnRecords.length;
    
    const absentPercentage = totalCount > 0 ? Math.round((absentCount / totalCount) * 100) : 0;
    const presentPercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    
    // Weekly / Monthly freq analysis
    const getMonday = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff));
    };

    const weeklyFreq: Record<string, { start: Date, end: Date, absent: number }> = {};
    const monthlyFreq: Record<string, { monthStr: string, absent: number }> = {};

    postReturnRecords.forEach(r => {
      if (r.status !== 'Absent') return;

      const d = new Date(r.date);
      
      // Weekly
      const mon = getMonday(d);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      
      const weekKey = mon.toISOString().split('T')[0];
      if (!weeklyFreq[weekKey]) {
        weeklyFreq[weekKey] = { start: mon, end: sun, absent: 0 };
      }
      weeklyFreq[weekKey].absent += 1;

      // Monthly
      const monthKey = d.toLocaleString('mr-IN', { month: 'long', year: 'numeric' });
      if (!monthlyFreq[monthKey]) {
        monthlyFreq[monthKey] = { monthStr: monthKey, absent: 0 };
      }
      monthlyFreq[monthKey].absent += 1;
    });

    const weeklyArray = Object.values(weeklyFreq).sort((a,b) => b.start.getTime() - a.start.getTime()).map(w => {
      const startStr = w.start.toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' });
      const endStr = w.end.toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' });
      return { label: `${startStr} ते ${endStr}`, absent: w.absent };
    });

    const monthlyArray = Object.values(monthlyFreq).sort((a,b) => monthlyFreq[b.monthStr].absent - monthlyFreq[a.monthStr].absent); // Simple sort

    // Average Calc
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const msInMonth = 30 * 24 * 60 * 60 * 1000;
    
    let postReturnWeeks = 1;
    let postReturnMonths = 1;

    if (postReturnRecords.length > 0) {
      const firstDate = new Date(postReturnRecords[0].date);
      const lastDate = new Date(postReturnRecords[postReturnRecords.length - 1].date);
      const diffTime = Math.max(0, lastDate.getTime() - firstDate.getTime());
      
      postReturnWeeks = Math.max(1, Math.ceil(diffTime / msInWeek));
      postReturnMonths = Math.max(1, Math.ceil(diffTime / msInMonth));
    }

    const weeklyAbsentAvg = (absentCount / postReturnWeeks).toFixed(1);
    const monthlyAbsentAvg = (absentCount / postReturnMonths).toFixed(1);

    return {
      returnDateStr,
      totalCount,
      presentCount,
      absentCount,
      absentPercentage,
      presentPercentage,
      weeklyAbsentAvg,
      monthlyAbsentAvg,
      weeklyArray,
      monthlyArray,
      postReturnRecords: postReturnRecords.slice().reverse()
    };
  };

  const selectedStudentModal = useMemo(() => {
    if (!selectedStudentId) return null;
    const st = filteredObserve.find(o => o.student.id === selectedStudentId);
    if (!st) return null;
    return {
      studentObj: st,
      analysis: calculateAnalysis(st)
    };
  }, [selectedStudentId, filteredObserve]);

  return (
    <div className="space-y-6">
      {/* Header block */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Eye className="w-32 h-32" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-600 text-xs font-black uppercase tracking-wider mb-2">
            <Eye className="w-3.5 h-3.5" />
            निरीक्षण (Observe Section)
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            पुन्हा शाळेत आलेले विद्यार्थी
          </h2>

        </div>
      </div>

      {/* Filters Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative z-20">
        
        {/* School Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsSchoolOpen(!isSchoolOpen);
              setIsStdOpen(false); setIsDivOpen(false); setIsGenderOpen(false);
            }}
            className="w-full text-left text-xs font-black border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 transition-all flex items-center justify-between cursor-pointer shadow-xs"
          >
            <span className="truncate pr-2 text-slate-800">
              {selectedSchools.length === 0
                ? 'सर्व शाळा (All Schools)'
                : `${selectedSchools.length} निवडल्या: (${selectedSchools.join(', ')})`}
            </span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </button>

          {isSchoolOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsSchoolOpen(false)} />
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg p-2.5 space-y-1 z-30 max-h-52 overflow-y-auto animate-fade-in">
                <button
                  type="button"
                  onClick={() => setSelectedSchools([])}
                  className={`w-full text-left text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                    selectedSchools.length === 0 ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>सर्व शाळा (All Schools)</span>
                  {selectedSchools.length === 0 && <span className="text-teal-600">✓</span>}
                </button>
                <div className="border-t border-slate-100 my-1" />
                {schoolsList.map(s => {
                  const isSelected = selectedSchools.includes(s);
                  return (
                    <label key={s} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedSchools(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                        }}
                        className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                      />
                      <span className="text-xs font-black text-slate-700">{s}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Std Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsStdOpen(!isStdOpen);
              setIsSchoolOpen(false); setIsDivOpen(false); setIsGenderOpen(false);
            }}
            className="w-full text-left text-xs font-black border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 transition-all flex items-center justify-between cursor-pointer shadow-xs"
          >
            <span className="truncate pr-2 text-slate-800">
              {selectedStds.length === 0
                ? 'सर्व इयत्ता (All Std)'
                : `${selectedStds.length} निवडल्या: (इ. ${selectedStds.join(', ')})`}
            </span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </button>

          {isStdOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsStdOpen(false)} />
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg p-2.5 space-y-1 z-30 max-h-52 overflow-y-auto animate-fade-in">
                <button
                  type="button"
                  onClick={() => setSelectedStds([])}
                  className={`w-full text-left text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                    selectedStds.length === 0 ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>सर्व इयत्ता (All Std)</span>
                  {selectedStds.length === 0 && <span className="text-teal-600">✓</span>}
                </button>
                <div className="border-t border-slate-100 my-1" />
                {stdsList.map(s => {
                  const isSelected = selectedStds.includes(s);
                  return (
                    <label key={s} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedStds(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                        }}
                        className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                      />
                      <span className="text-xs font-black text-slate-700">{s}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Div Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsDivOpen(!isDivOpen);
              setIsSchoolOpen(false); setIsStdOpen(false); setIsGenderOpen(false);
            }}
            className="w-full text-left text-xs font-black border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 transition-all flex items-center justify-between cursor-pointer shadow-xs"
          >
            <span className="truncate pr-2 text-slate-800">
              {selectedDivs.length === 0
                ? 'सर्व तुकडी (All Div)'
                : `${selectedDivs.length} निवडल्या: (तुकडी ${selectedDivs.join(', ')})`}
            </span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </button>

          {isDivOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsDivOpen(false)} />
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg p-2.5 space-y-1 z-30 max-h-52 overflow-y-auto animate-fade-in">
                <button
                  type="button"
                  onClick={() => setSelectedDivs([])}
                  className={`w-full text-left text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                    selectedDivs.length === 0 ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>सर्व तुकडी (All Div)</span>
                  {selectedDivs.length === 0 && <span className="text-teal-600">✓</span>}
                </button>
                <div className="border-t border-slate-100 my-1" />
                {divsList.map(s => {
                  const isSelected = selectedDivs.includes(s);
                  return (
                    <label key={s} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedDivs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                        }}
                        className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                      />
                      <span className="text-xs font-black text-slate-700">{s}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Gender Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsGenderOpen(!isGenderOpen);
              setIsSchoolOpen(false); setIsStdOpen(false); setIsDivOpen(false);
            }}
            className="w-full text-left text-xs font-black border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 transition-all flex items-center justify-between cursor-pointer shadow-xs"
          >
            <span className="truncate pr-2 text-slate-800">
              {selectedGenders.length === 0
                ? 'सर्व लिंग (All Gender)'
                : `${selectedGenders.length} निवडले: (${selectedGenders.map(g => g === 'Male' ? 'मुलगा' : 'मुलगी').join(', ')})`}
            </span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </button>

          {isGenderOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsGenderOpen(false)} />
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg p-2.5 space-y-1 z-30 max-h-52 overflow-y-auto animate-fade-in">
                <button
                  type="button"
                  onClick={() => setSelectedGenders([])}
                  className={`w-full text-left text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                    selectedGenders.length === 0 ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>सर्व लिंग (All Gender)</span>
                  {selectedGenders.length === 0 && <span className="text-teal-600">✓</span>}
                </button>
                <div className="border-t border-slate-100 my-1" />
                {gendersList.map(s => {
                  const isSelected = selectedGenders.includes(s);
                  return (
                    <label key={s} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedGenders(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                        }}
                        className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                      />
                      <span className="text-xs font-black text-slate-700">{s === 'Male' ? 'मुलगा (Male)' : s === 'Female' ? 'मुलगी (Female)' : s}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative z-10">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="विद्यार्थ्याचे नाव शोधा..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold placeholder:font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
          />
        </div>
        <div className="shrink-0 text-sm font-black text-slate-500 px-3">
          एकूण लक्ष ठेवणारे विद्यार्थी: <span className="text-teal-600 text-lg">{filteredObserve.length}</span>
        </div>
      </div>

      {/* Grid of Observed Students */}
      {filteredObserve.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
            <AlertCircle className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-700">कोणतेही विद्यार्थी निरीक्षणासाठी नाहीत</h3>
          <p className="text-sm font-semibold text-slate-400 max-w-sm">
            टास्क 'पूर्ण' किंवा 'सक्सेसफुल' झाल्यावर ते विद्यार्थी इथे दिसतील.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredObserve.map((item, index) => {
            const analysis = calculateAnalysis(item);
            const gNorm = (item.student.gender || 'male').toLowerCase();
            const isFemale = ['female', 'girl', 'f', 'मुलगी', 'स्त्री'].includes(gNorm);
            
            return (
              <div
                key={item.student.id}
                className="bg-white border border-slate-150 hover:border-violet-300 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xs group relative"
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-violet-550/10 text-violet-700 border border-violet-200 flex items-center justify-center font-black text-xs select-none">
                      {index + 1}
                    </div>
                    <div>
                      <h4 
                        onClick={() => setSelectedStudentId(item.student.id)}
                        className="text-xs font-extrabold text-slate-800 hover:text-violet-600 cursor-pointer hover:underline flex items-center gap-1 font-sans"
                      >
                        {item.student.name}
                        <span className="text-[8px] text-slate-400 font-bold ml-1 px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded">माहिती ➔</span>
                      </h4>
                      <div className="text-[10px] text-slate-400 font-bold block mt-0.5 space-y-0.5">
                        <div>
                          {item.student.school} • <span className="text-violet-700">इ. {item.student.std}-{item.student.div}</span>
                        </div>
                        <div className="pt-0.5">
                          {isFemale ? (
                            <span className="bg-pink-50 text-pink-700 border border-pink-100 px-1.5 py-0.5 rounded text-[9px] font-black inline-flex items-center gap-0.5 transition-all">
                              👩‍🦰 मुलगी (Girl)
                            </span>
                          ) : (
                            <span className="bg-cyan-50 text-cyan-800 border border-cyan-100 px-1.5 py-0.5 rounded text-[9px] font-black inline-flex items-center gap-0.5 transition-all">
                              👨‍🦱 मुलगा (Boy)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-1 rounded-lg text-[10px] font-black font-sans shrink-0">
                      ❌ एकूण {analysis.absentCount} गैरहजर
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0">
                      शाळेत उपस्थित: {analysis.returnDateStr ? new Date(analysis.returnDateStr).toLocaleDateString('mr-IN') : 'माहिती नाही'}
                    </span>
                  </div>
                </div>

                {/* Averages Summary Section */}
                <div className="bg-violet-50/20 rounded-xl p-3 mb-3 border border-violet-100/30 grid grid-cols-3 gap-2 text-center">
                  <div className="border-r border-violet-100/50 pr-1.5 flex flex-col items-center justify-center">
                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">साप्ताहिक (Weekly)</span>
                    <div>
                      <span className="text-xs font-black text-violet-700 font-sans">{analysis.weeklyAbsentAvg}</span>
                      <span className="text-[8px] text-slate-500 font-bold ml-0.5">दिवस</span>
                    </div>
                  </div>
                  <div className="border-r border-violet-100/50 px-1.5 flex flex-col items-center justify-center">
                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">मासिक (Monthly)</span>
                    <div>
                      <span className="text-xs font-black text-violet-700 font-sans">{analysis.monthlyAbsentAvg}</span>
                      <span className="text-[8px] text-slate-500 font-bold ml-0.5">दिवस</span>
                    </div>
                  </div>
                  <div className="pl-1.5 flex flex-col items-center justify-center">
                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">अनुपस्थिती (Absent %)</span>
                    <div>
                      <span className="text-xs font-black text-rose-600 font-sans">{analysis.absentPercentage}%</span>
                    </div>
                  </div>
                </div>

                {/* Breakdown grids */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Weekly Block */}
                  <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/10">
                    <span className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wider">साप्ताहिक वारंवारता (Weekly)</span>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 scrollbar-none">
                      {analysis.weeklyArray.length === 0 ? <p className="text-[10px] text-slate-400 font-semibold px-2">माहिती उपलब्ध नाही.</p> : analysis.weeklyArray.map((w, wIdx) => (
                        <div key={wIdx} className="flex justify-between items-center text-[10px] bg-white px-2 py-1 rounded border border-slate-100 shadow-4xs">
                          <span className="text-slate-600 font-semibold">{w.label}</span>
                          <span className="text-rose-600 font-bold font-sans">{w.absent} दिवस</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Block */}
                  <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/10">
                    <span className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wider">मासिक वारंवारता (Monthly)</span>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 scrollbar-none">
                      {analysis.monthlyArray.length === 0 ? <p className="text-[10px] text-slate-400 font-semibold px-2">माहिती उपलब्ध नाही.</p> : analysis.monthlyArray.map((m, mIdx) => (
                        <div key={mIdx} className="flex justify-between items-center text-[10px] bg-white px-2 py-1 rounded border border-slate-100 shadow-4xs">
                          <span className="text-slate-600 font-semibold">{m.monthStr}</span>
                          <span className="text-rose-600 font-bold font-sans">{m.absent} दिवस</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedStudentModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedStudentId(null)}>
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-right-4" onClick={e => e.stopPropagation()}>
             {/* Modal Header */}
             <div className="p-6 md:p-8 flex items-start justify-between border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-md z-10">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 font-bold flex items-center justify-center border border-rose-100 shrink-0">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                     <div className="flex items-center gap-2 flex-wrap">
                       <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedStudentModal.studentObj.student.name}</h2>
                       {(() => {
                         const gNorm = (selectedStudentModal.studentObj.student.gender || 'male').toLowerCase();
                         const isFemale = ['female', 'girl', 'f', 'मुलगी', 'स्त्री'].includes(gNorm);
                         return isFemale ? (
                           <span className="bg-pink-50 text-pink-700 border border-pink-100 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                             👩‍🦰 मुलगी (Girl)
                           </span>
                         ) : (
                           <span className="bg-cyan-50 text-cyan-800 border border-cyan-100 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                             👨‍🦱 मुलगा (Boy)
                           </span>
                         );
                       })()}
                     </div>
                     <p className="text-sm font-bold text-slate-500 mt-1">
                       शाळा: {selectedStudentModal.studentObj.student.school} • <span className="text-violet-750 font-black">इ. {selectedStudentModal.studentObj.student.std}-{selectedStudentModal.studentObj.student.div}</span>
                     </p>
                  </div>
                </div>
                <button onClick={() => setSelectedStudentId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 shrink-0">
                  <X className="w-6 h-6" />
                </button>
             </div>

             <div className="p-6 md:p-8 space-y-8">
               {/* Stat Cards */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="border hover:border-slate-300 border-slate-200 transition-colors rounded-2xl p-5 text-center shadow-sm">
                   <div className="text-3xl font-black text-slate-800 mb-2">{selectedStudentModal.analysis.totalCount}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">मोजलेले एकूण दिवस</div>
                 </div>
                 <div className="border hover:border-emerald-200 border-emerald-100 bg-emerald-50/50 transition-colors rounded-2xl p-5 text-center shadow-sm">
                   <div className="text-3xl font-black text-emerald-600 mb-2">{selectedStudentModal.analysis.presentCount}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">उपस्थित (Present)</div>
                 </div>
                 <div className="border hover:border-rose-200 border-rose-100 bg-rose-50/50 transition-colors rounded-2xl p-5 text-center shadow-sm">
                   <div className="text-3xl font-black text-rose-600 mb-2">{selectedStudentModal.analysis.absentCount}</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-rose-600">अनुपस्थित (Absent)</div>
                 </div>
                 <div className="border hover:border-violet-200 border-violet-100 bg-violet-50/50 transition-colors rounded-2xl p-5 text-center shadow-sm">
                   <div className="text-3xl font-black text-violet-700 mb-2">{selectedStudentModal.analysis.absentPercentage}%</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-violet-700">हजेरी प्रमाण (%)</div>
                 </div>
               </div>

               {/* Table */}
               <div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-4 gap-2">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">दैनिक तारीखवार हजेरी (DATE-BY-DATE ATTENDANCE)</h3>
                    {selectedStudentModal.analysis.postReturnRecords.length > 0 && (
                      <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-lg">
                        कालावधी: {selectedStudentModal.analysis.postReturnRecords[selectedStudentModal.analysis.postReturnRecords.length-1].date} ते {selectedStudentModal.analysis.postReturnRecords[0].date}
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left font-bold text-sm">
                      <thead className="bg-slate-50 text-slate-400 text-xs shadow-sm shadow-slate-100 relative z-10 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-4 font-black w-1/3">तारीख (Date)</th>
                          <th className="px-5 py-4 font-black w-1/3 text-center">स्थिती (Status)</th>
                          <th className="px-5 py-4 font-black w-1/3 text-right">माहिती (Details)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedStudentModal.analysis.postReturnRecords.length === 0 ? (
                          <tr><td colSpan={3} className="text-center p-6 text-slate-400 font-semibold tracking-wide">कोणतीही नोंद नाही</td></tr>
                        ) : (
                          selectedStudentModal.analysis.postReturnRecords.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-5 text-slate-800">{r.date}</td>
                              <td className="px-5 py-5 text-center">
                                {r.status === 'Present' ? (
                                  <div className="inline-flex w-7 h-7 bg-emerald-500 text-white rounded justify-center items-center shadow-[0_2px_10px_-2px_rgba(16,185,129,0.5)]"><Check className="w-5 h-5"/></div>
                                ) : (
                                  <div className="inline-flex w-7 h-7 text-rose-500 justify-center items-center font-black"><X className="w-7 h-7 stroke-[3]"/></div>
                                )}
                              </td>
                              <td className={`px-5 py-5 text-right font-black ${r.status === 'Present' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {r.status === 'Present' ? (
                                  <>उपस्थित <br/><span className="text-[10px] opacity-70 tracking-widest uppercase">(Present)</span></>
                                ) : (
                                  <>अनुपस्थित <br/><span className="text-[10px] opacity-70 tracking-widest uppercase">(Absent)</span></>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>

               <div className="pt-8 mb-8 border-t border-slate-100">
                 <button onClick={() => setSelectedStudentId(null)} className="w-full sm:w-auto px-10 py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-50 transition-colors mx-auto block shadow-sm">
                    बंद करा (Close)
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
