import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileCheck, PlusCircle, Calendar, Edit2, Trash2, ArrowLeft, Eye, Target, X, ChevronRight, User, Check, ChevronLeft
} from 'lucide-react';
import { Teacher, Student } from '../types';

interface ArpAssessmentSectionProps {
  currentUser: Teacher | null;
  attendanceStudents: any[];
  arpRecords?: any[];
}

interface CustomAssessmentSubsection {
  id: string;
  assessmentNo: number;
  date: string;
  classGrade: string;
  level: string;
  name: string;
  totalMarks: number;
  studentIds: string[];
}

interface StudentAssessmentMark {
  studentId: string;
  assessmentNo: number;
  marksObtained: number | null;
  date: string;
  attendance: 'Present' | 'Absent';
}

const classOptions = ['5', '6', '7', '8'];

const levelsMap: Record<string, string[]> = {
  '5': ['FLN BC', 'PSG ACQUIRE', 'PSG ENHANCE'],
  '6': ['FLN BC', 'PSG BC', 'MSG ACQUIRE'],
  '7': ['FLN BC', 'PSG BC', 'MSG ACQUIRE', 'MSG ENHANCE'],
  '8': ['FLN BC', 'PSG BC']
};

export default function ArpAssessmentSection({ currentUser, attendanceStudents, arpRecords = [] }: ArpAssessmentSectionProps) {
  const [subsections, setSubsections] = useState<CustomAssessmentSubsection[]>(() => {
    const saved = localStorage.getItem('arp-custom-assessments-v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [studentMarks, setStudentMarks] = useState<StudentAssessmentMark[]>(() => {
    const saved = localStorage.getItem('arp-custom-assessment-marks-v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('arp-custom-assessments-v2', JSON.stringify(subsections));
  }, [subsections]);

  useEffect(() => {
    localStorage.setItem('arp-custom-assessment-marks-v2', JSON.stringify(studentMarks));
  }, [studentMarks]);

  const [mode, setMode] = useState<'list' | 'create' | 'view' | 'view_report'>('list');
  const [activeAssessmentNo, setActiveAssessmentNo] = useState<number | null>(null);
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  const assessmentsGrouped = useMemo(() => {
    const groups: Record<number, CustomAssessmentSubsection[]> = {};
    subsections.forEach(sub => {
      if (!groups[sub.assessmentNo]) groups[sub.assessmentNo] = [];
      groups[sub.assessmentNo].push(sub);
    });
    return groups;
  }, [subsections]);

  const availableAssessmentNos = useMemo(() => {
    const usedNos = new Set(Object.keys(assessmentsGrouped).map(Number));
    const allNos = Array.from({ length: 10 }, (_, i) => i + 1);
    return allNos.filter(n => !usedNos.has(n));
  }, [assessmentsGrouped]);

  // Create/Edit Form State
  const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);
  const [createAsmNo, setCreateAsmNo] = useState<number | ''>('');
  const [createClasses, setCreateClasses] = useState<string[]>([]);
  const [createSelectedLevels, setCreateSelectedLevels] = useState<Record<string, string[]>>({});
  const [createLevelConfigs, setCreateLevelConfigs] = useState<Record<string, {name: string, totalMarks: string}>>({});

  // Reset form when opening 'create'
  useEffect(() => {
    if (mode === 'create' && activeAssessmentNo === null) {
      setCreateDate(new Date().toISOString().split('T')[0]);
      setCreateAsmNo('');
      setCreateClasses([]);
      setCreateSelectedLevels({});
      setCreateLevelConfigs({});
    }
  }, [mode, activeAssessmentNo]);

  const handleClassToggle = (cls: string) => {
    if (createClasses.includes(cls)) {
      setCreateClasses(prev => prev.filter(c => c !== cls));
      const newLevels = { ...createSelectedLevels };
      delete newLevels[cls];
      setCreateSelectedLevels(newLevels);
    } else {
      setCreateClasses(prev => [...prev, cls]);
    }
  };

  const handleLevelToggle = (cls: string, lvl: string) => {
    const current = createSelectedLevels[cls] || [];
    if (current.includes(lvl)) {
      setCreateSelectedLevels(prev => ({
        ...prev,
        [cls]: current.filter(l => l !== lvl)
      }));
    } else {
      setCreateSelectedLevels(prev => ({
        ...prev,
        [cls]: [...current, lvl]
      }));
      const key = `${cls}_${lvl}`;
      if (!createLevelConfigs[key]) {
        setCreateLevelConfigs(prev => ({
          ...prev,
          [key]: { name: '', totalMarks: '' }
        }));
      }
    }
  };

  const handleConfigChange = (cls: string, lvl: string, field: 'name' | 'totalMarks', value: string) => {
    const key = `${cls}_${lvl}`;
    setCreateLevelConfigs(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { name: '', totalMarks: '' }),
        [field]: value
      }
    }));
  };

  const handleCreateSave = () => {
    if (createAsmNo === '') {
      alert('Please select an Assessment No.');
      return;
    }

    let hasSelections = false;
    const newSubsections: CustomAssessmentSubsection[] = [];
    
    for (const cls of createClasses) {
      const levels = createSelectedLevels[cls] || [];
      for (const lvl of levels) {
        hasSelections = true;
        const config = createLevelConfigs[`${cls}_${lvl}`];
        const name = config?.name || '';
        const totalMarks = config?.totalMarks ? Number(config.totalMarks) : 0;
        
        const existingSub = subsections.find(s => s.assessmentNo === createAsmNo && s.classGrade === cls && s.level === lvl);
        
        newSubsections.push({
          id: existingSub ? existingSub.id : `asm_${createAsmNo}_${cls}_${lvl.replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
          assessmentNo: Number(createAsmNo),
          date: createDate,
          classGrade: cls,
          level: lvl,
          name: name,
          totalMarks: totalMarks,
          studentIds: existingSub ? existingSub.studentIds : []
        });
      }
    }

    if (!hasSelections) {
      alert("Please select at least one class and level configuration.");
      return;
    }

    setSubsections(prev => [...prev.filter(s => s.assessmentNo !== createAsmNo), ...newSubsections]);
    setMode('list');
    setActiveAssessmentNo(null);
  };

  const handleDeleteAssessment = (asmNo: number) => {
    if (window.confirm(`Are you sure you want to delete Assessment No. ${asmNo}?`)) {
      setSubsections(prev => prev.filter(s => s.assessmentNo !== asmNo));
      if (activeAssessmentNo === asmNo) {
        setMode('list');
        setActiveAssessmentNo(null);
      }
    }
  };

  const openView = (asmNo: number) => {
    setLoadAsmNo(asmNo);
    const subs = assessmentsGrouped[asmNo] || [];
    const classes = Array.from(new Set(subs.map(s => s.classGrade)));
    const levels = Array.from(new Set(subs.map(s => s.level)));
    setLoadClasses(classes);
    setLoadLevels(levels);
    
    if (!loadExamType) {
      setLoadExamType('boardable_baseline');
    }
    if (!loadSchool && uniqueSchools.length > 0) {
      setLoadSchool(uniqueSchools[0]);
    }
    setLoadDivisions(['A', 'B', 'C', 'D', 'E', 'F']);
    setMode('view_report');
  };

  const openEdit = (asmNo: number) => {
    setActiveAssessmentNo(asmNo);
    const subs = assessmentsGrouped[asmNo] || [];
    if (subs.length === 0) return;
    
    setCreateDate(subs[0].date);
    setCreateAsmNo(asmNo);
    
    const classes = Array.from(new Set(subs.map(s => s.classGrade)));
    setCreateClasses(classes);
    
    const levels: Record<string, string[]> = {};
    const configs: Record<string, {name: string, totalMarks: string}> = {};
    
    subs.forEach(s => {
      if (!levels[s.classGrade]) levels[s.classGrade] = [];
      levels[s.classGrade].push(s.level);
      configs[`${s.classGrade}_${s.level}`] = { name: s.name, totalMarks: s.totalMarks ? s.totalMarks.toString() : '' };
    });
    
    setCreateSelectedLevels(levels);
    setCreateLevelConfigs(configs);
    setMode('create');
  };

  // -------------------------------------------------------------
  // STUDENTS LIST LOAD & MARKS ENTRY
  // -------------------------------------------------------------
  const [loadAsmNo, setLoadAsmNo] = useState<number | ''>(() => {
    const saved = localStorage.getItem('arp_load_asm_no');
    return saved ? (saved === '' ? '' : Number(saved)) : '';
  });
  const [loadExamType, setLoadExamType] = useState<string>(() => {
    return localStorage.getItem('arp_load_exam_type') || '';
  });
  const [loadSchool, setLoadSchool] = useState<string>(() => {
    return localStorage.getItem('arp_load_school') || '';
  });
  const [loadClasses, setLoadClasses] = useState<string[]>(() => {
    const saved = localStorage.getItem('arp_load_classes');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadDivisions, setLoadDivisions] = useState<string[]>(() => {
    const saved = localStorage.getItem('arp_load_divisions');
    return saved ? JSON.parse(saved) : ['A', 'B', 'C', 'D', 'E', 'F'];
  });
  const [loadLevels, setLoadLevels] = useState<string[]>(() => {
    const saved = localStorage.getItem('arp_load_levels');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('arp_load_asm_no', loadAsmNo === '' ? '' : String(loadAsmNo));
  }, [loadAsmNo]);

  useEffect(() => {
    localStorage.setItem('arp_load_exam_type', loadExamType);
  }, [loadExamType]);

  useEffect(() => {
    localStorage.setItem('arp_load_school', loadSchool);
  }, [loadSchool]);

  useEffect(() => {
    localStorage.setItem('arp_load_classes', JSON.stringify(loadClasses));
  }, [loadClasses]);

  useEffect(() => {
    localStorage.setItem('arp_load_divisions', JSON.stringify(loadDivisions));
  }, [loadDivisions]);

  useEffect(() => {
    localStorage.setItem('arp_load_levels', JSON.stringify(loadLevels));
  }, [loadLevels]);

  const allowedClassesForAsm = useMemo(() => {
    if (loadAsmNo === '') return [];
    const subs = assessmentsGrouped[Number(loadAsmNo)] || [];
    return Array.from(new Set(subs.map(s => s.classGrade))).sort();
  }, [loadAsmNo, assessmentsGrouped]);

  const allowedLevelsForAsmAndClasses = useMemo(() => {
    if (loadAsmNo === '' || loadClasses.length === 0) return [];
    const subs = assessmentsGrouped[Number(loadAsmNo)] || [];
    const matchingSubs = subs.filter(s => loadClasses.includes(s.classGrade));
    return Array.from(new Set(matchingSubs.map(s => s.level))).sort();
  }, [loadAsmNo, loadClasses, assessmentsGrouped]);

  useEffect(() => {
    if (loadAsmNo !== '') {
      const subs = assessmentsGrouped[Number(loadAsmNo)] || [];
      const allowed = Array.from(new Set(subs.map(s => s.classGrade)));
      setLoadClasses(prev => {
        if (prev.length > 0) {
          const stillValid = prev.filter(c => allowed.includes(c));
          if (stillValid.length > 0) return stillValid;
        }
        return allowed;
      });
    }
  }, [loadAsmNo, assessmentsGrouped]);

  useEffect(() => {
    if (loadAsmNo !== '' && loadClasses.length > 0) {
      const subs = assessmentsGrouped[Number(loadAsmNo)] || [];
      const matchingSubs = subs.filter(s => loadClasses.includes(s.classGrade));
      const allowedLevels = Array.from(new Set(matchingSubs.map(s => s.level))) as string[];
      setLoadLevels(prev => {
        if (prev.length > 0) {
          const stillValid = prev.filter(lvl => allowedLevels.some(allowed => (allowed as string).toLowerCase() === lvl.toLowerCase()));
          if (stillValid.length > 0) return stillValid;
        }
        return allowedLevels;
      });
    }
  }, [loadClasses, loadAsmNo, assessmentsGrouped]);

  const uniqueSchools = useMemo(() => Array.from(new Set(attendanceStudents.map(s => s.schoolName || s.school))).filter(Boolean).sort(), [attendanceStudents]);
  const uniqueDivisions = useMemo(() => Array.from(new Set(attendanceStudents.map(s => s.division || s.div))).filter(Boolean).sort(), [attendanceStudents]);

  const handleLoadClassToggle = (cls: string) => {
    if (loadClasses.includes(cls)) {
      setLoadClasses(prev => prev.filter(c => c !== cls));
    } else {
      setLoadClasses(prev => [...prev, cls]);
    }
  };

  const handleLoadDivToggle = (div: string) => {
    if (loadDivisions.includes(div)) {
      setLoadDivisions(prev => prev.filter(d => d !== div));
    } else {
      setLoadDivisions(prev => [...prev, div]);
    }
  };

  const handleLoadLevelToggle = (lvl: string) => {
    if (loadLevels.includes(lvl)) {
      setLoadLevels(prev => prev.filter(l => l !== lvl));
    } else {
      setLoadLevels(prev => [...prev, lvl]);
    }
  };

  const getStudentLevelForType = (student: any, recordsList: any[], type: string) => {
    const record = recordsList.find(r => r.studentId === student.id && r.type === type);
    if (!record || record.attendance === 'Absent' || record.section1 === undefined || record.section1 === null || record.section1 === '') {
      return "Not Assessed";
    }
    
    const classGrade = student.std || (student as any).classGrade || '';
    const classNum = parseInt(classGrade);
    if (isNaN(classNum)) return "Not Assessed";

    const sec1 = Number(record.section1);
    
    if (classNum === 4) {
      if (sec1 < 6) return "FLN BC";
      if (sec1 > 5) return "PSG Acquire";
    } 
    else if (classNum === 5) {
      if (sec1 < 5) return "FLN BC";
      if (sec1 >= 5 && sec1 <= 8) return "PSG Acquire";
      if (sec1 >= 9 && sec1 <= 10) return "PSG Enhance";
    }
    else if (classNum === 6) {
      if (sec1 < 3) return "FLN BC";
      if (sec1 >= 3 && sec1 <= 7) return "PSG BC";
      if (sec1 >= 8 && sec1 <= 10) return "MSG Acquire";
    }
    else if (classNum === 7) {
      if (sec1 < 2) return "FLN BC";
      if (sec1 >= 2 && sec1 <= 4) return "PSG BC";
      if (sec1 >= 5 && sec1 <= 8) return "MSG Acquire";
      if (sec1 >= 9 && sec1 <= 10) return "MSG Enhance";
    }
    else if (classNum === 8) {
      if (sec1 < 3) return "FLN BC";
      if (sec1 >= 3 && sec1 <= 10) return "PSG BC";
    }
    return "Not Assessed";
  };

  const filteredStudents = useMemo(() => {
    if (loadAsmNo === '' || loadExamType === '' || loadSchool === '' || loadClasses.length === 0 || loadDivisions.length === 0) {
      return [];
    }

    const list = attendanceStudents.filter(s => {
      const rawClass = s.std || (s as any).classGrade || '';
      const classGrade = String(rawClass).replace(/[^0-9]/g, '');
      return (
        (s.schoolName === loadSchool || s.school === loadSchool) &&
        loadClasses.includes(classGrade) &&
        loadDivisions.includes(s.division || s.div)
      );
    }).map(student => {
      const dynamicLevel = getStudentLevelForType(student, arpRecords, loadExamType);
      
      const rawClass = student.std || student.classGrade || '';
      const classGrade = String(rawClass).replace(/[^0-9]/g, '');
      
      const config = subsections.find(sub => 
        sub.assessmentNo === loadAsmNo && 
        String(sub.classGrade).replace(/[^0-9]/g, '') === classGrade && 
        sub.level.toUpperCase() === dynamicLevel.toUpperCase()
      );

      const markRecord = studentMarks.find(m => m.studentId === student.id && m.assessmentNo === loadAsmNo);

      return {
        ...student,
        computedLevel: dynamicLevel,
        config,
        markRecord
      };
    }).filter(student => {
      if (loadLevels.length === 0) return false;
      return loadLevels.some(lvl => lvl.toLowerCase() === student.computedLevel.toLowerCase());
    });

    const levelOrder: Record<string, number> = {
      'FLN BC': 1,
      'PSG BC': 2,
      'PSG Acquire': 3,
      'PSG Enhance': 4,
      'MSG Acquire': 5,
      'MSG Enhance': 6,
      'Not Assessed': 7
    };

    return [...list].sort((a, b) => {
      const orderA = levelOrder[a.computedLevel] || 99;
      const orderB = levelOrder[b.computedLevel] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const nameA = a.studentName || a.name || '';
      const nameB = b.studentName || b.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [attendanceStudents, loadAsmNo, loadExamType, loadSchool, loadClasses, loadDivisions, subsections, arpRecords, studentMarks, loadLevels]);

  const reportStudentsFiltered = useMemo(() => {
    return filteredStudents.filter(s => {
      if (!reportSearchQuery) return true;
      const name = s.studentName || s.name || '';
      return name.toLowerCase().includes(reportSearchQuery.toLowerCase());
    });
  }, [filteredStudents, reportSearchQuery]);

  const reportSubmittedCount = useMemo(() => {
    return filteredStudents.filter(s => s.markRecord).length;
  }, [filteredStudents]);

  const reportTotalCount = filteredStudents.length;

  const [selectedStudentForMarks, setSelectedStudentForMarks] = useState<any | null>(null);
  
  const [marksForm, setMarksForm] = useState({
    date: new Date().toISOString().split('T')[0],
    attendance: 'Present' as 'Present' | 'Absent',
    marksObtained: '' as string | number
  });

  const openMarksModal = (student: any) => {
    setSelectedStudentForMarks(student);
    if (student.markRecord) {
      setMarksForm({
        date: student.markRecord.date,
        attendance: student.markRecord.attendance,
        marksObtained: student.markRecord.marksObtained !== null ? student.markRecord.marksObtained : ''
      });
    } else {
      setMarksForm({
        date: new Date().toISOString().split('T')[0],
        attendance: 'Present',
        marksObtained: ''
      });
    }
  };

  const handleMarksSubmit = () => {
    if (!selectedStudentForMarks) return;
    
    if (marksForm.attendance === 'Present' && marksForm.marksObtained === '') {
      alert("Please enter marks obtained for present student.");
      return;
    }

    if (marksForm.attendance === 'Present' && selectedStudentForMarks.config) {
      const maxMarks = selectedStudentForMarks.config.totalMarks;
      const obtained = Number(marksForm.marksObtained);
      if (obtained > maxMarks) {
        alert(`Marks cannot exceed total marks (${maxMarks})`);
        return;
      }
    }

    const newMark: StudentAssessmentMark = {
      studentId: selectedStudentForMarks.id,
      assessmentNo: loadAsmNo as number,
      date: marksForm.date,
      attendance: marksForm.attendance,
      marksObtained: marksForm.attendance === 'Present' ? Number(marksForm.marksObtained) : null
    };

    setStudentMarks(prev => {
      const filtered = prev.filter(m => !(m.studentId === newMark.studentId && m.assessmentNo === newMark.assessmentNo));
      return [...filtered, newMark];
    });

    setSelectedStudentForMarks(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-none">Assessment (मूल्यमापन)</h2>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                Create and manage level-wise assessments
              </p>
            </div>
          </div>
          {mode === 'list' && availableAssessmentNos.length >= 0 && (
            <button
              onClick={() => { setActiveAssessmentNo(null); setMode('create'); }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide hover:bg-indigo-700 transition-colors shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              Create Assessment
            </button>
          )}
          {mode !== 'list' && (
            <button
              onClick={() => { setMode('list'); setActiveAssessmentNo(null); }}
              className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
          )}
        </div>
      </div>

      {mode === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-500 uppercase">ASSESSMENT NO. NAME PLATES</h3>
          </div>
          
          {Object.keys(assessmentsGrouped).length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-500 uppercase">No Assessments Found</h3>
              <p className="text-xs text-slate-400 mt-1">Click "Create Assessment" to get started.</p>
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {Object.entries(assessmentsGrouped).sort(([a], [b]) => Number(a) - Number(b)).map((entry: any) => { 
                const asNum = Number(entry[0]); 
                const subs: CustomAssessmentSubsection[] = entry[1];
                const firstSub = subs[0];
                const uniqueClasses = Array.from(new Set(subs.map(s => s.classGrade))).sort();
                const uniqueLevels = Array.from(new Set(subs.map(s => s.level)));
                
                // Get eligible students for this assessment
                const cardMatchingStudents = attendanceStudents.filter(s => {
                  const rawClass = s.std || (s as any).classGrade || '';
                  const classGrade = String(rawClass).replace(/[^0-9]/g, '');
                  const hasMatchingClass = subs.some(sub => String(sub.classGrade).replace(/[^0-9]/g, '') === classGrade);
                  if (!hasMatchingClass) return false;
                  
                  if (loadSchool && s.schoolName !== loadSchool && s.school !== loadSchool) return false;
                  
                  const dynamicLevel = getStudentLevelForType(s, arpRecords, loadExamType || 'boardable_baseline');
                  const hasMatchingLevel = subs.some(sub => 
                    String(sub.classGrade).replace(/[^0-9]/g, '') === classGrade && 
                    sub.level.toUpperCase() === dynamicLevel.toUpperCase()
                  );
                  return hasMatchingLevel;
                });
                
                const submittedCount = studentMarks.filter(m => m.assessmentNo === asNum && cardMatchingStudents.some(cs => cs.id === m.studentId)).length;
                const totalEligibleCount = cardMatchingStudents.length;
                
                return (
                  <div 
                    key={asNum} 
                    className="min-w-[320px] max-w-[350px] shrink-0 snap-start bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col relative cursor-pointer hover:border-indigo-300 transition-all group"
                    onClick={() => openView(asNum)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">Assessment {asNum}</h4>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          {firstSub?.date}
                        </p>
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => openEdit(asNum)}
                          className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs font-bold"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 text-sm font-bold text-slate-600 space-y-1 mt-2">
                      <p><span className="text-slate-400 font-normal">Classes:</span> {uniqueClasses.map(c => c + 'th').join(', ')}</p>
                      <p className="line-clamp-2" title={uniqueLevels.join(', ')}>
                        <span className="text-slate-400 font-normal">Levels:</span> {uniqueLevels.join(', ')}
                      </p>
                      <div className="pt-2 border-t border-slate-100 mt-2 flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-normal">Marks Submitted:</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-black border border-emerald-100 text-[10px]">
                          {submittedCount} / {totalEligibleCount}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STUDENTS LIST SELECTION SECTION */}
          {Object.keys(assessmentsGrouped).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8 space-y-6">
              <h3 className="text-lg font-black text-slate-800 uppercase border-b border-slate-100 pb-4">AFTER CREATE - SELECT DETAILS TO LOAD STUDENTS LIST</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Assessment No.</label>
                  <select
                    value={loadAsmNo}
                    onChange={e => setLoadAsmNo(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select Assessment No.</option>
                    {Object.keys(assessmentsGrouped).sort((a,b)=>Number(a)-Number(b)).map(n => (
                      <option key={n} value={n}>Assessment {n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Boardable Exam *</label>
                  <select
                    value={loadExamType}
                    onChange={e => setLoadExamType(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select Boardable Exam</option>
                    <option value="boardable_baseline">Boardable Baseline</option>
                    <option value="boardable_midline">Boardable Midline</option>
                    <option value="boardable_endline">Boardable Endline</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">School Name *</label>
                  <select
                    value={loadSchool}
                    onChange={e => setLoadSchool(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select School</option>
                    {uniqueSchools.map(sch => (
                      <option key={sch as string} value={sch as string}>{sch as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Classes (Multi-Select) *</label>
                  <div className="flex flex-wrap gap-2">
                    {loadAsmNo === '' ? (
                      <span className="text-[10px] text-slate-400 font-bold italic">Select Assessment first</span>
                    ) : allowedClassesForAsm.length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-bold italic">No classes configured</span>
                    ) : (
                      allowedClassesForAsm.map(cls => (
                        <label key={cls} className="flex items-center gap-1 text-xs font-bold text-slate-600 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={loadClasses.includes(cls)}
                            onChange={() => handleLoadClassToggle(cls)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          {cls}th
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Division (Multi-Select)</label>
                  <div className="flex flex-wrap gap-2">
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(div => (
                      <label key={div} className="flex items-center gap-1 text-xs font-bold text-slate-600 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={loadDivisions.includes(div)}
                          onChange={() => handleLoadDivToggle(div)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {div}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Levels (Multi-Select)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {loadAsmNo === '' || loadClasses.length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-bold italic">Select Class first</span>
                    ) : allowedLevelsForAsmAndClasses.length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-bold italic">No levels configured</span>
                    ) : (
                      allowedLevelsForAsmAndClasses.map(lvl => (
                        <label key={lvl} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={loadLevels.includes(lvl)}
                            onChange={() => handleLoadLevelToggle(lvl)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          {lvl}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {filteredStudents.length > 0 && (
                <div className="mt-8 border-t border-slate-200 pt-6">
                  <h4 className="text-sm font-black text-indigo-900 mb-4 uppercase">STUDENTS LIST (Auto copied based on above selections)</h4>
                  
                  <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-50">Student Name (Click to Fill Marks)</th>
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center bg-slate-50">Obtained Marks / Total (%)</th>
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">School Name</th>
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Class(Division)</th>
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Level</th>
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Gender</th>
                          <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Total Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student, idx) => {
                          let lvlColorClass = "text-slate-700 bg-slate-100 border-slate-200";
                          if (student.computedLevel.includes("FLN")) lvlColorClass = "text-green-700 bg-green-50 border-green-200";
                          else if (student.computedLevel.includes("PSG")) lvlColorClass = "text-blue-700 bg-blue-50 border-blue-200";
                          else if (student.computedLevel.includes("MSG")) lvlColorClass = "text-yellow-700 bg-yellow-50 border-yellow-200";
                          
                          const config = student.config;
                          const hasConfig = !!config;
                          const totalMarks = config?.totalMarks;
                          const isAbsent = student.markRecord?.attendance === 'Absent';
                          const marksObtained = student.markRecord?.marksObtained;
                          const hasMarks = !!student.markRecord;
                          const percentage = (hasMarks && !isAbsent && totalMarks) ? Math.round((Number(marksObtained) / totalMarks) * 100) : null;

                          let namePlateClass = "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/50";
                          if (hasMarks) {
                            if (isAbsent) {
                              namePlateClass = "bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100/50";
                            } else {
                              namePlateClass = "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/50";
                            }
                          }

                          return (
                            <tr key={student.id} className="group border-b border-slate-100 hover:bg-indigo-50/20 transition-colors">
                              <td className="p-3 bg-white border-r border-slate-100 transition-colors">
                                <div 
                                  onClick={() => openMarksModal(student)}
                                  className={`w-full px-3 py-2.5 rounded-xl border font-black text-xs transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer ${namePlateClass}`}
                                >
                                  <span className="truncate">{student.studentName || student.name}</span>
                                  <span className="text-[9px] opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    (Fill Marks)
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-center bg-white border-r border-slate-100 transition-colors">
                                {isAbsent ? (
                                  <span className="inline-block text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md uppercase">
                                    Absent (AB)
                                  </span>
                                ) : hasMarks && totalMarks !== undefined ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs font-black text-slate-800">{marksObtained} / {totalMarks}</span>
                                    <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded mt-1">({percentage}%)</span>
                                  </div>
                                ) : (
                                  <span className="inline-block text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-md uppercase">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-xs font-bold text-slate-500 truncate max-w-[120px]">{student.schoolName || student.school}</td>
                              <td className="p-3 text-xs font-black text-slate-700 text-center">
                                {(student.std || (student as any).classGrade || '').toString().replace(/[^0-9]/g, '')}th ({student.division || student.div})
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-block px-2 py-1 rounded-md text-[9px] font-black border uppercase ${lvlColorClass}`}>
                                  {student.computedLevel}
                                </span>
                              </td>
                              <td className="p-3 text-xs font-bold text-slate-700 text-center">{student.gender || '-'}</td>
                              <td className="p-3 text-xs font-black text-slate-700 text-center">
                                {hasConfig ? config.totalMarks : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-3 text-center">
                    Level, Total Marks are auto shown based on student's level in selected Boardable Exam.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE MODE */}
      {mode === 'create' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={createDate}
                  onChange={e => setCreateDate(e.target.value)}
                  className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Assessment No. *</label>
              <select
                value={createAsmNo}
                onChange={e => setCreateAsmNo(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={activeAssessmentNo !== null}
                className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none disabled:opacity-50"
              >
                <option value="">Select Assessment No.</option>
                {activeAssessmentNo !== null ? (
                  <option value={activeAssessmentNo}>Assessment {activeAssessmentNo}</option>
                ) : availableAssessmentNos.map(n => (
                  <option key={n} value={n}>Assessment {n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Classes (Multi-Select) *</label>
              <div className="flex flex-wrap gap-2 pt-2">
                {classOptions.map(cls => (
                  <label key={cls} className="flex items-center gap-1 text-sm font-bold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={createClasses.includes(cls)}
                      onChange={() => handleClassToggle(cls)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {cls}th
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 p-3 rounded-xl flex items-start gap-2 max-w-xl">
            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-black">i</span>
            </div>
            <p className="text-xs text-slate-600 font-bold leading-relaxed">
              Levels shown will change based on Class selection.<br/>
              Only filled fields will be saved.
            </p>
          </div>

          {createClasses.length > 0 && (
            <div className="space-y-6 mt-6 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Levels & Assessment Details (Based on Selected Classes)</h3>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200">
                  <div className="col-span-1 text-[10px] font-black uppercase text-slate-500 text-center">Class</div>
                  <div className="col-span-4 text-[10px] font-black uppercase text-slate-500">Level (Multi-Select)</div>
                  <div className="col-span-5 text-[10px] font-black uppercase text-slate-500 text-center">Assessment Name</div>
                  <div className="col-span-2 text-[10px] font-black uppercase text-slate-500 text-center">Total Marks</div>
                </div>
                
                {createClasses.sort().map(cls => (
                  <div key={cls} className="grid grid-cols-12 gap-0 border-b border-slate-100 last:border-0 relative">
                    <div className="col-span-1 p-4 flex items-center justify-center border-r border-slate-100 bg-slate-50/30">
                      <h4 className="text-sm font-black text-slate-900">{cls}th</h4>
                    </div>
                    
                    <div className="col-span-11 p-4 space-y-3">
                      {levelsMap[cls]?.map(lvl => {
                        const isSelected = (createSelectedLevels[cls] || []).includes(lvl);
                        
                        let lvlColorClass = "bg-slate-100 text-slate-600 border-slate-200";
                        if (isSelected) {
                          if (lvl.includes("FLN")) lvlColorClass = "bg-green-50 text-green-700 border-green-200";
                          else if (lvl.includes("PSG")) lvlColorClass = "bg-blue-50 text-blue-700 border-blue-200";
                          else if (lvl.includes("MSG")) lvlColorClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
                          else lvlColorClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                        }
                        
                        return (
                          <div key={lvl} className="grid grid-cols-11 gap-4 items-center">
                            <div className="col-span-4 flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => handleLevelToggle(cls, lvl)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className={`px-3 py-1.5 rounded-md text-[10px] font-black border uppercase text-center min-w-[100px] ${lvlColorClass}`}>
                                {lvl}
                              </div>
                            </div>
                            <div className="col-span-5">
                              <input
                                type="text"
                                placeholder="Assessment name"
                                disabled={!isSelected}
                                value={createLevelConfigs[`${cls}_${lvl}`]?.name || ''}
                                onChange={e => handleConfigChange(cls, lvl, 'name', e.target.value)}
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:bg-slate-100"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                placeholder="_ / _"
                                disabled={!isSelected}
                                value={createLevelConfigs[`${cls}_${lvl}`]?.totalMarks || ''}
                                onChange={e => handleConfigChange(cls, lvl, 'totalMarks', e.target.value)}
                                className="w-full text-xs font-bold text-center bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:bg-slate-100"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 flex justify-end">
            <button
              onClick={handleCreateSave}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-sm tracking-wide hover:bg-indigo-700 transition-colors shadow-md"
            >
              Create Assessment
            </button>
          </div>
        </div>
      )}

      {/* REPORT MODE */}
      {mode === 'view_report' && loadAsmNo !== '' && (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setMode('list'); }}
                  className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-none">Assessment {loadAsmNo} Report (मूल्यमापन अहवाल)</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                    Student marks sheets & level overview for Assessment No. {loadAsmNo}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => { setMode('list'); }}
                className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" /> Close Report
              </button>
            </div>
          </div>

          {/* Quick Info & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-indigo-900 uppercase">Report Filter Settings (अहवाल गाळणी)</h3>
              <span className="text-xs font-bold text-slate-400">Tailor report outputs below</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">School Name (शाळा) *</label>
                <select
                  value={loadSchool}
                  onChange={e => setLoadSchool(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                >
                  <option value="">Select School</option>
                  {uniqueSchools.map(sch => (
                    <option key={sch as string} value={sch as string}>{sch as string}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Boardable Exam (परीक्षा प्रकार) *</label>
                <select
                  value={loadExamType}
                  onChange={e => setLoadExamType(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                >
                  <option value="">Select Boardable Exam</option>
                  <option value="boardable_baseline">Boardable Baseline</option>
                  <option value="boardable_midline">Boardable Midline</option>
                  <option value="boardable_endline">Boardable Endline</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Classes (वर्ग)</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {allowedClassesForAsm.map(cls => (
                    <label key={cls} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={loadClasses.includes(cls)}
                        onChange={() => handleLoadClassToggle(cls)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {cls}th
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Divisions (तुकड्या)</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['A', 'B', 'C', 'D', 'E', 'F'].map(div => (
                    <label key={div} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={loadDivisions.includes(div)}
                        onChange={() => handleLoadDivToggle(div)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {div}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 uppercase">STUDENTS PERFORMANCE RECORD (विद्यार्थी कामगिरी अहवाल)</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">Assessment {loadAsmNo} • List of all matching students</p>
                </div>
              </div>
              
              <div className="w-full sm:w-72 relative">
                <input 
                  type="text"
                  placeholder="Search by student name..."
                  value={reportSearchQuery}
                  onChange={e => setReportSearchQuery(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-50">Student Name (Click to Fill Marks)</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center bg-slate-50">Obtained Marks / Total (%)</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">School</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center w-36">Class (Div)</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center w-24">Gender</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center w-32">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {reportStudentsFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400 font-bold text-xs uppercase">
                        No students found matching current filters or search query.
                      </td>
                    </tr>
                  ) : (
                    reportStudentsFiltered.map((student) => {
                      const hasMarks = !!student.markRecord;
                      const isAbsent = student.markRecord?.attendance === 'Absent';
                      const marksObtained = student.markRecord?.marksObtained;
                      const totalMarks = student.config?.totalMarks;
                      const percentage = (hasMarks && !isAbsent && totalMarks) ? Math.round((Number(marksObtained) / totalMarks) * 100) : null;
                      
                      let namePlateClass = "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/50";
                      if (hasMarks) {
                        if (isAbsent) {
                          namePlateClass = "bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100/50";
                        } else {
                          namePlateClass = "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/50";
                        }
                      }

                      return (
                        <tr key={student.id} className="group border-b border-slate-100 hover:bg-indigo-50/20 transition-colors">
                          <td className="p-4 bg-white border-r border-slate-100 transition-colors">
                            <div 
                              onClick={() => openMarksModal(student)}
                              className={`w-full px-3 py-2.5 rounded-xl border font-black text-xs transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer ${namePlateClass}`}
                            >
                              <span className="truncate">{student.studentName || student.name}</span>
                              <span className="text-[9px] opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                (Fill Marks)
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center bg-white border-r border-slate-100 transition-colors">
                            {isAbsent ? (
                              <span className="inline-block text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                                AB
                              </span>
                            ) : hasMarks && totalMarks !== undefined ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-black text-slate-800">{marksObtained} / {totalMarks}</span>
                                <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded mt-1">({percentage}%)</span>
                              </div>
                            ) : (
                              <span className="inline-block text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-slate-500 text-xs">
                            {student.schoolName || student.school}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700 text-xs">
                            {(student.std || student.classGrade || '').toString().replace(/[^0-9]/g, '')}th ({student.division || student.div})
                          </td>
                          <td className="p-4 text-center font-bold text-slate-600 text-xs">
                            {student.gender || '-'}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border uppercase ${
                              student.computedLevel.includes("FLN") ? "bg-green-50 text-green-700 border-green-200" :
                              student.computedLevel.includes("PSG") ? "bg-blue-50 text-blue-700 border-blue-200" :
                              student.computedLevel.includes("MSG") ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                              "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              {student.computedLevel}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bottom-Right Submission Status */}
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 z-40 border border-slate-800 transition-all hover:scale-105">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Marks Submitted:</span>
            <span className="text-sm font-black text-white bg-slate-800 px-3 py-1 rounded-xl">
              {reportSubmittedCount} / {reportTotalCount}
            </span>
          </div>
        </div>
      )}

      {/* ENTER MARKS MODAL */}
      {selectedStudentForMarks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden text-left">
            <div className="p-6 sm:p-8 border-b border-slate-100">
              <button 
                onClick={() => setSelectedStudentForMarks(null)} 
                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 mb-5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Student List
              </button>

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-2xl font-black text-slate-900">
                      {selectedStudentForMarks.studentName || selectedStudentForMarks.name}
                    </h3>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border uppercase ${
                      selectedStudentForMarks.computedLevel.includes("FLN") ? "bg-green-50 text-green-700 border-green-200" :
                      selectedStudentForMarks.computedLevel.includes("PSG") ? "bg-blue-50 text-blue-700 border-blue-200" :
                      selectedStudentForMarks.computedLevel.includes("MSG") ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                      "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                      {selectedStudentForMarks.computedLevel}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-1.5">
                    {selectedStudentForMarks.schoolName || selectedStudentForMarks.school} • Class {(selectedStudentForMarks.std || selectedStudentForMarks.classGrade || '').toString().replace(/[^0-9]/g, '')}th ({selectedStudentForMarks.division || selectedStudentForMarks.div}) • {selectedStudentForMarks.gender || '-'}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-black uppercase text-indigo-500">
                    <span>Boardable Exam: {loadExamType === 'boardable_baseline' ? 'Boardable Baseline' : loadExamType === 'boardable_midline' ? 'Boardable Midline' : 'Boardable Endline'}</span>
                    <span>Assessment No.: {loadAsmNo}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStudentForMarks(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {selectedStudentForMarks.config ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Attendance (हजेरी) *</label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setMarksForm(prev => ({ ...prev, attendance: 'Present' }))}
                          className={`flex-1 py-3.5 text-xs font-bold rounded-xl border transition-colors ${marksForm.attendance === 'Present' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-black' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          Present (हजर)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarksForm(prev => ({ ...prev, attendance: 'Absent', marksObtained: '' }))}
                          className={`flex-1 py-3.5 text-xs font-bold rounded-xl border transition-colors ${marksForm.attendance === 'Absent' ? 'bg-rose-600 border-rose-600 text-white shadow-sm font-black' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          Absent (गैरहजर)
                        </button>
                      </div>
                    </div>
                  </div>

                  {marksForm.attendance === 'Present' && (
                    <div className="animate-fade-in bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                      <div>
                        <label className="text-xs font-black uppercase text-indigo-800 mb-2 block">
                          Assessment Marks ({selectedStudentForMarks.config.name}) Marks Obtained:
                        </label>
                        <input 
                          type="number" 
                          min="0"
                          max={selectedStudentForMarks.config.totalMarks}
                          value={marksForm.marksObtained}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') {
                              setMarksForm(prev => ({ ...prev, marksObtained: '' }));
                              return;
                            }
                            const num = Number(val);
                            const maxMarks = Number(selectedStudentForMarks.config.totalMarks);
                            if (num > maxMarks) {
                              setMarksForm(prev => ({ ...prev, marksObtained: maxMarks }));
                            } else if (num < 0) {
                              setMarksForm(prev => ({ ...prev, marksObtained: 0 }));
                            } else {
                              setMarksForm(prev => ({ ...prev, marksObtained: val }));
                            }
                          }}
                          className="w-full text-base font-black bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-xl p-3 outline-none text-center"
                          placeholder={`0 to ${selectedStudentForMarks.config.totalMarks}`}
                          required
                        />
                        <span className="text-[10px] text-slate-400 font-semibold block mt-1.5">
                          Maximum limit: {selectedStudentForMarks.config.totalMarks} marks (जास्तीत जास्त {selectedStudentForMarks.config.totalMarks} गुण)
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-start">
                    <button 
                      onClick={handleMarksSubmit}
                      disabled={!selectedStudentForMarks.config}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-10 py-4 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-xs uppercase tracking-wider disabled:opacity-50"
                    >
                      Submit Examination
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center border border-red-100">
                  <h4 className="font-black text-sm uppercase">Assessment Configuration Missing</h4>
                  <p className="text-xs font-bold mt-1">There is no assessment configured for Class {(selectedStudentForMarks.std || selectedStudentForMarks.classGrade || '').toString().replace(/[^0-9]/g, '')}th - Level "{selectedStudentForMarks.computedLevel}" under Assessment No. {loadAsmNo}.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
