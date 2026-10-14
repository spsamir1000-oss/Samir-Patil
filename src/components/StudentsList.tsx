import React, { useState, useMemo, useRef } from 'react';
import { Student, AttendanceRecord, InterventionTask } from '../types';
import * as XLSX from 'xlsx';
import { AdminAuthorityBadge } from './AdminAuthorityBadge';
import {
  School,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Users,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit,
  X,
  Check,
  HelpCircle,
  Info,
  AlertCircle,
  RefreshCw,
  UserCheck
} from 'lucide-react';

interface StudentsListProps {
  students: Student[];
  records: AttendanceRecord[];
  tasks?: InterventionTask[];
  onAddStudent?: (student: Student) => void;
  onAddStudentsList?: (newStudents: Student[]) => void;
  onDeleteStudent?: (id: string) => void;
  onClearAllStudents?: () => void;
  onUpdateStudent?: (student: Student) => void;
  onImportStudentsAndRecords?: (students: Student[], records: AttendanceRecord[]) => void;
  currentUser?: { role: string; name: string };
}

// Generate all dates in a selected range (max 45 columns for optimal performance & layout width)
const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }
  
  const current = new Date(start);
  let count = 0;
  while (current <= end && count < 45) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
    count++;
  }
  return dates;
};

// Format YYYY-MM-DD index date to highly readable Indian/regional label (e.g. "24/05")
const formatDateLabel = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

// Format YYYY-MM-DD index date to standard strict Indian format (DD-MM-YYYY)
const formatToDDMMYYYY = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

// Normalizes various date string formats to standard YYYY-MM-DD
const normalizeDateStr = (dateStr: string): string => {
  let cleaned = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  // Check DD/MM/YYYY
  const partsSlash = cleaned.split('/');
  if (partsSlash.length === 3) {
    let day = partsSlash[0].padStart(2, '0');
    let month = partsSlash[1].padStart(2, '0');
    let year = partsSlash[2];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  // Check DD-MM-YYYY
  const partsDash = cleaned.split('-');
  if (partsDash.length === 3) {
    let day = partsDash[0].padStart(2, '0');
    let month = partsDash[1].padStart(2, '0');
    let year = partsDash[2];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return cleaned;
};

// Parse flexible status strings to "Present", "Absent", "Holiday" or "Leave"
const parseStatusVal = (val: string): 'Present' | 'Absent' | 'Holiday' | 'Leave' | null => {
  const norm = val.trim().toLowerCase();
  if (!norm) return null;
  if (['✅', 'p', 'present', 'hajer', 'hajar', 'y', 'yes', '1', 'हजर', 'हजेरी', 'प्रवेश'].includes(norm)) {
    return 'Present';
  }
  if (['❌', 'a', 'absent', 'gairhajer', 'gairhajar', 'n', 'no', '0', 'गैरहजर', 'अनुपस्थित'].includes(norm)) {
    return 'Absent';
  }
  if (['h', 'holiday', 'छुट्टी', 'सुट्टी', 'shutti', 'shuttii'].includes(norm)) {
    return 'Holiday';
  }
  if (['lh', 'l', 'leave', 'रजा', 'raja'].includes(norm)) {
    return 'Leave';
  }
  return null;
};

// Robust CSV Line parser handling double quotes cleanly
const parseCSVText = (text: string): string[][] => {
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }).filter(row => row.length > 0 && row.some(cell => cell !== ''));
};

export default function StudentsList({
  students,
  records,
  tasks = [],
  onAddStudent,
  onDeleteStudent,
  onClearAllStudents,
  onUpdateStudent,
  onImportStudentsAndRecords,
  currentUser
}: StudentsListProps) {
  // Check privileges
  const isAdmin = currentUser?.role === 'admin';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedStds, setSelectedStds] = useState<string[]>([]);
  const [selectedDivs, setSelectedDivs] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>('all'); // all | Male | Female

  // Date Range Selection State
  const [fromDate, setFromDate] = useState<string>('2026-05-15');
  const [toDate, setToDate] = useState<string>('2026-05-28');

  // Selectors Expand States
  const [isSchoolOpen, setIsSchoolOpen] = useState(false);
  const [isStdOpen, setIsStdOpen] = useState(false);
  const [isDivOpen, setIsDivOpen] = useState(false);

  // Form Management States
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);

  // Fields for Add / Update forms
  const [formDataId, setFormDataId] = useState('');
  const [formName, setFormName] = useState('');
  const [formSchool, setFormSchool] = useState('');
  const [formGender, setFormGender] = useState('Male'); // Male | Female
  const [formStd, setFormStd] = useState('');
  const [formDiv, setFormDiv] = useState('');
  const [formMedium, setFormMedium] = useState('Marathi'); // Marathi | English | Semi-English | etc.

  // Bulk File Upload Ref and feedback notification states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
    details?: string;
  } | null>(null);

  // Expose filter parameters dynamically based on actual loaded student registries
  const schoolsList = useMemo(() => Array.from(new Set(students.map(s => s.school))), [students]);
  const standardsList = useMemo(() => Array.from(new Set(students.map(s => s.std))).sort(), [students]);
  const divisionsList = useMemo(() => Array.from(new Set(students.map(s => s.div))).sort(), [students]);

  // Apply visual filtering for rows matching selection parameters (now including Gender filter)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSchool = selectedSchools.length === 0 || selectedSchools.includes(s.school);
      const matchStd = selectedStds.length === 0 || selectedStds.includes(s.std);
      const matchDiv = selectedDivs.length === 0 || selectedDivs.includes(s.div);
      
      // Determine student gender match
      let matchGender = true;
      if (selectedGender !== 'all') {
        const studentGenderNorm = s.gender ? s.gender.toLowerCase() : 'male'; // default to male if not specified, or match leniently
        const filterGenderNorm = selectedGender.toLowerCase();

        if (filterGenderNorm === 'male') {
          matchGender = ['male', 'boy', 'm', 'मुलगा', 'पुरुष'].includes(studentGenderNorm);
        } else if (filterGenderNorm === 'female') {
          matchGender = ['female', 'girl', 'f', 'मुलगी', 'स्त्री'].includes(studentGenderNorm);
        }
      }

      return matchSearch && matchSchool && matchStd && matchDiv && matchGender;
    });
  }, [students, searchQuery, selectedSchools, selectedStds, selectedDivs, selectedGender]);

  // Generate date columns range
  const dateColumns = useMemo(() => {
    return getDatesInRange(fromDate, toDate);
  }, [fromDate, toDate]);

  // Build O(1) high-speed check schema map logic
  const attendanceMap = useMemo(() => {
    const map = new Map<string, 'Present' | 'Absent' | 'Holiday' | 'Leave'>();
    records.forEach(r => {
      map.set(`${r.studentId}_${r.date}`, r.status);
    });
    return map;
  }, [records]);

  // Form submission reset helpers
  const resetFields = () => {
    setFormDataId('');
    setFormName('');
    setFormSchool(schoolsList[0] || 'A. L. Chandavarkar Highschool Khanivali');
    setFormGender('Male');
    setFormStd('7');
    setFormDiv('A');
    setFormMedium('Marathi');
  };

  const handleOpenAddForm = () => {
    resetFields();
    setIsAddFormOpen(true);
    setIsEditFormOpen(false);
    setIsImportPanelOpen(false);
  };

  const handleOpenEditForm = (student: Student) => {
    setFormDataId(student.id);
    setFormName(student.name);
    setFormSchool(student.school);
    setFormGender(student.gender || 'Male');
    setFormStd(student.std);
    setFormDiv(student.div);
    setFormMedium(student.medium || 'Marathi');
    setIsEditFormOpen(true);
    setIsAddFormOpen(false);
    setIsImportPanelOpen(false);
  };

  // Process manual single additions
  const handleOnSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSchool.trim() || !formStd.trim() || !formDiv.trim()) {
      alert("कृपया सर्व माहिती अचूक भरा.");
      return;
    }

    const exists = students.some(s => 
      s.name.trim().toLowerCase() === formName.trim().toLowerCase() &&
      s.school.trim().toLowerCase() === formSchool.trim().toLowerCase() &&
      s.std.trim().toLowerCase() === formStd.trim().toLowerCase() &&
      s.div.trim().toLowerCase() === formDiv.trim().toLowerCase()
    );

    if (exists) {
      alert("हा विद्यार्थी या शाळेत आणि वर्गात आधीपासूनच जोडला गेला आहे!");
      return;
    }

    const newStudent: Student = {
      id: `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: formName.trim(),
      school: formSchool.trim(),
      gender: formGender,
      std: formStd.trim(),
      div: formDiv.trim().toUpperCase(),
      medium: formMedium.trim()
    };

    if (onAddStudent) {
      onAddStudent(newStudent);
      setIsAddFormOpen(false);
      resetFields();
    }
  };

  // Process manual single edits
  const handleOnSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDataId || !formName.trim() || !formSchool.trim() || !formStd.trim() || !formDiv.trim()) {
      alert("कृपया सर्व आवश्यक माहिती भरा.");
      return;
    }

    const updatedStudent: Student = {
      id: formDataId,
      name: formName.trim(),
      school: formSchool.trim(),
      gender: formGender,
      std: formStd.trim(),
      div: formDiv.trim().toUpperCase(),
      medium: formMedium.trim()
    };

    if (onUpdateStudent) {
      onUpdateStudent(updatedStudent);
      setIsEditFormOpen(false);
      resetFields();
    }
  };

  // Function to download an Excel-compliant empty template CSV sheet
  const handleDownloadTemplate = () => {
    const headers = [
      'Sr. No.',
      'School Name',
      'Student Name',
      'Gender',
      'Std',
      'Division',
      'Medium',
      '28-05-2026',
      '29-05-2026'
    ];

    const examples = [
      '1,A. L. Chandavarkar Highschool Khanivali,Suresh Patil,Boy,5,A,Marathi,✅,❌',
      '2,A. L. Chandavarkar Highschool Khanivali,Nisha Mhatre,Girl,7,B,Semi-English,✅,✅',
      '3,A. L. Chandavarkar Highschool Khanivali,Rahim Ansari,Boy,7,B,English,❌,❌'
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...examples].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'हजेरी_पत्रक_टेंपलेट.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to download professionally formatted Excel file using SheetJS (XLSX)
  const handleDownloadExcel = () => {
    if (filteredStudents.length === 0) {
      alert("डाऊनलोड करण्यासाठी कोणतीही माहिती उपलब्ध नाही! (निवडलेल्या फिल्टरनुसार कोणताही विद्यार्थी आढळला नाही)");
      return;
    }

    // १. युझरने निवडलेल्या 'या तारखेपासून' ते 'या तारखेपर्यंत' च्या फिल्टरनुसार रकाने बनवूया
    const uniqueDates: string[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert("कृपया वैध तारीख रेंज निवडा!");
      return;
    }

    let curr = new Date(start);
    let safetyCount = 0;
    while (curr <= end && safetyCount < 366) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      uniqueDates.push(`${year}-${month}-${day}`);
      curr.setDate(curr.getDate() + 1);
      safetyCount++;
    }

    // 1. Group dates by month
    const groupDatesByMonth = (dates: string[]) => {
      const groups: { [key: string]: string[] } = {};
      dates.forEach(date => {
        const monthKey = date.substring(0, 7); // "YYYY-MM"
        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(date);
      });
      return groups;
    };

    const groupedMonths = groupDatesByMonth(uniqueDates);
    const sortedMonthKeys = Object.keys(groupedMonths).sort();

    const getWeekdayName = (dateStr: string): string => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dt = new Date(dateStr);
      return isNaN(dt.getTime()) ? '' : days[dt.getDay()];
    };

    // Helper to generate worksheet for a list of students
    const buildWorksheet = (studentsList: Student[]) => {
      const headerRow1 = ['Sr. No.', 'School Name', 'Student Name', 'Gender', 'Std', 'Division', 'Medium'];
      const headerRow2 = ['', '', '', '', '', '', ''];

      sortedMonthKeys.forEach(monthKey => {
        const monthDates = groupedMonths[monthKey];
        monthDates.forEach(date => {
          headerRow1.push(formatToDDMMYYYY(date));
          headerRow2.push(getWeekdayName(date));
        });
        headerRow1.push('Present Days');
        headerRow2.push('Total');

        headerRow1.push('Working Days');
        headerRow2.push('Total');

        headerRow1.push('Average %');
        headerRow2.push('%');
      });

      const rows = studentsList.map((student, idx) => {
        const gNorm = (student.gender || '').toLowerCase();
        const displayGender = (gNorm === 'female' || gNorm === 'girl' || gNorm === 'f' || gNorm === 'मुलगी' || gNorm === 'स्त्री') ? 'Girl' : 'Boy';

        const rowData = [
          idx + 1,
          student.school || '',
          student.name || '',
          displayGender,
          student.std || '',
          student.div || '',
          student.medium || 'Marathi'
        ];

        sortedMonthKeys.forEach(monthKey => {
          const monthDates = groupedMonths[monthKey];
          let presentInMonthCount = 0;
          let workingInMonthCount = 0;

          monthDates.forEach(date => {
            const status = attendanceMap.get(`${student.id}_${date}`);
            if (status === 'Present') {
              presentInMonthCount++;
              workingInMonthCount++;
              rowData.push('P');
            } else if (status === 'Absent') {
              workingInMonthCount++;
              rowData.push('A');
            } else if (status === 'Holiday') {
              rowData.push('H');
            } else if (status === 'Leave') {
              rowData.push('LH');
            } else {
              rowData.push('');
            }
          });

          rowData.push(presentInMonthCount);
          rowData.push(workingInMonthCount);
          const avg = workingInMonthCount > 0 ? Math.round((presentInMonthCount / workingInMonthCount) * 100) : 0;
          rowData.push(workingInMonthCount > 0 ? `${avg}%` : '—');
        });

        return rowData;
      });

      const totalData = [headerRow1, headerRow2, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(totalData);

      ws['!views'] = [
        {
          state: 'frozen',
          xSplit: 7, // Freeze up to 'Medium' (Index 7 column start)
          ySplit: 2, // Freeze Row 1 and 2
          topLeftCell: 'H3',
          activePane: 'bottomRight'
        }
      ];

      return ws;
    };

    const wb = XLSX.utils.book_new();
    const wbView = {
      Views: [
        {
          state: 'frozen',
          xSplit: 7,
          ySplit: 2,
          topLeftCell: 'H3',
          activePane: 'bottomRight'
        }
      ]
    };
    (wb as any).Workbook = wbView;
    (wb as any).workbook = wbView;

    // ३. पहिली शीट 'Master Sheet' असेल ज्यामध्ये सर्व विद्यार्थ्यांचा आणि शाळांचा डेटा असेल
    const masterWs = buildWorksheet(filteredStudents);
    XLSX.utils.book_append_sheet(wb, masterWs, "Master Sheet");

    // ४. त्यानंतरच्या शीट्समध्ये प्रत्येक शाळेसाठी वेगळी टॅब असेल
    const schoolsSet = new Set<string>(filteredStudents.map(s => (s.school || "इतर शाळा").trim()));
    const uniqueSchools = Array.from(schoolsSet).filter(Boolean);

    uniqueSchools.forEach(schoolName => {
      const schoolStudents = filteredStudents.filter(s => (s.school || "इतर शाळा").trim() === schoolName);
      const ws = buildWorksheet(schoolStudents);
      const tabTitle = schoolName.substring(0, 30);
      XLSX.utils.book_append_sheet(wb, ws, tabTitle);
    });

    // Write file
    XLSX.writeFile(wb, `हजेरी_पत्रक_${fromDate}_ते_${toDate}.xlsx`);
  };

  // Function to download Excel sheet containing "भेट द्यायची यादी", "सक्रिय टास्क यादी" and "पूर्ण झालेली कार्ये" with attendance grids
  const handleDownloadTasksExcel = () => {
    if (tasks.length === 0) {
      alert("डाऊनलोड करण्यासाठी कोणतीही माहिती उपलब्ध नाही!");
      return;
    }

    // १. शाळा फिल्टरनुसार फिल्टर्ड टास्क्स मिळवूया
    let filteredTasks = tasks;
    if (selectedSchools.length > 0) {
      filteredTasks = filteredTasks.filter(t => selectedSchools.includes(t.school));
    }

    // २. तारीख रेंज फिल्टरनुसार फिल्टर्ड टास्क्स मिळवूया (t.dateCreated किंवा t.visitDate)
    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert("कृपया वैध तारीख रेंज निवडा!");
      return;
    }

    filteredTasks = filteredTasks.filter(t => {
      const taskDateStr = t.visitDate || t.homeVisitDate || t.dateCreated;
      if (!taskDateStr) return false;
      const tDate = new Date(taskDateStr);
      return tDate >= start && tDate <= end;
    });

    if (filteredTasks.length === 0) {
      alert("निवडलेल्या फिल्टरनुसार (शाळा आणि तारीख रेंज) कोणताही टास्क आढळला नाही!");
      return;
    }

    // ३. टास्क्स तीन भागांत विभागूया:
    // a. "भेट द्यायची यादी" (Pending Visits) - status === 'pending'
    const pendingTasks = filteredTasks.filter(t => t.status === 'pending');

    // b. "सक्रिय टास्क" (Active Tasks) - status === 'active_task' || status === 'home_visit_done'
    const activeTasks = filteredTasks.filter(t => t.status === 'active_task' || t.status === 'home_visit_done');

    // c. "पूर्ण झालेली कार्ये" (Completed Tasks) - status === 'completed' || status === 'successful' || status === 'unsuccessful'
    const completedTasks = filteredTasks.filter(t => t.status === 'completed' || t.status === 'successful' || t.status === 'unsuccessful');

    // तारीख रकाने बनवून घेऊया (same as other sheets)
    const uniqueDates: string[] = [];
    let curr = new Date(start);
    let safetyCount = 0;
    while (curr <= end && safetyCount < 366) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      uniqueDates.push(`${year}-${month}-${day}`);
      curr.setDate(curr.getDate() + 1);
      safetyCount++;
    }

    const groupDatesByMonth = (dates: string[]) => {
      const groups: { [key: string]: string[] } = {};
      dates.forEach(date => {
        const monthKey = date.substring(0, 7); // "YYYY-MM"
        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(date);
      });
      return groups;
    };

    const groupedMonths = groupDatesByMonth(uniqueDates);
    const sortedMonthKeys = Object.keys(groupedMonths).sort();

    const getWeekdayName = (dateStr: string): string => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dt = new Date(dateStr);
      return isNaN(dt.getTime()) ? '' : days[dt.getDay()];
    };

    // Helper to generate worksheet with both metadata columns and dynamic attendance grid
    const buildWorksheetWithTasks = (tList: InterventionTask[], taskType: 'pending' | 'active' | 'completed') => {
      // Base student headers
      const baseHeaders = ['Sr. No.', 'School Name', 'Student Name', 'Gender', 'Std', 'Division', 'Medium'];
      
      // Task headers based on type
      let taskHeaders: string[] = [];
      if (taskType === 'pending') {
        taskHeaders = ['Task Created Date', 'Status'];
      } else if (taskType === 'active') {
        taskHeaders = ['Task Created Date', 'Home Visit Date', 'Visited By', 'Home Visit Notes', 'Status'];
      } else { // completed
        taskHeaders = ['Task Created Date', 'Home Visit Date', 'Visited By', 'Home Visit Notes', 'Status'];
      }

      // Combine base and task headers
      const metaHeaders = [...baseHeaders, ...taskHeaders];
      
      const headerRow1 = [...metaHeaders];
      // headerRow2 is for the weekdays of the attendance dates, so we leave empty strings for the metadata columns
      const headerRow2 = metaHeaders.map(() => '');

      // Now add attendance date headers
      sortedMonthKeys.forEach(monthKey => {
        const monthDates = groupedMonths[monthKey];
        monthDates.forEach(date => {
          headerRow1.push(formatToDDMMYYYY(date));
          headerRow2.push(getWeekdayName(date));
        });
        headerRow1.push('Present Days');
        headerRow2.push('Total');

        headerRow1.push('Working Days');
        headerRow2.push('Total');

        headerRow1.push('Average %');
        headerRow2.push('%');
      });

      // Now generate the rows
      const rows = tList.map((task, idx) => {
        // Find matching student
        const student = students.find(s => s.id === task.studentId);
        
        // If student is not found, fallback to information inside the task
        const schoolVal = student?.school || task.school || '';
        const nameVal = student?.name || task.studentName || '';
        const stdVal = student?.std || task.std || '';
        const divVal = student?.div || task.div || '';
        const mediumVal = student?.medium || 'Marathi';
        
        const gNorm = (student?.gender || '').toLowerCase();
        const displayGender = (gNorm === 'female' || gNorm === 'girl' || gNorm === 'f' || gNorm === 'मुलगी' || gNorm === 'स्त्री') ? 'Girl' : 'Boy';

        // Base metadata row
        const rowData = [
          idx + 1,
          schoolVal,
          nameVal,
          displayGender,
          stdVal,
          divVal,
          mediumVal
        ];

        // Append task specific columns
        if (taskType === 'pending') {
          rowData.push(
            task.dateCreated || '—',
            'भेट देणे आवश्यक (Pending Visit)'
          );
        } else if (taskType === 'active') {
          rowData.push(
            task.dateCreated || '—',
            task.visitDate || task.homeVisitDate || '—',
            task.homeVisitBy || '—',
            task.homeVisitNotes || '—',
            'शाळेत येण्याची वाट पाहत आहे (Active Task)'
          );
        } else { // completed
          let displayStatus = 'पूर्ण झाले (Completed)';
          if (task.status === 'successful') displayStatus = 'यशस्वी (Successful)';
          else if (task.status === 'unsuccessful') displayStatus = 'अयशस्वी (Unsuccessful)';
          
          rowData.push(
            task.dateCreated || '—',
            task.visitDate || task.homeVisitDate || '—',
            task.homeVisitBy || '—',
            task.homeVisitNotes || '—',
            displayStatus
          );
        }

        // Now append attendance dates grid
        const studentId = task.studentId;
        sortedMonthKeys.forEach(monthKey => {
          const monthDates = groupedMonths[monthKey];
          let presentInMonthCount = 0;
          let workingInMonthCount = 0;

          monthDates.forEach(date => {
            const status = attendanceMap.get(`${studentId}_${date}`);
            if (status === 'Present') {
              presentInMonthCount++;
              workingInMonthCount++;
              rowData.push('P');
            } else if (status === 'Absent') {
              workingInMonthCount++;
              rowData.push('A');
            } else if (status === 'Holiday') {
              rowData.push('H');
            } else if (status === 'Leave') {
              rowData.push('LH');
            } else {
              rowData.push('');
            }
          });

          rowData.push(presentInMonthCount);
          rowData.push(workingInMonthCount);
          const avg = workingInMonthCount > 0 ? Math.round((presentInMonthCount / workingInMonthCount) * 100) : 0;
          rowData.push(workingInMonthCount > 0 ? `${avg}%` : '—');
        });

        return rowData;
      });

      const totalData = [headerRow1, headerRow2, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(totalData);

      // Freeze panes: dynamically adjust frozen column index
      const numMetaColumns = metaHeaders.length;
      ws['!views'] = [
        {
          state: 'frozen',
          xSplit: numMetaColumns, // Freeze up to the end of task metadata columns
          ySplit: 2, // Freeze header row 1 and 2
          topLeftCell: XLSX.utils.encode_cell({ r: 2, c: numMetaColumns }),
          activePane: 'bottomRight'
        }
      ];

      return ws;
    };

    // ४. तीन स्वतंत्र वर्कशीट बनवून एकाच वर्कबुकमध्ये जोडूया
    const wb = XLSX.utils.book_new();
    const wbView = {
      Views: [
        {
          state: 'frozen',
          ySplit: 2,
          topLeftCell: 'A3',
          activePane: 'bottomRight'
        }
      ]
    };
    (wb as any).Workbook = wbView;

    // Sheet 1: भेट द्यायची यादी (Pending Visits)
    const wsPending = buildWorksheetWithTasks(pendingTasks, 'pending');
    XLSX.utils.book_append_sheet(wb, wsPending, "भेट द्यायची यादी (Pending)");

    // Sheet 2: सक्रिय टास्क (Active Tasks)
    const wsActive = buildWorksheetWithTasks(activeTasks, 'active');
    XLSX.utils.book_append_sheet(wb, wsActive, "सक्रिय टास्क (Active)");

    // Sheet 3: पूर्ण झालेली कार्ये (Completed Tasks)
    const wsCompleted = buildWorksheetWithTasks(completedTasks, 'completed');
    XLSX.utils.book_append_sheet(wb, wsCompleted, "पूर्ण झालेली कार्ये (Completed)");

    // Write file
    XLSX.writeFile(wb, `टास्क_आणि_भेट_यादी_${fromDate}_ते_${toDate}.xlsx`);
  };

  // Handles Excel/CSV Import and Parsing of Students & Dates
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result as ArrayBuffer;
        if (!data) {
          setImportStatus({
            type: 'error',
            message: 'फाईल रिकामी आहे किंवा वाचता येत नाही! (File is empty or unreadable)'
          });
          return;
        }

        // Read the file using XLSX (works for .xlsx, .xls, and .csv)
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to json (with header: 1 to get a 2D array of rows)
        const rawJson = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        
        // Convert all elements to string to protect against numeric spreadsheet values
        const dataRows: string[][] = rawJson.map(row => 
          Array.isArray(row) ? row.map(val => val === null || val === undefined ? '' : String(val)) : []
        );

        if (dataRows.length < 2) {
          setImportStatus({
            type: 'error',
            message: 'योग्य डेटा सापडला नाही! किमान एका ओळीचा हेडर आणि एका ओळीचा डेटा असणे आवश्यक आहे.'
          });
          return;
        }

        // 1. Detect Header Positions
        const rawHeaders = dataRows[0].map(h => h.trim().toLowerCase());
        
        let idxSchool = -1;
        let idxName = -1;
        let idxGender = -1;
        let idxStd = -1;
        let idxDiv = -1;
        let idxMedium = -1;
        const dateColumnList: { index: number; origHeader: string; normalizedDate: string }[] = [];

        rawHeaders.forEach((header, index) => {
          if (header.includes('school') || header.includes('शाळा')) {
            idxSchool = index;
          } else if (header.includes('student') || header.includes('name') || header.includes('नाव') || header.includes('विद्यार्थी')) {
            idxName = index;
          } else if (header.includes('gender') || header.includes('लिंग') || header.includes('जेंडर') || header.includes('sex') || header.includes('mulga')) {
            idxGender = index;
          } else if (header.includes('std') || header.includes('standard') || header.includes('class') || header.includes('इयत्ता') || header.includes('कक्षा')) {
            idxStd = index;
          } else if (header.includes('division') || header.includes('div') || header.includes('tukdi') || header.includes('तुकडी')) {
            idxDiv = index;
          } else if (header.includes('medium') || header.includes('माध्यम')) {
            idxMedium = index;
          } else {
            // Check if column title matches dates (e.g. 2026-05-28, 28/05/2026, or general numbers with slashes)
            // Cleanup quotes or clean characters first
            const cleanedTitle = dataRows[0][index].replace(/["']/g, '').trim();
            const normalized = normalizeDateStr(cleanedTitle);
            if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
              dateColumnList.push({
                index,
                origHeader: cleanedTitle,
                normalizedDate: normalized
              });
            }
          }
        });

        // Error out if essential student columns are completely missing
        if (idxName === -1 || idxSchool === -1 || idxStd === -1 || idxDiv === -1) {
          setImportStatus({
            type: 'error',
            message: 'चुकीची कॉलम रचना! कॉलममध्ये "Student Name", "School Name", "Std" आणि "Division" असणे बंधनकारक आहे.',
            details: `सापडलेले हेडर: ${dataRows[0].join(', ')}`
          });
          return;
        }

        // 2. Parse individual rows
        const parsedStudents: Student[] = [];
        const parsedRecords: AttendanceRecord[] = [];
        let skippedRowsCount = 0;

        for (let i = 1; i < dataRows.length; i++) {
          const row = dataRows[i];
          if (row.length <= Math.max(idxSchool, idxName, idxStd, idxDiv)) {
            skippedRowsCount++;
            continue;
          }

          const sName = row[idxName]?.replace(/["']/g, '').trim();
          const sSchool = row[idxSchool]?.replace(/["']/g, '').trim();
          const sStdStr = row[idxStd]?.replace(/["']/g, '').trim().replace(/इ\.\s*/, '');
          const sDivRaw = row[idxDiv]?.replace(/["']/g, '').trim();

          if (!sName || !sSchool || !sStdStr || !sDivRaw) {
            skippedRowsCount++;
            continue;
          }

          // Parse Gender
          let sGender = 'Male';
          if (idxGender !== -1 && row[idxGender]) {
            const rawGen = row[idxGender].toLowerCase().replace(/["']/g, '').trim();
            if (['female', 'girl', 'f', 'मुलगी', 'स्त्री'].includes(rawGen)) {
              sGender = 'Female';
            }
          }

          // Parse Medium
          let sMedium = 'Marathi';
          if (idxMedium !== -1 && row[idxMedium]) {
            sMedium = row[idxMedium].replace(/["']/g, '').trim() || 'Marathi';
          }

          // Create localized unique student mock ID if they don't already exist
          // Or match existing student ID if we found standard match in memory
          const existingMatch = students.find(s => 
            s.name.trim().toLowerCase() === sName.toLowerCase() &&
            s.school.trim().toLowerCase() === sSchool.toLowerCase() &&
            s.std.trim().toLowerCase() === sStdStr.toLowerCase() &&
            s.div.trim().toLowerCase() === sDivRaw.toLowerCase()
          );

          const studentId = existingMatch 
            ? existingMatch.id 
            : `ST-IMP-${Date.now()}-${Math.floor(Math.random() * 9999999)}`;

          parsedStudents.push({
            id: studentId,
            name: sName,
            school: sSchool,
            gender: sGender,
            std: sStdStr,
            div: sDivRaw,
            medium: sMedium
          });

          // Check if date columns contain attendance
          dateColumnList.forEach(dateCol => {
            const cellValue = row[dateCol.index];
            if (cellValue) {
              const statusClean = cellValue.replace(/["']/g, '').trim();
              const parsedStatus = parseStatusVal(statusClean);
              if (parsedStatus) {
                parsedRecords.push({
                  id: `REC-IMP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
                  studentId: studentId,
                  studentName: sName,
                  school: sSchool,
                  std: sStdStr,
                  div: sDivRaw,
                  date: dateCol.normalizedDate,
                  status: parsedStatus
                });
              }
            }
          });
        }

        if (parsedStudents.length === 0) {
          setImportStatus({
            type: 'error',
            message: 'डेटा ओळी व्यवस्थित लोड झाल्या नाहीत. फाईल फॉर्मॅट तपासा!'
          });
          return;
        }

        // Call the parent callback
        if (onImportStudentsAndRecords) {
          onImportStudentsAndRecords(parsedStudents, parsedRecords);
          setImportStatus({
            type: 'success',
            message: `🎉 यशस्वी आयात! एकूण ${parsedStudents.length} विद्यार्थ्यांचा डेटा संकलित केला गेला.`,
            details: `नवीन/अद्ययावत विद्यार्थी: ${parsedStudents.length}, आयात केलेल्या तारखेनुसार हजेरी नोंदी: ${parsedRecords.length}`
          });
          // Reset file input
          if (fileInputRef.current) fileInputRef.current.value = '';
        }

      } catch (err: any) {
        setImportStatus({
          type: 'error',
          message: 'फाईल वाचताना तांत्रिक त्रुटी आली!',
          details: err.message
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Dynamic Title Header Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-large font-black text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            विद्यार्थी हजेरी पत्रक (Attendance Grid Sheet)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            निवडलेल्या कालावधीतील विद्यार्थ्यांची दैनंदिन हजेरी यादी (Daily roll sheet)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => {
                  setIsAddFormOpen(!isAddFormOpen);
                  setIsImportPanelOpen(false);
                  setIsEditFormOpen(false);
                  resetFields();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs hover:shadow-sm"
                title="नवीन विद्यार्थी जोडा (Add New Student)"
              >
                <Plus className="w-4 h-4" />
                विद्यार्थी जोडा
              </button>
              <AdminAuthorityBadge
                itemId="btn_add_student"
                title="Add Student Button"
                marathiTitle="विद्यार्थी जोडा बटण"
                category="button"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {isAdmin && (
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => {
                  setIsImportPanelOpen(!isImportPanelOpen);
                  setIsAddFormOpen(false);
                  setIsEditFormOpen(false);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs hover:shadow-sm"
                title="Excel/CSV फाईल अपलोड करा (Upload Excel/CSV File)"
              >
                <Upload className="w-4 h-4" />
                Excel/CSV अपलोड
              </button>
              <AdminAuthorityBadge
                itemId="btn_import_students"
                title="Import Students Button"
                marathiTitle="विद्यार्थी आयात बटण"
                category="button"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          {isAdmin && (
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs hover:shadow-sm"
                title="रिकामे एक्सेल टेम्पलेट डाउनलोड करा (Download Empty CSV Template)"
              >
                <Download className="w-4 h-4" />
                टेम्पलेट डाउनलोड
              </button>
              <AdminAuthorityBadge
                itemId="btn_download_template"
                title="Download Template Button"
                marathiTitle="टेम्पलेट डाउनलोड बटण"
                category="button"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}

          <div className="relative flex items-center">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs hover:shadow-sm"
              title="हजेरी एक्सेल पत्रक डाउनलोड करा (Download Attendance Excel Sheet)"
            >
              <Download className="w-4 h-4" />
              हजेरी पत्रक (Excel)
            </button>
            <AdminAuthorityBadge
              itemId="btn_download_attendance_excel"
              title="Download Attendance Excel Button"
              marathiTitle="हजेरी पत्रक डाउनलोड बटण"
              category="button"
              module="attendance"
              position="inline"
              className="ml-1 shrink-0"
            />
          </div>

          {tasks && tasks.length > 0 && (
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={handleDownloadTasksExcel}
                className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs hover:shadow-sm"
                title="टास्क एक्सेल पत्रक डाउनलोड करा (Download Tasks Excel)"
              >
                <Download className="w-4 h-4" />
                टास्क पत्रक (Excel)
              </button>
              <AdminAuthorityBadge
                itemId="btn_download_tasks_excel"
                title="Download Tasks Excel Button"
                marathiTitle="टास्क पत्रक डाउनलोड बटण"
                category="button"
                module="attendance"
                position="inline"
                className="ml-1 shrink-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* RENDER EXCEL IMPORT CONFIG DETAILS BOX */}
      {isImportPanelOpen && isAdmin && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100/60 rounded-3xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />
              <h3 className="text-xs font-black text-purple-950 uppercase tracking-widest">
                Excel / CSV इम्पोर्ट पॅनेल (Upload and Merge Records)
              </h3>
            </div>
            <button 
              type="button" 
              onClick={() => setIsImportPanelOpen(false)} 
              className="text-slate-400 hover:text-slate-600 transition-colors pointer-events-auto cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 font-semibold leading-relaxed max-w-3xl">
            तुमची Excel (.xlsx/.xls/.csv) फाईल निवडा किंवा वरील <strong>"टेम्पलेट डाउनलोड"</strong> करून त्यात विद्यार्थ्यांची नावे, जेंडर (मुलगा/मुलगी) आणि तारखेनुसार हजेरी भरून येथे अपलोड करा.
            जर आधीच असलेला विद्यार्थी असेल, तर त्याचा जेंडर व नावे अद्ययावत केले जातील. नवीन विद्यार्थी आपोआप जोडले जातील.
          </p>

          <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 text-center bg-white/60 hover:bg-white transition-all">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv, .xlsx, .xls"
              onChange={handleCsvImport}
              className="hidden"
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer block">
              <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2 animate-pulse" />
              <span className="text-xs font-black text-purple-700 block mb-1">
                इथे फाईल निवडा किंवा ड्रॅग करा (Select Excel or CSV File)
              </span>
              <span className="text-[10px] text-slate-500 block">संचिका स्वरूप: .csv, .xlsx, .xls चे पूर्ण समर्थन</span>
            </label>
          </div>

          {importStatus && (
            <div className={`p-4 rounded-xl flex items-start gap-3 border ${
              importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 
              importStatus.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-100' : 'bg-blue-50 text-blue-800 border-blue-100'
            }`}>
              {importStatus.type === 'success' ? <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-black">{importStatus.message}</p>
                {importStatus.details && <p className="text-[10px] opacity-80 mt-1 font-mono break-all">{importStatus.details}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER ADD DIRECT STUDENT FORM */}
      {isAddFormOpen && (
        <form onSubmit={handleOnSubmitAdd} className="bg-white rounded-3xl p-5 border border-indigo-100 shadow-md space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-extrabold text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> नवीन विद्यार्थी जोडा (Add New Student)
            </h3>
            <button type="button" onClick={() => setIsAddFormOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">शाळा निवडा (School Name):</label>
              <select
                value={formSchool}
                onChange={(e) => setFormSchool(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                {schoolsList.length > 0 ? (
                  schoolsList.map(s => <option key={s} value={s}>{s}</option>)
                ) : (
                  <option value="A. L. Chandavarkar Highschool Khanivali">A. L. Chandavarkar Highschool Khanivali</option>
                )}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">विद्यार्थ्याचे संपूर्ण नाव (Student Name):</label>
              <input
                type="text"
                placeholder="आडनाव प्रथम नाव वडिलांचे नाव"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">लिंग (Gender):</label>
              <select
                value={formGender}
                onChange={(e) => setFormGender(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="Male">मुलगा (Male)</option>
                <option value="Female">मुलगी (Female)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">इयत्ता (Standard/Class):</label>
              <input
                type="text"
                placeholder="उदा. 7"
                value={formStd}
                onChange={(e) => setFormStd(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">तुकडी (Division):</label>
              <input
                type="text"
                placeholder="उदा. Aकिंवा B"
                value={formDiv}
                onChange={(e) => setFormDiv(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">माध्यम (Medium):</label>
              <select
                value={formMedium}
                onChange={(e) => setFormMedium(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="Marathi">मराठी (Marathi)</option>
                <option value="Semi-English">सेमी-इंग्रजी (Semi-English)</option>
                <option value="English">इंग्रजी (English)</option>
                <option value="Hindi">हिंदी (Hindi)</option>
                <option value="Gujarati">गुजराती (Gujarati)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddFormOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-50 transition-all cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
            >
              विद्यार्थी जतन करा
            </button>
          </div>
        </form>
      )}

      {/* RENDER EDIT SINGLE STUDENT FORM */}
      {isEditFormOpen && (
        <form onSubmit={handleOnSubmitEdit} className="bg-white rounded-3xl p-5 border border-amber-200 shadow-md space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-extrabold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
              <Edit className="w-4 h-4" /> विद्यार्थ्याची माहिती बदला (Edit Student details)
            </h3>
            <button type="button" onClick={() => setIsEditFormOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">शाळा निवडा (School Name):</label>
              <select
                value={formSchool}
                onChange={(e) => setFormSchool(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500 outline-none transition-all cursor-pointer"
              >
                {schoolsList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">विद्यार्थ्याचे संपूर्ण नाव (Student Name):</label>
              <input
                type="text"
                placeholder="नाव बदला..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">लिंग (Gender):</label>
              <select
                value={formGender}
                onChange={(e) => setFormGender(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500 outline-none transition-all cursor-pointer"
              >
                <option value="Male">मुलगा (Male)</option>
                <option value="Female">मुलगी (Female)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">इयत्ता (Standard):</label>
              <input
                type="text"
                value={formStd}
                onChange={(e) => setFormStd(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">तुकडी (Division):</label>
              <input
                type="text"
                value={formDiv}
                onChange={(e) => setFormDiv(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">माध्यम (Medium):</label>
              <select
                value={formMedium}
                onChange={(e) => setFormMedium(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500 outline-none transition-all cursor-pointer"
              >
                <option value="Marathi">मराठी (Marathi)</option>
                <option value="Semi-English">सेमी-इंग्रजी (Semi-English)</option>
                <option value="English">इंग्रजी (English)</option>
                <option value="Hindi">हिंदी (Hindi)</option>
                <option value="Gujarati">गुजराती (Gujarati)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditFormOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-50 transition-all cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
            >
              बदल जतन करा
            </button>
          </div>
        </form>
      )}

      {/* Primary Filters Toolbar Card containing: school, name search, class filter/Gender, & date ranges */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
          <Filter className="w-3.5 h-3.5 text-indigo-500" /> Choose Filters (फिल्टर निवडा)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* School Selector Dropdown (Multi-Select) */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-1">शाळा (School):</label>
            <button
              type="button"
              onClick={() => {
                setIsSchoolOpen(!isSchoolOpen);
                setIsStdOpen(false);
                setIsDivOpen(false);
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
                      selectedSchools.length === 0
                        ? 'bg-violet-50 text-violet-700 font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>सर्व शाळा (All Schools)</span>
                    {selectedSchools.length === 0 && <span className="text-violet-600">✓</span>}
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
                            setSelectedSchools(prev =>
                              prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                            );
                          }}
                          className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-700">{s}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Student name input search field */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">विद्यार्थ्याचे नाव (Student Name):</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="नाव शोधण्यासाठी टाईप करा..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-violet-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Standards Filter (Multi-Select) */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-1">इयत्ता (Standard):</label>
            <button
              type="button"
              onClick={() => {
                setIsStdOpen(!isStdOpen);
                setIsSchoolOpen(false);
                setIsDivOpen(false);
              }}
              className="w-full text-left text-xs font-black border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 transition-all flex items-center justify-between cursor-pointer shadow-xs"
            >
              <span className="truncate pr-2 text-slate-800">
                {selectedStds.length === 0
                  ? 'सर्व इयत्ता (All Standards)'
                  : `${selectedStds.length} निवडल्या: (${selectedStds.map(s => `इ. ${s}`).join(', ')})`}
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
                      selectedStds.length === 0
                        ? 'bg-violet-50 text-violet-700 font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>सर्व इयत्ता (All Classes)</span>
                    {selectedStds.length === 0 && <span className="text-violet-600">✓</span>}
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {standardsList.map(st => {
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
                        <span className="text-xs font-black text-slate-700 font-sans">इयत्ता {st}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Division Filter (Multi-Select) */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-1">तुकडी (Division):</label>
            <button
              type="button"
              onClick={() => {
                setIsDivOpen(!isDivOpen);
                setIsSchoolOpen(false);
                setIsStdOpen(false);
              }}
              className="w-full text-left text-xs font-black border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 transition-all flex items-center justify-between cursor-pointer shadow-xs"
            >
              <span className="truncate pr-2 text-slate-800">
                {selectedDivs.length === 0
                  ? 'सर्व तुकड्या (All Divisions)'
                  : `${selectedDivs.length} निवडल्या: (${selectedDivs.join(', ')})`}
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
                      selectedDivs.length === 0
                        ? 'bg-violet-50 text-violet-700 font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>सर्व तुकड्या (All Divisions)</span>
                    {selectedDivs.length === 0 && <span className="text-violet-600">✓</span>}
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {divisionsList.map(d => {
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
                        <span className="text-xs font-black text-slate-700 font-sans">तुकडी {d}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Gender Filter Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">जेंडरने फिल्टर (Gender Filter):</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full text-xs font-black border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer shadow-xs font-sans transition-all"
            >
              <option value="all">सर्व जेंडर (All)</option>
              <option value="Male">मुलगा (Boy)</option>
              <option value="Female">मुलगी (Girl)</option>
            </select>
          </div>

          {/* Date from selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">या तारखेपासून (From Date):</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date" max={new Date().toISOString().split('T')[0]}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-violet-500 font-sans transition-all"
              />
            </div>
          </div>

          {/* Date to selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">या तारखेपर्यंत (To Date):</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date" max={new Date().toISOString().split('T')[0]}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-violet-500 font-sans transition-all"
              />
            </div>
          </div>

        </div>

        {dateColumns.length >= 45 && (
          <p className="text-[10px] text-amber-600 font-bold bg-amber-50 rounded-xl px-3 py-1.5">
            ⚠️ टीप: कामगिरी आणि रुंदी राखण्यासाठी कमाल ४५ कालक्रमित तारखांची मर्यादा लागू केली आहे.
          </p>
        )}
      </div>

      {/* Main horizontal scrolling grid showing students name followed by dates columns */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {filteredStudents.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <span className="text-xs font-black">निवडलेल्या फिल्टर्सनुसार विद्यार्थी आढळले नाहीत!</span>
            <p className="text-[10px] mt-1 text-slate-450">कृपया वर दिलेले शाळा, इयत्ता किंवा नाव फिल्टर बदलून तपासा.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/60 sticky top-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 select-none">
                  <th className="py-3 px-3 w-10 text-center border-r border-slate-100 bg-slate-50/90 z-10">#</th>
                  <th className="py-3 px-4 min-w-[200px] border-r border-slate-100 bg-slate-50/90 sticky left-0 z-20 shadow-xs">
                    विद्यार्थ्याचे नाव (Student Name)
                  </th>
                  <th className="py-3 px-3 min-w-[90px] text-center border-r border-slate-100">
                    लिंग (Gender)
                  </th>
                  <th className="py-3 px-4 min-w-[190px] border-r border-slate-100 bg-slate-50/95">
                    शाळा (School)
                  </th>
                  <th className="py-3 px-3 text-center min-w-[70px] border-r border-slate-100">
                    इयत्ता (Std)
                  </th>
                  <th className="py-3 px-3 text-center min-w-[70px] border-r border-slate-100">
                    तुकडी (Div)
                  </th>
                  <th className="py-3 px-3 text-center min-w-[95px] border-r border-slate-150 border-r-2 text-rose-600 font-extrabold bg-rose-50/20" title="Selected Date Range Absent Percentage">
                    गैरहजर % (Absent %)
                  </th>
                  
                  {/* Generate visual headers on each date */}
                  {dateColumns.map(date => (
                    <th key={date} className="py-3 px-2 text-center min-w-[55px] font-mono font-bold text-[10px] text-slate-600 border-r border-slate-100 bg-indigo-50/30">
                      {formatDateLabel(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Index */}
                    <td className="py-3 px-3 text-center font-bold text-slate-405 text-slate-400 border-r border-slate-100 bg-white/50">
                      {idx + 1}
                    </td>
                    
                    {/* Student Name */}
                    <td className="py-3 px-4 font-black text-slate-800 border-r border-slate-100 bg-white sticky left-0 z-10 shadow-xs">
                      👤 {student.name}
                    </td>

                    {/* Gender indicator badge */}
                    <td className="py-3 px-3 text-center border-r border-slate-100 font-black">
                      {student.gender === 'Female' ? (
                        <span className="bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded-full text-[9px]" title="Female (मुलगी)">
                          👩‍🦰 मुलगी (Girl)
                        </span>
                      ) : (
                        <span className="bg-cyan-50 text-cyan-850 border border-cyan-100 px-2 py-0.5 rounded-full text-[9px]" title="Male (मुलगा)">
                          👨‍🦱 मुलगा (Boy)
                        </span>
                      )}
                    </td>

                    {/* School Name */}
                    <td className="py-3 px-4 text-slate-650 font-bold border-r border-slate-100 truncate max-w-[210px]" title={student.school}>
                      🏢 {student.school}
                    </td>

                    {/* Std */}
                    <td className="py-3 px-3 text-center border-r border-slate-100">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-black text-[9px]">
                        इ {student.std}
                      </span>
                    </td>

                    {/* Div */}
                    <td className="py-3 px-3 text-center border-r border-slate-100">
                      <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-black text-[9px]">
                        {student.div}
                      </span>
                    </td>

                    {/* Absent Percentage */}
                    {(() => {
                      let presentCount = 0;
                      let absentCount = 0;
                      dateColumns.forEach(date => {
                        const status = attendanceMap.get(`${student.id}_${date}`);
                        if (status === 'Present') presentCount++;
                        else if (status === 'Absent') absentCount++;
                      });
                      const totalMarked = presentCount + absentCount;
                      const absentPercent = totalMarked > 0 ? Math.round((absentCount / totalMarked) * 100) : 0;
                      return (
                        <td className="py-3 px-3 text-center border-r border-slate-150 border-r-2 bg-rose-50/10 font-bold font-sans">
                          {totalMarked > 0 ? (
                            <span className={absentPercent > 50 ? "text-rose-600 font-extrabold" : absentPercent > 20 ? "text-amber-600 font-black" : "text-slate-600"}>
                              {absentPercent}% 
                              <span className="text-[9px] text-slate-400 font-normal block">({absentCount}/{totalMarked} दिवस)</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal text-xs">—</span>
                          )}
                        </td>
                      );
                    })()}

                    {/* Dates list checking attendance metrics */}
                    {dateColumns.map(date => {
                      const status = attendanceMap.get(`${student.id}_${date}`);
                      return (
                        <td key={date} className="py-3 px-2 text-center border-r border-slate-100 font-bold text-sm">
                          {status === 'Present' ? (
                            <span className="text-emerald-500 inline-block drop-shadow-xs" title="Present (हजर)">
                              ✅
                            </span>
                          ) : status === 'Absent' ? (
                            <span className="text-rose-500 inline-block drop-shadow-xs" title="Absent (गैरहजर)">
                              ❌
                            </span>
                          ) : status === 'Holiday' ? (
                            <span className="text-red-600 text-xs bg-red-50 border border-red-100 px-1.5 py-0.5 rounded font-black font-sans shrink-0 uppercase animate-pulse shadow-3xs" title="Holiday (सुट्टी)">
                              H
                            </span>
                          ) : status === 'Leave' ? (
                            <span className="text-red-600 text-xs bg-red-50 border border-red-100 px-1.5 py-0.5 rounded font-black font-sans shrink-0 uppercase animate-pulse shadow-3xs" title="Leave (रजा)">
                              LH
                            </span>
                          ) : (
                            <span className="text-slate-305 font-normal text-xs" title="No Record (नोंद नाही)">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
      </div>
    </div>
  );
}
