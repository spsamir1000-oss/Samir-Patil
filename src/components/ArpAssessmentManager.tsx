import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Folder, 
  User, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Calendar, 
  Trash2, 
  AlertTriangle, 
  DownloadCloud, 
  Loader2,
  FolderOpen
} from 'lucide-react';
import { Teacher, Student } from '../types';

interface UploadedStudent {
  id: string;
  srNo: string;
  schoolName: string;
  studentName: string;
  classGrade: string;
  division: string;
  medium: string;
  gender: string;
}

interface AssessmentRecord {
  id: string; // studentId + type (+ module if module)
  studentId: string;
  type: string; // boardable_baseline, boardable_endline, module
  date: string;
  attendance: 'Present' | 'Absent' | '';
  section1?: number | '';
  section2?: number | '';
  status: 'Unassessed' | 'Absent' | 'Incomplete' | 'Completed' | 'Error';
  errorMsg?: string;
  examiner1?: string;
  examiners?: string[];
  module?: string;
}

const determineRecordStatusAndErrors = (
  attendance: 'Present' | 'Absent' | '',
  sec1: number | undefined | '',
  sec2: number | undefined | '',
  classGrade: string
): { status: 'Completed' | 'Incomplete' | 'Absent' | 'Error'; errorMsg?: string } => {
  if (attendance === 'Absent') {
    const s1Filled = sec1 !== undefined && sec1 !== null && sec1 !== '';
    const s2Filled = sec2 !== undefined && sec2 !== null && sec2 !== '';
    if (s1Filled || s2Filled) {
      return { 
        status: 'Error', 
        errorMsg: 'विद्यार्थी गैरहजर असताना गुण भरले आहेत (Marks entered while student is Absent)' 
      };
    }
    return { status: 'Absent' };
  }

  // Attendance is Present or empty
  const s1Filled = sec1 !== undefined && sec1 !== null && sec1 !== '';
  const s2Filled = sec2 !== undefined && sec2 !== null && sec2 !== '';

  if (!s1Filled) {
    return { status: 'Incomplete' };
  }

  const s1Num = Number(sec1);
  if (s1Num < 0 || s1Num > 10) {
    return { 
      status: 'Error', 
      errorMsg: 'विभाग १ चे गुण ० ते १० च्या दरम्यान असावेत (Section 1 marks must be between 0 and 10)' 
    };
  }

  const classNum = parseInt(classGrade || '');

  // Section 2 applicable if Section 1 > 5 (and class is not 4)
  if (s1Num <= 5) {
    if (s2Filled) {
      return { 
        status: 'Error', 
        errorMsg: 'विभाग १ चे गुण ५ किंवा त्यापेक्षा कमी असताना विभाग २ चे गुण भरले आहेत (Section 2 filled when Section 1 <= 5)' 
      };
    }
    return { status: 'Completed' };
  } else {
    // Section 1 > 5
    if (classNum === 4) {
      if (s2Filled) {
        return { 
          status: 'Error', 
          errorMsg: 'इयत्ता ४ थी साठी विभाग २ लागू नाही तरीही गुण भरले आहेत (Section 2 not applicable for Class 4th)' 
        };
      }
      return { status: 'Completed' };
    }

    if (!s2Filled) {
      return { status: 'Incomplete' };
    }

    const s2Num = Number(sec2);
    if (s2Num < 0 || s2Num > 10) {
      return { 
        status: 'Error', 
        errorMsg: 'विभाग २ चे गुण ० ते १० च्या दरम्यान असावेत (Section 2 marks must be between 0 and 10)' 
      };
    }

    return { status: 'Completed' };
  }
};

interface ArpAssessmentManagerProps {
  assessmentType: 'boardable_baseline' | 'boardable_midline' | 'boardable_endline' | 'module';
  currentUser: Teacher | null;
  attendanceStudents?: Student[];
}

export default function ArpAssessmentManager({ assessmentType, currentUser, attendanceStudents }: ArpAssessmentManagerProps) {
  const studentsKey = 'arp_uploaded_students';
  const recordsKey = 'arp_assessment_records';

  const [students, setStudents] = useState<UploadedStudent[]>(() => {
    const saved = localStorage.getItem(studentsKey);
    if (saved) {
      try {
        const parsed: UploadedStudent[] = JSON.parse(saved);
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [records, setRecords] = useState<AssessmentRecord[]>(() => {
    const saved = localStorage.getItem(recordsKey);
    let parsed: AssessmentRecord[] = saved ? JSON.parse(saved) : [];
    // One-time automatic cleanup for boardable baseline records
    const hasCleaned = localStorage.getItem('arp_baseline_cleaned_v1');
    if (!hasCleaned && parsed.length > 0) {
      parsed = parsed.filter((r: any) => r.type !== 'boardable_baseline');
      localStorage.setItem(recordsKey, JSON.stringify(parsed));
      localStorage.setItem('arp_baseline_cleaned_v1', 'true');
    } else if (!hasCleaned) {
      localStorage.setItem('arp_baseline_cleaned_v1', 'true');
    }
    return parsed;
  });

  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<UploadedStudent | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('Module 1');

  // Custom Delete Confirmation State
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  // Custom Clear Baseline Records Confirmation State
  const [clearBaselineStep, setClearBaselineStep] = useState<0 | 1 | 2>(0);

  // Form State
  const [formData, setFormData] = useState<Partial<AssessmentRecord>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Form State
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualSchool, setManualSchool] = useState('');
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualClass, setManualClass] = useState('1');
  const [manualDivision, setManualDivision] = useState('A');
  const [manualMedium, setManualMedium] = useState('Marathi');
  const [manualGender, setManualGender] = useState('Boy');

  // Individual Student Delete Mode State
  const [isDeleteModeActive, setIsDeleteModeActive] = useState(false);
  const [deleteSelectedSchool, setDeleteSelectedSchool] = useState<string>('');
  const [deleteSelectedClass, setDeleteSelectedClass] = useState<string>('');
  const [deleteSelectedDivision, setDeleteSelectedDivision] = useState<string>('');
  const [studentToDelete, setStudentToDelete] = useState<UploadedStudent | null>(null);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState<0 | 1 | 2>(0);

  // Derived unique schools list from attendance
  const attendanceSchools = useMemo(() => {
    if (!attendanceStudents) return [];
    return Array.from(new Set(attendanceStudents.map(s => s.school))).sort();
  }, [attendanceStudents]);

  // Set default manual school on load
  React.useEffect(() => {
    if (attendanceSchools.length > 0 && !manualSchool) {
      setManualSchool(attendanceSchools[0]);
    }
  }, [attendanceSchools, manualSchool]);

  const handleCopyFromAttendance = () => {
    if (!attendanceStudents || attendanceStudents.length === 0) {
      alert("No student data found in the Attendance system to copy.");
      return;
    }

    const newUploaded: UploadedStudent[] = attendanceStudents.map((s, idx) => {
      let cls = s.std;
      if (cls === '1') cls = '1st';
      else if (cls === '2') cls = '2nd';
      else if (cls === '3') cls = '3rd';
      else if (!cls.endsWith('th') && !['1st', '2nd', '3rd'].includes(cls)) {
        cls = `${cls}th`;
      }

      let displayGender = 'Boy';
      if (s.gender) {
        const g = s.gender.toLowerCase();
        if (['female', 'girl', 'f', 'मुलगी', 'स्त्री', 'g'].includes(g)) {
          displayGender = 'Girl';
        }
      }

      return {
        id: s.id + "_arp_copied_" + idx,
        srNo: String(idx + 1),
        schoolName: s.school,
        studentName: s.name,
        classGrade: cls,
        division: s.div,
        medium: s.medium || 'Marathi',
        gender: displayGender
      };
    });

    setStudents(prev => {
      const existingKeys = new Set(prev.map(p => `${p.schoolName}|${p.classGrade}|${p.division}|${p.studentName}`.toLowerCase()));
      const filtered = newUploaded.filter(s => {
        const key = `${s.schoolName}|${s.classGrade}|${s.division}|${s.studentName}`.toLowerCase();
        return !existingKeys.has(key);
      });

      if (filtered.length === 0) {
        alert("All student names from Attendance already exist in the ARP system.");
        return prev;
      }

      const final = [...prev, ...filtered];
      localStorage.setItem(studentsKey, JSON.stringify(final));
      alert(`Successfully copied ${filtered.length} new students from Attendance! (They are automatically separated by School, Class, and Division)`);
      return final;
    });
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentName.trim() || !manualSchool) {
      alert("Please enter a student name and select a school.");
      return;
    }

    const normalizeClassNum = (c: string) => {
      if (c === '1') return '1st';
      if (c === '2') return '2nd';
      if (c === '3') return '3rd';
      return `${c}th`;
    };

    const normalizedClass = normalizeClassNum(manualClass);

    const newStudent: UploadedStudent = {
      id: "manual_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(7),
      srNo: String(students.length + 1),
      schoolName: manualSchool,
      studentName: manualStudentName.trim(),
      classGrade: normalizedClass,
      division: manualDivision,
      medium: manualMedium,
      gender: manualGender
    };

    setStudents(prev => {
      const exists = prev.some(s => 
        s.schoolName.toLowerCase() === newStudent.schoolName.toLowerCase() &&
        s.classGrade.toLowerCase() === newStudent.classGrade.toLowerCase() &&
        s.division.toLowerCase() === newStudent.division.toLowerCase() &&
        s.studentName.toLowerCase() === newStudent.studentName.toLowerCase()
      );

      if (exists) {
        alert("This student is already added to this school, class and division.");
        return prev;
      }

      const final = [...prev, newStudent];
      localStorage.setItem(studentsKey, JSON.stringify(final));
      alert("Student added successfully!");
      return final;
    });

    setManualStudentName('');
    setIsManualAddOpen(false);
  };

  const handleDeleteStudent = () => {
    if (!studentToDelete) return;
    const targetId = studentToDelete.id;

    // Remove student
    const updatedStudents = students.filter(s => s.id !== targetId);
    setStudents(updatedStudents);
    localStorage.setItem(studentsKey, JSON.stringify(updatedStudents));

    // Remove records
    const updatedRecords = records.filter(r => r.studentId !== targetId);
    setRecords(updatedRecords);
    localStorage.setItem(recordsKey, JSON.stringify(updatedRecords));

    window.dispatchEvent(new Event('arp-records-changed'));

    alert(`${studentToDelete.studentName} has been successfully deleted along with all their records.`);
    setStudentToDelete(null);
    setDeleteConfirmationStep(0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let allNewStudents: UploadedStudent[] = [];
    let allNewRecords: AssessmentRecord[] = [];

    const readExcelFile = (file: File): Promise<{ students: UploadedStudent[], records: AssessmentRecord[] }> => {
      const normalizeClass = (c: string) => {
        if (!c) return 'Unknown';
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
            
            const parsedStudents: UploadedStudent[] = [];
            const parsedRecords: AssessmentRecord[] = [];

            // Loop through all sheets/tabs in the Excel workbook
            for (const wsname of wb.SheetNames) {
              const ws = wb.Sheets[wsname];
              
              // Read as AOA to handle double row headers & merged columns reliably
              const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
              if (data.length === 0) continue;

              const row0 = data[0] || [];
              const row1 = data[1] || [];

              // Let's identify the column indices case-insensitively
              let srNoIndex = 0;
              let schoolNameIndex = 1;
              let studentNameIndex = 2;
              let classGradeIndex = 3;
              let divisionIndex = 4;
              let genderIndex = 5;
              let attendanceIndex = 6;
              let section1Index = 7;
              let section2Index = 8;

              // Search headers in row 0
              for (let c = 0; c < row0.length; c++) {
                const val = String(row0[c] || '').trim().toLowerCase();
                if (val.includes('sr.no') || val.includes('sr no') || val.includes('sr. no') || val === 'sr' || val.includes('serial')) {
                  srNoIndex = c;
                } else if (val.includes('school')) {
                  schoolNameIndex = c;
                } else if (val.includes('student name') || val.includes('students name') || val === 'name' || val.includes('student_name')) {
                  studentNameIndex = c;
                } else if (val === 'class' || val === 'grade' || val === 'std' || val === 'standard') {
                  classGradeIndex = c;
                } else if (val === 'division' || val === 'div' || val === 'sec') {
                  divisionIndex = c;
                } else if (val === 'gender' || val === 'sex') {
                  genderIndex = c;
                } else if (val === 'attendance' || val === 'att' || val === 'status') {
                  attendanceIndex = c;
                } else if (val === 'section 1' || val === 'section1' || val === 'sec 1' || val === 'sec1') {
                  section1Index = c;
                } else if (val === 'section 2' || val === 'section2' || val === 'sec 2' || val === 'sec2') {
                  section2Index = c;
                }
              }

              // Let's check row 1 to see if we have sub-headers
              let headerRowsCount = 1;
              const hasSectionInRow1 = row1.some(cell => {
                const str = String(cell || '').trim().toLowerCase();
                return str.includes('section') || str.includes('sec 1') || str.includes('sec 2') || str.includes('sec1') || str.includes('sec2');
              });

              if (hasSectionInRow1) {
                headerRowsCount = 2;
                for (let c = 0; c < row1.length; c++) {
                  const val = String(row1[c] || '').trim().toLowerCase();
                  if (val === 'section 1' || val === 'section1' || val === 'sec 1' || val === 'sec1') {
                    section1Index = c;
                  } else if (val === 'section 2' || val === 'section2' || val === 'sec 2' || val === 'sec2') {
                    section2Index = c;
                  }
                }
              }

              // Process data rows starting after the headers
              for (let i = headerRowsCount; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;

                // Extract values
                const rawStudentName = String(row[studentNameIndex] || '').trim();
                const rawSchoolName = String(row[schoolNameIndex] || '').trim();

                // Skip rows that don't have basic details
                if (!rawStudentName || rawStudentName === 'Unknown' || rawStudentName === '') continue;

                const srNo = String(row[srNoIndex] ?? (i - headerRowsCount + 1)).trim();
                const schoolName = rawSchoolName || 'Unknown School';
                const classGrade = normalizeClass(String(row[classGradeIndex] || 'Unknown'));
                const division = String(row[divisionIndex] || 'A').trim().toUpperCase();
                const rawGender = String(row[genderIndex] || '').trim().toLowerCase();
                const gender = (rawGender.includes('girl') || rawGender === 'f' || rawGender.includes('मुलगी')) ? 'Girl' : 'Boy';
                
                // Add unique suffix based on worksheet name to prevent overlap across tabs
                const wsSuffix = wsname.replace(/[^a-zA-Z0-9]/g, '');
                const studentId = Date.now().toString() + Math.random().toString(36).substring(7) + i + '_' + wsSuffix;

                const student: UploadedStudent = {
                  id: studentId,
                  srNo,
                  schoolName,
                  classGrade,
                  division,
                  medium: 'Marathi',
                  gender,
                  studentName: rawStudentName
                };

                // Parse marks / attendance
                const rawAttendance = String(row[attendanceIndex] || '').trim().toLowerCase();
                let attendanceVal: 'Present' | 'Absent' = 'Present';
                if (rawAttendance.includes('absent') || rawAttendance.includes('abs') || rawAttendance.includes('गैरहजर')) {
                  attendanceVal = 'Absent';
                }

                const rawS1 = row[section1Index];
                const rawS2 = row[section2Index];

                const sec1Val = (rawS1 !== undefined && rawS1 !== '' && rawS1 !== null) ? Number(rawS1) : undefined;
                const sec2Val = (rawS2 !== undefined && rawS2 !== '' && rawS2 !== null) ? Number(rawS2) : undefined;

                // Determine status and errors using our robust validator
                const validation = determineRecordStatusAndErrors(
                  attendanceVal, 
                  (sec1Val !== undefined && !isNaN(sec1Val)) ? sec1Val : '', 
                  (sec2Val !== undefined && !isNaN(sec2Val)) ? sec2Val : '', 
                  classGrade
                );

                const currentUserName = currentUser?.name || 'Unknown';
                const recordId = `${studentId}_${assessmentType}`;

                const record: AssessmentRecord = {
                  id: recordId,
                  studentId: studentId,
                  type: assessmentType,
                  date: new Date().toISOString().split('T')[0],
                  attendance: attendanceVal,
                  section1: (attendanceVal === 'Absent' || sec1Val === undefined || isNaN(sec1Val)) ? undefined : sec1Val,
                  section2: (attendanceVal === 'Absent' || sec2Val === undefined || isNaN(sec2Val)) ? undefined : sec2Val,
                  status: validation.status,
                  errorMsg: validation.errorMsg,
                  examiners: [currentUserName],
                  examiner1: currentUserName
                };

                parsedStudents.push(student);
                parsedRecords.push(record);
              }
            }

            resolve({ students: parsedStudents, records: parsedRecords });
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
        const fileData = await readExcelFile(files[i]);
        allNewStudents = [...allNewStudents, ...fileData.students];
        allNewRecords = [...allNewRecords, ...fileData.records];
      }

      // Filter out duplicate school + division combinations that are already uploaded
      const existingSchoolDivisions = new Set(
        students.map(s => `${s.schoolName.trim().toLowerCase()}||${s.division.trim().toLowerCase()}`)
      );

      const acceptedStudents: UploadedStudent[] = [];
      const acceptedRecords: AssessmentRecord[] = [];
      const skippedSchoolDivs = new Set<string>();

      for (let i = 0; i < allNewStudents.length; i++) {
        const student = allNewStudents[i];
        const record = allNewRecords[i];
        const key = `${student.schoolName.trim().toLowerCase()}||${student.division.trim().toLowerCase()}`;

        if (existingSchoolDivisions.has(key)) {
          skippedSchoolDivs.add(`${student.schoolName} (${student.division})`);
        } else {
          acceptedStudents.push(student);
          acceptedRecords.push(record);
        }
      }

      if (acceptedStudents.length === 0) {
        if (skippedSchoolDivs.size > 0) {
          alert(`अपलोड अयशस्वी: निवडलेल्या शाळा आणि तुकडीचा डेटा आधीच अस्तित्वात आहे.\n(Upload failed: Data for the selected schools and divisions already exists: ${Array.from(skippedSchoolDivs).join(', ')})`);
        } else {
          alert("फाईलमध्ये कोणताही वैध डेटा आढळला नाही. (No valid data found in the file.)");
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setStudents(prev => {
        const finalStudents = [...prev, ...acceptedStudents];
        localStorage.setItem(studentsKey, JSON.stringify(finalStudents));
        return finalStudents;
      });

      setRecords(prev => {
        // Filter out existing records for any newly imported student IDs to avoid duplicates
        const acceptedStudentIds = new Set(acceptedStudents.map(s => s.id));
        const finalRecords = [...prev.filter(r => !acceptedStudentIds.has(r.studentId)), ...acceptedRecords];
        localStorage.setItem(recordsKey, JSON.stringify(finalRecords));
        return finalRecords;
      });

      window.dispatchEvent(new Event('arp-records-changed'));

      if (skippedSchoolDivs.size > 0) {
        alert(`यशस्वीरित्या अपलोड झाले! परंतु खालील शाळा आणि तुकडीचा डेटा आधीच अस्तित्वात असल्यामुळे वगळला आहे:\n${Array.from(skippedSchoolDivs).join(', ')}\n\n(Uploaded successfully! However, data for the following schools and divisions was skipped as it already exists)`);
      } else {
        alert("Excel file(s) uploaded successfully! Students and their baseline records are updated.");
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      alert("Error parsing Excel file(s). Please ensure the format matches the template.");
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

  const handleDownloadTemplate = () => {
    const templateData = [
      ['Sr.No.', 'School Name', 'Students Name', 'Class', 'Division', 'Gender', 'Attendance', 'Marks', ''],
      ['', '', '', '', '', '', '', 'Section 1', 'Section 2'],
      [1, 'School A', 'Arjun Patil', '5th', 'A', 'Boy', 'Present', 8, 7],
      [2, 'School A', 'Neha Deshmukh', '5th', 'A', 'Girl', 'Present', 4, ''],
      [3, 'School A', 'Rahul Shinde', '5th', 'A', 'Boy', 'Absent', '', ''],
      [4, 'School B', 'Sakshi More', '6th', 'B', 'Girl', 'Present', 5, '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Add merging metadata
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Sr.No.
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // School Name
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // Students Name
      { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // Class
      { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }, // Division
      { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } }, // Gender
      { s: { r: 0, c: 6 }, e: { r: 1, c: 6 } }, // Attendance
      { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } }, // Marks (merged across H & I)
    ];

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 8 },  // Sr.No.
      { wch: 20 }, // School Name
      { wch: 25 }, // Students Name
      { wch: 10 }, // Class
      { wch: 10 }, // Division
      { wch: 10 }, // Gender
      { wch: 12 }, // Attendance
      { wch: 12 }, // Section 1
      { wch: 12 }  // Section 2
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Baseline Template");
    XLSX.writeFile(wb, "Boardable_Baseline_Template.xlsx");
  };

  const handleClearBaselineRecords = () => {
    const updatedRecords = records.filter(r => r.type !== 'boardable_baseline');
    setRecords(updatedRecords);
    localStorage.setItem(recordsKey, JSON.stringify(updatedRecords));

    // Clear uploaded students
    setStudents([]);
    localStorage.removeItem(studentsKey);

    // Reset all selection states to null so the screen becomes completely blank
    setSelectedSchool(null);
    setSelectedClass(null);
    setSelectedDivision(null);
    setSelectedStudent(null);

    setClearBaselineStep(0);
    window.dispatchEvent(new Event('arp-records-changed'));
    alert("सर्व बोर्डेबल बेसलाइन डेटा आणि विद्यार्थ्यांचे रेकॉर्ड यशस्वीरित्या काढून टाकण्यात आले आहेत!");
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

  const getStudentLevel = (student: UploadedStudent) => {
    const targetType = (assessmentType === 'boardable_midline' || assessmentType === 'boardable_endline')
      ? assessmentType
      : 'boardable_baseline';
    const baselineRecord = records.find(r => r.studentId === student.id && r.type === targetType);
    if (!baselineRecord || baselineRecord.attendance === 'Absent' || baselineRecord.section1 === undefined) {
      return "";
    }
    
    const classGrade = student.classGrade || '';
    const classNum = parseInt(classGrade);
    if (isNaN(classNum)) return "";

    const sec1 = Number(baselineRecord.section1);
    const sec2 = baselineRecord.section2 !== undefined && baselineRecord.section2 !== null && baselineRecord.section2 !== '' ? Number(baselineRecord.section2) : undefined;

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

    return "";
  };

  const getLevelBadge = (student: UploadedStudent) => {
    const level = getStudentLevel(student);
    if (!level) return null;

    let badgeColor = "bg-slate-100 text-slate-800 border-slate-200";
    if (level === "FLN BC") badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
    else if (level === "PSG BC") badgeColor = "bg-orange-100 text-orange-800 border-orange-200";
    else if (level === "PSG Acquire") badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
    else if (level === "PSG Enhance") badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
    else if (level === "MSG Acquire") badgeColor = "bg-sky-100 text-sky-800 border-sky-200";
    else if (level === "MSG Enhance") badgeColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
    else if (level === "Support Classes") badgeColor = "bg-purple-100 text-purple-800 border-purple-200";

    return (
      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-xs ${badgeColor}`}>
        Level: {level}
      </span>
    );
  };

  const handleStudentClick = (student: UploadedStudent) => {
    const existingRecord = getRecord(student.id);
    setSelectedStudent(student);
    if (existingRecord) {
      setFormData(existingRecord);
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        attendance: '',
        section1: '',
        section2: ''
      });
    }
  };

  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !formData.date || !formData.attendance) {
      alert("Please fill date and attendance.");
      return;
    }

    const s1 = formData.section1;
    const s2 = formData.section2;

    const validation = determineRecordStatusAndErrors(
      formData.attendance as 'Present' | 'Absent',
      s1,
      s2,
      selectedStudent.classGrade
    );

    const currentUserName = currentUser?.name || 'Unknown';

    const recordId = assessmentType === 'module' 
      ? `${selectedStudent.id}_${assessmentType}_${selectedModule}` 
      : `${selectedStudent.id}_${assessmentType}`;

    const finalSection1 = formData.attendance === 'Absent' ? undefined : (s1 === '' ? undefined : Number(s1));
    const finalSection2 = formData.attendance === 'Absent' || (finalSection1 !== undefined && finalSection1 <= 5) ? undefined : (s2 === '' ? undefined : Number(s2));

    const newRecord: AssessmentRecord = {
      id: recordId,
      studentId: selectedStudent.id,
      type: assessmentType,
      date: formData.date as string,
      attendance: formData.attendance as 'Present' | 'Absent',
      section1: finalSection1,
      section2: finalSection2,
      status: validation.status,
      errorMsg: validation.errorMsg,
      examiners: [currentUserName],
      examiner1: currentUserName,
      module: assessmentType === 'module' ? selectedModule : undefined
    };

    const updatedRecords = records.filter(r => r.id !== newRecord.id);
    updatedRecords.push(newRecord);
    
    setRecords(updatedRecords);
    localStorage.setItem(recordsKey, JSON.stringify(updatedRecords));
    window.dispatchEvent(new Event('arp-records-changed'));

    setSelectedStudent(null);
  };

  const getStudentStatusColor = (studentId: string) => {
    const rec = getRecord(studentId);
    if (!rec || rec.status === 'Unassessed') return 'bg-white border-slate-200 hover:border-slate-300 text-slate-700';
    if (rec.status === 'Error') return 'bg-rose-50/50 border-rose-300 text-rose-900';
    if (rec.status === 'Absent') return 'bg-rose-50 border-rose-200 text-rose-800';
    if (rec.status === 'Completed') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    return 'bg-amber-50 border-amber-200 text-amber-800'; // Incomplete
  };

  const getStudentStatusBadge = (studentId: string) => {
    const rec = getRecord(studentId);
    if (!rec || rec.status === 'Unassessed') return null;
    if (rec.status === 'Error') return <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Error</span>;
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
        "Sr. No.", "School Name", "Student Name", "Class", "Division", "Medium",
        "Gender", "Attendance", "Section 1", "Section 2", "Total Marks", "Date", "Examiner"
      ];

      let srNoCounter = 1;
      let rowNum = 2; // header is row 1

      const rows = students.map(student => {
        const record = getRecord(student.id);
        
        let date = '', examinerLabel = '';
        
        if (record && record.status !== 'Unassessed' && record.status !== 'Absent') {
           const s1 = Number(record.section1) || 0;
           const s2 = Number(record.section2) || 0;
           
           const totalMarks = s1 + s2;
           const obtainedFormula = { f: `SUM(I${rowNum}:J${rowNum})`, v: totalMarks };
           date = record.date || '';

           if (record.examiners && record.examiners.length > 0) {
              examinerLabel = record.examiners.join(', ');
           } else if (record.examiner1) {
              examinerLabel = record.examiner1;
           }

           const row = [
             srNoCounter++, student.schoolName, student.studentName,
             student.classGrade, student.division, student.medium, student.gender, record.attendance || 'Present',
             s1, s2, obtainedFormula, date, examinerLabel
           ];
           rowNum++;
           return row;
        } else if (record?.status === 'Absent') {
           date = record.date || '';
           if (record.examiners && record.examiners.length > 0) examinerLabel = record.examiners.join(', ');
           else if (record.examiner1) examinerLabel = record.examiner1;
           const row = [
             srNoCounter++, student.schoolName, student.studentName,
             student.classGrade, student.division, student.medium, student.gender, 'Absent',
             "", "", "Absent", date, examinerLabel
           ];
           rowNum++;
           return row;
        }

        const row = [
           srNoCounter++, student.schoolName, student.studentName,
           student.classGrade, student.division, student.medium, student.gender, 'Unassessed',
           "", "", "Unassessed", "", ""
        ];
        rowNum++;
        return row;
      });

      const exportData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Assessment_${assessmentType}`);
      
      const fileName = `Assessment_Export_ARP_${assessmentType}_${new Date().toISOString().split('T')[0]}.xlsx`;

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
          assessmentType: `arp_${assessmentType}`,
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

  const displayTitle = useMemo(() => {
    if (assessmentType === 'boardable_baseline') return 'Boardable Baseline';
    if (assessmentType === 'boardable_midline') return 'Boardable Midline';
    if (assessmentType === 'boardable_endline') return 'Boardable Endline';
    return 'Examination';
  }, [assessmentType]);

  const isBoardablePhase = assessmentType === 'boardable_baseline' || assessmentType === 'boardable_midline' || assessmentType === 'boardable_endline';

  return (
    <div className="w-full">
      {/* Action panel container (For Boardable Baseline, Midline, and Endline) */}
      {isBoardablePhase && (
        <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-3xl p-5 mb-6 space-y-4 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-indigo-900">Manage Student Records (विद्यार्थी नोंद व्यवस्थापन)</p>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                {assessmentType === 'boardable_baseline' 
                  ? "Upload Excel, copy names from Attendance, add manually, or delete students to organize your examinations."
                  : "Add manually or delete students to organize your examinations."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {assessmentType === 'boardable_baseline' && currentUser?.role === 'admin' && (
                <>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    multiple
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                    id={`excel-upload-arp-${assessmentType}`}
                  />
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
                  >
                    <DownloadCloud className="w-3.5 h-3.5 text-indigo-500" />
                    Download Template
                  </button>
                  <label
                    htmlFor={`excel-upload-arp-${assessmentType}`}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Excel
                  </label>
                </>
              )}

              {assessmentType === 'boardable_baseline' && (
                <button
                  type="button"
                  onClick={handleCopyFromAttendance}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-all"
                  title="attendance मधून नावे कॉपी करा"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Copy from Attendance
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsManualAddOpen(!isManualAddOpen);
                  setIsDeleteModeActive(false);
                }}
                className={`flex items-center gap-1.5 font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-all ${
                  isManualAddOpen 
                    ? 'bg-amber-600 text-white hover:bg-amber-700' 
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Add Manually
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDeleteModeActive(!isDeleteModeActive);
                  setIsManualAddOpen(false);
                }}
                className={`flex items-center gap-1.5 font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-all ${
                  isDeleteModeActive 
                    ? 'bg-rose-600 text-white hover:bg-rose-700' 
                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Students
              </button>

              {assessmentType === 'boardable_baseline' && (
                <button
                  type="button"
                  onClick={() => setClearBaselineStep(1)}
                  className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer shadow-xs transition-all"
                  title="सर्व बोर्डेबल बेसलाइन डेटा काढून टाका"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  Clear Baseline Records
                </button>
              )}


            </div>
          </div>

          {/* Form to add student manually */}
          {isManualAddOpen && (
            <form onSubmit={handleManualAddSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 animate-fade-in text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                <h4 className="text-xs font-black uppercase text-amber-800 tracking-wider">Add Student Manually (मॅन्युअली विद्यार्थी जोडा)</h4>
                <button type="button" onClick={() => setIsManualAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* School Dropdown */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">School Name (शाळेचे नाव)</label>
                  <select
                    value={manualSchool}
                    onChange={e => setManualSchool(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
                    required
                  >
                    {attendanceSchools.length === 0 ? (
                      <option value="">No Schools found in Attendance</option>
                    ) : (
                      attendanceSchools.map(sch => (
                        <option key={sch} value={sch}>{sch}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Student Name */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Student Name (विद्यार्थ्याचे नाव)</label>
                  <input
                    type="text"
                    value={manualStudentName}
                    onChange={e => setManualStudentName(e.target.value)}
                    placeholder="नाव टाईप करा..."
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>

                {/* Class Dropdown */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Class (इयत्ता)</label>
                  <select
                    value={manualClass}
                    onChange={e => setManualClass(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
                    required
                  >
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>

                {/* Division Dropdown */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Division (तुकडी)</label>
                  <select
                    value={manualDivision}
                    onChange={e => setManualDivision(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
                    required
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(d => (
                      <option key={d} value={d}>Division {d}</option>
                    ))}
                  </select>
                </div>

                {/* Medium Dropdown */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Medium (माध्यम)</label>
                  <select
                    value={manualMedium}
                    onChange={e => setManualMedium(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
                    required
                  >
                    {['Marathi', 'Semi English', 'Hindi'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Gender Dropdown */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Gender (लिंग)</label>
                  <select
                    value={manualGender}
                    onChange={e => setManualGender(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
                    required
                  >
                    <option value="Boy">Boy (मुलगा)</option>
                    <option value="Girl">Girl (मुलगी)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition-all text-xs"
                >
                  Add Student (विद्यार्थी जोडा)
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
           <div className="text-left">
              {assessmentType === 'module' && (
                 <div className="flex items-center gap-3 bg-slate-100 border border-slate-200/60 rounded-xl px-4 py-2 transition-all">
                    <span className="text-[10px] font-black uppercase text-slate-400">Assessing Module</span>
                    <select
                       value={selectedModule}
                       onChange={e => setSelectedModule(e.target.value)}
                       className="bg-transparent border-none text-xs font-black text-indigo-700 focus:outline-none cursor-pointer outline-none"
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

      {isDeleteModeActive ? (
        // DELETE STUDENTS SCREEN
        <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-5 sm:p-6 animate-fade-in text-left space-y-6">
          <div className="flex items-center justify-between border-b border-rose-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-rose-950">Delete Students (विद्यार्थी डिलीट करा)</h3>
              <p className="text-xs text-rose-600/80 font-bold uppercase tracking-wider mt-1">
                Select School, Class, and Division to view student records and delete them permanently.
              </p>
            </div>
            <button
              onClick={() => setIsDeleteModeActive(false)}
              className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition-colors"
            >
              Back to Examination
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* School Dropdown */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">School (शाळा)</label>
              <select
                value={deleteSelectedSchool}
                onChange={e => {
                  setDeleteSelectedSchool(e.target.value);
                  setDeleteSelectedClass('');
                  setDeleteSelectedDivision('');
                }}
                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
              >
                <option value="">-- Select School --</option>
                {schools.map(sch => (
                  <option key={sch} value={sch}>{sch}</option>
                ))}
              </select>
            </div>

            {/* Class Dropdown */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Class (इयत्ता)</label>
              <select
                value={deleteSelectedClass}
                onChange={e => {
                  setDeleteSelectedClass(e.target.value);
                  setDeleteSelectedDivision('');
                }}
                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
                disabled={!deleteSelectedSchool}
              >
                <option value="">-- Select Class --</option>
                {/* Dynamically get classes for this selected school */}
                {Array.from(new Set(students.filter(s => s.schoolName === deleteSelectedSchool).map(s => s.classGrade))).sort().map(cls => (
                  <option key={cls} value={cls}>Class {cls}</option>
                ))}
              </select>
            </div>

            {/* Division Dropdown */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Division (तुकडी)</label>
              <select
                value={deleteSelectedDivision}
                onChange={e => setDeleteSelectedDivision(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 outline-none"
                disabled={!deleteSelectedClass}
              >
                <option value="">-- Select Division --</option>
                {/* Dynamically get divisions for this selected class */}
                {Array.from(new Set(students.filter(s => s.schoolName === deleteSelectedSchool && s.classGrade === deleteSelectedClass).map(s => s.division))).sort().map(div => (
                  <option key={div} value={div}>Division {div}</option>
                ))}
              </select>
            </div>
          </div>

          {deleteSelectedSchool && deleteSelectedClass && deleteSelectedDivision ? (
            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Students List ({students.filter(s => s.schoolName === deleteSelectedSchool && s.classGrade === deleteSelectedClass && s.division === deleteSelectedDivision).length} Students)
              </h4>

              {students.filter(s => s.schoolName === deleteSelectedSchool && s.classGrade === deleteSelectedClass && s.division === deleteSelectedDivision).length === 0 ? (
                <p className="text-xs font-bold text-slate-400">No students found in this division.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {students.filter(s => s.schoolName === deleteSelectedSchool && s.classGrade === deleteSelectedClass && s.division === deleteSelectedDivision).map(student => (
                    <div 
                      key={student.id}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-800">{student.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Sr No: {student.srNo} • Medium: {student.medium} • Gender: {student.gender}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setStudentToDelete(student);
                          setDeleteConfirmationStep(1);
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 font-bold text-xs">
              Please select School, Class, and Division above to list students.
            </div>
          )}
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
           <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
           <p className="text-sm font-bold text-slate-500">No students uploaded yet.</p>
           {assessmentType === 'boardable_baseline' ? (
             <p className="text-xs font-semibold text-slate-400 mt-1">Please upload an Excel sheet, copy from attendance, or add manually to begin examination.</p>
           ) : (assessmentType === 'boardable_midline' || assessmentType === 'boardable_endline') ? (
             <p className="text-xs font-semibold text-slate-400 mt-1">Please add student manually or go to <strong>Boardable Baseline</strong> to upload student data first.</p>
           ) : (
             <p className="text-xs font-semibold text-slate-400 mt-1">Please go to <strong>Boardable Baseline</strong> to upload or copy student data first.</p>
           )}
        </div>
      ) : selectedStudent ? (
        // STUDENT MARKS FILLING SCREEN (CUSTOM DESIGNED)
        <div className="bg-white border text-left border-slate-200 rounded-2xl p-5 sm:p-8 animate-fade-in">
           <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Student List
           </button>

           <div className="flex items-start justify-between mb-8 border-b border-slate-100 pb-5">
              <div>
                 <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-black text-slate-900">{selectedStudent.studentName}</h3>
                    {getLevelBadge(selectedStudent)}
                 </div>
                 <p className="text-xs font-bold text-slate-500 mt-1">
                   {selectedSchool} • Class {selectedClass} ({selectedDivision}) • Medium: {selectedStudent.medium} • {selectedStudent.gender}
                 </p>
              </div>
           </div>

           <form onSubmit={handleSaveAssessment} className="space-y-6 max-w-2xl text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Examination Date</label>
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
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Attendance (हजेरी)</label>
                    <div className="flex gap-3">
                       <button
                         type="button"
                         onClick={() => setFormData({...formData, attendance: 'Present'})}
                         className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-colors ${formData.attendance === 'Present' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-black' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                       >
                         Present (हजर)
                       </button>
                       <button
                         type="button"
                         onClick={() => setFormData({...formData, attendance: 'Absent', section1: '', section2: ''})}
                         className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-colors ${formData.attendance === 'Absent' ? 'bg-rose-600 border-rose-600 text-white shadow-sm font-black' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                       >
                         Absent (गैरहजर)
                       </button>
                    </div>
                 </div>
              </div>

              {formData.attendance === 'Present' && (
                <div className="animate-fade-in bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Section - 1 */}
                      <div>
                         <label className="text-xs font-black uppercase text-indigo-800 mb-2 block">Section - 1 (विभाग १) Marks:</label>
                         <input 
                            type="number" 
                            min="0"
                            max="10"
                            value={formData.section1 !== undefined ? formData.section1 : ''}
                            onChange={e => {
                              let val = e.target.value;
                              if (val !== '') {
                                const num = Number(val);
                                if (num < 0 || num > 10) return;
                              }
                              const updatedVal = val === '' ? '' : Number(val);
                              // If Section 1 is modified to <= 5, automatically reset Section 2
                              setFormData({
                                ...formData, 
                                section1: updatedVal,
                                section2: (updatedVal !== '' && updatedVal > 5) ? formData.section2 : ''
                              });
                            }}
                            className="w-full text-sm font-black bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-xl p-3 outline-none text-center"
                            placeholder="0 to 10"
                            required
                         />
                         <span className="text-[10px] text-slate-400 font-semibold block mt-1">Section 1 details: maximum 10 marks (विभाग १: जास्तीत जास्त १० गुण)</span>
                      </div>

                      {/* Section - 2 (Conditional: opens only if section 1 > 5) */}
                      {formData.section1 !== undefined && formData.section1 !== '' && Number(formData.section1) > 5 && (
                         <div className="animate-fade-in">
                            <label className="text-xs font-black uppercase text-emerald-800 mb-2 block">Section - 2 (विभाग २) Marks:</label>
                            <input 
                               type="number" 
                               min="0"
                               max="10"
                               value={formData.section2 !== undefined ? formData.section2 : ''}
                               onChange={e => {
                                 let val = e.target.value;
                                 if (val !== '') {
                                   const num = Number(val);
                                   if (num < 0 || num > 10) return;
                                 }
                                 setFormData({...formData, section2: val === '' ? '' : Number(val)});
                               }}
                               className="w-full text-sm font-black bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-xl p-3 outline-none text-center"
                               placeholder="0 to 10"
                            />
                            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Section 2 details: maximum 10 marks (विभाग २: जास्तीत जास्त १० गुण)</span>
                         </div>
                      )}
                   </div>
                </div>
              )}

              {/* Submit button at the bottom */}
              <div className="pt-4 flex justify-start">
                 <button 
                   type="submit" 
                   className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-10 py-4 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-xs uppercase tracking-wider"
                 >
                   Submit Examination
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
                         <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-slate-800 hover:text-indigo-600">{student.studentName}</p>
                            {isDuplicate && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Duplicate Warning</span>}
                            {getLevelBadge(student)}
                         </div>
                         <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                           Sr. No: {student.srNo} • Class: {student.classGrade} • Div: {student.division} • Medium: {student.medium} • {student.gender}
                         </p>
                         
                         {record && (record.status === 'Error' || record.attendance === 'Present') && (() => {
                            const s1Val = record.section1 !== undefined && record.section1 !== null && record.section1 !== '' ? Number(record.section1) : null;
                            const s2Val = record.section2 !== undefined && record.section2 !== null && record.section2 !== '' ? Number(record.section2) : null;
                            const hasS2 = s2Val !== null;

                            const s1CardPct = s1Val !== null ? (s1Val / 10) * 100 : null;
                            const s2CardPct = s2Val !== null ? (s2Val / 10) * 100 : null;
                            const combinedCardPct = s1Val !== null && s2Val !== null
                              ? ((s1Val + s2Val) / 20) * 100
                              : s1Val !== null
                                ? (s1Val / 10) * 100
                                : null;

                            return (
                              <div className="mt-2 space-y-1 bg-indigo-50/50 border border-indigo-100 rounded-xl p-2 px-2.5 w-fit">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-indigo-900">
                                  <span>S1: <strong className="text-slate-900">{s1Val !== null ? `${s1Val}/10` : '-'}</strong> {s1CardPct !== null ? `(${Math.round(s1CardPct)}%)` : ''}</span>
                                  <span className="text-slate-300">|</span>
                                  <span>S2: <strong className="text-slate-900">{hasS2 ? `${s2Val}/10` : 'N/A'}</strong> {hasS2 && s2CardPct !== null ? `(${Math.round(s2CardPct)}%)` : ''}</span>
                                </div>
                                {combinedCardPct !== null && (
                                  <p className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wide">
                                    Combined Pct: <strong className="text-indigo-950 font-black">{Math.round(combinedCardPct)}%</strong>
                                  </p>
                                )}
                              </div>
                            );
                         })()}

                         {record && record.status === 'Error' && record.errorMsg && (
                            <p className="text-[11px] font-black text-rose-600 mt-1.5 flex items-center gap-1.5 bg-rose-100/50 border border-rose-200 rounded-xl px-3 py-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {record.errorMsg}
                            </p>
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

      {/* Clear Baseline Records Confirmation Modal */}
      {clearBaselineStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4 text-left">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-500 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-black text-slate-900 text-center mb-3">
              {clearBaselineStep === 1 ? 'सर्व बेसलाइन डेटा काढायचा?' : 'नक्की खात्री आहे का?'}
            </h3>
            
            <p className="text-sm font-semibold text-slate-500 text-center mb-8 leading-relaxed">
              {clearBaselineStep === 1 
                ? 'याने सर्व विद्यार्थ्यांचे बोर्डेबल बेसलाइन परीक्षेचे भरलेले गुण आणि रेकॉर्ड्स निघून जातील.' 
                : 'हा बदल परत करता येणार नाही. तुमच्या डिव्हाइसवरून सर्व विद्यार्थ्यांचे बेसलाइन गुण पूर्णपणे डिलीट होतील.'}
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setClearBaselineStep(0)} 
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel (रद्द करा)
              </button>
              <button 
                onClick={() => clearBaselineStep === 1 ? setClearBaselineStep(2) : handleClearBaselineRecords()} 
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
              >
                {clearBaselineStep === 1 ? 'Yes, Continue' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Deletion Double Confirmation Modals */}
      {deleteConfirmationStep === 1 && studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4 text-left">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-500 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-black text-slate-900 text-center mb-3">
              Delete Student? (Confirm 1 of 2)
            </h3>
            
            <p className="text-sm font-semibold text-slate-500 text-center mb-8 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800">{studentToDelete.studentName}</strong> from the system?
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setStudentToDelete(null);
                  setDeleteConfirmationStep(0);
                }} 
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setDeleteConfirmationStep(2)} 
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmationStep === 2 && studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4 text-left">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 text-red-600 mx-auto animate-pulse">
              <XCircle className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-black text-red-600 text-center mb-3">
              Final Warning! (Confirm 2 of 2)
            </h3>
            
            <p className="text-xs font-bold text-slate-500 text-center mb-8 leading-relaxed">
              WARNING: This will permanently delete <strong className="text-slate-800">{studentToDelete.studentName}</strong> AND all their baseline, endline, and module examination records. This action is <strong>IRREVERSIBLE</strong>. Are you absolutely certain?
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setStudentToDelete(null);
                  setDeleteConfirmationStep(0);
                }} 
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteStudent} 
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
