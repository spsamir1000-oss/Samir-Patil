import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, Filter, XCircle, FileSpreadsheet, ListTodo } from 'lucide-react';
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
}

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

function getWeekOfMonth(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
}

export default function SerpDownload({ currentUser, storagePrefix = 'serp' }: { currentUser: Teacher | null; storagePrefix?: 'serp' | 'arp' }) {
  const [students, setStudents] = useState<UploadedStudent[]>([]);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    const studentsKey = storagePrefix === 'arp' ? 'arp_uploaded_students' : 'serp_uploaded_students';
    const recordsKey = storagePrefix === 'arp' ? 'arp_assessment_records' : 'serp_assessment_records';
    const logsKey = storagePrefix === 'arp' ? 'arp_teaching_logs' : 'serp_teaching_logs';

    const savedStudents = localStorage.getItem(studentsKey);
    if (savedStudents) {
      try {
        const parsed: UploadedStudent[] = JSON.parse(savedStudents);
        const normalizeClass = (c: string) => {
          if (!c) return c;
          const s = c.toString().trim().toLowerCase();
          if (/^[0-9]+$/.test(s)) {
            if (s === '1') return '1st';
            if (s === '2') return '2nd';
            if (s === '3') return '3rd';
            return `${s}th`;
          }
          return s;
        };
        setStudents(parsed.map(studioStudent => ({ ...studioStudent, classGrade: normalizeClass(studioStudent.classGrade) })));
      } catch (e) {}
    }
    const savedRecords = localStorage.getItem(recordsKey);
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    }
    const savedLogs = localStorage.getItem(logsKey);
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
    const savedTeachers = localStorage.getItem('same_app_teachers');
    if (savedTeachers) {
      setTeachers(JSON.parse(savedTeachers));
    }
  }, [storagePrefix]);

  const [activeDownloadMode, setActiveDownloadMode] = useState<'assessment' | 'dailyLog'>('assessment');

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedExaminers, setSelectedExaminers] = useState<string[]>([]);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [selectedSerpNames, setSelectedSerpNames] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  const [isExporting, setIsExporting] = useState(false);

  // Extract unique filter options from students and records
  const schools = useMemo(() => Array.from(new Set(students.map(s => s.schoolName))).sort(), [students]);
  const classes = useMemo(() => {
    const ALLOWED_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
    return Array.from(new Set(students.map(s => s.classGrade)))
      .filter((cls): cls is string => ALLOWED_CLASSES.includes(cls as string))
      .sort();
  }, [students]);
  const divisions = useMemo(() => Array.from(new Set(students.map(s => s.division))).sort(), [students]);
  
  const examiners = useMemo(() => {
    const exSet = new Set<string>();
    records.forEach(r => {
      if (r.examiners) {
        r.examiners.forEach(ex => exSet.add(ex));
      } else {
        if (r.examiner1) exSet.add(r.examiner1);
        if (r.examiner2) exSet.add(r.examiner2);
      }
    });
    return Array.from(exSet).sort();
  }, [records]);

  const examOptions = useMemo(() => {
    const defaults = ['Baseline', 'Endline'];
    const fromRecords = records.map(r => r.type).filter(Boolean);
    const normalized = fromRecords.map(type => {
      const lower = type.trim().toLowerCase();
      if (lower === 'baseline') return 'Baseline';
      if (lower === 'endline') return 'Endline';
      return type.trim();
    });
    return Array.from(new Set([...defaults, ...normalized])).sort();
  }, [records]);

  const teacherIdToNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    teachers.forEach(t => {
      map[t.id] = t.name;
    });
    return map;
  }, [teachers]);

  const isSuperUser = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'academic_coordinator';
  const serpNamesOptions = useMemo(() => {
     return Array.from(new Set(Object.values(teacherIdToNameMap))).sort();
  }, [teacherIdToNameMap]);

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, options: string[], item: string) => {
    setter(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const MultiSelectDropdown = ({ 
    label, 
    options, 
    selected, 
    setter, 
    dropdownId 
  }: { 
    label: string, 
    options: string[], 
    selected: string[], 
    setter: React.Dispatch<React.SetStateAction<string[]>>, 
    dropdownId: string 
  }) => {
    const isOpen = openDropdown === dropdownId;
    
    return (
      <div className="flex flex-col gap-1.5 relative">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</label>
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : dropdownId)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-3xs cursor-pointer text-left transition-all focus:ring-1 focus:ring-indigo-500"
        >
          <span className="truncate pr-2">
            {selected.length === 0 
              ? `All Selected (All ${label.includes('(') ? label.split('(')[0].trim() : label})` 
              : `${selected.length} Selected (${selected.join(', ')})`
            }
          </span>
          <span className="text-[10px] text-slate-400 font-bold">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpenDropdown(null)} />
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 max-h-56 overflow-y-auto z-30 flex flex-col gap-1">
              {options.length === 0 ? (
                <p className="text-xs text-slate-400 p-2 font-semibold">No options available</p>
              ) : (
                <>
                  {selected.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setter([])}
                      className="text-left text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1 flex items-center gap-1 border-b border-slate-100 pb-1.5 mb-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Clear Selected
                    </button>
                  )}
                  {options.map(opt => (
                    <label 
                      key={opt} 
                      className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 bg-white cursor-pointer accent-indigo-600"
                        checked={selected.includes(opt)}
                        onChange={() => {
                          toggleSelection(setter, options, opt);
                        }}
                      />
                      <span className="truncate">{opt}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const handleExportData = () => {
    if (activeDownloadMode === 'assessment') {
      exportAssessmentData();
    } else {
      exportDailyLogsData();
    }
  };

  const exportDailyLogsData = () => {
    if (logs.length === 0) {
      alert("No daily logs available to export.");
      return;
    }

    setIsExporting(true);

    try {
      const headers = ['Sr. No.', 'Month', 'Week', 'Date', 'School Name', 'Class / Division', 'Module/Session Name', 'Worksheet', 'Teacher Name', 'Challenges'];

      const isSuperUser = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'academic_coordinator';

      // Filter logs by date range and user
      let filteredLogs = logs.filter(log => {
        if (dateRange.start && log.date < dateRange.start) return false;
        if (dateRange.end && log.date > dateRange.end) return false;
        
        if (isSuperUser) {
           if (selectedSerpNames.length > 0) {
              const tName = teacherIdToNameMap[log.teacherId];
              if (!tName || !selectedSerpNames.includes(tName)) return false;
           }
        } else {
           if (log.teacherId !== currentUser?.id) return false;
        }

        return true;
      });

      if (filteredLogs.length === 0) {
        alert("No daily logs match the selected filters.");
        setIsExporting(false);
        return;
      }

      // Sort logs chronologically ascending
      filteredLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const masterRows: any[][] = [];
      const teacherMap: Record<string, any[][]> = {};
      let srNoMaster = 1;

      filteredLogs.forEach(log => {
         const dateObj = new Date(log.date);
         const month = dateObj.toLocaleString('en-US', { month: 'long' });
         const week = getWeekOfMonth(dateObj);
         
         const schoolName = log.school || '';
         const classDiv = (log.classGrade ? log.classGrade : '') + (log.division ? ' - ' + log.division : '');
         
         let moduleSession = log.module || '';
         if (log.session) {
             moduleSession += ' / ' + log.session;
         } else if (log.eventName) {
             moduleSession += ' / ' + log.eventName;
         } else if (log.subModule) {
             moduleSession += ' / ' + log.subModule;
         }
         
         const worksheet = log.worksheet === 'Yes' ? '1' : '';
         const teacherName = teacherIdToNameMap[log.teacherId] || 'Unknown';
         const challenges = log.challenges || '';
         
         const rowData = [
             srNoMaster++, month, "Week " + week, log.date, schoolName, classDiv, moduleSession, worksheet, teacherName, challenges
         ];

         masterRows.push(rowData);

         if (!teacherMap[teacherName]) {
           teacherMap[teacherName] = [];
         }
         
         // Sr. No. for teacher specific tab will be its index in array + 1
         const teacherRowData = [...rowData];
         teacherRowData[0] = teacherMap[teacherName].length + 1; 

         teacherMap[teacherName].push(teacherRowData);
      });

      const wb = XLSX.utils.book_new();

      const colWidths = [
        { wch: 10 }, // Sr. No.
        { wch: 15 }, // Month
        { wch: 12 }, // Week
        { wch: 15 }, // Date
        { wch: 25 }, // School Name
        { wch: 20 }, // Class / Division
        { wch: 35 }, // Module/Session Name
        { wch: 15 }, // Worksheet
        { wch: 25 }, // Teacher Name
        { wch: 40 }  // Challenges
      ];

      // Ensure Master sheet is named properly and within 31 char limit
      const wsMaster = XLSX.utils.aoa_to_sheet([headers, ...masterRows]);
      wsMaster['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, wsMaster, 'Master Sheet');

      // Add a sheet for each teacher
      Object.keys(teacherMap).forEach(teacherName => {
         const sanitizedName = teacherName.substring(0, 31).replace(/[\][*\/\\?]/g, '');
         const wsTeacher = XLSX.utils.aoa_to_sheet([headers, ...teacherMap[teacherName]]);
         wsTeacher['!cols'] = colWidths;
         XLSX.utils.book_append_sheet(wb, wsTeacher, sanitizedName);
      });

      const fileName = `Teaching_Analysis_Daily_Logs_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error(e);
      alert("Error occurred while exporting daily logs.");
    } finally {
      setIsExporting(false);
    }
  };


  const exportAssessmentData = () => {
    if (students.length === 0) {
      alert("No data available to export.");
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        "Assessment Type", "Sr. No.", "School Name", "Student Name", "Roll No.", "Class", "Division", 
        "Gender", "Attendance", "Q.1 (Range)", "Q.2 (Accuracy)", "Q.3 (Fluency)", "Q.4 (Interaction)", 
        "(Coherence)", "Obtained Marks", "Total Marks", "Average", "Date", "Examiner"
      ];

      const exportedRows: any[][] = [];
      let srNoCounter = 1;
      let rowNum = 2; // header is row 1

      students.forEach(student => {
        // Find all records for this student
        const studentRecords = records.filter(r => r.studentId === student.id);
        
        // Basic filter checks for student info:
        if (selectedSchools.length > 0 && !selectedSchools.includes(student.schoolName)) return;
        if (selectedClasses.length > 0 && !selectedClasses.includes(student.classGrade)) return;
        if (selectedDivisions.length > 0 && !selectedDivisions.includes(student.division)) return;

        const hasDateOrExaminerFilter = dateRange.start || dateRange.end || selectedExaminers.length > 0 || selectedExams.length > 0;
        
        if (studentRecords.length === 0) {
            if (hasDateOrExaminerFilter) return;
            // No record, but no specific record filters = add empty row
            exportedRows.push([
              "N/A", srNoCounter++, student.schoolName, student.studentName, "", student.classGrade, student.division, student.gender, "Unassessed",
              "", "", "", "", "", "Unassessed", 15, "", "", ""
            ]);
            rowNum++;
            return;
        }

        studentRecords.forEach(record => {
            // Exam filter
            const recTypeNormalized = record.type ? (record.type.toLowerCase() === 'baseline' ? 'Baseline' : (record.type.toLowerCase() === 'endline' ? 'Endline' : record.type)) : '';
            if (selectedExams.length > 0 && !selectedExams.includes(recTypeNormalized)) return;

            // Examiner filter
            let examinerMatches = true;
            let recordExaminers: string[] = [];
            if (record.examiners && record.examiners.length > 0) recordExaminers = record.examiners;
            else if (record.examiner1) {
                recordExaminers.push(record.examiner1);
                if (record.examiner2) recordExaminers.push(record.examiner2);
            }
            
            if (selectedExaminers.length > 0) {
                examinerMatches = recordExaminers.some(ex => selectedExaminers.includes(ex));
            }

            if (!examinerMatches) return;

            // Date filter
            let dateMatches = true;
            if (dateRange.start && record.date && record.date < dateRange.start) dateMatches = false;
            if (dateRange.end && record.date && record.date > dateRange.end) dateMatches = false;

            if (!dateMatches) return;

            const rollNo = record.rollNo || '';
            let date = '', examinerLabel = '';
            
            if (record.status !== 'Unassessed' && record.status !== 'Absent') {
               const q1 = Number(record.q1Range) || 0;
               const q2 = Number(record.q2Accuracy) || 0;
               const q3 = Number(record.q3Fluency) || 0;
               const q4 = Number(record.q4Interaction) || 0;
               const q5 = Number(record.q5Coherence) || 0;
               
               const totalMarks = q1 + q2 + q3 + q4 + q5;
               const obtainedFormula = { f: `SUM(J${rowNum}:N${rowNum})`, v: totalMarks };
               const totalFormula = 15;
               const avgFormula = { f: `O${rowNum}/P${rowNum}*100`, v: (totalMarks / 15 * 100) };
               date = record.date || '';
               examinerLabel = recordExaminers.join(', ');

               exportedRows.push([
                 record.type,
                 srNoCounter++,
                 student.schoolName,
                 student.studentName,
                 rollNo,
                 student.classGrade,
                 student.division,
                 student.gender,
                 record.attendance || 'Present',
                 q1, q2, q3, q4, q5,
                 obtainedFormula, totalFormula, avgFormula, date, examinerLabel
               ]);
               rowNum++;
            } else if (record.status === 'Absent') {
               date = record.date || '';
               examinerLabel = recordExaminers.join(', ');
               
               exportedRows.push([
                 record.type, srNoCounter++, student.schoolName, student.studentName, rollNo, student.classGrade, student.division, student.gender, 'Absent',
                 "", "", "", "", "", "Absent", 15, "", date, examinerLabel
               ]);
               rowNum++;
            } else {
               exportedRows.push([
                 record.type, srNoCounter++, student.schoolName, student.studentName, rollNo, student.classGrade, student.division, student.gender, 'Unassessed',
                 "", "", "", "", "", "Unassessed", 15, "", "", ""
               ]);
               rowNum++;
            }
        });
      });

      if (exportedRows.length === 0) {
        alert("No data matches the selected filters.");
        setIsExporting(false);
        return;
      }

      const exportData = [headers, ...exportedRows];
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Filtered_Assessments`);
      
      const fileName = `Baseline_Endline_Assessment_Filtered_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error(e);
      alert("Error occurred while exporting data.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Download Data</h2>
                <p className="text-xs text-slate-500 font-semibold">Filter and export records to Excel</p>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto space-x-1">
               <button
                  onClick={() => setActiveDownloadMode('assessment')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                     activeDownloadMode === 'assessment' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
               >
                  <FileSpreadsheet className="w-4 h-4" />
                  Baseline/Endline Assessment
               </button>
               <button
                  onClick={() => setActiveDownloadMode('dailyLog')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                     activeDownloadMode === 'dailyLog' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
               >
                  <ListTodo className="w-4 h-4" />
                  Teaching Analysis (Daily Logs)
               </button>
            </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl mb-8">
           <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">
              {activeDownloadMode === 'assessment' ? 'Filter Assessment Data' : 'Filter Daily Logs Data'}
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5 lg:col-span-3">
                 <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Date Range</label>
                 <div className="flex items-center gap-3">
                    <input 
                      type="date" 
                      value={dateRange.start}
                      onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[200px]"
                    />
                    <span className="text-slate-400 text-xs font-bold">to</span>
                    <input 
                      type="date" 
                      value={dateRange.end}
                      onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[200px]"
                    />
                    
                    {(dateRange.start || dateRange.end) && (
                       <button onClick={() => setDateRange({start: '', end: ''})} className="text-xs text-rose-500 hover:text-rose-600 font-bold ml-2 underline">Clear Dates</button>
                    )}
                 </div>
              </div>

              {activeDownloadMode === 'assessment' && (
                 <>
                    <MultiSelectDropdown label="Exam Type" options={examOptions} selected={selectedExams} setter={setSelectedExams} dropdownId="exam" />
                    <MultiSelectDropdown label="School Name" options={schools} selected={selectedSchools} setter={setSelectedSchools} dropdownId="school" />
                    <MultiSelectDropdown label="Class" options={classes} selected={selectedClasses} setter={setSelectedClasses} dropdownId="class" />
                    <MultiSelectDropdown label="Division" options={divisions} selected={selectedDivisions} setter={setSelectedDivisions} dropdownId="division" />
                    <MultiSelectDropdown label="Examiner Name" options={examiners} selected={selectedExaminers} setter={setSelectedExaminers} dropdownId="examiner" />
                 </>
              )}

              {activeDownloadMode === 'dailyLog' && isSuperUser && (
                 <>
                    <MultiSelectDropdown label="SERP Names" options={serpNamesOptions} selected={selectedSerpNames} setter={setSelectedSerpNames} dropdownId="serpNames" />
                 </>
              )}
           </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={handleExportData}
            disabled={isExporting}
            className={`flex items-center gap-2 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 ${
               activeDownloadMode === 'assessment' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            {isExporting ? 'Generating Excel...' : `Download ${activeDownloadMode === 'assessment' ? 'Assessments' : 'Daily Logs'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

