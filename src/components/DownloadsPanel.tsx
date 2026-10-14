import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, InterventionTask } from '../types';
import * as XLSX from 'xlsx';
import {
  Download,
  Calendar,
  School,
  Check,
  Filter,
  FileSpreadsheet,
  Info
} from 'lucide-react';

interface DownloadsPanelProps {
  students: Student[];
  records: AttendanceRecord[];
  tasks: InterventionTask[];
  currentUser?: any;
}

export default function DownloadsPanel({
  students = [],
  records = [],
  tasks = [],
  currentUser
}: DownloadsPanelProps) {
  // 1. Schools list
  const schoolsList = useMemo(() => {
    const list = students.map(s => (s.school || '').trim()).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [students]);

  // 2. State for filters
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [isSchoolOpen, setIsSchoolOpen] = useState(false);

  // Default date ranges (e.g. 1st June 2026 to 31st March 2027, or dynamic defaults)
  const [fromDate, setFromDate] = useState('2026-06-01');
  const [toDate, setToDate] = useState('2027-03-31');

  // Utility to format Date string to DD-MM-YYYY for display in Excel headers
  const formatToDDMMYYYY = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Convert array of records to Map for fast lookup during excel construction
  const attendanceMap = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach(rec => {
      if (rec.studentId && rec.date) {
        map.set(`${rec.studentId}_${rec.date}`, rec.status);
      }
    });
    return map;
  }, [records]);

  // Get active filtered students based on selected schools
  const filteredStudentsForAttendance = useMemo(() => {
    if (selectedSchools.length === 0) {
      return students; // If none selected, default to all as fallback or full list
    }
    return students.filter(s => selectedSchools.includes(s.school));
  }, [students, selectedSchools]);

  // --- DOWNLOAD 1: ATTENDANCE EXCEL SHEET GENERATION ---
  const handleDownloadAttendanceExcel = () => {
    const targetStudents = selectedSchools.length > 0 
      ? students.filter(s => selectedSchools.includes(s.school))
      : students;

    if (targetStudents.length === 0) {
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

    if (uniqueDates.length === 0) {
      alert("निवडलेल्या तारीख रेंजमध्ये कोणतेही दिवस आढळले नाहीत!");
      return;
    }

    // २. तारखांचे महिन्यानुसार गट करूया
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

    // Helper function to build a structured worksheet with custom headers
    const buildWorksheet = (studentsList: Student[]) => {
      const baseHeaders = ['Sr. No.', 'School Name', 'Student Name', 'Gender', 'Std', 'Division', 'Medium'];
      const headerRow1 = [...baseHeaders];
      const headerRow2 = baseHeaders.map(() => '');

      // Add monthly date headers dynamically
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

      // Construct student rows
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
      return XLSX.utils.aoa_to_sheet(totalData);
    };

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

    // ३. पहिली शीट 'Master Sheet' असेल ज्यामध्ये सर्व विद्यार्थ्यांचा आणि शाळांचा डेटा असेल
    const masterWs = buildWorksheet(targetStudents);
    XLSX.utils.book_append_sheet(wb, masterWs, "Master Sheet");

    // ४. त्यानंतरच्या शीट्समध्ये प्रत्येक शाळेसाठी वेगळी टॅब असेल
    const schoolsSet = new Set<string>(targetStudents.map(s => (s.school || "इतर शाळा").trim()));
    const uniqueSchools = Array.from(schoolsSet).filter(Boolean);

    uniqueSchools.forEach(schoolName => {
      const schoolStudents = targetStudents.filter(s => (s.school || "इतर शाळा").trim() === schoolName);
      const ws = buildWorksheet(schoolStudents);
      const tabTitle = schoolName.substring(0, 30);
      XLSX.utils.book_append_sheet(wb, ws, tabTitle);
    });

    // Write file
    XLSX.writeFile(wb, `हजेरी_पत्रक_${fromDate}_ते_${toDate}.xlsx`);
  };


  // --- DOWNLOAD 2: TASK AND HOME VISIT EXCEL GENERATION ---
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

    const getStudentAttendanceReturnDate = (task: InterventionTask) => {
      const visitDateStr = task.visitDate || task.homeVisitDate;
      if (!visitDateStr) return null;

      // Find earliest record with 'Present' state on or after home visit date
      const returnRecord = records
        .filter(r => r.studentId === task.studentId && r.status === 'Present' && r.date >= visitDateStr)
        .sort((a, b) => a.date.localeCompare(b.date))[0];

      return returnRecord ? returnRecord.date : null;
    };

    // ३. टास्क्स तीन भागांत विभागूया:
    // a. "भेट द्यायची यादी" (Pending Visits) - status === 'pending'
    const pendingTasks = filteredTasks.filter(t => t.status === 'pending');

    // b. "सक्रिय टास्क" (Active Tasks) - status === 'active_task' || status === 'home_visit_done', and student hasn't returned
    const activeTasks = filteredTasks.filter(t => {
      const isHomeVisitDone = t.status === 'home_visit_done';
      const isCustomActive = t.status === 'active_task';
      const hasMatchedPresent = getStudentAttendanceReturnDate(t) !== null;
      return (isCustomActive || isHomeVisitDone) && !hasMatchedPresent;
    });

    // c. "पूर्ण झालेली कार्ये" (Completed Tasks) - status === 'completed' / 'successful' / 'unsuccessful' OR (active and student returned)
    const completedTasks = filteredTasks.filter(t => {
      const isCompleted = t.status === 'completed';
      const isUnsuccessful = t.status === 'unsuccessful';
      const isSuccessful = t.status === 'successful';
      const isCustomActive = t.status === 'active_task';
      const isHomeVisitDone = t.status === 'home_visit_done';
      const hasMatchedPresent = getStudentAttendanceReturnDate(t) !== null;
      return isCompleted || isUnsuccessful || isSuccessful || ((isCustomActive || isHomeVisitDone) && hasMatchedPresent);
    });

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
          if (task.status === 'successful') {
            displayStatus = 'यशस्वी (Successful)';
          } else if (task.status === 'unsuccessful') {
            displayStatus = 'अयशस्वी (Unsuccessful)';
          } else {
            const returnDate = getStudentAttendanceReturnDate(task);
            if (returnDate) {
              displayStatus = `यशस्वी (Successful) [Returned: ${formatToDDMMYYYY(returnDate)}]`;
            }
          }
          
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            डाऊनलोड केंद्र (Downloads Center)
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            शाळा आणि तारीख फिल्टर वापरून हजेरी पत्रक आणि घरभेट आवश्यक असलेल्या विद्यार्थ्यांच्या याद्या डाऊनलोड करा.
          </p>
        </div>
        <div className="p-3 bg-violet-50 text-violet-700 rounded-2xl flex items-center gap-2 border border-violet-100 max-w-max">
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-xs font-black">Excel / XLSX निर्यात सक्षम</span>
        </div>
      </div>

      {/* Primary Filters Toolbar Card containing: school & date ranges */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
          <Filter className="w-3.5 h-3.5 text-indigo-500" /> Choose Filters (फिल्टर निवडा)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* School Selector Dropdown (Multi-Select) */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-1.5">शाळा निवडा (Select School):</label>
            <button
              type="button"
              onClick={() => setIsSchoolOpen(!isSchoolOpen)}
              className="w-full text-left text-xs font-black border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:bg-slate-100/50 transition-all flex items-center justify-between cursor-pointer shadow-xs"
            >
              <span className="truncate pr-2 text-slate-800">
                {selectedSchools.length === 0
                  ? 'सर्व शाळा (All Schools)'
                  : `${selectedSchools.length} शाळा निवडल्या`}
              </span>
              <span className="text-slate-400 text-[10px]">▼</span>
            </button>

            {isSchoolOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsSchoolOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg p-3 space-y-1.5 z-30 max-h-64 overflow-y-auto animate-fade-in">
                  <button
                    type="button"
                    onClick={() => setSelectedSchools([])}
                    className={`w-full text-left text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center justify-between ${
                      selectedSchools.length === 0
                        ? 'bg-violet-50 text-violet-700 font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>सर्व शाळा (All Schools)</span>
                    {selectedSchools.length === 0 && <span className="text-violet-600">✓</span>}
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {schoolsList.map(school => {
                    const isSelected = selectedSchools.includes(school);
                    return (
                      <label key={school} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer select-none transition-colors">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedSchools(prev =>
                              prev.includes(school) ? prev.filter(x => x !== school) : [...prev, school]
                            );
                          }}
                          className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-700 line-clamp-1">{school}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Date from selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">या तारखेपासून (From Date):</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-violet-500 font-sans transition-all"
              />
            </div>
          </div>

          {/* Date to selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">या तारखेपर्यंत (To Date):</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-xs font-black border border-slate-200 rounded-xl pl-10 pr-3.5 py-3 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-violet-500 font-sans transition-all"
              />
            </div>
          </div>

        </div>

        {selectedSchools.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">निवडलेल्या शाळा:</span>
            {selectedSchools.map(sch => (
              <span key={sch} className="bg-slate-100 text-slate-750 font-bold px-2 py-1 rounded-lg text-[10px] flex items-center gap-1">
                🏢 {sch.substring(0, 25)}{sch.length > 25 ? '...' : ''}
                <button 
                  onClick={() => setSelectedSchools(prev => prev.filter(x => x !== sch))} 
                  className="hover:text-red-600 font-extrabold cursor-pointer text-[9px] ml-1"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Download Grid Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Attendance grid export */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between hover:border-slate-200 transition-all">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                १. एक्सेल हजेरी पत्रक (Attendance Sheet Export)
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-semibold">
                निवडलेल्या शाळांमधील सर्व विद्यार्थ्यांचे व त्यांच्या दैनंदिन हजेरीचे पत्रक (Present/Absent/Holiday/Leave) एकाच शीटमध्ये डाऊनलोड करा. यामध्ये खालील टॅब समाविष्ट असतील:
              </p>
              <ul className="text-xs text-slate-600 space-y-1 mt-2.5 list-disc pl-5 font-bold">
                <li><strong>Master Sheet:</strong> निवडलेल्या सर्व शाळांचा एकत्रित डेटा.</li>
                <li><strong>शाळेनुसार स्वतंत्र टॅब:</strong> प्रत्येक शाळेसाठी स्वतंत्र शीट.</li>
                <li><strong>तारीख मर्यादा:</strong> निवडलेल्या तारीख श्रेणीनुसार रकाने बनतील.</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-50 mt-6 flex justify-end">
            <button
              onClick={handleDownloadAttendanceExcel}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/10 active:scale-98"
            >
              <Download className="w-4 h-4" />
              Excel हजेरी डाऊनलोड करा
            </button>
          </div>
        </div>

        {/* Card 2: Task status export */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col justify-between hover:border-slate-200 transition-all">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                २. टास्क आणि भेट यादी (Intervention Tasks Sheet)
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-semibold">
                कम्युनिटी मेंटॉर्सद्वारे दिल्या गेलेल्या घरभेटी, त्यांची सद्यस्थिती आणि कामगिरीचा अहवाल डाऊनलोड करा. यामध्ये खालील टॅब हजेरी ग्रीडसह समाविष्ट असतील:
              </p>
              <ul className="text-xs text-slate-600 space-y-1 mt-2.5 list-disc pl-5 font-bold">
                <li><strong>भेट द्यायची यादी (Pending):</strong> भेट देणे बाकी असलेली मुले.</li>
                <li><strong>सक्रिय टास्क (Active):</strong> भेट झालेली व शाळेत येण्याची वाट पाहत असलेले विद्यार्थी.</li>
                <li><strong>पूर्ण झालेली कार्ये (Completed):</strong> यशस्वी/अयशस्वी घरभेटींची पूर्ण माहिती.</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-50 mt-6 flex justify-end">
            <button
              onClick={handleDownloadTasksExcel}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-600/10 active:scale-98"
            >
              <Download className="w-4 h-4" />
              Task & भेट यादी डाऊनलोड करा
            </button>
          </div>
        </div>

      </div>

      {/* Informative notice card */}
      <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-3xl p-5 flex gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-indigo-950">महत्त्वाची माहिती (Important Tip)</h4>
          <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
            डाऊनलोड केलेले हजेरी पत्रक सुलभतेने वाचण्यासाठी आणि फिल्टर करण्यासाठी, फाईल उघडल्यानंतर पहिल्या व दुसऱ्या ओळींमधील तारखा गोठवून (Freeze Panes) ठेवल्या आहेत. हे तुम्हाला उजवीकडे स्क्रोल करताना डावीकडील विद्यार्थ्यांची माहिती व्यवस्थित पाहण्यास मदत करते.
          </p>
        </div>
      </div>
    </div>
  );
}
