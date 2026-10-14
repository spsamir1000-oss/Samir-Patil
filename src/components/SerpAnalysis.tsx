import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  Layers, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Calendar, 
  School, 
  User, 
  MapPin, 
  CheckSquare, 
  XSquare, 
  BarChart2, 
  PieChart as PieIcon, 
  Table, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { ZoomableGraphContainer } from './ZoomableGraphContainer';

import { Teacher } from '../types';

interface UploadedStudent {
  id: string;
  srNo: string;
  schoolName: string;
  studentName: string;
  classGrade: string;
  division: string;
  gender: string;
}

interface AssessmentRecord {
  id: string;
  studentId: string;
  type: string;
  date: string;
  attendance: 'Present' | 'Absent' | '';
  rollNo?: string;
  q1Range?: number | '';
  q2Accuracy?: number | '';
  q3Fluency?: number | '';
  q4Interaction?: number | '';
  q5Coherence?: number | '';
  status: 'Unassessed' | 'Absent' | 'Incomplete' | 'Completed';
  examiners?: string[];
  examiner1?: string;
  examiner2?: string;
  module?: string;
}

interface TeachingLog {
  id: string;
  date: string;
  school: string;
  classGrade: string;
  division: string;
  module: string;
  session: string;
  worksheet: string;
  challenges?: string;
}

const CRITERIA_COLORS = [
  '#6366f1', // Indigo (Range)
  '#22c55e', // Green (Accuracy)
  '#f59e0b', // Amber (Fluency)
  '#06b6d4', // Cyan (Interaction)
  '#ec4899', // Pink (Coherence)
];

const CRITERIA_LABELS = [
  'Range',
  'Accuracy',
  'Fluency',
  'Interaction',
  'Coherence'
];

// Render Dropdown Multiselect option UI cleanly with checklist checkboxes
const DropdownMultiSelect = ({ label, options, selected, setter }: { label: string, options: string[], selected: string[], setter: React.Dispatch<React.SetStateAction<string[]>> }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (val: string) => {
    setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const selectAll = () => {
    setter(options);
  };

  const clearAll = () => {
    setter([]);
  };

  const triggerLabel = useMemo(() => {
    if (selected.length === 0) return `All ${label}`;
    if (selected.length === 1) return selected[0];
    return `${selected.length} Selected`;
  }, [selected, label]);

  return (
    <div className="relative flex flex-col gap-1.5 w-full">
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
        {label}
      </span>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left text-xs font-bold text-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <span className="truncate pr-2">{triggerLabel}</span>
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Options List */}
      {isOpen && (
        <>
          {/* Overlay backdrop to close on click outside */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 z-20 max-h-56 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 text-[10px] font-black">
              <button 
                type="button"
                onClick={selectAll}
                className="text-indigo-600 hover:text-indigo-700 hover:underline px-1 py-0.5 cursor-pointer"
              >
                Select All
              </button>
              {selected.length > 0 && (
                <button 
                  type="button"
                  onClick={clearAll}
                  className="text-rose-600 hover:text-rose-700 hover:underline px-1 py-0.5 cursor-pointer"
                >
                  Clear ({selected.length})
                </button>
              )}
            </div>

            <div className="space-y-1">
              {options.length === 0 ? (
                <div className="text-[11px] font-medium text-slate-400 text-center py-2">
                  No options available
                </div>
              ) : (
                options.map(opt => {
                  const isChecked = selected.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none transition-colors text-xs font-bold text-slate-600 hover:text-slate-900 w-full"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(opt)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                      />
                      <span className="truncate">{opt}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface SerpAnalysisProps {
  currentUser?: Teacher | null;
  teachers?: Teacher[];
  storagePrefix?: 'serp' | 'arp';
}

export default function SerpAnalysis({ currentUser, teachers = [], storagePrefix = 'serp' }: SerpAnalysisProps = {}) {
  const [students, setStudents] = useState<UploadedStudent[]>([]);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [logs, setLogs] = useState<TeachingLog[]>([]);

  // Sub tabs state
  const [activeSubTab, setActiveSubTab] = useState<'teaching' | 'baseline' | 'endline' | 'comparison' | 'module'>('baseline');

  // Load data initially
  useEffect(() => {
    const studentsKey = storagePrefix === 'arp' ? 'arp_uploaded_students' : 'serp_uploaded_students';
    const recordsKey = storagePrefix === 'arp' ? 'arp_assessment_records' : 'serp_assessment_records';
    const logsKey = storagePrefix === 'arp' ? 'arp_teaching_logs' : 'serp_teaching_logs';

    const savedStudents = localStorage.getItem(studentsKey);
    const savedRecords = localStorage.getItem(recordsKey);
    const savedLogs = localStorage.getItem(logsKey);

    const normalizeClass = (c: string) => {
      if (!c) return c;
      const s = c.toString().trim().toLowerCase();
      if (/^[0-9]+$/.test(s)) {
        if (s === '1') return '1st';
        if (s === '2') return '2nd';
        if (s === '3') return '3rd';
        return `${s}th`;
      }
      return s; // Always return lowercase normalized version for predefined classes (1st, 2nd, etc)
    };

    if (savedStudents) {
      try {
        const parsed = JSON.parse(savedStudents);
        setStudents(parsed.map((s: any) => ({ ...s, classGrade: normalizeClass(s.classGrade) })));
      } catch (e) {}
    }
    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords));
      } catch (e) {}
    }
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        setLogs(parsed.map((l: any) => ({ ...l, classGrade: normalizeClass(l.classGrade) })));
      } catch (e) {}
    }
  }, [storagePrefix]);

  // Filter states
  const [selectedYears, setSelectedYears] = useState<string[]>(['2025-2026']);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedExaminers, setSelectedExaminers] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedSerps, setSelectedSerps] = useState<string[]>([]);

  // Teacher lookup map and unique list of SERP teacher names
  const teacherIdToNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    teachers.forEach(t => {
      map[t.id] = t.name;
    });
    return map;
  }, [teachers]);

  const serpTeacherNames = useMemo(() => {
    const list = new Set(logs.map(l => teacherIdToNameMap[l.teacherId]).filter(Boolean));
    return Array.from(list).sort();
  }, [logs, teacherIdToNameMap]);

  // Show/Hide section toggles
  const [showPie, setShowPie] = useState<boolean>(true);
  const [showBarCriteria, setShowBarCriteria] = useState<boolean>(true);
  const [showBarClass, setShowBarClass] = useState<boolean>(true);
  const [showBarSchool, setShowBarSchool] = useState<boolean>(true);
  const [showStudentsTable, setShowStudentsTable] = useState<boolean>(true);
  const [showClassTable, setShowClassTable] = useState<boolean>(true);
  const [showSchoolTable, setShowSchoolTable] = useState<boolean>(true);

  // Teaching section toggles
  const [showTeachingLogs, setShowTeachingLogs] = useState<boolean>(true);
  const [showTeachingStats, setShowTeachingStats] = useState<boolean>(true);

  // Unique metadata options extracted dynamically
  const schoolsList = useMemo(() => Array.from(new Set([...students.map(s => s.schoolName), ...logs.map(l => l.school)])).filter(Boolean).sort(), [students, logs]);
  const classesList = useMemo(() => {
    const ALLOWED_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
    return Array.from(new Set([...students.map(s => s.classGrade), ...logs.map(l => l.classGrade)]))
      .filter(Boolean)
      .filter(cls => ALLOWED_CLASSES.includes(cls))
      .sort();
  }, [students, logs]);
  const divisionsList = useMemo(() => Array.from(new Set([...students.map(s => s.division), ...logs.map(l => l.division)])).filter(Boolean).sort(), [students, logs]);
  
  const examinersList = useMemo(() => {
    const list = new Set<string>();
    records.forEach(r => {
      if (r.examiners) {
        r.examiners.forEach(ex => list.add(ex));
      } else {
        if (r.examiner1) list.add(r.examiner1);
        if (r.examiner2) list.add(r.examiner2);
      }
    });
    return Array.from(list).filter(Boolean).sort();
  }, [records]);

  const isSuperUser = useMemo(() => {
    return currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'academic_coordinator';
  }, [currentUser]);

  // Handle resets
  const resetFilters = () => {
    setSelectedYears([]);
    setStartDate('');
    setEndDate('');
    setSelectedSchools([]);
    setSelectedClasses([]);
    setSelectedDivisions([]);
    setSelectedExaminers([]);
    setSelectedModules([]);
    setSelectedSerps([]);
  };

  // Filter student dataset based on active selections
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // School filter: empty matches all
      if (selectedSchools.length > 0 && !selectedSchools.includes(student.schoolName)) return false;
      // Class filter: empty matches all
      if (selectedClasses.length > 0 && !selectedClasses.includes(student.classGrade)) return false;
      // Division filter: empty matches all
      if (selectedDivisions.length > 0 && !selectedDivisions.includes(student.division)) return false;
      return true;
    });
  }, [students, selectedSchools, selectedClasses, selectedDivisions]);

  // Helper matching individual records to filter criteria
  const getRecordScoreData = (record: AssessmentRecord) => {
    const safeNum = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };
    const q1 = safeNum(record.q1Range);
    const q2 = safeNum(record.q2Accuracy);
    const q3 = safeNum(record.q3Fluency);
    const q4 = safeNum(record.q4Interaction);
    const q5 = safeNum(record.q5Coherence);
    const obtained = q1 + q2 + q3 + q4 + q5;
    return { q1, q2, q3, q4, q5, obtained };
  };

  // Get active assessment records based on subtab type and year / date filters
  const processedRecords = useMemo(() => {
    let typeName = 'baseline';
    if (activeSubTab === 'endline') typeName = 'endline';
    else if (activeSubTab === 'module') typeName = 'module';

    return records.filter(record => {
      // Match active subtab type
      if (activeSubTab !== 'comparison' && record.type !== typeName) return false;

      // Year selection check
      if (activeSubTab !== 'module' && record.date && selectedYears.length > 0) {
        const yr = record.date.split('-')[0];
        const matchesAnyYear = selectedYears.some(sy => {
          const startYear = sy.includes('-') ? sy.split('-')[0] : sy;
          const endYear = sy.includes('-') ? sy.split('-')[1] : null;
          return endYear ? (yr === startYear || yr === endYear) : yr === startYear;
        });
        if (!matchesAnyYear) return false;
      }

      // Module assessment selection check
      if (activeSubTab === 'module' && selectedModules.length > 0) {
        const recMod = record.module || 'Module 1';
        if (!selectedModules.includes(recMod)) return false;
      }

      // Date Range filter
      if (startDate && record.date && record.date < startDate) return false;
      if (endDate && record.date && record.date > endDate) return false;

      // Examiner filter
      if (selectedExaminers.length > 0) {
        let recEx: string[] = [];
        if (record.examiners) recEx = record.examiners;
        else {
          if (record.examiner1) recEx.push(record.examiner1);
          if (record.examiner2) recEx.push(record.examiner2);
        }
        const hasMatch = recEx.some(ex => selectedExaminers.includes(ex));
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [records, activeSubTab, selectedYears, startDate, endDate, selectedExaminers, selectedModules]);

  // Lookup record by student ID
  const studentRecordsMap = useMemo(() => {
    const map = new Map<string, AssessmentRecord[]>();
    processedRecords.forEach(r => {
      const existing = map.get(r.studentId) || [];
      existing.push(r);
      map.set(r.studentId, existing);
    });
    return map;
  }, [processedRecords]);

  // Dynamic computations for Baseline, Endline or Module assessed sets
  const computedMetrics = useMemo(() => {
    let totalAssessedRecords = 0;
    let sumQ1 = 0, sumQ2 = 0, sumQ3 = 0, sumQ4 = 0, sumQ5 = 0;
    let studentsCountMap = new Map<string, { q1: number, q2: number, q3: number, q4: number, q5: number, obtained: number }>();

    // Gather matched students
    const matchedStudentsWithMarks: any[] = [];
    const classWiseScores: Record<string, { q1: number[], q2: number[], q3: number[], q4: number[], q5: number[], obtained: number[], totalCount: number, absentCount: number }> = {};
    const schoolWiseScores: Record<string, { q1: number[], q2: number[], q3: number[], q4: number[], q5: number[], obtained: number[], totalCount: number, absentCount: number }> = {};

    filteredStudents.forEach(student => {
      const recs = studentRecordsMap.get(student.id) || [];
      if (recs.length === 0) {
        // No record
        matchedStudentsWithMarks.push({
          student,
          status: 'Unassessed',
          marks: null
        });
        return;
      }

      // If multiple matching records (e.g., for different modules in 'module' type), let's aggregate or take latest/first.
      // To satisfy baseline / endline exactly, there is usually 1 record per student.
      const record = recs[0];
      const classKey = `${student.classGrade} - ${student.division}`;
      const schoolKey = student.schoolName;

      if (!classWiseScores[classKey]) {
        classWiseScores[classKey] = { q1: [], q2: [], q3: [], q4: [], q5: [], obtained: [], totalCount: 0, absentCount: 0 };
      }
      if (!schoolWiseScores[schoolKey]) {
        schoolWiseScores[schoolKey] = { q1: [], q2: [], q3: [], q4: [], q5: [], obtained: [], totalCount: 0, absentCount: 0 };
      }

      classWiseScores[classKey].totalCount++;
      schoolWiseScores[schoolKey].totalCount++;

      if (record.status === 'Absent' || record.attendance === 'Absent') {
        classWiseScores[classKey].absentCount++;
        schoolWiseScores[schoolKey].absentCount++;
        matchedStudentsWithMarks.push({
          student,
          status: 'Absent',
          record,
          marks: null
        });
        return;
      }

      const scores = getRecordScoreData(record);
      totalAssessedRecords++;
      sumQ1 += scores.q1;
      sumQ2 += scores.q2;
      sumQ3 += scores.q3;
      sumQ4 += scores.q4;
      sumQ5 += scores.q5;

      classWiseScores[classKey].q1.push(scores.q1);
      classWiseScores[classKey].q2.push(scores.q2);
      classWiseScores[classKey].q3.push(scores.q3);
      classWiseScores[classKey].q4.push(scores.q4);
      classWiseScores[classKey].q5.push(scores.q5);
      classWiseScores[classKey].obtained.push(scores.obtained);

      schoolWiseScores[schoolKey].q1.push(scores.q1);
      schoolWiseScores[schoolKey].q2.push(scores.q2);
      schoolWiseScores[schoolKey].q3.push(scores.q3);
      schoolWiseScores[schoolKey].q4.push(scores.q4);
      schoolWiseScores[schoolKey].q5.push(scores.q5);
      schoolWiseScores[schoolKey].obtained.push(scores.obtained);

      matchedStudentsWithMarks.push({
        student,
        status: 'Assessed',
        record,
        marks: scores
      });
    });

    // 1. Pie Chart data preparation
    // Relate proportion of scores for 5 sections
    const totalScoreAchievedAcrossAll = sumQ1 + sumQ2 + sumQ3 + sumQ4 + sumQ5 || 1;
    const getPieValue = (sumVal: number) => {
      // Proportion of achieved score so pie slices visually match percentages (adds to 100%)
      const val = (sumVal / totalScoreAchievedAcrossAll) * 100;
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };
    const getPieAvg = (sumVal: number) => {
      // Use standard mathematical obtained/total * 100 percentage as requested for tooltip
      const val = (sumVal / (totalAssessedRecords * 3)) * 100;
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };
    const getRawAvg = (sumVal: number) => {
      if (!totalAssessedRecords) return '0';
      const val = sumVal / totalAssessedRecords;
      return isNaN(val) ? '0' : val.toFixed(2);
    };

    const pieData = [
      { name: 'Range', value: getPieValue(sumQ1), avg: getPieAvg(sumQ1), rawAvg: getRawAvg(sumQ1) },
      { name: 'Accuracy', value: getPieValue(sumQ2), avg: getPieAvg(sumQ2), rawAvg: getRawAvg(sumQ2) },
      { name: 'Fluency', value: getPieValue(sumQ3), avg: getPieAvg(sumQ3), rawAvg: getRawAvg(sumQ3) },
      { name: 'Interaction', value: getPieValue(sumQ4), avg: getPieAvg(sumQ4), rawAvg: getRawAvg(sumQ4) },
      { name: 'Coherence', value: getPieValue(sumQ5), avg: getPieAvg(sumQ5), rawAvg: getRawAvg(sumQ5) },
    ];

    // 2. Criteria Bar Chart (5 individual scores average)
    const getCriteriaAvg = (sumVal: number) => {
      if (!totalAssessedRecords) return 0;
      const val = ((sumVal / (totalAssessedRecords * 3)) * 100);
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };

    const criteriaBarData = [
      { name: 'Q.1 (Range)', Average: getCriteriaAvg(sumQ1), rawVal: getRawAvg(sumQ1), fill: '#6366f1' },
      { name: 'Q.2 (Accuracy)', Average: getCriteriaAvg(sumQ2), rawVal: getRawAvg(sumQ2), fill: '#22c55e' },
      { name: 'Q.3 (Fluency)', Average: getCriteriaAvg(sumQ3), rawVal: getRawAvg(sumQ3), fill: '#f59e0b' },
      { name: 'Q.4 (Interaction)', Average: getCriteriaAvg(sumQ4), rawVal: getRawAvg(sumQ4), fill: '#06b6d4' },
      { name: 'Q.5 (Coherence)', Average: getCriteriaAvg(sumQ5), rawVal: getRawAvg(sumQ5), fill: '#ec4899' },
    ];

    const getAvgField = (arr: number[], count: number) => {
      const sum = arr.reduce((a, b) => a + b, 0);
      const val = sum / count;
      return isNaN(val) ? 0 : Number(val.toFixed(2));
    };

    const getScaledPercent = (avgVal: number) => {
      const val = (avgVal / 15) * 100;
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };

    const getRealAvgPct = (avgVal: number) => {
      const val = (avgVal / 3) * 100;
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };

    // 3. ClassWise Stacked Bar Data
    const classStackedBarData = Object.keys(classWiseScores).map(classKey => {
      const vals = classWiseScores[classKey];
      const count = vals.q1.length || 1;
      const avgQ1 = getAvgField(vals.q1, count);
      const avgQ2 = getAvgField(vals.q2, count);
      const avgQ3 = getAvgField(vals.q3, count);
      const avgQ4 = getAvgField(vals.q4, count);
      const avgQ5 = getAvgField(vals.q5, count);
      const avgObtained = getAvgField(vals.obtained, count);
      const rawPercent = (avgObtained / 15) * 100;
      const avgPercent = isNaN(rawPercent) ? 0 : Number(rawPercent.toFixed(1));

      return {
        name: classKey,
        Range: getScaledPercent(avgQ1),
        Accuracy: getScaledPercent(avgQ2),
        Fluency: getScaledPercent(avgQ3),
        Interaction: getScaledPercent(avgQ4),
        Coherence: getScaledPercent(avgQ5),
        rangePct: getRealAvgPct(avgQ1),
        accuracyPct: getRealAvgPct(avgQ2),
        fluencyPct: getRealAvgPct(avgQ3),
        interactionPct: getRealAvgPct(avgQ4),
        coherencePct: getRealAvgPct(avgQ5),
        rawRange: avgQ1,
        rawAccuracy: avgQ2,
        rawFluency: avgQ3,
        rawInteraction: avgQ4,
        rawCoherence: avgQ5,
        Obtained: avgObtained,
        Percent: avgPercent,
        assessed: vals.q1.length,
        total: vals.totalCount,
        absent: vals.absentCount
      };
    }).sort((a,b) => a.name.localeCompare(b.name));

    // 4. SchoolWise Stacked Bar Data
    const schoolStackedBarData = Object.keys(schoolWiseScores).map(schoolKey => {
      const vals = schoolWiseScores[schoolKey];
      const count = vals.q1.length || 1;
      const avgQ1 = getAvgField(vals.q1, count);
      const avgQ2 = getAvgField(vals.q2, count);
      const avgQ3 = getAvgField(vals.q3, count);
      const avgQ4 = getAvgField(vals.q4, count);
      const avgQ5 = getAvgField(vals.q5, count);
      const avgObtained = getAvgField(vals.obtained, count);
      const rawPercent = (avgObtained / 15) * 100;
      const avgPercent = isNaN(rawPercent) ? 0 : Number(rawPercent.toFixed(1));

      return {
        name: schoolKey,
        Range: getScaledPercent(avgQ1),
        Accuracy: getScaledPercent(avgQ2),
        Fluency: getScaledPercent(avgQ3),
        Interaction: getScaledPercent(avgQ4),
        Coherence: getScaledPercent(avgQ5),
        rangePct: getRealAvgPct(avgQ1),
        accuracyPct: getRealAvgPct(avgQ2),
        fluencyPct: getRealAvgPct(avgQ3),
        interactionPct: getRealAvgPct(avgQ4),
        coherencePct: getRealAvgPct(avgQ5),
        rawRange: avgQ1,
        rawAccuracy: avgQ2,
        rawFluency: avgQ3,
        rawInteraction: avgQ4,
        rawCoherence: avgQ5,
        Obtained: avgObtained,
        Percent: avgPercent,
        assessed: vals.q1.length,
        total: vals.totalCount,
        absent: vals.absentCount
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return {
      totalAssessed: totalAssessedRecords,
      sumQ1, sumQ2, sumQ3, sumQ4, sumQ5,
      pieData,
      criteriaBarData,
      classStackedBarData,
      schoolStackedBarData,
      matchedStudentsWithMarks
    };
  }, [filteredStudents, studentRecordsMap, activeSubTab, selectedYears]);

  // Comparison Tab Computation (Baseline vs Endline Progress metrics)
  const comparisonMetrics = useMemo(() => {
    if (activeSubTab !== 'comparison') return null;

    const checkYearMatch = (dateStr: string) => {
      const yr = dateStr.split('-')[0];
      if (selectedYears.length === 0) return true;
      return selectedYears.some(sy => {
        const startYear = sy.includes('-') ? sy.split('-')[0] : sy;
        const endYear = sy.includes('-') ? sy.split('-')[1] : null;
        return endYear ? (yr === startYear || yr === endYear) : yr === startYear;
      });
    };

    const baseRecs = records.filter(r => {
      if (!r.date) return false;
      return r.type === 'baseline' && checkYearMatch(r.date);
    });

    const endRecs = records.filter(r => {
      if (!r.date) return false;
      return r.type === 'endline' && checkYearMatch(r.date);
    });

    const baseMap = new Map<string, AssessmentRecord>();
    const endMap = new Map<string, AssessmentRecord>();

    baseRecs.forEach(r => baseMap.set(r.studentId, r));
    endRecs.forEach(r => endMap.set(r.studentId, r));

    const growthList: any[] = [];
    let positiveGrowthCount = 0;
    
    // Base tracking
    let baseSum = 0;
    let baseRecordCount = 0;
    let baseQ1 = 0, baseQ2 = 0, baseQ3 = 0, baseQ4 = 0, baseQ5 = 0;
    
    // End tracking
    let endSum = 0;
    let endRecordCount = 0;
    let endQ1 = 0, endQ2 = 0, endQ3 = 0, endQ4 = 0, endQ5 = 0;

    // Unmatched tracking
    let unmatchedBaseSum = 0, unmatchedBaseCount = 0;
    let unmatchedBaseQ1 = 0, unmatchedBaseQ2 = 0, unmatchedBaseQ3 = 0, unmatchedBaseQ4 = 0, unmatchedBaseQ5 = 0;
    
    let unmatchedEndSum = 0, unmatchedEndCount = 0;
    let unmatchedEndQ1 = 0, unmatchedEndQ2 = 0, unmatchedEndQ3 = 0, unmatchedEndQ4 = 0, unmatchedEndQ5 = 0;

    let unmatchedBaseStudents: any[] = [];
    let unmatchedEndStudents: any[] = [];

    let matchedCount = 0;

    // Class & School aggregation
    const baseClassAgg: any = {};
    const endClassAgg: any = {};
    const baseSchoolAgg: any = {};
    const endSchoolAgg: any = {};

    filteredStudents.forEach(student => {
      const baseRec = baseMap.get(student.id);
      const endRec = endMap.get(student.id);

      const baseVal = baseRec && baseRec.status !== 'Absent' ? getRecordScoreData(baseRec).obtained : null;
      const endVal = endRec && endRec.status !== 'Absent' ? getRecordScoreData(endRec).obtained : null;

      const baseScores = baseRec ? getRecordScoreData(baseRec) : null;
      const endScores = endRec ? getRecordScoreData(endRec) : null;

      if (baseVal !== null && !isNaN(baseVal) && baseScores) {
        baseSum += baseVal;
        baseRecordCount++;
        baseQ1 += baseScores.q1;
        baseQ2 += baseScores.q2;
        baseQ3 += baseScores.q3;
        baseQ4 += baseScores.q4;
        baseQ5 += baseScores.q5;

        // Group by class
        const clsKey = `${student.classGrade}-${student.division}`;
        if (!baseClassAgg[clsKey]) baseClassAgg[clsKey] = { sum: 0, count: 0 };
        baseClassAgg[clsKey].sum += baseVal;
        baseClassAgg[clsKey].count++;

        // Group by school
        if (!baseSchoolAgg[student.schoolName]) baseSchoolAgg[student.schoolName] = { sum: 0, count: 0 };
        baseSchoolAgg[student.schoolName].sum += baseVal;
        baseSchoolAgg[student.schoolName].count++;
      }

      if (endVal !== null && !isNaN(endVal) && endScores) {
        endSum += endVal;
        endRecordCount++;
        endQ1 += endScores.q1;
        endQ2 += endScores.q2;
        endQ3 += endScores.q3;
        endQ4 += endScores.q4;
        endQ5 += endScores.q5;

        // Group by class
        const clsKey = `${student.classGrade}-${student.division}`;
        if (!endClassAgg[clsKey]) endClassAgg[clsKey] = { sum: 0, count: 0 };
        endClassAgg[clsKey].sum += endVal;
        endClassAgg[clsKey].count++;

        // Group by school
        if (!endSchoolAgg[student.schoolName]) endSchoolAgg[student.schoolName] = { sum: 0, count: 0 };
        endSchoolAgg[student.schoolName].sum += endVal;
        endSchoolAgg[student.schoolName].count++;
      }

      if (baseVal !== null && !isNaN(baseVal) && endVal !== null && !isNaN(endVal)) {
        matchedCount++;
        const diff = endVal - baseVal;
        if (diff > 0) positiveGrowthCount++;
        const pGrowth = (diff / 15) * 100;
        const percentGrowth = isNaN(pGrowth) ? 0 : Number(pGrowth.toFixed(1));
        growthList.push({
          student,
          base: baseVal,
          end: endVal,
          baseScores,
          endScores,
          diff,
          percentGrowth
        });
      } else {
        if (baseVal !== null && !isNaN(baseVal) && baseScores) {
          unmatchedBaseSum += baseVal;
          unmatchedBaseCount++;
          unmatchedBaseQ1 += baseScores.q1;
          unmatchedBaseQ2 += baseScores.q2;
          unmatchedBaseQ3 += baseScores.q3;
          unmatchedBaseQ4 += baseScores.q4;
          unmatchedBaseQ5 += baseScores.q5;
          unmatchedBaseStudents.push({
             student,
             scores: baseScores,
             obtained: baseVal
          });
        }
        if (endVal !== null && !isNaN(endVal) && endScores) {
          unmatchedEndSum += endVal;
          unmatchedEndCount++;
          unmatchedEndQ1 += endScores.q1;
          unmatchedEndQ2 += endScores.q2;
          unmatchedEndQ3 += endScores.q3;
          unmatchedEndQ4 += endScores.q4;
          unmatchedEndQ5 += endScores.q5;
          unmatchedEndStudents.push({
             student,
             scores: endScores,
             obtained: endVal
          });
        }
      }
    });

    const rawBaseAvg = baseRecordCount ? Number((baseSum / baseRecordCount).toFixed(2)) : 0;
    const rawEndAvg = endRecordCount ? Number((endSum / endRecordCount).toFixed(2)) : 0;
    const overallBaseAvg = isNaN(rawBaseAvg) ? 0 : rawBaseAvg;
    const overallEndAvg = isNaN(rawEndAvg) ? 0 : rawEndAvg;
    const overallAvgDiff = overallEndAvg - overallBaseAvg;

    const unmatchedBaseAvg = unmatchedBaseCount ? Number((unmatchedBaseSum / unmatchedBaseCount).toFixed(2)) : 0;
    const unmatchedEndAvg = unmatchedEndCount ? Number((unmatchedEndSum / unmatchedEndCount).toFixed(2)) : 0;

    // Criteria graphs
    const getCriteriaAvg = (sumVal: number, count: number) => {
      if (!count) return 0;
      const val = ((sumVal / (count * 3)) * 100);
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };

    const criteriaData = [
      { name: 'Q.1 (Range)', Baseline: getCriteriaAvg(baseQ1, baseRecordCount), Endline: getCriteriaAvg(endQ1, endRecordCount) },
      { name: 'Q.2 (Accuracy)', Baseline: getCriteriaAvg(baseQ2, baseRecordCount), Endline: getCriteriaAvg(endQ2, endRecordCount) },
      { name: 'Q.3 (Fluency)', Baseline: getCriteriaAvg(baseQ3, baseRecordCount), Endline: getCriteriaAvg(endQ3, endRecordCount) },
      { name: 'Q.4 (Interaction)', Baseline: getCriteriaAvg(baseQ4, baseRecordCount), Endline: getCriteriaAvg(endQ4, endRecordCount) },
      { name: 'Q.5 (Coherence)', Baseline: getCriteriaAvg(baseQ5, baseRecordCount), Endline: getCriteriaAvg(endQ5, endRecordCount) },
    ];

    // Combine Class aggregations
    const allClasses = Array.from(new Set([...Object.keys(baseClassAgg), ...Object.keys(endClassAgg)]));
    const classComparisonData = allClasses.map(cls => ({
      name: cls,
      Baseline: baseClassAgg[cls] ? ((baseClassAgg[cls].sum / baseClassAgg[cls].count) / 15 * 100).toFixed(1) : null,
      Endline: endClassAgg[cls] ? ((endClassAgg[cls].sum / endClassAgg[cls].count) / 15 * 100).toFixed(1) : null,
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Combine School aggregations
    const allSchools = Array.from(new Set([...Object.keys(baseSchoolAgg), ...Object.keys(endSchoolAgg)]));
    const schoolComparisonData = allSchools.map(sch => ({
      name: sch,
      Baseline: baseSchoolAgg[sch] ? ((baseSchoolAgg[sch].sum / baseSchoolAgg[sch].count) / 15 * 100).toFixed(1) : null,
      Endline: endSchoolAgg[sch] ? ((endSchoolAgg[sch].sum / endSchoolAgg[sch].count) / 15 * 100).toFixed(1) : null,
    })).sort((a, b) => a.name.localeCompare(b.name));

    const unmatchedBaseStats = {
      q1: getCriteriaAvg(unmatchedBaseQ1, unmatchedBaseCount),
      q2: getCriteriaAvg(unmatchedBaseQ2, unmatchedBaseCount),
      q3: getCriteriaAvg(unmatchedBaseQ3, unmatchedBaseCount),
      q4: getCriteriaAvg(unmatchedBaseQ4, unmatchedBaseCount),
      q5: getCriteriaAvg(unmatchedBaseQ5, unmatchedBaseCount),
      total: unmatchedBaseCount ? Number(((unmatchedBaseAvg / 15) * 100).toFixed(1)) : 0
    };

    const unmatchedEndStats = {
      q1: getCriteriaAvg(unmatchedEndQ1, unmatchedEndCount),
      q2: getCriteriaAvg(unmatchedEndQ2, unmatchedEndCount),
      q3: getCriteriaAvg(unmatchedEndQ3, unmatchedEndCount),
      q4: getCriteriaAvg(unmatchedEndQ4, unmatchedEndCount),
      q5: getCriteriaAvg(unmatchedEndQ5, unmatchedEndCount),
      total: unmatchedEndCount ? Number(((unmatchedEndAvg / 15) * 100).toFixed(1)) : 0
    };

    // Calculate pie charts (matched students comparison pie charts based on all students aggregated scores in 5 sections)
    // So pie chart for Baseline Match vs Endline Match.
    const totalBaseScoreAchieved = baseQ1 + baseQ2 + baseQ3 + baseQ4 + baseQ5 || 1;
    const getPieBaseVal = (sumVal: number) => {
      // Proportion of achieved score so pie slices visually match percentages (adds to 100%)
      const val = (sumVal / totalBaseScoreAchieved) * 100;
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };
    const getPieBaseAvg = (sumVal: number) => {
      // actual average for the section to show in tooltips
      const val = (sumVal / (baseRecordCount * 3)) * 100;
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };

    const totalEndScoreAchieved = endQ1 + endQ2 + endQ3 + endQ4 + endQ5 || 1;
    const getPieEndVal = (sumVal: number) => {
      const val = (sumVal / totalEndScoreAchieved) * 100;
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };
    const getPieEndAvg = (sumVal: number) => {
      const val = (sumVal / (endRecordCount * 3)) * 100;
      return isNaN(val) ? 0 : Number(val.toFixed(1));
    };

    const pieDataMatchedBase = [
      { name: 'Range', value: getPieBaseVal(baseQ1), avg: getPieBaseAvg(baseQ1) },
      { name: 'Accuracy', value: getPieBaseVal(baseQ2), avg: getPieBaseAvg(baseQ2) },
      { name: 'Fluency', value: getPieBaseVal(baseQ3), avg: getPieBaseAvg(baseQ3) },
      { name: 'Interaction', value: getPieBaseVal(baseQ4), avg: getPieBaseAvg(baseQ4) },
      { name: 'Coherence', value: getPieBaseVal(baseQ5), avg: getPieBaseAvg(baseQ5) },
    ];

    const pieDataMatchedEnd = [
      { name: 'Range', value: getPieEndVal(endQ1), avg: getPieEndAvg(endQ1) },
      { name: 'Accuracy', value: getPieEndVal(endQ2), avg: getPieEndAvg(endQ2) },
      { name: 'Fluency', value: getPieEndVal(endQ3), avg: getPieEndAvg(endQ3) },
      { name: 'Interaction', value: getPieEndVal(endQ4), avg: getPieEndAvg(endQ4) },
      { name: 'Coherence', value: getPieEndVal(endQ5), avg: getPieEndAvg(endQ5) },
    ];

    return {
      growthList,
      positiveGrowthCount,
      overallBaseAvg,
      overallEndAvg,
      overallAvgDiff,
      unmatchedBaseAvg,
      unmatchedEndAvg,
      unmatchedBaseCount,
      unmatchedEndCount,
      unmatchedBaseStudents,
      unmatchedEndStudents,
      unmatchedBaseStats,
      unmatchedEndStats,
      criteriaData,
      classComparisonData,
      schoolComparisonData,
      pieDataMatchedBase,
      pieDataMatchedEnd
    };
  }, [records, filteredStudents, activeSubTab, selectedYears]);

  // Teaching Log Analytics calculations
  const teachingMetrics = useMemo(() => {
    if (activeSubTab !== 'teaching') return null;

    // Filter logs based on schools, classes, divisions, dates
    const filteredLogs = logs.filter(log => {
      // 1. Role-based restrictions (SERP user can only see their own logs)
      const isSerpUser = currentUser?.role === 'teacher' && currentUser?.types?.some(t => t.toUpperCase() === 'SERP');
      if (isSerpUser && log.teacherId !== currentUser?.id) {
        return false;
      }

      // 2. Multiselect SERP filter (Only for Admin, Manager, and Academic Coordinator)
      const isSuperUser = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'academic_coordinator';
      if (isSuperUser && selectedSerps.length > 0) {
        const teacherName = teacherIdToNameMap[log.teacherId] || 'Unknown';
        if (!selectedSerps.includes(teacherName)) {
          return false;
        }
      }

      if (selectedSchools.length > 0 && !selectedSchools.includes(log.school)) return false;
      if (selectedClasses.length > 0 && !selectedClasses.includes(log.classGrade)) return false;
      if (selectedDivisions.length > 0 && !selectedDivisions.includes(log.division)) return false;
      if (startDate && log.date && log.date < startDate) return false;
      if (endDate && log.date && log.date > endDate) return false;
      return true;
    });

    // 1. Logs count by School
    const schoolLogCount: Record<string, number> = {};
    const schoolLogDates: Record<string, Set<string>> = {};
    const moduleLogCount: Record<string, number> = {};
    let worksheetYes = 0;
    let worksheetNo = 0;

    filteredLogs.forEach(log => {
      schoolLogCount[log.school] = (schoolLogCount[log.school] || 0) + 1;
      
      if (!schoolLogDates[log.school]) schoolLogDates[log.school] = new Set();
      schoolLogDates[log.school].add(log.date);

      moduleLogCount[log.module] = (moduleLogCount[log.module] || 0) + 1;
      if (log.worksheet === 'Yes') worksheetYes++;
      else if (log.worksheet === 'No') worksheetNo++;
    });

    const worksheetData = [
      { name: 'Worksheet Done', value: worksheetYes },
      { name: 'Worksheet Pending', value: worksheetNo }
    ];

    const schoolBars = Object.keys(schoolLogCount).map(school => ({
      name: school,
      "Logs Count": schoolLogCount[school]
    })).sort((a,b) => b["Logs Count"] - a["Logs Count"]);

    const moduleBars = Object.keys(moduleLogCount).map(mod => ({
      name: mod,
      "Sessions Completed": moduleLogCount[mod]
    })).sort((a,b) => b["Sessions Completed"] - a["Sessions Completed"]);

    // School wise breakdown of visits & sessions
    const schoolVisitsAndSessions = Object.keys(schoolLogCount).map(school => {
      return {
        school,
        visits: schoolLogDates[school].size,
        sessions: schoolLogCount[school],
        worksheetsDone: filteredLogs.filter(l => l.school === school && l.worksheet === 'Yes').length,
      };
    }).sort((a, b) => b.visits - a.visits || b.sessions - a.sessions);

    // Challenges list (all unique non-empty challenges)
    const challengesList = Array.from(new Set(
      filteredLogs
        .map(log => log.challenges)
        .filter((c): c is string => !!c && c.trim() !== '')
    )).sort();

    // Map each School-Class-Division to its latest completed session
    const schoolClassSessionsMap: Record<string, { school: string, classGrade: string, division: string, module: string, session: string, date: string }> = {};
    filteredLogs.forEach(log => {
      const key = `${log.school} - Class ${log.classGrade} (${log.division})`;
      if (!schoolClassSessionsMap[key] || log.date > schoolClassSessionsMap[key].date) {
        schoolClassSessionsMap[key] = {
          school: log.school,
          classGrade: log.classGrade,
          division: log.division,
          module: log.module,
          session: log.session,
          date: log.date
        };
      }
    });

    const latestCompletedSessions = Object.entries(schoolClassSessionsMap).map(([classKey, item]) => ({
      classKey,
      ...item
    })).sort((a, b) => a.classKey.localeCompare(b.classKey));

    const totalVisits = new Set(filteredLogs.map(l => `${l.date}|${l.school}`)).size;
    const totalClassWiseVisits = new Set(filteredLogs.map(l => `${l.date}|${l.school}|${l.classGrade}|${l.division}`)).size;
    const totalSchoolWiseVisits = new Set(filteredLogs.map(l => `${l.date}|${l.school}`)).size;

    return {
      filteredLogs,
      worksheetData,
      schoolBars,
      moduleBars,
      totalLogs: filteredLogs.length,
      worksheetYesRate: filteredLogs.length ? ((worksheetYes / filteredLogs.length) * 100).toFixed(1) : '0',
      totalVisits,
      totalSessions: filteredLogs.length,
      totalSchoolWiseVisits,
      totalClassWiseVisits,
      schoolVisitsAndSessions,
      worksheetYes,
      worksheetNo,
      challengesList,
      latestCompletedSessions
    };
  }, [logs, selectedSchools, selectedClasses, selectedDivisions, startDate, endDate, activeSubTab, selectedSerps, teacherIdToNameMap, currentUser]);

  const groupedDailyLogs = useMemo(() => {
    if (!teachingMetrics?.filteredLogs) return [];
    
    const sorted = [...teachingMetrics.filteredLogs].sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date);
      if (dateComp !== 0) return dateComp;
      const schoolComp = a.school.localeCompare(b.school);
      if (schoolComp !== 0) return schoolComp;
      const classComp = a.classGrade.localeCompare(b.classGrade);
      if (classComp !== 0) return classComp;
      return a.division.localeCompare(b.division);
    });

    let currentGroupKey = "";
    let groupIndex = -1;

    const faintRowColors = [
      'bg-indigo-50 hover:bg-indigo-100/80',
      'bg-emerald-50 hover:bg-emerald-100/80',
      'bg-amber-50 hover:bg-amber-100/80',
      'bg-purple-50 hover:bg-purple-100/80',
      'bg-cyan-50 hover:bg-cyan-100/80',
      'bg-rose-50 hover:bg-rose-100/80',
      'bg-lime-50 hover:bg-lime-100/80'
    ];

    return sorted.map((log) => {
      const groupKey = `${log.date}||${log.school}`;
      const isNewGroup = groupKey !== currentGroupKey;
      if (isNewGroup) {
        currentGroupKey = groupKey;
        groupIndex++;
      }

      const rowBgColor = faintRowColors[groupIndex % faintRowColors.length];

      return {
        log,
        isFirstInGroup: isNewGroup,
        rowBgColor,
        displayDate: isNewGroup ? log.date : "",
        displaySchool: isNewGroup ? log.school : ""
      };
    });
  }, [teachingMetrics?.filteredLogs]);

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Scrollable Sub Tabs menu */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-1 max-w-full overflow-x-auto flex flex-row items-center gap-1 scrollbar-hide">
        {[
          { id: 'teaching', label: 'Teaching Analysis', icon: TrendingUp },
          { id: 'baseline', label: 'Baseline Assessment', icon: Layers },
          { id: 'endline', label: 'Endline Assessment', icon: Layers },
          { id: 'comparison', label: 'Baseline/Endline Comparison', icon: RefreshCw },
          { id: 'module', label: 'Module Assessment', icon: CheckSquare }
        ].map(tab => {
          const isActive = activeSubTab === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
              }}
              className={`flex items-center gap-2 whitespace-nowrap font-black text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <IconComp className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
             <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-sm font-black text-slate-800">Dynamic Filter Engine</h3>
                <p className="text-[11px] font-bold text-slate-400">Configure parameters below to regenerate live analytics</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <button
               onClick={resetFilters}
               className="text-[11px] font-black text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-xl px-3.5 py-2 transition-all cursor-pointer"
             >
                Reset Filters
             </button>
          </div>
        </div>

        {/* Dynamic Badges selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {activeSubTab !== 'teaching' && activeSubTab !== 'module' && (
             <DropdownMultiSelect 
               label="Selected Year" 
               options={['2024-2025', '2025-2026', '2026-2027', '2027-2028', '2028-2029']} 
               selected={selectedYears} 
               setter={setSelectedYears} 
             />
          )}
          {/* Date range inputs */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Date Duration</span>
            <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-200 p-2 rounded-xl">
               <input 
                 type="date" 
                 value={startDate}
                 onChange={e => setStartDate(e.target.value)}
                 className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-full"
               />
               <span className="text-slate-400 text-xs font-semibold">to</span>
               <input 
                 type="date" 
                 value={endDate}
                 onChange={e => setEndDate(e.target.value)}
                 className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none w-full"
               />
            </div>
          </div>

          <DropdownMultiSelect label="Schools Name" options={schoolsList} selected={selectedSchools} setter={setSelectedSchools} />
          <DropdownMultiSelect label="Classes Grade" options={classesList} selected={selectedClasses} setter={setSelectedClasses} />
          <DropdownMultiSelect label="Divisions" options={divisionsList} selected={selectedDivisions} setter={setSelectedDivisions} />
          
          {activeSubTab !== 'teaching' && (
             <DropdownMultiSelect label="Examiners Name" options={examinersList} selected={selectedExaminers} setter={setSelectedExaminers} />
          )}

          {activeSubTab === 'module' && (
             <DropdownMultiSelect 
               label="Modules Filter" 
               options={Array.from({length: 10}, (_, i) => `Module ${i + 1}`)} 
               selected={selectedModules} 
               setter={setSelectedModules} 
             />
          )}

          {activeSubTab === 'teaching' && isSuperUser && (
             <DropdownMultiSelect 
               label="SERP Name" 
               options={serpTeacherNames} 
               selected={selectedSerps} 
               setter={setSelectedSerps} 
             />
          )}
        </div>


      </div>

      {students.length === 0 ? (
         <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-black text-slate-800">No Student Records Found</h3>
            <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto mt-1 leading-relaxed">
               Please upload student data from the Excel Upload Header inside Module Assessment tab to populate student database records.
            </p>
         </div>
      ) : (
        <>
          {/* TEACHING ANALYSIS CONTENT */}
           {activeSubTab === 'teaching' && teachingMetrics && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase">Total Visits</p>
                     <p className="text-2xl font-black text-indigo-600 mt-1">{teachingMetrics.totalVisits}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase">Total Sessions</p>
                     <p className="text-2xl font-black text-emerald-600 mt-1">{teachingMetrics.totalSessions}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase">Total class wise visits</p>
                     <p className="text-2xl font-black text-cyan-600 mt-1">{teachingMetrics.totalClassWiseVisits}</p>
                  </div>
               </div>

               {/* Daily Log Subsection (दैनिक नोंद) */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                           <FolderOpen className="w-4 h-4" />
                        </div>
                        <div>
                           <h4 className="text-sm font-black text-slate-800">
                              Daily Log (दैनिक नोंद)
                           </h4>
                           <p className="text-[10px] text-slate-400 font-bold">List of all recorded teaching logs according to active filters (सक्रिय फिल्टरनुसार रेकॉर्ड केलेले दैनिक नोंदी)</p>
                        </div>
                     </div>
                     <button
                        onClick={() => setShowTeachingLogs(!showTeachingLogs)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-black text-slate-600 transition-colors cursor-pointer"
                     >
                        {showTeachingLogs ? (
                           <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                              Hide (लपवा)
                           </>
                        ) : (
                           <>
                              <Eye className="w-3.5 h-3.5 text-indigo-500" />
                              Show (दाखवा)
                           </>
                        )}
                     </button>
                  </div>

                  {showTeachingLogs && (
                     <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-slate-50 p-2 sm:p-3">
                        <div className="min-w-[800px] overflow-hidden rounded-xl bg-white border border-slate-100 shadow-sm">
                           <table className="w-full text-xs text-left">
                              <thead>
                                 <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-500">
                                    <th className="p-3">Date (तारीख)</th>
                                    <th className="p-3">School Name (शाळेचे नाव)</th>
                                    <th className="p-3">Class (इयत्ता)</th>
                                    <th className="p-3">Division (तुकडी)</th>
                                    <th className="p-3">Module Name (मॉड्यूल)</th>
                                    <th className="p-3">Session Name (सत्र)</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150">
                                 {groupedDailyLogs.length === 0 ? (
                                    <tr>
                                       <td colSpan={6} className="p-6 text-center text-slate-400 font-semibold italic">No daily logs found matching the selected filters.</td>
                                    </tr>
                                 ) : (
                                    groupedDailyLogs.map(({ log, rowBgColor, displayDate, displaySchool }) => (
                                       <tr key={log.id} className={`${rowBgColor} transition-all font-sans border-b border-slate-100`}>
                                          <td className="p-3 font-semibold text-slate-600 whitespace-nowrap">
                                             {displayDate ? (
                                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold">
                                                   {displayDate}
                                                </span>
                                             ) : (
                                                <span className="text-slate-300 italic text-[10px]">"</span>
                                             )}
                                          </td>
                                          <td className="p-3 font-extrabold text-slate-800">
                                             {displaySchool ? (
                                                <span className="text-slate-800 font-black">
                                                   {displaySchool}
                                                </span>
                                             ) : (
                                                <span className="text-slate-300 italic text-[10px]">"</span>
                                             )}
                                          </td>
                                          <td className="p-3 font-semibold text-slate-650">Class {log.classGrade}</td>
                                          <td className="p-3 font-bold text-indigo-600">Div {log.division}</td>
                                          <td className="p-3 font-semibold text-slate-600">{log.module}</td>
                                          <td className="p-3 font-bold text-emerald-600">{log.session}</td>
                                       </tr>
                                    ))
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}
               </div>



                {/* Section 3: Numerical Performance & Visited logs Summary Panel */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 animate-fade-in animate-duration-300">
                   <div>
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                         <Table className="w-5 h-5 text-indigo-600" />
                         Numerical Performance & Visit Analysis Summary (संख्यात्मक कार्यप्रदर्शन आणि भेट विश्लेषण)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-bold mt-1">Detailed statistical records from baseline teaching logs and system visits</p>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* 1. School Wise Visits & Sessions Breakdown */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
                         <div className="border-b border-slate-200 pb-2">
                            <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                               <span>School Wise Visits & Sessions</span>
                               <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-extrabold uppercase animate-pulse">Live Breakdown</span>
                            </h5>
                         </div>
                         
                         <div className="overflow-x-auto max-h-[250px] overflow-y-auto border border-slate-200/60 rounded-xl bg-white">
                            <table className="w-full text-xs text-left">
                               <thead>
                                  <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-500">
                                     <th className="p-3">School Name</th>
                                     <th className="p-3 text-center">Total Visits</th>
                                     <th className="p-3 text-center">Sessions Taken</th>

                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                  {teachingMetrics.schoolVisitsAndSessions.length === 0 ? (
                                     <tr>
                                        <td colSpan={3} className="p-4 text-center text-slate-400 font-semibold italic">No school visit records found.</td>
                                     </tr>
                                  ) : (
                                     teachingMetrics.schoolVisitsAndSessions.map((row, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50">
                                           <td className="p-3 font-bold text-slate-800">{row.school}</td>
                                           <td className="p-3 text-center font-extrabold text-indigo-600 bg-indigo-50/50">{row.visits}</td>
                                           <td className="p-3 text-center font-bold text-slate-600">{row.sessions}</td>

                                        </tr>
                                     ))
                                  )}
                               </tbody>
                            </table>
                         </div>
                      </div>

                      {/* 2. Challenges Faced */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-5">
                         <div>
                            <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-200">Challenges Faced (आलेली आव्हाने)</h5>
                         </div>

                         {/* Challenges list */}
                         <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider block font-bold font-sans">Observed Challenges Faced (आलेली आव्हाने)</span>
                            <div className="max-h-[140px] overflow-y-auto border border-rose-100 bg-white rounded-xl p-3 text-xs space-y-2 shadow-inner">
                               {teachingMetrics.challengesList.length === 0 ? (
                                  <p className="text-slate-400 font-semibold text-center italic py-4">No challenges recorded in these school visits.</p>
                               ) : (
                                  teachingMetrics.challengesList.map((challenge, idx) => (
                                     <div key={idx} className="flex items-start gap-2 text-slate-600 font-medium leading-relaxed">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                                        <span>{challenge}</span>
                                     </div>
                                  ))
                               )}
                            </div>
                         </div>
                      </div>

                   </div>

                   {/* 3. School'Classes and Their Latest Completed Sessions */}
                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4 font-sans">
                      <div className="border-b border-slate-200 pb-2">
                         <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                            Latest Session Completed by School & Class/Division (शाळा व वर्ग निहाय कव्हर केलेले नवीनतम सत्र)
                         </h5>
                      </div>
                      <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-slate-200/60 rounded-xl bg-white">
                         <table className="w-full text-xs text-left">
                            <thead>
                               <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-slate-500">
                                  <th className="p-3">School Name</th>
                                  <th className="p-3">Class Grade</th>
                                  <th className="p-3">Division</th>
                                  <th className="p-3 text-center bg-cyan-50/50 text-cyan-900 font-black">Latest Completed Session</th>
                                  <th className="p-3 text-right">Completion Date</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {teachingMetrics.latestCompletedSessions.length === 0 ? (
                                  <tr>
                                     <td colSpan={5} className="p-4 text-center text-slate-400 font-semibold italic">No session logs found.</td>
                                  </tr>
                               ) : (
                                  teachingMetrics.latestCompletedSessions.map((row, index) => (
                                     <tr key={index} className="hover:bg-slate-50/50">
                                        <td className="p-3 font-bold text-slate-800">{row.school}</td>
                                        <td className="p-3 font-semibold text-slate-600">Class {row.classGrade}</td>
                                        <td className="p-3 font-bold text-indigo-600 font-sans">Div {row.division}</td>
                                        <td className="p-3 text-center bg-cyan-50/5 font-bold text-cyan-700">
                                           <span className="bg-cyan-50 border border-cyan-100 text-cyan-700 rounded-lg px-2.5 py-1 font-extrabold font-sans">
                                              {row.module} • {row.session}
                                           </span>
                                        </td>
                                        <td className="p-3 text-right font-medium text-slate-500">{row.date}</td>
                                     </tr>
                                  ))
                               )}
                            </tbody>
                         </table>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* BASELINE, ENDLINE & MODULE ASSESSMENT DETAILED CONTENT */}
          {(activeSubTab === 'baseline' || activeSubTab === 'endline' || activeSubTab === 'module') && (
            <div className="space-y-8">
               
               {/* 1. Pie Chart Analysis */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                     <div className="flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-indigo-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">Criteria-wise Score Share (Percentage Distribution)</h4>
                           <p className="text-[11px] text-slate-400 font-bold">Relative contribution of each criteria to overall performance</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowPie(!showPie)}
                       className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 cursor-pointer"
                     >
                        {showPie ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showPie ? 'Hide' : 'Show'}
                     </button>
                  </div>

                  {showPie && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                       <div className="h-64 sm:h-72 flex items-center justify-center">
                          {computedMetrics.totalAssessed === 0 ? (
                             <p className="text-xs font-bold text-slate-400">No assessed records match criteria.</p>
                          ) : (
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                   <Pie
                                     data={computedMetrics.pieData}
                                     cx="50%"
                                     cy="50%"
                                     innerRadius={60}
                                     outerRadius={90}
                                     paddingAngle={5}
                                     dataKey="value"
                                   >
                                      {computedMetrics.pieData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={CRITERIA_COLORS[index]} />
                                      ))}
                                   </Pie>
                                   <Tooltip formatter={(value: number, name: string, props: any) => [`${props.payload.avg}%`, 'Average Percent']} />
                                </PieChart>
                             </ResponsiveContainer>
                          )}
                       </div>
                       
                       <div className="space-y-3.5 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                          <p className="text-xs font-black text-slate-700/80 uppercase">Criteria Breakdown & Average</p>
                          {computedMetrics.pieData.map((val, idx) => (
                             <div key={val.name} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                <div className="flex items-center gap-2">
                                   <div className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: CRITERIA_COLORS[idx] }} />
                                   <span className="text-xs font-bold text-slate-700">{val.name}</span>
                                </div>
                                <div className="text-right">
                                   <span className="text-xs font-black text-slate-900 font-mono">{val.value}%</span>
                                   <span className="text-[10px] text-slate-400 font-bold ml-1.5">(Avg: {val.rawAvg}/3)</span>
                                </div>
                             </div>
                          ))}
                          <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-black text-slate-900">
                             <span>Assessed Sample Size</span>
                             <span className="font-mono text-indigo-600">{computedMetrics.totalAssessed} Students</span>
                          </div>
                       </div>
                    </div>
                  )}
               </div>

               {/* 2. Bar Graphs Section */}
               
               {/* 2a. Average Criteria Marks Bar Graph */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                     <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-indigo-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">Criteria-wise Score Averages (Independent Bars)</h4>
                           <p className="text-[11px] text-slate-400 font-bold">Average points scored out of 3.0 for each core concept</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowBarCriteria(!showBarCriteria)}
                       className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 cursor-pointer"
                     >
                        {showBarCriteria ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showBarCriteria ? 'Hide' : 'Show'}
                     </button>
                  </div>

                  {showBarCriteria && (
                     <div className="w-full pt-4">
                        {computedMetrics.totalAssessed === 0 ? (
                           <div className="h-24 flex items-center justify-center text-xs font-bold text-slate-400">No assessed records match criteria.</div>
                        ) : (
                           <ZoomableGraphContainer defaultMinWidth={600}>
                              <div className="h-72 w-full">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={computedMetrics.criteriaBarData}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                       <XAxis dataKey="name" fontSize={11} fontWeight={600} tickLine={false} />
                                       <YAxis fontSize={11} fontWeight={600} domain={[0, 100]} tickFormatter={(val) => `${val}%`} tickLine={false} />
                                       <Tooltip formatter={(value, name, props) => [`${value}% (${props.payload.rawVal} / 3.0)`, 'Average Score']} />
                                       <Bar dataKey="Average" radius={[4, 4, 0, 0]}>
                                          {computedMetrics.criteriaBarData.map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={entry.fill} />
                                          ))}
                                       </Bar>
                                    </BarChart>
                                 </ResponsiveContainer>
                              </div>
                           </ZoomableGraphContainer>
                        )}
                     </div>
                  )}
               </div>

               {/* 2b. Class Stacked Bar Chart */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                     <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-emerald-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">Class & Division Wise Stacked Performance Graph</h4>
                           <p className="text-[11px] text-slate-400 font-bold">Consolidated average criteria breakdown as segments per class</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowBarClass(!showBarClass)}
                       className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 cursor-pointer"
                     >
                        {showBarClass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showBarClass ? 'Hide' : 'Show'}
                     </button>
                  </div>

                  {showBarClass && (
                     <div className="w-full pt-4">
                        {computedMetrics.classStackedBarData.length === 0 ? (
                           <div className="h-24 flex items-center justify-center text-xs font-bold text-slate-400">No assessed records match criteria.</div>
                        ) : (
                           <ZoomableGraphContainer defaultMinWidth={600}>
                              <div className="h-80 w-full">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={computedMetrics.classStackedBarData}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                       <XAxis dataKey="name" fontSize={11} fontWeight={600} tickLine={false} />
                                       <YAxis fontSize={11} fontWeight={600} domain={[0, 100]} tickFormatter={(val) => `${val}%`} tickLine={false} />
                                       <Tooltip 
                                          formatter={(value, name, props) => {
                                             const item = props?.payload;
                                             if (!item) return [`${value}%`, name];
                                             let rawVal = 0;
                                             if (name === "Range") rawVal = item.rawRange;
                                             else if (name === "Accuracy") rawVal = item.rawAccuracy;
                                             else if (name === "Fluency") rawVal = item.rawFluency;
                                             else if (name === "Interaction") rawVal = item.rawInteraction;
                                             else if (name === "Coherence") rawVal = item.rawCoherence;
                                             
                                             const safeRawVal = isNaN(rawVal) || rawVal === undefined || rawVal === null ? 0 : Number(rawVal);
                                             const scorePercent = ((safeRawVal / 3) * 100);
                                             const categoryPercent = isNaN(scorePercent) ? '0.0' : scorePercent.toFixed(1);
                                             return [`${safeRawVal.toFixed(2)} / 3.0 (${categoryPercent}%) [Contribution: ${value}%]`, name];
                                          }}
                                       />
                                       <Legend />
                                       <Bar dataKey="Range" stackId="a" fill="#6366f1" />
                                       <Bar dataKey="Accuracy" stackId="a" fill="#22c55e" />
                                       <Bar dataKey="Fluency" stackId="a" fill="#f59e0b" />
                                       <Bar dataKey="Interaction" stackId="a" fill="#06b6d4" />
                                       <Bar dataKey="Coherence" stackId="a" fill="#ec4899" />
                                    </BarChart>
                                 </ResponsiveContainer>
                              </div>
                           </ZoomableGraphContainer>
                        )}
                     </div>
                  )}
               </div>

               {/* 2c. Schools Stacked Bar Chart */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                     <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-amber-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">School-wise Stacked Performance Comparison</h4>
                           <p className="text-[11px] text-slate-400 font-bold">Independent stacked comparison for unique active schools</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowBarSchool(!showBarSchool)}
                       className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 cursor-pointer"
                     >
                        {showBarSchool ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showBarSchool ? 'Hide' : 'Show'}
                     </button>
                  </div>

                  {showBarSchool && (
                     <div className="w-full pt-4">
                        {computedMetrics.schoolStackedBarData.length === 0 ? (
                           <div className="h-24 flex items-center justify-center text-xs font-bold text-slate-400">No assessed records match criteria.</div>
                        ) : (
                           <ZoomableGraphContainer defaultMinWidth={600}>
                              <div className="h-80 w-full">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={computedMetrics.schoolStackedBarData}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                       <XAxis dataKey="name" fontSize={11} fontWeight={600} tickLine={false} />
                                       <YAxis fontSize={11} fontWeight={600} domain={[0, 100]} tickFormatter={(val) => `${val}%`} tickLine={false} />
                                       <Tooltip 
                                          formatter={(value, name, props) => {
                                             const item = props?.payload;
                                             if (!item) return [`${value}%`, name];
                                             let rawVal = 0;
                                             if (name === "Range") rawVal = item.rawRange;
                                             else if (name === "Accuracy") rawVal = item.rawAccuracy;
                                             else if (name === "Fluency") rawVal = item.rawFluency;
                                             else if (name === "Interaction") rawVal = item.rawInteraction;
                                             else if (name === "Coherence") rawVal = item.rawCoherence;
                                             
                                             const safeRawVal = isNaN(rawVal) || rawVal === undefined || rawVal === null ? 0 : Number(rawVal);
                                             const scorePercent = ((safeRawVal / 3) * 100);
                                             const categoryPercent = isNaN(scorePercent) ? '0.0' : scorePercent.toFixed(1);
                                             return [`${safeRawVal.toFixed(2)} / 3.0 (${categoryPercent}%) [Contribution: ${value}%]`, name];
                                          }}
                                       />
                                       <Legend />
                                       <Bar dataKey="Range" stackId="a" fill="#6366f1" />
                                       <Bar dataKey="Accuracy" stackId="a" fill="#22c55e" />
                                       <Bar dataKey="Fluency" stackId="a" fill="#f59e0b" />
                                       <Bar dataKey="Interaction" stackId="a" fill="#06b6d4" />
                                       <Bar dataKey="Coherence" stackId="a" fill="#ec4899" />
                                    </BarChart>
                                 </ResponsiveContainer>
                              </div>
                           </ZoomableGraphContainer>
                        )}
                     </div>
                  )}
               </div>

               {/* 3. Numerical Analysis Section */}
               
               {/* 3a. Students List Table */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <Table className="w-5 h-5 text-indigo-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">Students Assessment Scoring Log</h4>
                           <p className="text-[11px] text-slate-400 font-bold">Individual marks across sections matching filters</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowStudentsTable(!showStudentsTable)}
                       className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 cursor-pointer"
                     >
                        {showStudentsTable ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showStudentsTable ? 'Hide' : 'Show'}
                     </button>
                  </div>

                  {showStudentsTable && (
                     <div className="max-h-[350px] overflow-y-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                           <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-100">
                              <tr>
                                 <th className="py-2.5 px-4">Sr No.</th>
                                 <th className="py-2.5 px-4">Student Name</th>
                                 <th className="py-2.5 px-4 text-center">Class / Div</th>
                                 <th className="py-2.5 px-3 text-center">Status</th>
                                 <th className="py-2.5 px-2 text-center text-indigo-600">Range</th>
                                 <th className="py-2.5 px-2 text-center text-emerald-600">Accuracy</th>
                                 <th className="py-2.5 px-2 text-center text-amber-600">Fluency</th>
                                 <th className="py-2.5 px-2 text-center text-cyan-600">Interaction</th>
                                 <th className="py-2.5 px-2 text-center text-pink-600">Coherence</th>
                                 <th className="py-2.5 px-3 text-center bg-indigo-50/50 font-black text-indigo-900">Obtained</th>
                                 <th className="py-2.5 px-3 text-center bg-indigo-50 font-black text-indigo-950">Average</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {computedMetrics.matchedStudentsWithMarks.length === 0 ? (
                                 <tr>
                                    <td colSpan={11} className="text-center py-8 text-xs font-black text-slate-400">No student records match.</td>
                                 </tr>
                              ) : computedMetrics.matchedStudentsWithMarks.map((m, idx) => (
                                 <tr key={m.student.id} className="hover:bg-slate-50/30">
                                    <td className="py-2 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                                    <td className="py-2 px-4 font-bold text-slate-800">{m.student.studentName}</td>
                                    <td className="py-2 px-4 text-center">{m.student.classGrade} - {m.student.division}</td>
                                    <td className="py-2 px-3 text-center">
                                       <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                          m.status === 'Assessed' ? 'bg-emerald-50 text-emerald-600' :
                                          m.status === 'Absent' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                                       }`}>
                                          {m.status}
                                       </span>
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono">{m.marks ? m.marks.q1 : '-'}</td>
                                    <td className="py-2 px-2 text-center font-mono">{m.marks ? m.marks.q2 : '-'}</td>
                                    <td className="py-2 px-2 text-center font-mono">{m.marks ? m.marks.q3 : '-'}</td>
                                    <td className="py-2 px-2 text-center font-mono">{m.marks ? m.marks.q4 : '-'}</td>
                                    <td className="py-2 px-2 text-center font-mono">{m.marks ? m.marks.q5 : '-'}</td>
                                    <td className="py-2 px-3 text-center bg-indigo-50/30 font-black text-slate-700 font-mono">
                                       {m.marks ? m.marks.obtained : m.status}
                                    </td>
                                    <td className="py-2 px-3 text-center bg-indigo-50/50 font-black text-indigo-700 font-mono">
                                       {m.marks ? `${((m.marks.obtained / 15) * 100).toFixed(1)}%` : m.status}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </div>

               {/* 3b. Class and Division Wise average points score */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <Table className="w-5 h-5 text-emerald-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">Class & Division Wise Criteria Breakdown (Averages)</h4>
                           <p className="text-[11px] text-slate-400 font-bold">Average criteria allocation mapped per school's division</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowClassTable(!showClassTable)}
                       className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 cursor-pointer"
                     >
                        {showClassTable ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showClassTable ? 'Hide' : 'Show'}
                     </button>
                  </div>

                  {showClassTable && (
                     <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                           <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                              <tr>
                                 <th className="py-2.5 px-4">Class & Div</th>
                                 <th className="py-2.5 px-4 text-center">Assessed Sample</th>
                                 <th className="py-2.5 px-2 text-center text-indigo-600">Range (Avg)</th>
                                 <th className="py-2.5 px-2 text-center text-emerald-600">Accuracy (Avg)</th>
                                 <th className="py-2.5 px-2 text-center text-amber-600">Fluency (Avg)</th>
                                 <th className="py-2.5 px-2 text-center text-cyan-600">Interaction (Avg)</th>
                                 <th className="py-2.5 px-2 text-center text-pink-600">Coherence (Avg)</th>
                                 <th className="py-2.5 px-3 text-center bg-indigo-50/50 font-black text-indigo-900">Marks (Avg)</th>
                                 <th className="py-2.5 px-3 text-center bg-indigo-50 font-black text-indigo-950">Percent (Avg)</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {computedMetrics.classStackedBarData.length === 0 ? (
                                 <tr>
                                    <td colSpan={9} className="text-center py-8 text-xs font-black text-slate-400">No class records match.</td>
                                 </tr>
                              ) : computedMetrics.classStackedBarData.map(c => (
                                 <tr key={c.name} className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-black text-slate-800">{c.name}</td>
                                    <td className="py-2 px-4 text-center font-bold text-indigo-600">{c.assessed} / {c.total} <span className="text-[10px] text-slate-400">({c.absent} Absent)</span></td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-indigo-600">{c.rangePct}%</td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-emerald-600">{c.accuracyPct}%</td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-amber-600">{c.fluencyPct}%</td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-cyan-600">{c.interactionPct}%</td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-pink-600">{c.coherencePct}%</td>
                                    <td className="py-2 px-3 text-center bg-indigo-50/20 font-black text-slate-800 font-mono">{c.Obtained}</td>
                                    <td className="py-2 px-3 text-center bg-indigo-50/50 font-black text-indigo-700 font-mono">{c.Percent}%</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </div>

               {/* 3c. School Wise Pratyek school la 5 sections madhe analysis table */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <Table className="w-5 h-5 text-amber-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">School Wise Points Score Allocation (Averages)</h4>
                           <p className="text-[11px] text-slate-400 font-bold">Comprehensive criteria analysis grouped across active schools</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowSchoolTable(!showSchoolTable)}
                       className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 cursor-pointer"
                     >
                        {showSchoolTable ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showSchoolTable ? 'Hide' : 'Show'}
                     </button>
                  </div>

                  {showSchoolTable && (
                     <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                           <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                              <tr>
                                 <th className="py-2.5 px-4">School Name</th>
                                 <th className="py-2.5 px-4 text-center">Assessed Sample</th>
                                 <th className="py-2.5 px-2 text-center text-indigo-600">Range (Avg)</th>
                                 <th className="py-2.5 px-2 text-center text-emerald-600">Accuracy (Avg)</th>
                                 <th className="py-2.5 px-2 text-center text-amber-600">Fluency (Avg)</th>
                                 <th className="py-2.5 px-2 text-center text-cyan-600">Interaction (Avg)</th>
                                 <th className="py-2.5 px-2 text-center text-pink-600">Coherence (Avg)</th>
                                 <th className="py-2.5 px-3 text-center bg-indigo-50/50 font-black text-indigo-900">Marks (Avg)</th>
                                 <th className="py-2.5 px-3 text-center bg-indigo-50 font-black text-indigo-950">Percent (Avg)</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {computedMetrics.schoolStackedBarData.length === 0 ? (
                                 <tr>
                                    <td colSpan={9} className="text-center py-8 text-xs font-black text-slate-400">No school records match.</td>
                                 </tr>
                              ) : computedMetrics.schoolStackedBarData.map(s => (
                                 <tr key={s.name} className="hover:bg-slate-50/40">
                                    <td className="py-2 px-4 font-black text-slate-800">{s.name}</td>
                                    <td className="py-2 px-4 text-center font-bold text-indigo-600">{s.assessed} / {s.total} <span className="text-[10px] text-slate-400">({s.absent} Absent)</span></td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-indigo-600">{s.rangePct}%</td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-emerald-600">{s.accuracyPct}%</td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-amber-600">{s.fluencyPct}%</td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-cyan-600">{s.interactionPct}%</td>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-pink-600">{s.coherencePct}%</td>
                                    <td className="py-2 px-3 text-center bg-indigo-50/20 font-black text-slate-800 font-mono">{s.Obtained}</td>
                                    <td className="py-2 px-3 text-center bg-indigo-50/50 font-black text-indigo-700 font-mono">{s.Percent}%</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </div>

            </div>
          )}

          {/* BASELINE/ENDLINE PROGRESS COMPARISON */}
          {activeSubTab === 'comparison' && comparisonMetrics && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase">Baseline Average Percent</p>
                     <p className="text-3xl font-black text-indigo-600 mt-1 font-mono">{((comparisonMetrics.overallBaseAvg / 15) * 100).toFixed(1)}%</p>
                     <p className="text-[10px] text-slate-400 font-bold mt-1">({comparisonMetrics.overallBaseAvg} / 15 Marks)</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase">Endline Average Percent</p>
                     <p className="text-3xl font-black text-emerald-600 mt-1 font-mono">{((comparisonMetrics.overallEndAvg / 15) * 100).toFixed(1)}%</p>
                     <p className="text-[10px] text-slate-400 font-bold mt-1">({comparisonMetrics.overallEndAvg} / 15 Marks)</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase">Overall Growth Percent</p>
                     <p className="text-3xl font-black text-amber-600 mt-1 font-mono">
                        {comparisonMetrics.overallAvgDiff > 0 ? `+${((comparisonMetrics.overallAvgDiff / 15) * 100).toFixed(1)}%` : `${((comparisonMetrics.overallAvgDiff / 15) * 100).toFixed(1)}%`}
                     </p>
                     <p className="text-[10px] text-slate-400 font-bold mt-1">({comparisonMetrics.overallAvgDiff > 0 ? `+${comparisonMetrics.overallAvgDiff.toFixed(2)}` : comparisonMetrics.overallAvgDiff.toFixed(2)} Marks)</p>
                  </div>
               </div>

               {/* Pie Charts */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Baseline Match Pie Chart */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <PieIcon className="w-5 h-5 text-indigo-600" />
                           <div>
                              <h4 className="text-sm font-black text-slate-800">Baseline Assessment Metrics</h4>
                              <p className="text-[11px] text-slate-400 font-bold">Performance distribution by criteria</p>
                           </div>
                        </div>
                     </div>
                     <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={comparisonMetrics.pieDataMatchedBase}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={70}
                                 outerRadius={100}
                                 paddingAngle={2}
                                 dataKey="value"
                                 strokeWidth={0}
                              >
                                 {comparisonMetrics.pieDataMatchedBase.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CRITERIA_COLORS[index % CRITERIA_COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip formatter={(value: number, name: string, props: any) => [`${props.payload.avg}%`, 'Average Percent']} />
                              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Endline Match Pie Chart */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <PieIcon className="w-5 h-5 text-emerald-600" />
                           <div>
                              <h4 className="text-sm font-black text-slate-800">Endline Assessment Metrics</h4>
                              <p className="text-[11px] text-slate-400 font-bold">Performance distribution by criteria</p>
                           </div>
                        </div>
                     </div>
                     <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={comparisonMetrics.pieDataMatchedEnd}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={70}
                                 outerRadius={100}
                                 paddingAngle={2}
                                 dataKey="value"
                                 strokeWidth={0}
                              >
                                 {comparisonMetrics.pieDataMatchedEnd.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CRITERIA_COLORS[index % CRITERIA_COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip formatter={(value: number, name: string, props: any) => [`${props.payload.avg}%`, 'Average Percent']} />
                              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>

               {/* Comparison Criteria Chart */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                     <BarChart2 className="w-5 h-5 text-indigo-600" />
                     <div>
                        <h4 className="text-sm font-black text-slate-800">Baseline vs Endline Criteria Comparison</h4>
                        <p className="text-[11px] text-slate-400 font-bold">Average percent per criteria</p>
                     </div>
                  </div>
                  <div className="w-full pt-4">
                     <ZoomableGraphContainer defaultMinWidth={600}>
                        <div className="h-[300px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={comparisonMetrics.criteriaData}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                 <XAxis dataKey="name" fontSize={11} fontWeight={600} tickLine={false} />
                                 <YAxis fontSize={11} fontWeight={600} domain={[0, 100]} tickFormatter={(val) => `${val}%`} tickLine={false} />
                                 <Tooltip formatter={(value) => [`${value}%`, 'Average Percent']} />
                                 <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600, marginTop: '10px' }} />
                                 <Bar dataKey="Baseline" fill="#818cf8" radius={[4, 4, 0, 0]} />
                                 <Bar dataKey="Endline" fill="#10b981" radius={[4, 4, 0, 0]} />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </ZoomableGraphContainer>
                  </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Class Comparison Chart */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                     <div className="flex items-center gap-2 mb-6">
                        <BarChart2 className="w-5 h-5 text-indigo-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">Class-wise Analysis (Base vs End)</h4>
                           <p className="text-[11px] text-slate-400 font-bold">Total percent averages by Class</p>
                        </div>
                     </div>
                     <div className="w-full pt-4">
                        <ZoomableGraphContainer defaultMinWidth={600}>
                           <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={comparisonMetrics.classComparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" fontSize={10} fontWeight={600} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis fontSize={11} fontWeight={600} domain={[0, 100]} tickFormatter={(val) => `${val}%`} tickLine={false} />
                                    <Tooltip formatter={(value) => [`${value}%`, 'Average Percent']} />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                                    <Bar dataKey="Baseline" fill="#818cf8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Endline" fill="#34d399" radius={[4, 4, 0, 0]} />
                                 </BarChart>
                              </ResponsiveContainer>
                           </div>
                        </ZoomableGraphContainer>
                     </div>
                  </div>

                  {/* School Comparison Chart */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                     <div className="flex items-center gap-2 mb-6">
                        <BarChart2 className="w-5 h-5 text-amber-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">School-wise Analysis (Base vs End)</h4>
                           <p className="text-[11px] text-slate-400 font-bold">Total percent averages by School</p>
                        </div>
                     </div>
                     <div className="w-full pt-4">
                        <ZoomableGraphContainer defaultMinWidth={600}>
                           <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={comparisonMetrics.schoolComparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" fontSize={10} fontWeight={600} tickLine={false} interval="preserveStartEnd" angle={-45} textAnchor="end" height={60} />
                                    <YAxis fontSize={11} fontWeight={600} domain={[0, 100]} tickFormatter={(val) => `${val}%`} tickLine={false} />
                                    <Tooltip formatter={(value) => [`${value}%`, 'Average Percent']} />
                                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '20px' }} />
                                    <Bar dataKey="Baseline" fill="#818cf8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Endline" fill="#34d399" radius={[4, 4, 0, 0]} />
                                 </BarChart>
                              </ResponsiveContainer>
                           </div>
                        </ZoomableGraphContainer>
                     </div>
                  </div>
               </div>

               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        <div>
                           <h4 className="text-sm font-black text-slate-800">Student Baseline vs Endline Individual Progression Comparison</h4>
                           <p className="text-[11px] text-slate-200 font-bold">Highlighting student specific points growth analysis</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowStudentsTable(!showStudentsTable)}
                       className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 cursor-pointer"
                     >
                        {showStudentsTable ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showStudentsTable ? 'Hide' : 'Show'}
                     </button>
                  </div>

                  {showStudentsTable && (
                     <div className="max-h-[380px] overflow-y-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                           <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-100">
                              <tr>
                                 <th className="py-2.5 px-4">Sr No.</th>
                                 <th className="py-2.5 px-4">Student Name</th>
                                 <th className="py-2.5 px-4">School</th>
                                 <th className="py-2.5 px-2 text-center">Class</th>
                                 <th className="py-2.5 px-2 text-center border-l border-slate-200 text-[10px] text-indigo-600">Range</th>
                                 <th className="py-2.5 px-2 text-center text-[10px] text-emerald-600">Acc.</th>
                                 <th className="py-2.5 px-2 text-center text-[10px] text-amber-600">Flu.</th>
                                 <th className="py-2.5 px-2 text-center text-[10px] text-cyan-600">Int.</th>
                                 <th className="py-2.5 px-2 text-center border-r border-slate-200 text-[10px] text-pink-600">Coh.</th>
                                 <th className="py-2.5 px-4 text-center bg-indigo-50 font-black text-indigo-900 border-l border-slate-100">Base Avg %</th>
                                 <th className="py-2.5 px-4 text-center bg-emerald-50 font-black text-emerald-900 border-r border-slate-100">End Avg %</th>
                                 <th className="py-2.5 px-4 text-center bg-amber-50 font-black text-amber-950">Growth (Marks)</th>
                                 <th className="py-2.5 px-4 text-center font-black">Relative % Growth</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {comparisonMetrics.growthList.length === 0 ? (
                                 <tr>
                                    <td colSpan={13} className="text-center py-8 text-xs font-black text-slate-400">There are no matching students assessed in both Baseline and Endline.</td>
                                 </tr>
                              ) : comparisonMetrics.growthList.map((g, idx) => (
                                 <tr key={g.student.id} className="hover:bg-slate-50/40">
                                    <td className="py-2.5 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                                    <td className="py-2.5 px-4 font-bold text-slate-800">{g.student.studentName}</td>
                                    <td className="py-2.5 px-4 text-[10px] sm:text-xs">{g.student.schoolName}</td>
                                    <td className="py-2.5 px-2 text-center whitespace-nowrap">{g.student.classGrade}-{g.student.division}</td>
                                    
                                    <td className="py-2 px-2 text-center font-mono text-[11px] font-bold border-l border-slate-100">
                                       <span className="text-slate-400">{g.baseScores.q1}</span> <span className="text-slate-300 mx-0.5">→</span> <span className={g.endScores.q1 > g.baseScores.q1 ? "text-emerald-500" : g.endScores.q1 < g.baseScores.q1 ? "text-rose-500" : "text-slate-600"}>{g.endScores.q1}</span>
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono text-[11px] font-bold">
                                       <span className="text-slate-400">{g.baseScores.q2}</span> <span className="text-slate-300 mx-0.5">→</span> <span className={g.endScores.q2 > g.baseScores.q2 ? "text-emerald-500" : g.endScores.q2 < g.baseScores.q2 ? "text-rose-500" : "text-slate-600"}>{g.endScores.q2}</span>
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono text-[11px] font-bold">
                                       <span className="text-slate-400">{g.baseScores.q3}</span> <span className="text-slate-300 mx-0.5">→</span> <span className={g.endScores.q3 > g.baseScores.q3 ? "text-emerald-500" : g.endScores.q3 < g.baseScores.q3 ? "text-rose-500" : "text-slate-600"}>{g.endScores.q3}</span>
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono text-[11px] font-bold">
                                       <span className="text-slate-400">{g.baseScores.q4}</span> <span className="text-slate-300 mx-0.5">→</span> <span className={g.endScores.q4 > g.baseScores.q4 ? "text-emerald-500" : g.endScores.q4 < g.baseScores.q4 ? "text-rose-500" : "text-slate-600"}>{g.endScores.q4}</span>
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono text-[11px] font-bold border-r border-slate-100">
                                       <span className="text-slate-400">{g.baseScores.q5}</span> <span className="text-slate-300 mx-0.5">→</span> <span className={g.endScores.q5 > g.baseScores.q5 ? "text-emerald-500" : g.endScores.q5 < g.baseScores.q5 ? "text-rose-500" : "text-slate-600"}>{g.endScores.q5}</span>
                                    </td>

                                    <td className="py-2.5 px-4 text-center font-mono font-bold text-indigo-600 bg-indigo-50/20">{((g.base / 15) * 100).toFixed(1)}% <span className="text-[9px] text-slate-400 font-sans block">({g.base}/15)</span></td>
                                    <td className="py-2.5 px-4 text-center font-mono font-bold border-r border-slate-100 text-emerald-600 bg-emerald-50/20">{((g.end / 15) * 100).toFixed(1)}% <span className="text-[9px] text-slate-400 font-sans block">({g.end}/15)</span></td>

                                    <td className={`py-2.5 px-4 text-center font-mono font-black ${g.diff > 0 ? 'text-emerald-600 bg-emerald-50/10' : g.diff < 0 ? 'text-rose-600 bg-rose-50/10' : 'text-slate-500'}`}>
                                       {g.diff > 0 ? `+${g.diff}` : g.diff} Marks
                                    </td>
                                    <td className={`py-2.5 px-4 text-center font-mono font-black ${g.diff > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                                       {g.diff > 0 ? `+${g.percentGrowth}%` : `${g.percentGrowth}%`}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </div>
               {/* ---------------- UNMATCHED LISTS ---------------- */}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Unmatched Baseline List */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <h4 className="text-sm font-black text-slate-800">Unmatched Baseline Students</h4>
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">{comparisonMetrics.unmatchedBaseCount} Students</span>
                     </div>
                     <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-600">
                           <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-100">
                              <tr>
                                 <th className="py-2 px-2">Student Name</th>
                                 <th className="py-2 px-2 text-center text-indigo-600">Range</th>
                                 <th className="py-2 px-2 text-center text-emerald-600">Acc.</th>
                                 <th className="py-2 px-2 text-center text-amber-600">Flu.</th>
                                 <th className="py-2 px-2 text-center text-cyan-600">Int.</th>
                                 <th className="py-2 px-2 text-center text-pink-600">Coh.</th>
                                 <th className="py-2 px-2 text-center bg-indigo-50 border-l border-slate-100">Avg %</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {comparisonMetrics.unmatchedBaseStudents.length === 0 ? (
                                 <tr><td colSpan={7} className="text-center py-4 text-slate-400">No unmatched students</td></tr>
                              ) : comparisonMetrics.unmatchedBaseStudents.map((s, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50/40">
                                    <td className="py-2 px-2 font-bold text-slate-800 truncate max-w-[120px]">{s.student.studentName}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q1}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q2}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q3}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q4}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q5}</td>
                                    <td className="py-2 px-2 text-center font-mono font-black border-l border-slate-100 text-indigo-700 bg-indigo-50/40">{(((s.obtained) / 15) * 100).toFixed(1)}% <span className="text-[9px] text-slate-400">({s.obtained}/15)</span></td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  {/* Unmatched Endline List */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <h4 className="text-sm font-black text-slate-800">Unmatched Endline Students</h4>
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">{comparisonMetrics.unmatchedEndCount} Students</span>
                     </div>
                     <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-600">
                           <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-100">
                              <tr>
                                 <th className="py-2 px-2">Student Name</th>
                                 <th className="py-2 px-2 text-center text-indigo-600">Range</th>
                                 <th className="py-2 px-2 text-center text-emerald-600">Acc.</th>
                                 <th className="py-2 px-2 text-center text-amber-600">Flu.</th>
                                 <th className="py-2 px-2 text-center text-cyan-600">Int.</th>
                                 <th className="py-2 px-2 text-center text-pink-600">Coh.</th>
                                 <th className="py-2 px-2 text-center bg-emerald-50 border-l border-slate-100">Avg %</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {comparisonMetrics.unmatchedEndStudents.length === 0 ? (
                                 <tr><td colSpan={7} className="text-center py-4 text-slate-400">No unmatched students</td></tr>
                              ) : comparisonMetrics.unmatchedEndStudents.map((s, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50/40">
                                    <td className="py-2 px-2 font-bold text-slate-800 truncate max-w-[120px]">{s.student.studentName}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q1}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q2}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q3}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q4}</td>
                                    <td className="py-2 px-2 text-center font-mono">{s.scores.q5}</td>
                                    <td className="py-2 px-2 text-center font-mono font-black border-l border-slate-100 text-emerald-700 bg-emerald-50/40">{(((s.obtained) / 15) * 100).toFixed(1)}% <span className="text-[9px] text-slate-400">({s.obtained}/15)</span></td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>

               {/* Unmatched Comparison Summary Table */}
               <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                     <h4 className="text-sm font-black text-slate-800">Unmatched Students Base vs End Summary</h4>
                     <p className="text-[11px] text-slate-400 font-bold hidden sm:block">Comparing relative percentage performance patterns within unmatched groups</p>
                  </div>
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                     <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                           <tr>
                              <th className="py-3 px-4">Group</th>
                              <th className="py-3 px-2 text-center text-indigo-600">Range (Avg %)</th>
                              <th className="py-3 px-2 text-center text-emerald-600">Accuracy (Avg %)</th>
                              <th className="py-3 px-2 text-center text-amber-600">Fluency (Avg %)</th>
                              <th className="py-3 px-2 text-center text-cyan-600">Interaction (Avg %)</th>
                              <th className="py-3 px-2 text-center text-pink-600">Coherence (Avg %)</th>
                              <th className="py-3 px-4 text-center bg-slate-100 text-slate-900 border-l border-slate-200">Final Average</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           <tr className="hover:bg-slate-50/40">
                              <td className="py-2.5 px-4 font-black flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Unmatched Baseline
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-indigo-600">{comparisonMetrics.unmatchedBaseStats.q1}%</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-600">{comparisonMetrics.unmatchedBaseStats.q2}%</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-600">{comparisonMetrics.unmatchedBaseStats.q3}%</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-cyan-600">{comparisonMetrics.unmatchedBaseStats.q4}%</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-pink-600">{comparisonMetrics.unmatchedBaseStats.q5}%</td>
                              <td className="py-2.5 px-4 text-center font-mono font-black border-l border-slate-100 text-indigo-700 bg-indigo-50/30">
                                 {comparisonMetrics.unmatchedBaseStats.total}%
                              </td>
                           </tr>
                           <tr className="hover:bg-slate-50/40">
                              <td className="py-2.5 px-4 font-black flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Unmatched Endline
                              </td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-indigo-600">{comparisonMetrics.unmatchedEndStats.q1}%</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-600">{comparisonMetrics.unmatchedEndStats.q2}%</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-600">{comparisonMetrics.unmatchedEndStats.q3}%</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-cyan-600">{comparisonMetrics.unmatchedEndStats.q4}%</td>
                              <td className="py-2.5 px-2 text-center font-mono font-bold text-pink-600">{comparisonMetrics.unmatchedEndStats.q5}%</td>
                              <td className="py-2.5 px-4 text-center font-mono font-black border-l border-slate-100 text-emerald-700 bg-emerald-50/30">
                                 {comparisonMetrics.unmatchedEndStats.total}%
                              </td>
                           </tr>
                           <tr className="hover:bg-slate-50/40 bg-slate-50/50">
                              <td className="py-3 px-4 font-black text-slate-800 text-[11px] uppercase tracking-wider">Unmatched Group Difference</td>
                              <td className={`py-3 px-2 text-center font-mono font-black border-t border-slate-200 ${(comparisonMetrics.unmatchedEndStats.q1 - comparisonMetrics.unmatchedBaseStats.q1) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {comparisonMetrics.unmatchedEndStats.q1 - comparisonMetrics.unmatchedBaseStats.q1 > 0 ? '+' : ''}{(comparisonMetrics.unmatchedEndStats.q1 - comparisonMetrics.unmatchedBaseStats.q1).toFixed(1)}%
                              </td>
                              <td className={`py-3 px-2 text-center font-mono font-black border-t border-slate-200 ${(comparisonMetrics.unmatchedEndStats.q2 - comparisonMetrics.unmatchedBaseStats.q2) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {comparisonMetrics.unmatchedEndStats.q2 - comparisonMetrics.unmatchedBaseStats.q2 > 0 ? '+' : ''}{(comparisonMetrics.unmatchedEndStats.q2 - comparisonMetrics.unmatchedBaseStats.q2).toFixed(1)}%
                              </td>
                              <td className={`py-3 px-2 text-center font-mono font-black border-t border-slate-200 ${(comparisonMetrics.unmatchedEndStats.q3 - comparisonMetrics.unmatchedBaseStats.q3) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {comparisonMetrics.unmatchedEndStats.q3 - comparisonMetrics.unmatchedBaseStats.q3 > 0 ? '+' : ''}{(comparisonMetrics.unmatchedEndStats.q3 - comparisonMetrics.unmatchedBaseStats.q3).toFixed(1)}%
                              </td>
                              <td className={`py-3 px-2 text-center font-mono font-black border-t border-slate-200 ${(comparisonMetrics.unmatchedEndStats.q4 - comparisonMetrics.unmatchedBaseStats.q4) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {comparisonMetrics.unmatchedEndStats.q4 - comparisonMetrics.unmatchedBaseStats.q4 > 0 ? '+' : ''}{(comparisonMetrics.unmatchedEndStats.q4 - comparisonMetrics.unmatchedBaseStats.q4).toFixed(1)}%
                              </td>
                              <td className={`py-3 px-2 text-center font-mono font-black border-t border-slate-200 ${(comparisonMetrics.unmatchedEndStats.q5 - comparisonMetrics.unmatchedBaseStats.q5) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {comparisonMetrics.unmatchedEndStats.q5 - comparisonMetrics.unmatchedBaseStats.q5 > 0 ? '+' : ''}{(comparisonMetrics.unmatchedEndStats.q5 - comparisonMetrics.unmatchedBaseStats.q5).toFixed(1)}%
                              </td>
                              <td className={`py-3 px-4 text-center border-l border-t border-slate-200 font-mono font-black text-sm ${(comparisonMetrics.unmatchedEndStats.total - comparisonMetrics.unmatchedBaseStats.total) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {comparisonMetrics.unmatchedEndStats.total - comparisonMetrics.unmatchedBaseStats.total > 0 ? '+' : ''}{(comparisonMetrics.unmatchedEndStats.total - comparisonMetrics.unmatchedBaseStats.total).toFixed(1)}%
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
