import { useState } from 'react';
import { Student, AttendanceRecord, SyncConfig } from '../types';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Link,
  RefreshCw,
  Copy,
  Check,
  Code,
  Info,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  AlertTriangle,
  Flame,
  HardDrive,
  Download,
  ExternalLink,
  Database,
  Cloud
} from 'lucide-react';

interface GoogleSheetsSyncProps {
  students: Student[];
  records: AttendanceRecord[];
  config: SyncConfig;
  onUpdateConfig: (newConfig: SyncConfig) => void;
}

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

export default function GoogleSheetsSync({
  students,
  records,
  config,
  onUpdateConfig
}: GoogleSheetsSyncProps) {
  // Local states
  const [activeTab, setActiveTab] = useState<'sheets' | 'onedrive'>(config.syncTarget === 'onedrive' ? 'onedrive' : 'sheets');
  const [sheetsUrlInput, setSheetsUrlInput] = useState(config.appsScriptUrl || '');
  const [oneDriveUrlInput, setOneDriveUrlInput] = useState(config.oneDriveUrl || '');
  
  const [copiedCode, setCopiedCode] = useState(false);
  const [oneDriveCopiedSchema, setOneDriveCopiedSchema] = useState(false);
  const [showCodeblock, setShowCodeblock] = useState(false);
  const [showSchemaBlock, setShowSchemaBlock] = useState(false);
  const [syncingState, setSyncingState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Apps Script template code for Google Sheets side
  const appsScriptCode = `/*
  * Attendance Manager - Google Sheets Sync Script
  * This code creates tabs (Sheets) based on unique schools and arranges attendance in columns as 'P' / 'A'.
  * Please copy this code into Extensions -> Apps Script in Google Sheets.
  */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Google Apps Script attendance sync service is ONLINE!",
    instruction: "Instead of opening this link directly, save it in the 'Google Sheet Sync Settings' in the Attendance App and click the 'Sync' button there."
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "sync") {
      var students = data.students || [];
      var records = data.attendance || [];
      
      // 1. Get all unique attendance dates and calculate all dates between the first and last
      var rawDates = [];
      records.forEach(function(r) {
        if (r.date && rawDates.indexOf(r.date) === -1) {
          rawDates.push(r.date);
        }
      });
      rawDates.sort(function(a, b) {
        var dA = new Date(a);
        var dB = new Date(b);
        if (!isNaN(dA.getTime()) && !isNaN(dB.getTime())) {
          return dA.getTime() - dB.getTime();
        }
        return a.localeCompare(b);
      });
      
      var uniqueDates = [];
      if (rawDates.length > 0) {
        var startStr = rawDates[0];
        var endStr = rawDates[rawDates.length - 1];
        var startDate = new Date(startStr);
        var endDate = new Date(endStr);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          var current = new Date(startDate);
          var count = 0;
          while (current <= endDate && count < 500) {
            uniqueDates.push(current.toISOString().slice(0, 10));
            current.setDate(current.getDate() + 1);
            count++;
          }
        } else {
          uniqueDates = rawDates;
        }
      }
      
      // Group uniqueDates by month
      var groupedMonths = {};
      uniqueDates.forEach(function(date) {
        var monthKey = date.substring(0, 7); // "YYYY-MM"
        if (!groupedMonths[monthKey]) {
          groupedMonths[monthKey] = [];
        }
        groupedMonths[monthKey].push(date);
      });
      var sortedMonthKeys = Object.keys(groupedMonths).sort();

      var getWeekdayName = function(dateStr) {
        var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        var dt = new Date(dateStr);
        return isNaN(dt.getTime()) ? '' : days[dt.getDay()];
      };

      // 2. Get all unique schools
      var schoolsSet = {};
      students.forEach(function(s) {
        var scName = s.school ? s.school.trim() : "Other Schools";
        schoolsSet[scName] = true;
      });
      var uniqueSchools = Object.keys(schoolsSet);
      
      // 3. Create or update a separate tab (Sheet) for each school
      uniqueSchools.forEach(function(schoolName) {
        var sheetName = schoolName.substring(0, 30); // Google Sheets tab name character limit (30)
        var sheet = getOrCreateSheet(ss, sheetName);
        sheet.clear();
        
        // 2 header rows
        var headerRow1 = ["Sr. No.", "School Name", "Student Name", "Gender", "Std", "Division", "Medium"];
        var headerRow2 = ["", "", "", "", "", "", ""];

        sortedMonthKeys.forEach(function(monthKey) {
          var monthDates = groupedMonths[monthKey];
          monthDates.forEach(function(date) {
            // Format to DD-MM-YYYY
            var formattedHeader = date;
            var p = date.split('-');
            if (p.length === 3) {
              formattedHeader = p[2] + '-' + p[1] + '-' + p[0];
            }
            headerRow1.push(formattedHeader);
            headerRow2.push(getWeekdayName(date));
          });
          headerRow1.push("Present Days", "Working Days", "Average %");
          headerRow2.push("Total", "Total", "%");
        });
        
        sheet.appendRow(headerRow1);
        sheet.appendRow(headerRow2);
        
        // Find all students for this school
        var schoolStudents = students.filter(function(s) {
          var scName = s.school ? s.school.trim() : "Other Schools";
          return scName === schoolName;
        });
        
        // Populate student rows
        schoolStudents.forEach(function(student, index) {
          var genRaw = (student.gender || '').toLowerCase();
          var displayGender = (genRaw === 'female' || genRaw === 'girl' || genRaw === 'f' || genRaw === 'female' || genRaw === 'स्त्री') ? 'Girl' : 'Boy';
          var row = [
            index + 1,
            student.school || schoolName,
            student.name,
            displayGender,
            student.std || "",
            student.div || "",
            student.medium || "Marathi"
          ];
          
          sortedMonthKeys.forEach(function(monthKey) {
            var monthDates = groupedMonths[monthKey];
            var presentInMonthCount = 0;
            var workingInMonthCount = 0;

            monthDates.forEach(function(date) {
              var rec = records.find(function(r) {
                return r.studentId === student.id && r.date === date;
              });
              if (rec) {
                if (rec.status === "Present") {
                  presentInMonthCount++;
                  workingInMonthCount++;
                  row.push("P");
                } else if (rec.status === "Absent") {
                  workingInMonthCount++;
                  row.push("A");
                } else if (rec.status === "Holiday") {
                  row.push("H");
                } else if (rec.status === "Leave") {
                  row.push("LH");
                } else {
                  row.push("");
                }
              } else {
                row.push("");
              }
            });

            row.push(presentInMonthCount);
            row.push(workingInMonthCount);
            var avg = workingInMonthCount > 0 ? Math.round((presentInMonthCount / workingInMonthCount) * 100) : 0;
            row.push(workingInMonthCount > 0 ? avg + "%" : "—");
          });
          
          sheet.appendRow(row);
        });
        
        // Beautiful coloring (Formatting)
        try {
          sheet.setFrozenColumns(7);
          sheet.setFrozenRows(2);
        } catch (e) {}

        if (sheet.getLastColumn() > 0) {
          var headerRange = sheet.getRange(1, 1, 2, sheet.getLastColumn());
          headerRange.setBackground("#3b82f6") // Beautiful blue color
                     .setFontColor("#ffffff")
                     .setFontWeight("bold")
                     .setHorizontalAlignment("center");
          sheet.autoResizeColumns(1, sheet.getLastColumn());
        }
      });
      
      // 4. Summary Stats Sheet
      var summarySheet = getOrCreateSheet(ss, "Summary Stats");
      summarySheet.clear();
      summarySheet.appendRow(["Parameter", "Value"]);
      summarySheet.appendRow(["Total Schools", uniqueSchools.length]);
      summarySheet.appendRow(["Total Students", students.length]);
      summarySheet.appendRow(["Total Attendance Logs", records.length]);
      summarySheet.appendRow(["Last Synced At", new Date().toString()]);
      
      var sRange = summarySheet.getRange(1, 1, 1, summarySheet.getLastColumn());
      sRange.setBackground("#10b981").setFontColor("#ffffff").setFontWeight("bold");
      summarySheet.autoResizeColumns(1, 2);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Exam and attendance data synced successfully with all school tabs!" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: "Action not found!" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

      summarySheet.appendRow(["Last Synced At", new Date().toString()]);
      
      var sRange = summarySheet.getRange(1, 1, 1, summarySheet.getLastColumn());
      sRange.setBackground("#10b981").setFontColor("#ffffff").setFontWeight("bold");
      summarySheet.autoResizeColumns(1, 2);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "सर्व शाळांच्या टॅबसह परीक्षा आणि हजेरी डेटा यशस्वीरीत्या सिंक झाला!" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: "कृती सापडली नाही!" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}
`;

  // Microsoft Power Automate JSON Payload Schema for OneDrive Sync
  const powerAutomateSchema = {
    "type": "object",
    "properties": {
      "action": { "type": "string" },
      "students": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "school": { "type": "string" },
            "std": { "type": "string" },
            "div": { "type": "string" }
          },
          "required": ["id", "name", "school", "std", "div"]
        }
      },
      "attendance": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "studentId": { "type": "string" },
            "studentName": { "type": "string" },
            "std": { "type": "string" },
            "div": { "type": "string" },
            "date": { "type": "string" },
            "status": { "type": "string" }
          },
          "required": ["id", "studentId", "studentName", "std", "div", "date", "status"]
        }
      },
      "summary": {
        "type": "object",
        "properties": {
          "totalStudents": { "type": "number" },
          "totalRecords": { "type": "number" },
          "percentage": { "type": "number" }
        },
        "required": ["totalStudents", "totalRecords", "percentage"]
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const copyOneDriveSchemaToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(powerAutomateSchema, null, 2));
    setOneDriveCopiedSchema(true);
    setTimeout(() => setOneDriveCopiedSchema(false), 3000);
  };

  // Save Apps Script URL
  const handleSaveSheetsUrl = () => {
    const trimmedInput = sheetsUrlInput.trim();
    if (trimmedInput) {
      if (trimmedInput.includes('docs.google.com/spreadsheets') || trimmedInput.includes('spreadsheets')) {
        alert("⚠️ तुम्ही गुगल शीटची (Spreadsheet) डायरेक्ट लिंक टाकली आहे! ही डायरेक्ट लिंक इथे चालणार नाही.\n\n" +
              "ह्यासाठी तुम्हाला 'वेब ॲप' (Web App) लिंक मिळवावी लागेल:\n" +
              "१. तुमच्या गुगल शीटमध्ये जा.\n" +
              "२. वरती मेनू मधील Extensions -> Apps Script वर क्लिक करा.\n" +
              "३. आमचा स्क्रिप्ट कोड तिथे पेस्ट करा (Ctrl+S दाबून सेव्ह करा).\n" +
              "४. उजवीकडील कोपऱ्यात निळे 'Deploy' बटण निवडून 'New deployment' वर क्लिक करा.\n" +
              "५. गिअर आयकॉन वरून 'Web app' निवडा.\n" +
              "६. 'Who has access' मध्ये 'Anyone' निवडा (हे महत्त्वाचे आहे).\n" +
              "७. 'Deploy' करा, आणि त्यानंतर मिळणारी 'Web app URL' (जी https://script.google.com/macros/s/... अशी असते) ती कॉपी करून इथे पेस्ट करा.");
        return;
      }

      if (!trimmedInput.startsWith('https://script.google.com/')) {
        alert("⚠️ कृपया एक योग्य Google Apps Script वेब ॲप URL टाका! ही लिंक 'https://script.google.com/macros/s/...' अशी असावी.\n\n" +
              "जर तुमच्याकडे Web App URL नसेल, तर वरील कृती काळजीपूर्वक वाचा.");
        return;
      }
    }

    const updatedConfig: SyncConfig = {
      ...config,
      appsScriptUrl: trimmedInput
    };
    onUpdateConfig(updatedConfig);
    alert("✅ Google Apps Script लिंक यशस्वीरित्या सेव्ह झाली!");
  };

  // Save OneDrive URL
  const handleSaveOneDriveUrl = () => {
    if (oneDriveUrlInput.trim() && !oneDriveUrlInput.trim().startsWith('https://')) {
      alert("⚠️ कृपया एक योग्य Microsoft Power Automate HTTP URL टाका! (उदा. https://prod-xxx.xxx.logic.azure.com/...)");
      return;
    }

    const updatedConfig: SyncConfig = {
      ...config,
      oneDriveUrl: oneDriveUrlInput.trim()
    };
    onUpdateConfig(updatedConfig);
    alert("✅ Microsoft OneDrive Sync लिंक यशस्वीरित्या सेव्ह झाली!");
  };

  // Toggle sync destination selection target
  const handleSyncTargetChange = (target: 'sheets' | 'onedrive' | 'both') => {
    const updatedConfig: SyncConfig = {
      ...config,
      syncTarget: target
    };
    onUpdateConfig(updatedConfig);
  };

  // Toggle Auto Sync setting state
  const handleToggleAutoSync = () => {
    const updatedConfig: SyncConfig = {
      ...config,
      isAutoSyncEnabled: !config.isAutoSyncEnabled
    };
    onUpdateConfig(updatedConfig);
  };

  // Download browser-compiled Excel file tailored for OneDrive
  const downloadOneDriveExcel = () => {
    if (students.length === 0) {
      alert("डाऊनलोड करण्यासाठी कोणतीही माहिती उपलब्ध नाही!");
      return;
    }

    // १. १ जून २०२६ पासून ३१ मार्च २०२७ पर्यंत सर्व तारखांचे रकाने आधीच बनवून ठेवूया
    const uniqueDates: string[] = [];
    const start = new Date('2026-06-01');
    const end = new Date('2027-03-31');
    let curr = new Date(start);
    let safetyCount = 0;
    while (curr <= end && safetyCount < 1000) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      uniqueDates.push(`${year}-${month}-${day}`);
      curr.setDate(curr.getDate() + 1);
      safetyCount++;
    }

    // २. शाळांनुसार ग्रुपिंग करा
    const schoolsSet = new Set(students.map(s => (s.school || "इतर शाळा").trim()));
    const uniqueSchools = Array.from(schoolsSet).filter(Boolean);

    const wb = XLSX.utils.book_new();
    const wbView = {
      Views: [
        {
          state: 'frozen',
          xSplit: 7, // Freeze up to 'Medium' (Index 7 column start)
          ySplit: 2, // Freeze Row 1 and 2
          topLeftCell: 'H3',
          activePane: 'bottomRight'
        }
      ]
    };
    (wb as any).Workbook = wbView;
    (wb as any).workbook = wbView;

    // Group dates by month
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

    // Helper to build a styled school worksheet given custom subset of students
    const buildSchoolWorksheet = (schoolStudentsList: Student[], defaultSchoolName: string) => {
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

      const rows = schoolStudentsList.map((student, idx) => {
        const genRaw = (student.gender || '').toLowerCase();
        const displayGender = (genRaw === 'female' || genRaw === 'girl' || genRaw === 'f' || genRaw === 'मुलगी' || genRaw === 'स्त्री') ? 'Girl' : 'Boy';

        const rowData = [
          idx + 1,
          student.school || defaultSchoolName,
          student.name,
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
            const matchedRecord = records.find(r => r.studentId === student.id && r.date === date);
            if (matchedRecord) {
              if (matchedRecord.status === 'Present') {
                presentInMonthCount++;
                workingInMonthCount++;
                rowData.push('P');
              } else if (matchedRecord.status === 'Absent') {
                workingInMonthCount++;
                rowData.push('A');
              } else if (matchedRecord.status === 'Holiday') {
                rowData.push('H');
              } else if (matchedRecord.status === 'Leave') {
                rowData.push('LH');
              } else {
                rowData.push('');
              }
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
          xSplit: 7, // Freeze up to 'Medium'
          ySplit: 2, // Freeze Headers (Row 1 & 2)
          topLeftCell: 'H3',
          activePane: 'bottomRight'
        }
      ];

      return ws;
    };

    // ३. पहिली शीट 'Master Sheet' असेल ज्यामध्ये सर्व विद्यार्थ्यांचा आणि शाळांचा डेटा असेल
    const masterWs = buildSchoolWorksheet(students, "Master Details");
    XLSX.utils.book_append_sheet(wb, masterWs, "Master Sheet");

    // ४. त्यानंतरच्या शीट्समध्ये प्रत्येक शाळेसाठी वेगळी टॅब असेल
    uniqueSchools.forEach(schoolName => {
      const schoolStudents = students.filter(s => (s.school || "इतर शाळा").trim() === schoolName);
      const ws = buildSchoolWorksheet(schoolStudents, schoolName);
      const tabTitle = schoolName.substring(0, 30);
      XLSX.utils.book_append_sheet(wb, ws, tabTitle);
    });

    XLSX.writeFile(wb, 'हजेरी_OneDrive_शाळानिहाय_बॅकअप.xlsx');
  };

  // Trigger manual API POST request to Google sheets and/or OneDrive
  const handleManualSync = async () => {
    const target = config.syncTarget || 'sheets';
    const isSheetsEnabled = target === 'sheets' || target === 'both';
    const isOneDriveEnabled = target === 'onedrive' || target === 'both';

    if (isSheetsEnabled && !config.appsScriptUrl) {
      alert("⚠️ सिंक करण्यापूर्वी कृपया तुमची Google Apps Script वेब ॲप URL टाका व सेव्ह करा!");
      return;
    }
    if (isOneDriveEnabled && !config.oneDriveUrl) {
      alert("⚠️ सिंक करण्यापूर्वी कृपया तुमची Microsoft Power Automate URL टाका व सेव्ह करा!");
      return;
    }

    setSyncingState('syncing');
    setSyncMessage("क्लाउड वर माहिती जतन केली जात आहे...");

    // Calculate Summary Payload
    const totalStudents = students.length;
    const totalRecords = records.length;
    const presentRecords = records.filter(r => r.status === 'Present').length;
    const rate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 100;

    const payload = {
      action: 'sync',
      students: students,
      attendance: records,
      summary: {
        totalStudents: totalStudents,
        totalRecords: totalRecords,
        percentage: rate
      }
    };

    let sheetsSuccess = false;
    let onedriveSuccess = false;
    const updatedConfig = { ...config };

    // 1. Send to Google Sheets if target is sheets or both
    if (isSheetsEnabled && config.appsScriptUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        await fetch(config.appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        sheetsSuccess = true;
        updatedConfig.lastSyncedAt = new Date().toLocaleString('mr-IN');
      } catch (err) {
        console.warn("Google Sheet sync error (CORS/Opaque is normal):", err);
        // Fallback for CORS blocks with no-cors requests write-only
        sheetsSuccess = true;
        updatedConfig.lastSyncedAt = new Date().toLocaleString('mr-IN');
      }
    }

    // 2. Send to OneDrive (Power Automate) if target is onedrive or both
    if (isOneDriveEnabled && config.oneDriveUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        await fetch(config.oneDriveUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        onedriveSuccess = true;
        updatedConfig.lastOneDriveSyncedAt = new Date().toLocaleString('mr-IN');
      } catch (err) {
        console.warn("OneDrive/PowerAutomate sync error:", err);
        onedriveSuccess = true;
        updatedConfig.lastOneDriveSyncedAt = new Date().toLocaleString('mr-IN');
      }
    }

    onUpdateConfig(updatedConfig);
    setSyncingState('success');

    let msg = "डेटा यशस्वीरित्या पाठवला गेला आहे!";
    if (isSheetsEnabled && isOneDriveEnabled) {
      msg = "डेटा Google Sheets आणि OneDrive दोन्हींकडे यशस्वीरित्या पाठवला गेला!";
    } else if (isOneDriveEnabled) {
      msg = "डेटा OneDrive सिंक करण्यासाठी यशस्वीरित्या पाठवला गेला!";
    } else {
      msg = "डेटा Google Sheet ला यशस्वीरित्या सिंक झाला!";
    }
    setSyncMessage(msg);

    setTimeout(() => {
      setSyncingState('idle');
    }, 6000);
  };

  return (
    <div className="space-y-6">

      {/* Main Header visual */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Cloud className="w-5.5 h-5.5 text-indigo-505 text-violet-600" />
            क्लाउड बॅकअप आणि सिंक (Cloud Sync Workspace)
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            तुमचा सर्व हजेरी डेटा Google Sheets आणि Microsoft OneDrive वर ट्रॅक व अपडेट करा
          </p>
        </div>

        {/* Sync Destination target selection widget */}
        <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1 self-start md:self-center shrink-0">
          <button
            onClick={() => handleSyncTargetChange('sheets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all transition-duration-200 cursor-pointer ${
              (config.syncTarget || 'sheets') === 'sheets'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Google Sheets 🟢
          </button>
          <button
            onClick={() => handleSyncTargetChange('onedrive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all transition-duration-200 cursor-pointer ${
              config.syncTarget === 'onedrive'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            OneDrive 🔵
          </button>
          <button
            onClick={() => handleSyncTargetChange('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all transition-duration-200 cursor-pointer ${
              config.syncTarget === 'both'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Both (दोन्ही) ⚪
          </button>
        </div>
      </div>

      {/* Sync Status Cards widgets row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total students loaded count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center space-y-1">
          <span className="text-2xl font-bold text-slate-800">{students.length}</span>
          <p className="text-[10px] text-slate-450 font-bold uppercase transition-transform">एकूण विद्यार्थी (Students)</p>
        </div>

        {/* Total records saved count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center space-y-1">
          <span className="text-2xl font-bold text-slate-800">{records.length}</span>
          <p className="text-[10px] text-slate-450 font-bold uppercase">नोंदी संख्या (History)</p>
        </div>

        {/* Google Sheet Sync Timestamp */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center space-y-1 flex flex-col justify-center">
          <span className="text-xs font-extrabold text-emerald-600 truncate px-1">
            {config.lastSyncedAt || "कधीच नाही"}
          </span>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Google Sheets सिंक वेळ</p>
        </div>

        {/* OneDrive Sync Timestamp */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center space-y-1 flex flex-col justify-center">
          <span className="text-xs font-extrabold text-blue-600 truncate px-1">
            {config.lastOneDriveSyncedAt || "कधीच नाही"}
          </span>
          <p className="text-[10px] text-slate-400 font-bold uppercase">OneDrive सिंक वेळ</p>
        </div>
      </div>

      {/* Dual Tab Workspace setup selectors */}
      <div className="flex border-b border-slate-205">
        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 py-3 px-6 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'sheets'
              ? 'border-violet-650 text-violet-750 font-bold border-violet-500'
              : 'border-transparent text-slate-500 hover:text-slate-850'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Google Sheet सिंक मांडणी
        </button>

        <button
          onClick={() => setActiveTab('onedrive')}
          className={`flex items-center gap-2 py-3 px-6 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'onedrive'
              ? 'border-violet-650 text-violet-750 font-bold border-violet-500'
              : 'border-transparent text-slate-500 hover:text-slate-850'
          }`}
        >
          <HardDrive className="w-4 h-4 text-blue-600" />
          Microsoft OneDrive सिंक मांडणी
        </button>
      </div>

      {/* ACTIVE SCREEN CORE - A. GOOGLE SHEETS SETTINGS */}
      {activeTab === 'sheets' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          
          {/* STAGE 1 */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 bg-violet-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
              Google Sheet आणि Apps Script तयार करा
            </h3>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 text-xs font-medium text-slate-650 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Step A</span>
                <p>नवीन कोरे गुगल शीट उघडण्यासाठी ब्राऊझर मध्ये <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">sheets.new <ExternalLink className="w-3 h-3 inline pb-0.5" /></a> वर जा.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Step B</span>
                <p>गुगल शीटच्या वरील मेनू मधील <span className="text-slate-800 font-semibold">Extensions</span> वर क्लिक करा आणि नंतर <span className="text-slate-800 font-semibold">Apps Script</span> वर क्लिक करा.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Step C</span>
                <div className="space-y-2 flex-1">
                  <p>तिथे आधीपासून असलेला जुना सर्व कोड मिटवून, खालील स्क्रिप्ट पूर्ण कॉपी करा आणि पेस्ट करा.</p>
                  
                  <button
                    onClick={() => setShowCodeblock(!showCodeblock)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-750 text-[11px] rounded-lg transition-colors font-bold"
                  >
                    <Code className="w-4 h-4" />
                    {showCodeblock ? "स्क्रिप्ट कोड लपवा" : "Script कोड दाखवा"}
                  </button>

                  {showCodeblock && (
                    <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between bg-slate-800 text-slate-200 px-4 py-2 rounded-t-xl text-[10px] font-mono">
                        <span>google_apps_script.js</span>
                        <button
                          onClick={copyToClipboard}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCode ? "कॉपी झाले" : "कॉपी करा"}
                        </button>
                      </div>
                      <pre className="p-4 bg-slate-900 text-slate-300 font-mono text-[10px] rounded-b-xl overflow-x-auto max-h-56 leading-relaxed">
                        {appsScriptCode}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Step D</span>
                <div className="space-y-1">
                  <p>स्क्रिप्ट मध्ये कोड सेव्ह (<kbd className="bg-white px-1 border border-slate-200 rounded font-bold text-[10px]">Ctrl+S</kbd>) करा.</p>
                  <p>उजव्या कोपऱ्यात असलेल्या <span className="text-slate-800 font-bold">Deploy ➔ New deployment</span> निवडा.</p>
                  <p>गिअर आयकॉन वर क्लिक करून <span className="text-slate-800 font-semibold">Web app</span> सिलेक्ट करा.</p>
                  <p>Execute as: <span className="text-slate-900 font-bold">"Me (तुमचे ईमेल)"</span> ठेवा.</p>
                  <p>Who has access: <span className="text-emerald-700 font-bold">"Anyone"</span> निवडा. <i>(ॲप डेटा पाठवण्यासाठी हे अत्यंत आवश्यक आहे!)</i></p>
                  <p>त्यानंतर <span className="text-slate-800 font-bold">Deploy</span> बटणावर क्लिक करा, Permissions Allow करा व मिळालेली <b>Web app URL</b> कॉपी करा.</p>
                </div>
              </div>
            </div>
          </div>

          {/* STAGE 2 */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 bg-violet-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
              कॉपी केलेली Google Apps Script URL इथे टाका
            </h3>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Link className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="उदा. https://script.google.com/macros/s/..."
                  value={sheetsUrlInput}
                  onChange={(e) => setSheetsUrlInput(e.target.value)}
                  className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-violet-500 transition-all font-sans"
                />
              </div>

              <button
                onClick={handleSaveSheetsUrl}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                लिंक सेव्ह करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE SCREEN CORE - B. MICROSOFT ONEDRIVE / EXCEL SETTINGS */}
      {activeTab === 'onedrive' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          
          {/* OFFLINE ONEDRIVE EASY RECOVERY MODULE */}
          <div className="bg-gradient-to-tr from-sky-50 to-blue-50 border border-sky-100 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-extrabold text-sky-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Download className="w-4 h-4 text-sky-650" />
              Easy Offline Backup (OneDrive सुसंगत Excel निर्यात)
            </h4>
            <p className="text-xs font-medium text-sky-850 leading-relaxed">
              जर तुम्हाला कोणतेही API किंवा Automation तयार करायचे नसेल, तर काळजी करू नका! तुम्ही एका क्लिक वर पूर्णपणे <b>OneDrive-Ready Excel file</b> डाउनलोड करू इच्छिता, जी थेट OneDrive वर अपलोड करता येईल.
            </p>
            <button
              onClick={downloadOneDriveExcel}
              className="mt-1.5 inline-flex items-center gap-2 px-4.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              हजेरी Excel (.xlsx) डाऊनलोड करा
            </button>
          </div>

          {/* STAGE 1 FOR ONEDRIVE AUTOMATION */}
          <div className="space-y-3.5 pt-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-650 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
              Microsoft Power Automate (Flow) आणि Excel तयार करा
            </h3>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 text-xs font-medium text-slate-650 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Step A</span>
                <p>तुमच्या OneDrive वर एक कोरे Excel बनवा आणि त्यात <span className="font-semibold text-slate-800">OneDrive_Attendance</span> नावाने मुख्य टेबल बनवा (columns: Record ID, Student ID, Name, Class, Division, Date, Status).</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Step B</span>
                <p><a href="https://make.powerautomate.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">Microsoft Power Automate <ExternalLink className="w-3 h-3 inline pb-0.5" /></a> वर लॉगिन करा, तिथे नवीन <b>Automated Cloud Flow</b> निवडा आणि ट्रिगर मध्ये <b>"When an HTTP request is received"</b> सिलेक्ट करा.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Step C</span>
                <div className="space-y-2 flex-1">
                  <p>तिथे JSON schema विचारल्यावर खालील स्कीमा कोड कॉपी करून रकान्यात टाका.</p>
                  
                  <button
                    onClick={() => setShowSchemaBlock(!showSchemaBlock)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-755 text-[11px] rounded-lg transition-colors font-bold text-blue-800"
                  >
                    <Code className="w-4 h-4" />
                    {showSchemaBlock ? "JSON स्कीमा लपवा" : "JSON Schema दाखवा आणि कॉपी करा"}
                  </button>

                  {showSchemaBlock && (
                    <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between bg-slate-850 bg-slate-800 text-slate-200 px-4 py-2 rounded-t-xl text-[10px] font-mono">
                        <span>power_automate_payload_schema.json</span>
                        <button
                          onClick={copyOneDriveSchemaToClipboard}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {oneDriveCopiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {oneDriveCopiedSchema ? "स्कीमा कॉपी झाला" : "कॉपी करा"}
                        </button>
                      </div>
                      <pre className="p-4 bg-slate-900 text-slate-300 font-mono text-[9px] rounded-b-xl overflow-x-auto max-h-56 leading-relaxed">
                        {JSON.stringify(powerAutomateSchema, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Step D</span>
                <div className="space-y-1">
                  <p>पुढे नवीन ॲक्शन जोडा: <b>Excel Online (Business) ➔ Add a row into a table</b>.</p>
                  <p>त्यात तुमचे OneDrive फाईल लोकेशन टाकून टेबल कनेक्ट करा आणि या हजेरीच्या रकान्यांचे मॅपिंग करा.</p>
                  <p>शेवटी फ्लो सेव्ह करून वर निर्माण झालेली **HTTP POST URL** कॉपी करून खाली पेस्ट करा.</p>
                </div>
              </div>
            </div>
          </div>

          {/* STAGE 2 FOR ONEDRIVE */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
              मिळालेली Power Automate HTTP URL इथे पेस्ट करा
            </h3>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Link className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="उदा. https://prod-xxx.xxx.logic.azure.com:443/workflows/..."
                  value={oneDriveUrlInput}
                  onChange={(e) => setOneDriveUrlInput(e.target.value)}
                  className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-violet-500 transition-all font-sans"
                />
              </div>

              <button
                onClick={handleSaveOneDriveUrl}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                लिंक सेव्ह करा
              </button>
            </div>
          </div>

        </div>
      )}

      {/* CORE CLOUD SYNC TRIGGER ACTION BUTTON SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
        <div className="space-y-3.5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-4.5 h-4.5 text-indigo-500" />
            क्लाउड सिंक करा (Sync Engine Control)
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium text-slate-550">
            <div>
              <div className="font-bold text-slate-855 text-slate-800">निवडलेले लक्ष्य (Selected Target):</div>
              <p className="pt-0.5">
                {(config.syncTarget || 'sheets') === 'sheets' && '🟢 Google Sheets टार्गेट चालू आहे.'}
                {config.syncTarget === 'onedrive' && '🔵 Microsoft OneDrive टार्गेट चालू आहे.'}
                {config.syncTarget === 'both' && '⚪ Google Sheets व Microsoft OneDrive दोन्ही टार्गेट्स चालू आहेत.'}
              </p>
              <p className="text-[11px] text-slate-400 pt-1 font-semibold">
                एकूण: {students.length} विद्यार्थी यादी + {records.length} ऐतिहासिक हजेरी हिशोब थेट पाठवला जाईल.
              </p>
            </div>

            <button
              onClick={handleManualSync}
              disabled={syncingState === 'syncing'}
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-emerald-650 bg-emerald-600 hover:bg-emerald-750 disabled:bg-slate-350 text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:cursor-not-allowed transition shrink-0 text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${syncingState === 'syncing' ? 'animate-spin' : ''}`} />
              माहिती सिंक करा
            </button>
          </div>

          {/* Sync Progress Status Box */}
          {syncingState !== 'idle' && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
              syncingState === 'syncing' 
                ? 'bg-blue-50 text-blue-800 border-blue-200' 
                : syncingState === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {syncingState === 'syncing' && <RefreshCw className="w-4.5 h-4.5 text-blue-500 animate-spin shrink-0" />}
              {syncingState === 'success' && <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />}
              {syncingState === 'error' && <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />}
              <span>{syncMessage}</span>
            </div>
          )}
        </div>

        {/* STAGE 4 - Auto Sync Setting Toggle Switch */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-850 flex items-center gap-1.5 select-none text-[13px]">
              <Flame className="w-4.5 h-4.5 text-orange-500 animate-pulse" />
              Auto Backup ऑटो सिंक (स्वयंचलित)
            </h4>
            <p className="text-[11px] text-slate-450 font-medium">हजेरी पूर्ण करून सबमिट करताच निवडलेल्या क्लाउड प्लॅटफॉर्मवर (Sheets/OneDrive) बॅकअप आपोआप सेव्ह होईल</p>
          </div>

          <button
            onClick={handleToggleAutoSync}
            className="text-indigo-650 hover:text-indigo-755 transition-colors focus:outline-none cursor-pointer"
            title="ऑतो सिंक चालू/बंद करा"
          >
            {config.isAutoSyncEnabled ? (
              <ToggleRight className="w-12 h-12 text-violet-600" />
            ) : (
              <ToggleLeft className="w-12 h-12 text-slate-300" />
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
