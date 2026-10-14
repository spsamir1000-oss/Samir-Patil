import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Folder, User, CheckCircle, AlertCircle, XCircle, ChevronLeft, ChevronRight, Check, Calendar, Trash2, AlertTriangle, DownloadCloud, Loader2 } from 'lucide-react';
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
  id: string; // studentId + type
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
  examiner1?: string;
  examiner2?: string;
  examiners?: string[];
  module?: string;
}

interface AssessmentManagerProps {
  assessmentType: string;
  currentUser: Teacher | null;
  storagePrefix?: 'serp' | 'arp';
}

export default function AssessmentManager({ assessmentType, currentUser, storagePrefix = 'serp' }: AssessmentManagerProps) {
  const studentsKey = storagePrefix === 'arp' ? 'arp_uploaded_students' : 'serp_uploaded_students';
  const recordsKey = storagePrefix === 'arp' ? 'arp_assessment_records' : 'serp_assessment_records';

  const [students, setStudents] = useState<UploadedStudent[]>(() => {
    const saved = localStorage.getItem(studentsKey);
    if (saved) {
      try {
        const parsed: UploadedStudent[] = JSON.parse(saved);
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
        return parsed.map(studioStudent => ({ ...studioStudent, classGrade: normalizeClass(studioStudent.classGrade) }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [records, setRecords] = useState<AssessmentRecord[]>(() => {
    const saved = localStorage.getItem(recordsKey);
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<UploadedStudent | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('Module 1');
  
  // Custom Delete Confirmation State
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  // Form State
  const [formData, setFormData] = useState<Partial<AssessmentRecord>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let allNewStudents: UploadedStudent[] = [];

    const readExcelFile = (file: File): Promise<UploadedStudent[]> => {
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

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'array' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            const newStudents: UploadedStudent[] = data.map((row: any, idx) => {
              const normRow: Record<string, any> = {};
              for (const key in row) {
                normRow[key.trim().toLowerCase()] = row[key];
              }

              return {
                id: Date.now().toString() + Math.random().toString(36).substring(7) + idx,
                srNo: String(normRow['sr no.'] ?? normRow['sr no'] ?? normRow['sr'] ?? idx + 1),
                schoolName: String(normRow['school name'] ?? normRow['school'] ?? 'Unknown'),
                studentName: String(normRow['student name'] ?? normRow['name'] ?? 'Unknown'),
                classGrade: normalizeClass(String(normRow['class'] ?? normRow['grade'] ?? normRow['std'] ?? normRow['standard'] ?? 'Unknown')),
                division: String(normRow['division'] ?? normRow['div'] ?? 'Unknown'),
                gender: String(normRow['gender'] ?? normRow['sex'] ?? 'Unknown')
              };
            });
            resolve(newStudents);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    };

    try {
      for (let i = 0; i < files.length; i++) {
        const fileStudents = await readExcelFile(files[i]);
        allNewStudents = [...allNewStudents, ...fileStudents];
      }

      setStudents(prev => {
        const finalStudents = [...prev, ...allNewStudents];
        localStorage.setItem(studentsKey, JSON.stringify(finalStudents));
        return finalStudents;
      });

      alert("Excel file(s) uploaded successfully!");
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      alert("Error parsing Excel file(s). Please ensure the format is correct.");
    }
  };

  const handleClearData = () => {
    setStudents([]);
    localStorage.removeItem(studentsKey);
    setSelectedSchool(null);
    setSelectedClass(null);
    setSelectedDivision(null);
    setSelectedStudent(null);
    setDeleteStep(0);
  };

  const schools = useMemo(() => Array.from(new Set(students.map(s => s.schoolName))).sort(), [students]);
  const classes = useMemo(() => {
    const ALLOWED_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
    return Array.from(new Set(students.filter(s => s.schoolName === selectedSchool).map(s => s.classGrade)))
      .filter((cls): cls is string => ALLOWED_CLASSES.includes(cls as string))
      .sort((a: string, b: string) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numA - numB;
        }
        return a.localeCompare(b);
      });
  }, [students, selectedSchool]);
  const divisions = useMemo(() => Array.from(new Set(students.filter(s => s.schoolName === selectedSchool && s.classGrade === selectedClass).map(s => s.division))).sort(), [students, selectedSchool, selectedClass]);
  const filteredStudents = useMemo(() => students.filter(s => s.schoolName === selectedSchool && s.classGrade === selectedClass && s.division === selectedDivision), [students, selectedSchool, selectedClass, selectedDivision]);

  const duplicatesMap = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach(s => {
      const key = `${s.schoolName}|${s.classGrade}|${s.division}|${s.studentName}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [students]);

  const getRecord = (studentId: string) => records.find(r => 
    r.studentId === studentId && 
    r.type === assessmentType && 
    (assessmentType !== 'module' || r.module === selectedModule)
  );

  const handleStudentClick = (student: UploadedStudent) => {
    const existingRecord = getRecord(student.id);
    setSelectedStudent(student);
    if (existingRecord) {
      setFormData(existingRecord);
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        attendance: '',
        rollNo: '',
        q1Range: '',
        q2Accuracy: '',
        q3Fluency: '',
        q4Interaction: '',
        q5Coherence: ''
      });
    }
  };

  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !formData.date || !formData.attendance) {
      alert("Please fill date and attendance.");
      return;
    }

    let status: AssessmentRecord['status'] = 'Incomplete';
    
    if (formData.attendance === 'Absent') {
      status = 'Absent';
    } else if (formData.attendance === 'Present') {
      const hasAllMarks = 
        formData.rollNo !== '' && formData.rollNo !== undefined &&
        formData.q1Range !== '' && formData.q1Range !== undefined &&
        formData.q2Accuracy !== '' && formData.q2Accuracy !== undefined &&
        formData.q3Fluency !== '' && formData.q3Fluency !== undefined &&
        formData.q4Interaction !== '' && formData.q4Interaction !== undefined &&
        formData.q5Coherence !== '' && formData.q5Coherence !== undefined;
      
      if (hasAllMarks) status = 'Completed';
    }

    const currentUserName = currentUser?.name || 'Unknown';

    const recordId = assessmentType === 'module' 
      ? `${selectedStudent.id}_${assessmentType}_${selectedModule}` 
      : `${selectedStudent.id}_${assessmentType}`;

    const newRecord: AssessmentRecord = {
      id: recordId,
      studentId: selectedStudent.id,
      type: assessmentType,
      date: formData.date as string,
      attendance: formData.attendance as 'Present' | 'Absent',
      rollNo: formData.rollNo,
      q1Range: formData.q1Range,
      q2Accuracy: formData.q2Accuracy,
      q3Fluency: formData.q3Fluency,
      q4Interaction: formData.q4Interaction,
      q5Coherence: formData.q5Coherence,
      status,
      examiners: [currentUserName],
      examiner1: currentUserName,
      examiner2: undefined,
      module: assessmentType === 'module' ? selectedModule : undefined
    };

    const updatedRecords = records.filter(r => r.id !== newRecord.id);
    updatedRecords.push(newRecord);
    
    setRecords(updatedRecords);
    localStorage.setItem(recordsKey, JSON.stringify(updatedRecords));

    setSelectedStudent(null);
  };

  const getStudentStatusColor = (studentId: string) => {
    const rec = getRecord(studentId);
    if (!rec || rec.status === 'Unassessed') return 'bg-white border-slate-200 hover:border-slate-300 text-slate-700';
    if (rec.status === 'Absent') return 'bg-rose-50 border-rose-200 text-rose-800';
    if (rec.status === 'Completed') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    return 'bg-amber-50 border-amber-200 text-amber-800'; // Incomplete
  };

  const getStudentStatusBadge = (studentId: string) => {
    const rec = getRecord(studentId);
    if (!rec || rec.status === 'Unassessed') return null;
    if (rec.status === 'Absent') return <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><XCircle className="w-3 h-3"/> Absent</span>;
    if (rec.status === 'Completed') return <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Completed</span>;
    return <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Incomplete</span>;
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    if (students.length === 0) {
      alert("No data available to export.");
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        "Sr. No.", "School Name", "Student Name", "Roll No.", "Class", "Division", 
        "Gender", "Attendance", "Q.1 (Range)", "Q.2 (Accuracy)", "Q.3 (Fluency)", "Q.4 (Interaction)", 
        "(Coherence)", "Obtained Marks", "Total Marks", "Average", "Date", "Examiner"
      ];

      let srNoCounter = 1;
      let rowNum = 2; // header is row 1

      const rows = students.map(student => {
        const record = getRecord(student.id);
        const rollNo = record?.rollNo || '';
        
        let date = '', examinerLabel = '';
        
        if (record && record.status !== 'Unassessed' && record.status !== 'Absent') {
           const q1 = Number(record.q1Range) || 0;
           const q2 = Number(record.q2Accuracy) || 0;
           const q3 = Number(record.q3Fluency) || 0;
           const q4 = Number(record.q4Interaction) || 0;
           const q5 = Number(record.q5Coherence) || 0;
           
           const totalMarks = q1 + q2 + q3 + q4 + q5;
           const obtainedFormula = { f: `SUM(I${rowNum}:M${rowNum})`, v: totalMarks };
           const totalFormula = 15;
           const avgFormula = { f: `N${rowNum}/O${rowNum}*100`, v: (totalMarks / 15 * 100) };
           date = record.date || '';

           if (record.examiners && record.examiners.length > 0) {
              examinerLabel = record.examiners.join(', ');
           } else if (record.examiner1) {
              examinerLabel = record.examiner1;
              if (record.examiner2) examinerLabel += `, ${record.examiner2}`;
           }

           const row = [
             srNoCounter++, student.schoolName, student.studentName, rollNo, 
             student.classGrade, student.division, student.gender, record.attendance || 'Present',
             q1, q2, q3, q4, q5,
             obtainedFormula, totalFormula, avgFormula, date, examinerLabel
           ];
           rowNum++;
           return row;
        } else if (record?.status === 'Absent') {
           date = record.date || '';
           if (record.examiners && record.examiners.length > 0) examinerLabel = record.examiners.join(', ');
           else if (record.examiner1) examinerLabel = record.examiner1;
           const row = [
             srNoCounter++, student.schoolName, student.studentName, rollNo, 
             student.classGrade, student.division, student.gender, 'Absent',
             "", "", "", "", "", "Absent", 15, "", date, examinerLabel
           ];
           rowNum++;
           return row;
        }

        const row = [
           srNoCounter++, student.schoolName, student.studentName, rollNo, 
           student.classGrade, student.division, student.gender, 'Unassessed',
           "", "", "", "", "", "Unassessed", 15, "", "", ""
        ];
        rowNum++;
        return row;
      });

      const exportData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Assessment_${assessmentType}`);
      
      const fileName = `Assessment_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      XLSX.writeFile(wb, fileName);

      // Cloud Sync
      const configStr = localStorage.getItem('same_app_sync_config');
      if (configStr) {
        const config = JSON.parse(configStr);
        const target = config.syncTarget || 'sheets';
        const isSheetsEnabled = target === 'sheets' || target === 'both';
        const isOneDriveEnabled = target === 'onedrive' || target === 'both';

        const payload = {
          action: 'assessment_sync',
          assessmentType,
          teacherName: currentUser?.name || 'Unknown',
          data: exportData
        };

        const promises = [];
        
        let gsheetUrl = config.appsScriptUrl;
        if (config.appsScriptUrls && config.appsScriptUrls[assessmentType]) {
           gsheetUrl = config.appsScriptUrls[assessmentType];
        }

        let oDriveUrl = config.oneDriveUrl;
        if (config.oneDriveUrls && config.oneDriveUrls[assessmentType]) {
           oDriveUrl = config.oneDriveUrls[assessmentType];
        }

        if (isSheetsEnabled && gsheetUrl) {
          promises.push(
            fetch(gsheetUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).catch(e => console.warn('GSheet Sync warning', e))
          );
        }
        if (isOneDriveEnabled && oDriveUrl) {
          promises.push(
            fetch(oDriveUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).catch(e => console.warn('OneDrive Sync warning', e))
          );
        }

        if (promises.length > 0) {
           await Promise.allSettled(promises);
           alert("Data successfully exported and synchronized to the cloud.");
        } else {
           alert("Data successfully exported. Note: Cloud sync is missing URLs in configuration.");
        }
      } else {
        alert("Data successfully exported to Excel. (Cloud sync not configured)");
      }
    } catch (e) {
      console.error(e);
      alert("Error occurred while exporting data.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Excel Upload Header (Admin Only) */}
      {currentUser?.role === 'admin' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-4">
          <div>
             <p className="text-sm font-black text-indigo-900">Import Students Data</p>
             <p className="text-[11px] font-bold text-indigo-600/70 mt-0.5">Template Format: Sr no. | School Name | Student Name | Class | Division | Gender</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".xlsx, .xls"
              multiple
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
              id={`excel-upload-${assessmentType}`}
            />
            <label
              htmlFor={`excel-upload-${assessmentType}`}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Excel
            </label>
            {students.length > 0 && (
               <button onClick={() => setDeleteStep(1)} className="flex items-center gap-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs px-3 py-2.5 rounded-xl transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Data
               </button>
            )}
          </div>
        </div>
      )}

      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
           <div>
              {assessmentType === 'module' && (
                 <div className="flex items-center gap-3 bg-slate-100 border border-slate-200/60 rounded-xl px-4 py-2 transition-all">
                    <span className="text-[10px] font-black uppercase text-slate-400">Assessing Module</span>
                    <select
                       value={selectedModule}
                       onChange={e => setSelectedModule(e.target.value)}
                       className="bg-transparent border-none text-xs font-black text-indigo-700 focus:outline-none cursor-pointer"
                    >
                       {Array.from({length: 10}, (_, i) => `Module ${i + 1}`).map(m => (
                          <option key={m} value={m}>{m}</option>
                       ))}
                    </select>
                 </div>
              )}
           </div>

           <div className="flex justify-end">
           <button 
             onClick={handleExportData}
             disabled={isExporting}
             className="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
           >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              {isExporting ? 'Exporting...' : 'Export & Cloud Sync'}
           </button>
            </div>
         </div>
       )}

      {students.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
           <Folder className="w-10 h-10 text-slate-300 mx-auto mb-3" />
           <p className="text-sm font-bold text-slate-500">No students uploaded yet.</p>
           <p className="text-xs font-semibold text-slate-400 mt-1">Please upload an Excel sheet to begin assessment.</p>
        </div>
      ) : selectedStudent ? (
        // STUDENT FORM
        <div className="bg-white border text-center text-left border-slate-200 rounded-2xl p-5 sm:p-8 animate-fade-in">
           <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Student List
           </button>

           <div className="flex items-start justify-between mb-8 border-b border-slate-100 pb-5">
              <div>
                 <h3 className="text-xl font-black text-slate-900">{selectedStudent.studentName}</h3>
                 <p className="text-xs font-bold text-slate-500 mt-1">{selectedSchool} • Class {selectedClass} ({selectedDivision}) • {selectedStudent.gender}</p>
              </div>
           </div>

           <form onSubmit={handleSaveAssessment} className="space-y-6 max-w-2xl text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Assessment Date</label>
                    <div className="relative">
                       <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                       <input 
                         type="date" 
                         value={formData.date || ''} 
                         onChange={e => setFormData({...formData, date: e.target.value})}
                         className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:border-indigo-500 outline-none"
                         required
                       />
                    </div>
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Attendance</label>
                    <div className="flex gap-3">
                       <button
                         type="button"
                         onClick={() => setFormData({...formData, attendance: 'Present'})}
                         className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-colors ${formData.attendance === 'Present' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                       >
                         Present
                       </button>
                       <button
                         type="button"
                         onClick={() => setFormData({...formData, attendance: 'Absent'})}
                         className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-colors ${formData.attendance === 'Absent' ? 'bg-rose-600 border-rose-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                       >
                         Absent
                       </button>
                    </div>
                 </div>
              </div>

              {formData.attendance === 'Present' && (
                <div className="animate-fade-in bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-5">
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Roll No.</label>
                      <input 
                         type="number" 
                         value={formData.rollNo || ''}
                         onChange={e => setFormData({...formData, rollNo: e.target.value})}
                         className="w-full sm:w-1/2 text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none"
                         placeholder="Enter numbers only"
                      />
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { key: 'q1Range', label: 'Q.1 Range' },
                        { key: 'q2Accuracy', label: 'Q.2 Accuracy' },
                        { key: 'q3Fluency', label: 'Q.3 Fluency' },
                        { key: 'q4Interaction', label: 'Q.4 Interaction' },
                        { key: 'q5Coherence', label: 'Q.5 Coherence' }
                      ].map(q => (
                         <div key={q.key}>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">{q.label}</label>
                            <input 
                               type="number" 
                               min="0"
                               max="3"
                               value={formData[q.key as keyof AssessmentRecord] !== undefined ? formData[q.key as keyof AssessmentRecord] : ''}
                               onChange={e => {
                                 let val = e.target.value;
                                 if (val !== '' && (Number(val) < 0 || Number(val) > 3)) return;
                                 setFormData({...formData, [q.key]: val === '' ? '' : Number(val)});
                               }}
                               className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl p-3 focus:border-indigo-500 outline-none text-center"
                               placeholder="0 to 3"
                            />
                         </div>
                      ))}
                   </div>
                </div>
              )}

              <div className="pt-4 flex justify-start">
                 <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-3 rounded-xl shadow-md transition-all text-sm">
                   Submit Assessment
                 </button>
              </div>
           </form>
        </div>
      ) : selectedDivision ? (
        // STUDENTS LIST
        <div className="animate-fade-in text-left">
           <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setSelectedSchool(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Schools</button>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <button onClick={() => setSelectedClass(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">{selectedSchool}</button>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <button onClick={() => setSelectedDivision(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Class {selectedClass}</button>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-xs font-black text-slate-800">Div {selectedDivision}</span>
           </div>

           <div className="grid grid-cols-1 gap-3">
             {filteredStudents.map(student => {
               const isDuplicate = (duplicatesMap.get(`${student.schoolName}|${student.classGrade}|${student.division}|${student.studentName}`) || 0) > 1;
               const record = getRecord(student.id);
               return (
                 <button 
                   key={student.id} 
                   onClick={() => handleStudentClick(student)}
                   className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-sm ${getStudentStatusColor(student.id)}`}
                 >
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center border font-bold text-sm shadow-inner shrink-0">
                         {student.studentName.charAt(0)}
                      </div>
                      <div className="text-left">
                         <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">{student.studentName}</p>
                            {isDuplicate && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Duplicate Warning</span>}
                         </div>
                         <p className="text-[10px] font-semibold opacity-70 mt-0.5">Sr. No: {student.srNo} • {student.gender}</p>
                         
                         {((record?.examiners && record.examiners.length > 0) || record?.examiner1) && (
                            <div className="flex flex-wrap gap-2 mt-1">
                               {record.examiners && record.examiners.length > 0 ? (
                                  record.examiners.map((ex, idx) => (
                                    <span key={idx} className="text-[10px] font-semibold text-indigo-600">
                                      {record.examiners!.length > 1 ? `Examiner ${idx + 1}: ${ex}` : `Examiner: ${ex}`}
                                    </span>
                                  ))
                               ) : (
                                  <>
                                     <span className="text-[10px] font-semibold text-indigo-600">{record.examiner2 ? `Examiner 1: ${record.examiner1}` : `Examiner: ${record.examiner1}`}</span>
                                     {record.examiner2 && <span className="text-[10px] font-semibold text-rose-600">Examiner 2: {record.examiner2}</span>}
                                  </>
                               )}
                            </div>
                         )}
                      </div>
                   </div>
                   <div>
                      {getStudentStatusBadge(student.id)}
                   </div>
                 </button>
               )
             })}
           </div>
        </div>
      ) : selectedClass ? (
        // DIVISIONS
        <div className="animate-fade-in text-left">
           <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setSelectedSchool(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Schools</button>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <button onClick={() => setSelectedClass(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">{selectedSchool}</button>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-xs font-black text-slate-800">Class {selectedClass}</span>
           </div>
           
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {divisions.map(div => (
                 <button 
                   key={div} 
                   onClick={() => setSelectedDivision(div)}
                   className="bg-white border border-slate-200 hover:border-indigo-400 p-6 rounded-2xl text-center shadow-sm transition-all hover:shadow-md group"
                 >
                    <Folder className="w-10 h-10 text-indigo-200 group-hover:text-indigo-500 mx-auto mb-3 transition-colors" />
                    <p className="font-black text-slate-800">Div {div}</p>
                 </button>
              ))}
           </div>
        </div>
      ) : selectedSchool ? (
        // CLASSES
        <div className="animate-fade-in text-left">
           <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setSelectedSchool(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Schools</button>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-xs font-black text-slate-800">{selectedSchool}</span>
           </div>

           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {classes.map(cls => (
                 <button 
                   key={cls} 
                   onClick={() => setSelectedClass(cls)}
                   className="bg-white border border-slate-200 hover:border-indigo-400 p-6 rounded-2xl text-center shadow-sm transition-all hover:shadow-md group"
                 >
                    <Folder className="w-10 h-10 text-rose-200 group-hover:text-rose-500 mx-auto mb-3 transition-colors" />
                    <p className="font-black text-slate-800">Class {cls}</p>
                 </button>
              ))}
           </div>
        </div>
      ) : (
        // SCHOOLS
        <div className="animate-fade-in text-left">
           <h3 className="text-sm font-black text-slate-800 mb-4 px-1">Select School</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {schools.map(school => (
                 <button 
                   key={school} 
                   onClick={() => setSelectedSchool(school)}
                   className="bg-white border border-slate-200 hover:border-indigo-400 p-6 rounded-2xl text-left shadow-sm transition-all hover:shadow-md group flex items-center gap-4"
                 >
                    <Folder className="w-10 h-10 text-amber-200 group-hover:text-amber-500 shrink-0 transition-colors" />
                    <p className="font-black text-slate-800 text-sm">{school}</p>
                 </button>
              ))}
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4 text-left">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-500 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-black text-slate-900 text-center mb-3">
              {deleteStep === 1 ? 'Delete All Uploaded Data?' : 'Are you absolutely sure?'}
            </h3>
            
            <p className="text-sm font-semibold text-slate-500 text-center mb-8 leading-relaxed">
              {deleteStep === 1 
                ? 'This will remove all uploaded students from the system. It will not clear assessed records.' 
                : 'This action is irreversible and will permanently clear all the uploaded Excel data from your device.'}
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteStep(0)} 
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => deleteStep === 1 ? setDeleteStep(2) : handleClearData()} 
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
              >
                {deleteStep === 1 ? 'Yes, Continue' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
