import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
import { 
  Award, 
  BarChart2, 
  School, 
  Layers, 
  CheckSquare, 
  Square,
  ChevronDown,
  Info,
  Users,
  Target,
  Filter,
  ArrowRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  "FLN BC": "#F43F5E", // rose-500
  "PSG BC": "#EA580C", // orange-600
  "PSG Acquire": "#D97706", // amber-600
  "PSG Enhance": "#10B981", // emerald-500
  "MSG Acquire": "#0EA5E9", // sky-500
  "MSG Enhance": "#4F46E5", // indigo-600
  "Support Classes": "#D946EF", // fuchsia-500
  "Not Assessed": "#64748B" // slate-500
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

export const getStudentLevelForType = (student: any, recordsList: any[], type: 'boardable_baseline' | 'boardable_midline' | 'boardable_endline') => {
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

// Backwards compatibility
export const getStudentLevel = (student: any, recordsList: any[]) => {
  return getStudentLevelForType(student, recordsList, 'boardable_baseline');
};

export const getLevelsForClass = (cls: string): string[] => {
  const classNum = parseInt(cls);
  if (isNaN(classNum)) return ["Not Assessed"];
  if (classNum === 4) return ["FLN BC", "PSG Acquire", "Not Assessed"];
  if (classNum === 5) return ["FLN BC", "PSG Acquire", "PSG Enhance", "Not Assessed"];
  if (classNum === 6) return ["FLN BC", "PSG BC", "MSG Acquire", "Not Assessed"];
  if (classNum === 7) return ["FLN BC", "PSG BC", "MSG Acquire", "MSG Enhance", "Not Assessed"];
  if (classNum === 8) return ["FLN BC", "PSG BC", "Support Classes", "Not Assessed"];
  
  return ["FLN BC", "PSG BC", "PSG Acquire", "PSG Enhance", "MSG Acquire", "MSG Enhance", "Support Classes", "Not Assessed"];
};

// Reusable Gender Filter Component
interface GenderDropdownProps {
  selectedGenders: string[];
  onChange: (genders: string[]) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const GenderDropdown: React.FC<GenderDropdownProps> = ({ selectedGenders, onChange, isOpen, setIsOpen }) => {
  const toggleGender = (gender: string) => {
    if (selectedGenders.includes(gender)) {
      onChange(selectedGenders.filter(g => g !== gender));
    } else {
      onChange([...selectedGenders, gender]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative text-left shrink-0">
      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Gender</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-50 border border-slate-200 hover:border-indigo-400 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center justify-between gap-2 text-slate-700 min-w-[130px] transition-all shadow-xs"
      >
        <span className="truncate max-w-[150px]">
          {selectedGenders.length === 0 
            ? "Blank (निवडा)" 
            : selectedGenders.length === 2 
              ? "All Genders" 
              : selectedGenders[0]}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedGenders.length > 0 && (
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

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-40 max-h-60 p-2.5 space-y-1 animate-fade-in min-w-[140px]">
            {['Boy', 'Girl'].map(option => {
              const isChecked = selectedGenders.includes(option);
              return (
                <label 
                  key={option} 
                  className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700 transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleGender(option)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>{option === 'Boy' ? 'Boy (मुलगा)' : 'Girl (मुलगी)'}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

interface BoardableBaselineDashboardProps {
  arpStudents: any[];
  arpRecords: any[];
}

export default function BoardableBaselineDashboard({ arpStudents, arpRecords }: BoardableBaselineDashboardProps) {
  // Main Dashboard Section state (as requested)
  const [dashboardTab, setDashboardTab] = useState<'baseline' | 'midline' | 'endline' | 'combined'>('baseline');
  const [compareOption, setCompareOption] = useState<'BL-ML' | 'ML-EL' | 'B-E' | 'BL-ML-EL'>('BL-ML');

  const comparedMilestones = useMemo(() => {
    const list: { label: string; key: string; examType: 'boardable_baseline' | 'boardable_midline' | 'boardable_endline'; color: string }[] = [];
    if (compareOption === 'BL-ML') {
      list.push({ label: 'Baseline', key: 'Baseline', examType: 'boardable_baseline', color: '#F43F5E' });
      list.push({ label: 'Midline', key: 'Midline', examType: 'boardable_midline', color: '#EA580C' });
    } else if (compareOption === 'ML-EL') {
      list.push({ label: 'Midline', key: 'Midline', examType: 'boardable_midline', color: '#EA580C' });
      list.push({ label: 'Endline', key: 'Endline', examType: 'boardable_endline', color: '#10B981' });
    } else if (compareOption === 'B-E') {
      list.push({ label: 'Baseline', key: 'Baseline', examType: 'boardable_baseline', color: '#F43F5E' });
      list.push({ label: 'Endline', key: 'Endline', examType: 'boardable_endline', color: '#10B981' });
    } else if (compareOption === 'BL-ML-EL') {
      list.push({ label: 'Baseline', key: 'Baseline', examType: 'boardable_baseline', color: '#F43F5E' });
      list.push({ label: 'Midline', key: 'Midline', examType: 'boardable_midline', color: '#EA580C' });
      list.push({ label: 'Endline', key: 'Endline', examType: 'boardable_endline', color: '#10B981' });
    }
    return list;
  }, [compareOption]);

  // Set the correct records target dynamically
  const activeExamType = useMemo(() => {
    if (dashboardTab === 'baseline') return 'boardable_baseline';
    if (dashboardTab === 'midline') return 'boardable_midline';
    return 'boardable_endline';
  }, [dashboardTab]);

  // Helper dynamic level grabber
  const getStudentLevelForDashboard = (student: any) => {
    return getStudentLevelForType(student, arpRecords, activeExamType);
  };

  // Option lists
  const schools = useMemo(() => {
    const unique = Array.from(new Set(arpStudents.map(s => s.schoolName || s.school || ''))).filter(Boolean) as string[];
    return unique.sort();
  }, [arpStudents]);

  const classes = useMemo(() => {
    const unique = Array.from(new Set(arpStudents.map(s => s.classGrade || ''))).filter(Boolean) as string[];
    return unique.sort();
  }, [arpStudents]);

  const divisions = useMemo(() => {
    const unique = Array.from(new Set(arpStudents.map(s => s.division || ''))).filter(Boolean) as string[];
    return unique.sort();
  }, [arpStudents]);

  // Chart 1 selections
  const [chart1School, setChart1School] = useState<string>('');
  const [chart1Class, setChart1Class] = useState<string>('');
  const [chart1Division, setChart1Division] = useState<string>('');
  const [chart1Gender, setChart1Gender] = useState<string[]>(['Boy', 'Girl']);
  const [isChart1GenderOpen, setIsChart1GenderOpen] = useState(false);
  const [selectedChart1Bar, setSelectedChart1Bar] = useState<{ name: string; count: number; total: number; percentage: number } | null>(null);

  // Chart 2 selections
  const [chart2School, setChart2School] = useState<string>('');
  const [chart2Gender, setChart2Gender] = useState<string[]>(['Boy', 'Girl']);
  const [isChart2GenderOpen, setIsChart2GenderOpen] = useState(false);
  const [selectedChart2Bar, setSelectedChart2Bar] = useState<{ className: string; level: string; count: number; total: number; percentage: number } | null>(null);

  // Chart 3 selections
  const [chart3SelectedSchools, setChart3SelectedSchools] = useState<string[]>([]);
  const [isChart3DropdownOpen, setIsChart3DropdownOpen] = useState(false);
  const [chart3Gender, setChart3Gender] = useState<string[]>(['Boy', 'Girl']);
  const [isChart3GenderOpen, setIsChart3GenderOpen] = useState(false);
  const [selectedChart3Bar, setSelectedChart3Bar] = useState<{ schoolName: string; level: string; count: number; total: number; percentage: number } | null>(null);

  // Combine progression filters
  const [combineChangesFilter, setCombineChangesFilter] = useState<string>('all');
  const [combineProgressFilter, setCombineProgressFilter] = useState<string>('all');

  // Sync initial values
  useEffect(() => {
    if (schools.length > 0) {
      if (!chart1School) setChart1School(schools[0]);
      if (!chart2School) setChart2School(schools[0]);
      if (chart3SelectedSchools.length === 0) setChart3SelectedSchools(schools);
    }
  }, [schools]);

  useEffect(() => {
    if (classes.length > 0 && !chart1Class) {
      setChart1Class(classes[0]);
    }
  }, [classes]);

  useEffect(() => {
    if (divisions.length > 0 && !chart1Division) {
      setChart1Division(divisions[0]);
    }
  }, [divisions]);

  // Reset selected bar states when filters change to avoid stale highlights
  useEffect(() => {
    setSelectedChart1Bar(null);
  }, [chart1School, chart1Class, chart1Division, chart1Gender, dashboardTab]);

  useEffect(() => {
    setSelectedChart2Bar(null);
  }, [chart2School, chart2Gender, dashboardTab]);

  useEffect(() => {
    setSelectedChart3Bar(null);
  }, [chart3SelectedSchools, chart3Gender, dashboardTab]);

  // Chart 1 filtering & calculation
  const chart1FilteredStudents = useMemo(() => {
    if (!chart1School || !chart1Class || !chart1Division) return [];
    return arpStudents.filter(s => {
      const sch = s.schoolName || s.school || '';
      const matchesSchool = sch === chart1School;
      const matchesClass = s.classGrade === chart1Class;
      const matchesDivision = s.division === chart1Division;
      const matchesGender = chart1Gender.includes(s.gender);
      return matchesSchool && matchesClass && matchesDivision && matchesGender;
    });
  }, [arpStudents, chart1School, chart1Class, chart1Division, chart1Gender]);

  const chart1TotalCount = chart1FilteredStudents.length;

  const chart1Levels = useMemo(() => {
    return getLevelsForClass(chart1Class);
  }, [chart1Class]);

  const chart1Data = useMemo(() => {
    const counts: Record<string, number> = {};
    chart1Levels.forEach(lvl => {
      counts[lvl] = 0;
    });

    chart1FilteredStudents.forEach(s => {
      const lvl = getStudentLevelForDashboard(s);
      if (counts[lvl] !== undefined) {
        counts[lvl] = counts[lvl] + 1;
      } else {
        counts["Not Assessed"] = (counts["Not Assessed"] || 0) + 1;
      }
    });

    return chart1Levels.map(lvl => {
      const val = counts[lvl] || 0;
      const pct = chart1TotalCount > 0 ? Number(((val / chart1TotalCount) * 100).toFixed(1)) : 0;
      return {
        name: lvl,
        studentsCount: val,
        percentage: pct
      };
    });
  }, [chart1FilteredStudents, arpRecords, chart1Levels, chart1TotalCount, activeExamType]);

  const handleChart1Click = (entry: any) => {
    if (!entry) return;
    setSelectedChart1Bar({
      name: entry.name,
      count: entry.studentsCount,
      total: chart1TotalCount,
      percentage: entry.percentage
    });
  };

  // Chart 2 filtering & calculation
  const chart2FilteredStudents = useMemo(() => {
    if (!chart2School) return [];
    return arpStudents.filter(s => {
      const sch = s.schoolName || s.school || '';
      const matchesSchool = sch === chart2School;
      const matchesGender = chart2Gender.includes(s.gender);
      return matchesSchool && matchesGender;
    });
  }, [arpStudents, chart2School, chart2Gender]);

  const schoolClasses = useMemo(() => {
    const unique = Array.from(new Set(chart2FilteredStudents.map(s => s.classGrade || ''))).filter(Boolean) as string[];
    const getClassNum = (cls: string) => {
      const n = parseInt(cls);
      return isNaN(n) ? 999 : n;
    };
    return unique.sort((a, b) => getClassNum(a) - getClassNum(b));
  }, [chart2FilteredStudents]);

  const chart2Data = useMemo(() => {
    return schoolClasses.map(cls => {
      const clsStudents = chart2FilteredStudents.filter(s => s.classGrade === cls);
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

      clsStudents.forEach(s => {
        const lvl = getStudentLevelForDashboard(s);
        counts[lvl] = (counts[lvl] || 0) + 1;
      });

      return {
        name: `Class ${cls}`,
        classVal: cls,
        ...counts
      };
    });
  }, [chart2FilteredStudents, schoolClasses, arpRecords, activeExamType]);

  const levelKeys = [
    "FLN BC",
    "PSG BC",
    "PSG Acquire",
    "PSG Enhance",
    "MSG Acquire",
    "MSG Enhance",
    "Support Classes",
    "Not Assessed"
  ];

  const handleChart2Click = (payload: any, level: string) => {
    if (!payload) return;
    const count = Number(payload[level] || 0);
    let total = 0;
    levelKeys.forEach(k => {
      total += Number(payload[k] || 0);
    });
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    setSelectedChart2Bar({
      className: payload.name,
      level,
      count,
      total,
      percentage
    });
  };

  // Chart 3 filtering & calculation
  const chart3FilteredStudents = useMemo(() => {
    if (chart3SelectedSchools.length === 0) return [];
    return arpStudents.filter(s => {
      const sch = s.schoolName || s.school || '';
      const matchesSchool = chart3SelectedSchools.includes(sch);
      const matchesGender = chart3Gender.includes(s.gender);
      return matchesSchool && matchesGender;
    });
  }, [arpStudents, chart3SelectedSchools, chart3Gender]);

  const chart3Data = useMemo(() => {
    return chart3SelectedSchools.map(sch => {
      const schStudents = chart3FilteredStudents.filter(s => (s.schoolName || s.school) === sch);
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

      schStudents.forEach(s => {
        const lvl = getStudentLevelForDashboard(s);
        counts[lvl] = (counts[lvl] || 0) + 1;
      });

      return {
        name: sch,
        ...counts
      };
    });
  }, [chart3FilteredStudents, chart3SelectedSchools, arpRecords, activeExamType]);

  const handleChart3Click = (payload: any, level: string) => {
    if (!payload) return;
    const count = Number(payload[level] || 0);
    let total = 0;
    levelKeys.forEach(k => {
      total += Number(payload[k] || 0);
    });
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    setSelectedChart3Bar({
      schoolName: payload.name,
      level,
      count,
      total,
      percentage
    });
  };

  // --- COMBINED COMPONENT STATS & CALCULATIONS (Point 5 & 6) ---
  const combineStatsData = useMemo(() => {
    return levelKeys.map(lvl => {
      const blCount = arpStudents.filter(s => getStudentLevelForType(s, arpRecords, 'boardable_baseline') === lvl).length;
      const mlCount = arpStudents.filter(s => getStudentLevelForType(s, arpRecords, 'boardable_midline') === lvl).length;
      const elCount = arpStudents.filter(s => getStudentLevelForType(s, arpRecords, 'boardable_endline') === lvl).length;
      return {
        name: lvl,
        "Baseline (BL)": blCount,
        "Midline (ML)": mlCount,
        "Endline (EL)": elCount
      };
    });
  }, [arpStudents, arpRecords]);

  const combinedChart1Data = useMemo(() => {
    return levelKeys.map(lvl => {
      const dataEntry: any = { name: lvl };
      comparedMilestones.forEach(m => {
        const count = chart1FilteredStudents.filter(s => 
          getStudentLevelForType(s, arpRecords, m.examType) === lvl
        ).length;
        dataEntry[m.key] = count;
      });
      return dataEntry;
    });
  }, [chart1FilteredStudents, levelKeys, comparedMilestones, arpRecords]);

  const milestoneTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    comparedMilestones.forEach(m => {
      totals[m.key] = combinedChart1Data.reduce((sum, row) => sum + Number(row[m.key] || 0), 0);
    });
    return totals;
  }, [combinedChart1Data, comparedMilestones]);

  const combinedChart2Data = useMemo(() => {
    const data: any[] = [];
    schoolClasses.forEach(cls => {
      const clsStudents = chart2FilteredStudents.filter(s => s.classGrade === cls);
      comparedMilestones.forEach(m => {
        const counts: Record<string, number> = {
          "FLN BC": 0, "PSG BC": 0, "PSG Acquire": 0, "PSG Enhance": 0,
          "MSG Acquire": 0, "MSG Enhance": 0, "Support Classes": 0, "Not Assessed": 0
        };
        clsStudents.forEach(s => {
          const lvl = getStudentLevelForType(s, arpRecords, m.examType);
          counts[lvl] = (counts[lvl] || 0) + 1;
        });
        data.push({
          name: `${cls} (${m.label})`,
          className: `Class ${cls}`,
          milestone: m.label,
          ...counts
        });
      });
    });
    return data;
  }, [chart2FilteredStudents, schoolClasses, arpRecords, comparedMilestones]);

  const combinedChart3Data = useMemo(() => {
    const data: any[] = [];
    chart3SelectedSchools.forEach(sch => {
      const schStudents = chart3FilteredStudents.filter(s => (s.schoolName || s.school) === sch);
      comparedMilestones.forEach(m => {
        const counts: Record<string, number> = {
          "FLN BC": 0, "PSG BC": 0, "PSG Acquire": 0, "PSG Enhance": 0,
          "MSG Acquire": 0, "MSG Enhance": 0, "Support Classes": 0, "Not Assessed": 0
        };
        schStudents.forEach(s => {
          const lvl = getStudentLevelForType(s, arpRecords, m.examType);
          counts[lvl] = (counts[lvl] || 0) + 1;
        });
        data.push({
          name: `${sch.substring(0, 10)}... (${m.label})`,
          schoolName: sch,
          milestone: m.label,
          ...counts
        });
      });
    });
    return data;
  }, [chart3FilteredStudents, chart3SelectedSchools, arpRecords, comparedMilestones]);

  // Check level difference / change
  const checkChange = (lvlA: string, lvlB: string, progressVal: string) => {
    if (lvlA === "Not Assessed" || lvlB === "Not Assessed") {
      return false; // requires both to be assessed
    }
    const rA = LEVEL_RANK_ORDER[lvlA] || 0;
    const rB = LEVEL_RANK_ORDER[lvlB] || 0;

    if (progressVal === 'all') {
      return rA !== rB;
    } else if (progressVal === 'step_up') {
      return rB > rA;
    } else if (progressVal === 'step_down') {
      return rB < rA;
    }
    return true;
  };

  // Filter students for combine changes
  const filteredCombinedDashboardStudents = useMemo(() => {
    return arpStudents.filter(s => {
      if (combineChangesFilter === 'all' && combineProgressFilter === 'all') {
        return true;
      }
      const bl = getStudentLevelForType(s, arpRecords, 'boardable_baseline');
      const ml = getStudentLevelForType(s, arpRecords, 'boardable_midline');
      const be = getStudentLevelForType(s, arpRecords, 'boardable_endline');

      if (combineChangesFilter === 'bl_to_ml') {
        return checkChange(bl, ml, combineProgressFilter);
      } else if (combineChangesFilter === 'ml_to_el') {
        return checkChange(ml, be, combineProgressFilter);
      } else if (combineChangesFilter === 'bl_to_el') {
        return checkChange(bl, be, combineProgressFilter);
      } else {
        // any change
        return checkChange(bl, ml, combineProgressFilter) || 
               checkChange(ml, be, combineProgressFilter) || 
               checkChange(bl, be, combineProgressFilter);
      }
    });
  }, [arpStudents, arpRecords, combineChangesFilter, combineProgressFilter]);

  // Format record helper with percent in brackets as requested by Point 4
  const formatRecordWithPctAndLvl = (student: any, examType: 'boardable_baseline' | 'boardable_midline' | 'boardable_endline') => {
    const record = arpRecords.find(r => r.studentId === student.id && r.type === examType);
    if (!record) return <span className="text-slate-400 font-bold uppercase text-[9px]">Not Assessed</span>;
    if (record.attendance === 'Absent') return <span className="text-rose-500 font-black">Absent</span>;

    const s1 = Number(record.section1 || 0);
    const hasS2 = record.section2 !== undefined && record.section2 !== null && record.section2 !== '';
    const s2 = hasS2 ? Number(record.section2) : null;
    const pct = s2 !== null ? Math.round(((s1 + s2) / 20) * 100) : Math.round((s1 / 10) * 100);
    const lvl = getStudentLevelForType(student, arpRecords, examType);

    return (
      <div className="flex flex-col gap-0.5 leading-tight">
        <span className="font-extrabold text-slate-700">
          S1: {s1}{hasS2 ? ` | S2: ${s2}` : ""} <span className="text-indigo-600">({pct}%)</span>
        </span>
        <span className="text-[9px] font-black uppercase text-slate-500">{lvl}</span>
      </div>
    );
  };

  if (arpStudents.length === 0) {
    return (
      <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-3xl p-8 text-center text-amber-800">
        <Info className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-bounce" />
        <h4 className="font-black text-sm uppercase tracking-wide">No Student Records Found</h4>
        <p className="text-xs mt-1">Please upload students in the Assessments tab to visualize learning progress & charts here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Dynamic Header */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-6 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Boardable Examination
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">
                Visual analytics, level distribution, progress tracking and school level comparison
              </p>
            </div>
          </div>
          
          {/* Main Dashboard Section Selector (Point 5) */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 gap-1 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setDashboardTab('baseline')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer ${
                dashboardTab === 'baseline'
                  ? 'bg-rose-50 text-rose-700 font-extrabold border border-rose-200/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Baseline
            </button>
            <button
              onClick={() => setDashboardTab('midline')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer ${
                dashboardTab === 'midline'
                  ? 'bg-amber-50 text-amber-700 font-extrabold border border-amber-200/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Midline
            </button>
            <button
              onClick={() => setDashboardTab('endline')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer ${
                dashboardTab === 'endline'
                  ? 'bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Endline
            </button>
            <button
              onClick={() => setDashboardTab('combined')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer ${
                dashboardTab === 'combined'
                  ? 'bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-200/50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Combine
            </button>
          </div>
        </div>
      </div>

      {dashboardTab !== 'combined' ? (
        <>
          {/* 1st GRAPH: Level count & percent for selected School + Class + Division */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${
                  dashboardTab === 'baseline' ? 'bg-rose-50 text-rose-700' :
                  dashboardTab === 'midline' ? 'bg-amber-50 text-amber-700' :
                  'bg-emerald-50 text-emerald-700'
                }`}>Chart 1</span>
                <h4 className="text-base font-black text-slate-800 mt-1">Division Wise Level Distribution (तुकडीनुसार विद्यार्थ्यांचा स्तर)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Select a Division to view student count and percentage for each learning level. Click on any bar to inspect counts.</p>
              </div>

              {/* Filters for Chart 1 */}
              <div className="flex flex-wrap gap-2 items-end shrink-0">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">School</label>
                  <select
                    value={chart1School}
                    onChange={(e) => setChart1School(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs font-bold outline-none max-w-[150px] md:max-w-[200px]"
                  >
                    {schools.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Class</label>
                  <select
                    value={chart1Class}
                    onChange={(e) => setChart1Class(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Division</label>
                  <select
                    value={chart1Division}
                    onChange={(e) => setChart1Division(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                  >
                    {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <GenderDropdown 
                  selectedGenders={chart1Gender} 
                  onChange={setChart1Gender} 
                  isOpen={isChart1GenderOpen} 
                  setIsOpen={setIsChart1GenderOpen} 
                />
              </div>
            </div>

            {/* Selected Bar Details Panel */}
            {selectedChart1Bar && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-500">Selected Level Info</span>
                  <p className="text-sm font-black text-slate-800">
                    Level <strong className="text-indigo-600 font-black">{selectedChart1Bar.name}</strong>: {selectedChart1Bar.count} out of {selectedChart1Bar.total} students ({selectedChart1Bar.percentage}%)
                  </p>
                </div>
              </div>
            )}

            {/* Chart rendering */}
            <div className="h-[320px] w-full bg-slate-50/50 rounded-2xl p-2 border border-slate-100">
              {chart1Data.every(d => d.studentsCount === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <BarChart2 className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold">No students found for this combination.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart1Data} margin={{ top: 25, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const pct = props.payload?.percentage || 0;
                        return [`${value} (${pct}%)`, "Students"];
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'black', fontSize: '11px', color: '#1e293b' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="studentsCount" name="Students" radius={[6, 6, 0, 0]} onClick={handleChart1Click}>
                      {chart1Data.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={LEVEL_COLORS[entry.name] || '#4f46e5'} 
                          className="cursor-pointer hover:opacity-85 transition-opacity"
                        />
                      ))}
                      <LabelList
                        dataKey="studentsCount"
                        position="top"
                        content={(props: any) => {
                          const { x, y, width, value, index } = props;
                          if (value === 0 || value === undefined) return null;
                          const pct = chart1Data[index]?.percentage || 0;
                          return (
                            <text x={Number(x) + Number(width) / 2} y={Number(y) - 8} fill="#334155" textAnchor="middle" fontSize={10} fontWeight="extrabold" fontFamily="monospace">
                              {value} ({pct}%)
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Numericals Table */}
            <div className="border-t border-slate-100 pt-5 mt-4 text-left">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Numericals (संख्यात्मक माहिती)
              </h5>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold text-[10px] uppercase">
                      <th className="p-2 border-r border-slate-100">Learning Level (शिकण्याची पातळी)</th>
                      <th className="p-2 border-r border-slate-100 text-center">Student Count (विद्यार्थी संख्या)</th>
                      <th className="p-2 text-center">Percentage (टक्केवारी)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart1Data.map(row => (
                      <tr key={row.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="p-2 border-r border-slate-100 font-bold flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: LEVEL_COLORS[row.name] }} />
                          <span>{row.name}</span>
                        </td>
                        <td className="p-2 border-r border-slate-100 text-center font-black text-slate-700">{row.studentsCount}</td>
                        <td className="p-2 text-center font-extrabold text-indigo-600 bg-indigo-50/20">{row.percentage}%</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50/80 font-black border-t border-slate-100 text-slate-800">
                      <td className="p-2 border-r border-slate-100 text-right">Total (एकूण विद्यार्थी)</td>
                      <td className="p-2 border-r border-slate-100 text-center text-slate-900">{chart1TotalCount}</td>
                      <td className="p-2 text-center text-slate-900">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 2nd GRAPH: Stacked Class-wise Levels for Selected School */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="bg-orange-50 text-orange-700 text-[9px] font-black uppercase px-2 py-1 rounded-md">Chart 2</span>
                <h4 className="text-base font-black text-slate-800 mt-1">Class Wise Level Breakdown (इयत्तेनुसार विद्यार्थ्यांचे वर्गीकरण)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Select a School to view stacked levels across each grade class. Click on any bar segment to view its exact details.</p>
              </div>

              <div className="flex flex-wrap gap-2 items-end shrink-0">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Select School</label>
                  <select
                    value={chart2School}
                    onChange={(e) => setChart2School(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none max-w-[200px]"
                  >
                    {schools.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <GenderDropdown 
                  selectedGenders={chart2Gender} 
                  onChange={setChart2Gender} 
                  isOpen={isChart2GenderOpen} 
                  setIsOpen={setIsChart2GenderOpen} 
                />
              </div>
            </div>

            {/* Selected Segment Info Panel */}
            {selectedChart2Bar && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-500">Selected Class Level Info</span>
                  <p className="text-sm font-black text-slate-800">
                    Class <strong className="text-slate-900 font-extrabold">{selectedChart2Bar.className}</strong> • Level <strong className="font-black" style={{ color: LEVEL_COLORS[selectedChart2Bar.level] }}>{selectedChart2Bar.level}</strong>: {selectedChart2Bar.count} out of {selectedChart2Bar.total} students ({selectedChart2Bar.percentage}%)
                  </p>
                </div>
              </div>
            )}

            {/* Chart rendering */}
            <div className="h-[320px] w-full bg-slate-50/50 rounded-2xl p-2 border border-slate-100">
              {chart2Data.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Layers className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold">No data found.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart2Data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const payload = props.payload;
                        const total = levelKeys.reduce((sum, key) => sum + Number(payload[key] || 0), 0);
                        const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0.0";
                        return [`${value} (${pct}%)`, name];
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'black', fontSize: '11px', color: '#1e293b' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                    {levelKeys.map(key => (
                      <Bar 
                        key={key} 
                        dataKey={key} 
                        name={key} 
                        stackId="a" 
                        fill={LEVEL_COLORS[key]} 
                        radius={[0, 0, 0, 0]}
                        onClick={(data) => {
                          if (data && data.activePayload && data.activePayload[0]) {
                            const payload = data.activePayload[0].payload;
                            handleChart2Click(payload, key);
                          } else if (data) {
                            handleChart2Click(data, key);
                          }
                        }}
                        className="cursor-pointer hover:opacity-85 transition-opacity"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Numericals Table */}
            <div className="border-t border-slate-100 pt-5 mt-4 text-left">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Numericals (संख्यात्मक माहिती)
              </h5>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold text-[10px] uppercase">
                      <th className="p-2 border-r border-slate-100">Class (इयत्ता)</th>
                      {levelKeys.map(lvl => (
                        <th key={lvl} className="p-2 border-r border-slate-100 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LEVEL_COLORS[lvl] }} />
                            <span>{lvl}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-2 text-center font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart2Data.map(row => {
                      const rowTotal = levelKeys.reduce((sum, key) => sum + Number(row[key] || 0), 0);
                      return (
                        <tr key={row.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="p-2 border-r border-slate-100 font-black text-slate-800 whitespace-nowrap">{row.name}</td>
                          {levelKeys.map(key => {
                            const count = row[key] || 0;
                            const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(1) : '0.0';
                            return (
                              <td key={key} className="p-2 border-r border-slate-100 text-center font-bold text-slate-600">
                                {count} ({pct}%)
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-black text-indigo-700 bg-indigo-50/30">{rowTotal}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50/80 font-black border-t border-slate-100 text-slate-800">
                      <td className="p-2 border-r border-slate-100 text-right">Total (एकूण)</td>
                      {levelKeys.map(key => {
                        const colTotal = chart2Data.reduce((sum, r) => sum + Number(r[key] || 0), 0);
                        const grandTotal = chart2Data.reduce((sum, r) => sum + levelKeys.reduce((s, k) => s + Number(r[k] || 0), 0), 0);
                        const pct = grandTotal > 0 ? ((colTotal / grandTotal) * 100).toFixed(1) : '0.0';
                        return (
                          <td key={key} className="p-2 border-r border-slate-100 text-center text-slate-900">
                            {colTotal} ({pct}%)
                          </td>
                        );
                      })}
                      <td className="p-2 text-center text-indigo-700 bg-indigo-50/40">
                        {chart2Data.reduce((sum, r) => sum + levelKeys.reduce((s, k) => s + Number(r[k] || 0), 0), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3rd GRAPH: Stacked Schools Level Comparison */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="bg-blue-50 text-blue-700 text-[9px] font-black uppercase px-2 py-1 rounded-md">Chart 3</span>
                <h4 className="text-base font-black text-slate-800 mt-1">School Wise Level Comparison (शाळांनुसार स्तर तुलना)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Select multiple schools to run side-by-side progression analysis. Click on any segment to view exact statistics.</p>
              </div>

              <div className="flex flex-wrap gap-2 items-end shrink-0">
                {/* Multi School Select Dropdown */}
                <div className="relative text-left">
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Filter Schools</label>
                  <button
                    type="button"
                    onClick={() => setIsChart3DropdownOpen(!isChart3DropdownOpen)}
                    className="bg-slate-50 border border-slate-200 hover:border-indigo-400 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center justify-between gap-2 text-slate-700 min-w-[150px] max-w-[220px] transition-all shadow-xs"
                  >
                    <span className="truncate">
                      {chart3SelectedSchools.length === 0 
                        ? "None Selected" 
                        : chart3SelectedSchools.length === schools.length 
                          ? "All Schools" 
                          : `${chart3SelectedSchools.length} Schools`}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                  {isChart3DropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsChart3DropdownOpen(false)} />
                      <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 max-h-60 overflow-y-auto p-2.5 space-y-1 animate-fade-in">
                        <div className="flex items-center justify-between p-1.5 border-b border-slate-100 mb-1">
                          <button 
                            type="button"
                            onClick={() => setChart3SelectedSchools(schools)} 
                            className="text-[10px] font-black text-indigo-600 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <button 
                            type="button"
                            onClick={() => setChart3SelectedSchools([])} 
                            className="text-[10px] font-black text-slate-400 hover:underline cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                        {schools.map(sch => {
                          const isChecked = chart3SelectedSchools.includes(sch);
                          return (
                            <label key={sch} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700 select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setChart3SelectedSchools(chart3SelectedSchools.filter(s => s !== sch));
                                  } else {
                                    setChart3SelectedSchools([...chart3SelectedSchools, sch]);
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5"
                              />
                              <span className="truncate">{sch}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                
                <GenderDropdown 
                  selectedGenders={chart3Gender} 
                  onChange={setChart3Gender} 
                  isOpen={isChart3GenderOpen} 
                  setIsOpen={setIsChart3GenderOpen} 
                />
              </div>
            </div>

            {/* Selected Segment Info Panel */}
            {selectedChart3Bar && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-500">Selected Segment Info</span>
                  <p className="text-sm font-black text-slate-800">
                    <strong className="text-slate-900 font-extrabold">{selectedChart3Bar.schoolName}</strong> • Level <strong className="font-black" style={{ color: LEVEL_COLORS[selectedChart3Bar.level] }}>{selectedChart3Bar.level}</strong>: {selectedChart3Bar.count} out of {selectedChart3Bar.total} students ({selectedChart3Bar.percentage}%)
                  </p>
                </div>
              </div>
            )}

            {/* Chart rendering */}
            <div className="h-[350px] w-full bg-slate-50/50 rounded-2xl p-2 border border-slate-100">
              {chart3Data.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <School className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold">Please select at least one school.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart3Data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const payload = props.payload;
                        const total = levelKeys.reduce((sum, key) => sum + Number(payload[key] || 0), 0);
                        const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0.0";
                        return [`${value} (${pct}%)`, name];
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'black', fontSize: '11px', color: '#1e293b' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                    {levelKeys.map(key => (
                      <Bar 
                        key={key} 
                        dataKey={key} 
                        name={key} 
                        stackId="a" 
                        fill={LEVEL_COLORS[key]} 
                        radius={[0, 0, 0, 0]}
                        onClick={(data) => {
                          if (data && data.activePayload && data.activePayload[0]) {
                            const payload = data.activePayload[0].payload;
                            handleChart3Click(payload, key);
                          } else if (data) {
                            handleChart3Click(data, key);
                          }
                        }}
                        className="cursor-pointer hover:opacity-85 transition-opacity"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Numericals Table */}
            <div className="border-t border-slate-100 pt-5 mt-4 text-left">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Numericals (संख्यात्मक माहिती)
              </h5>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold text-[10px] uppercase">
                      <th className="p-2 border-r border-slate-100">School (शाळा)</th>
                      {levelKeys.map(lvl => (
                        <th key={lvl} className="p-2 border-r border-slate-100 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LEVEL_COLORS[lvl] }} />
                            <span>{lvl}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-2 text-center font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart3Data.map(row => {
                      const rowTotal = levelKeys.reduce((sum, key) => sum + Number(row[key] || 0), 0);
                      return (
                        <tr key={row.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="p-2 border-r border-slate-100 font-black text-slate-800 truncate max-w-[200px]">{row.name}</td>
                          {levelKeys.map(key => {
                            const count = row[key] || 0;
                            const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(1) : '0.0';
                            return (
                              <td key={key} className="p-2 border-r border-slate-100 text-center font-bold text-slate-600">
                                {count} ({pct}%)
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-black text-indigo-700 bg-indigo-50/30">{rowTotal}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50/80 font-black border-t border-slate-100 text-slate-800">
                      <td className="p-2 border-r border-slate-100 text-right">Total (एकूण)</td>
                      {levelKeys.map(key => {
                        const colTotal = chart3Data.reduce((sum, r) => sum + Number(r[key] || 0), 0);
                        const grandTotal = chart3Data.reduce((sum, r) => sum + levelKeys.reduce((s, k) => s + Number(r[k] || 0), 0), 0);
                        const pct = grandTotal > 0 ? ((colTotal / grandTotal) * 100).toFixed(1) : '0.0';
                        return (
                          <td key={key} className="p-2 border-r border-slate-100 text-center text-slate-900">
                            {colTotal} ({pct}%)
                          </td>
                        );
                      })}
                      <td className="p-2 text-center text-indigo-700 bg-indigo-50/40">
                        {chart3Data.reduce((sum, r) => sum + levelKeys.reduce((s, k) => s + Number(r[k] || 0), 0), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Milestone Selection dropdown card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2 py-1 rounded-md">Compare Settings</span>
              <h4 className="text-base font-black text-slate-800 mt-1">Milestone Comparison Settings (टप्पे तुलनात्मक विश्लेषण)</h4>
              <p className="text-xs text-slate-400 mt-0.5">Select milestones to compare student progression charts side-by-side.</p>
            </div>
            <div className="shrink-0">
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Compare Milestones (तुलना)</label>
              <select
                value={compareOption}
                onChange={(e) => setCompareOption(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer h-[41px]"
              >
                <option value="BL-ML">BL-ML (Baseline vs Midline)</option>
                <option value="ML-EL">ML-EL (Midline vs Endline)</option>
                <option value="B-E">B-E (Baseline vs Endline)</option>
                <option value="BL-ML-EL">BL-ML-EL (All Milestones)</option>
              </select>
            </div>
          </div>

          {/* COMBINED GRAPH 1 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-indigo-50 text-indigo-700">Combined Chart 1</span>
                <h4 className="text-base font-black text-slate-800 mt-1">Division Wise Level Distribution (तुकडीनुसार विद्यार्थ्यांचा स्तर)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Select a Division to view student count side-by-side for each learning level.</p>
              </div>

              {/* Filters for Chart 1 */}
              <div className="flex flex-wrap gap-2 items-end shrink-0">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">School</label>
                  <select
                    value={chart1School}
                    onChange={(e) => setChart1School(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs font-bold outline-none max-w-[150px] md:max-w-[200px]"
                  >
                    {schools.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Class</label>
                  <select
                    value={chart1Class}
                    onChange={(e) => setChart1Class(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Division</label>
                  <select
                    value={chart1Division}
                    onChange={(e) => setChart1Division(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                  >
                    {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <GenderDropdown 
                  selectedGenders={chart1Gender} 
                  onChange={setChart1Gender} 
                  isOpen={isChart1GenderOpen} 
                  setIsOpen={setIsChart1GenderOpen} 
                />
              </div>
            </div>

            {/* Chart rendering */}
            <div className="h-[320px] w-full bg-slate-50/50 rounded-2xl p-2 border border-slate-100">
              {combinedChart1Data.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <BarChart2 className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold">No students found for this combination.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={combinedChart1Data} margin={{ top: 25, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const mKey = props.dataKey;
                        const tot = combinedChart1Data.reduce((sum: number, r: any) => sum + Number(r[mKey] || 0), 0);
                        const pct = tot > 0 ? ((Number(value) / tot) * 100).toFixed(1) : '0.0';
                        return [`${value} (${pct}%)`, name];
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'black', fontSize: '11px', color: '#1e293b' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                    {comparedMilestones.map(m => (
                      <Bar 
                        key={m.key} 
                        dataKey={m.key} 
                        name={m.label} 
                        fill={m.color} 
                        radius={[4, 4, 0, 0]} 
                      >
                        <LabelList
                          dataKey={m.key}
                          position="top"
                          content={(props: any) => {
                            const { x, y, width, value } = props;
                            if (value === 0 || value === undefined) return null;
                            return (
                              <text x={Number(x) + Number(width) / 2} y={Number(y) - 8} fill="#334155" textAnchor="middle" fontSize={9} fontWeight="extrabold" fontFamily="monospace">
                                {value}
                              </text>
                            );
                          }}
                        />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Numericals Table */}
            <div className="border-t border-slate-100 pt-5 mt-4 text-left">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Numericals (संख्यात्मक माहिती)
              </h5>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold text-[10px] uppercase">
                      <th className="p-2 border-r border-slate-100">Learning Level (शिकण्याची पातळी)</th>
                      {comparedMilestones.map(m => (
                        <th key={m.key} className="p-2 border-r border-slate-100 text-center">{m.label} (विद्यार्थी संख्या)</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {combinedChart1Data.map(row => (
                      <tr key={row.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="p-2 border-r border-slate-100 font-bold flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: LEVEL_COLORS[row.name] }} />
                          <span>{row.name}</span>
                        </td>
                        {comparedMilestones.map(m => {
                          const count = Number(row[m.key] || 0);
                          const tot = milestoneTotals[m.key] || 0;
                          const pct = tot > 0 ? ((count / tot) * 100).toFixed(1) : '0.0';
                          return (
                            <td key={m.key} className="p-2 border-r border-slate-100 text-center font-black text-slate-700">
                              {count} ({pct}%)
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-slate-50/80 font-black border-t border-slate-100 text-slate-800">
                      <td className="p-2 border-r border-slate-100 font-bold text-right">Total (एकूण विद्यार्थी)</td>
                      {comparedMilestones.map(m => (
                        <td key={m.key} className="p-2 border-r border-slate-100 text-center text-slate-900">
                          {milestoneTotals[m.key]} (100.0%)
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* COMBINED GRAPH 2 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-indigo-50 text-indigo-700">Combined Chart 2</span>
                <h4 className="text-base font-black text-slate-800 mt-1">Class Wise Level Breakdown (इयत्तेनुसार स्तर विभागणी)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Select a School to compare learning level breakdown across different classes.</p>
              </div>

              {/* Filters for Chart 2 */}
              <div className="flex flex-wrap gap-2 items-end shrink-0">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">School</label>
                  <select
                    value={chart2School}
                    onChange={(e) => setChart2School(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs font-bold outline-none max-w-[200px]"
                  >
                    {schools.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <GenderDropdown 
                  selectedGenders={chart2Gender} 
                  onChange={setChart2Gender} 
                  isOpen={isChart2GenderOpen} 
                  setIsOpen={setIsChart2GenderOpen} 
                />
              </div>
            </div>

            {/* Chart rendering */}
            <div className="h-[350px] w-full bg-slate-50/50 rounded-2xl p-2 border border-slate-100">
              {combinedChart2Data.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <BarChart2 className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold">Please select or verify class data.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={combinedChart2Data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const payload = props.payload;
                        const total = levelKeys.reduce((sum, key) => sum + Number(payload[key] || 0), 0);
                        const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0.0";
                        return [`${value} (${pct}%)`, name];
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'black', fontSize: '11px', color: '#1e293b' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                    {levelKeys.map(key => (
                      <Bar 
                        key={key} 
                        dataKey={key} 
                        name={key} 
                        stackId="a" 
                        fill={LEVEL_COLORS[key]} 
                        radius={[0, 0, 0, 0]}
                        className="cursor-pointer hover:opacity-85 transition-opacity"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Numericals Table */}
            <div className="border-t border-slate-100 pt-5 mt-4 text-left">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Numericals (संख्यात्मक माहिती)
              </h5>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold text-[10px] uppercase">
                      <th className="p-2 border-r border-slate-100">Class (इयत्ता)</th>
                      {levelKeys.map(lvl => (
                        <th key={lvl} className="p-2 border-r border-slate-100 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LEVEL_COLORS[lvl] }} />
                            <span>{lvl}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-2 text-center font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedChart2Data.map(row => {
                      const rowTotal = levelKeys.reduce((sum, key) => sum + Number(row[key] || 0), 0);
                      return (
                        <tr key={row.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="p-2 border-r border-slate-100 font-black text-slate-800 whitespace-nowrap">{row.name}</td>
                          {levelKeys.map(key => {
                            const count = row[key] || 0;
                            const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(1) : '0.0';
                            return (
                              <td key={key} className="p-2 border-r border-slate-100 text-center font-bold text-slate-600">
                                {count} ({pct}%)
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-black text-indigo-700 bg-indigo-50/30">{rowTotal}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50/80 font-black border-t border-slate-100 text-slate-800">
                      <td className="p-2 border-r border-slate-100 text-right">Total (एकूण)</td>
                      {levelKeys.map(key => {
                        const colTotal = combinedChart2Data.reduce((sum, r) => sum + Number(r[key] || 0), 0);
                        const grandTotal = combinedChart2Data.reduce((sum, r) => sum + levelKeys.reduce((s, k) => s + Number(r[k] || 0), 0), 0);
                        const pct = grandTotal > 0 ? ((colTotal / grandTotal) * 100).toFixed(1) : '0.0';
                        return (
                          <td key={key} className="p-2 border-r border-slate-100 text-center text-slate-900">
                            {colTotal} ({pct}%)
                          </td>
                        );
                      })}
                      <td className="p-2 text-center text-indigo-700 bg-indigo-50/40">
                        {combinedChart2Data.reduce((sum, r) => sum + levelKeys.reduce((s, k) => s + Number(r[k] || 0), 0), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* COMBINED GRAPH 3 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-indigo-50 text-indigo-700">Combined Chart 3</span>
                <h4 className="text-base font-black text-slate-800 mt-1">School Wise Level Comparison (शाळानिहाय स्तर तुलना)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Select and compare multiple schools to analyze level variances.</p>
              </div>

              {/* Filters for Chart 3 */}
              <div className="flex flex-wrap gap-2 items-end shrink-0">
                {/* School multi-selector custom dropdown */}
                <div className="relative">
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Schools</label>
                  <button
                    onClick={() => setIsChart3DropdownOpen(!isChart3DropdownOpen)}
                    className="bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer max-w-[200px]"
                  >
                    <span className="truncate">{chart3SelectedSchools.length === 0 ? "None Selected" : `${chart3SelectedSchools.length} Schools`}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {isChart3DropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsChart3DropdownOpen(false)} />
                      <div className="absolute right-0 mt-1 w-[260px] bg-white border border-slate-200 rounded-2xl shadow-xl z-40 max-h-60 overflow-y-auto p-3 space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-[9px] font-black uppercase text-slate-400">Select Schools</span>
                          <div className="flex gap-2">
                            <span 
                              onClick={() => setChart3SelectedSchools(schools)} 
                              className="text-[9px] font-black text-indigo-600 hover:underline cursor-pointer"
                            >
                              All
                            </span>
                            <span 
                              onClick={() => setChart3SelectedSchools([])} 
                              className="text-[9px] font-black text-slate-400 hover:underline cursor-pointer"
                            >
                              None
                            </span>
                          </div>
                        </div>
                        {schools.map(sch => {
                          const isChecked = chart3SelectedSchools.includes(sch);
                          return (
                            <label key={sch} className="flex items-start gap-2.5 py-1.5 px-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700 transition-colors select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setChart3SelectedSchools(chart3SelectedSchools.filter(x => x !== sch));
                                  } else {
                                    setChart3SelectedSchools([...chart3SelectedSchools, sch]);
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-3.5 h-3.5 mt-0.5"
                              />
                              <span className="truncate">{sch}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                
                <GenderDropdown 
                  selectedGenders={chart3Gender} 
                  onChange={setChart3Gender} 
                  isOpen={isChart3GenderOpen} 
                  setIsOpen={setIsChart3GenderOpen} 
                />
              </div>
            </div>

            {/* Chart rendering */}
            <div className="h-[350px] w-full bg-slate-50/50 rounded-2xl p-2 border border-slate-100">
              {combinedChart3Data.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <School className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold">Please select at least one school.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={combinedChart3Data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const payload = props.payload;
                        const total = levelKeys.reduce((sum, key) => sum + Number(payload[key] || 0), 0);
                        const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0.0";
                        return [`${value} (${pct}%)`, name];
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'black', fontSize: '11px', color: '#1e293b' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                    {levelKeys.map(key => (
                      <Bar 
                        key={key} 
                        dataKey={key} 
                        name={key} 
                        stackId="a" 
                        fill={LEVEL_COLORS[key]} 
                        radius={[0, 0, 0, 0]}
                        className="cursor-pointer hover:opacity-85 transition-opacity"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Numericals Table */}
            <div className="border-t border-slate-100 pt-5 mt-4 text-left">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Numericals (संख्यात्मक माहिती)
              </h5>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold text-[10px] uppercase">
                      <th className="p-2 border-r border-slate-100">School (शाळा)</th>
                      {levelKeys.map(lvl => (
                        <th key={lvl} className="p-2 border-r border-slate-100 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: LEVEL_COLORS[lvl] }} />
                            <span>{lvl}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-2 text-center font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedChart3Data.map(row => {
                      const rowTotal = levelKeys.reduce((sum, key) => sum + Number(row[key] || 0), 0);
                      return (
                        <tr key={row.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="p-2 border-r border-slate-100 font-black text-slate-800 truncate max-w-[200px]">{row.name}</td>
                          {levelKeys.map(key => {
                            const count = row[key] || 0;
                            const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(1) : '0.0';
                            return (
                              <td key={key} className="p-2 border-r border-slate-100 text-center font-bold text-slate-600">
                                {count} ({pct}%)
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-black text-indigo-700 bg-indigo-50/30">{rowTotal}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50/80 font-black border-t border-slate-100 text-slate-800">
                      <td className="p-2 border-r border-slate-100 text-right">Total (एकूण)</td>
                      {levelKeys.map(key => {
                        const colTotal = combinedChart3Data.reduce((sum, r) => sum + Number(r[key] || 0), 0);
                        const grandTotal = combinedChart3Data.reduce((sum, r) => sum + levelKeys.reduce((s, k) => s + Number(r[k] || 0), 0), 0);
                        const pct = grandTotal > 0 ? ((colTotal / grandTotal) * 100).toFixed(1) : '0.0';
                        return (
                          <td key={key} className="p-2 border-r border-slate-100 text-center text-slate-900">
                            {colTotal} ({pct}%)
                          </td>
                        );
                      })}
                      <td className="p-2 text-center text-indigo-700 bg-indigo-50/40">
                        {combinedChart3Data.reduce((sum, r) => sum + levelKeys.reduce((s, k) => s + Number(r[k] || 0), 0), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
