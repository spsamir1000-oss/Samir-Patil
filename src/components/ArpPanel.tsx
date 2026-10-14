import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  TrendingUp, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Target,
  FileCheck,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Edit2,
  Trash2,
  ListTodo,
  Award,
  Search,
  Filter
} from 'lucide-react';
import { Teacher, Student } from '../types';
import ArpAssessmentManager from './ArpAssessmentManager';
import ArpAssessmentSection from './ArpAssessmentSection';
import BaselineExaminationSection from './BaselineExaminationSection';
import SerpDownload from './SerpDownload';
import SerpAnalysis from './SerpAnalysis';
import BoardableBaselineDashboard from './BoardableBaselineDashboard';

const formatMarkPercent = (mark: any) => {
  if (mark === undefined || mark === null || mark === '') return "-";
  const num = Number(mark);
  if (isNaN(num)) return mark;
  return `${num} (${num * 10}%)`;
};

const isSection2Applicable = (classGrade: string) => {
  if (!classGrade) return false;
  const num = parseInt(classGrade);
  return !isNaN(num) && num > 4;
};

interface ArpPanelProps {
  currentUser: Teacher | null;
  students: Student[];
  teachers: Teacher[];
  setActiveModule: (module: 'selection' | 'attendance' | 'inventory' | 'serp' | 'arp') => void;
  handleLogout: () => void;
}

type ActiveTab = 'dashboard' | 'examinations' | 'assessment' | 'levels' | 'student_list' | 'download';
type DashboardSubTab = 'analytics' | 'dailyLogs';
type AssessmentSubTab = 'baseline_examination' | 'endline_examination' | 'boardable_baseline' | 'boardable_midline' | 'boardable_endline' | 'module';

interface DailyLog {
  id: string;
  date: string;
  teacherId: string;
  status?: string;
  school: string;
  classGrade: string;
  division: string;
  module: string;
  subModule?: string;
  session: string;
  optionalSession?: string;
  eventName?: string;
  worksheet: string;
  challenges?: string;
}

interface ClassEntry {
  school: string;
  classGrade: string;
  division: string;
  module: string;
  subModule?: string;
  session: string;
  optionalSession?: string;
  eventName?: string;
  worksheet: string;
  otherModule?: string;
  otherHours?: string;
  otherMinutes?: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

function MultiSelectDropdown({ label, options, selectedValues, onChange, placeholder, disabled }: MultiSelectDropdownProps) {
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
    <div className={`relative text-left ${disabled ? 'opacity-50' : ''}`}>
      <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs transition-colors ${
          disabled 
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
        }`}
      >
        <span className="truncate max-w-[150px]">
          {selectedValues.length === 0 
            ? (placeholder || `-- Select --`) 
            : `${selectedValues.length} Selected`}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedValues.length > 0 && !disabled && (
            <span 
              onClick={clearSelection}
              className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-1.5 py-0.5 rounded font-black cursor-pointer"
            >
              Clear
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-40 max-h-60 overflow-y-auto p-2.5 space-y-1 animate-fade-in">
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
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-3.5 h-3.5"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
            {options.length === 0 && (
              <div className="p-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                No options available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ArpPanel({ currentUser, students: mainStudents, teachers, setActiveModule, handleLogout }: ArpPanelProps) {
  const isManagement = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'academic_coordinator';
  const isArpTeacher = currentUser?.role === 'teacher' && currentUser?.types?.some(t => t.toUpperCase() === 'ARP');
  const canAccess = isManagement || isArpTeacher;

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-md border border-slate-200/80 shadow-xl flex flex-col items-center">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl mb-6">
            <BookOpen className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Access Denied (प्रवेश नाकारला)</h2>
          <p className="text-slate-500 font-medium mb-6">
            या विभागासाठी तुमच्याकडे आवश्यक परवानग्या नाहीत. हा विभाग केवळ ARP लॉगिन आणि शैक्षणिक समन्वयक, व्यवस्थापक, किंवा प्रशासक यांच्यासाठीच उपलब्ध आहे.
          </p>
          <button 
            onClick={() => setActiveModule('selection')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl transition-all duration-200 shadow-sm"
          >
            मुख्य पृष्ठावर जा
          </button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [dashboardSubTab, setDashboardSubTab] = useState<DashboardSubTab>('analytics');
  const [examinationSubTab, setExaminationSubTab] = useState<AssessmentSubTab>('baseline_examination');
  const [baselineTab, setBaselineTab] = useState<'baseline' | 'endline'>('baseline');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load ARP-specific data
  const [arpStudents, setArpStudents] = useState<any[]>(() => {
    const saved = localStorage.getItem('arp_uploaded_students');
    return saved ? JSON.parse(saved) : [];
  });

  const [arpRecords, setArpRecords] = useState<any[]>(() => {
    const saved = localStorage.getItem('arp_assessment_records');
    let parsed = saved ? JSON.parse(saved) : [];
    // One-time automatic cleanup for boardable baseline records
    const hasCleaned = localStorage.getItem('arp_baseline_cleaned_v1');
    if (!hasCleaned && parsed.length > 0) {
      parsed = parsed.filter((r: any) => r.type !== 'boardable_baseline');
      localStorage.setItem('arp_assessment_records', JSON.stringify(parsed));
      localStorage.setItem('arp_baseline_cleaned_v1', 'true');
    } else if (!hasCleaned) {
      localStorage.setItem('arp_baseline_cleaned_v1', 'true');
    }
    return parsed;
  });

  // Filter States for Student's Levels
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['Boy', 'Girl']);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [searchNameQuery, setSearchNameQuery] = useState<string>('');
  const [levelsChangesFilter, setLevelsChangesFilter] = useState<string>('all');
  const [levelsProgressFilter, setLevelsProgressFilter] = useState<string>('all');

  // Filter States for Student List
  const [listSelectedSchools, setListSelectedSchools] = useState<string[]>([]);
  const [listSelectedClasses, setListSelectedClasses] = useState<string[]>([]);
  const [listSelectedDivisions, setListSelectedDivisions] = useState<string[]>([]);
  const [listSelectedGenders, setListSelectedGenders] = useState<string[]>(['Boy', 'Girl']);
  const [listSelectedLevels, setListSelectedLevels] = useState<string[]>([]);
  const [listSearchNameQuery, setListSearchNameQuery] = useState<string>('');
  const [listChangesFilter, setListChangesFilter] = useState<string>('all');
  const [listProgressFilter, setListProgressFilter] = useState<string>('all');
  const [listSubTab, setListSubTab] = useState<'combined' | 'baseline' | 'midline' | 'endline'>('baseline');

  // Keep levels data in sync on tab focus, custom change event, or subtab change
  useEffect(() => {
    const syncData = () => {
      const savedStudents = localStorage.getItem('arp_uploaded_students');
      if (savedStudents) {
        setArpStudents(JSON.parse(savedStudents));
      } else {
        setArpStudents([]);
      }
      const savedRecords = localStorage.getItem('arp_assessment_records');
      if (savedRecords) {
        setArpRecords(JSON.parse(savedRecords));
      } else {
        setArpRecords([]);
      }
    };

    window.addEventListener('arp-records-changed', syncData);
    syncData(); // sync immediately

    return () => {
      window.removeEventListener('arp-records-changed', syncData);
    };
  }, [activeTab, examinationSubTab, dashboardSubTab, baselineTab]);

  const getStudentLevelForType = (student: any, recordsList: any[], type: 'boardable_baseline' | 'boardable_midline' | 'boardable_endline') => {
    const record = recordsList.find(r => r.studentId === student.id && r.type === type);
    if (!record || record.attendance === 'Absent' || record.section1 === undefined || record.section1 === null || record.section1 === '') {
      return "Not Assessed";
    }
    
    const classGrade = student.classGrade || '';
    const classNum = parseInt(classGrade);
    if (isNaN(classNum)) return "Not Assessed";

    const sec1 = Number(record.section1);
    const sec2 = record.section2 !== undefined && record.section2 !== null && record.section2 !== '' ? Number(record.section2) : undefined;

    // Class 4th -
    // Section A < 6 then "FLN BC"
    // Section A > 5 then "PSG Acquire"
    if (classNum === 4) {
      if (sec1 < 6) return "FLN BC";
      if (sec1 > 5) return "PSG Acquire";
    } 
    // Class 5th -
    // Section A < 6 then "FLN BC"
    // Section A > 5 and section B < 6 then "PSG Acquire"
    // Section A > 5 and section B > 5 then "PSG Enhance"
    else if (classNum === 5) {
      if (sec1 < 6) return "FLN BC";
      if (sec1 > 5) {
        if (sec2 === undefined || sec2 < 6) return "PSG Acquire";
        return "PSG Enhance";
      }
    } 
    // Class 6th -
    // Section A < 6 then "FLN BC"
    // Section A > 5 and section B < 6 then "PSG BC"
    // Section A > 5 and section B > 5 then "MSG Acquire"
    else if (classNum === 6) {
      if (sec1 < 6) return "FLN BC";
      if (sec1 > 5) {
        if (sec2 === undefined || sec2 < 6) return "PSG BC";
        return "MSG Acquire";
      }
    } 
    // 7th - 
    // Section A < 6 then "FLN BC"
    // Section A > 5 and section B < 6 then "PSG BC"
    // Section A > 5 and section B = 6,7 then "MSG Acquire"
    // Section A > 5 and Section B = 8,9,10 then "MSG Enhance"
    else if (classNum === 7) {
      if (sec1 < 6) return "FLN BC";
      if (sec1 > 5) {
        if (sec2 === undefined || sec2 < 6) return "PSG BC";
        if (sec2 === 6 || sec2 === 7) return "MSG Acquire";
        if (sec2 >= 8 && sec2 <= 10) return "MSG Enhance";
      }
    } 
    // Class 8th -
    // Section A < 6 then FLN BC
    // Section A > 5 and Section B < 6 then "PSG BC"
    // Section A > 5 and Section B > 5 then "Support Classes"
    else if (classNum === 8) {
      if (sec1 < 6) return "FLN BC";
      if (sec1 > 5) {
        if (sec2 === undefined || sec2 < 6) return "PSG BC";
        return "Support Classes";
      }
    }

    return "Not Assessed";
  };

  const getStudentLevel = (student: any, recordsList: any[]) => {
    const endlineLevel = getStudentLevelForType(student, recordsList, 'boardable_endline');
    if (endlineLevel !== "Not Assessed") {
      return endlineLevel;
    }
    const midlineLevel = getStudentLevelForType(student, recordsList, 'boardable_midline');
    if (midlineLevel !== "Not Assessed") {
      return midlineLevel;
    }
    return getStudentLevelForType(student, recordsList, 'boardable_baseline');
  };

  const LEVEL_RANK_ORDER: Record<string, number> = {
    "FLN BC": 1,
    "PSG BC": 2,
    "PSG Acquire": 3,
    "PSG Enhance": 4,
    "MSG Acquire": 5,
    "MSG Enhance": 6,
    "Support Classes": 7
  };

  const matchesChangesAndProgress = (student: any, recordsList: any[], changesVal: string, progressVal: string) => {
    if (changesVal === 'all' && progressVal === 'all') {
      return true;
    }

    const blLvl = getStudentLevelForType(student, recordsList, 'boardable_baseline');
    const mlLvl = getStudentLevelForType(student, recordsList, 'boardable_midline');
    const elLvl = getStudentLevelForType(student, recordsList, 'boardable_endline');

    const checkChange = (lvlA: string, lvlB: string) => {
      if (lvlA === "Not Assessed" || lvlB === "Not Assessed") {
        return false;
      }
      const rA = LEVEL_RANK_ORDER[lvlA] || 0;
      const rB = LEVEL_RANK_ORDER[lvlB] || 0;

      if (progressVal === 'all') {
        return rA !== rB;
      } else if (progressVal === 'step_up') {
        return rB > rA;
      } else if (progressVal === 'step_down') {
        return rB < rA;
      } else if (progressVal === 'same') {
        return rA === rB;
      }
      return true;
    };

    if (changesVal === 'bl_to_ml') {
      return checkChange(blLvl, mlLvl);
    } else if (changesVal === 'ml_to_el') {
      return checkChange(mlLvl, elLvl);
    } else if (changesVal === 'bl_to_el') {
      return checkChange(blLvl, elLvl);
    } else if (changesVal === 'all') {
      return checkChange(blLvl, mlLvl) || checkChange(mlLvl, elLvl) || checkChange(blLvl, elLvl);
    }

    return true;
  };

  const getLevelBadgeStyle = (level: string) => {
    if (level === "FLN BC") return "bg-rose-50 text-rose-700 border-rose-200 font-extrabold shadow-2xs";
    if (level === "PSG BC") return "bg-orange-50 text-orange-700 border-orange-200 font-extrabold shadow-2xs";
    if (level === "PSG Acquire") return "bg-amber-50 text-amber-700 border-amber-200 font-extrabold shadow-2xs";
    if (level === "PSG Enhance") return "bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold shadow-2xs";
    if (level === "MSG Acquire") return "bg-sky-50 text-sky-700 border-sky-200 font-extrabold shadow-2xs";
    if (level === "MSG Enhance") return "bg-indigo-50 text-indigo-700 border-indigo-200 font-extrabold shadow-2xs";
    if (level === "Support Classes") return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 font-extrabold shadow-2xs";
    return "bg-slate-50 text-slate-700 border-slate-200 font-extrabold shadow-2xs";
  };

  const getCardBgStyle = (level: string) => {
    if (level === "FLN BC") return "bg-rose-50/95 border-rose-200/80 hover:border-rose-400 text-rose-950";
    if (level === "PSG BC") return "bg-orange-50/95 border-orange-200/80 hover:border-orange-400 text-orange-950";
    if (level === "PSG Acquire") return "bg-amber-50/95 border-amber-200/80 hover:border-amber-400 text-amber-950";
    if (level === "PSG Enhance") return "bg-emerald-50/95 border-emerald-200/80 hover:border-emerald-400 text-emerald-950";
    if (level === "MSG Acquire") return "bg-sky-50/95 border-sky-200/80 hover:border-sky-400 text-sky-950";
    if (level === "MSG Enhance") return "bg-indigo-50/95 border-indigo-200/80 hover:border-indigo-400 text-indigo-950";
    if (level === "Support Classes") return "bg-fuchsia-50/95 border-fuchsia-200/80 hover:border-fuchsia-400 text-fuchsia-950";
    return "bg-slate-50/95 border-slate-200/80 hover:border-slate-400 text-slate-900";
  };

  const [logs, setLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('arp_teaching_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logStatus, setLogStatus] = useState<'Present' | 'Holiday' | 'On Leave'>('Present');
  const [logChallenges, setLogChallenges] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [showRecentLogs, setShowRecentLogs] = useState(true);

  const [classEntries, setClassEntries] = useState<ClassEntry[]>(() => {
    const lastSchool = localStorage.getItem('arp_last_school') || '';
    return [{ school: lastSchool, classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes', otherModule: '', otherHours: '0', otherMinutes: '0' }];
  });

  // Calculate unique schools from ARP uploaded students, or fall back to main system students
  const schoolOptions = useMemo(() => {
    const fromArp = Array.from(new Set(arpStudents.map(s => s.schoolName || s.school))).filter(Boolean);
    if (fromArp.length > 0) return fromArp.sort();
    return Array.from(new Set(mainStudents.map(s => s.school))).filter(Boolean).sort();
  }, [arpStudents, mainStudents]);

  const levelsFilterOptions = useMemo(() => {
    const schools = Array.from(new Set(arpStudents.map(s => s.schoolName || s.school))).filter(Boolean).sort() as string[];
    const classes = Array.from(new Set(arpStudents.map(s => s.classGrade))).filter(Boolean).sort() as string[];
    const divisions = Array.from(new Set(arpStudents.map(s => s.division))).filter(Boolean).sort() as string[];
    const genders = ['Boy', 'Girl'];
    const levels = ["FLN BC", "PSG BC", "PSG Acquire", "PSG Enhance", "MSG Acquire", "MSG Enhance", "Support Classes", "Not Assessed"];
    return { schools, classes, divisions, genders, levels };
  }, [arpStudents]);

  const filteredLevelsStudents = useMemo(() => {
    const list = arpStudents.filter(student => {
      // Name Search
      if (searchNameQuery.trim()) {
        const query = searchNameQuery.toLowerCase();
        const name = (student.studentName || '').toLowerCase();
        if (!name.includes(query)) return false;
      }
      // School Name
      if (selectedSchools.length > 0) {
        const school = student.schoolName || student.school || '';
        if (!selectedSchools.includes(school)) return false;
      }
      // Class
      if (selectedClasses.length > 0) {
        if (!selectedClasses.includes(student.classGrade)) return false;
      }
      // Division
      if (selectedDivisions.length > 0) {
        if (!selectedDivisions.includes(student.division)) return false;
      }
      // Gender
      if (selectedGenders.length > 0) {
        if (!selectedGenders.includes(student.gender)) return false;
      }
      // Level
      if (selectedLevels.length > 0) {
        const level = getStudentLevel(student, arpRecords);
        if (!selectedLevels.includes(level)) return false;
      }
      // Changes and Progress Filter
      if (!matchesChangesAndProgress(student, arpRecords, levelsChangesFilter, levelsProgressFilter)) {
        return false;
      }
      return true;
    });

    const LEVEL_RANK: Record<string, number> = {
      "FLN BC": 1,
      "PSG BC": 2,
      "PSG Acquire": 3,
      "PSG Enhance": 4,
      "MSG Acquire": 5,
      "MSG Enhance": 6,
      "Support Classes": 7,
      "Not Assessed": 8
    };

    const getClassNumber = (cls: string) => {
      const num = parseInt(cls);
      if (!isNaN(num)) return num;
      const match = cls.match(/\d+/);
      if (match) return parseInt(match[0]);
      return 999;
    };

    return [...list].sort((a, b) => {
      // 1. Class ascending
      const classA = getClassNumber(a.classGrade || '');
      const classB = getClassNumber(b.classGrade || '');
      if (classA !== classB) {
        return classA - classB;
      }

      // 2. Division ascending
      const divA = (a.division || '').toUpperCase();
      const divB = (b.division || '').toUpperCase();
      if (divA !== divB) {
        return divA.localeCompare(divB);
      }

      // 3. Level rank ascending
      const levelA = getStudentLevel(a, arpRecords);
      const levelB = getStudentLevel(b, arpRecords);
      const rankA = LEVEL_RANK[levelA] || 99;
      const rankB = LEVEL_RANK[levelB] || 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 4. Student Name ascending
      const nameA = (a.studentName || '').toLowerCase().trim();
      const nameB = (b.studentName || '').toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });
  }, [arpStudents, arpRecords, searchNameQuery, selectedSchools, selectedClasses, selectedDivisions, selectedGenders, selectedLevels, levelsChangesFilter, levelsProgressFilter]);

  const filteredLevelsStudentsForCounts = useMemo(() => {
    return arpStudents.filter(student => {
      // Name Search
      if (searchNameQuery.trim()) {
        const query = searchNameQuery.toLowerCase();
        const name = (student.studentName || '').toLowerCase();
        if (!name.includes(query)) return false;
      }
      // School Name
      if (selectedSchools.length > 0) {
        const school = student.schoolName || student.school || '';
        if (!selectedSchools.includes(school)) return false;
      }
      // Class
      if (selectedClasses.length > 0) {
        if (!selectedClasses.includes(student.classGrade)) return false;
      }
      // Division
      if (selectedDivisions.length > 0) {
        if (!selectedDivisions.includes(student.division)) return false;
      }
      // Gender
      if (selectedGenders.length > 0) {
        if (!selectedGenders.includes(student.gender)) return false;
      }
      // Changes and Progress Filter
      if (!matchesChangesAndProgress(student, arpRecords, levelsChangesFilter, levelsProgressFilter)) {
        return false;
      }
      return true;
    });
  }, [arpStudents, arpRecords, searchNameQuery, selectedSchools, selectedClasses, selectedDivisions, selectedGenders, levelsChangesFilter, levelsProgressFilter]);

  const listFilteredLevelsStudents = useMemo(() => {
    const list = arpStudents.filter(student => {
      // Name Search
      if (listSearchNameQuery.trim()) {
        const query = listSearchNameQuery.toLowerCase();
        const name = (student.studentName || '').toLowerCase();
        if (!name.includes(query)) return false;
      }
      // School Name
      if (listSelectedSchools.length > 0) {
        const school = student.schoolName || student.school || '';
        if (!listSelectedSchools.includes(school)) return false;
      }
      // Class
      if (listSelectedClasses.length > 0) {
        if (!listSelectedClasses.includes(student.classGrade)) return false;
      }
      // Division
      if (listSelectedDivisions.length > 0) {
        if (!listSelectedDivisions.includes(student.division)) return false;
      }
      // Gender
      if (listSelectedGenders.length > 0) {
        if (!listSelectedGenders.includes(student.gender)) return false;
      }
      // Level
      if (listSelectedLevels.length > 0 && !(listSubTab === 'combined' && listChangesFilter !== 'all')) {
        const level = getStudentLevel(student, arpRecords);
        if (!listSelectedLevels.includes(level)) return false;
      }
      return true;
    });

    const LEVEL_RANK: Record<string, number> = {
      "FLN BC": 1,
      "PSG BC": 2,
      "PSG Acquire": 3,
      "PSG Enhance": 4,
      "MSG Acquire": 5,
      "MSG Enhance": 6,
      "Support Classes": 7,
      "Not Assessed": 8
    };

    const getClassNumber = (cls: string) => {
      const num = parseInt(cls);
      if (!isNaN(num)) return num;
      const match = cls.match(/\d+/);
      if (match) return parseInt(match[0]);
      return 999;
    };

    return [...list].sort((a, b) => {
      // 1. Class ascending
      const classA = getClassNumber(a.classGrade || '');
      const classB = getClassNumber(b.classGrade || '');
      if (classA !== classB) {
        return classA - classB;
      }

      // 2. Division ascending
      const divA = (a.division || '').toUpperCase();
      const divB = (b.division || '').toUpperCase();
      if (divA !== divB) {
        return divA.localeCompare(divB);
      }

      // 3. Level rank ascending
      const levelA = getStudentLevel(a, arpRecords);
      const levelB = getStudentLevel(b, arpRecords);
      const rankA = LEVEL_RANK[levelA] || 99;
      const rankB = LEVEL_RANK[levelB] || 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 4. Student Name ascending
      const nameA = (a.studentName || '').toLowerCase().trim();
      const nameB = (b.studentName || '').toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });
  }, [arpStudents, arpRecords, listSearchNameQuery, listSelectedSchools, listSelectedClasses, listSelectedDivisions, listSelectedGenders, listSelectedLevels]);

  const subTabStudents = useMemo(() => {
    if (listSubTab === 'combined') {
      return listFilteredLevelsStudents.filter(student =>
        matchesChangesAndProgress(student, arpRecords, listChangesFilter, listProgressFilter)
      );
    }
    return listFilteredLevelsStudents.filter(student => 
      arpRecords.some(r => r.studentId === student.id && r.type === `boardable_${listSubTab}`)
    );
  }, [listFilteredLevelsStudents, listSubTab, arpRecords, listChangesFilter, listProgressFilter]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "FLN BC": 0,
      "PSG BC": 0,
      "PSG Acquire": 0,
      "PSG Enhance": 0,
      "MSG Acquire": 0,
      "MSG Enhance": 0,
      "Support Classes": 0,
      "Not Assessed": 0
    };
    filteredLevelsStudentsForCounts.forEach(student => {
      const lvl = getStudentLevel(student, arpRecords);
      counts[lvl] = (counts[lvl] || 0) + 1;
    });
    return counts;
  }, [filteredLevelsStudentsForCounts, arpRecords]);

  const classOptions = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  const divisionOptions = ['A', 'B', 'C', 'D', 'E', 'F'];
  const mainModuleOptions = [
    ...Array.from({length: 10}, (_, i) => `Module ${i + 1}`),
    'Event',
    'Module Examination',
    'Baseline Examination',
    'Endline Examination',
    'Other'
  ];
  const sessionOptions = ['Session 1', 'Session 2', 'Session 3', 'Session 4'];
  const worksheetOptions = ['Yes', 'No'];

  const handleEntryChange = (index: number, field: keyof ClassEntry, value: string) => {
    const updated = [...classEntries];
    (updated[index] as any)[field] = value;
    setClassEntries(updated);

    if (field === 'school') {
      localStorage.setItem('arp_last_school', value);
    }
  };

  const handleAddEntry = () => {
    const lastEntry = classEntries[classEntries.length - 1];
    if (lastEntry) {
      setClassEntries([...classEntries, { ...lastEntry }]);
    } else {
      const lastSchool = localStorage.getItem('arp_last_school') || '';
      setClassEntries([...classEntries, { school: lastSchool, classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes', otherModule: '', otherHours: '0', otherMinutes: '0' }]);
    }
  };

  const handleRemoveEntry = (index: number) => {
    const updated = [...classEntries];
    updated.splice(index, 1);
    setClassEntries(updated);
  };

  const isFormValid = () => {
    if (!logDate) return false;
    if (logStatus !== 'Present') return true;
    if (classEntries.length === 0) return false;

    return classEntries.every(entry => {
      if (!entry.school) return false;
      if (!entry.classGrade) return false;
      if (!entry.division) return false;
      if (!entry.module) return false;

      if (entry.module === 'Other') {
        if (!entry.otherModule) return false;
      } else if (entry.module === 'Event') {
        if (!entry.eventName) return false;
      } else {
        if (!entry.session) return false;
      }
      return true;
    });
  };

  const handleSaveLogs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      alert("Please fill all required fields in all entries.");
      return;
    }

    let updatedLogs = [...logs];

    if (logStatus !== 'Present') {
      const newLog: DailyLog = {
        id: editingLogId || Date.now().toString() + Math.random().toString(36).substring(7),
        date: logDate,
        teacherId: currentUser?.id || 'Unknown',
        status: logStatus,
        school: '',
        classGrade: '',
        division: '',
        module: '',
        session: '',
        worksheet: 'No',
        challenges: logChallenges
      };

      if (editingLogId) {
        updatedLogs = updatedLogs.map(l => l.id === editingLogId ? newLog : l);
      } else {
        updatedLogs.push(newLog);
      }
    } else {
      // For Present status, create/edit entries
      if (editingLogId) {
        // Edit mode (typically single entry replacement)
        const entry = classEntries[0];
        const updatedLog: DailyLog = {
          id: editingLogId,
          date: logDate,
          teacherId: currentUser?.id || 'Unknown',
          status: 'Present',
          school: entry.school,
          classGrade: entry.classGrade,
          division: entry.division,
          module: entry.module === 'Other' ? `Other: ${entry.otherModule}` : (entry.module === 'Event' ? `Event: ${entry.eventName}` : entry.module),
          session: entry.session || '',
          worksheet: entry.worksheet,
          challenges: logChallenges
        };
        updatedLogs = updatedLogs.map(l => l.id === editingLogId ? updatedLog : l);
      } else {
        // Add mode: can add multiple class entries at once
        classEntries.forEach((entry, idx) => {
          const newLog: DailyLog = {
            id: Date.now().toString() + Math.random().toString(36).substring(7) + idx,
            date: logDate,
            teacherId: currentUser?.id || 'Unknown',
            status: 'Present',
            school: entry.school,
            classGrade: entry.classGrade,
            division: entry.division,
            module: entry.module === 'Other' ? `Other: ${entry.otherModule}` : (entry.module === 'Event' ? `Event: ${entry.eventName}` : entry.module),
            session: entry.session || '',
            worksheet: entry.worksheet,
            challenges: logChallenges
          };
          updatedLogs.push(newLog);
        });
      }
    }

    setLogs(updatedLogs);
    localStorage.setItem('arp_teaching_logs', JSON.stringify(updatedLogs));

    // Reset Form
    setEditingLogId(null);
    setLogChallenges('');
    const lastSchool = localStorage.getItem('arp_last_school') || '';
    setClassEntries([{ school: lastSchool, classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes', otherModule: '', otherHours: '0', otherMinutes: '0' }]);
    
    alert(editingLogId ? "Log updated successfully!" : "Visit Log(s) recorded successfully!");
  };

  const handleEditClick = (log: DailyLog) => {
    setEditingLogId(log.id);
    setLogDate(log.date);
    setLogStatus((log.status as any) || 'Present');
    setLogChallenges(log.challenges || '');

    if (log.status !== 'Present' && log.status) {
      setClassEntries([]);
    } else {
      let mod = log.module;
      let otherVal = '';
      let eventVal = '';

      if (mod.startsWith('Other: ')) {
        otherVal = mod.replace('Other: ', '');
        mod = 'Other';
      } else if (mod.startsWith('Event: ')) {
        eventVal = mod.replace('Event: ', '');
        mod = 'Event';
      }

      setClassEntries([{
        school: log.school,
        classGrade: log.classGrade,
        division: log.division,
        module: mod,
        session: log.session,
        worksheet: log.worksheet || 'Yes',
        otherModule: otherVal,
        eventName: eventVal
      }]);
    }
    
    // Smooth scroll to top of panel/form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteLog = (id: string) => {
    if (confirm("Are you sure you want to delete this log?")) {
      const updated = logs.filter(l => l.id !== id);
      setLogs(updated);
      localStorage.setItem('arp_teaching_logs', JSON.stringify(updated));
    }
  };

  const myLogs = useMemo(() => {
    if (currentUser?.role === 'teacher') {
      return logs.filter(l => l.teacherId === currentUser.id);
    }
    return logs;
  }, [logs, currentUser]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard (डॅशबोर्ड)', icon: LayoutDashboard },
    { id: 'examinations', label: 'Examinations', icon: Target },
    { id: 'assessment', label: 'Assessment (मूल्यमापन)', icon: FileCheck },
    { id: 'levels', label: 'Student\'s Levels (विद्यार्थी स्तर)', icon: Award },
    { id: 'student_list', label: 'Student List', icon: ListTodo },
    { id: 'download', label: 'Download (डाऊनलोड)', icon: Download }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* SIDEBAR NAVIGATION - LOCKED ON DESKTOP */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-900 border-r border-slate-800 shrink-0 select-none">
        {/* Brand Banner */}
        <div className="flex items-center gap-3 px-6 py-5 bg-indigo-950 border-b border-indigo-900">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide">ARP Module (एआरपी)</h1>
            <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider truncate max-w-[150px] block mt-0.5">
              👤 {currentUser?.name}
            </span>
          </div>
        </div>

        {/* User Widget */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-sm shadow-inner overflow-hidden border border-slate-600 text-white">
               {currentUser?.name.charAt(0)}
            </div>
            <div className="overflow-hidden text-left">
               <p className="text-xs font-black truncate text-white">{currentUser?.name}</p>
               <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 truncate block mt-0.5">
                 ARP Panel Active
               </span>
            </div>
          </div>
        </div>

        {/* Navigation list items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto text-left">
          <button
            onClick={() => setActiveModule('selection')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black bg-slate-800 text-indigo-300 hover:text-white hover:bg-slate-750 transition-all mb-4 border border-slate-700 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 shrink-0 text-indigo-400" />
            ← Switch Module
          </button>

          <div className="px-4 pb-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            Sections
          </div>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-3">
                  <TabIcon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-sm text-indigo-100' : 'group-hover:rotate-6'}`} />
                  <span className="text-xs font-bold">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="bg-slate-800/40 rounded-2xl p-2 space-y-1">
             <button
                onClick={() => setActiveModule('selection')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-left"
             >
                <ChevronLeft className="w-4 h-4" />
                Back to Modules
             </button>
             <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-500 hover:bg-rose-950/30 transition-all border border-transparent hover:border-rose-900/50 text-left"
             >
                <LogOut className="w-4 h-4" />
                Logout
             </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & DRAWER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <header className="lg:hidden bg-slate-900 text-white flex items-center justify-between px-4 py-4 border-b border-slate-800 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-sm font-black tracking-wide">ARP Module (एआरपी)</h1>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-lg border border-slate-700/60 truncate max-w-[120px]">
             {currentUser?.name}
          </span>
        </header>

        {/* MOBILE DRAWER CONTAINER */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-45 lg:hidden animate-fade-in" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        <aside className={`fixed top-0 left-0 h-full w-[280px] bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-out lg:hidden flex flex-col justify-between ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
          <div>
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-black text-white">ARP Panel</h2>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-6 space-y-2">
              <button
                onClick={() => { setActiveModule('selection'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black bg-slate-800 text-indigo-300 hover:text-white hover:bg-slate-750 transition-all mb-4 border border-slate-700 text-left"
              >
                <ChevronLeft className="w-4 h-4" />
                Switch Module
              </button>

              <div className="px-4 pb-1 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Sections
              </div>
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as ActiveTab); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TabIcon className="w-4 h-4" />
                      <span className="text-xs font-bold">{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900">
             <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-xs font-bold text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 transition-all"
             >
                <LogOut className="w-4 h-4" />
                Logout
             </button>
          </div>
        </aside>

        {/* MAIN PANEL CONTENT AREA */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-6xl mx-auto w-full">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <BoardableBaselineDashboard arpStudents={arpStudents} arpRecords={arpRecords} />

              {false && (
                <>

              {dashboardSubTab === 'dailyLogs' && (
                <div className="animate-fade-in space-y-6">
                  {/* LOG CREATION FORM */}
                  <form onSubmit={handleSaveLogs} className="bg-white border border-slate-200/80 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6 text-left">
                     <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-lg font-black text-slate-900">
                          {editingLogId ? '📝 Edit Daily visit log' : '➕ Record Daily visit log'}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">
                          Log details of your educational visits to schools and classes
                        </p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Visit Date (भेटीचा दिनांक):</label>
                          <input 
                            type="date" 
                            value={logDate} 
                            onChange={(e) => setLogDate(e.target.value)}
                            className="w-full border-2 border-slate-100 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none bg-slate-50/50" 
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Status (स्थिती):</label>
                          <select 
                            value={logStatus} 
                            onChange={(e) => {
                              const s = e.target.value as any;
                              setLogStatus(s);
                              if (s !== 'Present') setClassEntries([]);
                              else if (classEntries.length === 0) {
                                setClassEntries([{ school: '', classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes' }]);
                              }
                            }}
                            className="w-full border-2 border-slate-100 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none bg-slate-50/50"
                          >
                            <option value="Present">Present (शाळेला भेट दिली)</option>
                            <option value="Holiday">Holiday (शाळेला सुट्टी होती)</option>
                            <option value="On Leave">On Leave (रजेवर)</option>
                          </select>
                        </div>
                     </div>

                     {logStatus === 'Present' && (
                        <div className="space-y-6 pt-4">
                           <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest">School & Class Visited (भेट दिलेले वर्ग):</h4>
                              <button 
                                type="button" 
                                onClick={handleAddEntry}
                                className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                              >
                                 <PlusCircle className="w-3.5 h-3.5" /> ADD MORE CLASS (आणखी वर्ग जोडा)
                              </button>
                           </div>

                           {classEntries.map((entry, idx) => (
                              <div key={idx} className="bg-slate-50/60 border border-slate-100/80 rounded-2xl p-4 md:p-6 space-y-4 relative">
                                 {classEntries.length > 1 && (
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveEntry(idx)}
                                      className="absolute top-4 right-4 p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Remove"
                                    >
                                       <X className="w-4 h-4" />
                                    </button>
                                 )}
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                       <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">School (शाळा):</label>
                                       <select 
                                         value={entry.school} 
                                         onChange={(e) => handleEntryChange(idx, 'school', e.target.value)}
                                         className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none bg-white"
                                         required
                                       >
                                          <option value="">Select School</option>
                                          {schoolOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                       </select>
                                    </div>

                                    <div>
                                       <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Class Grade (इयत्ता):</label>
                                       <select 
                                         value={entry.classGrade} 
                                         onChange={(e) => handleEntryChange(idx, 'classGrade', e.target.value)}
                                         className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none bg-white"
                                         required
                                       >
                                          <option value="">Select Class</option>
                                          {classOptions.map(c => <option key={c} value={c}>Class {c}</option>)}
                                       </select>
                                    </div>

                                    <div>
                                       <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Division (तुकडी):</label>
                                       <select 
                                         value={entry.division} 
                                         onChange={(e) => handleEntryChange(idx, 'division', e.target.value)}
                                         className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none bg-white"
                                         required
                                       >
                                          <option value="">Select Div</option>
                                          {divisionOptions.map(d => <option key={d} value={d}>Div {d}</option>)}
                                       </select>
                                    </div>

                                    <div>
                                       <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Module (घटक):</label>
                                       <select 
                                         value={entry.module} 
                                         onChange={(e) => handleEntryChange(idx, 'module', e.target.value)}
                                         className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none bg-white"
                                         required
                                       >
                                          <option value="">Select Module</option>
                                          {mainModuleOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                       </select>
                                    </div>
                                 </div>

                                 {/* Dynamic Conditional Sub-fields based on selected Module */}
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {entry.module && entry.module !== 'Other' && entry.module !== 'Event' && (
                                       <div>
                                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Session (तासिका):</label>
                                          <select 
                                            value={entry.session} 
                                            onChange={(e) => handleEntryChange(idx, 'session', e.target.value)}
                                            className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none bg-white"
                                            required
                                          >
                                             <option value="">Select Session</option>
                                             {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                          </select>
                                       </div>
                                    )}

                                    {entry.module === 'Event' && (
                                       <div className="col-span-2">
                                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Event Title (कार्यक्रमाचे नाव):</label>
                                          <input 
                                            type="text" 
                                            value={entry.eventName || ''} 
                                            onChange={(e) => handleEntryChange(idx, 'eventName', e.target.value)}
                                            className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none bg-white"
                                            placeholder="Specify event description..."
                                            required
                                          />
                                       </div>
                                    )}

                                    {entry.module === 'Other' && (
                                       <div className="col-span-2">
                                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Specify Other Work (इतर माहिती):</label>
                                          <input 
                                            type="text" 
                                            value={entry.otherModule || ''} 
                                            onChange={(e) => handleEntryChange(idx, 'otherModule', e.target.value)}
                                            className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none bg-white"
                                            placeholder="Write detail description here..."
                                            required
                                          />
                                       </div>
                                    )}

                                    <div>
                                       <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Worksheet Distributed? (कृतीपत्रिका सोडवली का?):</label>
                                       <select 
                                         value={entry.worksheet} 
                                         onChange={(e) => handleEntryChange(idx, 'worksheet', e.target.value)}
                                         className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none bg-white"
                                       >
                                          {worksheetOptions.map(w => <option key={w} value={w}>{w}</option>)}
                                       </select>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}

                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                          Challenges, Observations or Feedback (अडचणी, निरीक्षणे किंवा प्रतिक्रिया):
                        </label>
                        <textarea 
                          value={logChallenges} 
                          onChange={(e) => setLogChallenges(e.target.value)}
                          className="w-full border-2 border-slate-100 focus:border-indigo-500 rounded-2xl p-4 text-xs font-semibold outline-none bg-slate-50/50 min-h-[100px]" 
                          placeholder="अडचणी किंवा मुलांच्या प्रगतीविषयी टिप्पणी लिहा..."
                        />
                     </div>

                     <div className="pt-2 flex gap-3">
                        <button 
                          type="submit" 
                          disabled={!isFormValid()}
                          className={`flex-1 md:flex-none text-xs font-black uppercase tracking-wider text-white py-4 px-10 rounded-2xl shadow-md transition-all duration-200 ${
                            isFormValid() 
                              ? 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 cursor-pointer' 
                              : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                          }`}
                        >
                           {editingLogId ? 'Update Log' : 'Save Logs'}
                        </button>
                        
                        {editingLogId && (
                           <button 
                             type="button" 
                             onClick={() => {
                               setEditingLogId(null);
                               setLogChallenges('');
                               setClassEntries([{ school: '', classGrade: '', division: '', module: '', session: '', optionalSession: '', eventName: '', subModule: '', worksheet: 'Yes' }]);
                             }}
                             className="text-xs font-black uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 py-4 px-8 rounded-2xl transition-all"
                           >
                              Cancel
                           </button>
                        )}
                     </div>
                  </form>

                  {/* LOGS DIRECTORY/HISTORY */}
                  <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6 text-left">
                     <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
                        <div>
                           <h3 className="text-base font-black text-slate-900">
                             📋 Visit Logs History (भेट नोंदींचा इतिहास)
                           </h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                              List of recorded schools visits and performance metrics
                           </p>
                        </div>

                        <button 
                          onClick={() => setShowRecentLogs(!showRecentLogs)}
                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          {showRecentLogs ? <><EyeOff className="w-3.5 h-3.5" /> Hide Logs</> : <><Eye className="w-3.5 h-3.5" /> Show Logs</>}
                        </button>
                     </div>

                     {showRecentLogs && (
                        <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse min-w-[600px]">
                              <thead>
                                 <tr className="border-b-2 border-slate-100 uppercase text-[10px] tracking-wider text-slate-400 font-black">
                                    <th className="p-3">Date</th>
                                    <th className="p-3">School</th>
                                    <th className="p-3">Class & Div</th>
                                    <th className="p-3">Module</th>
                                    <th className="p-3 text-right">Actions</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {myLogs.length === 0 ? (
                                   <tr>
                                     <td colSpan={5} className="p-8 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                       No visit logs found. Record your first visit above!
                                     </td>
                                   </tr>
                                 ) : (
                                   myLogs
                                     .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                     .map(log => (
                                     <tr key={log.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${editingLogId === log.id ? 'bg-amber-50' : ''}`}>
                                        <td className="p-3 text-xs font-bold text-slate-700 whitespace-nowrap">{log.date}</td>
                                        <td className="p-3 text-xs font-bold text-slate-600 truncate max-w-[150px]">{log.status === 'Present' || !log.status ? log.school : '-'}</td>
                                        <td className="p-3 text-xs font-bold text-slate-600">{(log.status === 'Present' || !log.status) && log.classGrade ? `${log.classGrade} - ${log.division}` : '-'}</td>
                                        <td className="p-3 text-xs font-bold text-slate-600">
                                           {log.status && log.status !== 'Present' ? (
                                              <span className="text-rose-500 font-black uppercase text-[10px] px-2 py-1 rounded bg-rose-50">{log.status}</span>
                                           ) : (
                                              <span>{log.module} {log.session ? `/ ${log.session}` : ''}</span>
                                           )}
                                        </td>
                                        <td className="p-3 items-center justify-end flex gap-2">
                                           <button 
                                              type="button" 
                                              onClick={() => handleEditClick(log)}
                                              className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
                                              title="Edit"
                                           >
                                              <Edit2 className="w-4 h-4" />
                                           </button>
                                           <button 
                                              type="button"
                                              onClick={() => handleDeleteLog(log.id)}
                                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                              title="Delete"
                                           >
                                              <Trash2 className="w-4 h-4" />
                                           </button>
                                        </td>
                                     </tr>
                                   ))
                                 )}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          )}

          {/* EXAMINATIONS TAB */}
          {activeTab === 'examinations' && (
            <div className="space-y-6">
              {/* Sub tab toggles (Horizontally Scrollable) */}
              <div className="flex gap-1 bg-slate-200/60 border border-slate-200/30 p-1.5 rounded-2xl max-w-full overflow-x-auto whitespace-nowrap scrollbar-thin">
                <button
                  onClick={() => setExaminationSubTab('baseline_examination')}
                  className={`flex-1 py-2.5 px-4 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    examinationSubTab === 'baseline_examination'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Baseline Examination
                </button>
                <button
                  onClick={() => setExaminationSubTab('endline_examination')}
                  className={`flex-1 py-2.5 px-4 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    examinationSubTab === 'endline_examination'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Endline Examination
                </button>
                <button
                  onClick={() => setExaminationSubTab('boardable_baseline')}
                  className={`flex-1 py-2.5 px-4 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    examinationSubTab === 'boardable_baseline'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Boardable Baseline
                </button>
                <button
                  onClick={() => setExaminationSubTab('boardable_midline')}
                  className={`flex-1 py-2.5 px-4 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    examinationSubTab === 'boardable_midline'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Boardable Midline
                </button>
                <button
                  onClick={() => setExaminationSubTab('boardable_endline')}
                  className={`flex-1 py-2.5 px-4 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    examinationSubTab === 'boardable_endline'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Boardable Endline
                </button>
              </div>

              {examinationSubTab === 'baseline_examination' && (
                <div className="space-y-6 animate-fade-in text-left">
                  <BaselineExaminationSection examType="baseline" />
                </div>
              )}

              {examinationSubTab === 'endline_examination' && (
                <div className="space-y-6 animate-fade-in text-left">
                  <BaselineExaminationSection examType="endline" />
                </div>
              )}

              {examinationSubTab === 'boardable_baseline' && (
                <div className="space-y-6 animate-fade-in text-left">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 leading-none">Boardable Baseline Examination</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                          Track starting performance or growth metrics of students for ARP.
                        </p>
                      </div>
                    </div>
                    <ArpAssessmentManager assessmentType="boardable_baseline" currentUser={currentUser} attendanceStudents={mainStudents}
               />
                  </div>
                </div>
              )}

              {examinationSubTab === 'boardable_midline' && (
                <div className="space-y-6 animate-fade-in text-left">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 leading-none">Boardable Midline Examination</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                          Track middle-term performance or growth metrics of students for ARP.
                        </p>
                      </div>
                    </div>
                    <ArpAssessmentManager assessmentType="boardable_midline" currentUser={currentUser} attendanceStudents={mainStudents}
               />
                  </div>
                </div>
              )}

              {examinationSubTab === 'boardable_endline' && (
                <div className="space-y-6 animate-fade-in text-left">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 leading-none">Boardable Endline Examination</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                          Track ending performance or growth metrics of students for ARP.
                        </p>
                      </div>
                    </div>
                    <ArpAssessmentManager assessmentType="boardable_endline" currentUser={currentUser} attendanceStudents={mainStudents}
               />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ASSESSMENT TAB */}
          {activeTab === 'assessment' && (
            <ArpAssessmentSection 
              currentUser={currentUser} 
              attendanceStudents={arpStudents}
              arpRecords={arpRecords} 
            />
          )}

          {/* STUDENT'S LEVELS TAB */}
          {activeTab === 'levels' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-none">Student's Levels (विद्यार्थी स्तर)</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                      Check student learning levels computed dynamically from baseline examinations
                    </p>
                  </div>
                </div>
              </div>

              {/* Levels Distribution Statistics */}
              <div className="flex flex-wrap gap-3">
                <div 
                  className={`border rounded-2xl p-3 flex flex-col justify-between shadow-xs transition-all hover:scale-105 duration-200 min-w-[120px] flex-1 bg-slate-50 border-slate-200 text-slate-700`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider">Total Students</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black">{filteredLevelsStudentsForCounts.length}</span>
                    <span className="text-xs font-bold opacity-85">100%</span>
                  </div>
                </div>
                {Object.entries(levelCounts)
                  .filter(([_, count]) => (count as number) > 0)
                  .map(([lvl, count]) => {
                    const badgeStyle = getLevelBadgeStyle(lvl);
                    const pct = filteredLevelsStudentsForCounts.length > 0
                      ? (((count as number) / filteredLevelsStudentsForCounts.length) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <div 
                        key={lvl} 
                        className={`border rounded-2xl p-3 flex flex-col justify-between shadow-xs transition-all hover:scale-105 duration-200 min-w-[120px] flex-1 ${badgeStyle}`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider">{lvl}</span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-2xl font-black">{count as number}</span>
                          <span className="text-xs font-bold opacity-85">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Students Levels Section (विद्यार्थी स्तर) - Original Card Grid */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-none">Students Levels (विद्यार्थी स्तर)</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      Check dynamic student learning levels and baseline statistics of students
                    </p>
                  </div>
                </div>

                {/* Filters Container for Cards */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-wider">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Filter Students (विद्यार्थी फिल्टर करा)</span>
                    </div>
                    {(selectedSchools.length > 0 || selectedClasses.length > 0 || selectedDivisions.length > 0 || selectedGenders.length > 0 || selectedLevels.length > 0 || searchNameQuery || levelsChangesFilter !== 'all' || levelsProgressFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSelectedSchools([]);
                          setSelectedClasses([]);
                          setSelectedDivisions([]);
                          setSelectedGenders([]);
                          setSelectedLevels([]);
                          setSearchNameQuery('');
                          setLevelsChangesFilter('all');
                          setLevelsProgressFilter('all');
                        }}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                      >
                        Clear All Filters (सर्व फिल्टर्स काढा)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-4">
                    {/* Name Search */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Search Student</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchNameQuery}
                          onChange={(e) => setSearchNameQuery(e.target.value)}
                          placeholder="Search by name..."
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    {/* School Name Filter */}
                    <MultiSelectDropdown
                      label="School Name"
                      options={levelsFilterOptions.schools}
                      selectedValues={selectedSchools}
                      onChange={setSelectedSchools}
                      placeholder="All Schools"
                    />

                    {/* Class Filter */}
                    <MultiSelectDropdown
                      label="Class"
                      options={levelsFilterOptions.classes}
                      selectedValues={selectedClasses}
                      onChange={setSelectedClasses}
                      placeholder="All Classes"
                    />

                    {/* Division Filter */}
                    <MultiSelectDropdown
                      label="Division"
                      options={levelsFilterOptions.divisions}
                      selectedValues={selectedDivisions}
                      onChange={setSelectedDivisions}
                      placeholder="All Divisions"
                    />

                    {/* Gender Filter */}
                    <MultiSelectDropdown
                      label="Gender"
                      options={levelsFilterOptions.genders}
                      selectedValues={selectedGenders}
                      onChange={setSelectedGenders}
                      placeholder="All Genders"
                    />

                    {/* Level Filter */}
                    <MultiSelectDropdown
                      label="Learning Level"
                      options={levelsFilterOptions.levels}
                      selectedValues={selectedLevels}
                      onChange={setSelectedLevels}
                      placeholder="All Levels"
                      disabled={levelsChangesFilter !== 'all'}
                    />

                    {/* Progress in Filter */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Progress In</label>
                      <select
                        value={levelsChangesFilter}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLevelsChangesFilter(val);
                          if (val === 'all') {
                            setLevelsProgressFilter('all');
                          }
                        }}
                        className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer h-[41px]"
                      >
                        <option value="all">All Milestones</option>
                        <option value="bl_to_ml">BL to ML</option>
                        <option value="ml_to_el">ML to EL</option>
                        <option value="bl_to_el">BL to EL</option>
                      </select>
                    </div>

                    {/* Changes Filter */}
                    {levelsChangesFilter !== 'all' && (
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Changes</label>
                        <select
                          value={levelsProgressFilter}
                          onChange={(e) => setLevelsProgressFilter(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer h-[41px]"
                        >
                          <option value="all">All Changes</option>
                          <option value="step_up">Step Up ↑</option>
                          <option value="step_down">Step Down ↓</option>
                          <option value="same">Same Level</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Student Cards Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Showing {filteredLevelsStudents.length} of {arpStudents.length} students
                    </span>
                  </div>

                  {filteredLevelsStudents.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
                      <Award className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="font-bold text-slate-600 uppercase text-xs tracking-wider">No Students Found</p>
                      <p className="text-xs mt-1">Try adjusting your filters or upload student records in examinations tab.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredLevelsStudents.map(student => {
                        const level = getStudentLevel(student, arpRecords);
                        const cardBgStyle = getCardBgStyle(level);
                        
                        // Calculate specific levels for progression
                        const baselineLvl = getStudentLevelForType(student, arpRecords, 'boardable_baseline');
                        const midlineLvl = getStudentLevelForType(student, arpRecords, 'boardable_midline');
                        const endlineLvl = getStudentLevelForType(student, arpRecords, 'boardable_endline');

                        const baselineRecord = arpRecords.find(r => r.studentId === student.id && r.type === 'boardable_baseline');
                        const midlineRecord = arpRecords.find(r => r.studentId === student.id && r.type === 'boardable_midline');
                        const endlineRecord = arpRecords.find(r => r.studentId === student.id && r.type === 'boardable_endline');

                        const getRecordDetails = (rec: any) => {
                          if (!rec) return null;
                          if (rec.attendance === 'Absent') return { isAbsent: true };
                          const s1 = rec.section1 !== undefined ? Number(rec.section1) : null;
                          const s2 = (rec.section2 !== undefined && rec.section2 !== null && rec.section2 !== '') ? Number(rec.section2) : null;
                          const hasS2 = s2 !== null;
                          const pct = s2 !== null ? ((s1! + s2) / 20) * 100 : (s1! / 10) * 100;
                          return { isAbsent: false, s1, s2, hasS2, pct: Math.round(pct) };
                        };

                        return (
                          <div 
                            key={student.id} 
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-sm gap-4 relative overflow-hidden group text-left ${cardBgStyle}`}
                          >
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600/10 group-hover:bg-indigo-600/30 transition-colors" />
                            <div className="flex items-center gap-4 pl-1.5 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 font-black text-sm text-slate-700 shadow-inner shrink-0">
                                {student.studentName?.charAt(0) || "S"}
                              </div>
                              <div className="text-left min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-extrabold text-sm group-hover:text-indigo-600 transition-colors mr-1">
                                    {student.studentName}
                                  </p>
                                  
                                  {/* Current Level display next to the name */}
                                  <span className={`text-[9px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-md ${getLevelBadgeStyle(level)}`}>
                                    Current Level: {level}
                                  </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5 uppercase tracking-wide">
                                  <span>School: <strong className="text-slate-600">{student.schoolName || student.school}</strong></span>
                                  <span>•</span>
                                  <span>Class: <strong className="text-slate-600">{student.classGrade}</strong></span>
                                  <span>•</span>
                                  <span>Div: <strong className="text-slate-600">{student.division}</strong></span>
                                  <span>•</span>
                                  <span>Gender: <strong className={`${student.gender === 'Boy' ? 'text-blue-500' : 'text-pink-500'}`}>{student.gender}</strong></span>
                                </p>
                              </div>
                            </div>
                            
                            {/* Stacked Examination Cards aligned to the right */}
                            <div className="shrink-0 flex flex-wrap gap-2 text-right pr-2">
                              {/* Baseline Details */}
                              {baselineRecord ? (
                                baselineRecord.attendance === 'Absent' ? (
                                  <div className="bg-rose-50/70 border border-rose-200/60 rounded-xl p-2 px-2.5 text-left min-w-[200px] shadow-2xs flex items-center justify-between gap-2">
                                    <span className="font-black uppercase text-rose-500 text-[9px] shrink-0">BL:</span>
                                    <span className="text-rose-600 font-extrabold text-[9px] uppercase">Absent</span>
                                  </div>
                                ) : (() => {
                                  const d = getRecordDetails(baselineRecord);
                                  const hasS2 = isSection2Applicable(student.classGrade);
                                  return d ? (
                                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-2 px-2.5 text-left min-w-[250px] shadow-2xs flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black uppercase text-rose-500 text-[9px] shrink-0">BL:</span>
                                        <span className="text-[9px] font-black text-rose-950 leading-none whitespace-nowrap">
                                          S1: {formatMarkPercent(d.s1)}
                                          {hasS2 ? ` | S2: ${formatMarkPercent(d.s2)}` : ""}
                                        </span>
                                      </div>
                                      <span className="text-rose-700 bg-rose-100/60 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border border-rose-200 shrink-0 whitespace-nowrap">
                                        {baselineLvl}
                                      </span>
                                    </div>
                                  ) : null;
                                })()
                              ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 px-2.5 text-left min-w-[200px] shadow-2xs flex items-center justify-between gap-2">
                                  <span className="font-black uppercase text-slate-400 text-[9px] shrink-0">BL:</span>
                                  <span className="text-slate-400 font-bold text-[9px] uppercase">Not Assessed</span>
                                </div>
                              )}

                              {/* Midline Details */}
                              {midlineRecord ? (
                                midlineRecord.attendance === 'Absent' ? (
                                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-2 px-2.5 text-left min-w-[200px] shadow-2xs flex items-center justify-between gap-2">
                                    <span className="font-black uppercase text-amber-500 text-[9px] shrink-0">ML:</span>
                                    <span className="text-amber-600 font-extrabold text-[9px] uppercase">Absent</span>
                                  </div>
                                ) : (() => {
                                  const d = getRecordDetails(midlineRecord);
                                  const hasS2 = isSection2Applicable(student.classGrade);
                                  return d ? (
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-2 px-2.5 text-left min-w-[250px] shadow-2xs flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black uppercase text-amber-500 text-[9px] shrink-0">ML:</span>
                                        <span className="text-[9px] font-black text-amber-950 leading-none whitespace-nowrap">
                                          S1: {formatMarkPercent(d.s1)}
                                          {hasS2 ? ` | S2: ${formatMarkPercent(d.s2)}` : ""}
                                        </span>
                                      </div>
                                      <span className="text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border border-amber-200 shrink-0 whitespace-nowrap">
                                        {midlineLvl}
                                      </span>
                                    </div>
                                  ) : null;
                                })()
                              ) : null}

                              {/* Endline Details */}
                              {endlineRecord ? (
                                endlineRecord.attendance === 'Absent' ? (
                                  <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-2 px-2.5 text-left min-w-[200px] shadow-2xs flex items-center justify-between gap-2">
                                    <span className="font-black uppercase text-emerald-500 text-[9px] shrink-0">EL:</span>
                                    <span className="text-emerald-600 font-extrabold text-[9px] uppercase">Absent</span>
                                  </div>
                                ) : (() => {
                                  const d = getRecordDetails(endlineRecord);
                                  const hasS2 = isSection2Applicable(student.classGrade);
                                  return d ? (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 px-2.5 text-left min-w-[250px] shadow-2xs flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black uppercase text-emerald-500 text-[9px] shrink-0">EL:</span>
                                        <span className="text-[9px] font-black text-emerald-950 leading-none whitespace-nowrap">
                                          S1: {formatMarkPercent(d.s1)}
                                          {hasS2 ? ` | S2: ${formatMarkPercent(d.s2)}` : ""}
                                        </span>
                                      </div>
                                      <span className="text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border border-emerald-200 shrink-0 whitespace-nowrap">
                                        {endlineLvl}
                                      </span>
                                    </div>
                                  ) : null;
                                })()
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STUDENT LIST TAB */}
          {activeTab === 'student_list' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-none">Student List</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                      Excel-style scrollable list with filters, learning levels, and baseline marks
                    </p>
                  </div>
                </div>
              </div>

              {/* NEW Student List Section (विद्यार्थी यादी) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-none">Student List</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      Excel-style scrollable list with independent filters, learning levels, and marks
                    </p>
                  </div>
                </div>

                {/* Filters Container */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-wider">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Filter Student List</span>
                    </div>
                    {(listSelectedSchools.length > 0 || listSelectedClasses.length > 0 || listSelectedDivisions.length > 0 || listSelectedGenders.length > 0 || listSelectedLevels.length > 0 || listSearchNameQuery || listChangesFilter !== 'all' || listProgressFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setListSelectedSchools([]);
                          setListSelectedClasses([]);
                          setListSelectedDivisions([]);
                          setListSelectedGenders([]);
                          setListSelectedLevels([]);
                          setListSearchNameQuery('');
                          setListChangesFilter('all');
                          setListProgressFilter('all');
                        }}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                      >
                        Clear All List Filters
                      </button>
                    )}
                  </div>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${listSubTab === 'combined' ? 'lg:grid-cols-8' : 'lg:grid-cols-6'} gap-4`}>
                    {/* Name Search */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Search Student</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={listSearchNameQuery}
                          onChange={(e) => setListSearchNameQuery(e.target.value)}
                          placeholder="Search by name..."
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    {/* School Name Filter */}
                    <MultiSelectDropdown
                      label="School Name"
                      options={levelsFilterOptions.schools}
                      selectedValues={listSelectedSchools}
                      onChange={setListSelectedSchools}
                      placeholder="All Schools"
                    />

                    {/* Class Filter */}
                    <MultiSelectDropdown
                      label="Class"
                      options={levelsFilterOptions.classes}
                      selectedValues={listSelectedClasses}
                      onChange={setListSelectedClasses}
                      placeholder="All Classes"
                    />

                    {/* Division Filter */}
                    <MultiSelectDropdown
                      label="Division"
                      options={levelsFilterOptions.divisions}
                      selectedValues={listSelectedDivisions}
                      onChange={setListSelectedDivisions}
                      placeholder="All Divisions"
                    />

                    {/* Gender Filter */}
                    <MultiSelectDropdown
                      label="Gender"
                      options={levelsFilterOptions.genders}
                      selectedValues={listSelectedGenders}
                      onChange={setListSelectedGenders}
                      placeholder="All Genders"
                    />

                    {/* Level Filter */}
                    <MultiSelectDropdown
                      label="Learning Level"
                      options={levelsFilterOptions.levels}
                      selectedValues={listSelectedLevels}
                      onChange={setListSelectedLevels}
                      placeholder="All Levels"
                      disabled={listSubTab === 'combined' && listChangesFilter !== 'all'}
                    />

                    {listSubTab === 'combined' && (
                      <>
                        {/* Progress in Filter */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Progress In</label>
                          <select
                            value={listChangesFilter}
                            onChange={(e) => {
                              const val = e.target.value;
                              setListChangesFilter(val);
                              if (val === 'all') {
                                setListProgressFilter('all');
                              }
                            }}
                            className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer h-[41px]"
                          >
                            <option value="all">All Milestones</option>
                            <option value="bl_to_ml">BL to ML</option>
                            <option value="ml_to_el">ML to EL</option>
                            <option value="bl_to_el">BL to EL</option>
                          </select>
                        </div>

                        {/* Changes Filter */}
                        {listChangesFilter !== 'all' && (
                          <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Changes</label>
                            <select
                              value={listProgressFilter}
                              onChange={(e) => setListProgressFilter(e.target.value)}
                              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer h-[41px]"
                            >
                              <option value="all">All Changes</option>
                              <option value="step_up">Step Up ↑</option>
                              <option value="step_down">Step Down ↓</option>
                              <option value="same">Same Level</option>
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* List Details Banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-left">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                      Active Student List Details
                    </p>
                    <div className="text-[10px] font-extrabold text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Schools: <strong className="text-slate-800">{listSelectedSchools.length > 0 ? listSelectedSchools.join(", ") : "All Schools"}</strong></span>
                      <span>•</span>
                      <span>Classes: <strong className="text-slate-800">{listSelectedClasses.length > 0 ? listSelectedClasses.join(", ") : "All Classes"}</strong></span>
                      <span>•</span>
                      <span>Divisions: <strong className="text-slate-800">{listSelectedDivisions.length > 0 ? listSelectedDivisions.join(", ") : "All Divisions"}</strong></span>
                      <span>•</span>
                      <span>Genders: <strong className="text-slate-800">{listSelectedGenders.length > 0 ? listSelectedGenders.join(", ") : "All Genders"}</strong></span>
                      <span>•</span>
                      <span>Levels: <strong className="text-slate-800">{listSelectedLevels.length > 0 ? listSelectedLevels.join(", ") : "All Levels"}</strong></span>
                    </div>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                      Total: {listFilteredLevelsStudents.length} / {arpStudents.length} Students
                    </span>
                  </div>
                </div>

                {/* Excel-style Scrollable List Table */}
                <div className="space-y-4">
                  {listFilteredLevelsStudents.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                      <Award className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="font-bold text-slate-600 uppercase text-xs tracking-wider">No Students Found</p>
                      <p className="text-xs mt-1">Try adjusting your filters or upload student records in examinations tab.</p>
                    </div>
                  ) : (
                    <>
                      {/* Sub-tab Navigation */}
                      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto no-scrollbar pt-2">
                        <button
                          type="button"
                          onClick={() => setListSubTab('baseline')}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 cursor-pointer ${
                            listSubTab === 'baseline'
                              ? 'border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-xl'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Baseline
                        </button>
                        <button
                          type="button"
                          onClick={() => setListSubTab('midline')}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 cursor-pointer ${
                            listSubTab === 'midline'
                              ? 'border-amber-600 text-amber-600 bg-amber-50/50 rounded-t-xl'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Midline
                        </button>
                        <button
                          type="button"
                          onClick={() => setListSubTab('endline')}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 cursor-pointer ${
                            listSubTab === 'endline'
                              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-xl'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Endline
                        </button>
                        <button
                          type="button"
                          onClick={() => setListSubTab('combined')}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all shrink-0 cursor-pointer ${
                            listSubTab === 'combined'
                              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Combined
                        </button>
                      </div>

                      {subTabStudents.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                          <Award className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                          <p className="font-bold text-slate-600 uppercase text-xs tracking-wider">No Students Assessed</p>
                          <p className="text-xs mt-1">No student records found under the selected examination.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm bg-white">
                          <table className="w-full text-left border-collapse min-w-[600px] table-auto">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                                <th className="p-1 px-1.5 w-10 text-center border-r border-slate-200/60 leading-tight">
                                  <div>Sr.</div>
                                  <div>No.</div>
                                </th>
                                <th className="p-1 px-1.5 border-r border-slate-200/60 leading-tight">
                                  <div>Student</div>
                                  <div>Name</div>
                                  <div className="text-[8px] text-slate-400 mt-0.5 normal-case">(नाव)</div>
                                </th>
                                <th className="p-1 px-1.5 border-r border-slate-200/60 leading-tight">
                                  <div>Class</div>
                                  <div className="text-[8px] text-slate-400 mt-0.5 normal-case">(Div)</div>
                                </th>
                                <th className="p-1 px-1.5 border-r border-slate-200/60 leading-tight">
                                  <div>Gender</div>
                                  <div className="text-[8px] text-slate-400 mt-0.5 normal-case"></div>
                                </th>
                                
                                {listSubTab === 'combined' && (
                                  <>
                                    <th className="p-1 px-1.5 border-r border-slate-200/60 leading-tight">
                                      <div>Learning Levels</div>
                                      <div className="text-[8px] text-slate-400 mt-0.5 normal-case"></div>
                                    </th>
                                    <th className="p-1 px-1.5 leading-tight">
                                      <div>Boardable Marks</div>
                                      <div className="text-[8px] text-slate-400 mt-0.5 normal-case">Baseline / Midline / Endline</div>
                                    </th>
                                  </>
                                )}
                                {listSubTab === 'baseline' && (
                                  <>
                                    <th className="p-1 px-1.5 border-r border-slate-200/60 leading-tight">
                                      <div>Baseline Level</div>
                                      <div className="text-[8px] text-slate-400 mt-0.5 normal-case"></div>
                                    </th>
                                    <th className="p-1 px-1.5 leading-tight">
                                      <div>Boardable Baseline Marks</div>
                                      <div className="text-[8px] text-slate-400 mt-0.5 normal-case">S1 & S2</div>
                                    </th>
                                  </>
                                )}
                                {listSubTab === 'midline' && (
                                  <>
                                    <th className="p-1 px-1.5 border-r border-slate-200/60 leading-tight">
                                      <div>Midline Level</div>
                                      <div className="text-[8px] text-slate-400 mt-0.5 normal-case"></div>
                                    </th>
                                    <th className="p-1 px-1.5 leading-tight">
                                      <div>Boardable Midline Marks</div>
                                      <div className="text-[8px] text-slate-400 mt-0.5 normal-case">S1 & S2</div>
                                    </th>
                                  </>
                                )}
                                {listSubTab === 'endline' && (
                                  <>
                                    <th className="p-1 px-1.5 border-r border-slate-200/60 leading-tight">
                                      <div>Endline Level</div>
                                      <div className="text-[8px] text-slate-400 mt-0.5 normal-case"></div>
                                    </th>
                                    <th className="p-1 px-1.5 leading-tight">
                                      <div>Boardable Endline Marks</div>
                                      <div className="text-[8px] text-slate-400 mt-0.5 normal-case">S1 & S2</div>
                                    </th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                let lastGroupKey = "";
                                let globalIndex = 0;

                                return subTabStudents.map((student, index) => {
                                  const level = getStudentLevel(student, arpRecords);
                                  const cardBgStyle = getCardBgStyle(level);
                                  
                                  const baselineLvl = getStudentLevelForType(student, arpRecords, 'boardable_baseline');
                                  const midlineLvl = getStudentLevelForType(student, arpRecords, 'boardable_midline');
                                  const endlineLvl = getStudentLevelForType(student, arpRecords, 'boardable_endline');

                                  const baselineRecord = arpRecords.find(r => r.studentId === student.id && r.type === 'boardable_baseline');
                                  const midlineRecord = arpRecords.find(r => r.studentId === student.id && r.type === 'boardable_midline');
                                  const endlineRecord = arpRecords.find(r => r.studentId === student.id && r.type === 'boardable_endline');

                                  const currentGroupKey = `${student.classGrade || ''}-${student.division || ''}`;
                                  const isNewGroup = currentGroupKey !== lastGroupKey;
                                  if (isNewGroup) {
                                    lastGroupKey = currentGroupKey;
                                  }

                                  globalIndex++;
                                  const colSpanCount = listSubTab === 'combined' ? 6 : 6;

                                  return (
                                    <React.Fragment key={student.id}>
                                      {isNewGroup && (
                                        <>
                                          {index > 0 && (
                                            <tr className="h-4 bg-slate-50/30">
                                              <td colSpan={colSpanCount} className="border-y border-slate-200/40"></td>
                                            </tr>
                                          )}
                                          <tr className="bg-slate-50 border-y border-slate-200">
                                            <td colSpan={colSpanCount} className="p-1 px-1.5 font-black text-[11px] text-slate-800 uppercase tracking-wide text-left">
                                              📁 School: {student.schoolName || student.school} • Class: {student.classGrade} (Div: {student.division})
                                            </td>
                                          </tr>
                                        </>
                                      )}
                                      <tr className={`border-b border-slate-200/60 hover:brightness-95 transition-all ${cardBgStyle} text-slate-800 text-[11px]`}>
                                        <td className="p-1 px-1.5 text-center text-slate-500 font-bold border-r border-slate-200/30">{globalIndex}</td>
                                        <td className="p-1 px-1.5 font-extrabold border-r border-slate-200/30 text-left whitespace-nowrap">{student.studentName}</td>
                                        <td className="p-1 px-1.5 font-semibold border-r border-slate-200/30 text-left whitespace-nowrap">{student.classGrade} ({student.division})</td>
                                        <td className="p-1 px-1.5 border-r border-slate-200/30 text-left font-semibold">
                                          <span className={student.gender === 'Boy' ? 'text-blue-600' : 'text-pink-600'}>
                                            {student.gender}
                                          </span>
                                        </td>
                                        
                                        {/* Learning Levels column */}
                                        <td className="p-1 px-1.5 border-r border-slate-200/30 text-left">
                                          {listSubTab === 'combined' && (
                                            <div className="flex flex-wrap gap-1 items-center">
                                              <span className={`inline-block text-[9px] font-black uppercase tracking-wider border px-1.5 py-0.5 rounded-md ${getLevelBadgeStyle(baselineLvl)}`}>
                                                BL: {baselineLvl}
                                              </span>
                                              {midlineLvl !== "Not Assessed" && (
                                                <>
                                                  <span className="text-slate-400 font-bold text-xs">→</span>
                                                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider border px-1.5 py-0.5 rounded-md ${getLevelBadgeStyle(midlineLvl)}`}>
                                                    ML: {midlineLvl}
                                                  </span>
                                                </>
                                              )}
                                              {endlineLvl !== "Not Assessed" && (
                                                <>
                                                  <span className="text-slate-400 font-bold text-xs">→</span>
                                                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider border px-1.5 py-0.5 rounded-md ${getLevelBadgeStyle(endlineLvl)}`}>
                                                    EL: {endlineLvl}
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          )}
                                          {listSubTab === 'baseline' && (
                                            <span className={`inline-block text-[9px] font-black uppercase tracking-wider border px-1.5 py-0.5 rounded-md ${getLevelBadgeStyle(baselineLvl)}`}>
                                              {baselineLvl}
                                            </span>
                                          )}
                                          {listSubTab === 'midline' && (
                                            <span className={`inline-block text-[9px] font-black uppercase tracking-wider border px-1.5 py-0.5 rounded-md ${getLevelBadgeStyle(midlineLvl)}`}>
                                              {midlineLvl}
                                            </span>
                                          )}
                                          {listSubTab === 'endline' && (
                                            <span className={`inline-block text-[9px] font-black uppercase tracking-wider border px-1.5 py-0.5 rounded-md ${getLevelBadgeStyle(endlineLvl)}`}>
                                              {endlineLvl}
                                            </span>
                                          )}
                                        </td>

                                        {/* Boardable Marks column */}
                                        <td className="p-1.5 px-2 text-left font-semibold">
                                          {listSubTab === 'combined' && (
                                            <div className="flex flex-col gap-1.5">
                                              {baselineRecord && (
                                                <div className="text-[10px] leading-tight flex items-center gap-1.5 whitespace-nowrap">
                                                  <span className="font-black text-rose-600 text-[9px] uppercase shrink-0">BL:</span>
                                                  {baselineRecord.attendance === 'Absent' ? (
                                                    <span className="text-rose-500 font-bold">Absent</span>
                                                  ) : (
                                                    <span>S1: <strong>{formatMarkPercent(baselineRecord.section1)}</strong> | S2: <strong>{isSection2Applicable(student.classGrade) ? formatMarkPercent(baselineRecord.section2) : "N/A"}</strong></span>
                                                  )}
                                                </div>
                                              )}
                                              {midlineRecord && (
                                                <div className="text-[10px] leading-tight flex items-center gap-1.5 whitespace-nowrap border-t border-slate-100 pt-0.5 mt-0.5">
                                                  <span className="font-black text-amber-600 text-[9px] uppercase shrink-0">ML:</span>
                                                  {midlineRecord.attendance === 'Absent' ? (
                                                    <span className="text-amber-500 font-bold">Absent</span>
                                                  ) : (
                                                    <span>S1: <strong>{formatMarkPercent(midlineRecord.section1)}</strong> | S2: <strong>{isSection2Applicable(student.classGrade) ? formatMarkPercent(midlineRecord.section2) : "N/A"}</strong></span>
                                                  )}
                                                </div>
                                              )}
                                              {endlineRecord && (
                                                <div className="text-[10px] leading-tight flex items-center gap-1.5 whitespace-nowrap border-t border-slate-100 pt-0.5 mt-0.5">
                                                  <span className="font-black text-emerald-600 text-[9px] uppercase shrink-0">EL:</span>
                                                  {endlineRecord.attendance === 'Absent' ? (
                                                    <span className="text-emerald-500 font-bold">Absent</span>
                                                  ) : (
                                                    <span>S1: <strong>{formatMarkPercent(endlineRecord.section1)}</strong> | S2: <strong>{isSection2Applicable(student.classGrade) ? formatMarkPercent(endlineRecord.section2) : "N/A"}</strong></span>
                                                  )}
                                                </div>
                                              )}
                                              {!baselineRecord && !midlineRecord && !endlineRecord && (
                                                <span className="text-slate-400 font-bold text-[9px] uppercase">Not Assessed</span>
                                              )}
                                            </div>
                                          )}
                                            {listSubTab === 'baseline' && (
                                              <div className="text-[10px] leading-tight">
                                                {baselineRecord ? (
                                                  baselineRecord.attendance === 'Absent' ? (
                                                    <span className="text-rose-500 font-bold">Absent</span>
                                                  ) : (
                                                    <span>S1: <strong>{formatMarkPercent(baselineRecord.section1)}</strong> | S2: <strong>{isSection2Applicable(student.classGrade) ? formatMarkPercent(baselineRecord.section2) : "N/A"}</strong></span>
                                                  )
                                                ) : (
                                                  <span className="text-slate-400 font-bold text-[9px] uppercase">Not Assessed</span>
                                                )}
                                              </div>
                                            )}

                                          {listSubTab === 'midline' && (
                                            <div className="text-[10px] leading-tight">
                                              {midlineRecord ? (
                                                midlineRecord.attendance === 'Absent' ? (
                                                  <span className="text-amber-500 font-bold">Absent</span>
                                                ) : (
                                                  <span>S1: <strong>{formatMarkPercent(midlineRecord.section1)}</strong> | S2: <strong>{isSection2Applicable(student.classGrade) ? formatMarkPercent(midlineRecord.section2) : "N/A"}</strong></span>
                                                )
                                              ) : (
                                                <span className="text-slate-400 font-bold text-[9px] uppercase">Not Assessed</span>
                                              )}
                                            </div>
                                          )}

                                          {listSubTab === 'endline' && (
                                            <div className="text-[10px] leading-tight">
                                              {endlineRecord ? (
                                                endlineRecord.attendance === 'Absent' ? (
                                                  <span className="text-emerald-500 font-bold">Absent</span>
                                                ) : (
                                                  <span>S1: <strong>{formatMarkPercent(endlineRecord.section1)}</strong> | S2: <strong>{isSection2Applicable(student.classGrade) ? formatMarkPercent(endlineRecord.section2) : "N/A"}</strong></span>
                                                )
                                              ) : (
                                                <span className="text-slate-400 font-bold text-[9px] uppercase">Not Assessed</span>
                                              )}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    </React.Fragment>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DOWNLOAD TAB */}
          {activeTab === 'download' && (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-900">Download Reports (अहवाल डाऊनलोड)</h2>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Export daily logs and student examination data for ARP</p>
              </div>
              <SerpDownload currentUser={currentUser} storagePrefix="arp" />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
