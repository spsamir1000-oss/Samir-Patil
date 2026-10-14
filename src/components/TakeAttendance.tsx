import { useState, useMemo } from 'react';
import { Student, AttendanceRecord } from '../types';
import { AdminAuthorityBadge } from './AdminAuthorityBadge';
import {
  CalendarDays,
  School,
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserCheck,
  UserX,
  BookOpen,
  Users,
  X,
  Check,
  Search,
  Calendar,
  FileText
} from 'lucide-react';

interface TakeAttendanceProps {
  students: Student[];
  onSaveAttendanceBatch: (newRecords: AttendanceRecord[]) => void;
}

type TakeState = 'filter' | 'taking' | 'complete';

const getStudentGenderDisplay = (student: Student) => {
  const gNorm = (student.gender || '').toLowerCase();
  const isFemale = gNorm === 'female' || gNorm === 'girl' || gNorm === 'f' || gNorm === 'मुलगी' || gNorm === 'स्त्री';
  return isFemale ? 'Girl' : 'Boy';
};

export default function TakeAttendance({ students, onSaveAttendanceBatch }: TakeAttendanceProps) {
  // Navigation & Config States
  const [takeState, setTakeState] = useState<TakeState>('filter');
  
  // Input triggers
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedSchool, setSelectedSchool] = useState<string>('A. L. Chandavarkar Highschool Khanivali');
  const [selectedStd, setSelectedStd] = useState<string>('5');
  const [selectedDiv, setSelectedDiv] = useState<string>('A');

  // Swipe tracker states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSessionRecords, setActiveSessionRecords] = useState<Omit<AttendanceRecord, 'id'>[]>([]);

  // Alternative Method: Student List states
  const [attendanceMode, setAttendanceMode] = useState<'card' | 'list'>('card');
  const [listSearch, setListSearch] = useState('');
  const [listVotes, setListVotes] = useState<Record<string, 'Present' | 'Absent' | 'Holiday' | 'Leave'>>({});
  const [attendanceType, setAttendanceType] = useState<'Regular' | 'Holiday' | 'Leave'>('Regular');

  // Derived filter options for setup
  const schools = useMemo(() => Array.from(new Set(students.map(s => s.school))), [students]);
  const standards = useMemo(() => Array.from(new Set(students.map(s => s.std))).sort(), [students]);
  const divisions = useMemo(() => Array.from(new Set(students.map(s => s.div))).sort(), [students]);

  // Students filtering based on setups
  const targetStudents = useMemo(() => {
    return students.filter(s => {
      const matchSchool = s.school === selectedSchool;
      const matchStd = s.std === selectedStd;
      const matchDiv = s.div === selectedDiv;
      return matchSchool && matchStd && matchDiv;
    });
  }, [students, selectedSchool, selectedStd, selectedDiv]);

  // Total Present / Absent / Holiday / Leave in active session
  const activePresentCount = useMemo(() => {
    if (attendanceMode === 'list') {
      return targetStudents.filter(s => (listVotes[s.id] || 'Present') === 'Present').length;
    }
    return activeSessionRecords.filter(r => r.status === 'Present').length;
  }, [activeSessionRecords, listVotes, attendanceMode, targetStudents]);

  const activeAbsentCount = useMemo(() => {
    if (attendanceMode === 'list') {
      return targetStudents.filter(s => listVotes[s.id] === 'Absent').length;
    }
    return activeSessionRecords.filter(r => r.status === 'Absent').length;
  }, [activeSessionRecords, listVotes, attendanceMode, targetStudents]);

  const activeHolidayCount = useMemo(() => {
    if (attendanceMode === 'list') {
      return targetStudents.filter(s => listVotes[s.id] === 'Holiday').length;
    }
    return activeSessionRecords.filter(r => r.status === 'Holiday').length;
  }, [activeSessionRecords, listVotes, attendanceMode, targetStudents]);

  const activeLeaveCount = useMemo(() => {
    if (attendanceMode === 'list') {
      return targetStudents.filter(s => listVotes[s.id] === 'Leave').length;
    }
    return activeSessionRecords.filter(r => r.status === 'Leave').length;
  }, [activeSessionRecords, listVotes, attendanceMode, targetStudents]);

  const activeProgressPercent = useMemo(() => {
    if (targetStudents.length === 0) return 0;
    return Math.round((currentIndex / targetStudents.length) * 100);
  }, [currentIndex, targetStudents]);

  // Start swipe routine
  const handleStartAttendance = () => {
    if (targetStudents.length === 0) {
      alert("निवडलेल्या वर्ग/तुकडी मध्ये कोणताही विद्यार्थी सापडला नाही. कृपया विद्यार्थ्यांची यादी तपासा!");
      return;
    }

    if (attendanceType === 'Holiday' || attendanceType === 'Leave') {
      const statusValue = attendanceType;
      const completeBatch: AttendanceRecord[] = targetStudents.map((s, idx) => ({
        id: `${s.id}-${selectedDate}-${Date.now()}-${idx}`,
        studentId: s.id,
        studentName: s.name,
        school: s.school,
        std: s.std,
        div: s.div,
        date: selectedDate,
        status: statusValue
      }));

      setActiveSessionRecords(completeBatch);
      onSaveAttendanceBatch(completeBatch);
      setTakeState('complete');
      return;
    }

    if (attendanceMode === 'list') {
      const initialMap: Record<string, 'Present' | 'Absent' | 'Holiday' | 'Leave'> = {};
      targetStudents.forEach(s => {
        initialMap[s.id] = 'Present';
      });
      setListVotes(initialMap);
      setListSearch('');
    } else {
      setCurrentIndex(0);
      setActiveSessionRecords([]);
    }
    setTakeState('taking');
  };

  // Helper action: toggle status for a single student in student list mode
  const toggleStudentStatus = (studentId: string, status: 'Present' | 'Absent' | 'Holiday' | 'Leave') => {
    setListVotes(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Mark all students as Present
  const markAllPresent = () => {
    const updated = { ...listVotes };
    targetStudents.forEach(s => {
      updated[s.id] = 'Present';
    });
    setListVotes(updated);
  };

  // Mark all students as Absent
  const markAllAbsent = () => {
    const updated = { ...listVotes };
    targetStudents.forEach(s => {
      updated[s.id] = 'Absent';
    });
    setListVotes(updated);
  };

  // Bulk save list-based attendance
  const handleSaveListAttendance = () => {
    const completeBatch: AttendanceRecord[] = targetStudents.map((s, idx) => ({
      id: `${s.id}-${selectedDate}-${Date.now()}-${idx}`,
      studentId: s.id,
      studentName: s.name,
      school: s.school,
      std: s.std,
      div: s.div,
      date: selectedDate,
      status: listVotes[s.id] || 'Present'
    }));

    // Populate active session records so success screens function seamlessly
    setActiveSessionRecords(completeBatch);
    onSaveAttendanceBatch(completeBatch);
    setTakeState('complete');
  };

  // Search filtered students for student list mode
  const filteredStudents = useMemo(() => {
    if (!listSearch.trim()) return targetStudents;
    return targetStudents.filter(s => s.name.toLowerCase().includes(listSearch.toLowerCase()));
  }, [targetStudents, listSearch]);

  // Record single student swipe vote
  const handleRecordVote = (status: 'Present' | 'Absent' | 'Holiday' | 'Leave') => {
    const activeStudent = targetStudents[currentIndex];
    
    const newVote: Omit<AttendanceRecord, 'id'> = {
      studentId: activeStudent.id,
      studentName: activeStudent.name,
      school: activeStudent.school,
      std: activeStudent.std,
      div: activeStudent.div,
      date: selectedDate,
      status: status
    };

    const updatedVotes = [...activeSessionRecords, newVote];
    setActiveSessionRecords(updatedVotes);

    // If more students are left
    if (currentIndex + 1 < targetStudents.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Bulk save records
      const completeBatch: AttendanceRecord[] = updatedVotes.map((vote, idx) => ({
        id: `${vote.studentId}-${vote.date}-${Date.now()}-${idx}`,
        ...vote
      }));
      onSaveAttendanceBatch(completeBatch);
      setTakeState('complete');
    }
  };

  // Restart swipe state
  const handleReset = () => {
    setTakeState('filter');
    setCurrentIndex(0);
    setActiveSessionRecords([]);
  };

  // Generate clean letter-based styling
  const letterColorStyles = (name: string) => {
    const char = name.trim().charAt(0).toUpperCase();
    const colors = [
      'from-fuchsia-500 to-indigo-500 text-white',
      'from-emerald-500 to-teal-500 text-white',
      'from-amber-500 to-orange-500 text-white',
      'from-sky-500 to-blue-500 text-white',
      'from-rose-500 to-pink-500 text-white',
      'from-purple-500 to-violet-500 text-white'
    ];
    const index = char.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      
      {/* 1. FILTER SELECTION SETUP ROUTINE */}
      {takeState === 'filter' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-md space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
              <CalendarDays className="w-5 h-5 text-violet-500" />
              हजेरी घ्या
            </h2>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Take Attendance — शाळा, इयत्ता, तुकडी निवडा</p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Date Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">तारीख (Date)</label>
              <input
                type="date" max={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
              />
            </div>

            {/* Attendance Type Selector right below date */}
            <div className="relative group">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-550">हजेरीचा प्रकार (Attendance Type)</label>
                <AdminAuthorityBadge
                  itemId="section_attendance_type"
                  title="Attendance Type Selector"
                  marathiTitle="हजेरी प्रकार निवड"
                  category="section"
                  module="attendance"
                  position="inline"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendanceType('Regular')}
                  className={`py-2 px-2.5 text-xs font-extrabold rounded-xl border text-center transition-all cursor-pointer ${
                    attendanceType === 'Regular'
                      ? 'border-violet-600 bg-violet-50 text-violet-750'
                      : 'border-slate-205 bg-slate-50 hover:bg-slate-100 text-slate-650'
                  }`}
                >
                  🟢 नियमित (Regular)
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceType('Holiday')}
                  className={`py-2 px-2.5 text-xs font-black rounded-xl border text-center transition-all cursor-pointer ${
                    attendanceType === 'Holiday'
                      ? 'border-red-500 bg-red-50 text-red-650'
                      : 'border-slate-205 bg-slate-50 hover:bg-slate-100 text-red-600'
                  }`}
                >
                  🔴 सुट्टी (Holiday)
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceType('Leave')}
                  className={`py-2 px-2.5 text-xs font-black rounded-xl border text-center transition-all cursor-pointer ${
                    attendanceType === 'Leave'
                      ? 'border-red-500 bg-red-50 text-red-655'
                      : 'border-slate-205 bg-slate-50 hover:bg-slate-100 text-red-600'
                  }`}
                >
                  🔴 रजा (Leave)
                </button>
              </div>
            </div>

            {/* School Input Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">शाळा (School)</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
              >
                {schools.length === 0 ? (
                  <option value="A. L. Chandavarkar Highschool Khanivali">A. L. Chandavarkar Highschool Khanivali</option>
                ) : (
                  schools.map(s => <option key={s} value={s}>{s}</option>)
                )}
              </select>
            </div>

            {/* Standard and Division Input Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">इयत्ता (Standard)</label>
                <select
                  value={selectedStd}
                  onChange={(e) => setSelectedStd(e.target.value)}
                  className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                >
                  {standards.length === 0 ? (
                    <>
                      <option value="5">इयत्ता 5</option>
                      <option value="7">इयत्ता 7</option>
                    </>
                  ) : (
                    standards.map(st => <option key={st} value={st}>इयत्ता {st}</option>)
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">तुकडी (Division)</label>
                <select
                  value={selectedDiv}
                  onChange={(e) => setSelectedDiv(e.target.value)}
                  className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                >
                  {divisions.length === 0 ? (
                    <>
                      <option value="A">तुकडी A</option>
                      <option value="B">तुकडी B</option>
                    </>
                  ) : (
                    divisions.map(d => <option key={d} value={d}>तुकडी {d}</option>)
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Attendance Method Picker */}
          {attendanceType === 'Regular' && (
            <div className="pt-4 border-t border-slate-100 relative group">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-500">हजेरी घेण्याची पद्धत निवडा (Attendance Method)</label>
                <AdminAuthorityBadge
                  itemId="section_attendance_method"
                  title="Attendance Method Picker"
                  marathiTitle="हजेरी पद्धत निवड"
                  category="section"
                  module="attendance"
                  position="inline"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAttendanceMode('card')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    attendanceMode === 'card'
                      ? 'border-violet-600 bg-violet-50 text-violet-700 font-bold'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 font-medium'
                  }`}
                >
                  <Sparkles className="w-5 h-5 mb-1.5 text-violet-500" />
                  <span className="text-[11px] leading-tight">एक-एक करून (Card/Swipe)</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setAttendanceMode('list')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    attendanceMode === 'list'
                      ? 'border-violet-600 bg-violet-50 text-violet-700 font-bold'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 font-medium'
                  }`}
                >
                  <Users className="w-5 h-5 mb-1.5 text-violet-500" />
                  <span className="text-[11px] leading-tight">विद्यार्थी यादी (Student List)</span>
                </button>
              </div>
            </div>
          )}

          {/* Student Counts Summary Badge */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
            <span className="text-sm font-bold text-indigo-800">
              {targetStudents.length} विद्यार्थी निवडले गेले आहेत
            </span>
          </div>

          <div className="relative flex items-center">
            {attendanceType === 'Regular' ? (
              <button
                onClick={handleStartAttendance}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all duration-300"
              >
                <Play className="w-4 h-4 fill-current" />
                हजेरी सुरू करा
              </button>
            ) : (
              <button
                onClick={handleStartAttendance}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm rounded-xl shadow-md transition-all duration-300 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {attendanceType === 'Holiday' ? 'सुट्टीची हजेरी नोंदवा (H)' : 'रजेची हजेरी नोंदवा (LH)'}
              </button>
            )}
            <AdminAuthorityBadge
              itemId="btn_start_attendance"
              title="Start Attendance Button"
              marathiTitle="हजेरी सुरू करा बटण"
              category="button"
              module="attendance"
              position="inline"
              className="ml-2 shrink-0"
            />
          </div>
        </div>
      )}


      {/* 2. ACTIVE ATTENDANCE SWIPING ROUTINE */}
      {takeState === 'taking' && attendanceMode === 'card' && targetStudents[currentIndex] && (
        <div className="space-y-4">
          
          {/* Header Progress Indicators */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                📋 {currentIndex + 1} / {targetStudents.length}
              </span>
              <span className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded-lg">
                {activeProgressPercent}% पूर्ण
              </span>
            </div>

            {/* Custom progress line */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${activeProgressPercent}%` }}
              ></div>
            </div>

            {/* Running counters */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-center">
              <div className="bg-emerald-50 text-emerald-800 py-2.5 rounded-xl border border-emerald-200">
                P (हजर): {activePresentCount}
              </div>
              <div className="bg-red-50 text-red-800 py-2.5 rounded-xl border border-red-200">
                A (गैरहजर): {activeAbsentCount}
              </div>
            </div>
          </div>

          {/* Active Card Body */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md text-center space-y-6 relative overflow-hidden">
            {/* Top tiny class info anchor */}
            <div className="bg-indigo-50 text-indigo-900 text-xs font-bold py-2.5 px-4 rounded-xl block leading-relaxed whitespace-normal text-slate-800">
              📍 {targetStudents[currentIndex].school} <br />
              <span className="text-[10px] text-indigo-600 font-extrabold uppercase mt-1 inline-block bg-white/60 px-2 py-0.5 rounded-md">
                इयत्ता {targetStudents[currentIndex].std} – तुकडी {targetStudents[currentIndex].div}
              </span>
            </div>

            {/* Student Avatar Layout */}
            <div className="flex justify-center pt-2">
              <div className={`w-32 h-32 rounded-full bg-gradient-to-tr ${letterColorStyles(targetStudents[currentIndex].name)} flex items-center justify-center text-5xl font-extrabold shadow-lg animate-pulse`}>
                {targetStudents[currentIndex].name.trim().charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Student Name */}
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {currentIndex + 1}. {targetStudents[currentIndex].name}
              </h3>
              <div className="pt-1">
                {getStudentGenderDisplay(targetStudents[currentIndex]) === 'Girl' ? (
                  <span className="bg-pink-50 text-pink-700 border border-pink-100 px-3 py-1 rounded-full text-xs font-bold inline-block" title="Female (मुलगी)">
                    👩‍🦰 मुलगी (Girl)
                  </span>
                ) : (
                  <span className="bg-cyan-50 text-cyan-850 border border-cyan-100 px-3 py-1 rounded-full text-xs font-bold inline-block" title="Male (मुलगा)">
                    👨‍🦱 मुलगा (Boy)
                  </span>
                )}
              </div>
            </div>

            {/* Two giant buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Present Trigger button */}
              <button
                onClick={() => handleRecordVote('Present')}
                className="flex flex-col items-center justify-center p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-650 rounded-2xl border border-emerald-250 transition-all shadow-xs hover:shadow-sm scale-100 active:scale-95 duration-200 cursor-pointer"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1.5" />
                <span className="text-xs font-extrabold pb-0.5">उपस्थित</span>
                <span className="text-[9px] opacity-70">(Present - P)</span>
              </button>

              {/* Absent Trigger button */}
              <button
                onClick={() => handleRecordVote('Absent')}
                className="flex flex-col items-center justify-center p-4 bg-red-50 hover:bg-red-100 text-red-650 rounded-2xl border border-red-250 transition-all shadow-xs hover:shadow-sm scale-100 active:scale-95 duration-200 cursor-pointer"
              >
                <XCircle className="w-8 h-8 text-red-500 mb-1.5" />
                <span className="text-xs font-extrabold pb-0.5">अनुपस्थित</span>
                <span className="text-[9px] opacity-70">(Absent - A)</span>
              </button>
            </div>

            {/* Secondary safety actions */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-[10px] text-slate-450 hover:text-slate-600 font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                हजेरी रद्द करा आणि मागे जा
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 2.5 ACTIVE ATTENDANCE STUDENT LIST ROUTINE */}
      {takeState === 'taking' && attendanceMode === 'list' && (
        <div className="space-y-4">
          
          {/* Header Progress Indicators */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold">
              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                📋 एकूण विद्यार्थी: {targetStudents.length}
              </span>
              <span className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded-lg shrink-0">
                इयत्ता {selectedStd} - तुकडी {selectedDiv}
              </span>
            </div>

            {/* Running counters */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-center">
              <div className="bg-emerald-50 text-emerald-805 text-emerald-800 py-2.5 rounded-xl border border-emerald-200">
                P (हजर): {activePresentCount}
              </div>
              <div className="bg-red-50 text-red-805 text-red-800 py-2.5 rounded-xl border border-red-200">
                A (गैरहजर): {activeAbsentCount}
              </div>
            </div>
          </div>

          {/* Student List Controller Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md space-y-4 relative overflow-hidden">
            <div className="bg-indigo-50 text-indigo-900 text-xs font-bold py-2.5 px-4 rounded-xl block leading-relaxed whitespace-normal text-slate-800">
              📍 {selectedSchool} <br />
              <span className="text-[10px] text-indigo-600 font-extrabold uppercase mt-1 inline-block bg-white/60 px-2 py-0.5 rounded-md">
                इयत्ता {selectedStd} – तुकडी {selectedDiv}
              </span>
            </div>

            {/* Search and Quick Action Buttons */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="विद्यार्थ्याचे नाव शोधा..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl pl-10 pr-10 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                />
                {listSearch && (
                  <button
                    onClick={() => setListSearch('')}
                    className="absolute right-3.5 top-3 text-slate-450 hover:text-slate-600 text-xs font-bold p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List Body */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-extrabold uppercase tracking-wide">
                  कोणताही विद्यार्थी सापडला नाही!
                </div>
              ) : (
                filteredStudents.map((student, idx) => {
                  const studentStatus = listVotes[student.id] || 'Present';
                  const targetIdx = targetStudents.findIndex(s => s.id === student.id);
                  const srNo = targetIdx !== -1 ? targetIdx + 1 : idx + 1;
                  
                  let containerBg = 'bg-slate-50/50 border-slate-100 hover:bg-slate-50';
                  let nameDecoration = '';
                  let statusBadgeClass = 'bg-emerald-100 text-emerald-800';
                  let statusBadgeText = '🟢 उपस्थित (P)';

                  if (studentStatus === 'Absent') {
                    containerBg = 'bg-red-50/30 border-red-100 hover:bg-red-50/50';
                    nameDecoration = 'line-through decoration-red-300 decoration-2';
                    statusBadgeClass = 'bg-red-100 text-red-805';
                    statusBadgeText = '🔴 अनुपस्थित (A)';
                  } else if (studentStatus === 'Holiday') {
                    containerBg = 'bg-red-50/20 border-red-100 hover:bg-red-50/30';
                    statusBadgeClass = 'bg-red-100 text-red-600 border border-red-200';
                    statusBadgeText = '🔴 सुट्टी (H)';
                  } else if (studentStatus === 'Leave') {
                    containerBg = 'bg-red-50/20 border-red-105 hover:bg-red-50/30';
                    statusBadgeClass = 'bg-red-100 text-red-600 border border-red-200';
                    statusBadgeText = '🔴 रजा (LH)';
                  }

                  return (
                    <div
                      key={student.id}
                      className={`flex flex-row items-center justify-between p-3 rounded-2xl border transition-all duration-200 gap-3 ${containerBg}`}
                    >
                      {/* Name & Avatar */}
                      <div className="flex items-center gap-3 min-w-0 font-sans">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${letterColorStyles(student.name)} flex items-center justify-center text-xs font-black shrink-0 shadow-xs`}>
                          #{srNo}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold transition-all text-slate-900 ${nameDecoration} whitespace-normal break-words`}>
                            {srNo}. {student.name} ({getStudentGenderDisplay(student)})
                          </p>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold rounded-md px-1.5 py-0.5 mt-1 ${statusBadgeClass}`}>
                            {statusBadgeText}
                          </span>
                        </div>
                      </div>

                      {/* Right button for Action: Cross to mark Absent if Present, and check to mark Present if Absent */}
                      <div className="shrink-0">
                        {studentStatus === 'Present' ? (
                          <button
                            type="button"
                            onClick={() => toggleStudentStatus(student.id, 'Absent')}
                            className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-705 border border-red-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 group shadow-xs active:scale-95 duration-100"
                            title="अनुपस्थित करण्यासाठी क्लिक करा"
                          >
                            <X className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-extrabold">गैरहजर</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleStudentStatus(student.id, 'Present')}
                            className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-705 border border-emerald-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 group shadow-xs active:scale-95 duration-100"
                            title="उपस्थित करण्यासाठी क्लिक करा"
                          >
                            <Check className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-extrabold">हजर</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions for List Mode */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={handleSaveListAttendance}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all duration-300 active:scale-98"
                >
                  <CheckCircle2 className="w-4.5 h-4.5" />
                  Submit
                </button>
                <AdminAuthorityBadge
                  itemId="btn_submit_attendance_list"
                  title="Submit Attendance Button"
                  marathiTitle="हजेरी सबमिट करा बटण"
                  category="button"
                  module="attendance"
                  position="inline"
                  className="ml-2 shrink-0"
                />
              </div>

              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-1.5 text-xs text-slate-450 hover:text-slate-600 font-bold py-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  हजेरी रद्द करा आणि मागे जा
                </button>
                <AdminAuthorityBadge
                  itemId="btn_cancel_attendance"
                  title="Cancel Attendance Button"
                  marathiTitle="हजेरी रद्द करा बटण"
                  category="button"
                  module="attendance"
                  position="inline"
                  className="ml-2 shrink-0"
                />
              </div>
            </div>

          </div>
        </div>
      )}


      {/* 3. SHIFT ENVELOPE COMPLETE PANEL */}
      {takeState === 'complete' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-md text-center space-y-6 animate-in zoom-in-95 duration-200">
          
          {/* Complete visual badge icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-800">🎉 हजेरी पूर्ण!</h2>
            <p className="text-xs text-slate-400 font-semibold">Attendance Complete for {selectedDate}</p>
          </div>

          {/* Quick results box */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3 max-w-sm mx-auto">
            <div className="flex items-center justify-between text-sm py-1 border-b border-slate-200">
              <span className="text-slate-500 font-semibold flex items-center gap-1"><UserCheck className="w-4 h-4 text-emerald-500" /> उपस्थित (Present)</span>
              <span className="text-emerald-700 font-bold">{activePresentCount}</span>
            </div>

            <div className="flex items-center justify-between text-sm py-1 border-b border-b-slate-200">
              <span className="text-slate-500 font-semibold flex items-center gap-1"><UserX className="w-4 h-4 text-rose-500" /> अनुपस्थित (Absent)</span>
              <span className="text-red-700 font-bold">{activeAbsentCount}</span>
            </div>

            <div className="flex items-center justify-between text-sm py-1 border-b border-b-slate-200">
              <span className="text-slate-500 font-semibold flex items-center gap-1"><Users className="w-4 h-4 text-indigo-500" /> एकूण विद्यार्थी</span>
              <span className="text-slate-800 font-bold">{targetStudents.length}</span>
            </div>

            <div className="flex items-center justify-between text-sm py-1 font-bold">
              <span className="text-slate-505 flex items-center gap-1"><BookOpen className="w-4 h-4 text-violet-500" /> उपस्थिती दर (%)</span>
              <span className="text-violet-700">
                {targetStudents.length > 0 ? Math.round((activePresentCount / targetStudents.length) * 100) : 0}%
              </span>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            नवीन हजेरी घ्या
          </button>
        </div>
      )}

    </div>
  );
}
