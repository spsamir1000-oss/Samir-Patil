import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord } from '../types';
import { ZoomableGraphContainer } from './ZoomableGraphContainer';
import { AdminAuthorityBadge } from './AdminAuthorityBadge';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Users,
  Percent,
  UserCheck,
  UserX,
  Calendar,
  AlertTriangle,
  Award,
  BookOpen,
  BarChart3,
  ChevronDown
} from 'lucide-react';

// Helper to shorten long school names for better X-axis alignment on comparison graphs
const getShortSchoolName = (name: string): string => {
  if (!name) return '';
  let short = name;
  // Replace long common prefixes/suffixes in Marathi
  short = short.replace(/जिल्हा परिषद प्राथमिक शाळा/g, 'जि.प.शाळा');
  short = short.replace(/जिल्हा परिषद/g, 'जि.प.');
  short = short.replace(/महानगरपालिका/g, 'म.न.पा.');
  short = short.replace(/महानगर पालिका/g, 'म.न.पा.');
  short = short.replace(/प्राथमिक शाळा/g, 'प्रा.शाळा');
  short = short.replace(/उच्च प्राथमिक शाळा/g, 'उ.प्रा.शाळा');
  short = short.replace(/माध्यमिक विद्यालय/g, 'माध्य.वि.');
  short = short.replace(/Zilla Parishad Primary School/gi, 'ZPPS');
  short = short.replace(/Zilla Parishad/gi, 'ZP');
  short = short.replace(/Primary School/gi, 'PS');
  short = short.replace(/Municipal Corporation/gi, 'MC');
  
  // If it's still too long, truncate it nicely
  if (short.length > 20) {
    return short.slice(0, 18) + '...';
  }
  return short;
};

interface DashboardProps {
  students: Student[];
  records: AttendanceRecord[];
}

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  displayMap?: Record<string, string>;
}

function MultiSelectDropdown({ label, options, selectedValues, onChange, placeholder, displayMap }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(val => val !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative text-left z-40">
      <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs hover:border-violet-300 transition-colors"
      >
        <span className="truncate max-w-[150px] text-slate-700">
          {selectedValues.length === 0 
            ? (placeholder || `-- Select --`) 
            : `${selectedValues.length} Selected`}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedValues.length > 0 && (
            <span 
              onClick={clearSelection}
              className="text-[10px] bg-violet-50 text-violet-600 hover:bg-violet-100 px-1.5 py-0.5 rounded font-black cursor-pointer"
            >
              Clear
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto p-2.5 space-y-1 animate-fade-in">
            {options.map(option => {
              const isChecked = selectedValues.includes(option);
              return (
                <label 
                  key={option} 
                  className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700 transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(option)}
                    className="rounded text-violet-600 focus:ring-violet-500 border-slate-300 w-3.5 h-3.5"
                  />
                  <span>{displayMap ? displayMap[option] || option : option}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard({ students, records }: DashboardProps) {
  // Dates filters
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    records.forEach(r => datesSet.add(r.date));
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a)); // Newest first
  }, [records]);

  // Set default date range filters
  const [fromDate, setFromDate] = useState<string>('2026-04-28');
  const [toDate, setToDate] = useState<string>('2026-05-28');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedStds, setSelectedStds] = useState<string[]>([]);
  const [selectedDivs, setSelectedDivs] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['Male', 'Female']);
  const [minStreak, setMinStreak] = useState<number>(3);
  const [maxStreak, setMaxStreak] = useState<number | ''>('');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'overview' | 'streak' | 'frequency' | 'irregular' | 'comparison'>('overview');
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);
  const [minAbsentPct, setMinAbsentPct] = useState<number>(26);
  const [maxAbsentPct, setMaxAbsentPct] = useState<number>(100);
  const [freqSearchText, setFreqSearchText] = useState<string>('');
  const [detailFromDate, setDetailFromDate] = useState<string>('2026-04-28');
  const [detailToDate, setDetailToDate] = useState<string>('2026-05-28');

  // Comparison States
  const [g1FromDate, setG1FromDate] = useState<string>('2026-04-28');
  const [g1ToDate, setG1ToDate] = useState<string>('2026-05-28');
  const [g1School, setG1School] = useState<string>('');

  const [g2FromDate, setG2FromDate] = useState<string>('2026-04-28');
  const [g2ToDate, setG2ToDate] = useState<string>('2026-05-28');
  const [g2SelectedSchools, setG2SelectedSchools] = useState<string[]>([]);
  const [isG2SchoolOpen, setIsG2SchoolOpen] = useState(false);

  // Open detailing modal helper
  const openStudentDetails = (student: Student, mode: 'main' | 'streak' | 'frequency') => {
    setSelectedDetailStudent(student);
    if (mode === 'streak' || mode === 'frequency') {
      setDetailFromDate(fromDate);
      setDetailToDate(toDate);
    } else {
      setDetailFromDate(fromDate);
      setDetailToDate(toDate);
    }
  };

  // Toggles for opening/closing custom multi-select dropdown panels
  const [isSchoolOpen, setIsSchoolOpen] = useState(false);
  const [isStdOpen, setIsStdOpen] = useState(false);
  const [isDivOpen, setIsDivOpen] = useState(false);

  // Helpers on students map for quick lookup
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  const getStudentGender = (student: Student | undefined): 'Male' | 'Female' => {
    if (!student) return 'Male';
    const gNorm = (student.gender || '').toLowerCase();
    const isFemale = gNorm === 'female' || gNorm === 'girl' || gNorm === 'f' || gNorm === 'मुलगी' || gNorm === 'स्त्री';
    return isFemale ? 'Female' : 'Male';
  };

  const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }
    
    const current = new Date(start);
    let count = 0;
    while (current <= end && count < 60) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  };

  // List of unique values for dropdowns
  const schools = useMemo(() => Array.from(new Set(students.map(s => s.school))), [students]);
  const standards = useMemo(() => Array.from(new Set(students.map(s => s.std))).sort(), [students]);
  const divisions = useMemo(() => Array.from(new Set(students.map(s => s.div))).sort(), [students]);

  // Filtered Students and Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Date range check
      const dateInRange = r.date >= fromDate && r.date <= toDate;
      if (!dateInRange) return false;

      // Student filters
      const matchSchool = selectedSchools.length === 0 || selectedSchools.includes(r.school);
      const matchStd = selectedStds.length === 0 || selectedStds.includes(r.std);
      const matchDiv = selectedDivs.length === 0 || selectedDivs.includes(r.div);

      // Gender filter
      let matchGender = true;
      if (selectedGenders.length > 0) {
        const s = studentMap.get(r.studentId);
        const genderNorm = getStudentGender(s);
        matchGender = selectedGenders.includes(genderNorm);
      }

      return matchSchool && matchStd && matchDiv && matchGender;
    });
  }, [records, fromDate, toDate, selectedSchools, selectedStds, selectedDivs, selectedGenders, studentMap]);

  // Filtered Students and Records (Show only students whose attendance was taken in selected timeframe)
  const filteredStudents = useMemo(() => {
    const activeStudentIds = new Set(filteredRecords.map(r => r.studentId));
    return students.filter(s => {
      const matchSchool = selectedSchools.length === 0 || selectedSchools.includes(s.school);
      const matchStd = selectedStds.length === 0 || selectedStds.includes(s.std);
      const matchDiv = selectedDivs.length === 0 || selectedDivs.includes(s.div);

      let matchGender = true;
      if (selectedGenders.length > 0) {
        const genderNorm = getStudentGender(s);
        matchGender = selectedGenders.includes(genderNorm);
      }

      return matchSchool && matchStd && matchDiv && matchGender && activeStudentIds.has(s.id);
    });
  }, [students, selectedSchools, selectedStds, selectedDivs, selectedGenders, filteredRecords]);

  // Stats Counters
  const totalStudentsCount = filteredStudents.length;

  const totalDays = useMemo(() => {
    return new Set(filteredRecords.map(r => r.date)).size;
  }, [filteredRecords]);

  const { presentCount, absentCount, holidayCount, leaveCount, attendanceRate } = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) return { presentCount: 0, absentCount: 0, holidayCount: 0, leaveCount: 0, attendanceRate: 100 };
    const p = filteredRecords.filter(r => r.status === 'Present').length;
    const a = filteredRecords.filter(r => r.status === 'Absent').length;
    const h = filteredRecords.filter(r => r.status === 'Holiday').length;
    const l = filteredRecords.filter(r => r.status === 'Leave').length;
    const totalActive = p + a;
    const rate = totalActive > 0 ? Math.round((p / totalActive) * 1000) / 10 : 100;
    return {
      presentCount: p,
      absentCount: a,
      holidayCount: h,
      leaveCount: l,
      attendanceRate: rate
    };
  }, [filteredRecords]);

  // 1. Pie Chart Data
  const pieData = useMemo(() => {
    if (filteredRecords.length === 0) {
      return [
        { name: 'माहिती नाही', value: 1, color: '#e5e7eb' }
      ];
    }
    return [
      { name: 'उपस्थित (Present)', value: presentCount, color: '#10b981' },
      { name: 'अनुपस्थित (Absent)', value: absentCount, color: '#ef4444' }
    ];
  }, [presentCount, absentCount, filteredRecords]);

  // 4. Student specific rates
  const studentRates = useMemo(() => {
    const studentHistoryMap: Record<string, { name: string; school: string; std: string; div: string; present: number; total: number }> = {};
    
    // Core structure
    filteredStudents.forEach(s => {
      studentHistoryMap[s.id] = {
        name: s.name,
        school: s.school,
        std: s.std,
        div: s.div,
        present: 0,
        total: 0
      };
    });

    // Populate history
    filteredRecords.forEach(r => {
      if (studentHistoryMap[r.studentId]) {
        if (r.status === 'Present') {
          studentHistoryMap[r.studentId].total += 1;
          studentHistoryMap[r.studentId].present += 1;
        } else if (r.status === 'Absent') {
          studentHistoryMap[r.studentId].total += 1;
        }
      }
    });

    return Object.entries(studentHistoryMap)
      .map(([id, info]) => {
        const rate = info.total > 0 ? Math.round((info.present / info.total) * 1000) / 10 : 0;
        return {
          id,
          name: info.name,
          school: info.school,
          classStr: `इ. ${info.std}-${info.div}`,
          percentage: rate,
          presentCount: info.present,
          totalCount: info.total
        };
      })
      .filter(item => item.totalCount > 0); // Only columns with actual records in selected timeframe
  }, [filteredStudents, filteredRecords]);

  // Filtered by Absenteeism Percentage Range
  const lowAttendanceStudents = useMemo(() => {
    return studentRates
      .map(s => {
        const absentPct = Math.round((100 - s.percentage) * 10) / 10;
        return { ...s, absentPct };
      })
      .filter(s => s.absentPct >= minAbsentPct && s.absentPct <= maxAbsentPct)
      .sort((a, b) => b.absentPct - a.absentPct);
  }, [studentRates, minAbsentPct, maxAbsentPct]);

  // Top Attendance List
  const topAttendanceStudents = useMemo(() => {
    return studentRates
      .filter(s => s.percentage >= 75)
      .sort((a, b) => b.percentage - a.percentage || b.presentCount - a.presentCount)
      .slice(0, 10);
  }, [studentRates]);

  // Filtered Records specifically for streak
  const streakRecords = useMemo(() => {
    return records.filter(r => {
      const dateInRange = r.date >= fromDate && r.date <= toDate;
      if (!dateInRange) return false;

      const matchSchool = selectedSchools.length === 0 || selectedSchools.includes(r.school);
      const matchStd = selectedStds.length === 0 || selectedStds.includes(r.std);
      const matchDiv = selectedDivs.length === 0 || selectedDivs.includes(r.div);

      let matchGender = true;
      if (selectedGenders.length > 0) {
        const s = studentMap.get(r.studentId);
        const genderNorm = getStudentGender(s);
        matchGender = selectedGenders.includes(genderNorm);
      }

      return matchSchool && matchStd && matchDiv && matchGender;
    });
  }, [records, fromDate, toDate, selectedSchools, selectedStds, selectedDivs, selectedGenders, studentMap]);

  const streakStudents = useMemo(() => {
    const activeStudentIds = new Set(streakRecords.map(r => r.studentId));
    return students.filter(s => {
      const matchSchool = selectedSchools.length === 0 || selectedSchools.includes(s.school);
      const matchStd = selectedStds.length === 0 || selectedStds.includes(s.std);
      const matchDiv = selectedDivs.length === 0 || selectedDivs.includes(s.div);

      let matchGender = true;
      if (selectedGenders.length > 0) {
        const genderNorm = getStudentGender(s);
        matchGender = selectedGenders.includes(genderNorm);
      }

      return matchSchool && matchStd && matchDiv && matchGender && activeStudentIds.has(s.id);
    });
  }, [students, selectedSchools, selectedStds, selectedDivs, selectedGenders, streakRecords]);

  // Continuous Absent Streak List (excluding Holiday, Leave)
  const streakFilteredStudents = useMemo(() => {
    // We want to calculate consecutive absent days for each student in the selected timeframe.
    // Holiday and Leave statuses are ignored/skipped (consider nako karu).
    const studentStatusList: Record<string, { date: string; status: string }[]> = {};

    // Initialise for all currently filtered students
    streakStudents.forEach(s => {
      studentStatusList[s.id] = [];
    });

    // Collect relevant records for each student
    streakRecords.forEach(r => {
      if (studentStatusList[r.studentId]) {
        studentStatusList[r.studentId].push({
          date: r.date,
          status: r.status
        });
      }
    });

    const result: {
      id: string;
      name: string;
      school: string;
      classStr: string;
      gender: string;
      maxStreak: number;
    }[] = [];

    streakStudents.forEach(student => {
      const recordsForStudent = studentStatusList[student.id] || [];
      // Sort older to newer
      const sorted = [...recordsForStudent].sort((a, b) => a.date.localeCompare(b.date));
      // Ignore Holiday and Leave (consider nako karu)
      const activeOnly = sorted.filter(r => r.status !== 'Holiday' && r.status !== 'Leave');

      let latestStreak = 0;
      for (let i = activeOnly.length - 1; i >= 0; i--) {
        if (activeOnly[i].status === 'Absent') {
          latestStreak++;
        } else {
          break; // Stop at first non-absent (meaning 'Present' since Holiday and Leave are filtered out)
        }
      }
      const maxStreak = latestStreak;

      const gDisplay = (student.gender || '').toLowerCase();
      const isFemale = gDisplay === 'female' || gDisplay === 'girl' || gDisplay === 'f' || gDisplay === 'मुलगी' || gDisplay === 'स्त्री';
      const genderLabel = isFemale ? 'मुलगी (Girl)' : 'मुलगा (Boy)';

      result.push({
        id: student.id,
        name: student.name,
        school: student.school,
        classStr: `इ. ${student.std}-${student.div}`,
        gender: genderLabel,
        maxStreak
      });
    });

    const minThreshold = minStreak || 1;
    const maxThreshold = maxStreak === '' ? Infinity : maxStreak;
    return result
      .filter(item => item.maxStreak >= minThreshold && item.maxStreak <= maxThreshold)
      .sort((a, b) => b.maxStreak - a.maxStreak);
  }, [streakStudents, streakRecords, minStreak, maxStreak]);

  // Helpers for Weekly & Monthly Frequency Analysis
  const getWeekDetails = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { key: 'unknown', label: 'निश्चित नाही', englishLabel: 'Not sure' };
    
    // Get the day of the week
    const day = d.getDay();
    // Monday is start of the week. Sunday is 0, so if Sunday, we want to go back 6 days to Monday
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(d);
    monday.setDate(diffToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (num: number) => num.toString().padStart(2, '0');
    const mondayKey = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    
    const marathiMonths = ['जाने', 'फेब्रु', 'मार्च', 'एप्रि', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'];
    const label = `${monday.getDate()} ${marathiMonths[monday.getMonth()]} ते ${sunday.getDate()} ${marathiMonths[sunday.getMonth()]}`;
    const englishLabel = `${monday.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monday.getMonth()]} - ${sunday.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][sunday.getMonth()]}`;
    
    return {
      key: mondayKey,
      label,
      englishLabel
    };
  };

  const getMonthDetails = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { key: 'unknown', label: 'निश्चित नाही', englishLabel: 'Not sure' };
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    
    const marathiMonths = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
    const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return {
      key,
      label: `${marathiMonths[d.getMonth()]} ${d.getFullYear()}`,
      englishLabel: `${englishMonths[d.getMonth()]} ${d.getFullYear()}`
    };
  };

  // Find total active weeks and months with attendance data in the selected frequency date range
  const activeWeeksInPeriod = useMemo(() => {
    const weekKeys = new Set<string>();
    records.forEach(r => {
      const inRange = r.date >= fromDate && r.date <= toDate;
      if (inRange) {
        const week = getWeekDetails(r.date);
        if (week && week.key && week.key !== 'unknown') {
          weekKeys.add(week.key);
        }
      }
    });
    return Math.max(1, weekKeys.size);
  }, [records, fromDate, toDate]);

  const activeMonthsInPeriod = useMemo(() => {
    const monthKeys = new Set<string>();
    records.forEach(r => {
      const inRange = r.date >= fromDate && r.date <= toDate;
      if (inRange) {
        const month = getMonthDetails(r.date);
        if (month && month.key && month.key !== 'unknown') {
          monthKeys.add(month.key);
        }
      }
    });
    return Math.max(1, monthKeys.size);
  }, [records, fromDate, toDate]);

  // Filtered Records specifically for Frequency Analyzer
  const frequencyRecords = useMemo(() => {
    return records.filter(r => {
      const dateInRange = r.date >= fromDate && r.date <= toDate;
      if (!dateInRange) return false;

      // Student filters
      const matchSchool = selectedSchools.length === 0 || selectedSchools.includes(r.school);
      const matchStd = selectedStds.length === 0 || selectedStds.includes(r.std);
      const matchDiv = selectedDivs.length === 0 || selectedDivs.includes(r.div);

      // Gender filter
      let matchGender = true;
      if (selectedGenders.length > 0) {
        const s = studentMap.get(r.studentId);
        const genderNorm = getStudentGender(s);
        matchGender = selectedGenders.includes(genderNorm);
      }

      return matchSchool && matchStd && matchDiv && matchGender;
    });
  }, [records, fromDate, toDate, selectedSchools, selectedStds, selectedDivs, selectedGenders, studentMap]);

  // Filtered Students for Frequency Analyzer
  const frequencyStudents = useMemo(() => {
    return students.filter(s => {
      const matchSchool = selectedSchools.length === 0 || selectedSchools.includes(s.school);
      const matchStd = selectedStds.length === 0 || selectedStds.includes(s.std);
      const matchDiv = selectedDivs.length === 0 || selectedDivs.includes(s.div);

      let matchGender = true;
      if (selectedGenders.length > 0) {
        const genderNorm = getStudentGender(s);
        matchGender = selectedGenders.includes(genderNorm);
      }

      return matchSchool && matchStd && matchDiv && matchGender;
    });
  }, [students, selectedSchools, selectedStds, selectedDivs, selectedGenders]);

  // Group absences into weekly and monthly buckets for each student
  const studentAbsentFrequencyList = useMemo(() => {
    const frequencyMap: Record<string, {
      studentId: string;
      name: string;
      school: string;
      classStr: string;
      totalAbsences: number;
      weeklyAbsences: Record<string, { count: number; label: string; englishLabel: string }>;
      monthlyAbsences: Record<string, { count: number; label: string; englishLabel: string }>;
    }> = {};

    // Pre-populate with our relevant filtered students
    frequencyStudents.forEach(s => {
      frequencyMap[s.id] = {
        studentId: s.id,
        name: s.name,
        school: s.school,
        classStr: `इ. ${s.std}-${s.div}`,
        totalAbsences: 0,
        weeklyAbsences: {},
        monthlyAbsences: {}
      };
    });

    // Go through all Absent records in the frequencyRecords list
    frequencyRecords.forEach(r => {
      if (r.status === 'Absent' && frequencyMap[r.studentId]) {
        const entry = frequencyMap[r.studentId];
        entry.totalAbsences += 1;

        // Calculate week
        const week = getWeekDetails(r.date);
        if (!entry.weeklyAbsences[week.key]) {
          entry.weeklyAbsences[week.key] = { count: 0, label: week.label, englishLabel: week.englishLabel };
        }
        entry.weeklyAbsences[week.key].count += 1;

        // Calculate month
        const month = getMonthDetails(r.date);
        if (!entry.monthlyAbsences[month.key]) {
          entry.monthlyAbsences[month.key] = { count: 0, label: month.label, englishLabel: month.englishLabel };
        }
        entry.monthlyAbsences[month.key].count += 1;
      }
    });

    // Convert map to array and sort by total absences descending
    return Object.values(frequencyMap)
      .filter(item => {
        // filter by search text if applicable
        if (!freqSearchText.trim()) return true;
        return item.name.toLowerCase().includes(freqSearchText.toLowerCase());
      })
      .sort((a, b) => b.totalAbsences - a.totalAbsences);
  }, [frequencyStudents, frequencyRecords, freqSearchText]);

  // Data for Graph 1: Class-wise Present Percentage Comparison (Single school selection)
  const g1Data = useMemo(() => {
    const schoolToUse = g1School || (schools.length > 0 ? schools[0] : '');
    if (!schoolToUse) return [];

    // Filter students by this school
    const schoolStudents = students.filter(s => s.school === schoolToUse);
    const studentIds = new Set(schoolStudents.map(s => s.id));
    
    // Group records by class (std + div)
    const classGroups: Record<string, { present: number; total: number }> = {};
    
    // Pre-initialize groups for all classes of this school to avoid missing classes with zero records
    schoolStudents.forEach(s => {
      const classKey = `इ. ${s.std}-${s.div}`;
      if (!classGroups[classKey]) {
        classGroups[classKey] = { present: 0, total: 0 };
      }
    });

    const schoolRecords = records.filter(r => {
      const isMyStudent = studentIds.has(r.studentId);
      const isMyRange = r.date >= g1FromDate && r.date <= g1ToDate;
      return isMyStudent && isMyRange;
    });

    schoolRecords.forEach(r => {
      const student = studentMap.get(r.studentId);
      if (student) {
        const classKey = `इ. ${student.std}-${student.div}`;
        if (classGroups[classKey]) {
          if (r.status === 'Present') {
            classGroups[classKey].present += 1;
            classGroups[classKey].total += 1;
          } else if (r.status === 'Absent') {
            classGroups[classKey].total += 1;
          }
        }
      }
    });

    return Object.entries(classGroups)
      .map(([classKey, counts]) => {
        const pct = counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0;
        return {
          className: classKey, // X-axis label
          percentage: pct,     // Bar value
          present: counts.present,
          total: counts.total
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students, records, g1School, g1FromDate, g1ToDate, schools, studentMap]);

  // Data for Graph 2: School-wise Comparative Present Percentage (Multiple schools selection)
  const g2Data = useMemo(() => {
    const schoolsToUse = g2SelectedSchools.length > 0 ? g2SelectedSchools : schools;
    if (schoolsToUse.length === 0) return [];

    return schoolsToUse.map(schoolName => {
      const schoolStudents = students.filter(s => s.school === schoolName);
      const sIds = new Set(schoolStudents.map(s => s.id));

      const schoolRecords = records.filter(r => {
        const matchStudent = sIds.has(r.studentId);
        const matchRange = r.date >= g2FromDate && r.date <= g2ToDate;
        return matchStudent && matchRange;
      });

      let present = 0;
      let total = 0;
      schoolRecords.forEach(r => {
        if (r.status === 'Present') {
          present += 1;
          total += 1;
        } else if (r.status === 'Absent') {
          total += 1;
        }
      });

      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        schoolName,       // X-axis label
        schoolNameShort: getShortSchoolName(schoolName), // Shortened school name for X-axis
        percentage: pct,  // Bar value
        present,
        total
      };
    });
  }, [students, records, g2SelectedSchools, g2FromDate, g2ToDate, schools]);

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all duration-300">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-slate-500" />
          तारीख आणि फिल्टर निवडा (Select Date & Filters)
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* From Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">पासून (From)</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">पर्यंत (To)</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            />
          </div>

          {/* School */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1">शाळा (School) - Multi-Select</label>
            <button
              type="button"
              onClick={() => {
                setIsSchoolOpen(!isSchoolOpen);
                setIsStdOpen(false);
                setIsDivOpen(false);
              }}
              className="w-full text-left text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-violet-500 outline-none transition-all flex items-center justify-between cursor-pointer shadow-xs"
            >
              <span className="truncate pr-2 text-slate-700">
                {selectedSchools.length === 0
                  ? 'सर्व शाळा (All Schools)'
                  : `${selectedSchools.length} निवडल्या (${selectedSchools.join(', ')})`}
              </span>
              <span className="text-slate-400 text-[9px]">▼</span>
            </button>

            {isSchoolOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsSchoolOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1 z-30 max-h-60 overflow-y-auto animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSchools([]);
                    }}
                    className={`w-full text-left text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                      selectedSchools.length === 0
                        ? 'bg-violet-50 text-violet-700 font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>सर्व शाळा (All Schools)</span>
                    {selectedSchools.length === 0 && <span className="text-violet-600">✓</span>}
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {schools.map(s => {
                    const isSelected = selectedSchools.includes(s);
                    return (
                      <label key={s} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedSchools(prev =>
                              prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                            );
                          }}
                          className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">{s}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Standard */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1">इयत्ता (Standard) - Multi-Select</label>
            <button
              type="button"
              onClick={() => {
                setIsStdOpen(!isStdOpen);
                setIsSchoolOpen(false);
                setIsDivOpen(false);
              }}
              className="w-full text-left text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-violet-500 outline-none transition-all flex items-center justify-between cursor-pointer shadow-xs"
            >
              <span className="truncate pr-2 text-slate-700">
                {selectedStds.length === 0
                  ? 'सर्व इयत्ता (All Standards)'
                  : `${selectedStds.length} निवडल्या (${selectedStds.map(s => `इ. ${s}`).join(', ')})`}
              </span>
              <span className="text-slate-400 text-[9px]">▼</span>
            </button>

            {isStdOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsStdOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1 z-30 max-h-60 overflow-y-auto animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStds([]);
                    }}
                    className={`w-full text-left text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                      selectedStds.length === 0
                        ? 'bg-violet-50 text-violet-700 font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>सर्व इयत्ता (All Standards)</span>
                    {selectedStds.length === 0 && <span className="text-violet-600">✓</span>}
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {standards.map(st => {
                    const isSelected = selectedStds.includes(st);
                    return (
                      <label key={st} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedStds(prev =>
                              prev.includes(st) ? prev.filter(x => x !== st) : [...prev, st]
                            );
                          }}
                          className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">इयत्ता {st}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Division */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-550 mb-1">तुकडी (Division) - Multi-Select</label>
            <button
              type="button"
              onClick={() => {
                setIsDivOpen(!isDivOpen);
                setIsSchoolOpen(false);
                setIsStdOpen(false);
              }}
              className="w-full text-left text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-violet-500 outline-none transition-all flex items-center justify-between cursor-pointer shadow-xs"
            >
              <span className="truncate pr-2 text-slate-700">
                {selectedDivs.length === 0
                  ? 'सर्व तुकड्या (All Divisions)'
                  : `${selectedDivs.length} निवडल्या (${selectedDivs.map(d => `तुकडी ${d}`).join(', ')})`}
              </span>
              <span className="text-slate-400 text-[9px]">▼</span>
            </button>

            {isDivOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsDivOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1 z-30 max-h-60 overflow-y-auto animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDivs([]);
                    }}
                    className={`w-full text-left text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                      selectedDivs.length === 0
                        ? 'bg-violet-50 text-violet-700 font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>सर्व तुकड्या (All Divisions)</span>
                    {selectedDivs.length === 0 && <span className="text-violet-600">✓</span>}
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {divisions.map(d => {
                    const isSelected = selectedDivs.includes(d);
                    return (
                      <label key={d} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedDivs(prev =>
                              prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                            );
                          }}
                          className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">तुकडी {d}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Gender */}
          <MultiSelectDropdown
            label="जेंडर (Gender) - Multi-Select"
            options={['Male', 'Female']}
            selectedValues={selectedGenders}
            onChange={setSelectedGenders}
            placeholder="सर्व जेंडर (All)"
            displayMap={{ Male: 'मुलगा (Boy)', Female: 'मुलगी (Girl)' }}
          />
        </div>
      </div>

      {/* Dynamic Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 bg-slate-100 p-1.5 rounded-xl w-full items-center">
        <div className="relative flex items-center shrink-0">
          <button
            onClick={() => setActiveAnalysisTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeAnalysisTab === 'overview'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <BookOpen className="w-4 h-4 inline-block mr-1.5" />
            मुख्य डॅशबोर्ड (Overview)
          </button>
          <AdminAuthorityBadge
            itemId="tab_dashboard_overview"
            title="Dashboard Overview Tab"
            marathiTitle="डॅशबोर्ड ओव्हरव्ह्यू टॅब"
            category="button"
            module="attendance"
            position="inline"
            className="ml-1 shrink-0"
          />
        </div>

        <div className="relative flex items-center shrink-0">
          <button
            onClick={() => setActiveAnalysisTab('streak')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeAnalysisTab === 'streak'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <UserX className="w-4 h-4 inline-block mr-1.5" />
            सलग गैरहजर (Continuous Absent)
          </button>
          <AdminAuthorityBadge
            itemId="tab_continuous_absent"
            title="Continuous Absent Tab"
            marathiTitle="सलग गैरहजर टॅब"
            category="button"
            module="attendance"
            position="inline"
            className="ml-1 shrink-0"
          />
        </div>

        <div className="relative flex items-center shrink-0">
          <button
            onClick={() => setActiveAnalysisTab('frequency')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeAnalysisTab === 'frequency'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Calendar className="w-4 h-4 inline-block mr-1.5" />
            गैरहजर वारंवारीत (Frequency)
          </button>
          <AdminAuthorityBadge
            itemId="tab_frequency_analysis"
            title="Frequency Tab"
            marathiTitle="गैरहजर वारंवारता टॅब"
            category="button"
            module="attendance"
            position="inline"
            className="ml-1 shrink-0"
          />
        </div>

        <div className="relative flex items-center shrink-0">
          <button
            onClick={() => setActiveAnalysisTab('irregular')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeAnalysisTab === 'irregular'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline-block mr-1.5" />
            विद्यार्थी हजेरी सरासरी (Attendance %)
          </button>
          <AdminAuthorityBadge
            itemId="tab_irregular_students"
            title="Irregular Attendance Tab"
            marathiTitle="अनियमित हजेरी टॅब"
            category="button"
            module="attendance"
            position="inline"
            className="ml-1 shrink-0"
          />
        </div>

        <div className="relative flex items-center shrink-0">
          <button
            onClick={() => setActiveAnalysisTab('comparison')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeAnalysisTab === 'comparison'
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline-block mr-1.5" />
            तुलनात्मक विश्लेषण (Comparison)
          </button>
          <AdminAuthorityBadge
            itemId="tab_comparison_analysis"
            title="Comparison Analysis Tab"
            marathiTitle="तुलनात्मक विश्लेषण टॅब"
            category="button"
            module="attendance"
            position="inline"
            className="ml-1 shrink-0"
          />
        </div>
      </div>

      {activeAnalysisTab === 'overview' && (
      <>
      {/* Counters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Students */}
        <div id="stat-students" className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02] group">
          <AdminAuthorityBadge
            itemId="stat_total_students"
            title="Total Students Card"
            marathiTitle="एकूण विद्यार्थी कार्ड"
            category="section"
            module="attendance"
            position="top-right"
          />
          <div className="absolute right-2 bottom-2 text-indigo-400 opacity-20">
            <Users className="w-20 h-20" />
          </div>
          <Users className="w-5 h-5 text-indigo-100 mb-2" />
          <div className="text-2xl lg:text-3xl font-bold">{totalStudentsCount}</div>
          <div className="text-xs text-indigo-100 font-medium">एकूण विद्यार्थी (Total Students)</div>
        </div>

        {/* Attendance Percentage */}
        <div id="stat-percentage" className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02] group">
          <AdminAuthorityBadge
            itemId="stat_attendance_rate"
            title="Attendance Rate Card"
            marathiTitle="उपस्थिती दर कार्ड"
            category="section"
            module="attendance"
            position="top-right"
          />
          <div className="absolute right-2 bottom-2 text-emerald-400 opacity-20">
            <Percent className="w-20 h-20" />
          </div>
          <Percent className="w-5 h-5 text-emerald-100 mb-2" />
          <div className="text-2xl lg:text-3xl font-bold">{attendanceRate}%</div>
          <div className="text-xs text-emerald-100 font-medium font-bolder">उपस्थिती दर (Attendance Rate)</div>
        </div>

        {/* Total Present */}
        <div id="stat-present" className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02] group">
          <AdminAuthorityBadge
            itemId="stat_present_count"
            title="Present Records Card"
            marathiTitle="उपस्थित नोंदी कार्ड"
            category="section"
            module="attendance"
            position="top-right"
          />
          <div className="absolute right-2 bottom-2 text-sky-400 opacity-20">
            <UserCheck className="w-20 h-20" />
          </div>
          <UserCheck className="w-5 h-5 text-sky-100 mb-2" />
          <div className="text-2xl lg:text-3xl font-bold">{presentCount}</div>
          <div className="text-xs text-sky-100 font-medium">उपस्थित (Present Records)</div>
        </div>

        {/* Total Absent */}
        <div id="stat-absent" className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02] group">
          <AdminAuthorityBadge
            itemId="stat_absent_count"
            title="Absent Records Card"
            marathiTitle="अनुपस्थित नोंदी कार्ड"
            category="section"
            module="attendance"
            position="top-right"
          />
          <div className="absolute right-2 bottom-2 text-red-400 opacity-20">
            <UserX className="w-20 h-20" />
          </div>
          <UserX className="w-5 h-5 text-red-100 mb-2" />
          <div className="text-2xl lg:text-3xl font-bold">{absentCount}</div>
          <div className="text-xs text-red-100 font-medium font-bolder">अनुपस्थित (Absent Records)</div>
        </div>

        {/* Total Records Days Count */}
        <div id="stat-days" className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 text-white col-span-2 lg:col-span-1 shadow-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02] group">
          <AdminAuthorityBadge
            itemId="stat_days_tracked"
            title="Days Tracked Card"
            marathiTitle="एकूण दिवस कार्ड"
            category="section"
            module="attendance"
            position="top-right"
          />
          <div className="absolute right-2 bottom-2 text-violet-400 opacity-20">
            <Calendar className="w-20 h-20" />
          </div>
          <Calendar className="w-5 h-5 text-violet-100 mb-2" />
          <div className="text-2xl lg:text-3xl font-bold">{totalDays}</div>
          <div className="text-xs text-violet-100 font-medium">एकूण दिवस (Days Tracked)</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="flex overflow-x-auto pb-6 gap-6 scrollbar-thin">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-w-[320px] max-w-2xl w-full flex flex-col justify-between relative group">
          <AdminAuthorityBadge
            itemId="graph_attendance_ratio"
            title="Attendance Ratio Pie Chart"
            marathiTitle="उपस्थिती प्रमाण पाय चार्ट"
            category="graph"
            module="attendance"
            position="top-right"
          />
          <div>
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mb-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              उपस्थिती विश्लेषण (Ratio Analysis)
            </h3>
          </div>
          
          <div className="h-60 flex items-center justify-center my-4 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip 
                  formatter={(value: any, name: any) => [`${value} नोंदी`, name]}
                  contentStyle={{ borderRadius: '12px', borderColor: '#f1f5f9' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-slate-800">{attendanceRate}%</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">उपस्थिती दर</span>
            </div>
          </div>

          <div className="flex justify-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-500">अनुपस्थित (Absent)</span>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Continuous Absenteeism Analysis Card */}
      {activeAnalysisTab === 'streak' && (
      <div className="bg-white rounded-2xl p-6 border border-rose-150 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-rose-50/10 animate-fade-in animate-duration-200">
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shadow-4xs">
              <UserX className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm md:text-base">नवीनतम सलग गैरहजर विद्यार्थी विश्लेषण (Latest Continuous Absenteeism)</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 border border-rose-100/60 bg-white/60 p-4 rounded-xl mb-6 select-none shadow-3xs">
            {/* Min consecutive absent days / Streak Threshold */}
            <div>
              <label className="block text-[10px] font-extrabold text-rose-800 mb-1">किमान गैरहजर दिवस (Min Streak)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={minStreak}
                  onChange={(e) => setMinStreak(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs font-black border border-rose-150 rounded-xl px-2.5 py-1.5 bg-rose-50/10 text-rose-900 focus:bg-white focus:ring-1 focus:ring-rose-500 outline-none transition-all text-left"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-rose-700 font-bold">
                  दिवस
                </span>
              </div>
            </div>

            {/* Max consecutive absent days / Max Streak */}
            <div>
              <label className="block text-[10px] font-extrabold text-rose-800 mb-1">कमाल गैरहजर दिवस (Max Streak)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxStreak === '' ? '' : maxStreak}
                  onChange={(e) => setMaxStreak(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs font-black border border-rose-150 rounded-xl px-2.5 py-1.5 bg-rose-50/10 text-rose-900 focus:bg-white focus:ring-1 focus:ring-rose-500 outline-none transition-all text-left"
                  placeholder="अमर्याद (No Limit)"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-rose-700 font-bold">
                  दिवस
                </span>
              </div>
            </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-rose-100/50 pb-2 select-none">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                नवीनतम सलग गैरहजर विद्यार्थ्यांची यादी (Latest Streak List in Descending Order)
              </h4>
              <span className="text-[10px] text-slate-450 font-bold">
                एकूण: {streakFilteredStudents.length} विद्यार्थी आढळले
              </span>
            </div>

            {/* List with clicking and descending consecutive count */}
            {streakFilteredStudents.length === 0 ? (
              <div className="py-12 text-center text-xs font-black text-slate-400 bg-white border border-dashed border-slate-100 rounded-xl">
                निवडलेल्या निकषांनुसार सलग {' '}
                <span className="text-rose-600 font-extrabold font-sans text-sm">{minStreak}</span>
                {maxStreak !== '' ? (
                  <>
                    {' ते '}
                    <span className="text-rose-600 font-extrabold font-sans text-sm">{maxStreak}</span>
                  </>
                ) : (
                  ' किंवा त्यापेक्षा जास्त'
                )}
                {' दिवस सतत गैरहजर असलेला कोणताही विद्यार्थी आढळला नाही! 🎉'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {streakFilteredStudents.map((item, idx) => {
                  const fullStudent = students.find(s => s.id === item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => fullStudent && openStudentDetails(fullStudent, 'streak')}
                      className="bg-white hover:bg-rose-50/15 cursor-pointer border border-slate-150 hover:border-rose-300 rounded-xl p-4 flex items-center justify-between transition-all duration-200 hover:shadow-xs group relative"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-black text-xs group-hover:scale-105 transition-transform">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            🏢 {item.school}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="bg-indigo-50 text-indigo-700 font-sans font-bold text-[9px] px-2 py-0.5 rounded-full">
                              {item.classStr}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black ${
                              item.gender.includes('Girl') 
                                ? 'bg-pink-50 text-pink-650 border border-pink-100' 
                                : 'bg-cyan-50 text-cyan-800 border border-cyan-100'
                            }`}>
                              {item.gender}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="bg-rose-50 border border-rose-100 text-rose-700 font-sans font-black text-xs px-2.5 py-1.5 rounded-xl shadow-4xs inline-flex items-center gap-1 group-hover:bg-rose-100 group-hover:text-rose-800 transition-all">
                          🚫 {item.maxStreak} दिवस
                        </span>
                        <div className="text-[9px] text-slate-400 group-hover:text-rose-500 font-extrabold flex items-center gap-0.5 justify-end transition-colors mt-0.5">
                          माहिती ➔
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
      </div>
      )}

      {/* Attendance Range Presenter */}
      {activeAnalysisTab === 'irregular' && (
      <div className="grid grid-cols-1 gap-6">
        {/* Filtered Attendance List */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">गैरहजेरी सरासरीनुसार विद्यार्थी यादी</h3>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-600">किमान गैरहजेरी %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minAbsentPct}
                  onChange={(e) => setMinAbsentPct(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 text-xs font-bold border border-slate-200 rounded px-2 py-1 outline-none text-center"
                />
              </div>
              <span className="text-slate-300">-</span>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-600">कमाल गैरहजेरी %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={maxAbsentPct}
                  onChange={(e) => setMaxAbsentPct(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 text-xs font-bold border border-slate-200 rounded px-2 py-1 outline-none text-center"
                />
              </div>
            </div>
          </div>

          <div className="mt-2 overflow-x-auto overflow-y-auto max-h-96 border border-slate-100 rounded-xl">
              {lowAttendanceStudents.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">या श्रेणीत कोणताही विद्यार्थी नाही 👏</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">नाव (Name)</th>
                      <th className="py-2.5 px-3">शाळा (School)</th>
                      <th className="py-2.5 px-3 text-center">वर्ग</th>
                      <th className="py-2.5 px-3 text-right">गैरहजेरी (Absent %)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {lowAttendanceStudents.map((s, idx) => {
                      const absentPct = Math.round((100 - s.percentage) * 10) / 10;
                      const absentCount = s.totalCount - s.presentCount;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[120px] truncate">{s.school}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-500">{s.classStr}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                            {absentPct}% <span className="text-[10px] text-slate-400 font-normal">({absentCount}/{s.totalCount})</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
        </div>
      </div>
      )}

      {/* Weekly & Monthly Absenteeism Frequency Analysis Panel */}
      {activeAnalysisTab === 'frequency' && (
      <div className="bg-white rounded-2xl p-6 border border-violet-150 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-violet-50/10 animate-fade-in animate-duration-200">
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl shadow-4xs">
              <Calendar className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm md:text-base">गैरहजेरी साप्ताहिक व मासिक वारंवारता विश्लेषण (Weekly & Monthly Absent Frequency Analysis)</h3>
            </div>
          </div>
        </div>

            {/* Search for Frequency Analyzer */}
            <div className="border border-violet-100/65 bg-white/60 p-4 rounded-xl mb-6 select-none shadow-3xs max-w-sm">
              {/* Search Input for Student name */}
              <div>
                <label className="block text-[10px] font-extrabold text-violet-800 mb-1">नावानुसार शोधा (Search Student Name)</label>
                <input
                  type="text"
                  placeholder="विद्यार्थ्याचे नाव शोधा..."
                  value={freqSearchText}
                  onChange={(e) => setFreqSearchText(e.target.value)}
                  className="w-full text-xs font-semibold border border-violet-150 rounded-xl px-2.5 py-1.5 bg-violet-50/10 text-violet-900 focus:bg-white focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Output List */}
            {studentAbsentFrequencyList.filter(item => item.totalAbsences > 0).length === 0 ? (
              <div className="py-12 text-center text-xs font-black text-slate-400 bg-white border border-dashed border-violet-150 rounded-xl">
                {freqSearchText.trim() ? "या नावाने किंवा " : ""}निवडलेल्या कालावधीत एकही गैरहजर विद्यार्थी सापडला नाही! 🎉
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentAbsentFrequencyList
                  .filter(item => item.totalAbsences > 0)
                  .map((item, idx) => {
                    const fullStudent = students.find(s => s.id === item.studentId);
                    const avgWeekly = (item.totalAbsences / activeWeeksInPeriod).toFixed(1);
                    const avgMonthly = (item.totalAbsences / activeMonthsInPeriod).toFixed(1);
                    return (
                      <div
                        key={item.studentId}
                        className="bg-white border border-slate-150 hover:border-violet-300 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xs group relative"
                      >
                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-violet-550/10 text-violet-700 border border-violet-200 flex items-center justify-center font-black text-xs select-none">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 
                                onClick={() => fullStudent && openStudentDetails(fullStudent, 'frequency')}
                                className="text-xs font-extrabold text-slate-800 hover:text-violet-600 cursor-pointer hover:underline flex items-center gap-1 font-sans"
                              >
                                {item.name}
                                <span className="text-[8px] text-slate-400 font-bold ml-1 px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded">माहिती ➔</span>
                              </h4>
                              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                {item.school} • <span className="text-violet-700">{item.classStr}</span>
                              </span>
                            </div>
                          </div>

                          <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-1 rounded-lg text-[10px] font-black font-sans">
                            ❌ एकूण {item.totalAbsences} गैरहजर
                          </span>
                        </div>

                        {/* Averages Summary Section */}
                        <div className="bg-violet-50/20 rounded-xl p-3 mb-3 border border-violet-100/30 grid grid-cols-2 gap-3 text-center">
                          <div className="border-r border-violet-100/50 pr-1.5">
                            <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">साप्ताहिक सरासरी (Avg. Weekly)</span>
                            <span className="text-xs font-black text-violet-700 font-sans">
                              {avgWeekly}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold ml-1">दिवस/आठवडा</span>
                          </div>
                          <div className="pl-1.5">
                            <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">मासिक सरासरी (Avg. Monthly)</span>
                            <span className="text-xs font-black text-violet-700 font-sans">
                              {avgMonthly}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold ml-1">दिवस/महिना</span>
                          </div>
                        </div>

                        {/* Breakdown grids */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Weekly Block */}
                          <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/10">
                            <span className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wider">साप्ताहिक वारंवारता (Weekly)</span>
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {Object.values(item.weeklyAbsences).map((wAny, wIdx) => {
                                const w = wAny as { count: number; label: string; englishLabel: string };
                                return (
                                  <div key={wIdx} className="flex justify-between items-center text-[10px] bg-white px-2 py-1 rounded border border-slate-100 shadow-4xs">
                                    <span className="text-slate-600 font-semibold">{w.label}</span>
                                    <span className="text-rose-600 font-bold font-sans">{w.count} दिवस</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Monthly Block */}
                          <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/10">
                            <span className="block text-[10px] font-extrabold text-slate-500 mb-1.5 uppercase tracking-wider">मासिक वारंवारता (Monthly)</span>
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {Object.values(item.monthlyAbsences).map((mAny, mIdx) => {
                                const m = mAny as { count: number; label: string; englishLabel: string };
                                return (
                                  <div key={mIdx} className="flex justify-between items-center text-[10px] bg-white px-2 py-1 rounded border border-slate-100 shadow-4xs">
                                    <span className="text-slate-600 font-semibold">{m.label}</span>
                                    <span className="text-rose-600 font-bold font-sans">{m.count} दिवस</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
      </div>
      )}

      {/* Comparison Tab Analysis Panel */}
      {activeAnalysisTab === 'comparison' && (
        <div className="space-y-8 animate-fade-in animate-duration-200">
          
          {/* Graph 1: Class-wise Present Percentage Comparison (Single school selection) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-xs relative overflow-hidden">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm md:text-base">१. शाळा आणि वर्गनिहार उपस्थिती आलेख (Class-wise Comparison)</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">निवडलेल्या शाळेतील विविध इयत्ता आणि तुकडीनुसार उपस्थितीचा सरासरी आलेख (X-axis: इयत्ता तुकडी, Bars: उपस्थिती %)</p>
                </div>
              </div>

              {/* Controls for Graph 1 */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 shadow-3xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-500">पासून:</span>
                  <input
                    type="date"
                    value={g1FromDate}
                    onChange={(e) => setG1FromDate(e.target.value)}
                    className="text-xs font-bold border border-slate-200 rounded-xl px-2.5 py-1 bg-white outline-none focus:ring-1 focus:ring-teal-500 text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-500">पर्यंत:</span>
                  <input
                    type="date"
                    value={g1ToDate}
                    onChange={(e) => setG1ToDate(e.target.value)}
                    className="text-xs font-bold border border-slate-200 rounded-xl px-2.5 py-1 bg-white outline-none focus:ring-1 focus:ring-teal-500 text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-500">शाळा निवडा:</span>
                  <select
                    value={g1School || (schools.length > 0 ? schools[0] : '')}
                    onChange={(e) => setG1School(e.target.value)}
                    className="text-xs font-black border border-slate-200 rounded-xl px-3 py-1 bg-white outline-none focus:ring-1 focus:ring-teal-500 text-slate-700 cursor-pointer"
                  >
                    {schools.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Render Graph 1 */}
            {g1Data.length === 0 ? (
              <div className="py-16 text-center text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl">
                निवडलेल्या कालावधीत किंवा शाळेत कोणताही विद्यार्थी/उपस्थिती रेकॉर्ड सापडला नाही! 📊
              </div>
            ) : (
              <div className="w-full pt-4">
                <ZoomableGraphContainer defaultMinWidth={600}>
                  <div className="h-80 md:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={g1Data} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="className" 
                          tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                          stroke="#cbd5e1" 
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tickFormatter={(val) => `${val}%`} 
                          tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'semibold' }} 
                          stroke="#cbd5e1" 
                        />
                        <ChartTooltip
                          formatter={(value: any, name: any, propsOnAny: any) => {
                            const props = propsOnAny.payload;
                            return [
                              <div className="flex flex-col gap-0.5" key={props.className}>
                                <span className="text-teal-650 font-extrabold">{value}% उपस्थित</span>
                                <span className="text-[9px] text-slate-400 font-normal">({props.present} / {props.total} उपस्थिती दिवस)</span>
                              </div>,
                              "उपस्थिती"
                            ];
                          }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                        />
                        <Bar 
                          dataKey="percentage" 
                          name="उपस्थिती दर %" 
                          fill="#0d9488" 
                          radius={[6, 6, 0, 0]} 
                          maxBarSize={50} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ZoomableGraphContainer>
              </div>
            )}
          </div>

          {/* Graph 2: School-wise Comparative Present Percentage (Multiple schools selection) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-xs relative overflow-hidden">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm md:text-base">२. शाळांमधील तुलनात्मक उपस्थिती टक्केवारी आलेख (School-wise Comparison)</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">निवडलेल्या बहुविध शाळांमधील एकूण उपस्थिती दर तुलना (X-axis: शाळा नाव, Bars: शाळा उपस्थिती %)</p>
                </div>
              </div>

              {/* Controls for Graph 2 */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 shadow-3xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-500">पासून:</span>
                  <input
                    type="date"
                    value={g2FromDate}
                    onChange={(e) => setG2FromDate(e.target.value)}
                    className="text-xs font-bold border border-slate-200 rounded-xl px-2.5 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-500">पर्यंत:</span>
                  <input
                    type="date"
                    value={g2ToDate}
                    onChange={(e) => setG2ToDate(e.target.value)}
                    className="text-xs font-bold border border-slate-200 rounded-xl px-2.5 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2 relative">
                  <span className="text-[10px] font-extrabold text-slate-500">शाळा निवडा (Multi-Select):</span>
                  <button
                    type="button"
                    onClick={() => setIsG2SchoolOpen(!isG2SchoolOpen)}
                    className="text-xs font-black border border-slate-200 rounded-xl px-3 py-1 bg-white hover:bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 flex items-center justify-between cursor-pointer min-w-[140px]"
                  >
                    <span className="truncate pr-1">
                      {g2SelectedSchools.length === 0
                        ? 'सर्व शाळा (All)'
                        : `${g2SelectedSchools.length} शाळा`}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">▼</span>
                  </button>
                  {isG2SchoolOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsG2SchoolOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 space-y-1.5 z-30 min-w-[220px] max-h-60 overflow-y-auto">
                        {schools.map(school => (
                          <label key={school} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={g2SelectedSchools.includes(school)}
                              onChange={() => {
                                setG2SelectedSchools(prev =>
                                  prev.includes(school)
                                    ? prev.filter(x => x !== school)
                                    : [...prev, school]
                                );
                              }}
                              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                            />
                            <span>{school}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Render Graph 2 */}
            {g2Data.length === 0 ? (
              <div className="py-16 text-center text-xs font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl">
                निवडलेल्या कालावधीत किंवा शाळांत कोणताही विद्यार्थी/उपस्थिती रेकॉर्ड सापडला नाही! 📊
              </div>
            ) : (
              <div className="w-full pt-4">
                <ZoomableGraphContainer defaultMinWidth={600}>
                  <div className="h-80 md:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={g2Data} margin={{ top: 10, right: 10, left: -25, bottom: 45 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="schoolNameShort" 
                          tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} 
                          stroke="#cbd5e1"
                          angle={-15}
                          textAnchor="end"
                          height={65}
                          interval={0}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tickFormatter={(val) => `${val}%`} 
                          tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'semibold' }} 
                          stroke="#cbd5e1" 
                        />
                        <ChartTooltip
                          formatter={(value: any, name: any, propsOnAny: any) => {
                            const props = propsOnAny.payload;
                            return [
                              <div className="flex flex-col gap-1.5" key={props.schoolName}>
                                <p className="text-slate-800 font-extrabold border-b border-slate-100 pb-1 max-w-[220px] whitespace-normal leading-relaxed">{props.schoolName}</p>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-blue-600 font-extrabold text-xs">{value}% उपस्थित</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">({props.present} / {props.total} उपस्थिती दिवस)</span>
                                </div>
                              </div>,
                              "" // Exclude default label to avoid clutter
                            ];
                          }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', padding: '8px 12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                          dataKey="percentage" 
                          name="शाळा उपस्थिती %" 
                          fill="#2563eb" 
                          radius={[6, 6, 0, 0]} 
                          maxBarSize={50} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ZoomableGraphContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Details History Modal (Vidyarthi Section Calendar Style) */}
      {selectedDetailStudent && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSelectedDetailStudent(null)}
          />

          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl my-8 border border-slate-200 flex flex-col max-h-[85vh] animate-fade-in duration-200">
              
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-rose-50/50 to-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shadow-4xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 font-sans">
                      {selectedDetailStudent.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      शाळा: {selectedDetailStudent.school}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDetailStudent(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="text-lg font-bold">✕</span>
                </button>
              </div>

              {/* Scrollable Content Container */}
              <div className="overflow-y-auto p-6 space-y-6 flex-1">
                {/* Visual Details Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="block text-[10px] font-bold text-slate-400">इयत्ता (Class)</span>
                    <span className="text-xs font-black text-indigo-700 font-sans">इ. {selectedDetailStudent.std}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="block text-[10px] font-bold text-slate-400">तुकडी (Division)</span>
                    <span className="text-xs font-black text-amber-700 font-sans">{selectedDetailStudent.div}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="block text-[10px] font-bold text-slate-400">लिंग (Gender)</span>
                    <span className="text-xs font-black text-slate-700">
                      {(() => {
                        const g = (selectedDetailStudent.gender || '').toLowerCase();
                        if (g === 'female' || g === 'girl' || g === 'f' || g === 'मुलगी' || g === 'स्त्री') return 'मुलगी (Girl)';
                        return 'मुलगा (Boy)';
                      })()}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="block text-[10px] font-bold text-slate-400">माध्यम (Medium)</span>
                    <span className="text-xs font-black text-slate-700">{selectedDetailStudent.medium || 'मराठी (Marathi)'}</span>
                  </div>
                </div>

                {/* Performance Summary Metrics */}
                <div>
                  <h4 className="text-xs font-bold text-slate-550 mb-3 uppercase tracking-wider select-none font-sans">कालावधी हजेरी गोषवारा (Attendance Summary)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50/55 border border-slate-150 p-4 rounded-xl text-center shadow-3xs">
                      <div className="text-lg font-black text-slate-800 font-sans">{(() => {
                        let present = 0;
                        let absent = 0;
                        records.forEach(r => {
                          if (r.studentId === selectedDetailStudent.id && r.date >= detailFromDate && r.date <= detailToDate) {
                            if (r.status === 'Present') present++;
                            else if (r.status === 'Absent') absent++;
                          }
                        });
                        return present + absent;
                      })()}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">मोजलेले एकूण दिवस</div>
                    </div>

                    <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl text-center shadow-3xs">
                      <div className="text-lg font-black text-emerald-600 font-sans">{(() => {
                        let present = 0;
                        records.forEach(r => {
                          if (r.studentId === selectedDetailStudent.id && r.date >= detailFromDate && r.date <= detailToDate && r.status === 'Present') {
                            present++;
                          }
                        });
                        return present;
                      })()}</div>
                      <div className="text-[10px] text-emerald-550 font-semibold mt-1">उपस्थित (Present)</div>
                    </div>

                    <div className="bg-rose-50/40 border border-rose-100 p-4 rounded-xl text-center shadow-3xs">
                      <div className="text-lg font-black text-rose-600 font-sans">{(() => {
                        let absent = 0;
                        records.forEach(r => {
                          if (r.studentId === selectedDetailStudent.id && r.date >= detailFromDate && r.date <= detailToDate && r.status === 'Absent') {
                            absent++;
                          }
                        });
                        return absent;
                      })()}</div>
                      <div className="text-[10px] text-rose-500 font-semibold mt-1">अनुपस्थित (Absent)</div>
                    </div>

                    <div className="bg-violet-50/40 border border-violet-100 p-4 rounded-xl text-center shadow-3xs">
                      <div className="text-lg font-black text-violet-700 font-sans">{(() => {
                        let present = 0;
                        let absent = 0;
                        records.forEach(r => {
                          if (r.studentId === selectedDetailStudent.id && r.date >= detailFromDate && r.date <= detailToDate) {
                            if (r.status === 'Present') present++;
                            else if (r.status === 'Absent') absent++;
                          }
                        });
                        const total = present + absent;
                        return total > 0 ? `${Math.round((present / total) * 105) > 100 ? 100 : Math.round((present / total) * 100)}%` : '0%';
                      })()}</div>
                      <div className="text-[10px] text-violet-600 font-semibold mt-1">हजेरी प्रमाण (%)</div>
                    </div>
                  </div>
                </div>

                {/* Calendar History Section */}
                <div>
                  <h4 className="text-xs font-bold text-slate-555 mb-3 uppercase tracking-wider select-none flex items-center justify-between">
                    <span>दैनिक तारीखवार हजेरी (Date-by-Date Attendance)</span>
                    <span className="text-[10px] font-bold text-slate-450 font-sans normal-case">कालावधी: {detailFromDate} ते {detailToDate}</span>
                  </h4>
                  
                  <div className="border border-slate-150 rounded-xl overflow-hidden max-h-72 overflow-y-auto shadow-3xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black select-none">
                          <th className="py-2.5 px-4 font-bold text-slate-705">तारीख (Date)</th>
                          <th className="py-2.5 px-4 text-center font-bold text-slate-705">स्थिती (Status)</th>
                          <th className="py-2.5 px-4 text-right font-bold text-slate-705">तपशील (Details)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-705 bg-white">
                        {getDatesInRange(detailFromDate, detailToDate).slice().reverse().map(date => {
                          const r = records.find(rec => rec.studentId === selectedDetailStudent.id && rec.date === date);
                          const status = r ? r.status : null;
                          
                          let statusBadge = (
                            <span className="text-slate-300 font-normal">—</span>
                          );
                          let statusText = "माहिती नाही (No Record)";
                          
                          if (status === 'Present') {
                            statusBadge = <span className="text-sm">✅</span>;
                            statusText = "उपस्थित (Present)";
                          } else if (status === 'Absent') {
                            statusBadge = <span className="text-sm">❌</span>;
                            statusText = "अनुपस्थित (Absent)";
                          } else if (status === 'Holiday') {
                            statusBadge = <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[9px] px-1.5 py-0.5 rounded font-black font-sans uppercase">H</span>;
                            statusText = "सुट्टी (Holiday)";
                          } else if (status === 'Leave') {
                            statusBadge = <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] px-1.5 py-0.5 rounded font-black font-sans uppercase">LH</span>;
                            statusText = "रजा (Leave)";
                          }

                          return (
                            <tr key={date} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-800 font-sans">{date}</td>
                              <td className="py-2.5 px-4 text-center">{statusBadge}</td>
                              <td className="py-2.5 px-4 text-right">
                                <span className={`text-[11px] font-black ${
                                  status === 'Present' 
                                    ? 'text-emerald-600' 
                                    : status === 'Absent' 
                                      ? 'text-rose-600' 
                                      : status === 'Holiday'
                                        ? 'text-rose-650'
                                        : status === 'Leave'
                                          ? 'text-blue-600'
                                          : 'text-slate-400'
                                }`}>
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Modal Control Footer Content */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDetailStudent(null)}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-3xs"
                >
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
